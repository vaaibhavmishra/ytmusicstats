import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";

export const metadata: Metadata = {
  title: "Sign In",
  description:
    "Sign in to YTMusic Stats to access your personalized music analytics dashboard and discover insights from your YouTube Music listening history.",
  robots: {
    index: false,
    follow: true,
  },
  alternates: {
    canonical: "/auth/signin",
  },
  openGraph: {
    title: "Sign In | YTMusic Stats",
    description:
      "Sign in to access your personalized music analytics dashboard.",
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
