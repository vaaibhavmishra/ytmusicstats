"use client";

import {
  BarChart,
  BarChart3,
  CheckCircle,
  Code,
  Download,
  FileText,
  Heart,
  Music,
  TrendingUp,
  Upload,
} from "lucide-react";
import { motion, type Variants } from "motion/react";
import dynamic from "next/dynamic";
import Link from "next/link";
import Script from "next/script";
import { Button } from "@/components/ui/button";

const Beams = dynamic(() => import("@/components/Beams"), { ssr: false });

import {
  IconBrandGithub,
  IconBrandLinkedin,
  IconBrandTwitter,
} from "@tabler/icons-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      delayChildren: 0.3,
      staggerChildren: 0.2,
    },
  },
};

const itemVariants: Variants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      duration: 0.6,
    },
  },
};

const heroVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.8,
    },
  },
};

export function HomeContent() {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "How do I see my YouTube Music listening history and stats?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "You can see your YouTube Music stats by exporting your data from Google Takeout (takeout.google.com), selecting 'YouTube and YouTube Music', then uploading the watch-history.json file to YTMusic Stats. You'll get detailed analytics including top artists, most played songs, listening time, and patterns.",
        },
      },
      {
        "@type": "Question",
        name: "Is there a YouTube Music Wrapped like Spotify Wrapped?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "While YouTube Music has its own Recap feature, YTMusic Stats provides a more detailed and always-available Wrapped experience. Unlike YouTube's annual Recap, you can generate your music wrapped anytime with comprehensive stats, top artists, listening patterns, and shareable insights.",
        },
      },
      {
        "@type": "Question",
        name: "How do I download my YouTube Music data from Google Takeout?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Go to takeout.google.com, sign in with your Google account, click 'Deselect all', then select only 'YouTube and YouTube Music'. Choose JSON format, click 'Create export', and wait for the download link. Extract the zip file and find the watch-history.json file to upload to YTMusic Stats.",
        },
      },
      {
        "@type": "Question",
        name: "Is YTMusic Stats free and safe to use?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes, YTMusic Stats is completely free and open source. Your data is processed securely and we don't sell or share your information. The entire source code is available on GitHub for transparency. No tracking, no ads, and your privacy is our priority.",
        },
      },
      {
        "@type": "Question",
        name: "What insights can I get from my YouTube Music history?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "YTMusic Stats provides comprehensive insights including: total listening time, number of unique songs and artists, your top 10 most played artists and songs, listening patterns by time of day and day of week, song age analysis, average song length, music variety percentage, and a personalized Music Wrapped experience.",
        },
      },
    ],
  };

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVariants}>
      <Script
        id="faq-schema"
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: officially recommended
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      {/* Hero Section */}
      <motion.div
        className="h-screen w-screen relative"
        variants={heroVariants}
      >
        <div className="absolute inset-0 z-10">
          <Beams
            beamWidth={3}
            beamHeight={30}
            beamNumber={20}
            lightColor="#ffffff"
            speed={2}
            noiseIntensity={1.75}
            scale={0.2}
            rotation={30}
          />
        </div>
        <motion.section
          className="relative z-20 px-4 py-16 text-center h-screen w-screen flex flex-col justify-center"
          variants={itemVariants}
        >
          <div className="max-w-3xl mx-auto space-y-6">
            <motion.h2
              className="text-4xl md:text-6xl font-bold tracking-tight"
              variants={itemVariants}
            >
              Analyze Your
              <span className="text-primary"> YouTube Music</span> History
            </motion.h2>
            <motion.p
              className="text-xl text-muted-foreground"
              variants={itemVariants}
            >
              Transform your Google Takeout data into personalized music
              insights. Discover your top artists, most played songs, and
              listening statistics from your YouTube Music history.
            </motion.p>
            <motion.div
              className="flex flex-col sm:flex-row gap-4 justify-center"
              variants={itemVariants}
            >
              <Button size="lg" asChild>
                <Link href="/auth/signin">Get Started Free</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="#features">See Features</Link>
              </Button>
            </motion.div>
          </div>
        </motion.section>
      </motion.div>

      {/* Features Section */}
      <motion.section
        id="features"
        className="container mx-auto px-4 py-16"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
      >
        <motion.div className="text-center mb-12" variants={itemVariants}>
          <h3 className="text-3xl font-bold mb-4">Your Music Analytics</h3>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Transform your Google Takeout YouTube Music data into meaningful
            insights about your listening habits and musical preferences.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader>
                <BarChart3 className="h-8 w-8 text-primary mb-2" />
                <CardTitle>Listening Statistics</CardTitle>
                <CardDescription>
                  Get a complete overview of your YouTube Music listening
                  history with detailed statistics.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Total listening time</li>
                  <li>• Unique artists & songs</li>
                  <li>• Average song length</li>
                  <li>• Listening period range</li>
                </ul>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader>
                <TrendingUp className="h-8 w-8 text-primary mb-2" />
                <CardTitle>Top Artists & Songs</CardTitle>
                <CardDescription>
                  Discover your most played artists and tracks ranked by play
                  count.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Top 10 artists by plays</li>
                  <li>• Most played tracks</li>
                  <li>• Play count rankings</li>
                  <li>• Artist discovery insights</li>
                </ul>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader>
                <Music className="h-8 w-8 text-primary mb-2" />
                <CardTitle>Smart Data Processing</CardTitle>
                <CardDescription>
                  Intelligent parsing of your Google Takeout data with YouTube
                  API enrichment for accurate results.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Automatic song detection</li>
                  <li>• YouTube API enrichment</li>
                  <li>• Data validation & cleaning</li>
                  <li>• Progress tracking</li>
                </ul>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </motion.section>

      {/* How It Works Section */}
      <motion.section
        id="how-it-works"
        className="container mx-auto px-4 py-20"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
      >
        <motion.div className="text-center mb-16" variants={itemVariants}>
          <h3 className="text-3xl font-bold mb-4">How It Works</h3>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            Transform your YouTube Music data into meaningful insights in just a
            few simple steps
          </p>
        </motion.div>

        <div className="max-w-6xl mx-auto">
          {/* Step 1 */}
          <motion.div
            className="grid md:grid-cols-2 gap-12 items-center mb-16"
            variants={itemVariants}
          >
            <div className="order-2 md:order-1">
              <div className="flex items-center mb-6">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mr-4">
                  <Download className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <span className="text-sm font-medium text-primary">
                    Step 1
                  </span>
                  <h4 className="text-2xl font-bold">
                    Get Your Data from Google
                  </h4>
                </div>
              </div>
              <div className="space-y-4">
                <p className="text-muted-foreground">
                  Visit Google Takeout to download your personal YouTube and
                  YouTube Music data. This is completely free and gives you
                  access to all your listening history.
                </p>
                <div className="bg-background/50 p-4 rounded-lg border">
                  <h5 className="font-semibold mb-2 flex items-center">
                    <FileText className="h-4 w-4 mr-2" />
                    What you'll get:
                  </h5>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Complete YouTube Music listening history</li>
                    <li>• Song titles, artists, and play timestamps</li>
                    <li>• YouTube video IDs for accurate matching</li>
                    <li>• All data in easy-to-process JSON format</li>
                  </ul>
                </div>
                <Button asChild variant="outline" className="mt-4">
                  <Link
                    href="https://takeout.google.com"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open Google Takeout
                  </Link>
                </Button>
              </div>
            </div>
            <div className="order-1 md:order-2">
              <Card className="p-6">
                <div className="text-center">
                  <Download className="h-16 w-16 mx-auto mb-4" />
                  <h5 className="font-semibold">Google Takeout</h5>
                  <p className="text-sm mt-2">
                    Select "YouTube and YouTube Music" → Download as JSON
                  </p>
                </div>
              </Card>
            </div>
          </motion.div>

          {/* Step 2 */}
          <motion.div
            className="grid md:grid-cols-2 gap-12 items-center mb-16"
            variants={itemVariants}
          >
            <div>
              <Card className="p-6">
                <div className="text-center">
                  <Upload className="h-16 w-16 mx-auto mb-4" />
                  <h5 className="font-semibold">Smart Processing</h5>
                  <p className="text-sm mt-2">
                    Drag & drop your watch-history.json file
                  </p>
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-center text-xs">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Parse & validate data
                    </div>
                    <div className="flex items-center justify-center text-xs">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Enrich with YouTube API
                    </div>
                    <div className="flex items-center justify-center text-xs">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Generate statistics
                    </div>
                  </div>
                </div>
              </Card>
            </div>
            <div>
              <div className="flex items-center mb-6">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mr-4">
                  <Upload className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <span className="text-sm font-medium text-primary">
                    Step 2
                  </span>
                  <h4 className="text-2xl font-bold">
                    Upload & Process Your Data
                  </h4>
                </div>
              </div>
              <div className="space-y-4">
                <p className="text-muted-foreground">
                  Simply upload your watch-history.json file and our intelligent
                  system will:
                </p>
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <div className="h-2 w-2 rounded-full bg-primary mt-2 shrink-0"></div>
                    <div>
                      <p className="font-medium">Parse & Clean Your Data</p>
                      <p className="text-sm text-muted-foreground">
                        Filter YouTube Music entries and extract song
                        information
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="h-2 w-2 rounded-full bg-primary mt-2 shrink-0"></div>
                    <div>
                      <p className="font-medium">Enrich with YouTube API</p>
                      <p className="text-sm text-muted-foreground">
                        Get accurate song durations and metadata
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="h-2 w-2 rounded-full bg-primary mt-2 shrink-0"></div>
                    <div>
                      <p className="font-medium">Generate Your Statistics</p>
                      <p className="text-sm text-muted-foreground">
                        Calculate totals, rankings, and insights
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Step 3 */}
          <motion.div
            className="grid md:grid-cols-2 gap-12 items-center"
            variants={itemVariants}
          >
            <div className="order-2 md:order-1">
              <div className="flex items-center mb-6">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mr-4">
                  <BarChart className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <span className="text-sm font-medium text-primary">
                    Step 3
                  </span>
                  <h4 className="text-2xl font-bold">
                    Explore Your Music Insights
                  </h4>
                </div>
              </div>
              <div className="space-y-4">
                <p className="text-muted-foreground">
                  Dive into your personalized dashboard and discover fascinating
                  insights about your music taste:
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-background/50 p-3 rounded-lg border">
                    <div className="text-2xl font-bold text-primary">2,847</div>
                    <div className="text-xs text-muted-foreground">
                      Total Songs
                    </div>
                  </div>
                  <div className="bg-background/50 p-3 rounded-lg border">
                    <div className="text-2xl font-bold text-primary">1,234</div>
                    <div className="text-xs text-muted-foreground">Artists</div>
                  </div>
                  <div className="bg-background/50 p-3 rounded-lg border">
                    <div className="text-2xl font-bold text-primary">127h</div>
                    <div className="text-xs text-muted-foreground">
                      Listening Time
                    </div>
                  </div>
                  <div className="bg-background/50 p-3 rounded-lg border">
                    <div className="text-2xl font-bold text-primary">
                      3m 24s
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Avg Length
                    </div>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Plus detailed rankings of your top artists and most played
                  songs!
                </p>
              </div>
            </div>
            <div className="order-1 md:order-2">
              <Card className="p-6">
                <div className="text-center">
                  <BarChart className="h-16 w-16 mx-auto mb-4" />
                  <h5 className="font-semibold">Your Dashboard</h5>
                  <p className="text-sm mt-2">
                    Comprehensive music analytics at your fingertips
                  </p>
                </div>
              </Card>
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* Privacy Section */}
      <motion.section
        className="container mx-auto px-4 py-16"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
      >
        <div className="max-w-4xl mx-auto">
          <motion.div className="text-center mb-12" variants={itemVariants}>
            <h3 className="text-3xl font-bold mb-4">
              Open Source & Privacy First
            </h3>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Built by an indie developer with complete transparency. Your data
              stays private, and the code is open for everyone to review and
              contribute.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            <motion.div variants={itemVariants}>
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="h-12 w-12 mx-auto mb-4 rounded-full bg-green-100 dark:bg-gray-300/20 flex items-center justify-center">
                    <Code className="h-6 w-6 " />
                  </div>
                  <h4 className="font-semibold mb-2">100% Open Source</h4>
                  <p className="text-sm text-muted-foreground">
                    Every line of code is public on GitHub. Review the source,
                    contribute improvements, or run your own instance.
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={itemVariants}>
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="h-12 w-12 mx-auto mb-4 rounded-full bg-blue-100 dark:bg-gray-300/20 flex items-center justify-center">
                    <svg
                      className="h-6 w-6 "
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-labelledby="lock-icon-title"
                    >
                      <title id="lock-icon-title">Privacy lock icon</title>
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                      />
                    </svg>
                  </div>
                  <h4 className="font-semibold mb-2">
                    Your Data, Your Control
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    No tracking, no ads, no data selling. As an indie project,
                    your privacy is the priority, not profit from your data.
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={itemVariants}>
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="h-12 w-12 mx-auto mb-4 rounded-full bg-purple-100 dark:bg-gray-300/20 flex items-center justify-center">
                    <Heart className="h-6 w-6" />
                  </div>
                  <h4 className="font-semibold mb-2">Built with Passion</h4>
                  <p className="text-sm text-muted-foreground">
                    Created by a music lover for music lovers. No corporate
                    agenda, just a simple tool to explore your musical journey.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          <motion.div
            className="mt-12 p-6 bg-background/50 rounded-lg border"
            variants={itemVariants}
          >
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center space-x-2">
                <IconBrandGithub className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium">Transparency Matters</span>
              </div>
              <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
                Want to see exactly how your data is processed? Check out the
                source code, raise issues, or contribute to make this tool even
                better. As an open source project, community feedback drives
                development.
              </p>
              <Button variant="outline" asChild className="mt-4">
                <Link
                  href="https://github.com/vaaibhavmishra/ytmusic-stats"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center"
                >
                  <IconBrandGithub className="h-4 w-4 mr-2" />
                  View Source Code
                </Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* Footer */}
      <footer className="border-t bg-background">
        <div className="container mx-auto px-4 py-12">
          <div className="grid md:grid-cols-4 gap-8">
            {/* Brand Section */}
            <div className="md:col-span-2">
              <div className="flex items-center space-x-2 mb-4">
                <Music className="h-6 w-6 text-primary" />
                <span className="text-xl font-bold">YTMusic Stats</span>
              </div>
              <p className="text-muted-foreground mb-6 max-w-md">
                Transform your YouTube Music listening history into meaningful
                insights. Discover your musical journey through data analytics.
              </p>
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Heart className="h-4 w-4 text-red-500" />
                <span>Made with love by</span>
                <Link
                  href="https://github.com/vaaibhavmishra"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline font-medium"
                >
                  Vaibhav Mishra
                </Link>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link
                    href="#features"
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    Features
                  </Link>
                </li>
                <li>
                  <Link
                    href="#how-it-works"
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    How It Works
                  </Link>
                </li>
                <li>
                  <Link
                    href="/auth/signin"
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    Sign In
                  </Link>
                </li>
                <li>
                  <Link
                    href="/auth/signup"
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    Get Started
                  </Link>
                </li>
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h4 className="font-semibold mb-4">Resources</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link
                    href="https://takeout.google.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    Google Takeout
                  </Link>
                </li>
                <li>
                  <Link
                    href="https://github.com/vaaibhavmishra/ytmusic-stats"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-primary transition-colors flex items-center"
                  >
                    <IconBrandGithub className="h-3 w-3 mr-1" />
                    Source Code
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Section */}
          <div className="border-t mt-8 pt-8 flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
              <span>© {new Date().getFullYear()} YTMusic Stats</span>
              <span>•</span>
              <span>Open Source</span>
              <span>•</span>
              <span>Privacy First</span>
            </div>

            {/* Social Links */}
            <div className="flex items-center space-x-4">
              <Link
                href="https://github.com/vaaibhavmishra"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                <IconBrandGithub className="h-5 w-5" />
              </Link>
              <Link
                href="https://twitter.com/DESTROYER__V"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                <IconBrandTwitter className="h-5 w-5" />
              </Link>
              <Link
                href="https://linkedin.com/in/vaaibhavmishra"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                <IconBrandLinkedin className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </motion.div>
  );
}
