import { drizzle } from "drizzle-orm/neon-http";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error(
    "Please define the DATABASE_URL environment variable inside .env.local",
  );
}

/**
 * Neon serverless HTTP driver — each query is a stateless HTTP request with no
 * persistent TCP connection pool. This avoids connection exhaustion on Vercel
 * where multiple serverless functions run concurrently (e.g. 4 parallel
 * `lookupSongs` calls would previously create 4 separate TCP pools).
 */
export const db = drizzle(DATABASE_URL);
