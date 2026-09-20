import { StudioButton } from "./StudioControls";
import { PageLoading } from "../../web/src/components/PageLoading";
import { AdminSelect } from "./AdminNativeControls";
import { MetricCard } from "./studio-ds/patterns";
import { Grid, Stack, Text } from "./studio-ds/primitives";
import { metricGrid, surfaceSection } from "./studio-ds/recipes";
import ContentLiveStatusBadge from "./ContentLiveStatus";
import {
  natalAspectComposedSources,
  natalAspectComposedStatusRow,
  natalAspectDisplayTitle,
  natalAspectMatchesSelection,
  natalAspectSelectionOptions,
  natalAspectSourceDraft,
  parseNatalAspectContentKey,
  type NatalAspectSelection,
  type NatalAspectSourceDraft
} from "./natalAspectSources";

type PreviewRow = {
  id?: string | null;
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
};

function titleCase(value: string) {
  return value.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}


function previewForRow(row: PreviewRow) {
  const sections = row.sections && typeof row.sections === "object" ? row.sections as Record<string, unknown> : null;
  const packageRecord = sections?.packageRecord && typeof sections.packageRecord === "object"
    ? sections.packageRecord as Record<string, unknown>
    : null;
  const packageYou = typeof packageRecord?.body_you === "string" ? packageRecord.body_you.trim() : "";
  const packageBody = typeof packageRecord?.body === "string" ? packageRecord.body.trim() : "";
  return row.body?.trim() || packageYou || packageBody || row.summary?.trim() || row.headline?.trim() || "";
}

export default function NatalAspectSourceFinder({
  aspect,
  first,
  isLoading,
  onCreateSource,
  onOpenSource,
  onSelectionChange,
  rows,
  second
}: Props) {
  const exactRows = rows.filter((row) => parseNatalAspectContentKey(row.content_key));
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
        <>
          <div className="admin-empty-state">
            <strong>No exact pair-specific passage is saved for {selectedTitle}.</strong>
            <p>The You page currently uses composed natal aspect writing for this pair. Create exact You and Friend passages only if this selection needs its own writing.</p>
            <StudioButton
              type="button"
              className="primary"
              onClick={() => onCreateSource(natalAspectSourceDraft({ first, aspect, second }))}
            >
              Write {selectedTitle}
            </StudioButton>
          </div>
          <section className={`${surfaceSection} admin-natal-source-group`} aria-label="Live composed natal aspect sources">
            <header>
              <h3>Live composed sources</h3>
            </header>
            <div className="admin-natal-source-grid">
              {composedSources.map((source) => {
                const savedRow = source.candidateKeys
                  .map((contentKey) => rows.find((row) => row.content_key === contentKey))
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
                      <Text size="body" tone="secondary">{source.scope}</Text>
                      <p className="admin-natal-source-key"><span>Source key</span><code>{contentKey}</code></p>
                      {preview && <blockquote>{preview}</blockquote>}
                    </div>
                    <StudioButton type="button" onClick={() => onOpenSource(contentKey, source.label)} disabled={isLoading}>
                      {savedRow ? "Edit source" : "Load and edit"}
                    </StudioButton>
                  </article>
                );
              })}
            </div>
          </section>
        </>
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
            {matches.map((row) => {
              const parsed = parseNatalAspectContentKey(row.content_key) as NatalAspectSelection;
              const title = natalAspectDisplayTitle(parsed);
              const preview = previewForRow(row);
              return (
                <article className="admin-natal-source-card" key={row.content_key}>
                  <div className="admin-natal-source-card-copy">
                    <div className="admin-natal-source-card-heading">
                      <h4>{title}</h4>
                      <ContentLiveStatusBadge row={row} />
                    </div>
                    <Text size="body" tone="secondary">Exact natal aspect writing for the reader’s birth chart.</Text>
                    <p className="admin-natal-source-key"><span>Source key</span><code>{row.content_key}</code></p>
                    {preview && <blockquote>{preview}</blockquote>}
                  </div>
                  <StudioButton type="button" onClick={() => onOpenSource(row.content_key, title)} disabled={isLoading}>Edit source</StudioButton>
                </article>
              );
            })}
          </div>
        </section>
      )}
    </section>
  );
}
