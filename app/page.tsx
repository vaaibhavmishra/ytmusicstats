import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { HomeContent } from "@/components/HomeContent";
import { auth } from "@/lib/auth/config";

export const metadata: Metadata = {
  title: {
    absolute: "YTMusic Stats - Analyze Your YouTube Music Listening History",
  },
  description:
    "Transform your Google Takeout data into personalized music insights. Discover your top artists, most played songs, listening patterns, and detailed statistics from your YouTube Music history. Free and open-source.",
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
