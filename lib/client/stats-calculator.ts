/**
 * Client-side Statistics Calculator (orchestrator).
 *
 * The actual computation lives in the pure `lib/parsing/stats-core.ts` module so
 * it can run in a Web Worker (`stats.worker.ts`) off the main thread. This file
 * just decides where to run it:
 *   - large histories on a supported browser → the stats worker (UI stays free)
 *   - otherwise (or if the worker fails) → inline on the main thread, yielding
 *     periodically so the UI stays responsive
 * Both paths share the same `computeStats`, so they cannot drift and produce
 * identical `IUserStats`.
 */

import { computeStats, type StatsProgress } from "@/lib/parsing/stats-core";
import type { ISong, IUserStats, ParsedSongInfo } from "@/lib/types/database";

// Re-export StatsProgress for existing import sites (e.g. upload-area.tsx).
export type { StatsProgress } from "@/lib/parsing/stats-core";

/** Message sent to the stats worker (structured clone preserves Dates + Map). */
export interface StatsRequest {
  entries: ParsedSongInfo[];
  metadata?: Map<string, ISong>;
}

/** Messages the stats worker can send back. */
export type StatsWorkerMessage =
  | { type: "progress"; progress: StatsProgress }
  | { type: "result"; stats: IUserStats }
  | { type: "error"; message: string };

// Below this many entries the structured-clone + worker-spawn overhead isn't
// worth it — just compute inline on the main thread.
const MIN_ENTRIES_FOR_WORKER = 5000;

/**
 * Yield to browser to prevent UI freeze (main-thread fallback only).
 */
function yieldToBrowser(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * Run the computation in a dedicated worker. Resolves to the same `IUserStats`
 * as the inline path. Rejects on any worker error so the caller can fall back.
 */
function calculateStatsInWorker(
  entries: ParsedSongInfo[],
  onProgress?: (progress: StatsProgress) => void,
  metadata?: Map<string, ISong>,
): Promise<IUserStats> {
  const worker = new Worker(new URL("./stats.worker.ts", import.meta.url), {
    type: "module",
  });

  return new Promise<IUserStats>((resolve, reject) => {
    worker.onmessage = (event: MessageEvent<StatsWorkerMessage>) => {
      const msg = event.data;
      if (msg.type === "progress") {
        onProgress?.(msg.progress);
      } else if (msg.type === "result") {
        worker.terminate();
        resolve(msg.stats);
      } else {
        worker.terminate();
        reject(new Error(msg.message));
      }
    };
    worker.onerror = (event) => {
      worker.terminate();
      reject(new Error(`stats worker crashed: ${event.message}`));
    };
    worker.onmessageerror = () => {
      worker.terminate();
      reject(new Error("stats worker message deserialization error"));
    };

    const request: StatsRequest = { entries, metadata };
    worker.postMessage(request);
  });
}

/**
 * Main entry point to calculate all statistics.
 *
 * @param entries - Parsed song entries
 * @param onProgress - Progress callback
 * @param metadata - Optional pre-fetched song metadata map (youtubeId -> metadata)
 */
export async function calculateStats(
  entries: ParsedSongInfo[],
  onProgress?: (progress: StatsProgress) => void,
  metadata?: Map<string, ISong>,
): Promise<IUserStats> {
  if (
    typeof Worker !== "undefined" &&
    entries.length >= MIN_ENTRIES_FOR_WORKER
  ) {
    try {
      return await calculateStatsInWorker(entries, onProgress, metadata);
    } catch (error) {
      // Worker path couldn't complete — fall back to inline computation.
      console.warn("Stats worker failed, computing inline:", error);
    }
  }

  return computeStats(entries, metadata, onProgress, yieldToBrowser);
}
