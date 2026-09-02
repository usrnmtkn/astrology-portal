import crypto from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import { isContentAdminAuthorized } from "../_lib/admin-auth.js";
import { AdminHttpError, adminErrorMessage, adminErrorStatus, adminFetch, readAdminJsonBody, sendAdminJson, sendAdminMethodNotAllowed } from "../_lib/admin-http.js";
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

function invalid(message: string): never {
  throw new AdminHttpError(400, message);
}

function boundedString(value: unknown, field: string, limit: number) {
  if (typeof value !== "string" || !value.trim() || value.length > limit) invalid(`${field} is invalid.`);
  return value.trim();
}

export function normalizeContentStudioSourceDecision(value: unknown): ContentStudioSourceDecisionInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) invalid("Source decision must be an object.");
  const input = value as Record<string, unknown>;
  if (input.schema !== "content-studio-source-decision/v1") invalid("Unsupported source-decision schema.");
  if (input.action !== "approve-replacement") invalid("Unsupported source-decision action.");
  if (input.confirmExactText !== true) invalid("Exact-text confirmation is required.");
  const issueId = boundedString(input.issueId, "issueId", 64);
  const candidateSha256 = boundedString(input.candidateSha256, "candidateSha256", 64);
  if (!/^[a-f0-9]{64}$/u.test(issueId)) invalid("issueId is invalid.");
  if (!/^[a-f0-9]{64}$/u.test(candidateSha256)) invalid("candidateSha256 is invalid.");
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
    invalid("This decision does not match a current source-repair issue.");
  }
  const plan = contentSourceRepairPlan(input.contentKey);
  if (!plan) invalid("This source-repair issue has no governed replacement plan.");
  if (input.candidateSha256 !== plan.candidateSha256) {
    throw new AdminHttpError(409, "The replacement changed after it was opened. Refresh and review the current exact text.");
  }
  if (input.approvalStatement !== plan.approvalStatement) invalid("The owner approval statement does not match the governed replacement plan.");
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
  const response = await adminFetch(`${supabaseUrl()}/rest/v1/content_studio_source_decisions?${params}`, {
    headers: { apikey: key, authorization: `Bearer ${key}` }
  });
  const rows = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`Source decision lookup failed with ${response.status}: ${JSON.stringify(rows)}`);
  return Array.isArray(rows) ? rows[0] ?? null : null;
}

async function saveDecision(input: ContentStudioSourceDecisionInput, plan: ReturnType<typeof contentSourceRepairPlan>) {
  if (!plan) throw new AdminHttpError(400, "Source-repair plan is unavailable.");
  const id = decisionId(input);
  const key = serviceRoleKey();
  const approvedAt = new Date().toISOString();
  const response = await adminFetch(`${supabaseUrl()}/rest/v1/content_studio_source_decisions`, {
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
    sendAdminJson(res, 401, { ok: false, error: "Unauthorized." });
    return;
  }
  if (req.method !== "POST") {
    sendAdminMethodNotAllowed(res, ["POST"]);
    return;
  }
  try {
    const input = normalizeContentStudioSourceDecision(await readAdminJsonBody<unknown>(req, 32_000));
    const plan = assertCurrentSourceDecision(input);
    sendAdminJson(res, 200, { ok: true, decision: await saveDecision(input, plan) });
  } catch (error) {
    sendAdminJson(res, adminErrorStatus(error), {
      ok: false,
      error: adminErrorMessage(error, "Unable to record source decision.")
    });
  }
}
