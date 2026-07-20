import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { WrappedExperience } from "./components/WrappedExperience";

export const metadata: Metadata = {
  title: "Your Music Wrapped",
  description:
    "Discover your YouTube Music listening journey with a personalized Wrapped experience. See your top artists, favorite songs, and listening trends.",
  robots: {
    index: false,
    follow: false,
  },
  alternates: {
    canonical: "/wrapped",
  },
  openGraph: {
    title: "My Music Wrapped | YT Music Stats",
    description: "Check out my personalized YouTube Music Wrapped experience!",
  },
};

export default async function WrappedPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/auth/signin");
  }

  return (
    <WrappedExperience
      userId={session.user.id}
      userName={session.user.name || "Music Lover"}
    />
  );
}
