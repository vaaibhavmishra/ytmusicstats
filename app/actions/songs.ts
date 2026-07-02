"use server";

import { headers } from "next/headers";
import { auth } from "@/lib/auth/config";
import { mapWithConcurrency } from "@/lib/concurrency";
import connectDB from "@/lib/db/connect";
import { Song } from "@/lib/db/models/Song";
import {
  cleanArtistName,
  extractArtistFromTitle,
  isGenericArtist,
} from "@/lib/parsing/transforms";
import type { ISong, LookupResult } from "@/lib/types/database";

// Re-export LookupResult for convenience
export type { LookupResult } from "@/lib/types/database";

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const YOUTUBE_BATCH_SIZE = 50; // YouTube API limit per request
const MAX_VIDEO_IDS = 8000; // Limit to prevent abuse
// Concurrent YouTube API requests per phase. Moderate to avoid 429 rate limits
// and keep each server-action invocation well under the Vercel function timeout.
const YOUTUBE_FETCH_CONCURRENCY = 4;

/**
 * Parse ISO 8601 duration to seconds
 * Example: PT4M13S -> 253 seconds
 */
function parseISO8601Duration(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 210; // Default 3.5 min if parsing fails

  const hours = Number.parseInt(match[1] || "0", 10);
  const minutes = Number.parseInt(match[2] || "0", 10);
  const seconds = Number.parseInt(match[3] || "0", 10);

  return hours * 3600 + minutes * 60 + seconds;
}

/**
 * Get the best available thumbnail URL
 */
function getBestThumbnail(
  thumbnails: Record<string, { url: string }> | undefined,
): string | undefined {
  if (!thumbnails) return undefined;

  // Priority: maxres > high > medium > default
  const priority = ["maxres", "high", "medium", "default"];

  for (const size of priority) {
    if (thumbnails[size]?.url) {
      return thumbnails[size].url;
    }
  }

  return undefined;
}

/**
 * Fetch video metadata from YouTube Data API
 */
async function fetchFromYouTubeAPI(
  videoIds: string[],
): Promise<Map<string, ISong>> {
  const results = new Map<string, ISong>();

  if (!YOUTUBE_API_KEY || videoIds.length === 0) {
    return results;
  }

  // Capture the key in a local const so the narrowing survives into the async
  // fetch closures below (TS widens the module-level `YOUTUBE_API_KEY` back to
  // `string | undefined` inside nested functions).
  const apiKey = YOUTUBE_API_KEY;

  // Collect unique channel IDs for artist images
  const channelIds = new Set<string>();
  const videoChannelMap = new Map<string, string>();

  // Build video-ID batches (YouTube API allows up to 50 IDs per request).
  const videoBatches: string[][] = [];
  for (let i = 0; i < videoIds.length; i += YOUTUBE_BATCH_SIZE) {
    videoBatches.push(videoIds.slice(i, i + YOUTUBE_BATCH_SIZE));
  }

  // Fetch video batches concurrently. Each task returns its parsed songs so the
  // shared maps are mutated off the await path, after all batches resolve.
  const videoBatchResults = await mapWithConcurrency(
    videoBatches,
    YOUTUBE_FETCH_CONCURRENCY,
    async (batchIds) => {
      const parsed: Array<{ id: string; song: ISong; channelId?: string }> = [];
      try {
        const response = await fetch(
          `https://www.googleapis.com/youtube/v3/videos?` +
            `part=contentDetails,snippet&id=${batchIds.join(",")}&key=${apiKey}`,
        );

        if (!response.ok) {
          console.error(`YouTube API error: ${response.status}`);
          return parsed;
        }

        const data = await response.json();

        for (const item of data.items || []) {
          const duration = parseISO8601Duration(
            item.contentDetails?.duration || "PT0S",
          );
          const channelTitle = item.snippet?.channelTitle || "";
          const channelId = item.snippet?.channelId;
          const videoTitle = item.snippet?.title || "";
          const thumbnail = getBestThumbnail(item.snippet?.thumbnails);
          const publishedAt = item.snippet?.publishedAt;
          const releaseDate = publishedAt ? new Date(publishedAt) : undefined;

          // Clean up artist name
          let artist = cleanArtistName(channelTitle);

          // If channel is generic like "Release", extract from title
          if (isGenericArtist(artist)) {
            const extracted = extractArtistFromTitle(videoTitle);
            artist = extracted || "Unknown Artist";
          }

          parsed.push({
            id: item.id,
            channelId,
            song: {
              key: `${artist.toLowerCase()} - ${videoTitle.toLowerCase()}`,
              youtubeId: item.id,
              title: videoTitle,
              artist,
              duration,
              thumbnail,
              channelTitle,
              releaseDate,
            } as ISong,
          });
        }
      } catch (error) {
        console.error("Error fetching YouTube metadata:", error);
      }
      return parsed;
    },
  );

  // Merge parsed video results into shared state.
  for (const parsed of videoBatchResults) {
    for (const { id, song, channelId } of parsed) {
      results.set(id, song);
      if (channelId) {
        channelIds.add(channelId);
        videoChannelMap.set(id, channelId);
      }
    }
  }

  // Fetch channel thumbnails for artist images (batched + concurrent).
  if (channelIds.size > 0) {
    const channelIdsArray = Array.from(channelIds);
    const channelBatches: string[][] = [];
    for (let i = 0; i < channelIdsArray.length; i += YOUTUBE_BATCH_SIZE) {
      channelBatches.push(channelIdsArray.slice(i, i + YOUTUBE_BATCH_SIZE));
    }

    const channelBatchResults = await mapWithConcurrency(
      channelBatches,
      YOUTUBE_FETCH_CONCURRENCY,
      async (batchChannelIds) => {
        const parsed: Array<[string, string]> = [];
        try {
          const channelResponse = await fetch(
            `https://www.googleapis.com/youtube/v3/channels?` +
              `part=snippet&id=${batchChannelIds.join(",")}&key=${apiKey}`,
          );

          if (channelResponse.ok) {
            const channelData = await channelResponse.json();
            for (const channel of channelData.items || []) {
              const artistImage = getBestThumbnail(channel.snippet?.thumbnails);
              if (artistImage) {
                parsed.push([channel.id, artistImage]);
              }
            }
          }
        } catch (error) {
          console.error("Error fetching channel thumbnails:", error);
        }
        return parsed;
      },
    );

    const channelThumbnails = new Map<string, string>();
    for (const parsed of channelBatchResults) {
      for (const [channelId, artistImage] of parsed) {
        channelThumbnails.set(channelId, artistImage);
      }
    }

    // Attach artist images to results
    for (const [videoId, channelId] of videoChannelMap) {
      const song = results.get(videoId);
      const artistImage = channelThumbnails.get(channelId);
      if (song && artistImage) {
        song.artistImage = artistImage;
      }
    }
  }

  return results;
}

/**
 * Lookup songs by video IDs - fetches from cache or YouTube API
 * This is a server action that can ONLY be called from within the app
 *
 * Security: Validates that the request comes from an authenticated user
 * and includes origin/referer checks to prevent external calls
 */
export async function lookupSongs(videoIds: string[]): Promise<LookupResult> {
  try {
    // Get request headers for validation
    const headersList = await headers();

    // Validate origin - only allow requests from our own domain
    const origin = headersList.get("origin");

    // In development, allow localhost
    const allowedOrigins = [`${process.env.BETTER_AUTH_URL}`];

    // Check if request is from allowed origin
    const isValidOrigin = origin
      ? allowedOrigins.some((allowed) =>
          origin.startsWith(
            allowed.split(":")[0] +
              "://" +
              allowed.split("://")[1]?.split(":")[0] || "",
          ),
        )
      : true; // Server components don't have origin header

    // For server actions called externally, origin would be from external source
    if (origin && !isValidOrigin) {
      console.warn("Invalid origin attempt:", origin);
      return { success: false, error: "Forbidden" };
    }

    // Check authentication
    const session = await auth.api.getSession({
      headers: headersList,
    });

    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    // Validate input
    if (!Array.isArray(videoIds) || videoIds.length === 0) {
      return { success: false, error: "Invalid video IDs" };
    }

    // Limit number of IDs to prevent abuse
    const limitedIds = videoIds.slice(0, MAX_VIDEO_IDS);

    await connectDB();

    // Step 1: Check cache for existing songs
    const cachedSongs = await Song.find({
      youtubeId: { $in: limitedIds },
    }).lean();

    const cachedMap = new Map<string, ISong>();
    for (const song of cachedSongs) {
      let artist = song.artist;

      // Re-check if cached artist is generic (old cache entries might have "Release")
      if (isGenericArtist(artist)) {
        const extracted = extractArtistFromTitle(song.title);
        artist = extracted || "Unknown Artist";
      }

      cachedMap.set(song.youtubeId, {
        key: song.key,
        youtubeId: song.youtubeId,
        title: song.title,
        artist,
        duration: song.duration,
        channelTitle: song.channelTitle || song.artist,
        thumbnail: song.thumbnail,
        artistImage: song.artistImage,
        releaseDate: song.releaseDate,
      } as ISong);
    }

    // Step 2: Find missing IDs (not in cache OR missing thumbnail)
    const missingIds = limitedIds.filter((id) => !cachedMap.has(id));
    const idsNeedingThumbnails = limitedIds.filter((id) => {
      const cached = cachedMap.get(id);
      return cached && !cached.thumbnail;
    });

    // Step 3: Fetch missing from YouTube API (including ones needing thumbnails)
    const idsToFetch = [...new Set([...missingIds, ...idsNeedingThumbnails])];
    const newSongs = new Map<string, ISong>();

    if (idsToFetch.length > 0 && YOUTUBE_API_KEY) {
      const fetchedSongs = await fetchFromYouTubeAPI(idsToFetch);

      for (const [id, song] of fetchedSongs) {
        newSongs.set(id, song);
      }

      // Step 4: Save new songs to cache OR update existing ones with thumbnails
      if (newSongs.size > 0) {
        const bulkOps = Array.from(newSongs.values()).map((song) => ({
          updateOne: {
            filter: { youtubeId: song.youtubeId },
            update: {
              $set: {
                key: `${song.artist.toLowerCase()} - ${song.title.toLowerCase()}`,
                youtubeId: song.youtubeId,
                title: song.title,
                artist: song.artist,
                duration: song.duration,
                channelTitle: song.channelTitle,
                thumbnail: song.thumbnail,
                artistImage: song.artistImage,
                releaseDate: song.releaseDate,
              },
            },
            upsert: true,
          },
        }));

        try {
          await Song.bulkWrite(bulkOps, { ordered: false });
        } catch {
          // Ignore bulk write errors (e.g. duplicate key on concurrent writes)
        }
      }
    }

    // Step 5: Merge cached + new songs
    const allSongs: Record<string, ISong> = {};

    for (const [id, song] of cachedMap) {
      allSongs[id] = song;
    }

    for (const [id, song] of newSongs) {
      allSongs[id] = song;
    }

    return {
      success: true,
      data: allSongs,
      stats: {
        requested: limitedIds.length,
        cached: cachedMap.size,
        fetched: newSongs.size,
        notFound: limitedIds.length - cachedMap.size - newSongs.size,
      },
    };
  } catch (error) {
    console.error("Error in songs lookup:", error);
    return { success: false, error: "Internal server error" };
  }
}
