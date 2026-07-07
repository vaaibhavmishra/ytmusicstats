import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { userStats } from "@/lib/db/schema";
import type { IUserStats } from "@/lib/types/database";
import { DashboardContent } from "./components/DashboardContent";

export const metadata: Metadata = {
  title: "Dashboard - Your Music Analytics",
  description:
    "View your personalized YouTube Music analytics dashboard. See your top artists, most played songs, listening time, and detailed music statistics.",
  robots: {
    index: false,
    follow: false,
  },
  alternates: {
    canonical: "/dashboard",
  },
};

export default async function DashboardPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/auth/signin");
  }

  // Fetch stats server-side to eliminate client-side waterfall
  const [statsRow] = await db
    .select()
    .from(userStats)
    .where(eq(userStats.userId, session.user.id))
    .limit(1);

  // Drizzle returns plain objects — no serialization hack needed
  const stats: IUserStats | null = statsRow
    ? (statsRow as unknown as IUserStats)
    : null;

  return (
    <div className="min-h-screen pt-20">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 space-y-2">
          <div className="flex items-center space-x-2">
            <div className="h-8 w-1 bg-foreground rounded-full" />
            <h1 className="text-3xl font-bold tracking-tight">
              Your Music Journey
            </h1>
          </div>
          <p className="text-muted-foreground text-lg">
            Discover insights and patterns from your YouTube Music listening
            history
          </p>
          {session.user.name && (
            <p className="text-sm text-muted-foreground/80">
              Welcome back, {session.user.name}! 🎵
            </p>
          )}
        </div>

        <DashboardContent stats={stats} />
      </div>
    </div>
  );
}
