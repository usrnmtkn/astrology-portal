import type { IncomingMessage, ServerResponse } from "node:http";
import { URL } from "node:url";
import { isContentAdminAuthorized } from "../_lib/admin-auth.js";
import { loadLocalWebEnv } from "../_lib/local-env.js";

loadLocalWebEnv();

type UserGeneratedContentSurface = "sky" | "you" | "natal" | "synastry" | "composite" | "relationship";
type UserGeneratedContentStatus = "DRAFT" | "REVIEWED" | "LIVE" | "ARCHIVED" | "ERROR";

function requireEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is not configured.`);
  }

  return value;
}

function supabaseUrl() {
  return process.env.SUPABASE_URL ?? requireEnv("VITE_SUPABASE_URL");
}

function serviceRoleKey() {
  return requireEnv("SUPABASE_SERVICE_ROLE_KEY");
}

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json");
  res.end(JSON.stringify(body));
}

function adminHeaders() {
  const key = serviceRoleKey();

  return {
    apikey: key,
    authorization: `Bearer ${key}`,
    "content-type": "application/json"
  };
}

async function readJsonBody(req: IncomingMessage) {
  const chunks: Buffer[] = [];

  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as {
    id?: string;
    status?: UserGeneratedContentStatus;
    headline?: string;
    summary?: string;
    body?: string;
  };
}

async function listUserGeneratedContent(req: IncomingMessage) {
  const requestUrl = new URL(req.url ?? "/api/admin/user-generated-content", "http://localhost");
  const status = requestUrl.searchParams.get("status") as UserGeneratedContentStatus | "all" | null;
  const surface = requestUrl.searchParams.get("surface") as UserGeneratedContentSurface | "all" | null;
  const startDate = requestUrl.searchParams.get("startDate");
  const endDate = requestUrl.searchParams.get("endDate");
  const limit = Math.min(Number(requestUrl.searchParams.get("limit") ?? "50"), 100);
  const params = new URLSearchParams({
    select: [
      "id",
      "user_id",
      "subject_type",
      "subject_id",
      "content_key",
      "surface",
      "mode",
      "status",
      "event_type",
      "target_date",
      "provider",
      "model",
      "headline",
      "summary",
      "body",
      "error",
      "updated_at",
      "created_at"
    ].join(","),
    order: startDate || endDate ? "target_date.asc.nullslast" : "updated_at.desc",
    limit: String(limit)
  });

  if (status && status !== "all") {
    params.set("status", `eq.${status}`);
  }

  if (surface && surface !== "all") {
    params.set("surface", `eq.${surface}`);
  }

  if (startDate) {
    params.set("target_date", `gte.${startDate}`);
  }

  if (endDate) {
    params.append("target_date", `lte.${endDate}`);
  }

  const response = await fetch(`${supabaseUrl()}/rest/v1/user_generated_interpretations?${params}`, {
    headers: adminHeaders()
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(`Supabase personalized content list failed with ${response.status}: ${JSON.stringify(payload)}`);
  }

  return payload;
}

async function updateUserGeneratedContent(req: IncomingMessage) {
  const body = await readJsonBody(req);

  if (!body.id) {
    throw new Error("id is required.");
  }

  const row: Record<string, unknown> = {
    updated_at: new Date().toISOString()
  };

  if (body.status) row.status = body.status;
  if (body.headline !== undefined) row.headline = body.headline;
  if (body.summary !== undefined) row.summary = body.summary;
  if (body.body !== undefined) row.body = body.body;

  const response = await fetch(`${supabaseUrl()}/rest/v1/user_generated_interpretations?id=eq.${encodeURIComponent(body.id)}&select=id,user_id,subject_type,subject_id,content_key,surface,mode,status,event_type,target_date,provider,model,headline,summary,body,error,updated_at,created_at`, {
    method: "PATCH",
    headers: {
      ...adminHeaders(),
      prefer: "return=representation"
    },
    body: JSON.stringify(row)
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(`Supabase personalized content update failed with ${response.status}: ${JSON.stringify(payload)}`);
  }

  return payload;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (!await isContentAdminAuthorized(req)) {
    sendJson(res, 401, { error: "Unauthorized." });
    return;
  }

  if (req.method !== "GET" && req.method !== "PATCH") {
    sendJson(res, 405, { error: "Use GET or PATCH." });
    return;
  }

  try {
    if (req.method === "PATCH") {
      sendJson(res, 200, { ok: true, rows: await updateUserGeneratedContent(req) });
      return;
    }

    sendJson(res, 200, { ok: true, rows: await listUserGeneratedContent(req) });
  } catch (error) {
    sendJson(res, 500, {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown personalized generated content admin error."
    });
  }
}
