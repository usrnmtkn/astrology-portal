import type { IncomingMessage, ServerResponse } from "node:http";
import { loadLocalWebEnv } from "./_lib/local-env.js";
import {
  contentReviewEventFingerprint,
  normalizeContentReviewEventRequest
} from "./_lib/content-review-events.js";

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

function anonKey() {
  return process.env.SUPABASE_PUBLISHABLE_KEY
    ?? process.env.SUPABASE_ANON_KEY
    ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY
    ?? process.env.VITE_SUPABASE_ANON_KEY
    ?? requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
}

function bearerToken(req: IncomingMessage) {
  return req.headers.authorization?.match(/^Bearer\s+(.+)$/iu)?.[1] ?? "";
}

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json");
  res.setHeader("cache-control", "no-store");
  res.end(JSON.stringify(body));
}

async function readJsonBody(req: IncomingMessage) {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > 32_768) throw new Error("Review-event request is too large.");
    chunks.push(buffer);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new Error("Review-event request must be valid JSON.");
  }
}

async function requireAuthenticatedUser(req: IncomingMessage) {
  const token = bearerToken(req);
  if (!token) return false;
  const response = await fetch(`${supabaseUrl()}/auth/v1/user`, {
    headers: { apikey: anonKey(), authorization: `Bearer ${token}` }
  });
  return response.ok;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== "POST") {
    sendJson(res, 405, { ok: false, error: "Use POST." });
    return;
  }
  try {
    if (!await requireAuthenticatedUser(req)) {
      sendJson(res, 401, { ok: false, error: "Sign in before reporting content review events." });
      return;
    }
    const request = normalizeContentReviewEventRequest(await readJsonBody(req));
    const key = serviceRoleKey();
    const rows = request.flags.map((flag) => ({
      p_fingerprint: contentReviewEventFingerprint(flag, request.context),
      p_surface: request.context.surface,
      p_event_date: request.context.eventDate.slice(0, 10),
      p_event_kind: request.context.eventKind ?? null,
      p_sign: request.context.sign ?? null,
      p_rising_sign: request.context.risingSign ?? null,
      p_section_id: flag.sectionId,
      p_omitted_content_key: flag.omittedContentKey,
      p_fallback_content_key: flag.fallbackContentKey,
      p_reason: flag.reason
    }));
    await Promise.all(rows.map(async (row) => {
      const response = await fetch(`${supabaseUrl()}/rest/v1/rpc/record_content_runtime_review_event`, {
        method: "POST",
        headers: {
          apikey: key,
          authorization: `Bearer ${key}`,
          "content-type": "application/json"
        },
        body: JSON.stringify(row)
      });
      if (!response.ok) {
        const payload = await response.text();
        throw new Error(`Content review event save failed with ${response.status}: ${payload}`);
      }
    }));
    sendJson(res, 200, { ok: true, recorded: rows.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown content review event error.";
    const status = /required|invalid|unknown|must|too large|Only omitted/iu.test(message) ? 400 : 500;
    if (status === 500) console.error("Content review event recording failed.", error);
    sendJson(res, status, {
      ok: false,
      error: status === 400 ? message : "The content review event could not be recorded."
    });
  }
}
