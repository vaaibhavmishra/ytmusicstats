/**
 * Client-side YouTube metadata fetcher
 * Fetches song metadata using server action
 */

import { lookupSongs } from "@/app/actions/songs";
import type {
  FetchProgress,
  ISong,
  ParsedSongInfo,
} from "@/lib/types/database";

// Batch size for client-side processing to show incremental progress
const CLIENT_BATCH_SIZE = 200;

// Re-export FetchProgress for convenience
export type { FetchProgress } from "@/lib/types/database";

/**
 * Fetch metadata for a batch of entries using server action
 * Processes in batches to show incremental progress
 */
export async function fetchSongMetadata(
  entries: ParsedSongInfo[],
  onProgress?: (progress: FetchProgress) => void,
): Promise<Map<string, ISong>> {
  // Extract unique video IDs
  const videoIds: string[] = [];
  const seen = new Set<string>();

  for (const entry of entries) {
    if (entry.youtubeId && !seen.has(entry.youtubeId)) {
      seen.add(entry.youtubeId);
      videoIds.push(entry.youtubeId);
    }
  }

  const metadata = new Map<string, ISong>();

  if (videoIds.length === 0) {
    return metadata;
  }

  const totalBatches = Math.ceil(videoIds.length / CLIENT_BATCH_SIZE);
  let totalCached = 0;
  let totalFetched = 0;
  let processed = 0;

  // Initial progress report
  if (onProgress) {
    onProgress({
      total: videoIds.length,
      processed: 0,
      fetched: 0,
      cached: 0,
      currentBatch: 0,
      totalBatches,
    });
  }

  // Process in batches to show incremental progress
  for (let i = 0; i < videoIds.length; i += CLIENT_BATCH_SIZE) {
    const batchIds = videoIds.slice(i, i + CLIENT_BATCH_SIZE);
    const currentBatch = Math.floor(i / CLIENT_BATCH_SIZE) + 1;

    try {
      const result = await lookupSongs(batchIds);

      if (result.success && result.data) {
        for (const [id, song] of Object.entries(result.data)) {
          metadata.set(id, song);
        }
      }

      // Update totals from this batch
      if (result.stats) {
        totalCached += result.stats.cached;
        totalFetched += result.stats.fetched;
      }

      processed += batchIds.length;

      // Report progress after each batch
      if (onProgress) {
        onProgress({
          total: videoIds.length,
          processed,
          fetched: totalFetched,
          cached: totalCached,
          currentBatch,
          totalBatches,
        });
      }
    } catch (error) {
      console.error(`Error fetching batch ${currentBatch}:`, error);
      // Continue with next batch instead of failing entirely
      processed += batchIds.length;
    }
  }

  return metadata;
}

/**
 * Get video ID from a parsed entry
 */
export function getVideoIdFromEntry(entry: ParsedSongInfo): string | null {
  return entry.youtubeId || null;
}

/**
 * Enrich entries with real metadata (duration, cleaned artist name)
 */
export function enrichEntriesWithMetadata(
  entries: ParsedSongInfo[],
  metadata: Map<string, ISong>,
): ParsedSongInfo[] {
  return entries.map((entry) => {
    const videoId = getVideoIdFromEntry(entry);

    if (!videoId) return entry;

    const songData = metadata.get(videoId);

    if (!songData) return entry;

    return {
      ...entry,
      // Use real duration from YouTube API
      estimatedDuration: songData.duration,
      // Use cleaned artist name (not "Release" or other generic names)
      artist: songData.artist,
    };
  });
}
