import { createSupabaseReportAdmin, type SupabaseReportAdmin } from "./supabase-report-admin.js";
import {
  eligibleGeneratedReportOwnerEvidence,
  type GeneratedReportOwnerFeedbackRow,
  type GeneratedTransitReportKind,
  type GeneratedTransitReportSurface
} from "./transit-reading-owner-evidence-rules.js";

export {
  eligibleGeneratedReportOwnerEvidence,
  ownerFeedbackApplies
} from "./transit-reading-owner-evidence-rules.js";
export type {
  GeneratedReportOwnerFeedbackRow,
  GeneratedReportOwnerFeedbackScope,
  GeneratedReportOwnerFeedbackStatus,
  GeneratedTransitReportKind,
  GeneratedTransitReportSurface
} from "./transit-reading-owner-evidence-rules.js";

function adminClient(admin?: SupabaseReportAdmin) {
  return admin ?? createSupabaseReportAdmin();
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
