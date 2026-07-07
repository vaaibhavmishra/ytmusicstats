"use client";

import { toPng } from "html-to-image";
import {
  Calendar,
  Clock,
  Crown,
  Download,
  Music,
  Share2,
  Sparkles,
} from "lucide-react";
import { motion } from "motion/react";
import Image from "next/image";
import { useRef, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { IUserStats } from "@/lib/types/database";

interface SummarySlideProps {
  stats: IUserStats;
  userName: string;
}

export function SummarySlide({ stats, userName }: SummarySlideProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const cardContainerRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardContainerRef.current) return;
    const card = cardContainerRef.current;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((y - centerY) / centerY) * -5;
    const rotateY = ((x - centerX) / centerX) * 5;
    card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.01)`;
  };

  const handleMouseLeave = () => {
    if (!cardContainerRef.current) return;
    cardContainerRef.current.style.transform =
      "perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)";
  };

  const topArtist = stats.topArtists?.[0];
  const topSong = stats.topSongs?.[0];
  const totalHours = Math.round((stats.totalPlaytime || 0) / 3600);
  const year = new Date().getFullYear();

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const downloadCard = async () => {
    if (!cardRef.current) return;
    setIsGenerating(true);

    try {
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 2,
      });

      const link = document.createElement("a");
      link.download = `ytmusic-wrapped-${year}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error("Error generating image:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const shareCard = async () => {
    if (!cardRef.current) return;
    setIsGenerating(true);

    try {
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 2,
      });

      // Convert data URL to blob
      const response = await fetch(dataUrl);
      const blob = await response.blob();

      if (navigator.share && navigator.canShare) {
        const file = new File([blob], `ytmusic-wrapped-${year}.png`, {
          type: "image/png",
        });

        const shareData = {
          files: [file],
          title: `My ${year} YTMusic Wrapped`,
          text: `Check out my ${year} music stats!`,
        };

        if (navigator.canShare(shareData)) {
          await navigator.share(shareData);
        } else {
          downloadCard();
        }
      } else {
        downloadCard();
      }
    } catch (error) {
      console.error("Error sharing:", error);
      downloadCard();
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto text-center text-white relative px-4">
      <motion.h2
        className="text-2xl md:text-3xl font-bold mb-2"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        Your {year} Wrapped
      </motion.h2>

      <motion.p
        className="text-sm text-white/50 mb-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        Save and share your music journey
      </motion.p>

      {/* Shareable Card - Instagram Stories optimized (9:16 aspect ratio) */}
      <motion.div
        ref={cardContainerRef}
        className="relative rounded-3xl overflow-hidden mx-auto cursor-pointer"
        style={{
          width: "280px",
          height: "497px", // 9:16 aspect ratio
          transformStyle: "preserve-3d",
          transition: "transform 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
        }}
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ delay: 0.2, type: "spring", stiffness: 150, damping: 18 }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {/* Inner card for screenshot */}
        <div
          ref={cardRef}
          className="relative z-10 w-full h-full rounded-3xl p-5 flex flex-col"
          style={{
            background:
              "linear-gradient(180deg, #1a1a2e 0%, #16213e 50%, #0f0f23 100%)",
          }}
        >
          {/* Decorative elements */}
          <div
            className="absolute top-0 left-0 w-full h-full overflow-hidden rounded-3xl"
            style={{ pointerEvents: "none" }}
          >
            <div
              className="absolute -top-20 -right-20 w-40 h-40 rounded-full"
              style={{
                background:
                  "radial-gradient(circle, rgba(139, 92, 246, 0.3) 0%, transparent 70%)",
              }}
            />
            <div
              className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full"
              style={{
                background:
                  "radial-gradient(circle, rgba(236, 72, 153, 0.3) 0%, transparent 70%)",
              }}
            />
          </div>

          <div className="relative z-10 flex flex-col h-full">
            {/* Header */}
            <motion.div
              className="flex items-center justify-between mb-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <div className="flex items-center gap-2">
                <div
                  className="p-1.5 rounded-lg"
                  style={{ background: "rgba(255,255,255,0.1)" }}
                >
                  <Music className="h-3.5 w-3.5 text-white" />
                </div>
                <span className="font-semibold text-xs text-white/90">
                  YTMusic Wrapped
                </span>
              </div>
              <span
                className="text-xs font-bold px-2 py-1 rounded-full"
                style={{ background: "rgba(255,255,255,0.1)" }}
              >
                {year}
              </span>
            </motion.div>

            {/* User name */}
            <motion.div
              className="text-center mb-4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <p className="text-[10px] text-white/50 uppercase tracking-wider">
                Stats for
              </p>
              <p className="text-base font-bold mt-0.5">{userName}</p>
            </motion.div>

            {/* Top Song - Featured */}
            <motion.div
              className="rounded-2xl p-3 mb-3"
              style={{ background: "rgba(255,255,255,0.08)" }}
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{
                delay: 0.5,
                type: "spring",
                stiffness: 180,
                damping: 18,
              }}
            >
              <div className="flex items-center gap-1.5 mb-2">
                <Crown className="h-3 w-3 text-yellow-400" />
                <span className="text-[10px] text-white/60 uppercase tracking-wider">
                  Top Song
                </span>
              </div>
              <div className="flex items-center gap-3">
                {topSong?.thumbnail ? (
                  <Image
                    src={topSong.thumbnail}
                    alt={topSong.title}
                    width={48}
                    height={48}
                    className="w-12 h-12 rounded-xl object-cover shadow-lg"
                    unoptimized
                  />
                ) : (
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ background: "rgba(255,255,255,0.1)" }}
                  >
                    <Music className="h-5 w-5 text-white/40" />
                  </div>
                )}
                <div className="flex-1 min-w-0 text-left">
                  <p className="font-semibold text-sm truncate">
                    {topSong?.title || "N/A"}
                  </p>
                  <p className="text-xs text-white/50 truncate">
                    {topSong?.artist || ""}
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              {/* Top Artist */}
              <motion.div
                className="rounded-xl p-2.5"
                style={{ background: "rgba(255,255,255,0.08)" }}
                initial={{ opacity: 0, scale: 0.9, x: -10 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                transition={{
                  delay: 0.6,
                  type: "spring",
                  stiffness: 180,
                  damping: 18,
                }}
              >
                <div className="flex items-center gap-1 mb-1.5">
                  <Sparkles className="h-2.5 w-2.5 text-purple-400" />
                  <span className="text-[9px] text-white/50 uppercase tracking-wider">
                    Top Artist
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Avatar className="h-6 w-6 border border-white/20">
                    {topArtist?.artistImage ? (
                      <AvatarImage
                        src={topArtist.artistImage}
                        alt={topArtist.name}
                      />
                    ) : null}
                    <AvatarFallback
                      className="text-[8px]"
                      style={{ background: "rgba(255,255,255,0.1)" }}
                    >
                      {topArtist ? getInitials(topArtist.name) : "?"}
                    </AvatarFallback>
                  </Avatar>
                  <p className="font-medium text-[11px] truncate flex-1">
                    {topArtist?.name || "N/A"}
                  </p>
                </div>
              </motion.div>

              {/* Listening Time */}
              <motion.div
                className="rounded-xl p-2.5"
                style={{ background: "rgba(255,255,255,0.08)" }}
                initial={{ opacity: 0, scale: 0.9, x: 10 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                transition={{
                  delay: 0.65,
                  type: "spring",
                  stiffness: 180,
                  damping: 18,
                }}
              >
                <div className="flex items-center gap-1 mb-1.5">
                  <Clock className="h-2.5 w-2.5 text-blue-400" />
                  <span className="text-[9px] text-white/50 uppercase tracking-wider">
                    Listened
                  </span>
                </div>
                <p className="text-lg font-bold">{totalHours}h</p>
              </motion.div>
            </div>

            {/* Listening Age - New Section */}
            {stats.listeningAge && (
              <motion.div
                className="rounded-xl p-2.5 mb-3"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(236, 72, 153, 0.2) 100%)",
                }}
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{
                  delay: 0.7,
                  type: "spring",
                  stiffness: 180,
                  damping: 18,
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-1 mb-1">
                      <Calendar className="h-2.5 w-2.5 text-pink-400" />
                      <span className="text-[9px] text-white/60 uppercase tracking-wider">
                        Music Age
                      </span>
                    </div>
                    <p className="text-lg font-bold">
                      {stats.listeningAge} years
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] text-white/50">Era</p>
                    <p className="text-xs font-medium text-white/80">
                      {stats.musicEra || `~${stats.averageReleaseYear}`}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Stats row */}
            <motion.div
              className="grid grid-cols-3 gap-2 py-3 border-t border-white/10 mt-auto"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
            >
              <div className="text-center">
                <p className="text-lg font-bold">
                  {stats.totalSongs?.toLocaleString() || 0}
                </p>
                <p className="text-[9px] text-white/50 uppercase tracking-wider">
                  Songs
                </p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold">
                  {stats.totalArtists?.toLocaleString() || 0}
                </p>
                <p className="text-[9px] text-white/50 uppercase tracking-wider">
                  Artists
                </p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold">
                  {stats.totalListens?.toLocaleString() || 0}
                </p>
                <p className="text-[9px] text-white/50 uppercase tracking-wider">
                  Plays
                </p>
              </div>
            </motion.div>

            {/* Footer */}
            <motion.div
              className="text-center pt-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9 }}
            >
              <p className="text-[10px] text-white/30 font-medium">
                ytmusicstats.shipby.me
              </p>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Action Buttons */}
      <motion.div
        className="flex justify-center gap-3 mt-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          delay: 0.5,
          duration: 0.5,
          ease: [0.25, 0.46, 0.45, 0.94],
        }}
      >
        <Button
          onClick={downloadCard}
          disabled={isGenerating}
          variant="outline"
          className="gap-2 bg-white/5 border-white/10 hover:bg-white/10"
        >
          <Download className="h-4 w-4" />
          Download
        </Button>
        <Button
          onClick={shareCard}
          disabled={isGenerating}
          className="gap-2 bg-white text-zinc-900 hover:bg-white/90"
        >
          <Share2 className="h-4 w-4" />
          Share
        </Button>
      </motion.div>
    </div>
  );
}
