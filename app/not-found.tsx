"use client";

import { ArrowLeft, Home } from "lucide-react";
import { motion, type Variants } from "motion/react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const Beams = dynamic(() => import("@/components/Beams"), { ssr: false });

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      delayChildren: 0.2,
      staggerChildren: 0.15,
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

const numberVariants: Variants = {
  hidden: { scale: 0.8, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: {
      duration: 0.8,
      ease: "easeOut",
    },
  },
};

export default function NotFound() {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="h-screen w-screen relative"
    >
      {/* Beams Background */}
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

      {/* Content */}
      <div className="relative z-20 h-full w-full flex flex-col items-center justify-center px-4">
        <motion.div
          className="text-center space-y-6 max-w-lg"
          variants={containerVariants}
        >
          {/* 404 Number */}
          <motion.div variants={numberVariants} className="relative">
            <h1 className="text-[150px] md:text-[200px] font-bold leading-none tracking-tighter text-primary/50">
              404
            </h1>
          </motion.div>

          {/* Message */}
          <motion.div variants={itemVariants} className="space-y-3">
            <h2 className="text-2xl md:text-3xl font-bold">
              Lost in the <span className="text-primary">Playlist</span>
            </h2>
            <p className="text-muted-foreground text-lg">
              Looks like this track doesn't exist in our library. The page
              you're looking for might have been moved or doesn't exist.
            </p>
          </motion.div>

          {/* Actions */}
          <motion.div
            variants={itemVariants}
            className="flex flex-col sm:flex-row gap-4 justify-center pt-4"
          >
            <Button size="lg" asChild>
              <Link href="/">
                <Home className="h-4 w-4 mr-2" />
                Back to Home
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/dashboard">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go to Dashboard
              </Link>
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  );
}
