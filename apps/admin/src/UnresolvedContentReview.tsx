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
    result_status: "diagnosis-only" | "implemented";
    diagnosis: string;
    proposed_action: string;
    pr_url: string | null;
    owner_decision_required: boolean;
  } | null;
};

type UnresolvedWorkflowStepState = "complete" | "current" | "waiting";

export type UnresolvedWorkflow = {
  status: "action" | "waiting";
  statusLabel: string;
  currentStep: string;
  explanation: string;
  responsibleParty: string;
  steps: Array<{
    label: string;
    state: UnresolvedWorkflowStepState;
  }>;
};

type UnresolvedWorkflowContext = {
  contentLibraryReady: boolean;
  hasEditableRow: boolean;
  requestCopied: boolean;
};

export function unresolvedIssueWorkflow(
  issue: UnresolvedContentIssue,
  { contentLibraryReady, hasEditableRow, requestCopied }: UnresolvedWorkflowContext
): UnresolvedWorkflow {
  const step = (label: string, state: UnresolvedWorkflowStepState) => ({ label, state });

  if (issue.kind === "source-repair") {
    const hasPlan = Boolean(issue.repairPlan);
    const ownerApproved = Boolean(issue.sourceDecision);
    const implementationRecorded = issue.resolution?.result_status === "implemented";

    if (!hasPlan) {
      return {
        status: requestCopied ? "waiting" : "action",
        statusLabel: requestCopied ? "Waiting for Codex" : "Action needed",
        currentStep: "Diagnose the source conflict",
        explanation: requestCopied
          ? "The investigation request is copied. Paste it into Codex, then record the JSON response here."
          : "Copy the investigation request and send it to Codex. No approval decision is available yet.",
        responsibleParty: requestCopied ? "Codex" : "You",
        steps: [
          step("Diagnose conflict", "current"),
          step("Review replacement", "waiting"),
          step("Implement repair", "waiting"),
          step("Deploy package", "waiting")
        ]
      };
    }

    if (!ownerApproved) {
      return {
        status: "action",
        statusLabel: "Action needed",
        currentStep: "Review the exact replacement",
        explanation: "The diagnosis and replacement plan are ready. Review the exact wording and approve it only if it is correct.",
        responsibleParty: "You",
        steps: [
          step("Diagnose conflict", "complete"),
          step("Review replacement", "current"),
          step("Implement repair", "waiting"),
          step("Deploy package", "waiting")
        ]
      };
    }

    if (implementationRecorded) {
      return {
        status: "waiting",
        statusLabel: "Waiting for deployment",
        currentStep: "Deploy and verify the repaired package",
        explanation: "The implementation response is recorded. This row will clear after the repaired package is deployed and the inventory refreshes.",
        responsibleParty: "Deployment",
        steps: [
          step("Diagnose conflict", "complete"),
          step("Review replacement", "complete"),
          step("Implement repair", "complete"),
          step("Deploy package", "current")
        ]
      };
    }

    return {
      status: requestCopied ? "waiting" : "action",
      statusLabel: requestCopied ? "Waiting for Codex" : "Action needed",
      currentStep: "Implement the approved repair",
      explanation: requestCopied
        ? "The implementation request is copied. Paste it into Codex, then record the JSON response here."
        : "The exact replacement is approved. Copy the implementation request and send it to Codex.",
      responsibleParty: requestCopied ? "Codex" : "You",
      steps: [
        step("Diagnose conflict", "complete"),
        step("Review replacement", "complete"),
        step("Implement repair", "current"),
        step("Deploy package", "waiting")
      ]
    };
  }

  if (!contentLibraryReady) {
    return {
      status: "waiting",
      statusLabel: "Checking",
      currentStep: "Check for an editable row",
      explanation: "Content Studio is checking the Content Library. No action is needed while this check runs.",
      responsibleParty: "Content Studio",
      steps: [
        step("Check source", "current"),
        step("Import editable row", "waiting"),
        step("Review copy", "waiting"),
        step("Publish", "waiting")
      ]
    };
  }

  if (hasEditableRow) {
    return {
      status: "action",
      statusLabel: "Action needed",
      currentStep: "Review the copy in Content Library",
      explanation: "The governed editable row is available. Open the exact row to review and edit it.",
      responsibleParty: "You",
      steps: [
        step("Diagnose source", "complete"),
        step("Import editable row", "complete"),
        step("Review copy", "current"),
        step("Publish", "waiting")
      ]
    };
  }

  if (issue.resolution?.result_status === "implemented") {
    return {
      status: "waiting",
      statusLabel: "Waiting for import",
      currentStep: "Deploy and sync the editable row",
      explanation: "The code repair is recorded, but the editable row is not visible yet. Refresh after deployment or database materialization finishes.",
      responsibleParty: "Deployment",
      steps: [
        step("Diagnose source", "complete"),
        step("Import editable row", "current"),
        step("Review copy", "waiting"),
        step("Publish", "waiting")
      ]
    };
  }

  if (issue.resolution) {
    return {
      status: requestCopied ? "waiting" : "action",
      statusLabel: requestCopied ? "Waiting for Codex" : "Action needed",
      currentStep: "Implement the governed import",
      explanation: requestCopied
        ? "The implementation request is copied. Paste it into Codex, then record the JSON response here."
        : "The diagnosis is recorded. Copy the implementation request to create the missing editable row without changing its review status.",
      responsibleParty: requestCopied ? "Codex" : "You",
      steps: [
        step("Diagnose source", "complete"),
        step("Import editable row", "current"),
        step("Review copy", "waiting"),
        step("Publish", "waiting")
      ]
    };
  }

  return {
    status: requestCopied ? "waiting" : "action",
    statusLabel: requestCopied ? "Waiting for Codex" : "Action needed",
    currentStep: "Diagnose the missing editable row",
    explanation: requestCopied
      ? "The investigation request is copied. Paste it into Codex, then record the JSON response here."
      : "Copy the investigation request and send it to Codex to find the governed import path.",
    responsibleParty: requestCopied ? "Codex" : "You",
    steps: [
      step("Diagnose source", "current"),
      step("Import editable row", "waiting"),
      step("Review copy", "waiting"),
      step("Publish", "waiting")
    ]
  };
}

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

function editorialImplementationRequest(issue: UnresolvedContentIssue) {
  if (!issue.resolution) return issue.aiRequest;
  return `Repo: tldrastro. Implement the diagnosed Content Studio import repair.\nIssue ID: ${issue.issueId}\nContent key: ${issue.contentKey}\nRecorded diagnosis: ${issue.resolution.diagnosis}\nRequired repair: ${issue.resolution.proposed_action}\nCreate the governed editable Content Library row, preserve its exact source copy and review_status, and run the relevant governance and reader-path checks. Return one JSON object using schema content-studio-resolution/v1 with status implemented.`;
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
  const [refreshToken, setRefreshToken] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [copiedRequest, setCopiedRequest] = useState<{ issueId: string; kind: "investigation" | "implementation" } | null>(null);
  const report = reportState || null;
  const issues = report?.issues ?? [];
  const filteredIssues = issues.filter((issue) => !query.trim() || JSON.stringify(issue).toLowerCase().includes(query.trim().toLowerCase()));

  useEffect(() => {
    setRefreshing(true);
    void loadUnresolvedContentReport(credential)
      .then(setReportState)
      .catch(() => setReportState(false))
      .finally(() => setRefreshing(false));
  }, [credential, refreshToken]);

  async function copyRequest(issue: UnresolvedContentIssue, kind: "investigation" | "implementation", request: string) {
    try {
      await navigator.clipboard.writeText(request);
      setCopiedRequest({ issueId: issue.issueId, kind });
    } catch {
      alert("Could not copy the request. Check browser clipboard access and try again.");
    }
  }

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
          <p>Review exact replacements and authorize source repairs here. Each row shows the current step, who needs to act, and what must finish before the next step unlocks.</p>
        </div>
        <div className="admin-unresolved-total">
          <strong>{report ? issues.length : "…"}</strong>
          <span>issues</span>
        </div>
      </section>

      <section className="admin-unresolved-guide" aria-label="Workflow status guide">
        <div><span className="admin-unresolved-state is-action">Action needed</span><p>A button is ready for you now.</p></div>
        <div><span className="admin-unresolved-state is-waiting">Waiting</span><p>Another person or system must finish first.</p></div>
        <button className="admin-edit-row-button" type="button" onClick={() => setRefreshToken((current) => current + 1)} disabled={refreshing}>{refreshing ? "Refreshing…" : "Refresh status"}</button>
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
              const expectedRequestKind = sourceRepair
                ? sourceApproved ? "implementation" : "investigation"
                : issue.resolution ? "implementation" : "investigation";
              const requestCopied = copiedRequest?.issueId === issue.issueId && copiedRequest.kind === expectedRequestKind;
              const workflow = unresolvedIssueWorkflow(issue, {
                contentLibraryReady,
                hasEditableRow: canOpen,
                requestCopied
              });
              return <tr key={issue.contentKey}>
                <td data-label="Content"><strong>{issue.surface}</strong><code>{issue.contentKey}</code></td>
                <td data-label="What it means">
                  <div className="admin-unresolved-current-step">
                    <span className={`admin-unresolved-state is-${workflow.status}`}>{workflow.statusLabel}</span>
                    <strong>{workflow.currentStep}</strong>
                    <small>{workflow.explanation}</small>
                    <span className="admin-unresolved-owner">Responsible now: <strong>{workflow.responsibleParty}</strong></span>
                  </div>
                  <ol className="admin-unresolved-progress" aria-label={`Resolution progress for ${issue.contentKey}`}>
                    {workflow.steps.map((workflowStep, index) => <li className={`is-${workflowStep.state}`} key={workflowStep.label} aria-current={workflowStep.state === "current" ? "step" : undefined}>
                      <span aria-hidden="true">{workflowStep.state === "complete" ? "✓" : index + 1}</span>
                      <small>{workflowStep.label}</small>
                    </li>)}
                  </ol>
                  {issue.resolution && <details className="admin-unresolved-diagnosis"><summary>Codex diagnosis</summary><small>{issue.resolution.diagnosis}</small></details>}
                </td>
                <td data-label="Source records"><details><summary>{issue.records.length} record(s)</summary>{issue.records.map((record) => <code key={record.id}>{record.reviewStatus}: {record.sourcePath}{record.objectPath}</code>)}</details></td>
                <td data-label="Next step">{sourceRepair && issue.repairPlan
                  ? <div className="admin-unresolved-actions"><span className={`admin-unresolved-action-state is-${workflow.status}`}>{workflow.statusLabel}</span><div className="admin-toolbar-actions"><button className={`admin-edit-row-button ${!sourceApproved ? "is-primary" : ""}`} type="button" onClick={() => openRepairReview(issue)}>{sourceApproved ? "View approved replacement" : "Review replacement now"}</button>{sourceApproved && issue.resolution?.result_status !== "implemented" && <button className="admin-edit-row-button is-primary" type="button" onClick={() => void copyRequest(issue, "implementation", sourceImplementationRequest(issue))}>{requestCopied ? "Copy implementation request again" : "Copy implementation request"}</button>}<button className="admin-edit-row-button" type="button" onClick={() => void copyRequest(issue, "investigation", issue.aiRequest)}>Copy investigation</button>{requestCopied && <button className="admin-edit-row-button is-primary" type="button" onClick={() => void recordResolution(credential)}>Record Codex response</button>}</div></div>
                  : !contentLibraryReady && !sourceRepair
                  ? <div className="admin-unresolved-actions"><span className="admin-unresolved-action-state is-waiting">Waiting</span><button className="admin-edit-row-button" type="button" disabled>Checking Content Library…</button></div>
                  : canOpen
                    ? <div className="admin-unresolved-actions"><span className="admin-unresolved-action-state is-action">Action needed</span><button className="admin-edit-row-button is-primary" type="button" onClick={() => onFindInContentLibrary(issue.contentKey)}>Open exact row to review</button></div>
                    : issue.resolution?.result_status === "implemented"
                      ? <div className="admin-unresolved-actions"><span className="admin-unresolved-action-state is-waiting">Waiting for import</span><button className="admin-edit-row-button" type="button" onClick={() => setRefreshToken((current) => current + 1)} disabled={refreshing}>{refreshing ? "Refreshing…" : "Refresh status"}</button></div>
                      : <div className="admin-unresolved-actions"><span className={`admin-unresolved-action-state is-${workflow.status}`}>{workflow.statusLabel}</span><div className="admin-toolbar-actions"><button className="admin-edit-row-button is-primary" type="button" onClick={() => void copyRequest(issue, issue.resolution ? "implementation" : "investigation", issue.resolution ? editorialImplementationRequest(issue) : issue.aiRequest)}>{requestCopied ? `Copy ${issue.resolution ? "implementation" : "investigation"} request again` : `Copy ${issue.resolution ? "implementation" : "investigation"} request`}</button><button className={`admin-edit-row-button ${requestCopied ? "is-primary" : ""}`} type="button" onClick={() => void recordResolution(credential)}>{requestCopied ? "Record Codex response" : "Record an existing response"}</button></div></div>}</td>
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
