"use client";

import { AlertTriangle } from "lucide-react";
import { useState } from "react";

export function DevBanner() {
  const [dismissed, _setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="fixed z-[100] w-full border-b border-border bg-red-500/10 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-foreground sm:gap-2 sm:px-6 sm:py-2.5 sm:text-sm">
        <AlertTriangle className="size-3 shrink-0 animate-pulse text-red-500 sm:size-4" />
        <p className="text-center">
          <span className="font-semibold">🚧 Under Active Development</span>
          <span className="mx-1 sm:mx-1.5">—</span>
          <span className="text-muted-foreground">
            <span className="hidden sm:inline">
              Expect breaking changes &amp; bugs.
            </span>
            <span className="sm:hidden">Expect changes &amp; bugs.</span>
          </span>
        </p>
      </div>
    </div>
  );
}
