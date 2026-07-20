import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";

export const metadata: Metadata = {
  title: "Sign In – Access Your YouTube Music Stats",
  description:
    "Sign in to YT Music Stats to view your personalized YouTube Music analytics dashboard. See your top artists, most played songs, listening time, and detailed YT Music stats.",
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: "/auth/signin",
  },
  openGraph: {
    title: "Sign In | YT Music Stats",
    description:
      "Sign in to access your personalized YouTube Music stats and analytics dashboard.",
  },
};

export default async function SignInLayout({
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
