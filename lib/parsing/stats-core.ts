/**
 * Pure statistics computation.
 *
 * This is the environment-agnostic core extracted from the old
 * `lib/client/stats-calculator.ts` so it can run both inside a Web Worker
 * (`lib/client/stats.worker.ts`) and on the main thread as a fallback. It has no
 * DOM/`navigator`/server globals — same sharing pattern as
 * `lib/parsing/transforms.ts` and `lib/parsing/scanner.ts` — so it is also
 * Node-testable.
 *
 * The computed `IUserStats` is independent of chunking/yielding: those only
 * affect progress granularity and (on the main thread) UI responsiveness, never
 * the result. The worker passes no `yieldToBrowser`; the main-thread fallback
 * passes one so it stays responsive.
 */

import {
  extractArtistFromTitle,
  isGenericArtist,
} from "@/lib/parsing/transforms";
import type { ISong, IUserStats, ParsedSongInfo } from "@/lib/types/database";

export interface StatsProgress {
  stage: "grouping" | "calculating" | "finalizing" | "complete";
  progress: number;
}

// Default song duration in seconds (3.5 minutes average)
const DEFAULT_SONG_DURATION = 210;

// Current year for age calculations
const CURRENT_YEAR = new Date().getFullYear();

// How many entries to process between progress reports / optional yields.
const PROGRESS_CHUNK = 2000;

/**
 * Extract release year from song title (fallback method)
 * Looks for patterns like (2019), [2015], - 2020, etc.
 */
function extractYearFromTitle(title: string): number | null {
  if (!title) return null;

  // Common patterns for years in song titles
  const patterns = [
    /\((\d{4})\)/, // (2019)
    /\[(\d{4})\]/, // [2019]
    /[-–—]\s*(\d{4})(?:\s|$)/, // - 2019
    /\b(19[5-9]\d|20[0-2]\d)\b/, // standalone year 1950-2029
  ];

  for (const pattern of patterns) {
    const match = title.match(pattern);
    if (match) {
      const year = parseInt(match[1], 10);
      // Validate year is reasonable (1950 to current year + 1)
      if (year >= 1950 && year <= CURRENT_YEAR + 1) {
        return year;
      }
    }
  }

  return null;
}

/**
 * Get release year from metadata or fall back to title extraction
 */
function getReleaseYear(
  entry: ParsedSongInfo,
  metadata?: Map<string, ISong>,
): number | null {
  // First, try to get release date from YouTube metadata
  if (metadata && entry.youtubeId) {
    const songMeta = metadata.get(entry.youtubeId);
    if (songMeta?.releaseDate) {
      const releaseDate = new Date(songMeta.releaseDate);
      const year = releaseDate.getFullYear();
      // Validate year is reasonable
      if (year >= 1950 && year <= CURRENT_YEAR + 1) {
        return year;
      }
    }
  }

  // Fall back to extracting year from title
  return extractYearFromTitle(entry.originalTitle || entry.title);
}

/**
 * Get the era description based on year
 * e.g., "late 2000s", "early 2010s", "mid 1990s"
 */
function getEraDescription(year: number): string {
  const decade = Math.floor(year / 10) * 10;
  const yearInDecade = year % 10;

  let period: string;
  if (yearInDecade <= 3) {
    period = "early";
  } else if (yearInDecade <= 6) {
    period = "mid";
  } else {
    period = "late";
  }

  // Format decade (e.g., "2000s", "1990s")
  const decadeStr = `${decade}s`;

  return `${period} ${decadeStr}`;
}

/**
 * Get decade string from year
 */
function getDecadeFromYear(year: number): string {
  const decade = Math.floor(year / 10) * 10;
  return `${decade}s`;
}

/**
 * Create a normalized song key
 */
function createSongKey(artist: string, title: string): string {
  return `${artist.toLowerCase().trim()} - ${title.toLowerCase().trim()}`;
}

/**
 * Format a Date as a YYYY-MM-DD key in the *local* timezone.
 *
 * Day-bucketing must use the calendar date the listener actually experienced.
 * `toISOString()` would convert to UTC first, so a late-evening play in a
 * timezone ahead of UTC (or an early-morning one behind it) would land on the
 * wrong day — splitting a real day across two buckets.
 */
function toLocalDateKey(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Estimate song duration based on title patterns
 */
function estimateDuration(title: string): number {
  const lowerTitle = title.toLowerCase();

  // Extended/long versions
  if (lowerTitle.includes("extended") || lowerTitle.includes("full version")) {
    return 360; // 6 minutes
  }

  // Remix versions
  if (lowerTitle.includes("remix")) {
    return 240; // 4 minutes
  }

  // Live versions tend to be longer
  if (lowerTitle.includes("live")) {
    return 300; // 5 minutes
  }

  // Acoustic versions
  if (lowerTitle.includes("acoustic")) {
    return 240; // 4 minutes
  }

  // Short/radio edit
  if (lowerTitle.includes("radio edit") || lowerTitle.includes("short")) {
    return 180; // 3 minutes
  }

  // Intro/outro
  if (lowerTitle.includes("intro") || lowerTitle.includes("outro")) {
    return 90; // 1.5 minutes
  }

  // Default average song length
  return DEFAULT_SONG_DURATION;
}

interface SongData {
  title: string;
  artist: string;
  songKey: string;
  youtubeId?: string;
  playCount: number;
  totalDuration: number;
  firstPlayed: Date;
  lastPlayed: Date;
  estimatedDuration: number;
  thumbnail?: string;
  artistImage?: string;
}

interface ArtistData {
  name: string;
  playCount: number;
  totalDuration: number;
  songs: Set<string>;
  firstPlayed: Date;
  lastPlayed: Date;
  artistImage?: string;
}

interface DailyData {
  date: string;
  playCount: number;
  totalDuration: number;
}

interface SongYearData {
  title: string;
  artist: string;
  year: number;
  playCount: number;
}

/**
 * Compute all statistics from parsed entries.
 *
 * Pure aside from the optional `onProgress`/`yieldToBrowser` callbacks. The
 * output is identical regardless of whether `yieldToBrowser` is supplied.
 *
 * @param entries - Parsed song entries
 * @param metadata - Optional pre-fetched song metadata map (youtubeId -> metadata)
 * @param onProgress - Progress callback
 * @param yieldToBrowser - Optional cooperative-yield hook (main-thread fallback only)
 */
export async function computeStats(
  entries: ParsedSongInfo[],
  metadata?: Map<string, ISong>,
  onProgress?: (progress: StatsProgress) => void,
  yieldToBrowser?: () => Promise<void>,
): Promise<IUserStats> {
  onProgress?.({ stage: "grouping", progress: 0 });

  // Maps for aggregation
  const songMap = new Map<string, SongData>();
  const artistMap = new Map<string, ArtistData>();
  const dailyMap = new Map<string, DailyData>();

  // Song age tracking
  const songYearMap = new Map<string, SongYearData>();
  const decadeCountMap = new Map<string, number>();

  let totalPlaytime = 0;
  let totalSongLength = 0;
  let firstPlayDate: Date | undefined;
  let lastPlayDate: Date | undefined;

  // Per-entry caches (filled by the precompute pass below).
  //
  // `songLengths[i]` is the full length of the track played by entry i — used
  // for "song length" semantics (a song's own duration, average song length).
  //
  // `durations[i]` is the *effective* time actually spent on entry i — used for
  // every "time listened" total. YouTube history only records when a track was
  // started, never how long it was heard, so counting every play at full length
  // overcounts skipped / back-to-back tracks (this is what let "Longest Day"
  // exceed 24h). We cap each play at the gap until the next play started, so a
  // track skipped after 20s counts ~20s while a fully-played track counts its
  // real length, and idle time between plays is naturally excluded.
  const songLengths = new Float64Array(entries.length);
  const durations = new Float64Array(entries.length);

  // Current-month playtime is accumulated inside the main loop (folding away a
  // separate full pass over entries). Computed once here.
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  currentMonthStart.setHours(0, 0, 0, 0); // Ensure start of day
  let monthlyPlaytime = 0;

  /**
   * Get duration for an entry - prefer real metadata, fall back to estimation
   */
  function getDuration(entry: ParsedSongInfo): number {
    if (metadata && entry.youtubeId) {
      const songMeta = metadata.get(entry.youtubeId);
      if (songMeta?.duration && songMeta.duration > 0) {
        return songMeta.duration;
      }
    }
    return estimateDuration(entry.title);
  }

  /**
   * Get artist name - prefer metadata (fixes "Release" issue), fall back to parsed
   */
  function getArtist(entry: ParsedSongInfo): string {
    if (metadata && entry.youtubeId) {
      const songMeta = metadata.get(entry.youtubeId);
      // Use metadata artist if it's valid and not generic
      if (songMeta?.artist && !isGenericArtist(songMeta.artist)) {
        return songMeta.artist;
      }
    }
    // Fall back to parsed artist if it's not generic
    if (!isGenericArtist(entry.artist)) {
      return entry.artist;
    }
    // Last resort: try to extract from original title
    return extractArtistFromTitle(entry.originalTitle) || entry.artist;
  }

  /**
   * Get song thumbnail from metadata
   */
  function getThumbnail(entry: ParsedSongInfo): string | undefined {
    if (metadata && entry.youtubeId) {
      const songMeta = metadata.get(entry.youtubeId);
      return songMeta?.thumbnail;
    }
    return undefined;
  }

  /**
   * Get artist image from metadata
   */
  function getArtistImage(entry: ParsedSongInfo): string | undefined {
    if (metadata && entry.youtubeId) {
      const songMeta = metadata.get(entry.youtubeId);
      return songMeta?.artistImage;
    }
    return undefined;
  }

  // Precompute per-entry full song lengths, then derive the effective listen
  // duration for each play using a three-tier heuristic:
  //
  //   1. **Fully played (auto-play)** — gap ≈ song length (within a tolerance).
  //      YouTube Music auto-plays the next track with only a brief transition
  //      gap. When the gap closely matches the song's duration, the listener
  //      almost certainly heard the whole track. Count the full song length.
  //
  //   2. **Skipped** — gap < 30% of song length. The user switched away or
  //      skipped early. Count only the actual gap (≈ time heard).
  //
  //   3. **Partial listen** — gap falls between the skip and auto-play
  //      thresholds. The listener heard a portion of the track. Count the gap.
  //
  // When the gap *exceeds* the song length (idle time after the song ended),
  // tier 1 catches it and counts just the song length — never the idle time.
  //
  // This needs chronological order, which the raw `entries` array may not be in,
  // so we sort a lightweight index array rather than the entries themselves.

  // Tolerance in seconds for auto-play detection: accounts for buffering,
  // transition animations, and small clock skew between entries.
  const AUTOPLAY_BUFFER_SECS = 15;
  // Fraction of song length below which a play is considered a skip.
  const SKIP_THRESHOLD = 0.3;

  for (let j = 0; j < entries.length; j++) {
    songLengths[j] = getDuration(entries[j]);
  }
  const chronoOrder = Array.from({ length: entries.length }, (_, i) => i);
  chronoOrder.sort(
    (a, b) => entries[a].playedAt.getTime() - entries[b].playedAt.getTime(),
  );
  for (let k = 0; k < chronoOrder.length; k++) {
    const idx = chronoOrder[k];
    const fullLength = songLengths[idx];
    if (k + 1 >= chronoOrder.length) {
      // The final play has no following timestamp to bound it — count it in full.
      durations[idx] = fullLength;
      continue;
    }
    const nextIdx = chronoOrder[k + 1];
    const gapSeconds =
      (entries[nextIdx].playedAt.getTime() - entries[idx].playedAt.getTime()) /
      1000;

    // Clamp negative gaps (duplicate/out-of-order timestamps) to zero.
    const clampedGap = Math.max(0, gapSeconds);

    if (clampedGap >= fullLength - AUTOPLAY_BUFFER_SECS) {
      // Tier 1: gap ≈ song length or longer → fully played (auto-play / idle).
      durations[idx] = fullLength;
    } else if (clampedGap < fullLength * SKIP_THRESHOLD) {
      // Tier 2: very short gap → likely a skip. Count actual listen time.
      durations[idx] = clampedGap;
    } else {
      // Tier 3: partial listen — count the gap as actual listen time.
      durations[idx] = clampedGap;
    }
  }

  // Process entries in chunks (chunking only affects progress cadence / optional
  // yields — never the computed result).
  for (let i = 0; i < entries.length; i += PROGRESS_CHUNK) {
    const batchEnd = Math.min(i + PROGRESS_CHUNK, entries.length);

    for (let j = i; j < batchEnd; j++) {
      const entry = entries[j];
      const artist = getArtist(entry);
      const songKey = createSongKey(artist, entry.title);
      // `duration` is the effective time listened (three-tier heuristic: fully
      // played / skipped / partial); `songLength` is the track's own full
      // length. Time-listened totals use `duration`; song-length stats use
      // `songLength`.
      const duration = durations[j];
      const songLength = songLengths[j];
      const dateStr = toLocalDateKey(entry.playedAt);

      // Update total playtime (effective) and total song length (for averages)
      totalPlaytime += duration;
      totalSongLength += songLength;

      // Accumulate current-month playtime in this same pass. Comparing the raw
      // timestamp against the 1st-of-month boundary is equivalent to the old
      // normalized-to-start-of-day check (normalization never changes month
      // membership relative to a 00:00 month boundary).
      if (entry.playedAt >= currentMonthStart) {
        monthlyPlaytime += duration;
      }

      // Track first/last play dates
      if (!firstPlayDate || entry.playedAt < firstPlayDate) {
        firstPlayDate = entry.playedAt;
      }
      if (!lastPlayDate || entry.playedAt > lastPlayDate) {
        lastPlayDate = entry.playedAt;
      }

      // Update song data
      const existingSong = songMap.get(songKey);
      if (existingSong) {
        existingSong.playCount++;
        existingSong.totalDuration += duration;
        if (entry.playedAt < existingSong.firstPlayed) {
          existingSong.firstPlayed = entry.playedAt;
        }
        if (entry.playedAt > existingSong.lastPlayed) {
          existingSong.lastPlayed = entry.playedAt;
        }
        // Update thumbnail/artistImage if we don't have one yet
        if (!existingSong.thumbnail) {
          existingSong.thumbnail = getThumbnail(entry);
        }
        if (!existingSong.artistImage) {
          existingSong.artistImage = getArtistImage(entry);
        }
      } else {
        songMap.set(songKey, {
          title: entry.title,
          artist: artist,
          songKey,
          youtubeId: entry.youtubeId,
          playCount: 1,
          totalDuration: duration,
          firstPlayed: entry.playedAt,
          lastPlayed: entry.playedAt,
          estimatedDuration: songLength,
          thumbnail: getThumbnail(entry),
          artistImage: getArtistImage(entry),
        });
      }

      // Update artist data
      const artistKey = artist.toLowerCase().trim();
      const existingArtist = artistMap.get(artistKey);
      if (existingArtist) {
        existingArtist.playCount++;
        existingArtist.totalDuration += duration;
        existingArtist.songs.add(songKey);
        if (entry.playedAt < existingArtist.firstPlayed) {
          existingArtist.firstPlayed = entry.playedAt;
        }
        if (entry.playedAt > existingArtist.lastPlayed) {
          existingArtist.lastPlayed = entry.playedAt;
        }
        // Update artist image if we don't have one yet
        if (!existingArtist.artistImage) {
          existingArtist.artistImage = getArtistImage(entry);
        }
      } else {
        artistMap.set(artistKey, {
          name: artist,
          playCount: 1,
          totalDuration: duration,
          songs: new Set([songKey]),
          firstPlayed: entry.playedAt,
          lastPlayed: entry.playedAt,
          artistImage: getArtistImage(entry),
        });
      }

      // Update daily data
      const existingDaily = dailyMap.get(dateStr);
      if (existingDaily) {
        existingDaily.playCount++;
        existingDaily.totalDuration += duration;
      } else {
        dailyMap.set(dateStr, {
          date: dateStr,
          playCount: 1,
          totalDuration: duration,
        });
      }

      // Extract and track song release year for "listening age" calculation
      // Prefer YouTube API release date, fall back to title extraction
      const releaseYear = getReleaseYear(entry, metadata);
      if (releaseYear) {
        const existingYearData = songYearMap.get(songKey);
        if (existingYearData) {
          existingYearData.playCount++;
        } else {
          songYearMap.set(songKey, {
            title: entry.title,
            artist: artist,
            year: releaseYear,
            playCount: 1,
          });
        }
        // Track decade distribution
        const decade = getDecadeFromYear(releaseYear);
        decadeCountMap.set(decade, (decadeCountMap.get(decade) || 0) + 1);
      }
    }

    // Update progress (0% to 60% for grouping)
    const progress = (batchEnd / entries.length) * 60;
    onProgress?.({ stage: "grouping", progress: Math.round(progress) });

    // Yield to browser (main-thread fallback only; no-op in the worker)
    await yieldToBrowser?.();
  }

  onProgress?.({ stage: "calculating", progress: 65 });
  await yieldToBrowser?.();

  // Calculate top songs (sorted by play count)
  const topSongs: ISong[] = Array.from(songMap.values())
    .sort((a, b) => b.playCount - a.playCount)
    .slice(0, 10)
    .map((song) => ({
      key: song.songKey,
      title: song.title,
      artist: song.artist,
      youtubeId: song.youtubeId,
      duration: song.estimatedDuration,
      playCount: song.playCount,
      totalDuration: song.totalDuration,
      thumbnail: song.thumbnail,
      artistImage: song.artistImage,
    }));

  onProgress?.({ stage: "calculating", progress: 75 });
  await yieldToBrowser?.();

  // Calculate top artists (sorted by play count)
  // Filter out 'Release' as it's not a real artist name
  const topArtists = Array.from(artistMap.values())
    .filter((artist) => artist.name.toLowerCase() !== "release")
    .sort((a, b) => b.playCount - a.playCount)
    .slice(0, 10)
    .map((artist) => ({
      name: artist.name,
      playCount: artist.playCount,
      totalDuration: artist.totalDuration,
      uniqueSongs: artist.songs.size,
      artistImage: artist.artistImage,
    }));

  onProgress?.({ stage: "calculating", progress: 85 });
  await yieldToBrowser?.();

  // Calculate daily stats
  const dailyStats = Array.from(dailyMap.values());
  const longestDay = dailyStats.reduce(
    (max, day) => (day.totalDuration > max.totalDuration ? day : max),
    { date: "", totalDuration: 0, playCount: 0 },
  );

  // Calculate listening sessions (songs played within 1 hour of each other).
  // Reuse the chronological ordering and effective per-entry durations computed
  // during the precompute pass above.
  let longestSession = 0;
  let currentSession = 0;
  let lastPlayTime: Date | null = null;

  for (const i of chronoOrder) {
    const entry = entries[i];
    const duration = durations[i];
    if (
      lastPlayTime &&
      entry.playedAt.getTime() - lastPlayTime.getTime() <= 3600000
    ) {
      currentSession += duration;
    } else {
      longestSession = Math.max(longestSession, currentSession);
      currentSession = duration;
    }
    lastPlayTime = entry.playedAt;
  }
  longestSession = Math.max(longestSession, currentSession);

  onProgress?.({ stage: "finalizing", progress: 95 });
  await yieldToBrowser?.();

  // Calculate averages
  const totalDays =
    firstPlayDate && lastPlayDate
      ? Math.max(
          1,
          Math.ceil(
            (lastPlayDate.getTime() - firstPlayDate.getTime()) /
              (1000 * 60 * 60 * 24),
          ),
        )
      : 1;

  const totalListens = entries.length;
  const dailyAverageListens = totalListens / totalDays;
  const dailyAveragePlaytime = totalPlaytime / totalDays;
  const averageSongLength =
    totalListens > 0 ? totalSongLength / totalListens : DEFAULT_SONG_DURATION;

  // Calculate current month stats. monthlyPlaytime was accumulated during the
  // main pass above; here we only need the new-artists count (derived from the
  // already-aggregated artistMap, not a fresh pass over entries).
  let newArtistsThisMonth = 0;

  for (const artist of artistMap.values()) {
    // Compare dates properly by normalizing to start of day
    const firstPlayedDate = new Date(artist.firstPlayed);
    firstPlayedDate.setHours(0, 0, 0, 0);
    if (firstPlayedDate >= currentMonthStart) {
      newArtistsThisMonth++;
    }
  }

  // Calculate Song Age statistics (Spotify Wrapped style)
  let listeningAge: number | undefined;
  let averageReleaseYear: number | undefined;
  let musicEra: string | undefined;
  let decadeDistribution:
    | Array<{ decade: string; count: number; percentage: number }>
    | undefined;
  let oldestSong: { title: string; artist: string; year: number } | undefined;
  let newestSong: { title: string; artist: string; year: number } | undefined;
  const songsWithYearCount = songYearMap.size;

  if (songYearMap.size > 0) {
    // Calculate weighted average release year (weighted by play count)
    let totalWeightedYear = 0;
    let totalWeight = 0;
    let oldestYear = CURRENT_YEAR;
    let newestYear = 1900;

    for (const songData of songYearMap.values()) {
      totalWeightedYear += songData.year * songData.playCount;
      totalWeight += songData.playCount;

      // Track oldest and newest songs
      if (songData.year < oldestYear) {
        oldestYear = songData.year;
        oldestSong = {
          title: songData.title,
          artist: songData.artist,
          year: songData.year,
        };
      }
      if (songData.year > newestYear) {
        newestYear = songData.year;
        newestSong = {
          title: songData.title,
          artist: songData.artist,
          year: songData.year,
        };
      }
    }

    if (totalWeight > 0) {
      averageReleaseYear = Math.round(totalWeightedYear / totalWeight);
      listeningAge = CURRENT_YEAR - averageReleaseYear;
      musicEra = getEraDescription(averageReleaseYear);
    }

    // Build decade distribution
    const totalDecadeListens = Array.from(decadeCountMap.values()).reduce(
      (a, b) => a + b,
      0,
    );
    if (totalDecadeListens > 0) {
      decadeDistribution = Array.from(decadeCountMap.entries())
        .map(([decade, count]) => ({
          decade,
          count,
          percentage: Math.round((count / totalDecadeListens) * 100),
        }))
        .sort((a, b) => b.count - a.count); // Sort by count descending
    }
  }

  onProgress?.({ stage: "complete", progress: 100 });

  // Build final stats object
  const stats: IUserStats = {
    totalSongs: songMap.size,
    totalArtists: artistMap.size,
    totalPlaytime: Math.round(totalPlaytime),
    averageSongLength: Math.round(averageSongLength),
    topArtist: topArtists[0]?.name,
    topSong: topSongs[0]
      ? `${topSongs[0].artist} - ${topSongs[0].title}`
      : undefined,
    firstPlayDate,
    lastPlayDate,
    lastUpdated: new Date(),
    totalListens,
    monthlyPlaytime: Math.round(monthlyPlaytime),
    dailyAverageListens: Math.round(dailyAverageListens),
    dailyAveragePlaytime: Math.round(dailyAveragePlaytime),
    longestListenDay: longestDay.date
      ? new Date(`${longestDay.date}T00:00:00`)
      : undefined,
    longestListenDayDuration: Math.round(longestDay.totalDuration),
    longestSession: Math.round(longestSession),
    topSongs,
    topArtists,
    newArtistsThisMonth,
    totalNewArtists: artistMap.size,
    // Song Age statistics
    listeningAge,
    averageReleaseYear,
    musicEra,
    decadeDistribution,
    oldestSong,
    newestSong,
    songsWithYearCount,
  };

  return stats;
}
