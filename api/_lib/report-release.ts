import { reportFulfillmentConfig } from "./report-fulfillment-config.js";
import { createReportMailProvider, type ReportMailProvider } from "./report-mail.js";
import type { SupabaseReportAdmin } from "./supabase-report-admin.ts";
import { buildReviewedReportDocument, resolveReviewedDeliveryBytes, reviewedReportDocumentBytes, reviewedReportDocumentHash, type ReviewedReportDocument } from "./report-review-document.ts";
import { reportUnitIds } from "./report-unit-order.ts";
import type { ReportDomain, ReportHorizon } from "./report-types.ts";

export type ReleasableReport = {
  id: string;
  user_id: string;
  fulfillment_status: string;
  report_domain: string;
  report_horizon: string;
  prompt_versions: Record<string, unknown>;
  period_start: string;
  period_end: string;
  facts_engine: string;
  facts_hash: string;
  review_document_bytes?: string | null;
  review_document_hash?: string | null;
};

export async function releaseReviewedReport(input: {
  admin: SupabaseReportAdmin;
  report: ReleasableReport;
  reportUrl: string;
  mail?: ReportMailProvider;
  random?: () => number;
}) {
  if (input.report.fulfillment_status !== "needs_review") throw new Error("Only a gate-passed needs_review report can be released.");
  const deliveredAt = new Date().toISOString();
  const rows = await input.admin.request<Array<{ content_key: string; headline: string; summary: string; body: string; sections: Array<{ heading?: string; body?: string }> | null; source_snapshot: { renderMetadata?: { timing?: unknown } } | null }>>(
    `user_generated_interpretations?subject_id=eq.${input.report.id}&subject_type=eq.report_unit&status=eq.DRAFT&select=content_key,headline,summary,body,sections,source_snapshot,display_order&order=display_order.asc.nullslast`
  );
  const byId = new Map(rows.map((row) => [row.content_key.replace(`report:${input.report.id}:`, ""), row]));
  const units = reportUnitIds(input.report.report_domain as ReportDomain, input.report.report_horizon as ReportHorizon).map((unitId) => {
    const row = byId.get(unitId);
    if (!row) throw new Error(`REPORT_RELEASE_REVIEW_ARTIFACT_INCOMPLETE: missing ${unitId}.`);
    return { unitId, draft: { headline: row.headline, summary: row.summary, body: row.body, timing: typeof row.source_snapshot?.renderMetadata?.timing === "string" ? row.source_snapshot.renderMetadata.timing : "", sections: row.sections ?? [] } };
  });
  const reviewDocument = input.report.review_document_bytes && input.report.review_document_hash
    ? resolveReviewedDeliveryBytes(input.report.review_document_bytes, input.report.review_document_hash)
    : buildReviewedReportDocument({
    id: input.report.id, reportDomain: input.report.report_domain, reportHorizon: input.report.report_horizon,
    periodStart: input.report.period_start, periodEnd: input.report.period_end, factsEngine: input.report.facts_engine,
    factsHash: input.report.facts_hash, units
    }) as ReviewedReportDocument;
  await input.admin.update("user_reports", `id=eq.${input.report.id}`, {
    status: "live", fulfillment_status: "live", delivered_at: deliveredAt,
    review_document: reviewDocument, review_document_bytes: reviewedReportDocumentBytes(reviewDocument),
    review_document_hash: reviewedReportDocumentHash(reviewDocument)
  });
  const config = reportFulfillmentConfig();
  const combinationKey = `${input.report.report_domain}:${input.report.report_horizon}:${String(input.report.prompt_versions.canonical ?? "")}`;
  const samples = await input.admin.request<Array<{ id: string }>>(`report_audit_samples?select=id&combination_key=eq.${encodeURIComponent(combinationKey)}`);
  const auditReason = samples.length < config.firstCombinationAuditCount
    ? "new_combination"
    : (input.random ?? Math.random)() < config.auditSampleRate ? "random_sample" : null;
  if (auditReason) {
    await input.admin.insert("report_audit_samples", {
      report_id: input.report.id, combination_key: combinationKey, reason: auditReason, prompt_versions: input.report.prompt_versions
    }, { onConflict: "report_id", ignoreDuplicates: true });
  }
  try {
    const result = await (input.mail ?? createReportMailProvider()).sendReportReady({
      reportId: input.report.id, userId: input.report.user_id, reportUrl: input.reportUrl
    });
    await input.admin.insert("report_delivery_events", {
      report_id: input.report.id, channel: "email", provider: result.provider, provider_message_id: result.messageId ?? null,
      status: result.mode === "sent" ? "sent" : "queued", payload: result.payload,
      ...(result.mode === "sent" ? { sent_at: deliveredAt } : {})
    });
    return { ok: true, deliveryMode: result.mode };
  } catch (error) {
    await input.admin.insert("report_delivery_events", {
      report_id: input.report.id, channel: "email", provider: "unconfigured", status: "failed",
      error: error instanceof Error ? error.message : "Mail delivery failed."
    });
    return { ok: true, deliveryMode: "failed" as const };
  }
}
