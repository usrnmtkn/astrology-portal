import type { IncomingMessage, ServerResponse } from "node:http";
import { URL } from "node:url";
import { isContentAdminAuthorized } from "../_lib/admin-auth.js";
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

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json");
  res.end(JSON.stringify(body));
}

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
  const candidate = value && /^\d{4}-\d{2}-\d{2}$/u.test(value)
    ? new Date(`${value}T12:00:00.000Z`)
    : new Date();
  if (Number.isNaN(candidate.getTime())) throw new Error("startDate must be YYYY-MM-DD.");
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
  const params = new URLSearchParams({
    select: "id,content_key,surface,mode,status,event_type,target_date,headline,summary,body,sections,facts,lane,review_state,block_type,provider,model,prompt_version,source_snapshot,judge_score,judge_verdict,judge_gate,judge_why,reviewed_at,published_at,updated_at,created_at",
    surface: "eq.sky",
    block_type: "in.(sky_aspect,sky_placement)",
    limit: "5000"
  });
  const response = await fetch(`${supabaseUrl()}/rest/v1/generated_interpretations?${params}`, {
    headers: adminHeaders()
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`Sky review horizon lookup failed with ${response.status}: ${JSON.stringify(payload)}`);
  return Array.isArray(payload) ? payload : [];
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== "GET") {
    sendJson(res, 405, { error: "Use GET." });
    return;
  }
  if (!isContentAdminAuthorized(req)) {
    sendJson(res, 401, { error: "Unauthorized." });
    return;
  }

  try {
    const requestUrl = new URL(req.url ?? "/api/admin/sky-review-horizon", "http://localhost");
    const days = Number(requestUrl.searchParams.get("days") ?? 91);
    if (!Number.isInteger(days) || days < 1 || days > 92) {
      throw new Error("days must be an integer from 1 through 92.");
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
    sendJson(res, 200, {
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
    sendJson(res, 500, {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown Sky review horizon error."
    });
  }
}
