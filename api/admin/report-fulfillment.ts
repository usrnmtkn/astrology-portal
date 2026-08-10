import type { IncomingMessage, ServerResponse } from "node:http";
import { createReportMailProvider } from "../_lib/report-mail.js";
import { reportCallEstimate, reportFulfillmentConfig, reportSku } from "../_lib/report-fulfillment-config.js";
import { jsonRequestBody, reportUrl, requireReportAdmin, sendJson } from "../_lib/report-http.js";
import { authorizeReportGeneration, grantCompEntitlement, revokeEntitlement } from "../_lib/report-entitlements.js";
import { createSupabaseReportAdmin } from "../_lib/supabase-report-admin.js";
import type { ReportHorizon } from "../_lib/report-types.js";

function counts(values: string[]) {
  return Object.fromEntries([...new Set(values)].map((value) => [value, values.filter((candidate) => candidate === value).length]));
}

function profileLabel(data: unknown, userId: string) {
  if (!data || typeof data !== "object") return userId;
  const root = data as Record<string, unknown>;
  const profile = root.profile && typeof root.profile === "object" ? root.profile as Record<string, unknown> : root;
  const charts = Array.isArray(profile.charts) ? profile.charts : [];
  const chart = charts[0] && typeof charts[0] === "object" ? charts[0] as Record<string, unknown> : null;
  const name = typeof profile.name === "string" ? profile.name : typeof chart?.name === "string" ? chart.name : "";
  return name.trim() ? `${name.trim()} · ${userId}` : userId;
}

async function dashboard() {
  const admin = createSupabaseReportAdmin();
  const [entitlements, reports, jobs, audits, profiles] = await Promise.all([
    admin.request<Array<Record<string, unknown>>>("report_entitlements?select=*&order=purchased_at.desc&limit=1000"),
    admin.request<Array<Record<string, unknown>>>("user_reports?report_type=eq.report&entitlement_id=not.is.null&select=*&order=created_at.desc&limit=1000"),
    admin.request<Array<Record<string, unknown>>>("report_fulfillment_jobs?select=*&order=created_at.desc&limit=1000"),
    admin.request<Array<Record<string, unknown>>>("report_audit_samples?select=*&order=created_at.desc&limit=1000"),
    admin.request<Array<{ user_id: string; data: unknown }>>("user_profiles?select=user_id,data&order=updated_at.desc&limit=1000")
  ]);
  const entitlementSources = new Map(entitlements.map((row) => [String(row.id), String(row.source ?? "stripe")]));
  const reportsWithSource = reports.map((report) => ({
    ...report,
    entitlement_source: entitlementSources.get(String(report.entitlement_id)) ?? "stripe"
  }));
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
    reports: reportsWithSource,
    jobs,
    audits,
    users: profiles.map((row) => ({ id: row.user_id, label: profileLabel(row.data, row.user_id) })),
    callEstimates: Object.fromEntries((["1_month", "4_months", "6_months", "12_months"] as ReportHorizon[]).map((horizon) => [horizon, reportCallEstimate(horizon)]))
  };
}

async function action(body: {
  action?: string; reportId?: string; entitlementId?: string; userId?: string;
  reportDomain?: string; reportHorizon?: string; windowStart?: string; callBudget?: number;
}, req: IncomingMessage) {
  const admin = createSupabaseReportAdmin();
  if (body.action === "pause_worker" || body.action === "resume_worker") {
    await admin.update("report_fulfillment_controls", "id=eq.true", { worker_paused: body.action === "pause_worker" });
    return { ok: true };
  }
  if (body.action === "grant_comp") {
    const sku = reportSku(`${body.reportDomain ?? ""}_${body.reportHorizon ?? ""}`);
    if (!body.userId || !sku || !body.windowStart) throw new Error("User, report domain, horizon, and window start are required.");
    const result = await grantCompEntitlement(admin, {
      userId: body.userId,
      reportDomain: sku.reportDomain,
      reportHorizon: sku.reportHorizon,
      windowStart: body.windowStart,
      now: new Date().toISOString()
    });
    return { ok: true, entitlementId: result.entitlement.id, status: result.entitlement.status };
  }
  if (!body.reportId) throw new Error("reportId is required.");
  const report = await admin.selectOne<{
    id: string; user_id: string; entitlement_id: string; fulfillment_status: string; report_domain: string; report_horizon: string;
    prompt_versions: Record<string, unknown>;
  }>("user_reports", new URLSearchParams({ id: `eq.${body.reportId}`, select: "id,user_id,entitlement_id,fulfillment_status,report_domain,report_horizon,prompt_versions" }));
  if (!report) throw new Error("Report not found.");
  if (body.action === "rerun") {
    await admin.update("user_generated_interpretations", `subject_id=eq.${report.id}&subject_type=eq.report_unit`, { source_snapshot: { fulfillmentPassed: false } });
    await admin.update("user_reports", `id=eq.${report.id}`, { status: "draft", fulfillment_status: "awaiting_authorization", failure_history: [] });
    await admin.update("report_fulfillment_jobs", `report_id=eq.${report.id}`, {
      state: "paused", step: "writing", last_error: null, authorization_token: null,
      authorized_call_budget: null, model_call_count: 0, authorization_consumed_at: null
    });
    return { ok: true };
  }
  if (body.action === "authorize_generation") {
    return authorizeReportGeneration(admin, {
      reportId: report.id,
      callBudget: Number(body.callBudget),
      now: new Date().toISOString()
    });
  }
  if (body.action === "revoke_comp") {
    const entitlement = await admin.selectOne<{ source: string }>("report_entitlements", new URLSearchParams({ id: `eq.${report.entitlement_id}`, select: "source" }));
    if (entitlement?.source !== "comp") throw new Error("Only comp entitlements can use revoke comp.");
    await revokeEntitlement(admin, { reason: "revoked", now: new Date().toISOString(), entitlementId: report.entitlement_id });
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
      const result = await createReportMailProvider().sendReportReady({ reportId: report.id, userId: report.user_id, reportUrl: reportUrl(`/reports/${report.id}`, req) });
      await admin.insert("report_delivery_events", {
        report_id: report.id, channel: "email", provider: result.provider, provider_message_id: result.messageId ?? null,
        status: result.mode === "sent" ? "sent" : "queued", payload: result.payload,
        ...(result.mode === "sent" ? { sent_at: deliveredAt } : {})
      });
    } catch (error) {
      await admin.insert("report_delivery_events", { report_id: report.id, channel: "email", provider: "unconfigured", status: "failed", error: error instanceof Error ? error.message : "Mail delivery failed." });
    }
    return { ok: true };
  }
  throw new Error("Unknown report fulfillment admin action.");
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (!requireReportAdmin(req)) return sendJson(res, 401, { error: "Unauthorized." });
  try {
    if (req.method === "GET") return sendJson(res, 200, await dashboard());
    if (req.method === "POST") return sendJson(res, 200, await action(await jsonRequestBody(req), req));
    sendJson(res, 405, { error: "Use GET or POST." });
  } catch (error) {
    sendJson(res, 400, { error: error instanceof Error ? error.message : "Report fulfillment admin request failed." });
  }
}
