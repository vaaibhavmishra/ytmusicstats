/**
 * Represents the progress state during file parsing operations.
 * Used to track and display parsing progress to users.
 */
export interface ParseProgress {
  /** Current stage of the parsing process */
  stage: "reading" | "parsing" | "filtering" | "complete";
  /** Progress percentage (0-100) */
  progress: number;
  /** Number of entries processed so far */
  entriesProcessed?: number;
  /** Total number of entries to process */
  totalEntries?: number;
  /** Number of music-related entries found */
  musicEntries?: number;
}

/**
 * Result of parsing a Google Takeout file.
 * Contains parsed entries and metadata about the parsing operation.
 */
export interface ParseResult {
  /** Array of successfully parsed song entries */
  entries: ParsedSongInfo[];
  /** De-duplicated YouTube video IDs across all entries (collected during parsing) */
  uniqueVideoIds: string[];
  /** Total number of entries found in the file */
  totalEntries: number;
  /** Number of entries identified as music */
  musicEntries: number;
  /** Error message if parsing failed */
  error?: string;
}

/**
 * User statistics aggregated from their listening history.
 * Contains comprehensive analytics about user's music consumption.
 *
 * @example
 * ```typescript
 * const stats: IUserStats = {
 *   totalSongs: 500,
 *   totalArtists: 120,
 *   totalPlaytime: 86400, // 24 hours in seconds
 *   // ... other fields
 * };
 * ```
 */
export interface IUserStats {
  /** Total number of unique songs played */
  totalSongs: number;
  /** Total number of unique artists listened to */
  totalArtists: number;
  /** Total playtime in seconds */
  totalPlaytime: number;
  /** Average song length in seconds */
  averageSongLength: number;
  /** Name of the most played artist */
  topArtist?: string;
  /** Title of the most played song */
  topSong?: string;
  /** Date of the earliest play in history */
  firstPlayDate?: Date;
  /** Date of the most recent play */
  lastPlayDate?: Date;
  /** Timestamp of when stats were last calculated */
  lastUpdated: Date;
  /** Total play count (can exceed unique songs due to replays) */
  totalListens: number;
  /** Total playtime for the current month in seconds */
  monthlyPlaytime: number;
  /** Average number of listens per day */
  dailyAverageListens: number;
  /** Average playtime per day in seconds */
  dailyAveragePlaytime: number;
  /** Date with the highest listening duration */
  longestListenDay?: Date;
  /** Duration of the longest listening day in seconds */
  longestListenDayDuration: number;
  /** Longest continuous listening session in seconds */
  longestSession: number;
  /**
   * Top 10 most played songs with detailed statistics.
   * Sorted by play count in descending order.
   */
  topSongs: ISong[];
  /**
   * Top 10 most listened artists with detailed statistics.
   * Sorted by play count in descending order.
   */
  topArtists: Array<{
    /** Artist name */
    name: string;
    /** Total number of plays across all songs */
    playCount: number;
    /** Total duration listened in seconds */
    totalDuration: number;
    /** Number of unique songs by this artist */
    uniqueSongs: number;
    /** Artist image URL (from YouTube channel thumbnail) */
    artistImage?: string;
  }>;
  /** Number of new artists discovered in the current month */
  newArtistsThisMonth: number;
  /** Total number of artists discovered since first play */
  totalNewArtists: number;

  // Song Age Statistics (Spotify Wrapped style)
  /** The "listening age" - how old your music taste is (current year - average release year) */
  listeningAge?: number;
  /** The average release year of songs listened to */
  averageReleaseYear?: number;
  /** Description of the era (e.g., "late 2000s", "early 2010s") */
  musicEra?: string;
  /** Breakdown of listening by decade */
  decadeDistribution?: Array<{
    decade: string;
    count: number;
    percentage: number;
  }>;
  /** The oldest song in your library with a detected release year */
  oldestSong?: {
    title: string;
    artist: string;
    year: number;
  };
  /** The newest song in your library with a detected release year */
  newestSong?: {
    title: string;
    artist: string;
    year: number;
  };
  /** Number of songs with detected release years */
  songsWithYearCount?: number;
}

/**
 * Represents a song entity stored in the database.
 * Contains metadata about the song including duration estimation details.
 *
 * @example
 * ```typescript
 * const song: ISong = {
 *   key: "artist name - song title",
 *   title: "Song Title",
 *   artist: "Artist Name",
 *   duration: 240,
 *   genres: ["pop", "rock"],
 *   createdAt: new Date(),
 *   updatedAt: new Date(),
 * };
 * ```
 */
export interface ISong {
  /** Unique normalized key in format "artist - title" */
  key: string;
  /** Song title */
  title: string;
  /** Artist name */
  artist: string;
  /** Channel title */
  channelTitle?: string;
  /** Song duration in seconds */
  duration: number;
  /** YouTube video ID if available */
  youtubeId?: string;
  /** Song thumbnail URL (from YouTube) */
  thumbnail?: string;
  /** Channel/Artist thumbnail URL */
  artistImage?: string;
  /** Release/publish date from YouTube */
  releaseDate?: Date;
  /** Array of genre tags */
  genres?: string[];
  /** Number of times this song was played (used in stats) */
  playCount?: number;
  /** Total duration listened in seconds (used in stats) */
  totalDuration?: number;
  /** Document creation timestamp */
  createdAt?: Date;
  /** Last update timestamp */
  updatedAt?: Date;
}

/**
 * Raw entry structure from Google Takeout JSON export.
 * Represents a single activity entry from YouTube Music history.
 *
 * @see {@link https://takeout.google.com/ Google Takeout}
 */
export interface GoogleTakeoutEntry {
  /** Header indicating the type of activity (e.g., "YouTube Music") */
  header: string;
  /** Title of the watched/played content */
  title: string;
  /** URL to the YouTube video/music */
  titleUrl?: string;
  /** Subtitle information, typically contains artist/channel info */
  subtitles?: Array<{
    /** Subtitle text (usually artist or channel name) */
    name: string;
    /** URL to the artist/channel page */
    url?: string;
  }>;
  /** ISO 8601 timestamp of when the activity occurred */
  time: string;
  /** Array of Google products associated with this activity */
  products: string[];
  /** Activity controls that were enabled for this entry */
  activityControls?: string[];
}

/**
 * Parsed and normalized song information extracted from raw Takeout data.
 * Contains cleaned and structured data ready for processing.
 */
export interface ParsedSongInfo {
  /** Cleaned song title */
  title: string;
  /** Cleaned artist name */
  artist: string;
  /** Original title from Takeout (before cleaning) */
  originalTitle: string;
  /** YouTube video ID extracted from URL */
  youtubeId: string | undefined;
  /** Timestamp when the song was played */
  playedAt: Date;
}

/**
 * Generic API response wrapper for consistent response structure.
 * Use this type for all API endpoints to ensure consistent response format.
 *
 * @typeParam T - The type of data returned on success
 *
 * @example
 * ```typescript
 * // Success response
 * const successResponse: ApiResponse<IUserStats> = {
 *   success: true,
 *   data: userStats,
 *   message: "Stats fetched successfully",
 * };
 *
 * // Error response
 * const errorResponse: ApiResponse = {
 *   success: false,
 *   error: "User not found",
 * };
 * ```
 */
export interface ApiResponse<T = unknown> {
  /** Indicates if the request was successful */
  success: boolean;
  /** Response payload (only present on success) */
  data?: T;
  /** Error message (only present on failure) */
  error?: string;
  /** Optional human-readable message */
  message?: string;
}

/**
 * Statistics returned from a song lookup operation.
 * Provides details about cache hits and API fetches.
 */
export interface LookupStats {
  /** Total number of video IDs requested */
  requested: number;
  /** Number of songs found in cache */
  cached: number;
  /** Number of songs fetched from YouTube API */
  fetched: number;
  /** Number of songs that couldn't be found */
  notFound: number;
}

/**
 * Result of a song lookup operation.
 * Contains song data and statistics about the lookup.
 */
export interface LookupResult {
  /** Indicates if the lookup was successful */
  success: boolean;
  /** Map of video IDs to song data */
  data?: Record<string, ISong>;
  /** Statistics about the lookup operation */
  stats?: LookupStats;
  /** Error message if lookup failed */
  error?: string;
}

/**
 * Progress state for fetching song metadata from YouTube.
 * Used to track and display fetch progress to users.
 */
export interface FetchProgress {
  /** Total number of unique songs to fetch */
  total: number;
  /** Number of songs processed so far */
  processed: number;
  /** Number of songs fetched from YouTube API */
  fetched: number;
  /** Number of songs retrieved from cache */
  cached: number;
  /** Current batch number being processed */
  currentBatch: number;
  /** Total number of batches to process */
  totalBatches: number;
}
