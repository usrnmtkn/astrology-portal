import { createSupabaseReportAdmin, type SupabaseReportAdmin } from "./supabase-report-admin.ts";
import type { ReportDomain, ReportHorizon } from "./report-types.ts";

export type FulfillmentJobRow = { id: string; report_id: string; entitlement_id: string; state: string; step: string; attempt: number };
export type FulfillmentReportRow = {
  id: string; user_id: string; subject_id: string | null; report_domain: ReportDomain; report_horizon: ReportHorizon;
  period_start: string; period_end: string; facts: Record<string, unknown>; facts_engine: string; facts_hash: string | null;
  fulfillment_status: string; prompt_versions: Record<string, unknown>; token_count: number; attempt_counts: { validator?: number; judge?: number };
  failure_history: unknown[];
};
export type FulfillmentEntitlementRow = { id: string; user_id: string; status: string; product_key: string; period_start: string; period_end: string };

export type ReportFulfillmentStore = {
  claimJobs(workerId: string, limit: number): Promise<FulfillmentJobRow[]>;
  workerPaused(): Promise<boolean>;
  report(id: string): Promise<FulfillmentReportRow | null>;
  entitlement(id: string): Promise<FulfillmentEntitlementRow | null>;
  updateReport(id: string, patch: Record<string, unknown>): Promise<void>;
  updateJob(id: string, patch: Record<string, unknown>): Promise<void>;
  reusableFacts(report: FulfillmentReportRow): Promise<{ facts: Record<string, unknown>; facts_hash: string; facts_engine: string } | null>;
  claimFacts(report: FulfillmentReportRow, workerId: string): Promise<boolean>;
  releaseFactsClaim(report: FulfillmentReportRow): Promise<void>;
  saveFacts(report: FulfillmentReportRow, bundle: { facts: Record<string, unknown>; facts_hash: string; facts_engine: string }): Promise<void>;
  unit(reportId: string, unitId: string): Promise<{ id: string; body: string; sections: unknown; source_snapshot: Record<string, unknown> } | null>;
  saveUnit(report: FulfillmentReportRow, unitId: string, draft: unknown, sourceSnapshot: Record<string, unknown>): Promise<void>;
  unitRows(reportId: string): Promise<Array<{ content_key: string; body: string; sections: unknown; source_snapshot: Record<string, unknown> }>>;
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
    async workerPaused() {
      const row = await admin.selectOne<{ worker_paused: boolean }>("report_fulfillment_controls", new URLSearchParams({ id: "eq.true", select: "worker_paused" }));
      return row?.worker_paused === true;
    },
    report: (id) => admin.selectOne("user_reports", new URLSearchParams({ id: `eq.${id}`, select: "*" })),
    entitlement: (id) => admin.selectOne("report_entitlements", new URLSearchParams({ id: `eq.${id}`, select: "*" })),
    async updateReport(id, patch) { await admin.update("user_reports", `id=eq.${id}`, patch); },
    async updateJob(id, patch) { await admin.update("report_fulfillment_jobs", `id=eq.${id}`, patch); },
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
      content_key: `eq.report:${reportId}:${unitId}`, subject_type: "eq.report_unit", select: "id,body,sections,source_snapshot"
    })),
    async saveUnit(report, unitId, draft, sourceSnapshot) {
      const value = draft as { headline?: string; summary?: string; body?: string; sections?: unknown };
      await admin.insert("user_generated_interpretations", {
        user_id: report.user_id, subject_type: "report_unit", subject_id: report.id,
        content_key: `report:${report.id}:${unitId}`, surface: "year_ahead", mode: "report", status: "DRAFT",
        event_type: "report_unit", headline: value.headline ?? "", summary: value.summary ?? "", body: value.body ?? "",
        sections: value.sections ?? [], facts: report.facts, source_snapshot: sourceSnapshot
      }, { onConflict: "content_key,target_date,mode" });
    },
    unitRows: async (reportId) => admin.request(`user_generated_interpretations?subject_id=eq.${reportId}&subject_type=eq.report_unit&select=content_key,body,sections,source_snapshot&order=content_key.asc`),
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
