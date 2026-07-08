import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
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
    default: "YTMusic Stats - Analyze Your YouTube Music Listening History",
    template: "%s | YTMusic Stats",
  },
  description:
    "Transform your Google Takeout data into personalized music insights. Discover your top artists, most played songs, listening patterns, and detailed statistics from your YouTube Music history. Free, open-source, and privacy-focused.",
  keywords: [
    "YouTube Music",
    "YouTube Music stats",
    "YouTube Music statistics",
    "music analytics",
    "listening history",
    "Google Takeout",
    "music insights",
    "top artists",
    "most played songs",
    "music wrapped",
    "listening patterns",
    "music tracker",
    "YouTube Music analyzer",
    "music data visualization",
  ],
  authors: [
    { name: "Vaibhav Mishra", url: "https://github.com/vaaibhavmishra" },
  ],
  creator: "Vaibhav Mishra",
  publisher: "YTMusic Stats",
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
    siteName: "YTMusic Stats",
    title: "YTMusic Stats - Analyze Your YouTube Music Listening History",
    description:
      "Transform your Google Takeout data into personalized music insights. Discover your top artists, most played songs, and listening patterns.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "YTMusic Stats - Your YouTube Music Analytics Dashboard",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "YTMusic Stats - Analyze Your YouTube Music Listening History",
    description:
      "Transform your Google Takeout data into personalized music insights. Discover your top artists and most played songs.",
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
  name: "YTMusic Stats",
  description:
    "Transform your Google Takeout data into personalized music insights. Discover your top artists, most played songs, and listening patterns from your YouTube Music history.",
  url: siteUrl,
  applicationCategory: "MusicApplication",
  operatingSystem: "Web Browser",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  author: {
    "@type": "Person",
    name: "Vaibhav Mishra",
    url: "https://github.com/vaaibhavmishra",
  },
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
              <Analytics />
              <SpeedInsights />
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
