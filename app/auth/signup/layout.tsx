import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";

export const metadata: Metadata = {
  title: "Create Account",
  description:
    "Create a free YTMusic Stats account to analyze your YouTube Music listening history. Discover your top artists, most played songs, and listening patterns.",
  robots: {
    index: false,
    follow: true,
  },
  alternates: {
    canonical: "/auth/signup",
  },
  openGraph: {
    title: "Create Account | YTMusic Stats",
    description:
      "Create a free account to analyze your YouTube Music listening history.",
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
