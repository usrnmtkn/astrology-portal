import type { IncomingMessage, ServerResponse } from "node:http";
import { URL } from "node:url";
import { currentSkyFacts } from "../_lib/current-sky.js";
import { loadLocalWebEnv } from "../_lib/local-env.js";
import { skyArticleEditionFactsFromSnapshot } from "../_lib/sky-article-facts.js";

loadLocalWebEnv();

function normalizeToken(value: string) {
  return value.trim().toLowerCase().replace(/[_\s]+/gu, "-");
}

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json");
  res.end(JSON.stringify(body));
}

function isAuthorized(req: IncomingMessage) {
  const secret = process.env.CONTENT_GENERATION_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  return req.headers.authorization === `Bearer ${secret}`;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== "GET") {
    sendJson(res, 405, { error: "Use GET." });
    return;
  }
  if (!isAuthorized(req)) {
    sendJson(res, 401, { error: "Unauthorized." });
    return;
  }

  try {
    const requestUrl = new URL(req.url ?? "/api/admin/sky-article-facts", "http://localhost");
    const planet = normalizeToken(requestUrl.searchParams.get("planet") ?? "");
    const referenceDate = requestUrl.searchParams.get("date") ?? new Date().toISOString().slice(0, 10);
    if (!planet) throw new Error("planet is required.");
    if (!/^\d{4}-\d{2}-\d{2}$/u.test(referenceDate)) throw new Error("date must be YYYY-MM-DD.");
    const referenceInstant = new Date(`${referenceDate}T12:00:00.000Z`);
    const snapshot = await currentSkyFacts(referenceInstant);
    sendJson(res, 200, { ok: true, facts: skyArticleEditionFactsFromSnapshot(snapshot, planet) });
  } catch (error) {
    sendJson(res, 500, {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown Sky article fact error."
    });
  }
}
