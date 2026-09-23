import { StudioButton } from "./StudioControls";
import { AdminDisclosureSummary } from "./AdminNativeControls";
import { MetricCard } from "./studio-ds/patterns";
import { Grid } from "./studio-ds/primitives";
import { containedDisclosure, metricGrid } from "./studio-ds/recipes";
import { lazy, Suspense, useState } from "react";
import { isContentStudioReferenceSource } from "../../web/src/content/contentStudioSourceRole";
import { skyWritingIssues, type ReviewableContent } from "../../web/src/content/contentReviewReadiness";
import ContentLiveStatusBadge from "./ContentLiveStatus";
const StudioMemoryFeedback = lazy(() => import("./StudioMemoryFeedback"));
type Row = ReviewableContent & {
    id: string;
    updated_at?: string | null;
    headline?: string | null;
};
export default function ReviewWorkflowPanel({ row, unsaved, busy, onCheck, onGenerate, credential = '', checkInSaveBar = false }: {
    row: Row;
    unsaved: boolean;
    busy: boolean;
    onCheck: () => void;
    onGenerate: () => void;
    credential?: string;
    checkInSaveBar?: boolean;
}) {
    const [verification, setVerification] = useState(0);
    const source = isContentStudioReferenceSource(row.content_key, row.source_snapshot ?? {});
    const sky = ["sky_aspect", "sky_placement"].includes(row.block_type ?? "");
    const issues = skyWritingIssues(row);
    const history = row.source_snapshot?.studioRevisionHistory;
    const aspects = /^sky\.aspect\.([^.]+)\.([^.]+)\.([^.]+)\./.exec(row.content_key);
    const placement = /^sky\.placement\.base\.([^.]+)\.([^.]+)$/.exec(row.content_key);
    const readerPoint = (point: string) => point === "nodes" ? "north-node" : point.replaceAll("_", "-");
    const readerHref = aspects ? `/#sky/aspect/${readerPoint(aspects[1])}/${aspects[2]}/${readerPoint(aspects[3])}`
        : placement ? `/#sky/placement/${readerPoint(placement[1])}/${placement[2]}` : null;
    return <section className="admin-review-status" aria-label="Review and publication readiness">
    <h3 className="sr-only">{source ? "Source material" : "Review and publication"}</h3>
    <div className="admin-review-status-bar">
      <Grid className={`${metricGrid} admin-review-status-values`}>
        <MetricCard label="Review" value={row.status === "REVIEWED" || row.status === "LIVE" ? "Complete" : "Pending"} />
        <MetricCard label={source ? "Use" : "Publication"} value={source ? "Source material" : <ContentLiveStatusBadge key={verification} row={{ ...row, requestRevision: verification }} unsaved={unsaved}/>} />
      </Grid>
      {!source && row.status === "LIVE" && <div className="admin-review-status-actions">
        <StudioButton type="button" onClick={() => setVerification(value => value + 1)} aria-label="Verify publication status">Refresh status</StudioButton>
        {readerHref && <a href={readerHref} target="_blank" rel="noreferrer">Open reader view</a>}
      </div>}
    </div>
    {source ? <details className={`${containedDisclosure} admin-workspace-details admin-review-status-help`}><AdminDisclosureSummary>Source usage</AdminDisclosureSummary>
      <p>Background for writing finished cards. Readers never receive this source directly.</p>
      <p>{row.content_key.startsWith("source/sky-aspect-pair/")
                ? "Used by the Sky aspect writer for this planet pair. Save edits, then Mark reviewed to activate this source revision for future generation. Existing cards keep their own writing."
                : "Review this ingredient in the source library. Changes require its owning composition or package workflow before they affect reader copy."}</p>
    </details> : <>
      {sky && <div className="admin-review-status-checks">
        <p>Writing checks: {unsaved ? "Save changes before checking" : issues.length ? "Needs attention" : row.status === "LIVE" ? "Passed" : "Passed; awaiting your approval"}</p>
        {!unsaved && issues.length > 0 && <ul>{issues.map(issue => <li key={issue}>{issue}</li>)}</ul>}
        {row.source_snapshot?.studioWritingError && <p role="alert">{String(row.source_snapshot.studioWritingError)}</p>}
        {row.status !== "LIVE" && row.status !== "ARCHIVED" && (!checkInSaveBar || !row.body?.trim()) && <StudioButton type="button" disabled={busy || unsaved} onClick={row.body?.trim() ? onCheck : onGenerate}>
          {busy ? "Working…" : row.body?.trim() ? "Run writing checks" : "Generate draft"}
        </StudioButton>}
        <p>Writing checks inspect your saved text without rewriting it. Your approval remains a separate action.</p>
        <Suspense fallback={null}>
          <StudioMemoryFeedback key={row.content_key} contentKey={row.content_key} credential={credential} revision={row.updated_at} unsaved={unsaved} />
        </Suspense>
      </div>}
      {(sky || row.status === "LIVE") && <details className={`${containedDisclosure} admin-workspace-details admin-review-status-help`}>
        <AdminDisclosureSummary>About this status</AdminDisclosureSummary>
        {row.status === "LIVE" && <p>Live means eligible to appear. The reader’s chart, event timing, and approved sources determine what is shown.</p>}
      </details>}
    </>}
    {row.source_snapshot?.importSummary && <details className={`${containedDisclosure} admin-workspace-details`}><AdminDisclosureSummary>Original import notes</AdminDisclosureSummary><p>{String(row.source_snapshot.importSummary)}</p></details>}
    {Array.isArray(history) && history.length > 0 && <details className={`${containedDisclosure} admin-workspace-details`}><AdminDisclosureSummary>Version history ({history.length})</AdminDisclosureSummary>
      {history.map((version: any, index: number) => <article key={`${version.updatedAt}-${index}`}>
        <strong>{version.updatedAt} · {version.status}</strong><p>{version.body}</p>
      </article>)}
    </details>}
  </section>;
}
