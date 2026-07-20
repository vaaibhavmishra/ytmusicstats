import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { DevBanner } from "@/components/DevBanner";
import { Navigation } from "@/components/Navigation";
import Providers from "@/components/providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl =
  process.env.NEXT_PUBLIC_APP_URL || "https://ytmusicstats.shipby.me";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default:
      "YT Music Stats – YouTube Music Stats & Listening History Analyzer",
    template: "%s | YT Music Stats",
  },
  description:
    "YT Music Stats is the #1 free YouTube Music stats tracker. Upload your Google Takeout data to see your top artists, most played songs, listening time, and personalized YT Music stats. Open-source & privacy-first.",
  keywords: [
    "ytmusicstats",
    "yt music stats",
    "youtube music stats",
    "YouTube Music statistics",
    "YouTube Music listening history",
    "YouTube Music wrapped",
    "YouTube Music analyzer",
    "YouTube Music tracker",
    "yt music wrapped",
    "yt music listening history",
    "yt music analytics",
    "Google Takeout YouTube Music",
    "music analytics",
    "top artists YouTube Music",
    "most played songs YouTube Music",
    "YouTube Music data",
    "music insights",
    "listening patterns",
    "music data visualization",
    "YouTube Music recap",
    "free music stats",
  ],
  authors: [
    { name: "Vaibhav Mishra", url: "https://github.com/vaaibhavmishra" },
  ],
  creator: "Vaibhav Mishra",
  publisher: "YT Music Stats",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "YT Music Stats",
    title:
      "YT Music Stats – Free YouTube Music Stats & Listening History Analyzer",
    description:
      "The #1 free tool to analyze your YouTube Music stats. See your top artists, most played songs, listening time, and personalized insights from your YT Music history.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "YT Music Stats – YouTube Music Analytics Dashboard showing top artists, listening time, and music insights",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title:
      "YT Music Stats – Free YouTube Music Stats & Listening History Analyzer",
    description:
      "Analyze your YouTube Music stats for free. See top artists, most played songs, listening time & more from your YT Music history.",
    images: ["/og-image.png"],
    creator: "@DESTROYER__V",
  },
  alternates: {
    canonical: siteUrl,
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
  },
  category: "Music",
  classification: "Music Analytics Tool",
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

// JSON-LD structured data for the website
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "YT Music Stats",
  alternateName: [
    "ytmusicstats",
    "YT Music Stats",
    "YouTube Music Stats",
    "YouTube Music Statistics Analyzer",
  ],
  description:
    "YT Music Stats is the #1 free tool to analyze your YouTube Music listening history. Upload your Google Takeout data to see top artists, most played songs, listening time, and personalized YT Music stats.",
  url: siteUrl,
  applicationCategory: "MusicApplication",
  operatingSystem: "Web Browser",
  browserRequirements: "Requires JavaScript. Works on all modern browsers.",
  softwareVersion: "1.0",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  featureList: [
    "YouTube Music listening history analysis",
    "Top artists and most played songs ranking",
    "Total listening time calculation",
    "Listening patterns by time of day and day of week",
    "Personalized Music Wrapped experience",
    "Google Takeout data processing",
    "Privacy-focused – data processed in-browser",
    "Open source and free to use",
  ],
  author: {
    "@type": "Person",
    name: "Vaibhav Mishra",
    url: "https://github.com/vaaibhavmishra",
  },
  publisher: {
    "@type": "Organization",
    name: "YT Music Stats",
    url: siteUrl,
  },
  sameAs: [
    "https://github.com/vaaibhavmishra/ytmusic-stats",
    "https://twitter.com/DESTROYER__V",
    "https://linkedin.com/in/vaaibhavmishra",
  ],
  isAccessibleForFree: true,
  inLanguage: "en",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <script
          type="application/ld+json"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: officially recommended
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <Providers>
          <DevBanner />
          <div className="min-h-screen bg-black relative w-full">
            {/* Header - Floating above content */}
            <div className="absolute top-0 left-0 right-0 z-50 pointer-events-none">
              <div className="pointer-events-auto">
                <Navigation />
              </div>
            </div>
            {/* Main Content - Full screen with beam background */}
            <main className="relative z-10 min-h-screen">
              {children}
            </main>
          </div>
        </Providers>
        {/* Cloudflare Web Analytics */}
        <Script
          type="module"
          src="https://static.cloudflareinsights.com/beacon.min.js"
          data-cf-beacon='{"token": "4d66b7ac7d7e4ac8956b859fa9290d87"}'
        />
        {/* End Cloudflare Web Analytics */}
      </body>
    </html>
  );
}
