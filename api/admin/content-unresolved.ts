import type { IncomingMessage, ServerResponse } from "node:http";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isContentAdminAuthorized } from "../_lib/admin-auth.js";
import { adminErrorMessage, adminErrorStatus, adminFetch, sendAdminJson, sendAdminMethodNotAllowed } from "../_lib/admin-http.js";
import { loadLocalWebEnv } from "../_lib/local-env.js";
import { contentSourceRepairPlan } from "./content-source-repair-plans.js";

loadLocalWebEnv();

const reportPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../packages/astro-knowledge/generated/content-unresolved-queue-v1.json"
);

let cachedReport: unknown = null;

async function recordedResolutions() {
  const url = (process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "").replace(/\/$/u, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!url || !key) return { ready: false, rows: [] as Array<Record<string, unknown>> };
  const params = new URLSearchParams({
    select: "issue_id,result_status,diagnosis,proposed_action,files_involved,pr_url,owner_decision_required,updated_at",
    order: "updated_at.desc,issue_id.asc",
    limit: "1000"
  });
  const response = await adminFetch(`${url}/rest/v1/content_studio_issue_resolutions?${params}`, {
    headers: { apikey: key, authorization: `Bearer ${key}` }
  });
  const rows = await response.json().catch(() => null);
  if (!response.ok) return { ready: false, rows: [] as Array<Record<string, unknown>> };
  return { ready: true, rows: Array.isArray(rows) ? rows as Array<Record<string, unknown>> : [] };
}

async function recordedSourceDecisions() {
  const url = (process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "").replace(/\/$/u, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!url || !key) return { ready: false, rows: [] as Array<Record<string, unknown>> };
  const params = new URLSearchParams({
    select: "decision_id,issue_id,content_key,decision_status,action,candidate_path,candidate_sha256,owner_statement,approved_at",
    order: "approved_at.desc,decision_id.asc",
    limit: "1000"
  });
  const response = await adminFetch(`${url}/rest/v1/content_studio_source_decisions?${params}`, {
    headers: { apikey: key, authorization: `Bearer ${key}` }
  });
  const rows = await response.json().catch(() => null);
  if (!response.ok) return { ready: false, rows: [] as Array<Record<string, unknown>> };
  return { ready: true, rows: Array.isArray(rows) ? rows as Array<Record<string, unknown>> : [] };
}

export function unresolvedContentSurface(contentKey: string) {
  if (contentKey.includes("daily-") || contentKey.startsWith("daily-glance-variant/")) return "Daily Glance";
  if (contentKey.includes("synastry") || contentKey.includes("compat") || contentKey.includes("relationship") || contentKey.includes("bond-")) return "Friends / Relationships";
  if (contentKey.includes("natal") || contentKey.includes("placement")) return "Natal / Placements";
  if (contentKey.includes("lunation") || contentKey.includes("eclipse") || contentKey.includes("moon-phase")) return "Lunations";
  if (contentKey.includes("sky-") || contentKey.includes("transit") || contentKey.includes("timing")) return "Sky / Transits";
  return "Other";
}

export function unresolvedContentIssues(items: Array<Record<string, unknown> & { contentKey: string; reason: string; surface: string }>) {
  const byKey = new Map<string, typeof items>();
  for (const item of items) byKey.set(item.contentKey, [...(byKey.get(item.contentKey) ?? []), item]);
  return [...byKey.values()].map((records) => {
    const contentKey = records[0].contentKey;
    const issueKind = records.some((item) => item.reason === "known-current-contract-failure") ? "source-repair" : "editorial-review";
    const issueId = createHash("sha256").update(JSON.stringify({
      contentKey,
      issueKind,
      records: records.map((record) => ({
        id: record.id,
        objectPath: record.objectPath,
        reason: record.reason,
        sourcePath: record.sourcePath
      })).sort((first, second) => JSON.stringify(first).localeCompare(JSON.stringify(second)))
    })).digest("hex");
    const sources = records.map((record) => `- ${record.reviewStatus}: ${record.sourcePath}${record.objectPath}`).join("\n");
    const sourceRepair = issueKind === "source-repair";
    const request = (task: string) => `Repo: tldrastro. Diagnose this Content Studio issue.\nIssue ID: ${issueId}\nContent key: ${contentKey}\nTask: ${task}\nSource records:\n${sources}\nDo not change serving copy or review_status values without explicit owner approval. Run the relevant governance checks. Return one JSON object using schema content-studio-resolution/v1 with issueId, contentKey, status (diagnosis-only or implemented), diagnosis, proposedAction, filesInvolved, prUrl, and ownerDecisionRequired.`;
    return {
      issueId,
      contentKey,
      surface: records[0].surface,
      kind: issueKind,
      records,
      repairPlan: sourceRepair ? contentSourceRepairPlan(contentKey) : null,
      aiRequest: request(sourceRepair
        ? "Repair the source contract. Approval cannot clear this hold."
        : "Find why no editable Content Library row exists and propose the exact governed import path.")
    };
  });
}

export function loadContentUnresolvedReport() {
  if (!cachedReport) {
    const report = JSON.parse(fs.readFileSync(reportPath, "utf8")) as {
      items: Array<{ contentKey: string }>;
      [key: string]: unknown;
    };
    const items = report.items.map((item) => ({ ...item, surface: unresolvedContentSurface(item.contentKey) }));
    cachedReport = {
      ...report,
      items,
      issues: unresolvedContentIssues(items as Array<Record<string, unknown> & { contentKey: string; reason: string; surface: string }>),
      surfaceCounts: Object.fromEntries([...new Set(items.map((item) => item.surface))].sort()
        .map((surface) => [surface, items.filter((item) => item.surface === surface).length]))
    };
  }
  return cachedReport;
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
    const report = loadContentUnresolvedReport() as { issues: Array<{ issueId: string; contentKey: string }> } & Record<string, unknown>;
    const [resolutionStore, sourceDecisionStore] = await Promise.all([
      recordedResolutions(),
      recordedSourceDecisions()
    ]);
    const byIssueId = new Map(resolutionStore.rows.map((row) => [row.issue_id, row]));
    const sourceDecisionByContentKey = new Map<string, Record<string, unknown>>();
    for (const row of sourceDecisionStore.rows) {
      const contentKey = typeof row.content_key === "string" ? row.content_key : "";
      if (contentKey && !sourceDecisionByContentKey.has(contentKey)) sourceDecisionByContentKey.set(contentKey, row);
    }
    sendAdminJson(res, 200, {
      ok: true,
      report: {
        ...report,
        resolutionStoreReady: resolutionStore.ready,
        sourceDecisionStoreReady: sourceDecisionStore.ready,
        issues: report.issues.map((issue) => ({
          ...issue,
          resolution: byIssueId.get(issue.issueId) ?? null,
          sourceDecision: sourceDecisionByContentKey.get(issue.contentKey) ?? null
        }))
      }
    });
  } catch (error) {
    sendAdminJson(res, adminErrorStatus(error), {
      ok: false,
      error: adminErrorMessage(error, "Unable to load unresolved content.")
    });
  }
}
