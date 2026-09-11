import { AdminHttpError, adminErrorStatus, readAdminJsonBody as jsonRequestBody, sendAdminJson as sendJson, adminStorageRows } from "../_lib/admin-http.js";
import type { IncomingMessage, ServerResponse } from "node:http";
import { requireReportAdmin } from "../_lib/report-http.js";
import { createSupabaseReportAdmin } from "../_lib/supabase-report-admin.js";
import type {
  GeneratedReportOwnerFeedbackRow,
  GeneratedReportOwnerFeedbackScope,
  GeneratedTransitReportKind,
  GeneratedTransitReportSurface
} from "../_lib/transit-reading-owner-evidence.js";

type GeneratedReportReviewRow = {
  id: string;
  subject_type: GeneratedTransitReportKind;
  surface: GeneratedTransitReportSurface;
  status: string;
  target_date: string | null;
  headline: string | null;
  summary: string | null;
  body: string;
  source_snapshot: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

type FeedbackActionBody = {
  action?: "save_candidate" | "approve" | "reject";
  reportId?: string;
  feedbackId?: string;
  feedbackText?: string;
  governedEvidenceText?: string;
  evidenceScope?: GeneratedReportOwnerFeedbackScope;
};

const generatedReportKinds: GeneratedTransitReportKind[] = [
  "friend_transit_reading",
  "you_day_reading",
  "you_week_reading"
];
const evidenceScopes = new Set<GeneratedReportOwnerFeedbackScope>([
  "report_kind",
  "surface",
  "all_generated_reports"
]);

function reportSurface(report: Pick<GeneratedReportReviewRow, "subject_type">): GeneratedTransitReportSurface {
  return report.subject_type === "friend_transit_reading" ? "friends" : "you";
}

function safeReport(report: GeneratedReportReviewRow) {
  const gate = report.source_snapshot?.generatedReportQualityGate;
  return {
    id: report.id,
    reportKind: report.subject_type,
    surface: reportSurface(report),
    status: report.status,
    targetDate: report.target_date,
    headline: report.headline,
    summary: report.summary,
    body: report.body,
    qualityGate: gate && typeof gate === "object" && !Array.isArray(gate) ? gate : null,
    createdAt: report.created_at,
    updatedAt: report.updated_at
  };
}

async function reportById(reportId: string) {
  const admin = createSupabaseReportAdmin();
  const report = await admin.selectOne<GeneratedReportReviewRow>(
    "user_generated_interpretations",
    new URLSearchParams({
      id: `eq.${reportId}`,
      subject_type: `in.(${generatedReportKinds.join(",")})`,
      select: "id,subject_type,surface,status,target_date,headline,summary,body,source_snapshot,created_at,updated_at"
    })
  );
  if (!report) throw new Error("Generated report was not found.");
  return report;
}

async function dashboard() {
  const admin = createSupabaseReportAdmin();
  const [reports, feedback] = await Promise.all([
    admin.request<GeneratedReportReviewRow[]>(
      `user_generated_interpretations?subject_type=in.(${generatedReportKinds.join(",")})&select=id,subject_type,surface,status,target_date,headline,summary,body,source_snapshot,created_at,updated_at&order=updated_at.desc&limit=100`
    ),
    admin.request<GeneratedReportOwnerFeedbackRow[]>(
      "generated_report_owner_feedback?select=id,source_generated_interpretation_id,source_surface,source_report_kind,feedback_text,governed_evidence_text,evidence_scope,status,approved_at,approved_by,created_at,updated_at&order=created_at.desc&limit=250"
    )
  ]);
  return { reports: reports.map(safeReport), feedback };
}

async function action(body: FeedbackActionBody) {
  for (const value of [body.reportId, body.feedbackId, body.feedbackText, body.governedEvidenceText]) if (value !== undefined && typeof value !== "string") throw new AdminHttpError(400, "Feedback fields must contain text.");
  const admin = createSupabaseReportAdmin();
  if (body.action === "save_candidate") {
    const feedbackText = body.feedbackText?.trim() ?? "";
    if (!body.reportId || !feedbackText) throw new Error("Report and Draft Review feedback are required.");
    const report = await reportById(body.reportId);
    const surface = reportSurface(report);
    const rows = await admin.insert<GeneratedReportOwnerFeedbackRow>("generated_report_owner_feedback", {
      source_generated_interpretation_id: report.id,
      source_surface: surface,
      source_report_kind: report.subject_type,
      feedback_text: feedbackText,
      governed_evidence_text: null,
      evidence_scope: "report_kind",
      status: "candidate"
    });
    const confirmed = adminStorageRows<GeneratedReportOwnerFeedbackRow>(rows);
    if (confirmed.length !== 1 || !confirmed[0].id) throw new AdminHttpError(502, "Storage did not confirm the feedback. Reload before retrying.");
    return { ok: true, feedback: confirmed[0] };
  }

  if (body.action === "approve") {
    const governedEvidenceText = body.governedEvidenceText?.trim() ?? "";
    const evidenceScope = body.evidenceScope ?? "report_kind";
    if (!body.feedbackId || !governedEvidenceText) {
      throw new Error("Feedback and the governed owner-evidence wording are required for approval.");
    }
    if (!evidenceScopes.has(evidenceScope)) throw new Error("Owner evidence scope is invalid.");
    const existing = await admin.selectOne<GeneratedReportOwnerFeedbackRow>(
      "generated_report_owner_feedback",
      new URLSearchParams({ id: `eq.${body.feedbackId}`, select: "*" })
    );
    if (!existing) throw new Error("Draft Review feedback was not found.");
    if (existing.status !== "candidate") throw new Error("Only candidate feedback can be explicitly approved.");
    const now = new Date().toISOString();
    const rows = await admin.update<GeneratedReportOwnerFeedbackRow>(
      "generated_report_owner_feedback",
      `id=eq.${existing.id}&status=eq.candidate`,
      {
        status: "approved",
        governed_evidence_text: governedEvidenceText,
        evidence_scope: evidenceScope,
        approved_at: now,
        approved_by: "content-owner",
        updated_at: now
      }
    );
    const confirmed = adminStorageRows<GeneratedReportOwnerFeedbackRow>(rows);
    if (!confirmed.length) throw new AdminHttpError(409, "This feedback is no longer a candidate. Reload before reviewing.");
    if (confirmed.length !== 1 || confirmed[0].id !== existing.id || confirmed[0].status !== "approved" || confirmed[0].governed_evidence_text !== governedEvidenceText) throw new AdminHttpError(502, "Storage did not confirm the approved feedback. Reload before retrying.");
    return { ok: true, feedback: confirmed[0] };
  }

  if (body.action === "reject") {
    if (!body.feedbackId) throw new Error("feedbackId is required.");
    const rows = await admin.update<GeneratedReportOwnerFeedbackRow>(
      "generated_report_owner_feedback",
      `id=eq.${body.feedbackId}&status=eq.candidate`,
      { status: "rejected", updated_at: new Date().toISOString() }
    );
    if (!rows[0]) throw new Error("Only candidate feedback can be rejected.");
    return { ok: true, feedback: rows[0] };
  }

  throw new Error("Unsupported generated-report feedback action.");
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (!await requireReportAdmin(req)) {
    sendJson(res, 401, { error: "Unauthorized" });
    return;
  }
  try {
    if (req.method === "GET") {
      sendJson(res, 200, await dashboard());
      return;
    }
    if (req.method === "POST") {
      sendJson(res, 200, await action(await jsonRequestBody<FeedbackActionBody>(req)));
      return;
    }
    sendJson(res, 405, { error: "Method not allowed." });
  } catch (error) {
    sendJson(res, error instanceof AdminHttpError ? adminErrorStatus(error) : 400, { error: error instanceof Error ? error.message : "Generated report feedback request failed." });
  }
}
