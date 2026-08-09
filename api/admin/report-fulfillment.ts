import type { IncomingMessage, ServerResponse } from "node:http";
import { createReportMailProvider } from "../_lib/report-mail.js";
import { reportFulfillmentConfig } from "../_lib/report-fulfillment-config.js";
import { jsonRequestBody, requireInternalRunner, sendJson } from "../_lib/report-http.js";
import { revokeEntitlement } from "../_lib/report-entitlements.js";
import { createSupabaseReportAdmin } from "../_lib/supabase-report-admin.js";

function counts(values: string[]) {
  return Object.fromEntries([...new Set(values)].map((value) => [value, values.filter((candidate) => candidate === value).length]));
}

async function dashboard() {
  const admin = createSupabaseReportAdmin();
  const [entitlements, reports, jobs, audits] = await Promise.all([
    admin.request<Array<Record<string, unknown>>>("report_entitlements?select=*&order=purchased_at.desc&limit=1000"),
    admin.request<Array<Record<string, unknown>>>("user_reports?report_type=eq.report&entitlement_id=not.is.null&select=*&order=created_at.desc&limit=1000"),
    admin.request<Array<Record<string, unknown>>>("report_fulfillment_jobs?select=*&order=created_at.desc&limit=1000"),
    admin.request<Array<Record<string, unknown>>>("report_audit_samples?select=*&order=created_at.desc&limit=1000")
  ]);
  const delivered = reports.filter((report) => report.delivered_at && report.created_at);
  const deliveryMinutes = delivered.map((report) => (Date.parse(String(report.delivered_at)) - Date.parse(String(report.created_at))) / 60_000);
  const judgeScores = reports.flatMap((report) => Array.isArray(report.judge_scores)
    ? report.judge_scores.map((score) => Number((score as { result?: { overall?: unknown } }).result?.overall)).filter(Number.isFinite)
    : []);
  const validatorOutcomes = reports.flatMap((report) => Array.isArray(report.validator_results)
    ? report.validator_results.map((entry) => (entry as { passed?: unknown }).passed === true)
    : []);
  const judgeOutcomes = reports.flatMap((report) => Array.isArray(report.judge_scores)
    ? report.judge_scores.map((entry) => (entry as { result?: { verdict?: unknown } }).result?.verdict === "pass")
    : []);
  const attemptDistribution = counts(reports.flatMap((report) => {
    const attempts = report.attempt_counts && typeof report.attempt_counts === "object"
      ? report.attempt_counts as { validator?: unknown; judge?: unknown }
      : {};
    return [`validator:${Number(attempts.validator ?? 0)}`, `judge:${Number(attempts.judge ?? 0)}`];
  }));
  return {
    metrics: {
      orders: entitlements.length,
      entitlementStatuses: counts(entitlements.map((row) => String(row.status))),
      fulfillmentStatuses: counts(reports.map((row) => String(row.fulfillment_status))),
      jobStates: counts(jobs.map((row) => String(row.state))),
      exceptionDepth: reports.filter((row) => row.fulfillment_status === "exception").length,
      auditDepth: audits.filter((row) => row.status === "pending").length,
      averageDeliveryMinutes: deliveryMinutes.length ? deliveryMinutes.reduce((sum, value) => sum + value, 0) / deliveryMinutes.length : null,
      averageJudgeScore: judgeScores.length ? judgeScores.reduce((sum, value) => sum + value, 0) / judgeScores.length : null,
      judgeScoreDistribution: counts(judgeScores.map((score) => score.toFixed(1))),
      validatorPassRate: validatorOutcomes.length ? validatorOutcomes.filter(Boolean).length / validatorOutcomes.length : null,
      judgePassRate: judgeOutcomes.length ? judgeOutcomes.filter(Boolean).length / judgeOutcomes.length : null,
      attemptDistribution,
      averageTokenCount: reports.length ? reports.reduce((sum, row) => sum + Number(row.token_count ?? 0), 0) / reports.length : 0,
      averageTokenSpendUsd: reports.length ? reports.reduce((sum, row) => sum + Number(row.token_spend_usd ?? 0), 0) / reports.length : 0
    },
    reports,
    jobs,
    audits
  };
}

async function action(body: { action?: string; reportId?: string; entitlementId?: string }) {
  const admin = createSupabaseReportAdmin();
  if (body.action === "pause_worker" || body.action === "resume_worker") {
    await admin.update("report_fulfillment_controls", "id=eq.true", { worker_paused: body.action === "pause_worker" });
    return { ok: true };
  }
  if (!body.reportId) throw new Error("reportId is required.");
  const report = await admin.selectOne<{
    id: string; user_id: string; entitlement_id: string; fulfillment_status: string; report_domain: string; report_horizon: string;
    prompt_versions: Record<string, unknown>;
  }>("user_reports", new URLSearchParams({ id: `eq.${body.reportId}`, select: "id,user_id,entitlement_id,fulfillment_status,report_domain,report_horizon,prompt_versions" }));
  if (!report) throw new Error("Report not found.");
  if (body.action === "rerun") {
    await admin.update("user_generated_interpretations", `subject_id=eq.${report.id}&subject_type=eq.report_unit`, { source_snapshot: { fulfillmentPassed: false } });
    await admin.update("user_reports", `id=eq.${report.id}`, { status: "draft", fulfillment_status: "queued", failure_history: [] });
    await admin.update("report_fulfillment_jobs", `report_id=eq.${report.id}`, { state: "queued", step: "writing", run_after: new Date().toISOString(), last_error: null });
    return { ok: true };
  }
  if (body.action === "mark_refunded") {
    await revokeEntitlement(admin, { reason: "refunded", now: new Date().toISOString(), entitlementId: body.entitlementId ?? report.entitlement_id });
    return { ok: true };
  }
  if (body.action === "release") {
    if (report.fulfillment_status !== "needs_review") throw new Error("Only a gate-passed needs_review report can be released.");
    const deliveredAt = new Date().toISOString();
    await admin.update("user_reports", `id=eq.${report.id}`, { status: "live", fulfillment_status: "live", delivered_at: deliveredAt });
    const config = reportFulfillmentConfig();
    const combinationKey = `${report.report_domain}:${report.report_horizon}:${String(report.prompt_versions.canonical ?? "")}`;
    const samples = await admin.request<Array<{ id: string }>>(`report_audit_samples?select=id&combination_key=eq.${encodeURIComponent(combinationKey)}`);
    const auditReason = samples.length < config.firstCombinationAuditCount
      ? "new_combination"
      : Math.random() < config.auditSampleRate ? "random_sample" : null;
    if (auditReason) {
      await admin.insert("report_audit_samples", {
        report_id: report.id, combination_key: combinationKey, reason: auditReason, prompt_versions: report.prompt_versions
      }, { onConflict: "report_id", ignoreDuplicates: true });
    }
    try {
      const result = await createReportMailProvider().sendReportReady({ reportId: report.id, userId: report.user_id, reportUrl: `${process.env.APP_URL ?? ""}/reports/${report.id}` });
      await admin.insert("report_delivery_events", { report_id: report.id, channel: "email", provider: result.provider, provider_message_id: result.messageId ?? null, status: "sent", sent_at: deliveredAt });
    } catch (error) {
      await admin.insert("report_delivery_events", { report_id: report.id, channel: "email", provider: "unconfigured", status: "failed", error: error instanceof Error ? error.message : "Mail delivery failed." });
    }
    return { ok: true };
  }
  throw new Error("Action must be rerun, mark_refunded, release, pause_worker, or resume_worker.");
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (!requireInternalRunner(req)) return sendJson(res, 401, { error: "Unauthorized." });
  try {
    if (req.method === "GET") return sendJson(res, 200, await dashboard());
    if (req.method === "POST") return sendJson(res, 200, await action(await jsonRequestBody(req)));
    sendJson(res, 405, { error: "Use GET or POST." });
  } catch (error) {
    sendJson(res, 400, { error: error instanceof Error ? error.message : "Report fulfillment admin request failed." });
  }
}
