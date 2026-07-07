import type { Metadata } from "next";

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

export default function SignUpLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
