import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { UploadContent } from "@/app/upload/components/UploadContent";
import { auth } from "@/lib/auth/config";

export const metadata: Metadata = {
  title: "Upload Your Music Data",
  description:
    "Upload your Google Takeout watch-history.json file to analyze your YouTube Music listening history. Get detailed insights about your music preferences.",
  robots: {
    index: false,
    follow: false,
  },
  alternates: {
    canonical: "/upload",
  },
};

export default async function UploadPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/auth/signin");
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 pt-24 max-w-4xl">
        <UploadContent userName={session.user.name || undefined} />
      </div>
    </div>
  );
}
