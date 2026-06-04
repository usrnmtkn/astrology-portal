import type { IncomingMessage, ServerResponse } from "node:http";
import { URL } from "node:url";

type ReviewStatus = "DRAFT" | "REVIEWED" | "LIVE" | "ARCHIVED" | "ERROR";

const allowedStatuses = new Set<ReviewStatus>(["DRAFT", "REVIEWED", "LIVE", "ARCHIVED", "ERROR"]);

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

function isAuthorized(req: IncomingMessage) {
  const secret = process.env.CONTENT_GENERATION_SECRET;

  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }

  return req.headers.authorization === `Bearer ${secret}`;
}

async function readJsonBody(req: IncomingMessage) {
  const chunks: Buffer[] = [];

  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as {
    id?: string;
    contentKey?: string;
    surface?: "sky" | "you" | "natal" | "synastry" | "composite" | "relationship";
    mode?: "feed" | "in_depth" | "article";
    eventType?: string;
    targetDate?: string | null;
    status?: ReviewStatus;
    headline?: string;
    summary?: string;
    body?: string;
    sections?: unknown;
    facts?: unknown;
    knowledgeIds?: string[];
    sourceSnapshot?: unknown;
    reviewerNotes?: string;
  };
}

function adminHeaders() {
  const key = serviceRoleKey();

  return {
    apikey: key,
    authorization: `Bearer ${key}`,
    "content-type": "application/json"
  };
}

async function listGeneratedContent(req: IncomingMessage) {
  const requestUrl = new URL(req.url ?? "/api/admin/generated-content", "http://localhost");
  const status = requestUrl.searchParams.get("status") ?? "DRAFT";
  const surface = requestUrl.searchParams.get("surface");
  const limit = Math.min(Number(requestUrl.searchParams.get("limit") ?? "50"), 100);
  const params = new URLSearchParams({
    select: "id,content_key,surface,mode,status,event_type,target_date,headline,summary,body,sections,reviewer_notes,prompt_version,model,reviewed_at,published_at,updated_at,created_at",
    order: "updated_at.desc",
    limit: String(limit)
  });

  if (status !== "all") {
    params.set("status", `eq.${status}`);
  }

  if (surface) {
    params.set("surface", `eq.${surface}`);
  }

  const response = await fetch(`${supabaseUrl()}/rest/v1/generated_interpretations?${params}`, {
    headers: adminHeaders()
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(`Supabase list failed with ${response.status}: ${JSON.stringify(payload)}`);
  }

  return payload;
}

async function createGeneratedContent(req: IncomingMessage) {
  const body = await readJsonBody(req);

  if (!body.contentKey?.trim()) {
    throw new Error("contentKey is required.");
  }

  if (!body.surface) {
    throw new Error("surface is required.");
  }

  if (!body.mode) {
    throw new Error("mode is required.");
  }

  if (!body.eventType?.trim()) {
    throw new Error("eventType is required.");
  }

  const row = {
    content_key: body.contentKey.trim(),
    surface: body.surface,
    mode: body.mode,
    status: body.status && allowedStatuses.has(body.status) ? body.status : "DRAFT",
    event_type: body.eventType.trim(),
    target_date: body.targetDate || null,
    facts: body.facts ?? {},
    knowledge_ids: body.knowledgeIds ?? [],
    source_snapshot: body.sourceSnapshot ?? {},
    prompt_version: "manual-admin",
    model: "manual",
    headline: body.headline ?? "",
    summary: body.summary ?? "",
    body: body.body ?? "",
    sections: body.sections ?? [],
    reviewer_notes: body.reviewerNotes ?? ""
  };

  const response = await fetch(`${supabaseUrl()}/rest/v1/generated_interpretations?on_conflict=content_key,target_date,mode`, {
    method: "POST",
    headers: {
      ...adminHeaders(),
      prefer: "resolution=merge-duplicates,return=representation"
    },
    body: JSON.stringify(row)
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(`Supabase create failed with ${response.status}: ${JSON.stringify(payload)}`);
  }

  return payload;
}

async function updateGeneratedContent(req: IncomingMessage) {
  const body = await readJsonBody(req);

  if (!body.id) {
    throw new Error("id is required.");
  }

  if (body.status && !allowedStatuses.has(body.status)) {
    throw new Error("status must be DRAFT, REVIEWED, LIVE, ARCHIVED, or ERROR.");
  }

  const patch: Record<string, unknown> = {};

  if (body.status) {
    patch.status = body.status;

    if (body.status === "REVIEWED") {
      patch.reviewed_at = new Date().toISOString();
    }

    if (body.status === "LIVE") {
      const now = new Date().toISOString();
      patch.reviewed_at = now;
      patch.published_at = now;
    }
  }

  if (typeof body.headline === "string") {
    patch.headline = body.headline;
  }

  if (typeof body.summary === "string") {
    patch.summary = body.summary;
  }

  if (typeof body.body === "string") {
    patch.body = body.body;
  }

  if (body.sections !== undefined) {
    patch.sections = body.sections;
  }

  if (typeof body.reviewerNotes === "string") {
    patch.reviewer_notes = body.reviewerNotes;
  }

  if (Object.keys(patch).length === 0) {
    throw new Error("No review fields were provided.");
  }

  const response = await fetch(`${supabaseUrl()}/rest/v1/generated_interpretations?id=eq.${encodeURIComponent(body.id)}`, {
    method: "PATCH",
    headers: {
      ...adminHeaders(),
      prefer: "return=representation"
    },
    body: JSON.stringify(patch)
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(`Supabase review update failed with ${response.status}: ${JSON.stringify(payload)}`);
  }

  return payload;
}

async function deleteGeneratedContent(req: IncomingMessage) {
  const requestUrl = new URL(req.url ?? "/api/admin/generated-content", "http://localhost");
  const id = requestUrl.searchParams.get("id");

  if (!id) {
    throw new Error("id is required.");
  }

  const response = await fetch(`${supabaseUrl()}/rest/v1/generated_interpretations?id=eq.${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: {
      ...adminHeaders(),
      prefer: "return=representation"
    }
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(`Supabase delete failed with ${response.status}: ${JSON.stringify(payload)}`);
  }

  return payload;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (!isAuthorized(req)) {
    sendJson(res, 401, { error: "Unauthorized." });
    return;
  }

  try {
    if (req.method === "GET") {
      sendJson(res, 200, { ok: true, rows: await listGeneratedContent(req) });
      return;
    }

    if (req.method === "POST") {
      sendJson(res, 200, { ok: true, rows: await createGeneratedContent(req) });
      return;
    }

    if (req.method === "PATCH") {
      sendJson(res, 200, { ok: true, rows: await updateGeneratedContent(req) });
      return;
    }

    if (req.method === "DELETE") {
      sendJson(res, 200, { ok: true, rows: await deleteGeneratedContent(req) });
      return;
    }

    sendJson(res, 405, { error: "Use GET, POST, PATCH, or DELETE." });
  } catch (error) {
    sendJson(res, 500, {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown generated content admin error."
    });
  }
}
