import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";

export const metadata: Metadata = {
  title: "Create Free Account – YouTube Music Stats Analyzer",
  description:
    "Create a free YT Music Stats account to analyze your YouTube Music listening history. Get your top artists, most played songs, listening time, and personalized YT Music stats.",
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: "/auth/signup",
  },
  openGraph: {
    title: "Create Free Account | YT Music Stats",
    description:
      "Sign up free to analyze your YouTube Music stats and listening history.",
  },
};

export default async function SignUpLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  // If user is authenticated, redirect to dashboard
  if (session?.user) {
    redirect("/dashboard");
  }

  return children;
}
