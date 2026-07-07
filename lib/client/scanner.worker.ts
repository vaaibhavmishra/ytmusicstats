/**
 * Scanner Web Worker.
 *
 * Receives the file's full byte buffer (transferred, zero-copy), runs the pure
 * byte-level boundary scan, and transfers back the computed element ranges
 * AND the original buffer so the main thread can slice shards from it. Moving
 * the O(n) scan off the main thread keeps the UI responsive on large files.
 *
 * IMPORTANT: like `parser.worker.ts`, this references the worker global (`self`)
 * and must never be statically `import`ed by other modules — it is only
 * referenced via `new Worker(new URL("./scanner.worker.ts", import.meta.url))`
 * in `worker-pool.ts`. It imports ONLY the pure scanner + type-only message
 * shapes, so no DOM/server code is pulled into the worker bundle.
 */

import { scanTopLevelElements } from "@/lib/parsing/scanner";
import type { ScanRequest, ScanWorkerMessage } from "./worker-pool";

// `self` is typed as `Window` under the DOM lib; narrow it to just the
// dedicated-worker surface we use, avoiding a tsconfig `lib` change.
const ctx = self as unknown as {
  onmessage: ((event: MessageEvent<ScanRequest>) => void) | null;
  postMessage: (message: ScanWorkerMessage, transfer?: Transferable[]) => void;
};

ctx.onmessage = (event: MessageEvent<ScanRequest>) => {
  const { buffer } = event.data;

  const result = scanTopLevelElements(new Uint8Array(buffer));

  if (result.ok) {
    // Transfer the ranges' buffer and hand the original buffer back so the main
    // thread can keep slicing shards from it (zero-copy in both directions).
    ctx.postMessage({ ok: true, ranges: result.ranges, buffer }, [
      result.ranges.buffer,
      buffer,
    ]);
  } else {
    ctx.postMessage({ ok: false, reason: result.reason });
  }
};
