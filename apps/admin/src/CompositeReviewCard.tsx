import { useEffect, useRef, useState } from "react";
import { compositeRelationshipCopy } from "../../web/src/content/compositeRelationshipCopy";
import type { AdminGeneratedContentRow } from "./GeneratedContentAdminDashboard";
import { StudioButton } from "./StudioControls";
import { Grid, Stack } from "./studio-ds/primitives";

const relationshipTypes = ["romantic", "friendship", "family", "coworkers", "creative", "exes", "complicated"];

type Props = {
  row: AdminGeneratedContentRow;
  title: string;
  status: string;
  onLoad: (row: AdminGeneratedContentRow, signal: AbortSignal) => Promise<unknown>;
  onEdit: (row: AdminGeneratedContentRow) => void;
};

export default function CompositeReviewCard({ row, title, status, onLoad, onEdit }: Props) {
  const load = useRef(onLoad);
  load.current = onLoad;
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    setError("");
    if (!row.inventory_only) return;
    const controller = new AbortController();
    void load.current(row, controller.signal).catch(() => {
      if (!controller.signal.aborted) setError("Saved writing could not be loaded. Try again.");
    });
    return () => controller.abort();
  }, [row.id, row.updated_at, row.inventory_only, retry]);

  return <article className="admin-template-card">
    <div className="admin-section-heading-row">
      <div>
        <p className="admin-eyebrow">{status}</p>
        <h3>{title}</h3>
        <code>{row.content_key}</code>
      </div>
      <StudioButton type="button" onClick={() => onEdit(row)}>Edit</StudioButton>
    </div>
    {row.inventory_only ? error
      ? <p role="alert">{error} <StudioButton type="button" onClick={() => setRetry(value => value + 1)}>Retry saved writing</StudioButton></p>
      : <p role="status">Loading saved writing…</p>
      : <>
        <section className="admin-template-rendered-preview" aria-label="Single voice fallback">
          <p className="admin-variable-source-prose">{row.body || row.summary || "No shared meaning is saved yet."}</p>
        </section>
        <Grid className="admin-dependency-map-grid">
          {relationshipTypes.map(type => {
            const copy = compositeRelationshipCopy(row.sections, type);
            return <Stack as="article" gap="sm" key={type}>
              <span>{type}{type === "romantic" ? " / gated" : ""}</span>
              <strong>{copy ? "Authored" : "Falls back"}</strong>
              <p className="admin-variable-source-prose">{copy || "Uses the single-voice composite bank for this relationship type."}</p>
            </Stack>;
          })}
        </Grid>
      </>}
  </article>;
}

