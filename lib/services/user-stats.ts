import { count, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { userStats } from "@/lib/db/schema";
import type { IUserStats } from "@/lib/types/database";

/**
 * Update or create user stats
 */
export async function updateUserStats(
  userId: string,
  stats: IUserStats,
): Promise<void> {
  await db
    .insert(userStats)
    .values({
      userId,
      totalSongs: stats.totalSongs,
      totalArtists: stats.totalArtists,
      totalPlaytime: stats.totalPlaytime,
      averageSongLength: stats.averageSongLength,
      topArtist: stats.topArtist,
      topSong: stats.topSong,
      firstPlayDate: stats.firstPlayDate,
      lastPlayDate: stats.lastPlayDate,
      totalListens: stats.totalListens,
      monthlyPlaytime: stats.monthlyPlaytime,
      dailyAverageListens: stats.dailyAverageListens,
      dailyAveragePlaytime: stats.dailyAveragePlaytime,
      longestListenDay: stats.longestListenDay,
      longestListenDayDuration: stats.longestListenDayDuration,
      longestSession: stats.longestSession,
      topSongs: stats.topSongs,
      topArtists: stats.topArtists,
      newArtistsThisMonth: stats.newArtistsThisMonth,
      totalNewArtists: stats.totalNewArtists,
      listeningAge: stats.listeningAge,
      averageReleaseYear: stats.averageReleaseYear,
      musicEra: stats.musicEra,
      decadeDistribution: stats.decadeDistribution,
      oldestSong: stats.oldestSong,
      newestSong: stats.newestSong,
      songsWithYearCount: stats.songsWithYearCount,
      lastUpdated: new Date(),
    })
    .onConflictDoUpdate({
      target: userStats.userId,
      set: {
        totalSongs: stats.totalSongs,
        totalArtists: stats.totalArtists,
        totalPlaytime: stats.totalPlaytime,
        averageSongLength: stats.averageSongLength,
        topArtist: stats.topArtist,
        topSong: stats.topSong,
        firstPlayDate: stats.firstPlayDate,
        lastPlayDate: stats.lastPlayDate,
        totalListens: stats.totalListens,
        monthlyPlaytime: stats.monthlyPlaytime,
        dailyAverageListens: stats.dailyAverageListens,
        dailyAveragePlaytime: stats.dailyAveragePlaytime,
        longestListenDay: stats.longestListenDay,
        longestListenDayDuration: stats.longestListenDayDuration,
        longestSession: stats.longestSession,
        topSongs: stats.topSongs,
        topArtists: stats.topArtists,
        newArtistsThisMonth: stats.newArtistsThisMonth,
        totalNewArtists: stats.totalNewArtists,
        listeningAge: stats.listeningAge,
        averageReleaseYear: stats.averageReleaseYear,
        musicEra: stats.musicEra,
        decadeDistribution: stats.decadeDistribution,
        oldestSong: stats.oldestSong,
        newestSong: stats.newestSong,
        songsWithYearCount: stats.songsWithYearCount,
        lastUpdated: new Date(),
        updatedAt: new Date(),
      },
    });
}

/**
 * Delete user stats
 */
export async function deleteUserStats(userId: string): Promise<void> {
  await db.delete(userStats).where(eq(userStats.userId, userId));
}

/**
 * Check if user has stats
 */
export async function hasStats(userId: string): Promise<boolean> {
  const result = await db
    .select({ value: count() })
    .from(userStats)
    .where(eq(userStats.userId, userId));
  return (result[0]?.value ?? 0) > 0;
}
