/**
 * Web Worker pool that parses a Google Takeout `watch-history.json` in parallel.
 *
 * Strategy (see `lib/parsing/scanner.ts` for the byte-boundary details):
 *   1. Read the file as raw bytes (cheaper than a UTF-16 string).
 *   2. Scan top-level array element boundaries without parsing.
 *   3. Split into N contiguous shards (N = clamped CPU core count).
 *   4. Hand each shard's bytes to a worker (transferred, zero-copy) which
 *      decodes + JSON.parses + filters only its slice.
 *   5. Merge the slim results back in original order.
 *
 * No single heap ever holds the full parsed object graph, and every core is
 * busy — the two goals of this optimization.
 */

import type {
  ParsedSongInfo,
  ParseProgress,
  ParseResult,
} from "@/lib/types/database";

/** Below this size the worker spawn/transfer overhead isn't worth it. */
const MIN_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
/** Upper bound on workers — diminishing returns + per-isolate overhead above this. */
const MAX_WORKERS = 8;

/** Message sent to the scanner worker: the file's full byte buffer (transferred). */
export interface ScanRequest {
  buffer: ArrayBuffer;
}

/**
 * Messages the scanner worker can send back. On success it returns the element
 * `ranges` and hands the original `buffer` back so the main thread can keep
 * slicing shards from it.
 */
export type ScanWorkerMessage =
  | { ok: true; ranges: Uint32Array; buffer: ArrayBuffer }
  | { ok: false; reason: string };

/**
 * Message sent to a worker: a transferred byte slice plus per-element byte
 * ranges so the worker can pre-filter at the byte level before JSON.parse.
 */
export interface ShardRequest {
  shardIndex: number;
  buffer: ArrayBuffer;
  /**
   * Flat array of [start, end) byte offsets *relative to `buffer`*, two
   * entries per element: elementRanges[2k] = start, elementRanges[2k+1] = end.
   */
  elementRanges: Uint32Array;
}

/** Messages a worker can send back. */
export type WorkerMessage =
  | { type: "progress"; shardIndex: number; processed: number }
  | {
      type: "result";
      shardIndex: number;
      entries: ParsedSongInfo[];
      uniqueIds: string[];
      musicEntries: number;
      totalEntries: number;
    }
  | { type: "error"; shardIndex: number; message: string };

/**
 * Thrown when the worker path cannot run to completion (scanner bailed, a
 * worker errored, etc.). `parseFile` catches this and falls back to the
 * single-threaded parser, preserving the existing contract.
 */
export class WorkerPoolFallback extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = "WorkerPoolFallback";
  }
}

function getWorkerCount(): number {
  const cores =
    typeof navigator !== "undefined" ? navigator.hardwareConcurrency || 4 : 4;

  // Cap by device memory when available to avoid OOM on low-RAM devices.
  const deviceMemory =
    typeof navigator !== "undefined"
      ? (navigator as unknown as { deviceMemory?: number }).deviceMemory
      : undefined;
  let memCap = MAX_WORKERS;
  if (deviceMemory !== undefined) {
    if (deviceMemory <= 2) memCap = 2;
    else if (deviceMemory <= 4) memCap = 4;
  }

  return Math.max(2, Math.min(cores, memCap, MAX_WORKERS));
}

/**
 * Run the byte-level boundary scan inside a throwaway Web Worker so the O(n)
 * pass doesn't block the main thread. The buffer is transferred in and handed
 * back (with the computed ranges) so the caller can slice shards from it.
 *
 * Throws `WorkerPoolFallback` on a bad/empty scan or any worker error — same
 * failure semantics as the inline scan, so `parseFile` falls back cleanly.
 */
async function scanInWorker(
  buffer: ArrayBuffer,
): Promise<{ ranges: Uint32Array; buffer: ArrayBuffer }> {
  const worker = new Worker(new URL("./scanner.worker.ts", import.meta.url), {
    type: "module",
  });

  try {
    return await new Promise<{ ranges: Uint32Array; buffer: ArrayBuffer }>(
      (resolve, reject) => {
        // Safety timeout — if the scanner doesn't respond within 30s, bail.
        const timeout = setTimeout(() => {
          worker.terminate();
          reject(new WorkerPoolFallback("scanner timed out"));
        }, 30_000);

        worker.onmessage = (event: MessageEvent<ScanWorkerMessage>) => {
          clearTimeout(timeout);
          const msg = event.data;
          if (msg.ok) {
            resolve({ ranges: msg.ranges, buffer: msg.buffer });
          } else {
            reject(new WorkerPoolFallback(msg.reason));
          }
        };
        worker.onerror = (event) => {
          clearTimeout(timeout);
          reject(new WorkerPoolFallback(`scanner crashed: ${event.message}`));
        };
        worker.onmessageerror = () => {
          clearTimeout(timeout);
          reject(
            new WorkerPoolFallback("scanner message deserialization error"),
          );
        };

        const request: ScanRequest = { buffer };
        worker.postMessage(request, [request.buffer]);
      },
    );
  } finally {
    worker.terminate();
  }
}

/**
 * Whether the worker pool should be used for this file. Falls back to the
 * single-thread path during SSR, on unsupported browsers, for small files, or
 * on single-core machines.
 */
export function shouldUseWorkerPool(file: File): boolean {
  return (
    typeof Worker !== "undefined" &&
    typeof navigator !== "undefined" &&
    file.size >= MIN_FILE_SIZE_BYTES &&
    getWorkerCount() >= 2
  );
}

/**
 * Parse a file using the worker pool. Resolves to the same `ParseResult` shape
 * as the single-thread parser. Throws `WorkerPoolFallback` (or any unexpected
 * error) if it cannot complete — the caller should fall back.
 */
export async function parseWithWorkerPool(
  arrayBuffer: ArrayBuffer,
  _fileSize: number,
  onProgress?: (progress: ParseProgress) => void,
): Promise<ParseResult> {
  onProgress?.({ stage: "reading", progress: 0 });

  onProgress?.({ stage: "parsing", progress: 5 });

  // Scan element boundaries off the main thread; throws WorkerPoolFallback on a
  // bad scan. The buffer is handed back so we can slice shards from it below.
  const scanned = await scanInWorker(arrayBuffer);
  const ranges = scanned.ranges;
  let bytes: Uint8Array | null = new Uint8Array(scanned.buffer);

  const elementCount = ranges.length / 2;
  if (elementCount === 0) {
    throw new WorkerPoolFallback("empty array");
  }

  const workerCount = Math.min(getWorkerCount(), elementCount);
  const perShard = Math.ceil(elementCount / workerCount);
  const shardCount = Math.ceil(elementCount / perShard);

  onProgress?.({
    stage: "filtering",
    progress: 10,
    totalEntries: elementCount,
    entriesProcessed: 0,
  });

  const workers: Worker[] = [];
  const results: Array<{
    entries: ParsedSongInfo[];
    uniqueIds: string[];
    musicEntries: number;
    totalEntries: number;
  } | null> = new Array(shardCount).fill(null);
  const processedByShard = new Int32Array(shardCount);

  try {
    await new Promise<void>((resolve, reject) => {
      let remaining = shardCount;
      let settled = false;

      const fail = (err: Error) => {
        if (settled) return;
        settled = true;
        reject(err);
      };

      const reportProgress = () => {
        let processed = 0;
        for (let s = 0; s < shardCount; s++) processed += processedByShard[s];
        onProgress?.({
          stage: "filtering",
          progress: 10 + Math.round((processed / elementCount) * 80),
          totalEntries: elementCount,
          entriesProcessed: processed,
        });
      };

      // Track per-worker timeouts so they can be cleared on completion.
      const timeouts: ReturnType<typeof setTimeout>[] = [];

      for (let shardIndex = 0; shardIndex < shardCount; shardIndex++) {
        const firstElem = shardIndex * perShard;
        const lastElem = Math.min(firstElem + perShard, elementCount) - 1;
        const spanStart = ranges[firstElem * 2];
        const spanEnd = ranges[lastElem * 2 + 1];

        const worker = new Worker(
          new URL("./parser.worker.ts", import.meta.url),
          { type: "module" },
        );
        workers.push(worker);

        // Safety timeout — if this parser worker doesn't finish within 60s, bail.
        const timeout = setTimeout(() => {
          worker.terminate();
          fail(new WorkerPoolFallback("parser worker timed out"));
        }, 60_000);
        timeouts.push(timeout);

        worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
          const msg = event.data;
          if (msg.type === "progress") {
            processedByShard[msg.shardIndex] = msg.processed;
            reportProgress();
          } else if (msg.type === "result") {
            clearTimeout(timeouts[msg.shardIndex]);
            results[msg.shardIndex] = {
              entries: msg.entries,
              uniqueIds: msg.uniqueIds,
              musicEntries: msg.musicEntries,
              totalEntries: msg.totalEntries,
            };
            processedByShard[msg.shardIndex] = msg.totalEntries;
            reportProgress();
            remaining--;
            if (remaining === 0 && !settled) {
              settled = true;
              resolve();
            }
          } else {
            clearTimeout(timeouts[msg.shardIndex]);
            fail(new WorkerPoolFallback(`worker shard error: ${msg.message}`));
          }
        };

        worker.onerror = (event) => {
          clearTimeout(timeouts[shardIndex]);
          fail(new WorkerPoolFallback(`worker crashed: ${event.message}`));
        };
        worker.onmessageerror = () => {
          clearTimeout(timeouts[shardIndex]);
          fail(new WorkerPoolFallback("worker message deserialization error"));
        };

        // Build per-element byte ranges relative to the shard start so the
        // worker can pre-filter entries at the byte level.
        const elemCount = lastElem - firstElem + 1;
        const elementRanges = new Uint32Array(elemCount * 2);
        for (let e = 0; e < elemCount; e++) {
          elementRanges[e * 2] = ranges[(firstElem + e) * 2] - spanStart;
          elementRanges[e * 2 + 1] =
            ranges[(firstElem + e) * 2 + 1] - spanStart;
        }

        // Copy this shard's bytes into a fresh buffer and transfer it (zero-copy
        // handoff). `bytes` is non-null here (set above and only cleared after
        // this loop). Build + transfer one shard at a time so each slice leaves
        // the main-thread heap immediately.
        const slice = (bytes as Uint8Array).slice(spanStart, spanEnd);
        const request: ShardRequest = {
          shardIndex,
          buffer: slice.buffer as ArrayBuffer,
          elementRanges,
        };
        worker.postMessage(request, [request.buffer, elementRanges.buffer]);
      }

      // The original full buffer is no longer needed; drop the reference so it
      // can be collected while the workers run.
      bytes = null;
    });
  } finally {
    for (const worker of workers) worker.terminate();
  }

  // Merge in original (shard) order to preserve the file's chronological order.
  const entries: ParsedSongInfo[] = [];
  // Fold each shard's unique IDs into one set (dedups IDs spanning shards).
  const seenIds = new Set<string>();
  const uniqueVideoIds: string[] = [];
  let musicEntries = 0;
  let totalEntries = 0;
  for (const result of results) {
    if (!result) {
      throw new WorkerPoolFallback("missing shard result");
    }
    for (const entry of result.entries) entries.push(entry);
    for (const id of result.uniqueIds) {
      if (!seenIds.has(id)) {
        seenIds.add(id);
        uniqueVideoIds.push(id);
      }
    }
    musicEntries += result.musicEntries;
    totalEntries += result.totalEntries;
  }

  onProgress?.({
    stage: "complete",
    progress: 100,
    totalEntries,
    entriesProcessed: totalEntries,
    musicEntries,
  });

  return { entries, uniqueVideoIds, totalEntries, musicEntries };
}
