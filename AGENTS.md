# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Package manager is **pnpm** (v11). Node 18+.

- `pnpm dev` — start dev server (http://localhost:3000)
- `pnpm build` — production build
- `pnpm start` — serve the production build
- `pnpm lint` — Biome check (lint only)
- `pnpm check` — Biome check + autofix (lint, format, organize imports) — run this before finishing changes
- `pnpm format` — Biome format only
- `pnpm type-check` — `tsc --noEmit`

No test runner is configured. The pure logic modules (`lib/parsing/*`, `lib/concurrency.ts`) are deliberately written free of DOM/`self`/server globals so they *can* be unit-tested in Node if a runner is added.

Environment variables live in `.env.local` (not `.env`): `DATABASE_URL` (PostgreSQL connection string), `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `YOUTUBE_API_KEY`, `NEXT_PUBLIC_APP_URL`.

## Stack

Next.js 16 (App Router, RSC) · React 19 with the **React Compiler enabled** (`reactCompiler: true` in `next.config.ts`) · TypeScript · Tailwind CSS v4 · shadcn/ui (new-york style, in `components/ui`) · PostgreSQL via Drizzle ORM · Better Auth (email/password + Google OAuth, using Drizzle adapter). Path alias `@/*` maps to the repo root.

## Architecture — the data pipeline

The core of this app is a **client-side processing pipeline**: a user's Google Takeout `watch-history.json` (can be hundreds of MB) is parsed and aggregated *in the browser*, and only the compact computed `IUserStats` is sent to the server. Raw history never touches the backend. Understanding this flow requires reading across several modules:

**Orchestrated in** `app/upload/components/upload-area.tsx`, which runs these stages and maps each to a progress range:

1. **Parse** — `lib/client/parser.ts#parseFile`. For files ≥5 MB on a capable browser it uses the **Web Worker pool** (`lib/client/worker-pool.ts`); otherwise (or on any worker failure — signalled by `WorkerPoolFallback`) it falls back to a single-threaded, batched, yield-between-chunks parser. Both paths return the same `ParseResult`.
2. **Fetch metadata** — `lib/client/youtube.ts` calls the `lookupSongs` server action.
3. **Calculate stats** — `lib/client/stats-calculator.ts#calculateStats`. Histories ≥5000 entries run in `stats.worker.ts`; otherwise inline with periodic yields. Both call the same pure `computeStats`.
4. **Save** — POST to `/api/stats`, which Zod-validates and upserts via `lib/services/user-stats.ts`.

### The parallel parser (the trickiest part)

To parse huge JSON across cores without ever holding the full object graph on one heap:

- `lib/parsing/scanner.ts#scanTopLevelElements` scans the file as **raw UTF-8 bytes** (never decoded) to find the `[start, end)` byte boundaries of each top-level array element. This is safe because all JSON structural chars are ASCII (`< 0x80`) and every byte of a multi-byte UTF-8 sequence is `>= 0x80`, so an emoji in a song title can never be mistaken for a `}` etc. It's pure (Node-testable) and returns `ok:false` on malformed/non-array input.
- `worker-pool.ts` runs that scan in a throwaway worker, splits the byte ranges into N contiguous shards (N = clamped core count, max 8), and **transfers** (zero-copy) each shard's bytes to a `parser.worker.ts` instance that decodes + `JSON.parse`s only its slice. Results merge back **in shard order** to preserve chronological order.
- Any failure at any step throws `WorkerPoolFallback` so `parseFile` degrades cleanly to the single-thread path. Preserve this fallback contract when editing.

### Pure core vs. environment shells (important pattern)

Computation lives in **pure, global-free modules** so the same code runs in a Web Worker, on the main thread, and (for transforms) in server actions — guaranteeing results can't drift between paths:

- `lib/parsing/transforms.ts` — entry filtering + song/artist extraction (`isYouTubeMusicEntry`, `parseSongEntry`, `cleanArtistName`, `extractArtistFromTitle`, `isGenericArtist`)
- `lib/parsing/stats-core.ts` — `computeStats` (all aggregation). Takes an optional `yieldToBrowser` callback: the worker passes none, the main-thread fallback passes one.
- `lib/parsing/scanner.ts`, `lib/concurrency.ts` — as above.

**`*.worker.ts` files reference the worker global (`self`) and must never be statically `import`ed** — only instantiated via `new Worker(new URL("./x.worker.ts", import.meta.url), { type: "module" })`. They import only pure cores + type-only message shapes, so no DOM/server code leaks into worker bundles. `lib/client/parser.ts` re-exports transform helpers for backward-compat, but **server code should import transforms from `@/lib/parsing/transforms` directly** to avoid pulling in client-only code.

## Backend specifics

- **Single DB via Drizzle ORM.** All tables (auth + app data) live in a single PostgreSQL database. The Drizzle client is in `lib/db/index.ts` (stateless HTTP driver — no connection pooling or `connectDB()` calls needed). Schema is in `lib/db/schema.ts`.
- **`lookupSongs`** (`app/actions/songs.ts`) is the metadata resolver: checks the `songs` table cache via `inArray()`, fetches misses from the YouTube Data API (batched 50 IDs/request, concurrency-limited via `mapWithConcurrency`), upserts results into cache via `onConflictDoUpdate`. Guards with auth + origin checks and caps input at 8000 IDs.
- **`/api/stats`** — GET returns the caller's `user_stats` row; POST accepts client-computed stats validated against an explicit Zod schema (arbitrary fields rejected). Auth via `auth.api.getSession`.
- Tables: `songs` (metadata cache, keyed by `youtube_id`), `user_stats` (one aggregated row per user), plus Better Auth tables (`user`, `session`, `account`, `verification`).
- Shared types are centralized in `lib/types/database.ts`.

## Conventions

- Biome (2 spaces, recommended preset + Next/React domains) is the single source of truth for lint/format — no ESLint/Prettier.
- Adaptive processing keys off `navigator.hardwareConcurrency`/`deviceMemory`/user-agent (`getDeviceCapability`) to pick batch sizes and worker use; mobile/low-core devices get smaller batches and more yields.
