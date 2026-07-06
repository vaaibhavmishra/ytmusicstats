/**
 * Client-side YouTube metadata fetcher
 * Fetches song metadata using server action
 */

import { lookupSongs } from "@/app/actions/songs";
import { mapWithConcurrency } from "@/lib/concurrency";
import type {
  FetchProgress,
  ISong
} from "@/lib/types/database";

// Batch size for client-side processing. Each batch is one server-action
// round-trip (auth + DB connect + origin check happen once per call), so larger
// batches cut fixed per-call overhead. The server chunks internally by 50 for
// the YouTube API, so this only affects round-trip count and progress
// granularity — kept large enough to amortize overhead, small enough to still
// surface incremental progress.
const CLIENT_BATCH_SIZE = 500;

// Number of lookup batches to run concurrently. Kept moderate to stay clear of
// YouTube API rate limits while still cutting wall-clock time versus sequential
// fetching.
const LOOKUP_CONCURRENCY = 4;

/**
 * Fetch metadata for a list of unique video IDs using the server action.
 * The de-dup is done upstream in the parse layer (see `ParseResult.uniqueVideoIds`).
 * Processes in batches to show incremental progress.
 */
export async function fetchSongMetadata(
  videoIds: string[],
  onProgress?: (progress: FetchProgress) => void,
): Promise<Map<string, ISong>> {
  const metadata = new Map<string, ISong>();

  if (videoIds.length === 0) {
    return metadata;
  }

  // Split the unique IDs into batches up front so they can be fetched with
  // bounded concurrency.
  const batches: string[][] = [];
  for (let i = 0; i < videoIds.length; i += CLIENT_BATCH_SIZE) {
    batches.push(videoIds.slice(i, i + CLIENT_BATCH_SIZE));
  }
  const totalBatches = batches.length;

  let totalCached = 0;
  let totalFetched = 0;
  let processed = 0;
  let completedBatches = 0;

  // Initial progress report
  onProgress?.({
    total: videoIds.length,
    processed: 0,
    fetched: 0,
    cached: 0,
    currentBatch: 0,
    totalBatches,
  });

  // Fetch batches concurrently (bounded). Shared counters are mutated inside the
  // callback — safe because JS runs each continuation to completion without
  // interleaving. `currentBatch` now reports batches *completed*.
  await mapWithConcurrency(
    batches,
    LOOKUP_CONCURRENCY,
    async (batchIds, index) => {
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
      } catch (error) {
        console.error(`Error fetching batch ${index + 1}:`, error);
        // Continue with remaining batches instead of failing entirely
      } finally {
        processed += batchIds.length;
        completedBatches++;
        onProgress?.({
          total: videoIds.length,
          processed,
          fetched: totalFetched,
          cached: totalCached,
          currentBatch: completedBatches,
          totalBatches,
        });
      }
    },
  );

  return metadata;
}
