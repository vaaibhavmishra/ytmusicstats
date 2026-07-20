import { getCloudflareContext } from "@opennextjs/cloudflare";
import { drizzle } from "drizzle-orm/d1";

/**
 * Build a Drizzle client bound to the request's D1 instance.
 *
 * The `env.DB` binding only exists inside the Cloudflare Workers runtime, so this
 * must be called during a request (server action, RSC render, or route handler) —
 * never at module load.
 */
export function getDb() {
  const { env } = getCloudflareContext();
  return drizzle(env.DB);
}

/**
 * Backwards-compatible lazy client: resolves the request-scoped binding on first
 * property access, so existing `import { db } from "@/lib/db"` call sites (and the
 * Better Auth adapter) keep working without change.
 */
export const db = new Proxy({} as ReturnType<typeof getDb>, {
  get(_target, prop, receiver) {
    return Reflect.get(getDb(), prop, receiver);
  },
});
