import { useEffect, useState } from "react";
import { AdminDisclosureSummary } from "./AdminNativeControls";
import ContentLiveStatusBadge from "./ContentLiveStatus";
import { readGeneratedContentRows } from "./generatedContentClient";
import { StudioButton } from "./StudioControls";
import type { SummaryCompositionRow } from "./skySummaryComposition";

const reviewDraftPrefix = "cms/sky-debility/review-draft/";
type ReviewDraft = Pick<SummaryCompositionRow, "content_key" | "status" | "updated_at" | "headline" | "inventory_only"> & { id: string };

export function SkyDebilityReviewDrafts({ secret, rows, onOpen, busy }: {
  secret: string;
  rows: SummaryCompositionRow[];
  onOpen: (row: ReviewDraft) => void;
  busy: boolean;
}) {
  const [saved, setSaved] = useState<ReviewDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    // These samples live in the reference lane. Fetch their inventory directly so
    // Content Library visibility and search filters cannot hide them here.
    const params = new URLSearchParams({ contentKeyPrefix: reviewDraftPrefix, status: "DRAFT", visibility: "all", limit: "80" });
    void readGeneratedContentRows(`/api/admin/generated-content-inventory?${params}`, secret, controller.signal)
      .then(result => { if (!controller.signal.aborted) setSaved(result); })
      .catch(reason => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Saved review drafts could not be loaded."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [secret, revision]);

  // A draft saved in the existing editor should update this list immediately.
  const currentRows = new Map(rows.map(row => [row.id, row]));
  const drafts = saved.map(row => ({ ...row, ...currentRows.get(row.id) }))
    .filter(row => row.status === "DRAFT" && row.content_key.startsWith(reviewDraftPrefix))
    .sort((a, b) => a.content_key.localeCompare(b.content_key));

  return <details open className="admin-workspace-details" data-testid="sky-debility-review-drafts">
    <AdminDisclosureSummary>Saved review drafts{!loading && !error ? ` · ${drafts.length}` : ""}</AdminDisclosureSummary>
    <p>Open a saved reading to review its full wording and save draft changes.</p>
    {loading && <p role="status">Loading saved review drafts…</p>}
    {error && <p role="alert">{error}</p>}
    {!loading && !error && drafts.length === 0 && <p>No saved dignity review drafts yet.</p>}
    {!loading && !error && <div className="admin-daily-glance-pair-list" aria-label="Saved dignity review drafts">
      {drafts.map(row => {
        const label = row.headline || row.content_key.split("/").at(-1)!;
        return <article key={row.id} aria-label={label}>
          <div><strong>{label}</strong><ContentLiveStatusBadge row={row} /></div>
          <div><StudioButton type="button" disabled={busy} onClick={() => onOpen(row)} aria-label={`Review draft: ${label}`}>Review draft</StudioButton></div>
        </article>;
      })}
    </div>}
    <StudioButton type="button" disabled={busy || loading} onClick={() => setRevision(value => value + 1)}>Refresh review drafts</StudioButton>
  </details>;
}
