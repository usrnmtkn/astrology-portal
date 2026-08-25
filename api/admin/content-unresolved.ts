import type { IncomingMessage, ServerResponse } from "node:http";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isContentAdminAuthorized } from "../_lib/admin-auth.js";
import { loadLocalWebEnv } from "../_lib/local-env.js";

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
    order: "updated_at.desc",
    limit: "1000"
  });
  const response = await fetch(`${url}/rest/v1/content_studio_issue_resolutions?${params}`, {
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

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json");
  res.setHeader("cache-control", "private, no-store");
  res.end(JSON.stringify(body));
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== "GET") {
    sendJson(res, 405, { error: "Use GET." });
    return;
  }
  if (!await isContentAdminAuthorized(req)) {
    sendJson(res, 401, { error: "Unauthorized." });
    return;
  }

  try {
    const report = loadContentUnresolvedReport() as { issues: Array<{ issueId: string }> } & Record<string, unknown>;
    const resolutionStore = await recordedResolutions();
    const byIssueId = new Map(resolutionStore.rows.map((row) => [row.issue_id, row]));
    sendJson(res, 200, {
      ok: true,
      report: {
        ...report,
        resolutionStoreReady: resolutionStore.ready,
        issues: report.issues.map((issue) => ({ ...issue, resolution: byIssueId.get(issue.issueId) ?? null }))
      }
    });
  } catch (error) {
    sendJson(res, 500, {
      ok: false,
      error: error instanceof Error ? error.message : "Unable to load unresolved content."
    });
  }
}
