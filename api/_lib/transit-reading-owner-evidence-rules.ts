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
