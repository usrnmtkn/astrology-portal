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
  resolution?: {
    diagnosis: string;
  } | null;
};

async function recordResolution(credential: string) {
  const body = prompt("Paste the JSON returned by Codex.");
  if (!body) return;
  const response = await fetch("/api/admin/content-unresolved-resolutions", { method: "POST", headers: { "content-type": "application/json", ...adminCredentialHeaders(credential) }, body });
  response.ok ? location.reload() : alert("Could not record response.");
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
  const report = reportState || null;
  const issues = report?.issues ?? [];
  const filteredIssues = issues.filter((issue) => !query.trim() || JSON.stringify(issue).toLowerCase().includes(query.trim().toLowerCase()));

  useEffect(() => {
    void loadUnresolvedContentReport(credential)
      .then(setReportState)
      .catch(() => setReportState(false));
  }, [credential]);

  return (
    <section className="admin-template-page admin-unresolved-content-page">
      <section className="admin-content-toolbar" aria-label="Unresolved content overview">
        <div className="admin-content-toolbar-copy">
          <h2>Resolve content holds</h2>
          <p>You approve wording. Send source problems to Codex, then refresh after deploy.</p>
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
              const canOpen = !sourceRepair && editableContentKeys.has(issue.contentKey);
              const missingRow = contentLibraryReady && !sourceRepair && !canOpen;
              return <tr key={issue.contentKey}>
                <td data-label="Content"><strong>{issue.surface}</strong><code>{issue.contentKey}</code></td>
                <td data-label="What it means">
                  <span className={`ui-pill admin-status ${sourceRepair ? "status-error" : "status-draft"}`}>{sourceRepair ? "Source repair required" : missingRow ? "Editable row missing" : "Owner review required"}</span>
                  {sourceRepair && <small>Approval will not clear this hold.</small>}
                  {issue.resolution && <small>Codex response: {issue.resolution.diagnosis}</small>}
                </td>
                <td data-label="Source records"><details><summary>{issue.records.length} record(s)</summary>{issue.records.map((record) => <code key={record.id}>{record.reviewStatus}: {record.sourcePath}{record.objectPath}</code>)}</details></td>
                <td data-label="Next step">{!contentLibraryReady && !sourceRepair
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
    </section>
  );
}
