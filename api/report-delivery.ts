import type { IncomingMessage, ServerResponse } from "node:http";
import { requireReportUser, sendJson } from "./_lib/report-http.js";
import { createSupabaseReportAdmin } from "./_lib/supabase-report-admin.js";

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== "GET") return sendJson(res, 405, { error: "Use GET." });
  try {
    const user = await requireReportUser(req);
    const reportId = new URL(req.url ?? "/api/report-delivery", "http://localhost").searchParams.get("reportId");
    if (!reportId) throw new Error("reportId is required.");
    const admin = createSupabaseReportAdmin();
    const report = await admin.selectOne<{
      id: string; user_id: string; report_domain: string; report_horizon: string; period_start: string; period_end: string;
      status: string; fulfillment_status: string; facts_engine: string; facts_hash: string; entitlement_id: string;
      delivered_at: string | null;
    }>("user_reports", new URLSearchParams({ id: `eq.${reportId}`, user_id: `eq.${user.id}`, select: "*" }));
    if (!report) return sendJson(res, 404, { error: "Report not found." });
    const entitlement = await admin.selectOne<{ status: string }>("report_entitlements", new URLSearchParams({ id: `eq.${report.entitlement_id}`, user_id: `eq.${user.id}`, select: "status" }));
    if (!entitlement || entitlement.status === "revoked" || entitlement.status === "refunded") {
      return sendJson(res, 403, { error: "Report access is not active.", status: "revoked" });
    }
    if (report.status !== "live" || report.fulfillment_status !== "live") {
      return sendJson(res, 202, { reportId, entitlementId: report.entitlement_id, status: report.fulfillment_status, ready: false });
    }
    const units = await admin.request<Array<{
      content_key: string; headline: string | null; summary: string | null; body: string | null; sections: Array<{ heading?: string; body?: string }> | null;
      source_snapshot: { renderMetadata?: { timing?: unknown } } | null;
    }>>(`user_generated_interpretations?subject_id=eq.${reportId}&subject_type=eq.report_unit&status=eq.DRAFT&select=content_key,headline,summary,body,sections,source_snapshot&order=content_key.asc`);
    sendJson(res, 200, {
      ready: true,
      report: {
        id: report.id,
        reportDomain: report.report_domain,
        reportHorizon: report.report_horizon,
        periodStart: report.period_start,
        periodEnd: report.period_end,
        factsEngine: report.facts_engine,
        factsHash: report.facts_hash,
        deliveredAt: report.delivered_at,
        units: units.map(({ source_snapshot, ...unit }) => ({
          ...unit,
          timing: typeof source_snapshot?.renderMetadata?.timing === "string"
            ? source_snapshot.renderMetadata.timing
            : null
        }))
      }
    });
  } catch (error) {
    sendJson(res, 400, { error: error instanceof Error ? error.message : "Could not load the report." });
  }
}
