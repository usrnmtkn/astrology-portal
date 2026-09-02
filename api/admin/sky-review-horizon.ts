import type { IncomingMessage, ServerResponse } from "node:http";
import { URL } from "node:url";
import { isContentAdminAuthorized } from "../_lib/admin-auth.js";
import { AdminHttpError, adminErrorMessage, adminErrorStatus, adminFetch, sendAdminJson, sendAdminMethodNotAllowed } from "../_lib/admin-http.js";
import skyReviewHorizon from "../../src/astro-writing/skyReviewHorizon.cjs";
import { currentSkyFacts, type SkySnapshot } from "../_lib/current-sky.js";
import { loadLocalWebEnv } from "../_lib/local-env.js";

loadLocalWebEnv();

export const maxDuration = 60;

const { buildSkyReviewHorizon, joinSkyReviewRows } = skyReviewHorizon as {
  buildSkyReviewHorizon: (snapshots: SkySnapshot[]) => SkyReviewHorizon;
  joinSkyReviewRows: (horizon: SkyReviewHorizon, rows: unknown[]) => SkyReviewHorizon;
};

type SkyReviewHorizon = {
  startDate: string;
  endDate: string;
  snapshotCount: number;
  calculationMethod: string;
  counts: Record<string, number>;
  reviewCounts?: Record<string, number>;
  occurrences: Array<{ contentKey: string; reviewStatus?: string; [key: string]: unknown }>;
};

const calculatedHorizonCache = new Map<string, { expiresAt: number; horizon: SkyReviewHorizon }>();

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}

function supabaseUrl() {
  return (process.env.SUPABASE_URL ?? requireEnv("VITE_SUPABASE_URL")).replace(/\/$/u, "");
}

function adminHeaders() {
  const key = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  return { apikey: key, authorization: `Bearer ${key}` };
}

function parseStartDate(value: string | null) {
  if (value && !/^\d{4}-\d{2}-\d{2}$/u.test(value)) throw new AdminHttpError(400, "startDate must be YYYY-MM-DD.");
  const candidate = value ? new Date(`${value}T12:00:00.000Z`) : new Date();
  if (Number.isNaN(candidate.getTime()) || (value && candidate.toISOString().slice(0, 10) !== value)) {
    throw new AdminHttpError(400, "startDate must be a valid YYYY-MM-DD date.");
  }
  candidate.setUTCHours(12, 0, 0, 0);
  return candidate;
}

function dateSequence(start: Date, days: number) {
  return Array.from({ length: days }, (_, index) => new Date(start.getTime() + index * 86_400_000));
}

async function mapWithConcurrency<TInput, TOutput>(values: TInput[], concurrency: number, fn: (value: TInput) => Promise<TOutput>) {
  const output = new Array<TOutput>(values.length);
  let cursor = 0;
  async function worker() {
    while (cursor < values.length) {
      const index = cursor;
      cursor += 1;
      output[index] = await fn(values[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, values.length) }, () => worker()));
  return output;
}

async function skyReviewRows() {
  const rows: unknown[] = [];
  const pageSize = 500;
  let cursorId = "";
  for (let page = 0; page < 10; page += 1) {
    const params = new URLSearchParams({
      select: "id,content_key,surface,mode,status,event_type,target_date,headline,summary,body,sections,facts,lane,review_state,block_type,provider,model,prompt_version,source_snapshot,judge_score,judge_verdict,judge_gate,judge_why,reviewed_at,published_at,updated_at,created_at",
      surface: "eq.sky",
      block_type: "in.(sky_aspect,sky_placement)",
      order: "id.asc",
      limit: String(pageSize)
    });
    if (cursorId) params.set("id", `gt.${cursorId}`);
    const response = await adminFetch(`${supabaseUrl()}/rest/v1/generated_interpretations?${params}`, {
      headers: adminHeaders()
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(`Sky review horizon lookup failed with ${response.status}: ${JSON.stringify(payload)}`);
    const pageRows = Array.isArray(payload) ? payload as Array<{ id?: unknown }> : [];
    rows.push(...pageRows);
    const lastId = pageRows.at(-1)?.id;
    if (pageRows.length < pageSize || typeof lastId !== "string" || !lastId) break;
    cursorId = lastId;
  }
  return rows;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (!await isContentAdminAuthorized(req)) {
    sendAdminJson(res, 401, { ok: false, error: "Unauthorized." });
    return;
  }
  if (req.method !== "GET") {
    sendAdminMethodNotAllowed(res, ["GET"]);
    return;
  }

  try {
    const requestUrl = new URL(req.url ?? "/api/admin/sky-review-horizon", "http://localhost");
    const days = Number(requestUrl.searchParams.get("days") ?? 91);
    if (!Number.isInteger(days) || days < 1 || days > 92) {
      throw new AdminHttpError(400, "days must be an integer from 1 through 92.");
    }
    const start = parseStartDate(requestUrl.searchParams.get("startDate"));
    const cacheKey = `${start.toISOString().slice(0, 10)}:${days}`;
    const cached = calculatedHorizonCache.get(cacheKey);
    const horizon = cached && cached.expiresAt > Date.now()
      ? cached.horizon
      : buildSkyReviewHorizon(await mapWithConcurrency(dateSequence(start, days), 6, async (date) => ({
          ...await currentSkyFacts(date),
          horizonDate: date.toISOString()
        })));
    if (!cached || cached.expiresAt <= Date.now()) {
      calculatedHorizonCache.clear();
      calculatedHorizonCache.set(cacheKey, { expiresAt: Date.now() + 15 * 60_000, horizon });
    }
    const joined = joinSkyReviewRows(horizon, await skyReviewRows());
    const missingDrafts = joined.occurrences.filter((occurrence) => occurrence.reviewStatus === "missing_draft");
    sendAdminJson(res, 200, {
      ok: true,
      horizon: {
        ...joined,
        generationPlan: {
          status: "authorization_required",
          reusableCandidatesMissingDrafts: missingDrafts.length,
          writerCalls: missingDrafts.length,
          reviewerCalls: missingDrafts.length,
          minimumSuccessfulCalls: missingDrafts.length * 2,
          contentKeys: missingDrafts.map((occurrence) => occurrence.contentKey),
          note: "This counts missing generated sign-specific drafts, not reader-facing source gaps. A live run requires a separate bounded call authorization and stop rules."
        }
      },
      governance: {
        modelCalls: 0,
        approvalsChanged: 0,
        servingChanged: 0,
        note: "This is a calculated occurrence inventory joined to reusable review rows. It does not generate, approve, or publish copy."
      }
    });
  } catch (error) {
    sendAdminJson(res, adminErrorStatus(error), {
      ok: false,
      error: adminErrorMessage(error, "Unknown Sky review horizon error.")
    });
  }
}
