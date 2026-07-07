import { Music } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingProps {
  /**
   * Size variant for the loading spinner
   */
  size?: "sm" | "md" | "lg" | "xl";
  /**
   * Text to display below the spinner
   */
  text?: string;
  /**
   * Show the music icon with the spinner
   */
  showIcon?: boolean;
  /**
   * Full page loading (centers content in viewport)
   */
  fullPage?: boolean;
  /**
   * Custom height for the loading container
   */
  height?: string;
  /**
   * Additional CSS classes
   */
  className?: string;
}

const sizeVariants = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-8 w-8",
  xl: "h-12 w-12",
};

const iconSizeVariants = {
  sm: "h-3 w-3",
  md: "h-4 w-4",
  lg: "h-5 w-5",
  xl: "h-8 w-8",
};

export function Loading({
  size = "md",
  text,
  showIcon = false,
  fullPage = false,
  height,
  className,
}: LoadingProps) {
  const content = (
    <div
      className={cn(
        "flex flex-col items-center justify-center space-y-3",
        className,
      )}
    >
      <div className="relative">
        {/* Outer spinning ring */}
        <div
          className={cn(
            "animate-spin rounded-full border-2 border-muted border-t-primary",
            sizeVariants[size],
          )}
        />
        {/* Inner music icon (optional) */}
        {showIcon && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Music className={cn("text-primary", iconSizeVariants[size])} />
          </div>
        )}
      </div>
      {text && (
        <p className="text-sm text-muted-foreground animate-pulse">{text}</p>
      )}
    </div>
  );

  if (fullPage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        {content}
      </div>
    );
  }

  return (
    <div
      className="flex items-center justify-center"
      style={{ height: height || "8rem" }}
    >
      {content}
    </div>
  );
}

// Preset loading components for common use cases
export function PageLoading({ text = "Loading..." }: { text?: string }) {
  return <Loading size="lg" text={text} showIcon={true} fullPage={true} />;
}

export function CardLoading({
  text,
  height = "8rem",
}: {
  text?: string;
  height?: string;
}) {
  return <Loading size="md" text={text} height={height} />;
}

export function InlineLoading({
  text,
  size = "sm",
}: {
  text?: string;
  size?: "sm" | "md";
}) {
  return (
    <div className="flex items-center space-x-2">
      <div
        className={cn(
          "animate-spin rounded-full border-2 border-muted border-t-primary",
          sizeVariants[size],
        )}
      />
      {text && <span className="text-sm text-muted-foreground">{text}</span>}
    </div>
  );
}
