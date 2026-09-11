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
export default function ReviewWorkflowPanel({ row, unsaved, busy, onCheck, onGenerate, credential = '' }: {
    row: Row;
    unsaved: boolean;
    busy: boolean;
    onCheck: () => void;
    onGenerate: () => void;
    credential?: string;
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
    return <section className="admin-editor-guidance" aria-label="Review and publication readiness">
    <strong>{source ? "Source material" : "Review and publication"}</strong>
    <p>Your review: {row.status === "REVIEWED" || row.status === "LIVE" ? "Complete" : "Pending"}</p>
    {source ? <>
      <p>Background for writing finished cards. Readers never receive this source directly.</p>
      <p>{row.content_key.startsWith("source/sky-aspect-pair/")
                ? "Used by the Sky aspect writer for this planet pair. Save edits, then Mark reviewed to activate this source revision for future generation. Existing cards keep their own writing."
                : "Review this ingredient in the source library. Changes require its owning composition or package workflow before they affect reader copy."}</p>
    </> : <>
      <p>Publication: <ContentLiveStatusBadge key={verification} row={{ ...row, requestRevision: verification }} unsaved={unsaved}/></p>
      {sky && <>
        <p>Writing checks: {unsaved ? "Save changes before checking" : issues.length ? "Needs attention" : row.status === "LIVE" ? "Passed" : "Passed; awaiting your approval"}</p>
        {!unsaved && issues.length > 0 && <ul>{issues.map(issue => <li key={issue}>{issue}</li>)}</ul>}
        {row.source_snapshot?.studioWritingError && <p role="alert">{String(row.source_snapshot.studioWritingError)}</p>}
        {row.status !== "LIVE" && row.status !== "ARCHIVED" && <button type="button" disabled={busy || unsaved} onClick={row.body?.trim() ? onCheck : onGenerate}>
          {busy ? "Working…" : row.body?.trim() ? "Run writing checks" : "Generate draft"}
        </button>}
        <p>Writing checks inspect your saved text without rewriting it. Your approval remains a separate action.</p>
        <Suspense fallback={null}>
          <StudioMemoryFeedback key={row.content_key} contentKey={row.content_key} credential={credential} revision={row.updated_at} unsaved={unsaved} />
        </Suspense>
      </>}
      {row.status === "LIVE" && <>
        <button type="button" onClick={() => setVerification(value => value + 1)}>Verify publication status</button>
        {readerHref ? <a href={readerHref} target="_blank" rel="noreferrer">Open reader view</a>
                    : <p>Verify this writing in the matching reader chart or event. Its context determines which source is selected.</p>}
        <p>Live status confirms eligibility. This link opens the current reader context; a future aspect may not be active yet, and higher-priority approved writing may take precedence.</p>
      </>}
    </>}
    {row.source_snapshot?.importSummary && <details><summary>Original import notes</summary><p>{String(row.source_snapshot.importSummary)}</p></details>}
    {Array.isArray(history) && history.length > 0 && <details><summary>Version history ({history.length})</summary>
      {history.map((version: any, index: number) => <article key={`${version.updatedAt}-${index}`}>
        <strong>{version.updatedAt} · {version.status}</strong><p>{version.body}</p>
      </article>)}
    </details>}
  </section>;
}
