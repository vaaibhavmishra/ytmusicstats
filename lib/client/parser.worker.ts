/**
 * Parsing Web Worker — with byte-level pre-filtering.
 *
 * Receives a transferred byte slice of the file (one shard of the top-level
 * JSON array), **plus per-element byte ranges**. For each element, it first
 * checks the raw bytes for the ASCII sequence `"YouTube Music"` — if the
 * sequence is absent, the entry cannot be a YouTube Music entry and is skipped
 * entirely, avoiding the expensive JSON.parse → object-build → filter cycle.
 *
 * Only elements that pass the byte pre-filter are decoded, parsed, and run
 * through the shared transform pipeline. This typically eliminates 50%+ of
 * JSON.parse calls (regular YouTube watches, ads, etc.).
 *
 * IMPORTANT: this file references the worker global (`self`) and must never be
 * statically `import`ed by other modules — it is only referenced via
 * `new Worker(new URL("./parser.worker.ts", import.meta.url))` in
 * `worker-pool.ts`. It imports ONLY the pure transforms + scanner helpers +
 * type-only message shapes, so no DOM/server code is pulled into the worker
 * bundle.
 */

import { asciiToBytes, containsASCIISequence } from "@/lib/parsing/scanner";
import { isYouTubeMusicEntry, parseSongEntry } from "@/lib/parsing/transforms";
import type { GoogleTakeoutEntry, ParsedSongInfo } from "@/lib/types/database";
import type { ShardRequest, WorkerMessage } from "./worker-pool";

// `self` is typed as `Window` under the DOM lib; narrow it to just the
// dedicated-worker surface we use, avoiding a tsconfig `lib` change.
const ctx = self as unknown as {
  onmessage: ((event: MessageEvent<ShardRequest>) => void) | null;
  postMessage: (message: WorkerMessage) => void;
};

// Pre-compute the needle once at worker init. "YouTube Music" is pure ASCII,
// so the UTF-8/ASCII safety guarantee from scanner.ts applies.
const YTM_NEEDLE = asciiToBytes("YouTube Music");

// Report progress every N elements to avoid excessive postMessage overhead.
const PROGRESS_INTERVAL = 5_000;

ctx.onmessage = (event: MessageEvent<ShardRequest>) => {
  const { shardIndex, buffer, elementRanges } = event.data;

  try {
    const bytes = new Uint8Array(buffer);
    const decoder = new TextDecoder();
    const elementCount = elementRanges.length / 2;

    const entries: ParsedSongInfo[] = [];
    let musicEntries = 0;

    const seenIds = new Set<string>();
    const uniqueIds: string[] = [];

    for (let e = 0; e < elementCount; e++) {
      const elemStart = elementRanges[e * 2];
      const elemEnd = elementRanges[e * 2 + 1];

      // ── Byte-level pre-filter ──────────────────────────────────────────
      // If the raw bytes of this element don't contain "YouTube Music",
      // it can't possibly pass isYouTubeMusicEntry — skip JSON.parse entirely.
      if (!containsASCIISequence(bytes, elemStart, elemEnd, YTM_NEEDLE)) {
        // Report progress periodically even for skipped entries.
        if ((e + 1) % PROGRESS_INTERVAL === 0) {
          ctx.postMessage({
            type: "progress",
            shardIndex,
            processed: e + 1,
          });
        }
        continue;
      }

      // ── Parse only likely-music entries ─────────────────────────────────
      const text = decoder.decode(bytes.subarray(elemStart, elemEnd));
      const entry = JSON.parse(text) as GoogleTakeoutEntry;

      if (!isYouTubeMusicEntry(entry)) {
        // False positive from byte pre-filter (e.g. song title contained
        // "YouTube Music"). Rare, but handled correctly.
        if ((e + 1) % PROGRESS_INTERVAL === 0) {
          ctx.postMessage({
            type: "progress",
            shardIndex,
            processed: e + 1,
          });
        }
        continue;
      }

      musicEntries++;
      const parsed = parseSongEntry(entry);
      if (parsed) {
        entries.push(parsed);
        if (parsed.youtubeId && !seenIds.has(parsed.youtubeId)) {
          seenIds.add(parsed.youtubeId);
          uniqueIds.push(parsed.youtubeId);
        }
      }

      // Report progress periodically.
      if ((e + 1) % PROGRESS_INTERVAL === 0) {
        ctx.postMessage({
          type: "progress",
          shardIndex,
          processed: e + 1,
        });
      }
    }

    ctx.postMessage({
      type: "result",
      shardIndex,
      entries,
      uniqueIds,
      musicEntries,
      totalEntries: elementCount,
    });
  } catch (error) {
    ctx.postMessage({
      type: "error",
      shardIndex,
      message: error instanceof Error ? error.message : "parse failed",
    });
  }
};
