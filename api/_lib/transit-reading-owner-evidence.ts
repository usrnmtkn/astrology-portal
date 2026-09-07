import { createSupabaseReportAdmin, type SupabaseReportAdmin } from "./supabase-report-admin.js";

export type GeneratedTransitReportKind = "friend_transit_reading" | "you_day_reading" | "you_week_reading";
export type GeneratedTransitReportSurface = "friends" | "you";
export type GeneratedReportOwnerFeedbackStatus = "candidate" | "approved" | "rejected";
export type GeneratedReportOwnerFeedbackScope = "report_kind" | "surface" | "all_generated_reports";

export type GeneratedReportOwnerFeedbackRow = {
  id: string;
  source_generated_interpretation_id: string;
  source_surface: GeneratedTransitReportSurface;
  source_report_kind: GeneratedTransitReportKind;
  feedback_text: string;
  governed_evidence_text: string | null;
  evidence_scope: GeneratedReportOwnerFeedbackScope;
  status: GeneratedReportOwnerFeedbackStatus;
  approved_at: string | null;
  approved_by: string | null;
  created_at: string;
  updated_at: string;
};

function adminClient(admin?: SupabaseReportAdmin) {
  return admin ?? createSupabaseReportAdmin();
}

export function ownerFeedbackApplies(
  row: Pick<GeneratedReportOwnerFeedbackRow, "status" | "source_surface" | "source_report_kind" | "evidence_scope" | "governed_evidence_text">,
  input: { surface: GeneratedTransitReportSurface; reportKind: GeneratedTransitReportKind }
) {
  if (row.status !== "approved" || !row.governed_evidence_text?.trim()) return false;
  if (row.evidence_scope === "all_generated_reports") return true;
  if (row.evidence_scope === "surface") return row.source_surface === input.surface;
  return row.source_surface === input.surface && row.source_report_kind === input.reportKind;
}

export function eligibleGeneratedReportOwnerEvidence(
  rows: GeneratedReportOwnerFeedbackRow[],
  input: { surface: GeneratedTransitReportSurface; reportKind: GeneratedTransitReportKind }
) {
  const seen = new Set<string>();
  return rows.flatMap((row) => {
    if (!ownerFeedbackApplies(row, input)) return [];
    const text = row.governed_evidence_text?.trim() ?? "";
    if (!text || seen.has(text)) return [];
    seen.add(text);
    return [text];
  });
}

export async function loadApprovedGeneratedReportOwnerEvidence(input: {
  surface: GeneratedTransitReportSurface;
  reportKind: GeneratedTransitReportKind;
  admin?: SupabaseReportAdmin;
}) {
  const admin = adminClient(input.admin);
  const params = new URLSearchParams({
    status: "eq.approved",
    select: "id,source_generated_interpretation_id,source_surface,source_report_kind,feedback_text,governed_evidence_text,evidence_scope,status,approved_at,approved_by,created_at,updated_at",
    order: "approved_at.desc",
    limit: "50"
  });
  const rows = await admin.request<GeneratedReportOwnerFeedbackRow[]>(`generated_report_owner_feedback?${params}`);
  return eligibleGeneratedReportOwnerEvidence(rows, input);
}
