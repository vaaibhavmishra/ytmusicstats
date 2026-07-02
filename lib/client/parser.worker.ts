/**
 * Parsing Web Worker.
 *
 * Receives a transferred byte slice of the file (one shard of the top-level
 * JSON array, spanning whole elements), decodes it, parses it, and runs the
 * shared filter/transform over it. Posts incremental progress and a final
 * result back to the pool.
 *
 * IMPORTANT: this file references the worker global (`self`) and must never be
 * statically `import`ed by other modules — it is only referenced via
 * `new Worker(new URL("./parser.worker.ts", import.meta.url))` in
 * `worker-pool.ts`. It imports ONLY the pure transforms + type-only message
 * shapes, so no DOM/server code is pulled into the worker bundle.
 */

import { parseEntries } from "@/lib/parsing/transforms";
import type { GoogleTakeoutEntry, ParsedSongInfo } from "@/lib/types/database";
import type { ShardRequest, WorkerMessage } from "./worker-pool";

// `self` is typed as `Window` under the DOM lib; narrow it to just the
// dedicated-worker surface we use, avoiding a tsconfig `lib` change.
const ctx = self as unknown as {
  onmessage: ((event: MessageEvent<ShardRequest>) => void) | null;
  postMessage: (message: WorkerMessage) => void;
};

// Process the decoded array in chunks so we can post progress without the
// JSON.parse'd array sitting idle. No UI thread here, so no yielding needed.
const PROGRESS_CHUNK = 10_000;

ctx.onmessage = (event: MessageEvent<ShardRequest>) => {
  const { shardIndex, buffer } = event.data;

  try {
    const text = new TextDecoder().decode(new Uint8Array(buffer));
    // The shard spans whole elements separated by their original commas, so
    // wrapping in brackets reconstitutes a valid JSON array.
    const raw = JSON.parse(`[${text}]`) as GoogleTakeoutEntry[];

    const entries: ParsedSongInfo[] = [];
    let musicEntries = 0;

    // Collect this shard's unique video IDs in the same loop that builds
    // `entries` — saves the main thread a separate de-dup pass later.
    const seenIds = new Set<string>();
    const uniqueIds: string[] = [];

    for (let i = 0; i < raw.length; i += PROGRESS_CHUNK) {
      const chunk = raw.slice(i, i + PROGRESS_CHUNK);
      const parsed = parseEntries(chunk);
      for (const entry of parsed.entries) {
        entries.push(entry);
        if (entry.youtubeId && !seenIds.has(entry.youtubeId)) {
          seenIds.add(entry.youtubeId);
          uniqueIds.push(entry.youtubeId);
        }
      }
      musicEntries += parsed.musicEntries;

      ctx.postMessage({
        type: "progress",
        shardIndex,
        processed: Math.min(i + PROGRESS_CHUNK, raw.length),
      });
    }

    ctx.postMessage({
      type: "result",
      shardIndex,
      entries,
      uniqueIds,
      musicEntries,
      totalEntries: raw.length,
    });
  } catch (error) {
    ctx.postMessage({
      type: "error",
      shardIndex,
      message: error instanceof Error ? error.message : "parse failed",
    });
  }
};
