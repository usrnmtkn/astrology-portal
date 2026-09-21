import type { IncomingMessage, ServerResponse } from "node:http";

const checkpoints = new Set(["calendar.controls", "calendar.reading", "checkin.entry", "checkin.library"]);
const outcomes = new Set(["ready", "error", "timeout", "cancelled"]);
const networks = new Set(["slow-2g", "2g", "3g", "4g", "unknown"]);
const keys = ["cache", "checkpoint", "durationMs", "network", "outcome", "viewport"];

export function validatedReaderMetrics(value: unknown) {
  if (!value || typeof value !== "object" || Object.keys(value).join() !== "events") return null;
  const events = (value as { events?: unknown }).events;
  if (!Array.isArray(events) || !events.length || events.length > 8) return null;
  for (const event of events) {
    if (!event || typeof event !== "object" || Object.keys(event).sort().join() !== keys.join()
      || !checkpoints.has(event.checkpoint) || !outcomes.has(event.outcome)
      || !networks.has(event.network) || !["small", "large"].includes(event.viewport)
      || !["hit", "miss", "unknown"].includes(event.cache)
      || !Number.isInteger(event.durationMs) || event.durationMs < 0 || event.durationMs > 120_000) return null;
  }
  return events;
}

export default async function handler(req: IncomingMessage & { body?: unknown }, res: ServerResponse) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") { res.statusCode = 405; res.end(); return; }
  // Browser telemetry is same-origin only, with no cookies or authenticated data.
  let origin: URL;
  try { origin = new URL(String(req.headers.origin)); }
  catch { res.statusCode = 403; res.end(); return; }
  if (origin.host !== req.headers.host || !["same-origin", undefined].includes(req.headers["sec-fetch-site"] as string | undefined)) {
    res.statusCode = 403; res.end(); return;
  }
  if (!String(req.headers["content-type"]).startsWith("application/json") || Number(req.headers["content-length"] ?? 0) > 3_072) {
    res.statusCode = 413; res.end(); return;
  }
  try {
    let body = req.body;
    if (body === undefined) {
      let raw = "";
      for await (const chunk of req) {
        raw += chunk.toString();
        if (Buffer.byteLength(raw) > 3_072) { res.statusCode = 413; res.end(); return; }
      }
      body = JSON.parse(raw);
    } else if (typeof body === "string") body = JSON.parse(body);
    if (Buffer.byteLength(JSON.stringify(body)) > 3_072) { res.statusCode = 413; res.end(); return; }
    const events = validatedReaderMetrics(body);
    if (!events) { res.statusCode = 400; res.end(); return; }
    console.info(JSON.stringify({ type: "reader_performance", revision: process.env.VERCEL_GIT_COMMIT_SHA ?? "local", events }));
    res.statusCode = 204;
    res.end();
  } catch {
    res.statusCode = 400;
    res.end();
  }
}
