import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { userStats } from "@/lib/db/schema";
import { updateUserStats } from "@/lib/services/user-stats";
import type { ApiResponse } from "@/lib/types/database";

/**
 * Zod schema to validate incoming stats payloads.
 * Only allows known fields with correct types — prevents arbitrary data injection.
 */
const topSongSchema = z.object({
  key: z.string(),
  title: z.string(),
  artist: z.string(),
  channelTitle: z.string().optional(),
  youtubeId: z.string().optional(),
  duration: z.number(),
  playCount: z.number().optional(),
  totalDuration: z.number().optional(),
  thumbnail: z.string().optional(),
  artistImage: z.string().optional(),
});

const topArtistSchema = z.object({
  name: z.string(),
  playCount: z.number(),
  totalDuration: z.number(),
  uniqueSongs: z.number(),
  artistImage: z.string().optional(),
});

const decadeDistributionSchema = z.object({
  decade: z.string(),
  count: z.number(),
  percentage: z.number(),
});

const songRefSchema = z.object({
  title: z.string(),
  artist: z.string(),
  year: z.number(),
});

const userStatsSchema = z.object({
  totalSongs: z.number(),
  totalArtists: z.number(),
  totalPlaytime: z.number(),
  averageSongLength: z.number(),
  topArtist: z.string().optional(),
  topSong: z.string().optional(),
  firstPlayDate: z.coerce.date().optional(),
  lastPlayDate: z.coerce.date().optional(),
  totalListens: z.number(),
  monthlyPlaytime: z.number(),
  dailyAverageListens: z.number(),
  dailyAveragePlaytime: z.number(),
  longestListenDay: z.coerce.date().optional(),
  longestListenDayDuration: z.number(),
  longestSession: z.number(),
  topSongs: z.array(topSongSchema).max(50),
  topArtists: z.array(topArtistSchema).max(50),
  newArtistsThisMonth: z.number(),
  totalNewArtists: z.number(),
  // Song age statistics
  listeningAge: z.number().optional(),
  averageReleaseYear: z.number().optional(),
  musicEra: z.string().optional(),
  decadeDistribution: z.array(decadeDistributionSchema).max(20).optional(),
  oldestSong: songRefSchema.optional(),
  newestSong: songRefSchema.optional(),
  songsWithYearCount: z.number().optional(),
});

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const [statsRow] = await db
      .select()
      .from(userStats)
      .where(eq(userStats.userId, session.user.id))
      .limit(1);

    if (!statsRow) {
      return NextResponse.json(
        { success: false, error: "No user data found" },
        { status: 404 },
      );
    }

    const response: ApiResponse = {
      success: true,
      data: statsRow,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error getting user stats:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/stats - Save user stats (from client-side processing)
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    // Parse and validate the stats from request body
    const body = await request.json();
    const parseResult = userStatsSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid stats data",
          details: parseResult.error.issues.map((i) => i.message),
        },
        { status: 400 },
      );
    }

    const stats = parseResult.data;

    // Save the validated stats
    await updateUserStats(session.user.id, {
      ...stats,
      lastUpdated: new Date(),
    });

    const response: ApiResponse = {
      success: true,
      message: "Stats saved successfully",
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error saving user stats:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
