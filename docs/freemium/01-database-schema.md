# Phase 1: Database Schema Changes

> **Goal:** Add premium tier columns to the `user` table, generate a Drizzle migration, and create utility functions to check/update premium status.

---

## Prerequisites
- Working PostgreSQL database (Neon)
- Drizzle ORM configured (`drizzle.config.ts`)

---

## Step 1: Update the Drizzle Schema

**File:** `lib/db/schema.ts`

Add three new columns to the existing `user` table definition:

```typescript
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  // ── NEW: Freemium tier fields ──────────────────────────
  isPremium: boolean("is_premium").default(false).notNull(),
  polarCustomerId: text("polar_customer_id"),
  upgradedAt: timestamp("upgraded_at"),
  // ───────────────────────────────────────────────────────
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});
```

### Important Notes
- `isPremium` defaults to `false` — every new user starts on the Free tier.
- `polarCustomerId` is nullable — only populated after a successful Polar payment.
- `upgradedAt` is nullable — set when the webhook confirms payment.
- These columns **do not** break Better Auth since Better Auth only manages its own known columns.

---

## Step 2: Generate and Run the Drizzle Migration

```bash
# Generate the migration SQL
pnpm drizzle-kit generate

# Review the generated SQL in drizzle/ directory — it should contain:
# ALTER TABLE "user" ADD COLUMN "is_premium" boolean NOT NULL DEFAULT false;
# ALTER TABLE "user" ADD COLUMN "polar_customer_id" text;
# ALTER TABLE "user" ADD COLUMN "upgraded_at" timestamp;

# Push the migration to the database
pnpm drizzle-kit push
```

---

## Step 3: Create the Premium Service Module

**File:** `lib/services/premium.ts` (NEW)

This module centralizes all premium-related database operations. Every other part of the app should use these functions instead of querying the `user` table directly for premium status.

```typescript
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";

/**
 * Check if a user has premium/pro status.
 */
export async function isUserPremium(userId: string): Promise<boolean> {
  const [row] = await db
    .select({ isPremium: user.isPremium })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  return row?.isPremium ?? false;
}

/**
 * Upgrade a user to premium. Called from the Polar webhook handler.
 */
export async function upgradeUserToPremium(
  userId: string,
  polarCustomerId: string,
): Promise<void> {
  await db
    .update(user)
    .set({
      isPremium: true,
      polarCustomerId,
      upgradedAt: new Date(),
    })
    .where(eq(user.id, userId));
}

/**
 * Get the full premium status for a user (used by API routes).
 */
export async function getPremiumStatus(userId: string) {
  const [row] = await db
    .select({
      isPremium: user.isPremium,
      polarCustomerId: user.polarCustomerId,
      upgradedAt: user.upgradedAt,
    })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  return row ?? { isPremium: false, polarCustomerId: null, upgradedAt: null };
}
```

---

## Step 4: Create an API Route to Expose Premium Status

**File:** `app/api/premium/route.ts` (NEW)

The client-side needs to know whether the current user is premium. This lightweight API route provides that.

```typescript
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { getPremiumStatus } from "@/lib/services/premium";

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  // If billing is disabled (self-hosted), everyone is premium
  const billingEnabled = process.env.NEXT_PUBLIC_ENABLE_BILLING === "true";
  if (!billingEnabled) {
    return NextResponse.json({
      success: true,
      data: { isPremium: true, polarCustomerId: null, upgradedAt: null },
    });
  }

  const status = await getPremiumStatus(session.user.id);
  return NextResponse.json({ success: true, data: status });
}
```

---

## Step 5: Update TypeScript Types

**File:** `lib/types/database.ts`

Add the premium status type near the other interfaces:

```typescript
/**
 * Premium/billing status for the current user.
 */
export interface PremiumStatus {
  isPremium: boolean;
  polarCustomerId: string | null;
  upgradedAt: Date | null;
}
```

---

## Verification Checklist

- [ ] `pnpm type-check` passes with no errors
- [ ] `pnpm check` (Biome) passes
- [ ] Migration generated and pushed successfully
- [ ] Existing users in DB have `is_premium = false` by default
- [ ] `GET /api/premium` returns `{ success: true, data: { isPremium: false, ... } }` for existing users
- [ ] When `NEXT_PUBLIC_ENABLE_BILLING` is unset or `false`, `GET /api/premium` returns `isPremium: true`
