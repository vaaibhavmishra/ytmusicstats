import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { HomeContent } from "@/components/HomeContent";
import { auth } from "@/lib/auth/config";

export const metadata: Metadata = {
  title: {
    absolute:
      "YT Music Stats – Free YouTube Music Stats Tracker & History Analyzer",
  },
  description:
    "YT Music Stats is the best free YouTube Music stats tool. Upload your Google Takeout data to discover your top artists, most played songs, total listening time, and detailed YT Music stats. Open-source, privacy-first, no ads.",
  alternates: {
    canonical: "/",
  },
};

export default async function HomePage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  // If user is authenticated, redirect to dashboard
  if (session?.user) {
    redirect("/dashboard");
  }

  return <HomeContent />;
}
