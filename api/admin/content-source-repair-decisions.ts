import crypto from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import { isContentAdminAuthorized } from "../_lib/admin-auth.js";
import { loadLocalWebEnv } from "../_lib/local-env.js";
import { loadContentUnresolvedReport } from "./content-unresolved.js";
import { contentSourceRepairPlan } from "./content-source-repair-plans.js";

loadLocalWebEnv();

export type ContentStudioSourceDecisionInput = {
  schema: "content-studio-source-decision/v1";
  issueId: string;
  contentKey: string;
  action: "approve-replacement";
  candidateSha256: string;
  approvalStatement: string;
  confirmExactText: true;
};

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
  res.setHeader("cache-control", "private, no-store");
  res.end(JSON.stringify(body));
}

async function readJsonBody(req: IncomingMessage) {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += bytes.length;
    if (size > 32_000) throw new Error("Source decision is too large.");
    chunks.push(bytes);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
}

function boundedString(value: unknown, field: string, limit: number) {
  if (typeof value !== "string" || !value.trim() || value.length > limit) {
    throw new Error(`${field} is invalid.`);
  }
  return value.trim();
}

export function normalizeContentStudioSourceDecision(value: unknown): ContentStudioSourceDecisionInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Source decision must be an object.");
  }
  const input = value as Record<string, unknown>;
  if (input.schema !== "content-studio-source-decision/v1") throw new Error("Unsupported source-decision schema.");
  if (input.action !== "approve-replacement") throw new Error("Unsupported source-decision action.");
  if (input.confirmExactText !== true) throw new Error("Exact-text confirmation is required.");
  const issueId = boundedString(input.issueId, "issueId", 64);
  const candidateSha256 = boundedString(input.candidateSha256, "candidateSha256", 64);
  if (!/^[a-f0-9]{64}$/u.test(issueId)) throw new Error("issueId is invalid.");
  if (!/^[a-f0-9]{64}$/u.test(candidateSha256)) throw new Error("candidateSha256 is invalid.");
  return {
    schema: input.schema,
    issueId,
    contentKey: boundedString(input.contentKey, "contentKey", 500),
    action: input.action,
    candidateSha256,
    approvalStatement: boundedString(input.approvalStatement, "approvalStatement", 2_000),
    confirmExactText: true
  };
}

export function assertCurrentSourceDecision(input: ContentStudioSourceDecisionInput) {
  const report = loadContentUnresolvedReport() as {
    issues: Array<{ issueId: string; contentKey: string; kind: string }>;
  };
  const issue = report.issues.find((candidate) => candidate.issueId === input.issueId);
  if (!issue || issue.contentKey !== input.contentKey || issue.kind !== "source-repair") {
    throw new Error("This decision does not match a current source-repair issue.");
  }
  const plan = contentSourceRepairPlan(input.contentKey);
  if (!plan) throw new Error("This source-repair issue has no governed replacement plan.");
  if (input.candidateSha256 !== plan.candidateSha256) {
    throw new Error("The replacement changed after it was opened. Refresh and review the current exact text.");
  }
  if (input.approvalStatement !== plan.approvalStatement) {
    throw new Error("The owner approval statement does not match the governed replacement plan.");
  }
  return plan;
}

function decisionId(input: ContentStudioSourceDecisionInput) {
  return crypto.createHash("sha256")
    .update(`${input.contentKey}\u0000${input.candidateSha256}\u0000${input.action}`)
    .digest("hex");
}

async function existingDecision(id: string) {
  const key = serviceRoleKey();
  const params = new URLSearchParams({ select: "*", decision_id: `eq.${id}`, limit: "1" });
  const response = await fetch(`${supabaseUrl()}/rest/v1/content_studio_source_decisions?${params}`, {
    headers: { apikey: key, authorization: `Bearer ${key}` }
  });
  const rows = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`Source decision lookup failed with ${response.status}: ${JSON.stringify(rows)}`);
  return Array.isArray(rows) ? rows[0] ?? null : null;
}

async function saveDecision(input: ContentStudioSourceDecisionInput, plan: ReturnType<typeof contentSourceRepairPlan>) {
  if (!plan) throw new Error("Source-repair plan is unavailable.");
  const id = decisionId(input);
  const key = serviceRoleKey();
  const approvedAt = new Date().toISOString();
  const response = await fetch(`${supabaseUrl()}/rest/v1/content_studio_source_decisions`, {
    method: "POST",
    headers: {
      apikey: key,
      authorization: `Bearer ${key}`,
      "content-type": "application/json",
      prefer: "return=representation"
    },
    body: JSON.stringify({
      decision_id: id,
      issue_id: input.issueId,
      content_key: input.contentKey,
      decision_status: "approved-for-implementation",
      action: input.action,
      candidate_path: plan.candidatePath,
      candidate_sha256: input.candidateSha256,
      candidate_payload: { article: plan.article, body: plan.body },
      owner_statement: input.approvalStatement,
      approved_at: approvedAt
    })
  });
  const rows = await response.json().catch(() => null);
  if (response.status === 409) return existingDecision(id);
  if (!response.ok) throw new Error(`Source decision save failed with ${response.status}: ${JSON.stringify(rows)}`);
  return Array.isArray(rows) ? rows[0] : rows;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (!await isContentAdminAuthorized(req)) {
    sendJson(res, 401, { ok: false, error: "Unauthorized." });
    return;
  }
  if (req.method !== "POST") {
    sendJson(res, 405, { ok: false, error: "Use POST." });
    return;
  }
  try {
    const input = normalizeContentStudioSourceDecision(await readJsonBody(req));
    const plan = assertCurrentSourceDecision(input);
    sendJson(res, 200, { ok: true, decision: await saveDecision(input, plan) });
  } catch (error) {
    sendJson(res, 400, { ok: false, error: error instanceof Error ? error.message : "Unable to record source decision." });
  }
}
