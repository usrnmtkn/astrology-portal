import type { IncomingMessage, ServerResponse } from "node:http";
import { URL } from "node:url";
import { loadLocalWebEnv } from "../_lib/local-env.js";

loadLocalWebEnv();

type ReviewStatus = "DRAFT" | "REVIEWED" | "LIVE" | "ARCHIVED" | "ERROR";
type GeneratedContentSurface = "sky" | "you" | "natal" | "synastry" | "composite" | "relationship" | "modifier";

type GeneratedContentWriteBody = {
  id?: string;
  contentKey?: string;
  surface?: GeneratedContentSurface;
  mode?: "feed" | "in_depth" | "article" | "card";
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
  promptVersion?: string;
  provider?: string;
  model?: string;
  blockType?: string | null;
  reviewerNotes?: string;
};

type GeneratedContentRequestBody = GeneratedContentWriteBody & {
  rows?: GeneratedContentWriteBody[];
};

type ExistingGeneratedContentRow = {
  id: string;
  content_key: string;
  target_date: string | null;
  mode: string;
  status: ReviewStatus;
};

type SkippedLiveGeneratedContentRow = {
  contentKey: string;
  id?: string;
  status: "LIVE";
};

const allowedStatuses = new Set<ReviewStatus>(["DRAFT", "REVIEWED", "LIVE", "ARCHIVED", "ERROR"]);
const reviewStatuses: ReviewStatus[] = ["DRAFT", "REVIEWED", "LIVE", "ARCHIVED", "ERROR"];
const personalizedSampleSurfaces = new Set<GeneratedContentSurface>(["you", "natal", "synastry", "composite", "relationship"]);
const sampleOnlyReviewerNote = "INTERNAL CONTENT TEST. This row is for testing templates, voice, and knowledge hooks. Do not publish it as global app content. Real You, Synastry, Composite, and Relationship content must be generated from user-specific chart or bond facts.";

function isSampleOnlyRow(surface?: GeneratedContentSurface, contentKey?: string) {
  return Boolean(surface && personalizedSampleSurfaces.has(surface)) || Boolean(contentKey?.startsWith("sample-"));
}

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
  const preParsedBody = (req as IncomingMessage & { body?: unknown }).body;

  if (typeof preParsedBody === "string") {
    return JSON.parse(preParsedBody) as GeneratedContentRequestBody;
  }

  if (preParsedBody && typeof preParsedBody === "object") {
    return preParsedBody as GeneratedContentRequestBody;
  }

  const chunks: Buffer[] = [];

  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  if (chunks.length === 0) {
    throw new Error("Request JSON body is required.");
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as GeneratedContentRequestBody;
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
  const id = requestUrl.searchParams.get("id");
  const status = requestUrl.searchParams.get("status") ?? "DRAFT";
  const surface = requestUrl.searchParams.get("surface");
  const promptVersion = requestUrl.searchParams.get("promptVersion");
  const contentKeyPrefix = requestUrl.searchParams.get("contentKeyPrefix");
  const startDate = requestUrl.searchParams.get("startDate");
  const endDate = requestUrl.searchParams.get("endDate");
  const limit = Math.min(Number(requestUrl.searchParams.get("limit") ?? "50"), 1000);
  const params = new URLSearchParams({
    select: id
      ? "id,content_key,surface,mode,status,event_type,target_date,headline,summary,body,sections,block_type,facts,knowledge_ids,source_snapshot,reviewer_notes,prompt_version,provider,model,reviewed_at,published_at,updated_at,created_at"
      : "id,content_key,surface,mode,status,event_type,target_date,headline,summary,body,sections,block_type,reviewer_notes,prompt_version,provider,model,reviewed_at,published_at,updated_at,created_at",
    order: startDate || endDate ? "target_date.asc.nullslast" : "updated_at.desc",
    limit: id ? "1" : String(limit)
  });

  if (id) {
    params.set("id", `eq.${id}`);
  } else if (status !== "all") {
    params.set("status", `eq.${status}`);
  }

  if (!id && surface) {
    params.set("surface", `eq.${surface}`);
  }

  if (!id && promptVersion) {
    params.set("prompt_version", `eq.${promptVersion}`);
  }

  if (!id && contentKeyPrefix) {
    params.set("content_key", `like.${contentKeyPrefix}%`);
  }

  if (!id && startDate && endDate) {
    params.set("or", `(target_date.is.null,and(target_date.gte.${startDate},target_date.lte.${endDate}))`);
  } else if (!id && startDate) {
    params.set("or", `(target_date.is.null,target_date.gte.${startDate})`);
  } else if (!id && endDate) {
    params.set("or", `(target_date.is.null,target_date.lte.${endDate})`);
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

function exactCountFromContentRange(contentRange: string | null) {
  const match = contentRange?.match(/\/(\d+)$/);
  return match ? Number(match[1]) : 0;
}

async function countGeneratedContent(status: ReviewStatus, surface: GeneratedContentSurface | "all") {
  const params = new URLSearchParams({
    select: "id",
    status: `eq.${status}`,
    limit: "1"
  });

  if (surface !== "all") {
    params.set("surface", `eq.${surface}`);
  }

  const response = await fetch(`${supabaseUrl()}/rest/v1/generated_interpretations?${params}`, {
    headers: {
      ...adminHeaders(),
      prefer: "count=exact",
      range: "0-0"
    }
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(`Supabase count failed with ${response.status}: ${JSON.stringify(payload)}`);
  }

  return exactCountFromContentRange(response.headers.get("content-range"));
}

async function generatedContentStats(req: IncomingMessage) {
  const requestUrl = new URL(req.url ?? "/api/admin/generated-content", "http://localhost");
  const requestedSurface = requestUrl.searchParams.get("surface") as GeneratedContentSurface | "all" | null;
  const surface = requestedSurface ?? "all";
  const counts = Object.fromEntries(
    await Promise.all(reviewStatuses.map(async (status) => [status, await countGeneratedContent(status, surface)]))
  ) as Record<ReviewStatus, number>;

  return {
    counts,
    total: reviewStatuses.reduce((sum, status) => sum + counts[status], 0),
    surface
  };
}

async function createGeneratedContentFromBody(body: GeneratedContentWriteBody) {
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
    status: "DRAFT",
    event_type: body.eventType.trim(),
    target_date: body.targetDate || null,
    facts: body.facts ?? {},
    knowledge_ids: body.knowledgeIds ?? [],
    source_snapshot: body.sourceSnapshot ?? {},
    ...(typeof body.blockType === "string" && body.blockType.trim() ? { block_type: body.blockType.trim() } : {}),
    prompt_version: typeof body.promptVersion === "string" && body.promptVersion.trim() ? body.promptVersion.trim() : "manual-admin",
    provider: "claude",
    model: "manual",
    headline: body.headline ?? "",
    summary: body.summary ?? "",
    body: body.body ?? "",
    sections: body.sections ?? [],
    reviewer_notes: body.reviewerNotes ?? (isSampleOnlyRow(body.surface, body.contentKey) ? sampleOnlyReviewerNote : "")
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

function generatedContentRowFromWriteBody(body: GeneratedContentWriteBody) {
  if (!body.contentKey?.trim()) {
    throw new Error("contentKey is required for every row.");
  }

  if (!body.surface) {
    throw new Error(`surface is required for ${body.contentKey}.`);
  }

  if (!body.mode) {
    throw new Error(`mode is required for ${body.contentKey}.`);
  }

  if (!body.eventType?.trim()) {
    throw new Error(`eventType is required for ${body.contentKey}.`);
  }

  if (body.status && !allowedStatuses.has(body.status)) {
    throw new Error(`status for ${body.contentKey} must be DRAFT, REVIEWED, LIVE, ARCHIVED, or ERROR.`);
  }

  if (body.status === "LIVE" && isSampleOnlyRow(body.surface, body.contentKey)) {
    throw new Error("Personalized content test rows cannot be published globally. Generate real user or bond scoped content instead.");
  }

  return {
    content_key: body.contentKey.trim(),
    surface: body.surface,
    mode: body.mode,
    status: body.status ?? "DRAFT",
    event_type: body.eventType.trim(),
    target_date: body.targetDate || null,
    facts: body.facts ?? {},
    knowledge_ids: body.knowledgeIds ?? [],
    source_snapshot: body.sourceSnapshot ?? {},
    ...(typeof body.blockType === "string" && body.blockType.trim() ? { block_type: body.blockType.trim() } : {}),
    prompt_version: typeof body.promptVersion === "string" && body.promptVersion.trim() ? body.promptVersion.trim() : "manual-admin",
    provider: typeof body.provider === "string" && body.provider.trim() ? body.provider.trim() : "claude",
    model: typeof body.model === "string" && body.model.trim() ? body.model.trim() : "manual",
    headline: body.headline ?? "",
    summary: body.summary ?? "",
    body: body.body ?? "",
    sections: body.sections ?? [],
    reviewer_notes: body.reviewerNotes ?? (isSampleOnlyRow(body.surface, body.contentKey) ? sampleOnlyReviewerNote : ""),
    updated_at: new Date().toISOString()
  };
}

async function fetchExistingRowsByContentKey(contentKeys: string[]) {
  const uniqueKeys = Array.from(new Set(contentKeys.map((key) => key.trim()).filter(Boolean)));
  const rows: ExistingGeneratedContentRow[] = [];

  for (let index = 0; index < uniqueKeys.length; index += 80) {
    const batch = uniqueKeys.slice(index, index + 80);
    const params = new URLSearchParams();
    params.set("select", "id,content_key,target_date,mode,status");
    params.set("content_key", `in.(${batch.map((key) => `"${key}"`).join(",")})`);
    const response = await fetch(`${supabaseUrl()}/rest/v1/generated_interpretations?${params.toString()}`, {
      headers: adminHeaders()
    });
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(`Supabase existing row lookup failed with ${response.status}: ${JSON.stringify(payload)}`);
    }

    rows.push(...payload);
  }

  return rows;
}

function generatedContentTargetKey({
  contentKey,
  targetDate,
  mode
}: Pick<GeneratedContentWriteBody, "contentKey" | "targetDate" | "mode">) {
  return [
    contentKey?.trim() ?? "",
    targetDate || "",
    mode ?? ""
  ].join("\u0000");
}

function existingGeneratedContentTargetKey(row: ExistingGeneratedContentRow) {
  return [
    row.content_key,
    row.target_date ?? "",
    row.mode
  ].join("\u0000");
}

async function bulkUpsertGeneratedContent(body: GeneratedContentRequestBody) {
  const rows = body.rows;

  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error("rows must be a non-empty array.");
  }

  const contentKeys = rows.map((row) => row.contentKey ?? "");
  const existingRows = await fetchExistingRowsByContentKey(contentKeys);
  const existingByTarget = new Map(existingRows.map((row) => [existingGeneratedContentTargetKey(row), row]));
  const skippedLiveRows: SkippedLiveGeneratedContentRow[] = [];
  const upsertRows = rows
    .filter((row) => {
      const contentKey = row.contentKey?.trim() ?? "";
      const existingRow = existingByTarget.get(generatedContentTargetKey(row));

      if (existingRow?.status === "LIVE") {
        skippedLiveRows.push({
          contentKey,
          id: existingRow.id,
          status: "LIVE"
        });
        return false;
      }

      return true;
    })
    .map(generatedContentRowFromWriteBody);
  const allRows = [];

  for (let index = 0; index < upsertRows.length; index += 100) {
    const batch = upsertRows.slice(index, index + 100);
    const response = await fetch(`${supabaseUrl()}/rest/v1/generated_interpretations?on_conflict=content_key,target_date,mode`, {
      method: "POST",
      headers: {
        ...adminHeaders(),
        prefer: "resolution=merge-duplicates,return=representation"
      },
      body: JSON.stringify(batch)
    });
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(`Supabase bulk upsert failed with ${response.status}: ${JSON.stringify(payload)}`);
    }

    allRows.push(...payload);
  }

  return {
    rows: allRows,
    skippedLiveRows
  };
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
    if (body.status === "LIVE" && isSampleOnlyRow(body.surface, body.contentKey)) {
      throw new Error("Personalized content test rows cannot be published globally. Generate real user or bond scoped content instead.");
    }

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

  if (typeof body.contentKey === "string") {
    patch.content_key = body.contentKey.trim();
  }

  if (body.surface) {
    patch.surface = body.surface;
  }

  if (body.mode) {
    patch.mode = body.mode;
  }

  if (typeof body.eventType === "string") {
    patch.event_type = body.eventType.trim();
  }

  if (body.targetDate !== undefined) {
    patch.target_date = body.targetDate || null;
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

  if (body.facts !== undefined) {
    patch.facts = body.facts;
  }

  if (body.knowledgeIds !== undefined) {
    patch.knowledge_ids = body.knowledgeIds;
  }

  if (body.sourceSnapshot !== undefined) {
    patch.source_snapshot = body.sourceSnapshot;
  }

  if (typeof body.promptVersion === "string") {
    patch.prompt_version = body.promptVersion.trim() || "manual-admin";
  }

  if (body.blockType !== undefined) {
    patch.block_type = typeof body.blockType === "string" && body.blockType.trim() ? body.blockType.trim() : null;
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
      const requestUrl = new URL(req.url ?? "/api/admin/generated-content", "http://localhost");
      if (requestUrl.searchParams.get("stats") === "true") {
        sendJson(res, 200, { ok: true, stats: await generatedContentStats(req) });
        return;
      }

      sendJson(res, 200, { ok: true, rows: await listGeneratedContent(req) });
      return;
    }

    if (req.method === "POST") {
      const body = await readJsonBody(req);
      if (Array.isArray(body.rows)) {
        const result = await bulkUpsertGeneratedContent(body);
        sendJson(res, 200, { ok: true, rows: result.rows, skippedLiveRows: result.skippedLiveRows });
        return;
      }

      sendJson(res, 200, { ok: true, rows: await createGeneratedContentFromBody(body) });
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
