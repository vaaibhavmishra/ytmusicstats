/**
 * Pure Google Takeout transform/filter functions.
 *
 * This module is environment-agnostic — it references no DOM, `window`, or
 * `self`/`postMessage` globals — so it can be safely imported by:
 *   - the main-thread parser (`lib/client/parser.ts`)
 *   - the parsing Web Worker (`lib/client/parser.worker.ts`)
 *   - the server action (`app/actions/songs.ts`, "use server")
 *
 * Keep it free of any browser/worker-only APIs.
 */

import type { GoogleTakeoutEntry, ParsedSongInfo } from "@/lib/types/database";

/**
 * Check if entry is from YouTube Music
 */
export function isYouTubeMusicEntry(entry: GoogleTakeoutEntry): boolean {
  if (!entry.title || !entry.time) {
    return false;
  }

  if (entry.header !== "YouTube Music") {
    return false;
  }

  const title = entry.title.toLowerCase();
  const excludePatterns = [
    "watched a video that has been removed",
    "watched a private video",
    "watched a video",
    "visited youtube.com",
    "searched for",
  ];

  if (excludePatterns.some((pattern) => title.includes(pattern))) {
    return false;
  }

  if (entry.title.length < 3 || entry.title.length > 200) {
    return false;
  }

  return true;
}

/**
 * Extract YouTube video ID from URL
 */
export function extractYouTubeId(url: string): string | undefined {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return undefined;
}

/**
 * Clean the raw title from Google Takeout
 */
export function cleanTitle(title: string): string {
  return title
    .trim()
    .replace(/^watched\s+/i, "")
    .replace(/\s*\(official\s+(video|audio|music\s+video)\)$/i, "")
    .replace(/\s*\[official\s+(video|audio|music\s+video)\]$/i, "")
    .replace(/\s*-\s*official\s+(video|audio|music\s+video)$/i, "")
    .replace(/\s*\((lyrics|lyric\s+video|with\s+lyrics)\)$/i, "")
    .replace(/\s*\[(lyrics|lyric\s+video|with\s+lyrics)\]$/i, "")
    .replace(/\s*\[(hd|hq|4k)\]$/i, "")
    .replace(/\s*\((hd|hq|4k)\)$/i, "")
    .replace(/\s*\(\d{4}\)$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Clean song title
 */
export function cleanSongTitle(title: string): string {
  return title
    .trim()
    .replace(/\s+(feat\.|ft\.|featuring)\s+.+$/i, "")
    .replace(/\s*\(\s*remix\s*\)$/i, "")
    .trim();
}

/**
 * Clean artist name
 */
export function cleanArtistName(artist: string): string {
  return artist
    .trim()
    .replace(/\s*-\s*topic$/i, "")
    .replace(/\s+official$/i, "")
    .replace(/\s+vevo$/i, "")
    .replace(/\s+music$/i, "")
    .replace(/\s+records$/i, "")
    .trim();
}

/**
 * Check if the artist/channel name is generic (like "Release", "Various Artists", etc.)
 */
export function isGenericArtist(artist: string): boolean {
  const genericNames = new Set([
    "release",
    "various artists",
    "various",
    "unknown",
    "unknown artist",
    "music",
    "songs",
    "audio",
    "official",
    "lyrics",
    "lyric video",
    "audio library",
    "no copyright sounds",
    "ncs",
    "trap nation",
    "bass nation",
    "proximity",
    "mrsuicidesheep",
    "chill nation",
    "wave music",
    "vevo",
    "topic",
  ]);

  const normalized = artist.toLowerCase().trim();
  return normalized === "" || genericNames.has(normalized);
}

/**
 * Extract artist name from video title
 * Common patterns: "Artist - Song", "Artist | Song", "Song by Artist"
 */
export function extractArtistFromTitle(title: string): string | null {
  if (!title) return null;

  // Remove common suffixes first
  const cleanTitle = title
    .replace(
      /\s*\(Official\s*(Video|Audio|Music Video|Lyric Video|Lyrics)?\)/gi,
      "",
    )
    .replace(
      /\s*\[Official\s*(Video|Audio|Music Video|Lyric Video|Lyrics)?\]/gi,
      "",
    )
    .replace(/\s*\(Lyrics?\)/gi, "")
    .replace(/\s*\[Lyrics?\]/gi, "")
    .replace(/\s*\(Audio\)/gi, "")
    .replace(/\s*\[Audio\]/gi, "")
    .replace(/\s*\(HD\)/gi, "")
    .replace(/\s*\[HD\]/gi, "")
    .replace(/\s*\(HQ\)/gi, "")
    .replace(/\s*\[HQ\]/gi, "")
    .trim();

  // Pattern 1: "Artist - Song" (most common)
  const dashMatch = cleanTitle.match(/^(.+?)\s*[-–—]\s*.+$/);
  if (dashMatch?.[1]) {
    const artist = dashMatch[1].trim();
    if (artist.length > 2 && !/^\d+$/.test(artist)) {
      return artist;
    }
  }

  // Pattern 2: "Song by Artist"
  const byMatch = cleanTitle.match(/^.+?\s+by\s+(.+)$/i);
  if (byMatch?.[1]) {
    return byMatch[1].trim();
  }

  // Pattern 3: "Artist | Song"
  const pipeMatch = cleanTitle.match(/^(.+?)\s*\|\s*.+$/);
  if (pipeMatch?.[1]) {
    const artist = pipeMatch[1].trim();
    if (artist.length > 2 && !/^\d+$/.test(artist)) {
      return artist;
    }
  }

  // Pattern 4: "Artist: Song"
  const colonMatch = cleanTitle.match(/^(.+?)\s*:\s*.+$/);
  if (colonMatch?.[1]) {
    const artist = colonMatch[1].trim();
    if (artist.length > 2 && !/^\d+$/.test(artist)) {
      return artist;
    }
  }

  return null;
}

// Separator characters allowed between an artist prefix and the song title.
const ARTIST_TITLE_SEPARATORS = "-–—·•:";

/**
 * Strip a leading artist prefix from a title without compiling a per-entry
 * RegExp. Mirrors the old anchored pattern `^artist\s*[-–—·•:]?\s*` (case
 * insensitive): if `title` starts with `artist`, returns the remainder with
 * optional surrounding whitespace and a single separator removed; otherwise
 * returns `null`.
 */
function stripArtistPrefix(title: string, artist: string): string | null {
  if (artist.length === 0 || title.length < artist.length) return null;
  if (title.slice(0, artist.length).toLowerCase() !== artist.toLowerCase()) {
    return null;
  }

  let i = artist.length;
  while (i < title.length && /\s/.test(title[i])) i++;
  if (i < title.length && ARTIST_TITLE_SEPARATORS.includes(title[i])) i++;
  while (i < title.length && /\s/.test(title[i])) i++;

  return title.slice(i).trim();
}

/**
 * Extract song and artist information from entry
 */
export function extractSongInfo(entry: GoogleTakeoutEntry): {
  title: string;
  artist: string;
} | null {
  if (!entry.title) return null;

  let artistFromSubtitles: string | null = null;
  if (
    entry.subtitles &&
    entry.subtitles.length > 0 &&
    entry.subtitles[0].name
  ) {
    artistFromSubtitles = cleanArtistName(entry.subtitles[0].name);
  }

  const cleanedTitle = cleanTitle(entry.title);

  if (artistFromSubtitles && artistFromSubtitles !== "") {
    let songTitle = cleanedTitle;

    const stripped = stripArtistPrefix(cleanedTitle, artistFromSubtitles);
    if (stripped !== null) {
      songTitle = stripped;
    }

    if (!songTitle) {
      const titlePatterns = [/^.+?[-–—·•:]\s*(.+)$/, /^(.+?)\s+by\s+.+$/i];
      for (const pattern of titlePatterns) {
        const match = cleanedTitle.match(pattern);
        if (match?.[1]?.trim()) {
          songTitle = match[1].trim();
          break;
        }
      }
    }

    return {
      title: cleanSongTitle(songTitle || cleanedTitle),
      artist: artistFromSubtitles,
    };
  }
  return {
    title: cleanSongTitle(cleanedTitle),
    artist: "Unknown Artist",
  };
}

/**
 * Parse a single entry into ParsedSongInfo
 */
export function parseSongEntry(
  entry: GoogleTakeoutEntry,
): ParsedSongInfo | null {
  try {
    const songInfo = extractSongInfo(entry);
    if (!songInfo) return null;

    const playedAt = new Date(entry.time);
    if (Number.isNaN(playedAt.getTime())) return null;

    let youtubeId: string | undefined;
    if (entry.titleUrl) {
      youtubeId = extractYouTubeId(entry.titleUrl);
    }

    return {
      title: songInfo.title,
      artist: songInfo.artist,
      originalTitle: entry.title,
      youtubeId,
      playedAt,
    };
  } catch {
    return null;
  }
}

/**
 * Filter + transform a batch of raw Takeout entries into ParsedSongInfo.
 *
 * No yielding/progress — designed to run flat-out, either inside a Web Worker
 * (where there is no UI thread to unblock) or over a single batch on the main
 * thread. Returns the parsed entries plus the count of music entries seen
 * (including ones that failed to parse), matching the existing ParseResult
 * semantics.
 */
export function parseEntries(entries: GoogleTakeoutEntry[]): {
  entries: ParsedSongInfo[];
  musicEntries: number;
} {
  const out: ParsedSongInfo[] = [];
  let musicEntries = 0;

  for (const entry of entries) {
    if (!isYouTubeMusicEntry(entry)) {
      continue;
    }

    musicEntries++;
    const parsed = parseSongEntry(entry);
    if (parsed) {
      out.push(parsed);
    }
  }

  return { entries: out, musicEntries };
}
