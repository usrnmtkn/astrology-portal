type Checkpoint = "calendar.controls" | "calendar.reading" | "checkin.entry" | "checkin.library";
type Outcome = "ready" | "error" | "timeout" | "cancelled";
type Metric = { checkpoint: Checkpoint; outcome: Outcome; durationMs: number; viewport: string; network: string; cache: "hit" | "miss" | "unknown" };
const queue: Metric[] = [];
let sampled: boolean | undefined;
let sent = 0;
let flushTimer: ReturnType<typeof setTimeout> | undefined;

function flush() {
  clearTimeout(flushTimer);
  flushTimer = undefined;
  if (!queue.length || sent >= 2) return;
  const events = queue.splice(0, 8);
  sent++;
  // No URL, date, account identifier, note, chart, or content text leaves the browser.
  void fetch("/api/reader-performance", {
    method: "POST", credentials: "omit", referrerPolicy: "no-referrer", keepalive: true,
    headers: { "Content-Type": "application/json" }, body: JSON.stringify({ events })
  }).catch(() => { /* Measurement failure must never affect the reader or retry. */ });
}

/** Timings also remain inspectable locally through the browser Performance API. */
export function startReaderMeasurement(checkpoint: Checkpoint, cache: Metric["cache"] = "unknown") {
  const startedAt = performance.now();
  let completed = false;
  return (outcome: Outcome) => {
    if (completed) return;
    completed = true;
    const durationMs = Math.round(performance.now() - startedAt);
    try { performance.measure(`tldr:${checkpoint}:${outcome}`, { start: startedAt, duration: durationMs }); }
    catch { /* Older User Timing implementations must not interrupt the reader. */ }
    if (sampled === undefined) {
      sampled = import.meta.env.PROD && !navigator.webdriver && navigator.doNotTrack !== "1" && Math.random() < 0.05;
      if (sampled) document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") flush(); });
    }
    if (!sampled || sent >= 2 || queue.length >= 8 || durationMs > 120_000) return;
    const connection = (navigator as Navigator & { connection?: { effectiveType?: string } }).connection?.effectiveType;
    queue.push({ checkpoint, outcome, durationMs, cache,
      viewport: innerWidth <= 600 ? "small" : "large",
      network: ["slow-2g", "2g", "3g", "4g"].includes(connection ?? "") ? connection! : "unknown" });
    flushTimer ??= setTimeout(flush, 5_000);
  };
}
