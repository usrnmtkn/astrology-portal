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
  contentKey: string;
  surface: string;
  kind: "source-repair" | "editorial-review";
  records: UnresolvedContentItem[];
};

export async function loadUnresolvedContentReport(
  credential: string,
  fetchImpl: typeof fetch = fetch
) {
  const response = await fetchImpl("/api/admin/content-unresolved", {
    headers: adminCredentialHeaders(credential)
  });
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
  const filteredIssues = query.trim() ? issues.filter((issue) => JSON.stringify(issue).toLowerCase().includes(query.trim().toLowerCase())) : issues;

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
              placeholder="Key, file, or status"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
        </div>
      </section>

      <section className="admin-list-panel" aria-label="Unresolved content records">
        <div className="admin-content-table-scroll">
          {reportState === false && <p className="admin-empty" role="alert">Could not load. Try again.</p>}
          <table className="admin-content-table admin-unresolved-content-table">
            <thead><tr><th>Content</th><th>What it means</th><th>Source records</th><th>Next step</th></tr></thead>
            <tbody>{filteredIssues.map((issue) => {
              const sourceRepair = issue.kind === "source-repair";
              const canOpen = contentLibraryReady && editableContentKeys.has(issue.contentKey) && !sourceRepair;
              return <tr key={issue.contentKey}>
                <td data-label="Content"><strong>{issue.surface}</strong><code>{issue.contentKey}</code></td>
                <td data-label="What it means">
                  <span className={`ui-pill admin-status ${sourceRepair ? "status-error" : "status-draft"}`}>{sourceRepair ? "Source repair required" : "Owner review required"}</span>
                  <small>{sourceRepair ? "Approval will not clear this hold." : `Review status: ${issue.records[0].reviewStatus}`}</small>
                </td>
                <td data-label="Source records"><details><summary>{issue.records.length} record(s)</summary>{issue.records.map((record) => <code key={record.id}>{record.reviewStatus}: {record.sourcePath}{record.objectPath}</code>)}</details></td>
                <td data-label="Next step">{!contentLibraryReady
                  ? <small>Checking…</small>
                  : canOpen
                    ? <button className="admin-edit-row-button" type="button" onClick={() => onFindInContentLibrary(issue.contentKey)}>Open exact row</button>
                    : <small>{sourceRepair ? "Give Codex the source record. Approval cannot fix this." : "Not in Content Library. Give Codex the source record."}</small>}</td>
              </tr>;
            })}</tbody>
          </table>
          {report && filteredIssues.length === 0 && <p className="admin-empty" role="status">No unresolved issues match these filters.</p>}
        </div>
      </section>
    </section>
  );
}
