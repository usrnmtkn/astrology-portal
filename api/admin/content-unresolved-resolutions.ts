import type { IncomingMessage, ServerResponse } from "node:http";
import { isContentAdminAuthorized } from "../_lib/admin-auth.js";
import { AdminHttpError, adminErrorMessage, adminErrorStatus, adminFetchJson, adminStorageRows, readAdminJsonBody, sendAdminJson, sendAdminMethodNotAllowed } from "../_lib/admin-http.js";
import { loadLocalWebEnv } from "../_lib/local-env.js";
import { loadContentUnresolvedReport } from "./content-unresolved.js";

loadLocalWebEnv();

export type ContentStudioResolutionInput = {
  schema: "content-studio-resolution/v1";
  expectedUpdatedAt?: string | null;
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

function invalid(message: string): never {
  throw new AdminHttpError(400, message);
}

function boundedString(value: unknown, field: string, limit = 4_000) {
  if (typeof value !== "string" || !value.trim() || value.length > limit) invalid(`${field} is invalid.`);
  return value.trim();
}

export function normalizeContentStudioResolution(value: unknown): ContentStudioResolutionInput {
  if (!value || typeof value !== "object") invalid("Paste the JSON object returned by Codex.");
  const input = value as Record<string, unknown>;
  if (input.schema !== "content-studio-resolution/v1") invalid("Unsupported resolution schema.");
  const issueId = boundedString(input.issueId, "issueId", 64);
  if (!/^[a-f0-9]{64}$/u.test(issueId)) invalid("issueId is invalid.");
  const contentKey = boundedString(input.contentKey, "contentKey", 500);
  if (input.status !== "diagnosis-only" && input.status !== "implemented") invalid("status is invalid.");
  if (!Array.isArray(input.filesInvolved) || input.filesInvolved.length > 50 || input.filesInvolved.some((file) => typeof file !== "string" || !file.trim() || file.length > 500)) {
    invalid("filesInvolved is invalid.");
  }
  if (input.prUrl !== null && (typeof input.prUrl !== "string" || !/^https:\/\/github\.com\/[^/]+\/[^/]+\/pull\/\d+$/u.test(input.prUrl))) {
    invalid("prUrl must be a GitHub pull-request URL or null.");
  }
  if (typeof input.ownerDecisionRequired !== "boolean") invalid("ownerDecisionRequired is invalid.");
  if (input.expectedUpdatedAt != null && (typeof input.expectedUpdatedAt !== "string" || !Number.isFinite(Date.parse(input.expectedUpdatedAt)))) invalid("expectedUpdatedAt is invalid.");
  return {
    expectedUpdatedAt: input.expectedUpdatedAt as string | null | undefined,
    schema: input.schema,
    issueId,
    contentKey,
    status: input.status,
    diagnosis: boundedString(input.diagnosis, "diagnosis"),
    proposedAction: boundedString(input.proposedAction, "proposedAction"),
    filesInvolved: input.filesInvolved.map((file) => file.trim()),
    prUrl: input.prUrl as string | null,
    ownerDecisionRequired: input.ownerDecisionRequired
  };
}

export function assertCurrentResolutionIssue(input: ContentStudioResolutionInput) {
  const report = loadContentUnresolvedReport() as { issues: Array<{ issueId: string; contentKey: string }> };
  const issue = report.issues.find((candidate) => candidate.issueId === input.issueId);
  if (!issue || issue.contentKey !== input.contentKey) invalid("This response does not match a current Content Studio issue.");
}

async function saveResolution(input: ContentStudioResolutionInput) {
  const key = serviceRoleKey();
  const params = new URLSearchParams();
  if (input.expectedUpdatedAt) {
    params.set("issue_id", `eq.${input.issueId}`);
    params.set("updated_at", `eq.${input.expectedUpdatedAt}`);
  }
  const response = await adminFetchJson(`${supabaseUrl()}/rest/v1/content_studio_issue_resolutions?${params}`, {
    method: input.expectedUpdatedAt ? "PATCH" : "POST",
    headers: {
      apikey: key,
      authorization: `Bearer ${key}`,
      "content-type": "application/json",
      prefer: "return=representation"
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
  const rows = response.payload;
  if (response.status === 409) throw new AdminHttpError(409, "A resolution already exists. Reload before saving.");
  if (!response.ok) throw new AdminHttpError(502, `Resolution record save failed with ${response.status}: ${JSON.stringify(rows)}`);
  const confirmed = adminStorageRows(rows);
  if (input.expectedUpdatedAt && confirmed.length === 0) throw new AdminHttpError(409, "This resolution changed after it was opened. Reload before saving.");
  const row = confirmed[0];
  if (confirmed.length !== 1 || row.issue_id !== input.issueId || row.content_key !== input.contentKey || row.result_status !== input.status || row.diagnosis !== input.diagnosis || row.proposed_action !== input.proposedAction) {
    throw new AdminHttpError(502, "Storage did not confirm the resolution. Reload before retrying.");
  }
  return row;
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
    const input = normalizeContentStudioResolution(await readAdminJsonBody<unknown>(req, 32_000));
    assertCurrentResolutionIssue(input);
    sendAdminJson(res, 200, { ok: true, resolution: await saveResolution(input) });
  } catch (error) {
    sendAdminJson(res, adminErrorStatus(error), {
      ok: false,
      error: adminErrorMessage(error, "Unable to record the resolution.")
    });
  }
}
