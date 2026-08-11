import type { IncomingMessage, ServerResponse } from "node:http";
import { waitUntil } from "@vercel/functions";
import { reportBillingMode, reportCallEstimate, reportSku } from "../_lib/report-fulfillment-config.js";
import { jsonRequestBody, reportUrl, requireReportAdmin, sendJson } from "../_lib/report-http.js";
import { authorizeReportGeneration, grantCompEntitlement, revokeEntitlement } from "../_lib/report-entitlements.js";
import { releaseReviewedReport } from "../_lib/report-release.js";
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
      averageAcceptedTokenCount: reports.length ? reports.reduce((sum, row) => sum + Number(row.token_count ?? 0), 0) / reports.length : 0,
      averageTotalTokenCount: reports.length ? reports.reduce((sum, row) => sum + Number(row.token_count_total ?? 0), 0) / reports.length : 0,
      averageEstimatedSpendUsd: reports.length ? reports.reduce((sum, row) => sum + Number(row.token_spend_usd_estimate ?? 0), 0) / reports.length : 0
    },
    reports: reportsWithSource,
    jobs,
    audits,
    billingMode: reportBillingMode(),
    users: profiles.map((row) => ({ id: row.user_id, label: profileLabel(row.data, row.user_id) })),
    callEstimates: Object.fromEntries((["1_month", "4_months", "6_months", "12_months"] as ReportHorizon[]).map((horizon) => [horizon, reportCallEstimate(horizon)]))
  };
}

async function action(body: {
  action?: string; reportId?: string; entitlementId?: string; userId?: string;
  reportDomain?: string; reportHorizon?: string; windowStart?: string; callBudget?: number; lifetimeTokenBudget?: number;
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
    const report = await admin.selectOne<{ id: string }>("user_reports", new URLSearchParams({
      entitlement_id: `eq.${result.entitlement.id}`,
      select: "id"
    }));
    return {
      ok: true,
      entitlementId: result.entitlement.id,
      reportId: report?.id ?? null,
      status: result.entitlement.status
    };
  }
  if (!body.reportId) throw new Error("reportId is required.");
  const report = await admin.selectOne<{
    id: string; user_id: string; entitlement_id: string; fulfillment_status: string; report_domain: string; report_horizon: string;
    prompt_versions: Record<string, unknown>;
  }>("user_reports", new URLSearchParams({ id: `eq.${body.reportId}`, select: "id,user_id,entitlement_id,fulfillment_status,report_domain,report_horizon,prompt_versions" }));
  if (!report) throw new Error("Report not found.");
  if (body.action === "set_lifetime_token_budget") {
    if (!Number.isInteger(body.lifetimeTokenBudget) || Number(body.lifetimeTokenBudget) < 1) {
      throw new Error("A positive whole-number lifetime token budget is required.");
    }
    await admin.update("user_reports", `id=eq.${report.id}`, { token_budget_lifetime: Number(body.lifetimeTokenBudget) });
    return { ok: true, lifetimeTokenBudget: Number(body.lifetimeTokenBudget) };
  }
  if (body.action === "rerun") {
    await admin.update("user_generated_interpretations", `subject_id=eq.${report.id}&subject_type=eq.report_unit`, { source_snapshot: { fulfillmentPassed: false } });
    await admin.update("user_reports", `id=eq.${report.id}`, { status: "draft", fulfillment_status: "awaiting_authorization", failure_history: [] });
    await admin.update("report_fulfillment_jobs", `report_id=eq.${report.id}`, {
      state: "paused", step: "writing", last_error: null, authorization_token: null,
      authorized_call_budget: null, authorization_call_count: 0,
      authorized_token_budget: null, authorization_token_count: 0, authorization_consumed_at: null,
      passing_unit_cache: {}, locked_at: null, locked_by: null, lease_expires_at: null
    });
    return { ok: true };
  }
  if (body.action === "authorize_generation") {
    const authorized = await authorizeReportGeneration(admin, {
      reportId: report.id,
      callBudget: Number(body.callBudget),
      now: new Date().toISOString()
    });
    const runnerSecret = process.env.REPORT_FULFILLMENT_SECRET ?? process.env.CRON_SECRET;
    if (!runnerSecret) return { ...authorized, workerTriggered: false, workerTriggerReason: "REPORT_FULFILLMENT_SECRET is not configured." };
    const workerUrl = reportUrl(`/api/cron/run-report-fulfillment?jobId=${encodeURIComponent(authorized.jobId)}`, req);
    waitUntil(fetch(workerUrl, {
      method: "POST",
      headers: { authorization: `Bearer ${runnerSecret}` }
    }).then(async (response) => {
      if (!response.ok) throw new Error(`Immediate report worker returned ${response.status}: ${await response.text()}`);
    }).catch((error) => {
      console.error("Immediate report worker trigger failed; scheduled pickup remains active.", error);
    }));
    return { ...authorized, workerTriggered: true };
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
    return releaseReviewedReport({ admin, report, reportUrl: reportUrl(`/reports/${report.id}`, req) });
  }
  throw new Error("Unknown report fulfillment admin action.");
}

function adminFailure(error: unknown) {
  const message = error instanceof Error ? error.message : "Report fulfillment admin request failed.";
  if (/report_entitlements_active_comp|duplicate key|23505/iu.test(message)) {
    return {
      status: 409,
      body: {
        code: "ACTIVE_COMP_EXISTS",
        error: "An active comp report already exists for this user, report type, and window. Use the existing queue row, or revoke it before granting a replacement."
      }
    };
  }
  return { status: 400, body: { error: message } };
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (!requireReportAdmin(req)) return sendJson(res, 401, { error: "Unauthorized." });
  try {
    if (req.method === "GET") return sendJson(res, 200, await dashboard());
    if (req.method === "POST") return sendJson(res, 200, await action(await jsonRequestBody(req), req));
    sendJson(res, 405, { error: "Use GET or POST." });
  } catch (error) {
    const failure = adminFailure(error);
    sendJson(res, failure.status, failure.body);
  }
}
