import { StudioButton } from "./StudioControls";
import { useEffect, useRef, useState } from "react";
import { requestStudioJson } from "./generatedContentClient";
import { PageLoading } from "../../../src/shared/components/PageLoading";
import { AdminSelect } from "./AdminNativeControls";
import { MetricCard } from "./studio-ds/patterns";
import { Grid, Stack } from "./studio-ds/primitives";
import { metricGrid, surfaceSection } from "./studio-ds/recipes";
import ContentLiveStatusBadge from "./ContentLiveStatus";
import {
  natalAspectComposedStatusRow,
  natalAspectMatchesSelection,
  natalAspectSelectionOptions,
  parseNatalAspectContentKey,
  natalAspectComposedSources, natalAspectSourceFields, natalAspectPreviewOverrides
} from "./natalAspectFinderSources";

import { natalAspectCompleteDraft, natalAspectContentKeyPrefix, natalAspectDisplayTitle, natalAspectSourceDraft, natalAspectTitleCase as titleCase, type NatalAspectSelection, type NatalAspectSourceDraft } from "./natalAspectSources";

type PreviewRow = {
  id?: string | null;
  inventory_only?: boolean;
  updated_at?: string | null;
  body: string | null;
  content_key: string;
  headline: string | null;
  sections?: unknown;
  status: string;
  summary: string | null;
};

type Props = {
  aspect: string;
  first: string;
  isLoading: boolean;
  onCreateSource: (draft: NatalAspectSourceDraft) => void;
  onOpenSource: (contentKey: string, label: string) => void;
  onSelectionChange: (next: Partial<NatalAspectSelection>) => void;
  rows: PreviewRow[];
  second: string;
  secret?: string;
};

function previewForRow(row: PreviewRow) {
  const fields = natalAspectSourceFields(row);
  return fields.body_you.trim() || fields.body_they.trim() || row.summary?.trim() || row.headline?.trim() || "";
}

export default function NatalAspectSourceFinder({
  aspect,
  first,
  isLoading,
  onCreateSource,
  onOpenSource,
  onSelectionChange,
  rows,
  second,
  secret = ""
}: Props) {
  const [loadingComplete, setLoadingComplete] = useState(false);
  const [completeError, setCompleteError] = useState("");
  const selectionKey = `${first}/${aspect}/${second}`;
  const currentSelection = useRef(selectionKey);
  currentSelection.current = selectionKey;
  useEffect(() => {
    currentSelection.current = selectionKey;
    setCompleteError("");
    return () => { currentSelection.current = ""; };
  }, [selectionKey]);
  const sourceRows = [...rows.reduce((latest, row) => {
    if (row.status === 'ARCHIVED') return latest;
    const previous = latest.get(row.content_key);
    if (!previous || (row.updated_at ?? '') > (previous.updated_at ?? '')) latest.set(row.content_key, row);
    return latest;
  }, new Map<string, PreviewRow>()).values()];
  const exactRows = sourceRows.filter(row => parseNatalAspectContentKey(row.content_key));
  const options = natalAspectSelectionOptions(exactRows);
  const hasSelection = Boolean(first || aspect || second);
  const fullSelection = Boolean(first && aspect && second);
  const matches = hasSelection
    ? exactRows
        .filter((row) => natalAspectMatchesSelection(row, { first, aspect, second }))
        .sort((left, right) => left.content_key.localeCompare(right.content_key))
    : [];
  const selectedTitle = fullSelection
    ? natalAspectDisplayTitle({ first, aspect, second })
    : hasSelection
      ? "Choose the remaining values"
      : "Choose a natal aspect";
  const composedSources = fullSelection ? natalAspectComposedSources({ first, aspect, second }) : [];
  const hasExactSource = matches.some(row => row.content_key.startsWith(natalAspectContentKeyPrefix));

  async function editCompleteWriteup() {
    setLoadingComplete(true);
    setCompleteError("");
    try {
      const response = await requestStudioJson("/api/admin/natal-placement-preview", secret, {
        method: "POST", readOnly: true,
        body: JSON.stringify({ kind: "natal-aspect", planet: first, aspect, second, audience: "you",
          overrides: natalAspectPreviewOverrides(sourceRows, { first, aspect, second }) })
      }) as { rendered?: { body: string }; friend?: { body: string } };
      if (currentSelection.current !== selectionKey) return;
      onCreateSource(natalAspectCompleteDraft({ first, aspect, second }, response.rendered?.body ?? "", response.friend?.body ?? ""));
    } catch (error) {
      if (currentSelection.current === selectionKey) setCompleteError(error instanceof Error ? error.message : "The complete write-up could not be loaded.");
    } finally { setLoadingComplete(false); }
  }

  return (
    <section className="admin-natal-placement-finder" aria-label="Find natal aspect source writing">
      <h2 className="sr-only">Natal aspect</h2>
      <section className={surfaceSection} aria-label="Natal aspect filters">
        <div className="admin-natal-placement-selectors admin-filter-form admin-filter-form--three">
          <label>
            <span>Planet or point</span>
            <AdminSelect aria-label="Natal aspect planet or point" value={first} onChange={(event) => onSelectionChange({ first: event.target.value })}>
              <option value="">Choose planet or point</option>
              {options.first.map((item) => <option value={item} key={item}>{titleCase(item)}</option>)}
            </AdminSelect>
          </label>
          <label>
            <span>Aspect</span>
            <AdminSelect aria-label="Natal aspect type" value={aspect} onChange={(event) => onSelectionChange({ aspect: event.target.value })}>
              <option value="">Choose aspect</option>
              {options.aspects.map((item) => <option value={item} key={item}>{titleCase(item)}</option>)}
            </AdminSelect>
          </label>
          <label>
            <span>Other planet or point</span>
            <AdminSelect aria-label="Other natal aspect planet or point" value={second} onChange={(event) => onSelectionChange({ second: event.target.value })}>
              <option value="">Choose planet or point</option>
              {options.second.map((item) => <option value={item} key={item}>{titleCase(item)}</option>)}
            </AdminSelect>
          </label>
        </div>
        {fullSelection && (
          <Grid className={metricGrid} aria-label="Selected natal aspect">
            <MetricCard label="Planet or point" value={titleCase(first)} />
            <MetricCard label="Aspect" value={titleCase(aspect)} />
            <MetricCard label="Other planet or point" value={titleCase(second)} />
          </Grid>
        )}
      </section>

      {isLoading && (exactRows.length === 0 || (fullSelection && matches.length === 0)) && (
        <PageLoading message="Loading exact natal aspect passages…" />
      )}

      {!isLoading && fullSelection && matches.length === 0 && (
          <div className="admin-empty-state">
            <strong>No exact pair-specific passage is saved for {selectedTitle}.</strong>
            {composedSources.length > 0 && (
              <>
                <p>Edit the full write-up, including its closing sentence.</p>
                <StudioButton type="button" className="primary" disabled={loadingComplete} onClick={() => void editCompleteWriteup()}>
                  {loadingComplete ? "Loading complete write-up…" : "Edit complete write-up"}
                </StudioButton>
                {completeError && <p role="alert">{completeError}</p>}
              </>
            )}
            <StudioButton
              type="button"
              className={composedSources.length ? undefined : "primary"}
              disabled={loadingComplete}
              onClick={() => onCreateSource(natalAspectSourceDraft({ first, aspect, second }))}
            >
              Write {selectedTitle}
            </StudioButton>
          </div>
      )}

      {!isLoading && hasSelection && !fullSelection && matches.length === 0 && (
        <div className="admin-empty-state" role="status">
          <strong>No passage matches the selected values yet.</strong>
          <p>Choose all three values to create an exact pair-specific passage.</p>
        </div>
      )}

      {hasSelection && matches.length > 0 && (
        <section className={`${surfaceSection} admin-natal-source-group`} aria-label="Matching natal aspect passages">
          <header>
            <Stack gap="sm">
              <h3>{matches.length === 1 ? "Exact reader passage" : `${matches.length} matching passages`}</h3>
            </Stack>
          </header>
          <div className="admin-natal-source-grid">
            {!hasExactSource && fullSelection && (
              <div className="admin-empty-state">
                <StudioButton type="button" onClick={() => onCreateSource(natalAspectSourceDraft({ first, aspect, second }))}>
                  Write Friend passage
                </StudioButton>
              </div>
            )}
            {matches.map((row) => {
              const parsed = parseNatalAspectContentKey(row.content_key) as NatalAspectSelection;
              const title = natalAspectDisplayTitle(parsed);
              const preview = previewForRow(row);
              const fields = natalAspectSourceFields(row);
              const standalone = row.content_key.startsWith('natal.aspect.');
              return (
                <article className="admin-natal-source-card" aria-label={`${standalone ? 'Standalone' : 'Exact'} ${title}`} key={row.content_key}>
                  <div className="admin-natal-source-card-copy">
                    <div className="admin-natal-source-card-heading">
                      <h4>{title}</h4>
                      <ContentLiveStatusBadge row={row} />
                    </div>
                    {row.inventory_only && row.body == null
                      ? <p>Open to inspect saved fields.</p>
                      : <p>You: {fields.body_you.trim() ? 'saved' : 'empty'}. Friend: {fields.body_they.trim() ? 'saved' : standalone ? 'automatic conversion' : 'empty'}. Astrology hint: {fields.astroHint.trim() ? 'saved' : 'empty'}.</p>}
                    <p className="admin-natal-source-key"><span>Source key</span><code>{row.content_key}</code></p>
                    {preview && <blockquote>{preview}</blockquote>}
                  </div>
                  <StudioButton type="button" onClick={() => onOpenSource(row.content_key, title)} disabled={isLoading || loadingComplete}>Edit source</StudioButton>
                </article>
              );
            })}
          </div>
        </section>
      )}
      {fullSelection && composedSources.length > 0 && (
          <section className={`${surfaceSection} admin-natal-source-group`} aria-label="Shared natal aspect fallback sources">
            <header>
              <h3>Shared fallback sources</h3>
            </header>
            <p>Used when You or Friend has no exact passage.</p>
            <div className="admin-natal-source-grid">
              {composedSources.map((source) => {
                const savedRow = source.candidateKeys
                  .map((contentKey) => sourceRows.find((row) => row.content_key === contentKey))
                  .find((row): row is PreviewRow => Boolean(row));
                const contentKey = savedRow?.content_key ?? source.candidateKeys[0];
                const preview = savedRow ? previewForRow(savedRow) : "";
                return (
                  <article className="admin-natal-source-card" key={source.id}>
                    <div className="admin-natal-source-card-copy">
                      <div className="admin-natal-source-card-heading">
                        <h4>{source.label}</h4>
                        <ContentLiveStatusBadge row={natalAspectComposedStatusRow(savedRow, contentKey)} />
                      </div>
                      <p className="admin-natal-source-key"><span>Source key</span><code>{contentKey}</code></p>
                      {preview && <blockquote>{preview}</blockquote>}
                    </div>
                    <StudioButton type="button" onClick={() => onOpenSource(contentKey, source.label)} disabled={isLoading || loadingComplete}>
                      {savedRow ? "Edit source" : "Load and edit"}
                    </StudioButton>
                  </article>
                );
              })}
            </div>
          </section>
      )}

    </section>
  );
}
