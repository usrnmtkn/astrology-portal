import { createSupabaseReportAdmin, type SupabaseReportAdmin } from "./supabase-report-admin.js";
import type { ReportDomain, ReportHorizon } from "./report-types.ts";
import { reportUnitDisplayOrder } from "./report-unit-order.ts";

export type FulfillmentJobRow = {
  id: string; report_id: string; entitlement_id: string; state: string; step: string; attempt: number;
  locked_at?: string | null; locked_by?: string | null; lease_expires_at?: string | null;
  authorization_token: string | null; authorized_call_budget: number | null; model_call_count: number;
  authorization_call_count: number; authorized_token_budget: number | null; authorization_token_count: number;
  passing_unit_cache?: Record<string, unknown>;
  validator_attempt_overrides?: Record<string, unknown>;
};
export type FulfillmentReportRow = {
  id: string; user_id: string; subject_id: string | null; report_domain: ReportDomain; report_horizon: ReportHorizon;
  period_start: string; period_end: string; facts: Record<string, unknown>; facts_engine: string; facts_hash: string | null;
  fulfillment_status: string; prompt_versions: Record<string, unknown>; token_count: number; token_count_total?: number;
  token_budget_lifetime?: number;
  token_spend_usd_estimate?: number; attempt_counts: { validator?: number; judge?: number; redundancy?: number };
  failure_history: unknown[];
};
export type FulfillmentEntitlementRow = {
  id: string; user_id: string; status: string; product_key: string; period_start: string; period_end: string; requires_birth_time?: boolean;
};

export type ReportModelCallTimingRow = {
  schema_name: string;
  created_at: string;
  completed_at: string;
};

export type ReportFulfillmentStore = {
  claimJobs(workerId: string, limit: number): Promise<FulfillmentJobRow[]>;
  claimJob(workerId: string, jobId: string): Promise<FulfillmentJobRow[]>;
  workerPaused(): Promise<boolean>;
  report(id: string): Promise<FulfillmentReportRow | null>;
  entitlement(id: string): Promise<FulfillmentEntitlementRow | null>;
  updateReport(id: string, patch: Record<string, unknown>): Promise<void>;
  updateEntitlement(id: string, patch: Record<string, unknown>): Promise<void>;
  updateJob(id: string, patch: Record<string, unknown>): Promise<void>;
  beginAuthorizedCall(jobId: string, authorizationToken: string, attempt: { provider: string; model: string; schemaName: string }): Promise<{ callId: string; callNumber: number }>;
  finishAuthorizedCall(callId: string, result: {
    state: "complete" | "error" | "interrupted"; inputTokens?: number; cachedInputTokens?: number; outputTokens?: number;
    totalTokens?: number; estimatedCostUsd?: number; responseId?: string; error?: string;
  }): Promise<boolean>;
  callTimingHistory(jobId: string): Promise<ReportModelCallTimingRow[]>;
  reusableFacts(report: FulfillmentReportRow): Promise<{ facts: Record<string, unknown>; facts_hash: string; facts_engine: string } | null>;
  claimFacts(report: FulfillmentReportRow, workerId: string): Promise<boolean>;
  releaseFactsClaim(report: FulfillmentReportRow): Promise<void>;
  saveFacts(report: FulfillmentReportRow, bundle: { facts: Record<string, unknown>; facts_hash: string; facts_engine: string }): Promise<void>;
  unit(reportId: string, unitId: string): Promise<{ id: string; headline: string; summary: string; body: string; sections: unknown; source_snapshot: Record<string, unknown> } | null>;
  saveUnit(report: FulfillmentReportRow, unitId: string, draft: unknown, sourceSnapshot: Record<string, unknown>): Promise<void>;
  unitRows(reportId: string): Promise<Array<{ content_key: string; headline: string; summary: string; body: string; sections: unknown; source_snapshot: Record<string, unknown> }>>;
  countCombination(report: FulfillmentReportRow, promptVersions: Record<string, unknown>): Promise<number>;
  queueAudit(report: FulfillmentReportRow, reason: "random_sample" | "new_combination", promptVersions: Record<string, unknown>): Promise<void>;
  recordDelivery(reportId: string, patch: Record<string, unknown>): Promise<void>;
};

async function rpc<T>(admin: SupabaseReportAdmin, name: string, body: Record<string, unknown>) {
  return admin.request<T[]>(`rpc/${name}`, { method: "POST", body: JSON.stringify(body) });
}

export function createReportFulfillmentStore(admin = createSupabaseReportAdmin()): ReportFulfillmentStore {
  const factsWindowKey = (report: FulfillmentReportRow) => [report.user_id, report.subject_id ?? "self", report.report_horizon, report.period_start, report.period_end].join(":");
  const releaseFactsClaim = async (report: FulfillmentReportRow) => {
    await admin.request(`report_facts_claims?window_key=eq.${encodeURIComponent(factsWindowKey(report))}`, { method: "DELETE" });
  };
  return {
    claimJobs: (workerId, limit) => rpc<FulfillmentJobRow>(admin, "claim_report_fulfillment_jobs", { worker_id: workerId, batch_limit: limit }),
    claimJob: (workerId, jobId) => rpc<FulfillmentJobRow>(admin, "claim_report_fulfillment_job", { worker_id: workerId, target_job_id: jobId }),
    async workerPaused() {
      const row = await admin.selectOne<{ worker_paused: boolean }>("report_fulfillment_controls", new URLSearchParams({ id: "eq.true", select: "worker_paused" }));
      return row?.worker_paused === true;
    },
    report: (id) => admin.selectOne("user_reports", new URLSearchParams({ id: `eq.${id}`, select: "*" })),
    entitlement: (id) => admin.selectOne("report_entitlements", new URLSearchParams({ id: `eq.${id}`, select: "*" })),
    async updateReport(id, patch) { await admin.update("user_reports", `id=eq.${id}`, patch); },
    async updateEntitlement(id, patch) { await admin.update("report_entitlements", `id=eq.${id}`, patch); },
    async updateJob(id, patch) { await admin.update("report_fulfillment_jobs", `id=eq.${id}`, patch); },
    async beginAuthorizedCall(jobId, authorizationToken, attempt) {
      return admin.request<{ callId: string; callNumber: number }>("rpc/begin_report_fulfillment_call", {
        method: "POST",
        body: JSON.stringify({
          job_id: jobId, call_authorization_token: authorizationToken,
          call_provider: attempt.provider, call_model: attempt.model, call_schema_name: attempt.schemaName
        })
      });
    },
    async finishAuthorizedCall(callId, result) {
      return admin.request<boolean>("rpc/finish_report_fulfillment_call", {
        method: "POST",
        body: JSON.stringify({
          call_id: callId, call_state: result.state,
          call_input_tokens: result.inputTokens ?? 0, call_cached_input_tokens: result.cachedInputTokens ?? 0,
          call_output_tokens: result.outputTokens ?? 0, call_total_tokens: result.totalTokens ?? 0,
          call_estimated_cost_usd: result.estimatedCostUsd ?? 0,
          call_response_id: result.responseId ?? null, call_error: result.error ?? null
        })
      });
    },
    callTimingHistory: (jobId) => admin.request(`report_model_calls?job_id=eq.${encodeURIComponent(jobId)}&state=eq.complete&completed_at=not.is.null&select=schema_name,created_at,completed_at&order=call_number.asc`),
    reusableFacts: (report) => admin.selectOne("report_facts_bundles", new URLSearchParams({
      user_id: `eq.${report.user_id}`, subject_id: report.subject_id ? `eq.${report.subject_id}` : "is.null",
      report_horizon: `eq.${report.report_horizon}`, period_start: `eq.${report.period_start}`, period_end: `eq.${report.period_end}`,
      select: "facts,facts_hash,facts_engine"
    })),
    async claimFacts(report, workerId) {
      const claimed = await admin.request<boolean>("rpc/claim_report_facts_window", { method: "POST", body: JSON.stringify({
        claim_window_key: factsWindowKey(report), claim_user_id: report.user_id, claim_worker_id: workerId
      }) });
      return claimed === true;
    },
    releaseFactsClaim,
    async saveFacts(report, bundle) {
      await admin.insert("report_facts_bundles", {
        user_id: report.user_id, subject_id: report.subject_id, report_horizon: report.report_horizon,
        period_start: report.period_start, period_end: report.period_end, ...bundle
      }, { onConflict: "user_id,subject_id,report_horizon,period_start,period_end" });
      await releaseFactsClaim(report);
    },
    unit: (reportId, unitId) => admin.selectOne("user_generated_interpretations", new URLSearchParams({
      content_key: `eq.report:${reportId}:${unitId}`, subject_type: "eq.report_unit", select: "id,headline,summary,body,sections,source_snapshot"
    })),
    async saveUnit(report, unitId, draft, sourceSnapshot) {
      const value = draft as { headline?: string; summary?: string; body?: string; timing?: string; sections?: unknown };
      const existingRenderMetadata = sourceSnapshot.renderMetadata && typeof sourceSnapshot.renderMetadata === "object"
        ? sourceSnapshot.renderMetadata as Record<string, unknown>
        : {};
      await admin.insert("user_generated_interpretations", {
        user_id: report.user_id, subject_type: "report_unit", subject_id: report.id,
        content_key: `report:${report.id}:${unitId}`, target_date: report.period_start,
        surface: "year_ahead", mode: "report", status: "DRAFT",
        event_type: "report_unit", headline: value.headline ?? "", summary: value.summary ?? "", body: value.body ?? "",
        display_order: reportUnitDisplayOrder(report.report_domain, report.report_horizon, unitId),
        sections: value.sections ?? [], facts: report.facts,
        source_snapshot: {
          ...sourceSnapshot,
          renderMetadata: { ...existingRenderMetadata, timing: value.timing ?? "" }
        }
      }, { onConflict: "user_id,subject_type,subject_id,content_key,target_date,mode" });
    },
    unitRows: async (reportId) => admin.request(`user_generated_interpretations?subject_id=eq.${reportId}&subject_type=eq.report_unit&select=content_key,headline,summary,body,sections,source_snapshot,display_order&order=display_order.asc`),
    async countCombination(report, promptVersions) {
      const combinationKey = `${report.report_domain}:${report.report_horizon}:${String(promptVersions.canonical ?? "")}`;
      const rows = await admin.request<Array<{ id: string }>>(`report_audit_samples?select=id&combination_key=eq.${encodeURIComponent(combinationKey)}`);
      return rows.length;
    },
    async queueAudit(report, reason, promptVersions) {
      await admin.insert("report_audit_samples", {
        report_id: report.id,
        combination_key: `${report.report_domain}:${report.report_horizon}:${String(promptVersions.canonical ?? "")}`,
        reason,
        prompt_versions: promptVersions
      }, { onConflict: "report_id", ignoreDuplicates: true });
    },
    async recordDelivery(reportId, patch) { await admin.insert("report_delivery_events", { report_id: reportId, channel: "email", ...patch }); }
  };
}
