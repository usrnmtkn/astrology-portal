import { StudioButton, StudioTextarea } from "./StudioControls";
import { AdminSelect } from "./AdminNativeControls";
import { useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { adminCredentialHeaders } from "./adminSecret";

type ReportKind = "friend_transit_reading" | "you_day_reading" | "you_week_reading";
type ReportSurface = "friends" | "you";
type EvidenceScope = "report_kind" | "surface" | "all_generated_reports";
type FeedbackStatus = "candidate" | "approved" | "rejected";

type GeneratedReportReview = {
  id: string;
  reportKind: ReportKind;
  surface: ReportSurface;
  status: string;
  targetDate: string | null;
  headline: string | null;
  summary: string | null;
  body: string;
  qualityGate: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
};

type OwnerFeedback = {
  id: string;
  source_generated_interpretation_id: string;
  source_surface: ReportSurface;
  source_report_kind: ReportKind;
  feedback_text: string;
  governed_evidence_text: string | null;
  evidence_scope: EvidenceScope;
  status: FeedbackStatus;
  approved_at: string | null;
  approved_by: string | null;
  created_at: string;
  updated_at: string;
};

type Dashboard = { reports: GeneratedReportReview[]; feedback: OwnerFeedback[] };
type ApiResponse = Partial<Dashboard> & { error?: string };

function reportKindLabel(kind: ReportKind) {
  if (kind === "friend_transit_reading") return "Friends reading";
  if (kind === "you_day_reading") return "You · Day";
  return "You · Week";
}

function scopeLabel(scope: EvidenceScope, feedback: OwnerFeedback) {
  if (scope === "all_generated_reports") return "All Friends + You generated reports";
  if (scope === "surface") return feedback.source_surface === "friends" ? "All Friends generated reports" : "All You generated reports";
  return reportKindLabel(feedback.source_report_kind);
}

export function GeneratedReportDraftReview({ secret }: { secret: string }) {
  const [dashboard, setDashboard] = useState<Dashboard>({ reports: [], feedback: [] });
  const [selectedReportId, setSelectedReportId] = useState("");
  const [feedbackText, setFeedbackText] = useState("");
  const [evidenceDrafts, setEvidenceDrafts] = useState<Record<string, string>>({});
  const [scopeDrafts, setScopeDrafts] = useState<Record<string, EvidenceScope>>({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function request(init?: RequestInit) {
    const response = await fetch("/api/admin/generated-report-feedback", {
      ...init,
      headers: {
        ...adminCredentialHeaders(secret),
        "content-type": "application/json",
        ...(init?.headers ?? {})
      }
    });
    const payload = await response.json() as ApiResponse;
    if (!response.ok) throw new Error(payload.error ?? `Draft Review request failed with ${response.status}.`);
    return payload;
  }

  async function load() {
    if (!secret) return;
    setLoading(true);
    setError("");
    try {
      const payload = await request();
      const next: Dashboard = { reports: payload.reports ?? [], feedback: payload.feedback ?? [] };
      setDashboard(next);
      setSelectedReportId((current) => current && next.reports.some((report) => report.id === current)
        ? current
        : next.reports[0]?.id ?? "");
      setEvidenceDrafts((current) => ({
        ...Object.fromEntries(next.feedback.map((entry) => [entry.id, current[entry.id] ?? entry.governed_evidence_text ?? entry.feedback_text]))
      }));
      setScopeDrafts((current) => ({
        ...Object.fromEntries(next.feedback.map((entry) => [entry.id, current[entry.id] ?? entry.evidence_scope]))
      }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Draft Review is unavailable.");
    } finally {
      setLoading(false);
    }
  }

  async function action(body: Record<string, unknown>, successMessage: string) {
    setLoading(true);
    setError("");
    setMessage("");
    try {
      await request({ method: "POST", body: JSON.stringify(body) });
      await load();
      setMessage(successMessage);
      return true;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Draft Review action failed.");
      return false;
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [secret]);

  const selected = dashboard.reports.find((report) => report.id === selectedReportId) ?? null;
  const selectedFeedback = useMemo(
    () => dashboard.feedback.filter((entry) => entry.source_generated_interpretation_id === selectedReportId),
    [dashboard.feedback, selectedReportId]
  );

  async function saveCandidate() {
    if (!selected || !feedbackText.trim()) return;
    const saved = await action({
      action: "save_candidate",
      reportId: selected.id,
      feedbackText: feedbackText.trim()
    }, "Feedback saved as a candidate. It is not available to the writer or judge until you explicitly approve it.");
    if (saved) setFeedbackText("");
  }

  return (
    <section className="admin-content-toolbar" aria-label="Generated report Draft Review">
      <div className="admin-field-wide">
        <p className="admin-eyebrow">Friends + You generated reports</p>
        <h2>Draft Review</h2>
        <p>
          Review generated report writing here. Saving feedback creates a candidate only. Candidate and rejected feedback are excluded from future writer and judge calls until you explicitly approve the distilled owner-evidence wording below.
        </p>
        <p><strong>Judge findings are never promoted here automatically.</strong> They can repair only the report that produced them.</p>

        <label>Generated report
          <AdminSelect value={selectedReportId} onChange={(event) => setSelectedReportId(event.target.value)}>
            {dashboard.reports.length === 0 && <option value="">No generated reports yet</option>}
            {dashboard.reports.map((report) => (
              <option key={report.id} value={report.id}>
                {reportKindLabel(report.reportKind)} · {report.targetDate ?? "no date"} · {report.headline ?? "Untitled"}
              </option>
            ))}
          </AdminSelect>
        </label>

        {selected && (
          <>
            <div className="admin-template-rendered-preview" aria-label="Generated report reader preview">
              <article>
                <span>{reportKindLabel(selected.reportKind)} · {selected.targetDate ?? ""}</span>
                <h3>{selected.headline ?? "Untitled report"}</h3>
                {selected.summary && <p>{selected.summary}</p>}
                {selected.body && <p>{selected.body}</p>}
                {selected.qualityGate && (
                  <p><strong>Release gate:</strong> passed · {String(selected.qualityGate.version ?? "generated report judge")} · {String(selected.qualityGate.attempts ?? 1)} judge {Number(selected.qualityGate.attempts ?? 1) === 1 ? "attempt" : "attempts"}</p>
                )}
              </article>
            </div>

            <label>Draft Review feedback
              <StudioTextarea
                value={feedbackText}
                onChange={(event) => setFeedbackText(event.target.value)}
                placeholder="What should change about this writing? This note will remain a candidate until you explicitly approve governed evidence."
              />
            </label>
            <div className="admin-toolbar-actions">
              <StudioButton type="button" disabled={loading || !feedbackText.trim()} onClick={() => void saveCandidate()}>Save feedback candidate</StudioButton>
            </div>

            {selectedFeedback.length > 0 && (
              <div className="admin-field-wide">
                <h3>Feedback decisions</h3>
                {selectedFeedback.map((entry) => (
                  <article className="admin-status-card" key={entry.id}>
                    <span>{entry.status === "candidate" ? "Candidate · not used by writer/judge" : entry.status === "approved" ? "Approved owner evidence" : "Rejected · not used"}</span>
                    <p>{entry.feedback_text}</p>
                    {entry.status === "candidate" && (
                      <>
                        <label>Governed owner-evidence wording
                          <StudioTextarea
                            value={evidenceDrafts[entry.id] ?? entry.feedback_text}
                            onChange={(event) => setEvidenceDrafts((current) => ({ ...current, [entry.id]: event.target.value }))}
                          />
                        </label>
                        <label>Apply this approved evidence to
                          <AdminSelect
                            value={scopeDrafts[entry.id] ?? entry.evidence_scope}
                            onChange={(event) => setScopeDrafts((current) => ({ ...current, [entry.id]: event.target.value as EvidenceScope }))}
                          >
                            <option value="report_kind">This report type only</option>
                            <option value="surface">This surface ({entry.source_surface})</option>
                            <option value="all_generated_reports">All Friends + You generated reports</option>
                          </AdminSelect>
                        </label>
                        <div className="admin-toolbar-actions">
                          <StudioButton
                            type="button"
                            disabled={loading || !(evidenceDrafts[entry.id] ?? entry.feedback_text).trim()}
                            onClick={() => void action({
                              action: "approve",
                              feedbackId: entry.id,
                              governedEvidenceText: (evidenceDrafts[entry.id] ?? entry.feedback_text).trim(),
                              evidenceScope: scopeDrafts[entry.id] ?? entry.evidence_scope
                            }, "Owner feedback explicitly approved. It can now enter future generated-report writer and judge packets within the selected scope.")}
                          >Approve as owner evidence</StudioButton>
                          <StudioButton
                            type="button"
                            disabled={loading}
                            onClick={() => void action({ action: "reject", feedbackId: entry.id }, "Feedback rejected. It will remain excluded from writer and judge packets.")}
                          >Reject</StudioButton>
                        </div>
                      </>
                    )}
                    {entry.status === "approved" && entry.governed_evidence_text && (
                      <p><strong>{scopeLabel(entry.evidence_scope, entry)}:</strong> {entry.governed_evidence_text}</p>
                    )}
                  </article>
                ))}
              </div>
            )}
          </>
        )}
      </div>
      <div className="admin-toolbar-actions">
        <StudioButton type="button" disabled={loading} onClick={() => void load()}><RefreshCw size={16} aria-hidden="true" />Refresh Draft Review</StudioButton>
        {message && <span className="ui-pill admin-status">{message}</span>}
        {error && <span className="ui-pill admin-status" role="alert">{error}</span>}
      </div>
    </section>
  );
}
