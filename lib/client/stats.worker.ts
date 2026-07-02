/**
 * Statistics Web Worker.
 *
 * Receives the parsed entries + optional metadata map (structured-cloned, which
 * natively preserves the `Date`s and the `Map`), runs the pure `computeStats`
 * core, and posts progress + a final result back. Running off the main thread
 * keeps the UI fully responsive during the "calculating" stage. No yielding is
 * needed here — there is no UI thread to keep free.
 *
 * IMPORTANT: like the other workers, this references the worker global (`self`)
 * and must never be statically `import`ed by other modules — it is only
 * referenced via `new Worker(new URL("./stats.worker.ts", import.meta.url))` in
 * `stats-calculator.ts`. It imports ONLY the pure core + type-only message
 * shapes, so no DOM/server code is pulled into the worker bundle.
 */

import { computeStats } from "@/lib/parsing/stats-core";
import type { StatsRequest, StatsWorkerMessage } from "./stats-calculator";

// `self` is typed as `Window` under the DOM lib; narrow it to just the
// dedicated-worker surface we use, avoiding a tsconfig `lib` change.
const ctx = self as unknown as {
  onmessage: ((event: MessageEvent<StatsRequest>) => void) | null;
  postMessage: (message: StatsWorkerMessage) => void;
};

ctx.onmessage = async (event: MessageEvent<StatsRequest>) => {
  const { entries, metadata } = event.data;

  try {
    const stats = await computeStats(entries, metadata, (progress) => {
      ctx.postMessage({ type: "progress", progress });
    });
    ctx.postMessage({ type: "result", stats });
  } catch (error) {
    ctx.postMessage({
      type: "error",
      message: error instanceof Error ? error.message : "stats failed",
    });
  }
};
