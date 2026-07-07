/**
 * Bounded-concurrency async map.
 *
 * Pure and environment-agnostic (no DOM/`self`/server globals) so it can be
 * imported by client code, the parsing worker, and `"use server"` actions
 * alike — same sharing pattern as `lib/parsing/transforms.ts`.
 */

/**
 * Run `fn` over every item with at most `limit` calls in flight at once.
 *
 * Results are returned in input order (each slot is written by index), so the
 * output lines up with `items` regardless of completion order. `fn` is invoked
 * by `N = min(limit, items.length)` worker loops that pull from a shared cursor.
 *
 * Errors propagate: if any `fn` call rejects, the returned promise rejects.
 * Callers that want to tolerate per-item failures should catch inside `fn`.
 */
export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;

  async function worker(): Promise<void> {
    while (true) {
      const index = cursor++;
      if (index >= items.length) return;
      results[index] = await fn(items[index], index);
    }
  }

  const workerCount = Math.max(1, Math.min(limit, items.length));
  await Promise.all(Array.from({ length: workerCount }, () => worker()));

  return results;
}
