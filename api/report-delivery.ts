import type { IncomingMessage, ServerResponse } from "node:http";
import { requireReportUser, sendJson } from "./_lib/report-http.js";
import { createSupabaseReportAdmin } from "./_lib/supabase-report-admin.js";
import { buildReviewedReportDocument, resolveReviewedDeliveryBytes, resolveReviewedDeliveryDocument, reviewedReportDocumentHash, type ReviewedReportDocument } from "./_lib/report-review-document.ts";
import { reportUnitIds } from "./_lib/report-unit-order.ts";
import type { ReportDomain, ReportHorizon } from "./_lib/report-types.ts";

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
      delivered_at: string | null; review_document: ReviewedReportDocument | null; review_document_bytes: string | null; review_document_hash: string | null;
    }>("user_reports", new URLSearchParams({ id: `eq.${reportId}`, user_id: `eq.${user.id}`, select: "*" }));
    if (!report) return sendJson(res, 404, { error: "Report not found." });
    const entitlement = await admin.selectOne<{ status: string }>("report_entitlements", new URLSearchParams({ id: `eq.${report.entitlement_id}`, user_id: `eq.${user.id}`, select: "status" }));
    if (!entitlement || entitlement.status === "revoked" || entitlement.status === "refunded") {
      return sendJson(res, 403, { error: "Report access is not active.", status: "revoked" });
    }
    if (report.status !== "live" || report.fulfillment_status !== "live") {
      return sendJson(res, 202, { reportId, entitlementId: report.entitlement_id, status: report.fulfillment_status, ready: false });
    }
    const rows = await admin.request<Array<{
      content_key: string; headline: string | null; summary: string | null; body: string | null; sections: Array<{ heading?: string; body?: string }> | null;
      source_snapshot: { renderMetadata?: { timing?: unknown } } | null;
      display_order: number | null;
    }>>(`user_generated_interpretations?subject_id=eq.${reportId}&subject_type=eq.report_unit&status=eq.DRAFT&select=content_key,headline,summary,body,sections,source_snapshot,display_order&order=display_order.asc.nullslast`);
    const expectedOrder = reportUnitIds(report.report_domain as ReportDomain, report.report_horizon as ReportHorizon);
    const rowsById = new Map(rows.map((row) => [row.content_key.replace(`report:${reportId}:`, ""), row]));
    const legacyDocument = () => buildReviewedReportDocument({
      id: report.id, reportDomain: report.report_domain, reportHorizon: report.report_horizon,
      periodStart: report.period_start, periodEnd: report.period_end, factsEngine: report.facts_engine,
      factsHash: report.facts_hash, generatedAt: report.delivered_at,
      units: expectedOrder.flatMap((unitId) => {
        const row = rowsById.get(unitId);
        return row ? [{ unitId, draft: { headline: row.headline ?? "", summary: row.summary ?? "", body: row.body ?? "", timing: typeof row.source_snapshot?.renderMetadata?.timing === "string" ? row.source_snapshot.renderMetadata.timing : "", sections: row.sections ?? [] } }] : [];
      })
    });
    const document = report.review_document_bytes && report.review_document_hash
      ? resolveReviewedDeliveryBytes(report.review_document_bytes, report.review_document_hash)
      : report.review_document && report.review_document_hash
      ? resolveReviewedDeliveryDocument(report.review_document, report.review_document_hash)
      : legacyDocument();
    const documentHash = reviewedReportDocumentHash(document);
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
        reviewDocumentHash: report.review_document_hash ?? documentHash,
        legacyReviewArtifact: report.review_document === null,
        document
      }
    });
  } catch (error) {
    sendJson(res, 400, { error: error instanceof Error ? error.message : "Could not load the report." });
  }
}
