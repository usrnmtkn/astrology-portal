import type { IncomingMessage, ServerResponse } from "node:http";
import { isContentAdminAuthorized } from "../_lib/admin-auth.js";
import { loadLocalWebEnv } from "../_lib/local-env.js";

loadLocalWebEnv();

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}

function supabaseUrl() {
  return (process.env.SUPABASE_URL ?? requiredEnv("VITE_SUPABASE_URL")).replace(/\/$/u, "");
}

function serviceRoleKey() {
  return requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
}

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json");
  res.setHeader("cache-control", "no-store");
  res.end(JSON.stringify(body));
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (!await isContentAdminAuthorized(req)) {
    sendJson(res, 401, { ok: false, error: "Unauthorized." });
    return;
  }
  if (req.method !== "GET") {
    sendJson(res, 405, { ok: false, error: "Use GET." });
    return;
  }
  try {
    const key = serviceRoleKey();
    const requestUrl = new URL(req.url ?? "/api/admin/content-review-events", "http://localhost");
    const requestedLimit = Number(requestUrl.searchParams.get("limit") ?? "250");
    const limit = Number.isFinite(requestedLimit)
      ? Math.max(1, Math.min(Math.trunc(requestedLimit), 500))
      : 250;
    const params = new URLSearchParams({
      select: "fingerprint,surface,event_date,event_kind,sign,rising_sign,section_id,omitted_content_key,fallback_content_key,reason,first_seen_at,last_seen_at,occurrence_count",
      order: "last_seen_at.desc",
      limit: String(limit)
    });
    const response = await fetch(`${supabaseUrl()}/rest/v1/content_runtime_review_events?${params}`, {
      headers: { apikey: key, authorization: `Bearer ${key}` }
    });
    const rows = await response.json().catch(() => null);
    if (!response.ok) throw new Error(`Content review queue load failed with ${response.status}: ${JSON.stringify(rows)}`);
    sendJson(res, 200, { ok: true, rows });
  } catch (error) {
    sendJson(res, 500, {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown content review queue error."
    });
  }
}
