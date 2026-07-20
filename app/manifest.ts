import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "YT Music Stats – YouTube Music Stats & Listening History Analyzer",
    short_name: "YT Music Stats",
    description:
      "Free YouTube Music stats tracker. Upload your Google Takeout data to see top artists, most played songs, listening time, and personalized YT Music stats.",
    start_url: "/",
    display: "standalone",
    background_color: "#000000",
    theme_color: "#000000",
    orientation: "portrait-primary",
    categories: ["music", "entertainment", "utilities"],
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
