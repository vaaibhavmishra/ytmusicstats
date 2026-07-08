# Phase 5: Pricing Page

> **Goal:** Build a beautiful, conversion-optimized `/pricing` page with animated comparison cards and a direct Polar checkout integration.

---

## Prerequisites
- Phase 1–3 complete
- `createCheckoutUrl` server action exists (`app/actions/checkout.ts`)

---

## Step 1: Create the Pricing Page

**File:** `app/pricing/page.tsx` (NEW)

```tsx
import type { Metadata } from "next";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/config";
import { PricingContent } from "./components/PricingContent";

export const metadata: Metadata = {
  title: "Pricing — YTMusic Stats",
  description:
    "Unlock unlimited music analytics with YTMusic Stats Pro. One-time payment, lifetime access.",
  alternates: {
    canonical: "/pricing",
  },
};

export default async function PricingPage() {
  // Check if user is logged in (to show correct CTA)
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const isAuthenticated = !!session?.user;

  return (
    <div className="min-h-screen pt-24 pb-16">
      <PricingContent isAuthenticated={isAuthenticated} />
    </div>
  );
}
```

---

## Step 2: Create the Pricing Content Component

**File:** `app/pricing/components/PricingContent.tsx` (NEW)

This is the main client component with the pricing cards and feature comparison table.

```tsx
"use client";

import {
  BarChart3,
  Check,
  Crown,
  Download,
  Infinity,
  Lock,
  Music,
  Sparkles,
  X,
  Zap,
} from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useIsPremium } from "@/hooks/use-premium";
import { createCheckoutUrl } from "@/app/actions/checkout";

interface PricingContentProps {
  isAuthenticated: boolean;
}

const FREE_FEATURES = [
  { text: "Up to 10MB file upload", included: true },
  { text: "Top 10 Songs & Top 5 Artists", included: true },
  { text: "Basic listening time stats", included: true },
  { text: "Wrapped experience (watermarked)", included: true },
  { text: "30-day stats retention", included: true },
  { text: "Custom date ranges", included: false },
  { text: "Listening heatmaps", included: false },
  { text: "CSV/JSON export", included: false },
  { text: "Unlimited history", included: false },
];

const PRO_FEATURES = [
  { text: "Unlimited file upload (100MB+)", included: true },
  { text: "Top 100+ Songs & Top 50+ Artists", included: true },
  { text: "Advanced analytics & heatmaps", included: true },
  { text: "Wrapped experience (no watermark)", included: true },
  { text: "Lifetime stats retention", included: true },
  { text: "Custom date range filtering", included: true },
  { text: "Obscurity score & genre analysis", included: true },
  { text: "CSV & JSON data export", included: true },
  { text: "Version history (compare years)", included: true },
];

export function PricingContent({ isAuthenticated }: PricingContentProps) {
  const { isPremium } = useIsPremium();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleUpgrade = async () => {
    if (!isAuthenticated) {
      router.push("/auth/signin");
      return;
    }

    setIsLoading(true);
    try {
      const checkoutUrl = await createCheckoutUrl();
      window.location.href = checkoutUrl;
    } catch (error) {
      console.error("Checkout error:", error);
      toast.error("Something went wrong. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 max-w-5xl">
      {/* Header */}
      <motion.div
        className="text-center mb-12 space-y-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
          Simple, transparent pricing
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Get your Wrapped for free. Upgrade once for lifetime access to deep
          analytics, unlimited history, and premium exports.
        </p>
      </motion.div>

      {/* Pricing Cards */}
      <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto mb-16">
        {/* Free Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Music className="h-5 w-5" />
                Free
              </CardTitle>
              <CardDescription>
                Perfect for casual listeners
              </CardDescription>
              <div className="pt-2">
                <span className="text-4xl font-bold">$0</span>
                <span className="text-muted-foreground ml-1">forever</span>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {FREE_FEATURES.map((feature) => (
                  <li key={feature.text} className="flex items-center gap-2.5 text-sm">
                    {feature.included ? (
                      <Check className="h-4 w-4 text-foreground shrink-0" />
                    ) : (
                      <X className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                    )}
                    <span className={feature.included ? "" : "text-muted-foreground/50"}>
                      {feature.text}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-6">
                <Button variant="outline" className="w-full" asChild>
                  <Link href={isAuthenticated ? "/upload" : "/auth/signup"}>
                    {isAuthenticated ? "Go to Upload" : "Get Started"}
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Pro Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card className="h-full border-foreground/20 relative overflow-hidden">
            {/* Popular badge */}
            <div className="absolute top-0 right-0 bg-foreground text-background text-xs font-semibold px-3 py-1 rounded-bl-lg">
              POPULAR
            </div>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Crown className="h-5 w-5 text-amber-500" />
                Pro
              </CardTitle>
              <CardDescription>
                For music data enthusiasts
              </CardDescription>
              <div className="pt-2">
                <span className="text-4xl font-bold">$4.99</span>
                <span className="text-muted-foreground ml-1">one-time</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Pay once, yours forever. No subscriptions.
              </p>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {PRO_FEATURES.map((feature) => (
                  <li key={feature.text} className="flex items-center gap-2.5 text-sm">
                    <Sparkles className="h-4 w-4 text-amber-500 shrink-0" />
                    <span>{feature.text}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-6">
                {isPremium ? (
                  <Button className="w-full" disabled>
                    <Check className="h-4 w-4 mr-2" />
                    You're already Pro!
                  </Button>
                ) : (
                  <Button
                    className="w-full gap-2"
                    onClick={handleUpgrade}
                    disabled={isLoading}
                  >
                    <Zap className="h-4 w-4" />
                    {isLoading ? "Redirecting..." : "Upgrade to Pro"}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* FAQ / Trust signals */}
      <motion.div
        className="text-center space-y-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <h2 className="text-xl font-semibold">Frequently asked questions</h2>
        <div className="grid md:grid-cols-2 gap-4 max-w-3xl mx-auto text-left">
          <div className="p-4 rounded-lg bg-muted/50">
            <p className="font-medium text-sm mb-1">Is it really one-time?</p>
            <p className="text-sm text-muted-foreground">
              Yes! Pay $4.99 once and get lifetime access. No recurring charges, ever.
            </p>
          </div>
          <div className="p-4 rounded-lg bg-muted/50">
            <p className="font-medium text-sm mb-1">Is my data private?</p>
            <p className="text-sm text-muted-foreground">
              Your music history is parsed entirely in your browser. Only aggregated stats are stored.
            </p>
          </div>
          <div className="p-4 rounded-lg bg-muted/50">
            <p className="font-medium text-sm mb-1">Can I self-host for free?</p>
            <p className="text-sm text-muted-foreground">
              Absolutely. This project is open-source. Clone the repo and all features are unlocked.
            </p>
          </div>
          <div className="p-4 rounded-lg bg-muted/50">
            <p className="font-medium text-sm mb-1">What payment methods?</p>
            <p className="text-sm text-muted-foreground">
              We use Polar (polar.sh) which supports credit/debit cards and various local methods.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
```

---

## Step 3: Add Pricing Link to Navigation

**File:** `components/Navigation.tsx`

Add a "Pricing" link in the public nav items:

```diff
  const navItems = [
    { name: "Features", link: "#features" },
    { name: "How It Works", link: "#how-it-works" },
+   { name: "Pricing", link: "/pricing" },
  ];
```

---

## Step 4: Handle Upgrade Success on Dashboard

**File:** `app/dashboard/page.tsx`

When a user returns from Polar checkout, show a success toast.

The URL will contain `?upgrade=success`. Handle this in `DashboardContent.tsx`:

```diff
+ import { useSearchParams } from "next/navigation";

  export function DashboardContent({ stats }: DashboardContentProps) {
+   const searchParams = useSearchParams();
+
+   useEffect(() => {
+     if (searchParams.get("upgrade") === "success") {
+       toast.success("🎉 Welcome to Pro!", {
+         description: "Your account has been upgraded. Enjoy unlimited analytics!",
+       });
+       // Clean the URL
+       window.history.replaceState({}, "", "/dashboard");
+     }
+   }, [searchParams]);

    // ... rest of component ...
  }
```

---

## File Summary

| File | Status | Purpose |
| :--- | :--- | :--- |
| `app/pricing/page.tsx` | NEW | Pricing page server component |
| `app/pricing/components/PricingContent.tsx` | NEW | Pricing cards, FAQ, checkout CTA |
| `components/Navigation.tsx` | MODIFY | Add "Pricing" nav link |
| `app/dashboard/components/DashboardContent.tsx` | MODIFY | Handle `?upgrade=success` toast |

---

## Verification Checklist

- [ ] `/pricing` page renders with Free and Pro cards
- [ ] Feature lists match the tiering table in `FREEMIUM_STRATEGY.md`
- [ ] "Upgrade to Pro" button triggers `createCheckoutUrl` and redirects
- [ ] "Get Started" shows for unauthenticated users → redirects to signup
- [ ] "You're already Pro!" button shows for premium users
- [ ] Redirecting back from checkout with `?upgrade=success` shows toast
- [ ] "Pricing" link appears in the public navigation
- [ ] Page is responsive on mobile
- [ ] `pnpm type-check` and `pnpm check` pass
