# Phase 2: Polar Payment Gateway Integration

> **Goal:** Install the Polar SDK, create the checkout redirect route, and implement the webhook handler that upgrades users to Pro.

---

## Prerequisites
- Phase 1 complete (premium columns exist in DB, `lib/services/premium.ts` created)
- A Polar account at [polar.sh](https://polar.sh)
- A "Pro Lifetime" product created in the Polar dashboard (one-time payment, $4.99)

---

## Step 1: Create Polar Account & Product

1. Sign up at [polar.sh](https://polar.sh) and create an organization.
2. Go to **Products** → **Create Product**:
   - Name: `YT Music Stats Pro`
   - Type: **One-time payment**
   - Price: `$4.99`
   - Copy the **Product ID** (e.g., `prod_...`).
3. Go to **Settings** → **Developers**:
   - Generate an **Access Token** → copy it.
4. Go to **Settings** → **Webhooks**:
   - Add endpoint: `https://your-domain.com/api/webhooks/polar`
   - Events: `order.paid`
   - Copy the **Webhook Secret**.

---

## Step 2: Install Dependencies

```bash
pnpm add @polar-sh/sdk @polar-sh/nextjs
```

---

## Step 3: Add Environment Variables

**File:** `.env.local` (add these)

```env
# Polar Payment Gateway
POLAR_ACCESS_TOKEN=polar_at_XXXXXXXX
POLAR_WEBHOOK_SECRET=whsec_XXXXXXXX
POLAR_PRODUCT_ID=prod_XXXXXXXX
NEXT_PUBLIC_ENABLE_BILLING=true
```

> **Note:** `NEXT_PUBLIC_ENABLE_BILLING` is the only client-visible variable. All Polar secrets are server-only.

---

## Step 4: Create the Polar Client

**File:** `lib/polar.ts` (NEW)

```typescript
import { Polar } from "@polar-sh/sdk";

export const polar = new Polar({
  accessToken: process.env.POLAR_ACCESS_TOKEN!,
  server: process.env.NODE_ENV === "production" ? "production" : "sandbox",
});
```

---

## Step 5: Create the Checkout Route

**File:** `app/checkout/route.ts` (NEW)

This route redirects the user to Polar's hosted checkout page. The `@polar-sh/nextjs` helper handles the entire redirect flow.

```typescript
import { Checkout } from "@polar-sh/nextjs";

export const GET = Checkout({
  accessToken: process.env.POLAR_ACCESS_TOKEN!,
  successUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?upgrade=success&checkout_id={CHECKOUT_ID}`,
  server: process.env.NODE_ENV === "production" ? "production" : "sandbox",
});
```

### How to trigger it from the frontend

Link or redirect to:
```
/checkout?products=POLAR_PRODUCT_ID&customerExternalId=USER_ID
```

The `customerExternalId` maps the Polar customer to your internal user ID, which the webhook uses to find and upgrade the right user.

---

## Step 6: Create the Webhook Handler

**File:** `app/api/webhooks/polar/route.ts` (NEW)

This is the most critical file. When a user pays, Polar sends a `POST` request here. We verify the signature and upgrade the user in the database.

```typescript
import { Webhooks } from "@polar-sh/nextjs";
import { upgradeUserToPremium } from "@/lib/services/premium";

export const POST = Webhooks({
  webhookSecret: process.env.POLAR_WEBHOOK_SECRET!,
  onOrderPaid: async (payload) => {
    const order = payload.data;
    const userId = order.customer?.externalId;
    const polarCustomerId = order.customer?.id;

    if (!userId) {
      console.error("[Polar Webhook] No externalId on order:", order.id);
      return;
    }

    if (!polarCustomerId) {
      console.error("[Polar Webhook] No customer ID on order:", order.id);
      return;
    }

    console.log(`[Polar Webhook] Upgrading user ${userId} to Pro`);
    await upgradeUserToPremium(userId, polarCustomerId);
    console.log(`[Polar Webhook] User ${userId} upgraded successfully`);
  },
});
```

### Webhook Signature Verification
The `Webhooks` helper from `@polar-sh/nextjs` automatically verifies the signature using the `POLAR_WEBHOOK_SECRET`. If the signature is invalid, the request is rejected with a `400` before your handler runs. You do not need to manually verify anything.

---

## Step 7: Create a Server Action for Checkout URL Generation

**File:** `app/actions/checkout.ts` (NEW)

For more control (e.g., to attach the user ID server-side), create a server action:

```typescript
"use server";

import { headers } from "next/headers";
import { auth } from "@/lib/auth/config";
import { polar } from "@/lib/polar";

/**
 * Generate a Polar checkout URL for the Pro Lifetime product.
 * Returns the checkout URL to redirect the user to.
 */
export async function createCheckoutUrl(): Promise<string> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const productId = process.env.POLAR_PRODUCT_ID;
  if (!productId) {
    throw new Error("POLAR_PRODUCT_ID is not configured");
  }

  const checkout = await polar.checkouts.custom.create({
    productId,
    customerEmail: session.user.email,
    customerExternalId: session.user.id,
    successUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?upgrade=success`,
  });

  return checkout.url;
}
```

---

## Step 8: Testing with Polar Sandbox

### Local Development

1. Set your Polar client to `sandbox` mode (already handled by the env check in `lib/polar.ts`).
2. Use the Polar CLI to tunnel webhook events to localhost:

```bash
# Install Polar CLI
npx polar listen http://localhost:3000/api/webhooks/polar
```

3. Make a test purchase through the sandbox checkout.
4. Verify:
   - The webhook is received and logged in the terminal.
   - The user's `is_premium` flips to `true` in the database.
   - `GET /api/premium` returns `isPremium: true`.

### Production Checklist

- [ ] Switch `POLAR_ACCESS_TOKEN` to the production token
- [ ] Update webhook URL in Polar dashboard to `https://your-domain.com/api/webhooks/polar`
- [ ] Set `NEXT_PUBLIC_ENABLE_BILLING=true` in Vercel environment variables
- [ ] Test a real $4.99 purchase end-to-end

---

## File Summary

| File | Status | Purpose |
| :--- | :--- | :--- |
| `lib/polar.ts` | NEW | Polar SDK client singleton |
| `app/checkout/route.ts` | NEW | Checkout redirect handler |
| `app/api/webhooks/polar/route.ts` | NEW | Webhook handler (order.paid → upgrade user) |
| `app/actions/checkout.ts` | NEW | Server action to generate checkout URL |
| `.env.local` | MODIFY | Add 4 new Polar environment variables |

---

## Verification Checklist

- [ ] `pnpm build` succeeds with new routes
- [ ] `pnpm type-check` passes
- [ ] Sandbox checkout redirect works
- [ ] Webhook received and user upgraded in DB
- [ ] `GET /api/premium` reflects the upgrade
- [ ] With `NEXT_PUBLIC_ENABLE_BILLING=false`, users skip billing entirely
