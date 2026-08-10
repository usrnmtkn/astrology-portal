import { reportFulfillmentConfig } from "./report-fulfillment-config.js";
import { createReportMailProvider, type ReportMailProvider } from "./report-mail.js";
import type { SupabaseReportAdmin } from "./supabase-report-admin.ts";

export type ReleasableReport = {
  id: string;
  user_id: string;
  fulfillment_status: string;
  report_domain: string;
  report_horizon: string;
  prompt_versions: Record<string, unknown>;
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
  await input.admin.update("user_reports", `id=eq.${input.report.id}`, { status: "live", fulfillment_status: "live", delivered_at: deliveredAt });
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
