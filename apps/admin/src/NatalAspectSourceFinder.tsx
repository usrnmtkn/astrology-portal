import {
  natalAspectDisplayTitle,
  natalAspectMatchesSelection,
  natalAspectSelectionOptions,
  parseNatalAspectContentKey,
  type NatalAspectSelection
} from "./natalAspectSources";

type PreviewRow = {
  body: string | null;
  content_key: string;
  headline: string | null;
  status: string;
  summary: string | null;
};

type Props = {
  aspect: string;
  first: string;
  isLoading: boolean;
  onOpenSource: (contentKey: string, label: string) => void;
  onSelectionChange: (next: Partial<NatalAspectSelection>) => void;
  rows: PreviewRow[];
  second: string;
};

function titleCase(value: string) {
  return value.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

function statusLabel(status: string) {
  if (status === "LIVE") return "Published";
  if (status === "REVIEWED") return "Reviewed";
  if (status === "ARCHIVED") return "Archived";
  if (status === "ERROR") return "Error";
  return "Draft";
}

function previewForRow(row: PreviewRow) {
  return row.body?.trim() || row.summary?.trim() || row.headline?.trim() || "";
}

export default function NatalAspectSourceFinder({
  aspect,
  first,
  isLoading,
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

  return (
    <section className="admin-natal-placement-finder" aria-label="Find natal aspect source writing">
      <div className="admin-natal-placement-finder-heading">
        <div>
          <p className="admin-eyebrow">Natal aspect source finder</p>
          <h3>{selectedTitle}</h3>
          <p>Choose two natal planets or points and their aspect. This page shows the exact pair-specific writing used on natal chart pages.</p>
        </div>
        <p className="admin-natal-placement-key">
          <span>Exact saved passages</span>
          <code>{isLoading && exactRows.length === 0 ? "Loading…" : exactRows.length}</code>
        </p>
      </div>

      <div className="admin-natal-placement-selectors">
        <label>
          <span>1. Planet or point</span><small>Either natal body</small>
          <select aria-label="Natal aspect planet or point" value={first} onChange={(event) => onSelectionChange({ first: event.target.value })}>
            <option value="">Choose planet or point</option>
            {options.first.map((item) => <option value={item} key={item}>{titleCase(item)}</option>)}
          </select>
        </label>
        <label>
          <span>2. Aspect</span><small>How the two placements interact</small>
          <select aria-label="Natal aspect type" value={aspect} onChange={(event) => onSelectionChange({ aspect: event.target.value })}>
            <option value="">Choose aspect</option>
            {options.aspects.map((item) => <option value={item} key={item}>{titleCase(item)}</option>)}
          </select>
        </label>
        <label>
          <span>3. Other planet or point</span><small>Key order does not matter</small>
          <select aria-label="Other natal aspect planet or point" value={second} onChange={(event) => onSelectionChange({ second: event.target.value })}>
            <option value="">Choose planet or point</option>
            {options.second.map((item) => <option value={item} key={item}>{titleCase(item)}</option>)}
          </select>
        </label>
      </div>

      {isLoading && exactRows.length === 0 && (
        <div className="admin-empty-state" role="status"><strong>Loading exact natal aspect passages…</strong></div>
      )}

      {!isLoading && !hasSelection && (
        <p className="admin-natal-placement-prompt">Select any value to narrow the {exactRows.length} exact natal aspect passages. Select all three values to open one exact reader passage.</p>
      )}

      {!isLoading && hasSelection && matches.length === 0 && (
        <div className="admin-empty-state" role="status">
          <strong>No exact passage matches this selection.</strong>
          <p>Try a different planet, point, or aspect. Generic aspect copy is intentionally excluded because the reader requires an exact pair.</p>
        </div>
      )}

      {hasSelection && matches.length > 0 && (
        <section className="admin-natal-source-group" aria-label="Matching natal aspect passages">
          <header>
            <h3>{matches.length === 1 ? "Exact reader passage" : `${matches.length} matching passages`}</h3>
            <p>Each result opens the saved source row in the standard Content Studio editor.</p>
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
                      <span className={`ui-pill admin-status status-${row.status.toLowerCase()}`}>{statusLabel(row.status)}</span>
                    </div>
                    <p>Exact natal aspect writing for the reader’s birth chart.</p>
                    <p className="admin-natal-source-key"><span>Source key</span><code>{row.content_key}</code></p>
                    {preview && <blockquote>{preview}</blockquote>}
                  </div>
                  <button type="button" onClick={() => onOpenSource(row.content_key, title)} disabled={isLoading}>Edit source</button>
                </article>
              );
            })}
          </div>
        </section>
      )}
    </section>
  );
}
