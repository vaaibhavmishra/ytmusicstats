/**
 * Client-side Statistics Calculator
 *
 * Calculates all music statistics in the browser
 * with memory-efficient processing and progress updates
 */

import type { ISong, IUserStats, ParsedSongInfo } from "@/lib/types/database";
import {
  extractArtistFromTitle,
  getDeviceCapability,
  isGenericArtist,
} from "./parser";

export interface StatsProgress {
  stage: "grouping" | "calculating" | "finalizing" | "complete";
  progress: number;
}

// Default song duration in seconds (3.5 minutes average)
const DEFAULT_SONG_DURATION = 210;

// Current year for age calculations
const CURRENT_YEAR = new Date().getFullYear();

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
 * Yield to browser to prevent UI freeze
 */
function yieldToBrowser(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
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
 * Main function to calculate all statistics
 * @param entries - Parsed song entries
 * @param onProgress - Progress callback
 * @param metadata - Optional pre-fetched song metadata map (youtubeId -> metadata)
 */
export async function calculateStats(
  entries: ParsedSongInfo[],
  onProgress?: (progress: StatsProgress) => void,
  metadata?: Map<string, ISong>,
): Promise<IUserStats> {
  const capability = getDeviceCapability();
  const batchSize = capability === "high" ? 2000 : 500;

  onProgress?.({ stage: "grouping", progress: 0 });

  // Maps for aggregation
  const songMap = new Map<string, SongData>();
  const artistMap = new Map<string, ArtistData>();
  const dailyMap = new Map<string, DailyData>();

  // Song age tracking
  const songYearMap = new Map<string, SongYearData>();
  const decadeCountMap = new Map<string, number>();

  let totalPlaytime = 0;
  let firstPlayDate: Date | undefined;
  let lastPlayDate: Date | undefined;

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

  // Process entries in batches
  for (let i = 0; i < entries.length; i += batchSize) {
    const batchEnd = Math.min(i + batchSize, entries.length);

    for (let j = i; j < batchEnd; j++) {
      const entry = entries[j];
      const artist = getArtist(entry);
      const songKey = createSongKey(artist, entry.title);
      const duration = getDuration(entry);
      const dateStr = entry.playedAt.toISOString().split("T")[0];

      // Update total playtime
      totalPlaytime += duration;

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
          estimatedDuration: duration,
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

    // Yield to browser
    if (capability === "low" || i % (batchSize * 2) === 0) {
      await yieldToBrowser();
    }
  }

  onProgress?.({ stage: "calculating", progress: 65 });
  await yieldToBrowser();

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
  await yieldToBrowser();

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
  await yieldToBrowser();

  // Calculate daily stats
  const dailyStats = Array.from(dailyMap.values());
  const longestDay = dailyStats.reduce(
    (max, day) => (day.totalDuration > max.totalDuration ? day : max),
    { date: "", totalDuration: 0, playCount: 0 },
  );

  // Calculate listening sessions (songs played within 1 hour of each other)
  const sortedEntries = [...entries].sort(
    (a, b) => a.playedAt.getTime() - b.playedAt.getTime(),
  );

  let longestSession = 0;
  let currentSession = 0;
  let lastPlayTime: Date | null = null;

  for (const entry of sortedEntries) {
    const duration = getDuration(entry);
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
  await yieldToBrowser();

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
    totalListens > 0 ? totalPlaytime / totalListens : DEFAULT_SONG_DURATION;

  // Calculate current month stats
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  currentMonthStart.setHours(0, 0, 0, 0); // Ensure start of day

  let monthlyPlaytime = 0;
  let newArtistsThisMonth = 0;

  const artistFirstPlayed = new Map<string, Date>();
  for (const artist of artistMap.values()) {
    artistFirstPlayed.set(artist.name.toLowerCase(), artist.firstPlayed);
    // Compare dates properly by normalizing to start of day
    const firstPlayedDate = new Date(artist.firstPlayed);
    firstPlayedDate.setHours(0, 0, 0, 0);
    if (firstPlayedDate >= currentMonthStart) {
      newArtistsThisMonth++;
    }
  }

  for (const entry of entries) {
    const entryDate = new Date(entry.playedAt);
    entryDate.setHours(0, 0, 0, 0);
    if (entryDate >= currentMonthStart) {
      monthlyPlaytime += getDuration(entry);
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
    totalPlaytime,
    averageSongLength,
    topArtist: topArtists[0]?.name,
    topSong: topSongs[0]
      ? `${topSongs[0].artist} - ${topSongs[0].title}`
      : undefined,
    firstPlayDate,
    lastPlayDate,
    lastUpdated: new Date(),
    totalListens,
    monthlyPlaytime,
    dailyAverageListens,
    dailyAveragePlaytime,
    longestListenDay: longestDay.date ? new Date(longestDay.date) : undefined,
    longestListenDayDuration: longestDay.totalDuration,
    longestSession,
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

/**
 * Process file and calculate stats in one go
 */
export async function processFileAndCalculateStats(
  entries: ParsedSongInfo[],
  onProgress?: (progress: StatsProgress) => void,
  metadata?: Map<string, ISong>,
): Promise<IUserStats> {
  return calculateStats(entries, onProgress, metadata);
}
