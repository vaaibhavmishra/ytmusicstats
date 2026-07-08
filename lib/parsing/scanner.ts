/**
 * Byte-level scanner for splitting a top-level JSON array into its elements
 * WITHOUT parsing it.
 *
 * Google Takeout's `watch-history.json` is a single top-level array of objects.
 * To parse it across several Web Workers we need to find the byte boundaries of
 * each top-level element so each worker can `JSON.parse` only its own shard.
 *
 * Why scanning raw UTF-8 bytes is safe: every byte of a multi-byte UTF-8
 * sequence is >= 0x80, while all the structural characters we track
 * (`{ } [ ] " \ ,`) are ASCII (< 0x80). So a multi-byte character (e.g. an
 * emoji or accented letter inside a song title) can never be mistaken for a
 * structural byte. Decoding to text only happens later, inside the workers.
 *
 * This module is pure (no DOM/Worker globals) so it can be unit-tested in Node.
 */

// Structural byte constants
const QUOTE = 0x22; // "
const BACKSLASH = 0x5c; // \
const COMMA = 0x2c; // ,
const OPEN_BRACE = 0x7b; // {
const OPEN_BRACKET = 0x5b; // [
const CLOSE_BRACE = 0x7d; // }
const CLOSE_BRACKET = 0x5d; // ]

// JSON whitespace
const SPACE = 0x20;
const TAB = 0x09;
const LF = 0x0a;
const CR = 0x0d;

function isWhitespace(b: number): boolean {
  return b === SPACE || b === TAB || b === LF || b === CR;
}

export interface ScanSuccess {
  ok: true;
  /**
   * Flat array of [start, end) byte offsets, two entries per element:
   * ranges[2k] = start of element k, ranges[2k+1] = end (exclusive).
   */
  ranges: Uint32Array;
}

export interface ScanFailure {
  ok: false;
  /** Reason the scan bailed (for logging/fallback decisions). */
  reason: string;
}

export type ScanResult = ScanSuccess | ScanFailure;

/**
 * Scan a UTF-8 byte buffer of a JSON document and return the [start, end)
 * offsets of every top-level array element.
 *
 * Returns `{ ok: false }` when the input is not a top-level array, is empty, or
 * is malformed/truncated — callers should fall back to a normal `JSON.parse`
 * which preserves the existing error/empty contract.
 */
export function scanTopLevelElements(bytes: Uint8Array): ScanResult {
  const len = bytes.length;

  // Skip a leading UTF-8 BOM (EF BB BF) if present — file.arrayBuffer() keeps it.
  let i = 0;
  if (len >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    i = 3;
  }

  // Find the first meaningful byte; it must be the outer array bracket.
  while (i < len && isWhitespace(bytes[i])) i++;
  if (i >= len || bytes[i] !== OPEN_BRACKET) {
    return { ok: false, reason: "not a top-level array" };
  }

  // We track structural depth INCLUDING the outer array. Consuming the outer
  // '[' below brings depth to 1; top-level elements live at depth 1.
  const ranges: number[] = [];
  let depth = 0;
  let inString = false;
  let escaped = false;
  let elemStart = -1; // start offset of the in-progress top-level element, or -1
  let closed = false; // saw the matching outer ']'

  for (; i < len; i++) {
    const b = bytes[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (b === BACKSLASH) {
        escaped = true;
      } else if (b === QUOTE) {
        inString = false;
      }
      continue;
    }

    if (b === QUOTE) {
      if (depth === 1 && elemStart === -1) elemStart = i;
      inString = true;
      continue;
    }

    if (b === OPEN_BRACE || b === OPEN_BRACKET) {
      if (depth === 1 && elemStart === -1) elemStart = i;
      depth++;
      continue;
    }

    if (b === CLOSE_BRACE || b === CLOSE_BRACKET) {
      depth--;
      if (depth === 0) {
        // This closes the outer array. Finalize a pending primitive element.
        if (elemStart !== -1) {
          ranges.push(elemStart, i);
          elemStart = -1;
        }
        closed = true;
        break;
      }
      if (depth === 1 && elemStart !== -1) {
        // An object/array element just finished at the top level.
        ranges.push(elemStart, i + 1);
        elemStart = -1;
      }
      continue;
    }

    if (b === COMMA) {
      if (depth === 1 && elemStart !== -1) {
        // End of a primitive/string element (exclusive of the comma).
        ranges.push(elemStart, i);
        elemStart = -1;
      }
      continue;
    }

    // Any other non-whitespace byte at depth 1 begins a primitive element
    // (number / true / false / null). Object & string starts are handled above.
    if (depth === 1 && elemStart === -1 && !isWhitespace(b)) {
      elemStart = i;
    }
  }

  if (!closed || depth !== 0 || inString) {
    return { ok: false, reason: "malformed or truncated JSON" };
  }

  return { ok: true, ranges: Uint32Array.from(ranges) };
}

// ─── Byte-level pre-filter helpers ───────────────────────────────────────────

/**
 * Convert an ASCII-only string to a Uint8Array of its byte values.
 * Only valid for strings where every character is < 128.
 */
export function asciiToBytes(s: string): Uint8Array {
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

/**
 * Check whether a byte sub-sequence exists inside a Uint8Array region.
 *
 * Uses a simple linear scan — for the short needles we're matching
 * (`"YouTube Music"`, 13 bytes) against element spans of a few hundred bytes,
 * a naive search is faster than Boyer-Moore due to branch-predictor friendliness
 * and zero setup cost.
 *
 * Safety: the same UTF-8/ASCII argument from `scanTopLevelElements` applies —
 * all needle bytes are < 0x80, so they can never appear as part of a multi-byte
 * character.
 */
export function containsASCIISequence(
  haystack: Uint8Array,
  start: number,
  end: number,
  needle: Uint8Array,
): boolean {
  const needleLen = needle.length;
  const limit = end - needleLen;

  outer: for (let i = start; i <= limit; i++) {
    if (haystack[i] !== needle[0]) continue;
    for (let j = 1; j < needleLen; j++) {
      if (haystack[i + j] !== needle[j]) continue outer;
    }
    return true;
  }
  return false;
}
