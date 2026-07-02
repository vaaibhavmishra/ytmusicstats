"use client";

import { Check, File, Loader2, Upload, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { parseFile } from "@/lib/client/parser";
import {
  calculateStats,
  type StatsProgress,
} from "@/lib/client/stats-calculator";
import { type FetchProgress, fetchSongMetadata } from "@/lib/client/youtube";
import type { ParseProgress } from "@/lib/types/database";

type ProcessingStage =
  | "idle"
  | "reading"
  | "parsing"
  | "fetching"
  | "calculating"
  | "saving"
  | "success"
  | "error";

const STAGE_MESSAGES: Record<ProcessingStage, string> = {
  idle: "Ready to process",
  reading: "Reading file...",
  parsing: "Parsing music entries...",
  fetching: "Fetching song metadata...",
  calculating: "Calculating your stats...",
  saving: "Saving to your account...",
  success: "Complete!",
  error: "Something went wrong",
};

export function UploadArea() {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState<ProcessingStage>("idle");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [statsPreview, setStatsPreview] = useState<{
    totalSongs: number;
    totalArtists: number;
    totalListens: number;
  } | null>(null);
  const [metadataStats, setMetadataStats] = useState<FetchProgress | null>(
    null,
  );

  const processFile = useCallback(
    async (file: File) => {
      setIsProcessing(true);
      setStage("reading");
      setProgress(0);

      try {
        // Step 1: Parse the file
        setStage("parsing");
        const parseResult = await parseFile(
          file,
          (parseProgress: ParseProgress) => {
            // Map parse progress to 0-50%
            const mappedProgress = Math.round(parseProgress.progress * 0.5);
            setProgress(mappedProgress);
          },
        );

        if (parseResult.error && parseResult.entries.length === 0) {
          throw new Error(parseResult.error);
        }

        if (parseResult.entries.length === 0) {
          throw new Error(
            "No YouTube Music entries found in this file. Make sure you're uploading your YouTube Music watch history.",
          );
        }

        // Step 2: Fetch song metadata (duration, cleaned artist names)
        setStage("fetching");
        setProgress(55);

        const metadata = await fetchSongMetadata(
          parseResult.uniqueVideoIds,
          (metaProgress) => {
            setMetadataStats(metaProgress);
            // Map metadata progress to 50-70%
            const percent =
              metaProgress.total > 0
                ? (metaProgress.processed / metaProgress.total) * 100
                : 100;
            setProgress(50 + Math.round(percent * 0.2));
          },
        );

        // Step 3: Calculate statistics with real durations
        setStage("calculating");
        const stats = await calculateStats(
          parseResult.entries,
          (statsProgress: StatsProgress) => {
            // Map stats progress to 70-90%
            const mappedProgress =
              70 + Math.round(statsProgress.progress * 0.2);
            setProgress(mappedProgress);
          },
          metadata, // Pass metadata for accurate durations
        );

        // Show preview
        setStatsPreview({
          totalSongs: stats.totalSongs,
          totalArtists: stats.totalArtists,
          totalListens: stats.totalListens,
        });

        // Step 4: Save to server
        setStage("saving");
        setProgress(92);

        const response = await fetch("/api/stats", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(stats),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || "Failed to save stats");
        }

        setProgress(100);
        setStage("success");

        toast.success("Processing complete! 🎉", {
          description: `Found ${stats.totalSongs.toLocaleString()} unique songs from ${stats.totalArtists.toLocaleString()} artists.`,
        });

        // Redirect to dashboard after a brief delay
        setTimeout(() => {
          router.push("/dashboard");
        }, 1500);
      } catch (error) {
        console.error("Processing error:", error);
        setStage("error");
        const message =
          error instanceof Error
            ? error.message
            : "Processing failed. Please try again.";
        setErrorMessage(message);

        toast.error("Processing failed", {
          description: message,
        });
      } finally {
        setIsProcessing(false);
      }
    },
    [router],
  );

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;

      const file = acceptedFiles[0];
      setUploadedFile(file);
      setErrorMessage("");
      setStatsPreview(null);

      // Process file locally
      await processFile(file);
    },
    [processFile],
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject } =
    useDropzone({
      onDrop,
      accept: {
        "application/json": [".json"],
      },
      maxFiles: 1,
      maxSize: 100 * 1024 * 1024,
      disabled: isProcessing || stage === "success",
    });

  const resetUpload = useCallback(() => {
    setUploadedFile(null);
    setStage("idle");
    setProgress(0);
    setErrorMessage("");
    setStatsPreview(null);
    setMetadataStats(null);
  }, []);

  const getDropzoneStyles = () => {
    if (isDragReject) return "border-destructive bg-destructive/10";
    if (isDragActive) return "border-foreground bg-muted/50";
    if (stage === "success") return "border-foreground bg-muted/20";
    if (stage === "error") return "border-destructive bg-destructive/10";
    return "hover:border-muted-foreground hover:bg-muted/30";
  };

  const getStatusIcon = () => {
    if (stage === "success") {
      return <Check className="h-8 w-8 sm:h-12 sm:w-12 text-foreground" />;
    }
    if (stage === "error") {
      return <X className="h-8 w-8 sm:h-12 sm:w-12 text-destructive" />;
    }
    if (isProcessing) {
      return (
        <Loader2 className="h-8 w-8 sm:h-12 sm:w-12 text-foreground animate-spin" />
      );
    }
    return <Upload className="h-8 w-8 sm:h-12 sm:w-12 text-muted-foreground" />;
  };

  const isDisabled = isProcessing || stage === "success";

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`
          relative border-2 border-dashed rounded-lg p-6 sm:p-8 md:p-12 text-center
          transition-all duration-300 ${getDropzoneStyles()}
          ${isDisabled ? "cursor-not-allowed" : "cursor-pointer"}
        `}
      >
        <input {...getInputProps()} />

        <div className="space-y-3 sm:space-y-4 flex justify-center items-center flex-col">
          {getStatusIcon()}

          <div>
            {stage === "idle" && !isDragActive && !isDragReject && (
              <div>
                <p className="text-base sm:text-lg font-medium mb-2">
                  Drag & drop your JSON file here
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">
                  or click to browse files from your computer
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 text-xs text-muted-foreground">
                  <span>✓ JSON files only</span>
                  <span>✓ Max 100MB</span>
                  <span>✓ Processed locally</span>
                </div>
              </div>
            )}

            {isDragActive && !isDragReject && (
              <div>
                <p className="text-base sm:text-lg font-medium">
                  Drop your file here...
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  Release to process your music history
                </p>
              </div>
            )}

            {isDragReject && (
              <div>
                <p className="text-base sm:text-lg font-medium text-destructive">
                  Invalid file type
                </p>
                <p className="text-xs sm:text-sm text-destructive/80 mt-1">
                  Please upload a proper JSON file from your Google Takeout
                </p>
              </div>
            )}

            {isProcessing && (
              <div>
                <p className="text-base sm:text-lg font-medium">
                  {STAGE_MESSAGES[stage]}
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  {stage === "parsing" && "Extracting YouTube Music entries..."}
                  {stage === "fetching" && metadataStats && (
                    <span className="flex flex-col items-center gap-1">
                      <span>
                        Processing {metadataStats.processed.toLocaleString()} of{" "}
                        {metadataStats.total.toLocaleString()} songs
                      </span>
                      <span className="text-xs text-muted-foreground/70">
                        Batch {metadataStats.currentBatch} of{" "}
                        {metadataStats.totalBatches}
                        {metadataStats.cached > 0 && (
                          <> • {metadataStats.cached.toLocaleString()} cached</>
                        )}
                        {metadataStats.fetched > 0 && (
                          <>
                            {" "}
                            • {metadataStats.fetched.toLocaleString()} from
                            YouTube
                          </>
                        )}
                      </span>
                    </span>
                  )}
                  {stage === "fetching" &&
                    !metadataStats &&
                    "Preparing to fetch song metadata..."}
                  {stage === "calculating" &&
                    "Analyzing your listening patterns..."}
                  {stage === "saving" && "Almost done..."}
                  {stage === "reading" && "Loading file..."}
                </p>
                <div className="mt-3 sm:mt-4 max-w-xs mx-auto">
                  <Progress value={progress} className="h-2 sm:h-2.5" />
                  <p className="text-xs text-muted-foreground mt-1 text-center">
                    {progress}% complete
                  </p>
                </div>
              </div>
            )}

            {stage === "success" && (
              <div>
                <p className="text-base sm:text-lg font-medium">
                  Processing complete! 🎉
                </p>
                {statsPreview && (
                  <div className="mt-2 space-y-1">
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Found{" "}
                      <strong>
                        {statsPreview.totalListens.toLocaleString()}
                      </strong>{" "}
                      plays
                    </p>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      <strong>
                        {statsPreview.totalSongs.toLocaleString()}
                      </strong>{" "}
                      unique songs from{" "}
                      <strong>
                        {statsPreview.totalArtists.toLocaleString()}
                      </strong>{" "}
                      artists
                    </p>
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-2">
                  Redirecting to dashboard...
                </p>
              </div>
            )}

            {stage === "error" && (
              <div>
                <p className="text-base sm:text-lg font-medium text-destructive">
                  Processing failed
                </p>
                <p className="text-xs sm:text-sm text-destructive/80 mt-1 wrap-break-word">
                  {errorMessage}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {uploadedFile && (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 sm:p-4 bg-muted/50 rounded-lg border"
          >
            <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-muted flex items-center justify-center shrink-0">
              <File className="h-4 w-4 sm:h-5 sm:w-5 text-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium truncate">
                {uploadedFile.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {(uploadedFile.size / (1024 * 1024)).toFixed(2)} MB
              </p>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              {stage === "error" && (
                <Button
                  onClick={resetUpload}
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto min-h-11 sm:min-h-9"
                >
                  Try Again
                </Button>
              )}

              {stage === "success" && (
                <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-foreground flex items-center justify-center shrink-0">
                  <Check className="h-3 w-3 sm:h-4 sm:w-4 text-background" />
                </div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
