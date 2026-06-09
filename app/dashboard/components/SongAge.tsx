"use client";

import { Clock, Disc3, History, Music2, Sparkles } from "lucide-react";
import { motion } from "motion/react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { IUserStats } from "@/lib/types/database";

interface SongAgeProps {
  stats?: IUserStats;
}

/**
 * Get a fun message based on listening age
 */
function getListeningAgeMessage(age: number): string {
  if (age <= 2) {
    return "You're riding the wave of today's hits! 🌊";
  } else if (age <= 5) {
    return "Fresh tracks dominate your playlist! ✨";
  } else if (age <= 10) {
    return "A perfect blend of new and classic! 🎵";
  } else if (age <= 15) {
    return "You appreciate the timeless bangers! 🔥";
  } else if (age <= 20) {
    return "Your music taste is wonderfully nostalgic! 💫";
  } else if (age <= 30) {
    return "You're keeping the classics alive! 🎸";
  } else {
    return "A true connoisseur of vintage sounds! 🎺";
  }
}

export function SongAge({ stats }: SongAgeProps) {
  // If no song age data is available
  if (!stats?.listeningAge && !stats?.averageReleaseYear) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            My Listening Age
          </CardTitle>
          <CardDescription>
            Discover the age of your music taste
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Disc3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm">
              Not enough song data with release years to calculate your
              listening age.
            </p>
            <p className="text-xs mt-2">
              Songs with years in their titles (like &quot;Song Name
              (2019)&quot;) help us calculate this.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const listeningAge = stats.listeningAge || 0;
  const musicEra = stats.musicEra || "Unknown";
  const decadeDistribution = stats.decadeDistribution || [];
  const oldestSong = stats.oldestSong;
  const newestSong = stats.newestSong;
  const songsWithYearCount = stats.songsWithYearCount || 0;

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          My Listening Age
        </CardTitle>
        <CardDescription>
          Based on {songsWithYearCount.toLocaleString()} songs with detected
          release years
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main Age Display - Spotify Wrapped Style */}
        <motion.div
          className="relative text-center py-8 rounded-xl bg-linear-to-br from-muted/50 to-muted"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <motion.div
            className="absolute inset-0 overflow-hidden rounded-xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <div className="absolute -top-4 -right-4 w-24 h-24 bg-primary/10 rounded-full blur-2xl" />
            <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-primary/5 rounded-full blur-2xl" />
          </motion.div>

          <div className="relative z-10">
            <p className="text-lg font-medium text-muted-foreground mb-2">
              My listening age
            </p>

            <motion.div
              className="text-8xl md:text-9xl font-bold text-primary relative inline-block"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              {listeningAge}
              <motion.div
                className="absolute -right-2 -top-2"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.6, type: "spring" }}
              >
                <Sparkles className="h-6 w-6 text-yellow-500" />
              </motion.div>
            </motion.div>

            <motion.p
              className="text-base text-muted-foreground mt-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              Since I was into music from the{" "}
              <span className="font-semibold text-foreground">{musicEra}</span>
            </motion.p>

            <motion.p
              className="text-sm text-muted-foreground/80 mt-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              {getListeningAgeMessage(listeningAge)}
            </motion.p>
          </div>
        </motion.div>

        {/* Decade Distribution */}
        {decadeDistribution.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Your Music Through the Decades
            </h4>
            <div className="space-y-2">
              {decadeDistribution.slice(0, 5).map((item, index) => (
                <motion.div
                  key={item.decade}
                  className="space-y-1"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 * index }}
                >
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{item.decade}</span>
                    <span className="text-muted-foreground">
                      {item.percentage}% ({item.count.toLocaleString()} plays)
                    </span>
                  </div>
                  <Progress value={item.percentage} className="h-2" />
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Oldest & Newest Songs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {oldestSong && (
            <motion.div
              className="p-4 rounded-lg bg-muted/50 space-y-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <History className="h-4 w-4" />
                <span>Oldest Track</span>
              </div>
              <p
                className="font-medium text-sm truncate"
                title={oldestSong.title}
              >
                {oldestSong.title}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {oldestSong.artist} • {oldestSong.year}
              </p>
            </motion.div>
          )}

          {newestSong && (
            <motion.div
              className="p-4 rounded-lg bg-muted/50 space-y-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Music2 className="h-4 w-4" />
                <span>Newest Track</span>
              </div>
              <p
                className="font-medium text-sm truncate"
                title={newestSong.title}
              >
                {newestSong.title}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {newestSong.artist} • {newestSong.year}
              </p>
            </motion.div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
