import type { IncomingMessage, ServerResponse } from "node:http";
import { isContentAdminAuthorized } from "../_lib/admin-auth.js";
import { loadLocalWebEnv } from "../_lib/local-env.js";
import { loadContentUnresolvedReport } from "./content-unresolved.js";

loadLocalWebEnv();

export type ContentStudioResolutionInput = {
  schema: "content-studio-resolution/v1";
  issueId: string;
  contentKey: string;
  status: "diagnosis-only" | "implemented";
  diagnosis: string;
  proposedAction: string;
  filesInvolved: string[];
  prUrl: string | null;
  ownerDecisionRequired: boolean;
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
    if (size > 32_000) throw new Error("Resolution response is too large.");
    chunks.push(bytes);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
}

function boundedString(value: unknown, field: string, limit = 4_000) {
  if (typeof value !== "string" || !value.trim() || value.length > limit) throw new Error(`${field} is invalid.`);
  return value.trim();
}

export function normalizeContentStudioResolution(value: unknown): ContentStudioResolutionInput {
  if (!value || typeof value !== "object") throw new Error("Paste the JSON object returned by Codex.");
  const input = value as Record<string, unknown>;
  if (input.schema !== "content-studio-resolution/v1") throw new Error("Unsupported resolution schema.");
  const issueId = boundedString(input.issueId, "issueId", 64);
  if (!/^[a-f0-9]{64}$/u.test(issueId)) throw new Error("issueId is invalid.");
  const contentKey = boundedString(input.contentKey, "contentKey", 500);
  if (input.status !== "diagnosis-only" && input.status !== "implemented") throw new Error("status is invalid.");
  if (!Array.isArray(input.filesInvolved) || input.filesInvolved.length > 50 || input.filesInvolved.some((file) => typeof file !== "string" || !file.trim() || file.length > 500)) {
    throw new Error("filesInvolved is invalid.");
  }
  if (input.prUrl !== null && (typeof input.prUrl !== "string" || !/^https:\/\/github\.com\/[^/]+\/[^/]+\/pull\/\d+$/u.test(input.prUrl))) {
    throw new Error("prUrl must be a GitHub pull-request URL or null.");
  }
  if (typeof input.ownerDecisionRequired !== "boolean") throw new Error("ownerDecisionRequired is invalid.");
  return {
    schema: input.schema,
    issueId,
    contentKey,
    status: input.status,
    diagnosis: boundedString(input.diagnosis, "diagnosis"),
    proposedAction: boundedString(input.proposedAction, "proposedAction"),
    filesInvolved: input.filesInvolved.map((file) => file.trim()),
    prUrl: input.prUrl,
    ownerDecisionRequired: input.ownerDecisionRequired
  };
}

export function assertCurrentResolutionIssue(input: ContentStudioResolutionInput) {
  const report = loadContentUnresolvedReport() as { issues: Array<{ issueId: string; contentKey: string }> };
  const issue = report.issues.find((candidate) => candidate.issueId === input.issueId);
  if (!issue || issue.contentKey !== input.contentKey) throw new Error("This response does not match a current Content Studio issue.");
}

async function saveResolution(input: ContentStudioResolutionInput) {
  const key = serviceRoleKey();
  const response = await fetch(`${supabaseUrl()}/rest/v1/content_studio_issue_resolutions?on_conflict=issue_id`, {
    method: "POST",
    headers: {
      apikey: key,
      authorization: `Bearer ${key}`,
      "content-type": "application/json",
      prefer: "resolution=merge-duplicates,return=representation"
    },
    body: JSON.stringify({
      issue_id: input.issueId,
      content_key: input.contentKey,
      result_status: input.status,
      diagnosis: input.diagnosis,
      proposed_action: input.proposedAction,
      files_involved: input.filesInvolved,
      pr_url: input.prUrl,
      owner_decision_required: input.ownerDecisionRequired,
      updated_at: new Date().toISOString()
    })
  });
  const rows = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`Resolution record save failed with ${response.status}: ${JSON.stringify(rows)}`);
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
    const input = normalizeContentStudioResolution(await readJsonBody(req));
    assertCurrentResolutionIssue(input);
    sendJson(res, 200, { ok: true, resolution: await saveResolution(input) });
  } catch (error) {
    sendJson(res, 400, { ok: false, error: error instanceof Error ? error.message : "Unable to record the resolution." });
  }
}
