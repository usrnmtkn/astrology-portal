import type { IncomingMessage, ServerResponse } from "node:http";
import { URL } from "node:url";
import { isContentAdminAuthorized } from "../_lib/admin-auth.js";
import { AdminHttpError, adminErrorMessage, adminErrorStatus, adminFetch, readAdminJsonBody, sendAdminJson, sendAdminMethodNotAllowed } from "../_lib/admin-http.js";
import { loadLocalWebEnv } from "../_lib/local-env.js";

loadLocalWebEnv();

type UserGeneratedContentSurface = "sky" | "you" | "natal" | "synastry" | "composite" | "relationship";
type UserGeneratedContentStatus = "DRAFT" | "REVIEWED" | "LIVE" | "ARCHIVED" | "ERROR";

type UserGeneratedContentPatch = {
  id?: string;
  expectedUpdatedAt?: string;
  status?: UserGeneratedContentStatus;
  headline?: string;
  summary?: string;
  body?: string;
};

const surfaces = new Set<UserGeneratedContentSurface>(["sky", "you", "natal", "synastry", "composite", "relationship"]);
const statuses = new Set<UserGeneratedContentStatus>(["DRAFT", "REVIEWED", "LIVE", "ARCHIVED", "ERROR"]);
const selectColumns = "id,user_id,subject_type,subject_id,content_key,surface,mode,status,event_type,target_date,provider,model,headline,summary,body,error,updated_at,created_at";

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}

function supabaseUrl() {
  return (process.env.SUPABASE_URL ?? requireEnv("VITE_SUPABASE_URL")).replace(/\/$/u, "");
}

function serviceRoleKey() {
  return requireEnv("SUPABASE_SERVICE_ROLE_KEY");
}

function adminHeaders() {
  const key = serviceRoleKey();
  return {
    apikey: key,
    authorization: `Bearer ${key}`,
    "content-type": "application/json"
  };
}

function validDate(value: string | null) {
  if (value === null) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(value)) throw new AdminHttpError(400, "Dates must be YYYY-MM-DD.");
  const date = new Date(`${value}T12:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new AdminHttpError(400, "Dates must be valid YYYY-MM-DD dates.");
  }
  return value;
}

function listLimit(value: string | null) {
  if (value === null) return 50;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 100) {
    throw new AdminHttpError(400, "limit must be an integer from 1 to 100.");
  }
  return parsed;
}

async function listUserGeneratedContent(req: IncomingMessage) {
  const requestUrl = new URL(req.url ?? "/api/admin/user-generated-content", "http://localhost");
  const requestedStatus = requestUrl.searchParams.get("status");
  const requestedSurface = requestUrl.searchParams.get("surface");
  if (requestedStatus && requestedStatus !== "all" && !statuses.has(requestedStatus as UserGeneratedContentStatus)) {
    throw new AdminHttpError(400, "status is not supported.");
  }
  if (requestedSurface && requestedSurface !== "all" && !surfaces.has(requestedSurface as UserGeneratedContentSurface)) {
    throw new AdminHttpError(400, "surface is not supported.");
  }

  const startDate = validDate(requestUrl.searchParams.get("startDate"));
  const endDate = validDate(requestUrl.searchParams.get("endDate"));
  if (startDate && endDate && startDate > endDate) throw new AdminHttpError(400, "startDate must not be after endDate.");
  const limit = listLimit(requestUrl.searchParams.get("limit"));
  const params = new URLSearchParams({
    select: selectColumns,
    order: startDate || endDate ? "target_date.asc.nullslast,id.asc" : "updated_at.desc,id.desc",
    limit: String(limit)
  });

  if (requestedStatus && requestedStatus !== "all") params.set("status", `eq.${requestedStatus}`);
  if (requestedSurface && requestedSurface !== "all") params.set("surface", `eq.${requestedSurface}`);
  if (startDate) params.set("target_date", `gte.${startDate}`);
  if (endDate) params.append("target_date", `lte.${endDate}`);

  const response = await adminFetch(`${supabaseUrl()}/rest/v1/user_generated_interpretations?${params}`, {
    headers: adminHeaders()
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`Supabase personalized content list failed with ${response.status}: ${JSON.stringify(payload)}`);
  return payload;
}

async function rowExists(id: string) {
  const params = new URLSearchParams({ select: "id,updated_at", id: `eq.${id}`, limit: "1" });
  const response = await adminFetch(`${supabaseUrl()}/rest/v1/user_generated_interpretations?${params}`, { headers: adminHeaders() });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`Supabase personalized content lookup failed with ${response.status}: ${JSON.stringify(payload)}`);
  return Array.isArray(payload) && payload.length > 0;
}

async function updateUserGeneratedContent(req: IncomingMessage) {
  const body = await readAdminJsonBody<UserGeneratedContentPatch>(req);
  if (!body.id?.trim()) throw new AdminHttpError(400, "id is required.");
  if (!body.expectedUpdatedAt?.trim()) throw new AdminHttpError(400, "expectedUpdatedAt is required. Refresh the row before editing.");
  if (body.status && !statuses.has(body.status)) throw new AdminHttpError(400, "status is not supported.");

  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.status) row.status = body.status;
  if (body.headline !== undefined) row.headline = body.headline;
  if (body.summary !== undefined) row.summary = body.summary;
  if (body.body !== undefined) row.body = body.body;
  if (Object.keys(row).length === 1) throw new AdminHttpError(400, "At least one editable field is required.");

  const params = new URLSearchParams({
    id: `eq.${body.id}`,
    updated_at: `eq.${body.expectedUpdatedAt}`,
    select: selectColumns
  });
  const response = await adminFetch(`${supabaseUrl()}/rest/v1/user_generated_interpretations?${params}`, {
    method: "PATCH",
    headers: { ...adminHeaders(), prefer: "return=representation" },
    body: JSON.stringify(row)
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`Supabase personalized content update failed with ${response.status}: ${JSON.stringify(payload)}`);
  if (Array.isArray(payload) && payload.length > 0) return payload;

  if (await rowExists(body.id)) {
    throw new AdminHttpError(409, "This personalized row changed in another editor. Refresh before saving again.");
  }
  throw new AdminHttpError(404, "Personalized content row not found.");
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (!await isContentAdminAuthorized(req)) {
    sendAdminJson(res, 401, { ok: false, error: "Unauthorized." });
    return;
  }
  if (req.method !== "GET" && req.method !== "PATCH") {
    sendAdminMethodNotAllowed(res, ["GET", "PATCH"]);
    return;
  }

  try {
    if (req.method === "PATCH") {
      sendAdminJson(res, 200, { ok: true, rows: await updateUserGeneratedContent(req) });
      return;
    }
    sendAdminJson(res, 200, { ok: true, rows: await listUserGeneratedContent(req) });
  } catch (error) {
    sendAdminJson(res, adminErrorStatus(error), {
      ok: false,
      error: adminErrorMessage(error, "Unknown personalized generated content admin error.")
    });
  }
}
