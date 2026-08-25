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
};

type UnresolvedContentReviewProps = {
  credential: string;
  onFindInContentLibrary: (contentKey: string) => void;
};

export function filterUnresolvedContentItems(
  items: UnresolvedContentItem[],
  queryValue: string
) {
  const query = queryValue.trim().toLowerCase();
  return items.filter((item) => {
    const matchesQuery = !query || [
      item.contentKey,
      item.reason,
      item.sourcePath,
      item.objectPath,
      item.surface
    ].join(" ").toLowerCase().includes(query);
    return matchesQuery;
  });
}

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

export function UnresolvedContentReview({ credential, onFindInContentLibrary }: UnresolvedContentReviewProps) {
  const [reportState, setReportState] = useState<UnresolvedContentReport | false | null>(null);
  const [query, setQuery] = useState("");
  const report = reportState || null;
  const filteredItems = filterUnresolvedContentItems(report?.items ?? [], query);

  useEffect(() => {
    void loadUnresolvedContentReport(credential)
      .then(setReportState)
      .catch(() => setReportState(false));
  }, [credential]);

  return (
    <section className="admin-template-page admin-unresolved-content-page">
      <section className="admin-content-toolbar" aria-label="Unresolved content overview">
        <div className="admin-content-toolbar-copy">
          <p className="admin-eyebrow">Governed package inventory</p>
          <h2>Everything still waiting for resolution</h2>
          <p>Every package record held by serving eligibility, with an exact-key path into Content Library when an editable row exists.</p>
        </div>
        <div className="admin-unresolved-total" aria-label={report ? `${report.count} unresolved records` : "Loading unresolved records"}>
          <strong>{report?.count ?? "…"}</strong>
          <span>unresolved records</span>
        </div>
      </section>

      <section className="admin-filter-toolbar admin-unresolved-filters" aria-label="Unresolved content search">
        <div className="admin-search-field">
          <span>Search</span>
          <div className="admin-search-input-shell">
            <input
              aria-label="Search unresolved content"
              placeholder="Content key, source, role, or status"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
        </div>
      </section>

      <div className="admin-filter-result-count" role="status" aria-live="polite">
        {report ? <><strong>{filteredItems.length}</strong> of {report.count} records shown</> : "Loading unresolved records…"}
      </div>

      <section className="admin-list-panel" aria-label="Unresolved content records">
        <div className="admin-content-table-scroll">
          {reportState === false && <p className="admin-empty" role="alert">Unresolved content could not be loaded. Reload Content Studio to try again.</p>}
          <table className="admin-content-table admin-unresolved-content-table">
            <thead className="admin-content-table-head">
              <tr>
                <th scope="col">Content</th>
                <th scope="col">Surface</th>
                <th scope="col">Reason</th>
                <th scope="col">Review status</th>
                <th scope="col">Source record</th>
                <th scope="col">Review path</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => (
                <tr key={item.id}>
                  <td className="admin-content-title-cell">
                    <code className="admin-content-row-key">{item.contentKey}</code>
                  </td>
                  <td className="admin-content-location"><strong>{item.surface}</strong></td>
                  <td><span className={`ui-pill admin-status ${item.reason === "known-current-contract-failure" ? "status-error" : "status-draft"}`}>{item.reason}</span></td>
                  <td>{item.reviewStatus}</td>
                  <td className="admin-unresolved-source">
                    <code>{item.sourcePath}</code>
                  </td>
                  <td>
                    <button className="admin-edit-row-button" type="button" onClick={() => onFindInContentLibrary(item.contentKey)}>
                      Find editable row
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {report && filteredItems.length === 0 && (
            <div className="admin-empty" role="status">
              <strong>No unresolved records match these filters.</strong>
              <p>Clear the filters or search for another content key.</p>
            </div>
          )}
        </div>
      </section>
    </section>
  );
}
