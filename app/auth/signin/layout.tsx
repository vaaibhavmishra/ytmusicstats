import type { Metadata } from "next";

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

export default function SignInLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
