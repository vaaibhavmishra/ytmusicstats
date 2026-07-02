/**
 * Client-side Google Takeout Parser
 *
 * Optimized for browser execution with:
 * - A Web Worker pool that parses large files across all CPU cores
 *   (see `worker-pool.ts`), falling back to single-thread processing
 * - Chunked processing for the single-thread path (mobile-friendly)
 * - Progress callbacks
 *
 * The pure filter/transform logic lives in `lib/parsing/transforms.ts` so it
 * can be shared by the worker, this module, and the server action. The helpers
 * re-exported below preserve existing import sites.
 */

import { isYouTubeMusicEntry, parseSongEntry } from "@/lib/parsing/transforms";
import type {
  GoogleTakeoutEntry,
  ParsedSongInfo,
  ParseProgress,
  ParseResult,
} from "@/lib/types/database";
import {
  parseWithWorkerPool,
  shouldUseWorkerPool,
  WorkerPoolFallback,
} from "./worker-pool";

// Re-export shared transform helpers for backward compatibility with existing
// import sites (e.g. stats-calculator). Server code should import these from
// `@/lib/parsing/transforms` directly to avoid pulling in client-only code.
export {
  cleanArtistName,
  extractArtistFromTitle,
  isGenericArtist,
} from "@/lib/parsing/transforms";

/**
 * Detect device capability for adaptive processing
 */
export function getDeviceCapability(): "high" | "low" {
  const cores = navigator.hardwareConcurrency || 4;
  const memory =
    (navigator as unknown as { deviceMemory?: number }).deviceMemory || 4;
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  if (isMobile || cores <= 4 || memory <= 4) {
    return "low";
  }
  return "high";
}

/**
 * Get optimal batch size based on device capability
 */
function getBatchSize(capability: "high" | "low"): number {
  return capability === "high" ? 2000 : 500;
}

/**
 * Yield to browser to prevent UI freeze
 */
function yieldToBrowser(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * Single-threaded parser — used as a fallback for small files, unsupported
 * environments, or when the worker pool bails. Processes the array in batches
 * with periodic yields so the UI thread stays responsive.
 */
export async function parseGoogleTakeoutFile(
  fileContent: string,
  onProgress?: (progress: ParseProgress) => void,
): Promise<ParseResult> {
  const entries: ParsedSongInfo[] = [];
  const capability = getDeviceCapability();
  const batchSize = getBatchSize(capability);

  onProgress?.({ stage: "parsing", progress: 0 });

  // Parse JSON
  const data: GoogleTakeoutEntry[] = JSON.parse(fileContent);

  if (!Array.isArray(data)) {
    return {
      entries: [],
      uniqueVideoIds: [],
      totalEntries: 0,
      musicEntries: 0,
      error: "Invalid format: Expected an array of entries.",
    };
  }

  const totalEntries = data.length;
  let musicEntries = 0;

  // Collect unique video IDs while filtering — saves a separate de-dup pass.
  const seenIds = new Set<string>();
  const uniqueVideoIds: string[] = [];

  onProgress?.({
    stage: "filtering",
    progress: 10,
    totalEntries,
    entriesProcessed: 0,
  });

  // Process in batches
  for (let i = 0; i < data.length; i += batchSize) {
    const batchEnd = Math.min(i + batchSize, data.length);

    for (let j = i; j < batchEnd; j++) {
      const entry = data[j];

      if (!isYouTubeMusicEntry(entry)) {
        continue;
      }

      musicEntries++;
      const parsedSong = parseSongEntry(entry);

      if (parsedSong) {
        entries.push(parsedSong);
        if (parsedSong.youtubeId && !seenIds.has(parsedSong.youtubeId)) {
          seenIds.add(parsedSong.youtubeId);
          uniqueVideoIds.push(parsedSong.youtubeId);
        }
      }
    }

    // Calculate progress (10% to 90% for filtering)
    const progress = 10 + (batchEnd / totalEntries) * 80;

    onProgress?.({
      stage: "filtering",
      progress: Math.round(progress),
      totalEntries,
      entriesProcessed: batchEnd,
      musicEntries,
    });

    // Yield to browser to prevent freeze
    if (capability === "low" || i % (batchSize * 2) === 0) {
      await yieldToBrowser();
    }
  }

  // Help garbage collection
  data.length = 0;

  onProgress?.({
    stage: "complete",
    progress: 100,
    totalEntries,
    entriesProcessed: totalEntries,
    musicEntries,
  });

  return {
    entries,
    uniqueVideoIds,
    totalEntries,
    musicEntries,
  };
}

/**
 * Read and parse a File object.
 *
 * Uses the parallel Web Worker pool for large files (when supported) and falls
 * back to the single-threaded path otherwise — or if the worker path bails for
 * any reason. The public contract is unchanged.
 */
export async function parseFile(
  file: File,
  onProgress?: (progress: ParseProgress) => void,
): Promise<ParseResult> {
  onProgress?.({ stage: "reading", progress: 0 });

  if (shouldUseWorkerPool(file)) {
    try {
      return await parseWithWorkerPool(file, onProgress);
    } catch (error) {
      // Worker path couldn't complete — fall back to single-thread parsing.
      if (!(error instanceof WorkerPoolFallback)) {
        console.warn("Worker pool parsing failed, falling back:", error);
      }
    }
  }

  const text = await file.text();
  onProgress?.({ stage: "reading", progress: 5 });

  return parseGoogleTakeoutFile(text, onProgress);
}
