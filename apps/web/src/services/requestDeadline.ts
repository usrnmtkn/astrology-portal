export const READER_REQUEST_TIMEOUT_MS = 8_000;

/** Bound the complete operation (including authentication), not just its last fetch. */
export async function withRequestDeadline<T>(
  operation: (signal: AbortSignal) => PromiseLike<T>,
  options: { signal?: AbortSignal; timeoutMs?: number } = {}
): Promise<T> {
  const controller = new AbortController();
  const abort = () => controller.abort(options.signal?.reason ?? new DOMException("Request cancelled", "AbortError"));
  if (options.signal?.aborted) abort();
  else options.signal?.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(() => controller.abort(new DOMException("Request timed out. Try again.", "TimeoutError")),
    options.timeoutMs ?? READER_REQUEST_TIMEOUT_MS);
  let rejectOnAbort: () => void = () => undefined;
  try {
    controller.signal.throwIfAborted();
    const cancelled = new Promise<never>((_, reject) => {
      rejectOnAbort = () => reject(controller.signal.reason);
      controller.signal.addEventListener("abort", rejectOnAbort, { once: true });
    });
    return await Promise.race([operation(controller.signal), cancelled]);
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener("abort", abort);
    controller.signal.removeEventListener("abort", rejectOnAbort);
  }
}
