# Phase 3: Shared Premium UI Components

> **Goal:** Build the reusable React components and hooks that power the freemium UX — `<ProGate>`, `<ProBadge>`, `<UpgradeButton>`, `<UpgradeModal>`, and the `useIsPremium` hook.

---

## Prerequisites
- Phase 1 complete (API route `GET /api/premium` exists)
- Phase 2 complete (checkout action `createCheckoutUrl` exists)

---

## Step 1: Create the `useIsPremium` Hook

**File:** `hooks/use-premium.ts` (NEW)

This hook fetches the user's premium status and caches it for the session. It also respects the billing toggle.

```typescript
"use client";

import { useEffect, useState } from "react";

interface PremiumState {
  isPremium: boolean;
  isLoading: boolean;
}

/**
 * Hook to check whether the current user is a Pro subscriber.
 * When NEXT_PUBLIC_ENABLE_BILLING is false (self-hosted), always returns true.
 */
export function useIsPremium(): PremiumState {
  const [state, setState] = useState<PremiumState>({
    isPremium: false,
    isLoading: true,
  });

  useEffect(() => {
    // If billing is disabled, treat everyone as premium
    if (process.env.NEXT_PUBLIC_ENABLE_BILLING !== "true") {
      setState({ isPremium: true, isLoading: false });
      return;
    }

    async function check() {
      try {
        const res = await fetch("/api/premium");
        if (res.ok) {
          const json = await res.json();
          setState({ isPremium: json.data?.isPremium ?? false, isLoading: false });
        } else {
          setState({ isPremium: false, isLoading: false });
        }
      } catch {
        setState({ isPremium: false, isLoading: false });
      }
    }

    check();
  }, []);

  return state;
}
```

---

## Step 2: Create the `<ProGate>` Component

**File:** `components/pro-gate.tsx` (NEW)

This is the core gating component. It wraps any premium content and shows a blurred overlay with an upgrade CTA for Free users.

```tsx
"use client";

import { Lock } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useIsPremium } from "@/hooks/use-premium";

interface ProGateProps {
  children: ReactNode;
  /** Text shown on the overlay. Defaults to "Unlock with Pro" */
  label?: string;
  /** If true, render a skeleton placeholder instead of blurred children */
  useSkeleton?: boolean;
}

export function ProGate({
  children,
  label = "Unlock with Pro",
  useSkeleton = false,
}: ProGateProps) {
  const { isPremium, isLoading } = useIsPremium();

  // While loading, render children normally (no flash of locked state)
  if (isLoading || isPremium) {
    return <>{children}</>;
  }

  return (
    <div className="relative">
      {/* Blurred or skeleton content */}
      <div
        className={useSkeleton ? "opacity-20" : "blur-sm pointer-events-none select-none"}
        aria-hidden="true"
      >
        {children}
      </div>

      {/* Overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/60 backdrop-blur-[2px] rounded-lg">
        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
          <Lock className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        <Button size="sm" asChild>
          <a href="/pricing">Upgrade to Pro</a>
        </Button>
      </div>
    </div>
  );
}
```

---

## Step 3: Create the `<ProBadge>` Component

**File:** `components/pro-badge.tsx` (NEW)

A small pill badge shown next to the user's name/avatar when they are a Pro user.

```tsx
import { Sparkles } from "lucide-react";

export function ProBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 text-xs font-semibold text-amber-600 dark:text-amber-400">
      <Sparkles className="h-3 w-3" />
      PRO
    </span>
  );
}
```

---

## Step 4: Create the `<UpgradeButton>` Component

**File:** `components/upgrade-button.tsx` (NEW)

The CTA button used in the navbar and throughout the app.

```tsx
"use client";

import { Zap } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface UpgradeButtonProps {
  size?: "sm" | "default" | "lg";
  variant?: "default" | "outline" | "ghost";
  className?: string;
}

export function UpgradeButton({
  size = "sm",
  variant = "default",
  className,
}: UpgradeButtonProps) {
  return (
    <Button size={size} variant={variant} className={className} asChild>
      <Link href="/pricing" className="gap-1.5">
        <Zap className="h-3.5 w-3.5" />
        Upgrade to Pro
      </Link>
    </Button>
  );
}
```

---

## Step 5: Create the `<UpgradeModal>` Component

**File:** `components/upgrade-modal.tsx` (NEW)

A dialog triggered when a Free user hits a processing limit (e.g., file too large, too many entries).

```tsx
"use client";

import { Lock, Zap } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The reason the limit was hit */
  reason: string;
}

export function UpgradeModal({ open, onOpenChange, reason }: UpgradeModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-4 h-14 w-14 rounded-full bg-muted flex items-center justify-center">
            <Lock className="h-7 w-7 text-muted-foreground" />
          </div>
          <DialogTitle className="text-center">
            Free Tier Limit Reached
          </DialogTitle>
          <DialogDescription className="text-center">
            {reason}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
            <p className="text-sm font-medium">Upgrade to Pro to unlock:</p>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>✦ Unlimited file size & history</li>
              <li>✦ Top 100+ songs & 50+ artists</li>
              <li>✦ Advanced analytics & heatmaps</li>
              <li>✦ CSV/JSON export, no watermarks</li>
              <li>✦ Lifetime stats storage</li>
            </ul>
          </div>

          <div className="flex flex-col gap-2">
            <Button asChild className="w-full gap-2">
              <Link href="/pricing">
                <Zap className="h-4 w-4" />
                Upgrade to Pro — $4.99 lifetime
              </Link>
            </Button>
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => onOpenChange(false)}
            >
              Continue with Free tier
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

> **Note:** This uses the shadcn/ui `Dialog` component. If it doesn't exist yet, add it:
> ```bash
> pnpm dlx shadcn@latest add dialog
> ```

---

## Step 6: Add `isPremium` to the Server-Side Session (optional optimization)

For server components (like `dashboard/page.tsx` and `upload/page.tsx`), you can avoid an extra API call by querying the `user` table directly.

**File:** `lib/auth/helpers.ts` (NEW)

```typescript
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";

/**
 * Get the authenticated session along with premium status.
 * For use in Server Components and Server Actions only.
 */
export async function getSessionWithPremium() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) return null;

  // If billing is disabled, skip the DB query
  if (process.env.NEXT_PUBLIC_ENABLE_BILLING !== "true") {
    return { ...session, isPremium: true };
  }

  const [row] = await db
    .select({ isPremium: user.isPremium })
    .from(user)
    .where(eq(user.id, session.user.id))
    .limit(1);

  return { ...session, isPremium: row?.isPremium ?? false };
}
```

This lets you pass `isPremium` as a prop from server pages to client components, avoiding the client-side fetch entirely.

---

## File Summary

| File | Status | Purpose |
| :--- | :--- | :--- |
| `hooks/use-premium.ts` | NEW | Client-side hook for premium status |
| `components/pro-gate.tsx` | NEW | Blur overlay wrapper for premium content |
| `components/pro-badge.tsx` | NEW | "PRO" pill badge |
| `components/upgrade-button.tsx` | NEW | "⚡ Upgrade" CTA button |
| `components/upgrade-modal.tsx` | NEW | Dialog for limit-hit scenarios |
| `lib/auth/helpers.ts` | NEW | Server-side session + premium status helper |

---

## Verification Checklist

- [ ] `pnpm type-check` passes
- [ ] `pnpm check` (Biome) passes
- [ ] `<ProGate>` renders children normally for Pro users
- [ ] `<ProGate>` shows blurred overlay + "Upgrade" button for Free users
- [ ] `<UpgradeModal>` opens and closes correctly
- [ ] `<ProBadge>` renders a styled pill
- [ ] `<UpgradeButton>` links to `/pricing`
- [ ] `useIsPremium` returns `true` when `NEXT_PUBLIC_ENABLE_BILLING` is not set
