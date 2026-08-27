import { useEffect, useState } from "react";
import { adminCredentialHeaders } from "./adminSecret";

export type UnresolvedContentItem = {
  id: string;
  contentKey: string;
  reviewStatus: string;
  reason: string;
  sourcePath: string;
  objectPath: string;
  surface: string;
};

export type UnresolvedContentReport = {
  schema: string;
  generatedFrom: string;
  count: number;
  reasonCounts: Record<string, number>;
  surfaceCounts: Record<string, number>;
  sourceDecisionStoreReady?: boolean;
  items: UnresolvedContentItem[];
  issues: UnresolvedContentIssue[];
};

type UnresolvedContentReviewProps = {
  credential: string;
  contentLibraryReady: boolean;
  editableContentKeys: ReadonlySet<string>;
  onFindInContentLibrary: (contentKey: string) => void;
};

export type UnresolvedContentIssue = {
  issueId: string;
  contentKey: string;
  surface: string;
  kind: "source-repair" | "editorial-review";
  records: UnresolvedContentItem[];
  aiRequest: string;
  repairPlan?: ContentSourceRepairPlan | null;
  sourceDecision?: ContentSourceDecision | null;
  resolution?: {
    diagnosis: string;
  } | null;
};

type ContentSourceRepairPlan = {
  schema: "content-studio-source-repair-plan/v1";
  contentKey: string;
  title: string;
  candidatePath: string;
  candidateSha256: string;
  reviewStatus: "needs_review";
  approvalStatement: string;
  article: {
    opening: string;
    tension: string;
    development: string;
    close: string;
  };
  body: string;
};

type ContentSourceDecision = {
  decision_id: string;
  issue_id: string;
  content_key: string;
  decision_status: "approved-for-implementation";
  candidate_path: string;
  candidate_sha256: string;
  owner_statement: string;
  approved_at: string;
};

async function recordResolution(credential: string) {
  const body = prompt("Paste the JSON returned by Codex.");
  if (!body) return;
  const response = await fetch("/api/admin/content-unresolved-resolutions", { method: "POST", headers: { "content-type": "application/json", ...adminCredentialHeaders(credential) }, body });
  response.ok ? location.reload() : alert("Could not record response.");
}

function sourceImplementationRequest(issue: UnresolvedContentIssue) {
  const plan = issue.repairPlan;
  const decision = issue.sourceDecision;
  if (!plan || !decision) return issue.aiRequest;
  return `Repo: tldrastro. Implement the owner-approved Content Studio source repair.\nIssue ID: ${issue.issueId}\nContent key: ${issue.contentKey}\nApproved replacement: ${plan.candidatePath}\nCandidate SHA-256: ${decision.candidate_sha256}\nOwner statement: ${decision.owner_statement}\nRepair the conflicting source lineage, preserve superseded history, rebuild generated fallback artifacts, and run the relevant governance and reader-path checks. Do not revise the approved replacement wording.`;
}

export async function loadUnresolvedContentReport(
  credential: string,
  fetchImpl: typeof fetch = fetch
) {
  const response = await fetchImpl("/api/admin/content-unresolved", { headers: adminCredentialHeaders(credential) });
  const payload = await response.json().catch(() => null) as { ok?: boolean; report?: UnresolvedContentReport; error?: string } | null;
  if (!payload?.ok || !payload.report) {
    throw new Error(payload?.error || "Unable to load unresolved content.");
  }
  return payload.report;
}

export function UnresolvedContentReview({
  credential,
  contentLibraryReady,
  editableContentKeys,
  onFindInContentLibrary
}: UnresolvedContentReviewProps) {
  const [reportState, setReportState] = useState<UnresolvedContentReport | false | null>(null);
  const [query, setQuery] = useState("");
  const [repairIssue, setRepairIssue] = useState<UnresolvedContentIssue | null>(null);
  const [exactTextConfirmed, setExactTextConfirmed] = useState(false);
  const [decisionSaving, setDecisionSaving] = useState(false);
  const [decisionError, setDecisionError] = useState("");
  const report = reportState || null;
  const issues = report?.issues ?? [];
  const filteredIssues = issues.filter((issue) => !query.trim() || JSON.stringify(issue).toLowerCase().includes(query.trim().toLowerCase()));

  useEffect(() => {
    void loadUnresolvedContentReport(credential)
      .then(setReportState)
      .catch(() => setReportState(false));
  }, [credential]);

  function openRepairReview(issue: UnresolvedContentIssue) {
    setRepairIssue(issue);
    setExactTextConfirmed(Boolean(issue.sourceDecision));
    setDecisionError("");
  }

  function closeRepairReview() {
    if (decisionSaving) return;
    setRepairIssue(null);
    setExactTextConfirmed(false);
    setDecisionError("");
  }

  async function approveRepairReplacement() {
    const issue = repairIssue;
    const plan = issue?.repairPlan;
    if (!issue || !plan || !exactTextConfirmed || issue.sourceDecision) return;
    setDecisionSaving(true);
    setDecisionError("");
    try {
      const response = await fetch("/api/admin/content-source-repair-decisions", {
        method: "POST",
        headers: { "content-type": "application/json", ...adminCredentialHeaders(credential) },
        body: JSON.stringify({
          schema: "content-studio-source-decision/v1",
          issueId: issue.issueId,
          contentKey: issue.contentKey,
          action: "approve-replacement",
          candidateSha256: plan.candidateSha256,
          approvalStatement: plan.approvalStatement,
          confirmExactText: true
        })
      });
      const payload = await response.json().catch(() => null) as { ok?: boolean; decision?: ContentSourceDecision; error?: string } | null;
      if (!response.ok || !payload?.ok || !payload.decision) {
        throw new Error(payload?.error || "Could not record the owner decision.");
      }
      setReportState((current) => current && typeof current === "object" ? {
        ...current,
        issues: current.issues.map((candidate) => candidate.issueId === issue.issueId
          ? { ...candidate, sourceDecision: payload.decision }
          : candidate)
      } : current);
      setRepairIssue({ ...issue, sourceDecision: payload.decision });
    } catch (error) {
      setDecisionError(error instanceof Error ? error.message : "Could not record the owner decision.");
    } finally {
      setDecisionSaving(false);
    }
  }

  return (
    <section className="admin-template-page admin-unresolved-content-page">
      <section className="admin-content-toolbar" aria-label="Unresolved content overview">
        <div className="admin-content-toolbar-copy">
          <h2>Resolve content holds</h2>
          <p>Review exact replacements and authorize source repairs here. Reader copy stays held until the governed package deployment finishes.</p>
        </div>
        <div className="admin-unresolved-total">
          <strong>{report ? issues.length : "…"}</strong>
          <span>issues</span>
        </div>
      </section>

      <section className="admin-filter-toolbar admin-unresolved-filters" aria-label="Unresolved content search">
        <div className="admin-search-field">
          <span>Search</span>
          <div className="admin-search-input-shell">
            <input
              aria-label="Search unresolved content"
              placeholder="Key, file, status"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
        </div>
      </section>

      <section className="admin-list-panel" aria-label="Unresolved content records">
        <div className="admin-content-table-scroll">
          {reportState === false && <p className="admin-empty" role="alert">Load failed. Try again.</p>}
          <table className="admin-content-table admin-unresolved-content-table">
            <thead><tr><th>Content</th><th>What it means</th><th>Source records</th><th>Next step</th></tr></thead>
            <tbody>{filteredIssues.map((issue) => {
              const sourceRepair = issue.kind === "source-repair";
              const sourceApproved = sourceRepair && Boolean(issue.sourceDecision);
              const canOpen = !sourceRepair && editableContentKeys.has(issue.contentKey);
              const missingRow = contentLibraryReady && !sourceRepair && !canOpen;
              return <tr key={issue.contentKey}>
                <td data-label="Content"><strong>{issue.surface}</strong><code>{issue.contentKey}</code></td>
                <td data-label="What it means">
                  <span className={`ui-pill admin-status ${sourceApproved ? "status-ready" : sourceRepair ? "status-error" : "status-draft"}`}>{sourceApproved ? "Owner approved" : sourceRepair ? "Source repair required" : missingRow ? "Editable row missing" : "Owner review required"}</span>
                  {sourceRepair && <small>{sourceApproved ? "Approval is complete. Next, copy the implementation request into Codex. After the repaired package is deployed, this row will disappear." : issue.repairPlan ? "Review and authorize the governed replacement here." : "A governed replacement plan is still required."}</small>}
                  {issue.resolution && <details className="admin-unresolved-diagnosis"><summary>Codex diagnosis</summary><small>{issue.resolution.diagnosis}</small></details>}
                </td>
                <td data-label="Source records"><details><summary>{issue.records.length} record(s)</summary>{issue.records.map((record) => <code key={record.id}>{record.reviewStatus}: {record.sourcePath}{record.objectPath}</code>)}</details></td>
                <td data-label="Next step">{sourceRepair && issue.repairPlan
                  ? <div className="admin-toolbar-actions"><button className="admin-edit-row-button" type="button" onClick={() => openRepairReview(issue)}>{sourceApproved ? "View approved replacement" : "Review replacement"}</button><button className="admin-edit-row-button" type="button" onClick={() => void navigator.clipboard.writeText(issue.aiRequest)}>Copy investigation</button>{sourceApproved && <button className="admin-edit-row-button" type="button" onClick={() => void navigator.clipboard.writeText(sourceImplementationRequest(issue))}>Copy implementation request</button>}</div>
                  : !contentLibraryReady && !sourceRepair
                  ? <small>Checking…</small>
                  : canOpen
                    ? <button className="admin-edit-row-button" type="button" onClick={() => onFindInContentLibrary(issue.contentKey)}>Open exact row</button>
                    : <div className="admin-toolbar-actions"><button className="admin-edit-row-button" type="button" onClick={() => void navigator.clipboard.writeText(issue.aiRequest)}>{sourceRepair ? "Copy repair request" : "Copy investigation"}</button><button className="admin-edit-row-button" type="button" onClick={() => void recordResolution(credential)}>Record response</button></div>}</td>
              </tr>;
            })}</tbody>
          </table>
          {report && filteredIssues.length === 0 && <p className="admin-empty" role="status">No matching issues.</p>}
        </div>
      </section>

      {repairIssue?.repairPlan && <div className="admin-source-repair-backdrop" onMouseDown={(event) => { if (event.currentTarget === event.target) closeRepairReview(); }}>
        <aside className="admin-source-repair-dialog" role="dialog" aria-modal="true" aria-label={`Review replacement for ${repairIssue.contentKey}`}>
          <header className="admin-source-repair-header">
            <div>
              <span>Governed source repair</span>
              <strong>{repairIssue.repairPlan.title}</strong>
              <code>{repairIssue.contentKey}</code>
            </div>
            <button type="button" onClick={closeRepairReview} disabled={decisionSaving} aria-label="Close replacement review">×</button>
          </header>

          <div className="admin-source-repair-body">
            <section className="admin-source-repair-provenance" aria-label="Replacement provenance">
              <div><span>Candidate source</span><code>{repairIssue.repairPlan.candidatePath}</code></div>
              <div><span>Exact payload hash</span><code>{repairIssue.repairPlan.candidateSha256}</code></div>
              <p>This exact text is currently non-serving. Approval here authorizes Codex to promote it without rewriting it; the existing hold remains until that package change is deployed.</p>
            </section>

            <section className="admin-source-repair-copy" aria-label="Exact replacement copy">
              {Object.entries(repairIssue.repairPlan.article).map(([field, value]) => <div key={field}>
                <span>{field.replaceAll("_", " ")}</span>
                {value.split(/\n\n/u).map((paragraph, index) => <p key={`${field}-${index}`}>{paragraph}</p>)}
              </div>)}
            </section>
          </div>

          <footer className="admin-source-repair-footer">
            {repairIssue.sourceDecision
              ? <div className="admin-source-repair-approved" role="status"><strong>Approved for implementation</strong><span>{new Date(repairIssue.sourceDecision.approved_at).toLocaleString()}</span><code>{repairIssue.sourceDecision.candidate_sha256}</code></div>
              : <label className="admin-source-repair-confirmation"><input type="checkbox" checked={exactTextConfirmed} onChange={(event) => setExactTextConfirmed(event.target.checked)} /><span>{repairIssue.repairPlan.approvalStatement}</span></label>}
            {decisionError && <p className="admin-source-repair-error" role="alert">{decisionError}</p>}
            <div className="admin-toolbar-actions">
              <button className="admin-edit-row-button" type="button" onClick={closeRepairReview} disabled={decisionSaving}>Close</button>
              {!repairIssue.sourceDecision && <button className="admin-publish-button" type="button" onClick={() => void approveRepairReplacement()} disabled={!exactTextConfirmed || decisionSaving}>{decisionSaving ? "Recording…" : "Approve exact replacement"}</button>}
            </div>
          </footer>
        </aside>
      </div>}
    </section>
  );
}
