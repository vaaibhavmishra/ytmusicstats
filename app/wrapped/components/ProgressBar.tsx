"use client";

import { useEffect, useRef, useState } from "react";

interface ProgressBarProps {
  currentSlide: number;
  totalSlides: number;
  onSlideClick: (index: number) => void;
  autoplayDuration?: number;
  isPaused?: boolean;
}

export function ProgressBar({
  currentSlide,
  totalSlides,
  onSlideClick,
  autoplayDuration = 6000,
  isPaused = false,
}: ProgressBarProps) {
  const [progress, setProgress] = useState(0);
  const animationRef = useRef<number | null>(null);
  const progressRef = useRef<number>(0);

  // Sync progress to ref for access in effects
  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  // Reset progress when slide changes
  // biome-ignore lint/correctness/useExhaustiveDependencies: explicitly want to reset when currentSlide changes
  useEffect(() => {
    setProgress(0);
    progressRef.current = 0;
  }, [currentSlide]);

  // Handle animation based on pause state
  // biome-ignore lint/correctness/useExhaustiveDependencies: restart animation when currentSlide changes
  useEffect(() => {
    // Cancel any existing animation
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    if (isPaused) {
      return;
    }

    // Start or resume animation from current progress
    const startProgress = progressRef.current;
    const remainingDuration = autoplayDuration * (1 - startProgress / 100);

    if (remainingDuration <= 0) {
      setProgress(100);
      return;
    }

    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const newProgress =
        startProgress + (elapsed / remainingDuration) * (100 - startProgress);

      if (newProgress >= 100) {
        setProgress(100);
        progressRef.current = 100;
        return;
      }

      setProgress(newProgress);
      progressRef.current = newProgress;
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPaused, autoplayDuration, currentSlide]);

  return (
    <div className="absolute top-4 left-4 right-4 z-50 flex gap-1.5">
      {Array.from({ length: totalSlides }).map((_, index) => (
        <button
          // biome-ignore lint/suspicious/noArrayIndexKey: simple static array layout requires index-based keys
          key={`slide-${index}`}
          type="button"
          onClick={() => onSlideClick(index)}
          className="flex-1 h-[3px] rounded-full bg-white/20 overflow-hidden cursor-pointer hover:bg-white/30 transition-colors duration-200"
          aria-label={`Go to slide ${index + 1}`}
        >
          <div
            className="h-full bg-white rounded-full"
            style={{
              width:
                index < currentSlide
                  ? "100%"
                  : index === currentSlide
                    ? `${progress}%`
                    : "0%",
              transition:
                index === currentSlide
                  ? "none"
                  : "width 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
            }}
          />
        </button>
      ))}
    </div>
  );
}
