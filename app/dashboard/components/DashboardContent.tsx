"use client";

import {
  BarChart3,
  Calendar,
  Clock,
  Gift,
  Music,
  Sparkles,
  TrendingUp,
  Upload,
} from "lucide-react";
import { motion, type Variants } from "motion/react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { IUserStats } from "@/lib/types/database";
import { ListeningPatterns } from "./ListeningPatterns";
import { SongAge } from "./SongAge";
import { StatsOverview } from "./StatsOverview";
import { TopArtists } from "./TopArtists";
import { TopSongs } from "./TopSongs";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      delayChildren: 0.2,
      staggerChildren: 0.1,
    },
  },
};

const itemVariants: Variants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      duration: 0.5,
    },
  },
};

interface DashboardContentProps {
  stats: IUserStats | null;
}

export function DashboardContent({ stats }: DashboardContentProps) {
  // If no stats, show welcome screen with upload link
  if (!stats) {
    return (
      <motion.div
        className="max-w-3xl mx-auto"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        <motion.div variants={itemVariants}>
          <Card className="border-dashed border-2">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                <Music className="h-8 w-8 text-foreground" />
              </div>
              <CardTitle className="text-2xl">
                Welcome to YTMusic Stats! 🎵
              </CardTitle>
              <CardDescription className="text-base">
                Transform your Google Takeout data into beautiful music
                analytics and discover your listening patterns.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-3 gap-4 text-center">
                <div className="space-y-2">
                  <div className="h-10 w-10 mx-auto rounded-full bg-muted flex items-center justify-center">
                    <Upload className="h-5 w-5 text-foreground" />
                  </div>
                  <h3 className="font-medium">Upload Data</h3>
                  <p className="text-sm text-muted-foreground">
                    Import your YouTube Music history
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="h-10 w-10 mx-auto rounded-full bg-muted flex items-center justify-center">
                    <BarChart3 className="h-5 w-5 text-foreground" />
                  </div>
                  <h3 className="font-medium">Analyze</h3>
                  <p className="text-sm text-muted-foreground">
                    Get insights into your music taste
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="h-10 w-10 mx-auto rounded-full bg-muted flex items-center justify-center">
                    <Sparkles className="h-5 w-5 text-foreground" />
                  </div>
                  <h3 className="font-medium">Discover</h3>
                  <p className="text-sm text-muted-foreground">
                    Explore your listening journey
                  </p>
                </div>
              </div>

              <div className="text-center pt-4">
                <Link href="/upload">
                  <Button size="lg" className="gap-2 px-8">
                    <Upload className="h-4 w-4" />
                    Get Started - Upload Your Data
                  </Button>
                </Link>
                <p className="text-xs text-muted-foreground mt-3">
                  Your data is processed locally in your browser - fast and
                  private!
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    );
  }

  // Show full dashboard
  return (
    <motion.div
      className="space-y-8"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {/* Header with refresh and status */}
      <motion.div
        className="flex items-center justify-between flex-wrap gap-4"
        variants={itemVariants}
      >
        <div className="flex items-center space-x-3">
          <Badge variant="secondary" className="gap-1">
            <Clock className="h-3 w-3" />
            <span suppressHydrationWarning>
              Last updated:{" "}
              {stats?.lastUpdated
                ? new Date(stats.lastUpdated).toLocaleDateString()
                : "Never"}
            </span>
          </Badge>
          {stats?.totalSongs && typeof stats.totalSongs === "number" && (
            <Badge variant="outline" className="gap-1">
              <Music className="h-3 w-3" />
              {new Intl.NumberFormat().format(stats.totalSongs)} songs analyzed
            </Badge>
          )}
        </div>
        <Link href="/wrapped">
          <Button className="gap-2">
            <Gift className="h-4 w-4" />
            View Your Wrapped
          </Button>
        </Link>
      </motion.div>

      <motion.div variants={itemVariants}>
        <StatsOverview stats={stats} />
      </motion.div>

      <motion.div variants={itemVariants}>
        <Tabs defaultValue="artists" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:grid-cols-3 bg-muted">
            <TabsTrigger
              value="artists"
              className="gap-2 data-[state=active]:bg-background"
            >
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">Artists</span>
            </TabsTrigger>
            <TabsTrigger
              value="songs"
              className="gap-2 data-[state=active]:bg-background"
            >
              <Music className="h-4 w-4" />
              <span className="hidden sm:inline">Songs</span>
            </TabsTrigger>
            <TabsTrigger
              value="insights"
              className="gap-2 data-[state=active]:bg-background"
            >
              <Sparkles className="h-4 w-4" />
              <span className="hidden sm:inline">Insights</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="artists">
            <TopArtists stats={stats} />
          </TabsContent>

          <TabsContent value="songs">
            <TopSongs stats={stats} />
          </TabsContent>

          <TabsContent value="insights" className="space-y-6">
            <SongAge stats={stats} />

            <ListeningPatterns stats={stats} />

            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Listening Timeline
                  </CardTitle>
                  <CardDescription>
                    Your music journey over time
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {stats?.firstPlayDate && (
                    <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                      <span className="text-sm font-medium">
                        First song played
                      </span>
                      <span
                        className="text-sm text-muted-foreground"
                        suppressHydrationWarning
                      >
                        {new Date(stats.firstPlayDate).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  {stats?.lastPlayDate && (
                    <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                      <span className="text-sm font-medium">
                        Latest activity
                      </span>
                      <span
                        className="text-sm text-muted-foreground"
                        suppressHydrationWarning
                      >
                        {new Date(stats.lastPlayDate).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm font-medium">Discovery rate</span>
                    <span className="text-sm text-muted-foreground">
                      {stats?.newArtistsThisMonth &&
                      stats.newArtistsThisMonth > 0
                        ? `${stats.newArtistsThisMonth} new artists this month`
                        : "No new artists this month"}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5" />
                    Fun Facts
                  </CardTitle>
                  <CardDescription>
                    Interesting stats about your music
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {stats?.totalSongs &&
                    stats?.totalListens &&
                    stats?.totalArtists && (
                      <>
                        <div className="p-3 bg-muted/50 rounded-lg">
                          <p className="text-sm font-medium">
                            Average song length
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {stats.averageSongLength &&
                            Number.isFinite(stats.averageSongLength) ? (
                              <>
                                {Math.floor(stats.averageSongLength / 60)}:
                                {String(
                                  Math.floor(stats.averageSongLength % 60),
                                ).padStart(2, "0")}
                              </>
                            ) : (
                              "N/A"
                            )}
                          </p>
                        </div>
                        <div className="p-3 bg-muted/50 rounded-lg">
                          <p className="text-sm font-medium">Music variety</p>
                          <p className="text-xs text-muted-foreground">
                            {stats.totalSongs && stats.totalListens ? (
                              <>
                                {(
                                  (stats.totalSongs / stats.totalListens) *
                                  100
                                ).toFixed(1)}
                                % unique songs
                              </>
                            ) : (
                              "N/A"
                            )}
                          </p>
                        </div>
                        <div className="p-3 bg-muted/50 rounded-lg">
                          <p className="text-sm font-medium">
                            Dedication level
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {stats.totalListens && stats.totalArtists ? (
                              <>
                                {Math.round(
                                  stats.totalListens / stats.totalArtists,
                                )}{" "}
                                listens per artist
                              </>
                            ) : (
                              "N/A"
                            )}
                          </p>
                        </div>
                      </>
                    )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </motion.div>
    </motion.div>
  );
}
