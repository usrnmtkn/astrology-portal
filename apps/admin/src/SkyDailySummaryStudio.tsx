import { importedSkySummary } from "./skySummaryImportedCopy";
import { useMemo, useState } from "react";
import { skyDailySummaryFields, skySummarySigns, type SkySummaryField } from "../../web/src/content/skyDailySummaryCatalog";

import { buildSkySummaryComposition, type SummaryCompositionRow, type SummaryCompositionDraft } from "./skySummaryComposition";
export function SkyDailySummaryStudio({ rows, onEdit, busy, draftCopy }: {
  rows: SummaryCompositionRow[];
  draftCopy?: SummaryCompositionDraft | null;
  onEdit: (field: SkySummaryField) => void;
  busy: boolean;
}) {
  const [sunSign, setSunSign] = useState("Virgo");
  const [moonSign, setMoonSign] = useState("Cancer");
  const [copyView, setCopyView] = useState("working");
  const composition = useMemo(() => buildSkySummaryComposition(sunSign, moonSign, rows, copyView === "working", draftCopy), [sunSign, moonSign, rows, copyView, draftCopy]);
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState("all");
  const visible = skyDailySummaryFields.filter(field => (group === "all" || field.group === group)
    && `${field.label} ${field.body} ${importedSkySummary(field.key) ?? ""} ${rows.find(row => row.content_key === field.key)?.body ?? ""}`.toLowerCase().includes(query.toLowerCase()));
  return <section className="admin-daily-glance-studio" aria-label="Daily Sky Summary editor">
    <header className="admin-section-heading-row">
      <div>
        <p className="admin-eyebrow">Sky Write-ups</p>
        <h3>Daily Sky Summary</h3>
        <p>Edit the wording in the paragraph at the top of Sky. Signs, degrees, planet names, and timing come from the calculated sky.</p>
        <p>Sun and Moon summaries continue the placement sentence; enter the continuation without a final period. If no summary is published or included in the app, Sky shows the placement alone. Save keeps changes in Draft; Publish to app makes them live.</p>
      </div>
    </header>
    <section className="admin-template-reader-drilldown admin-sky-summary-composition" aria-label="Sun and Moon composition map">
      <header className="admin-section-heading-row">
        <div>
          <h4>Sun and Moon together</h4>
          <p>Choose example signs to read their summaries together. This previews the opening paragraph, with degrees omitted.</p>
        </div>
      </header>
      <div className="admin-daily-glance-context-form">
        <label><span>Sun sign</span><select aria-label="Composition Sun sign" value={sunSign} onChange={event => setSunSign(event.target.value)}>
          {skySummarySigns.map(sign => <option key={sign}>{sign}</option>)}
        </select></label>
        <label><span>Moon sign</span><select aria-label="Composition Moon sign" value={moonSign} onChange={event => setMoonSign(event.target.value)}>
          {skySummarySigns.map(sign => <option key={sign}>{sign}</option>)}
        </select></label>
        <label><span>Copy to preview</span><select aria-label="Composition copy view" value={copyView} onChange={event => setCopyView(event.target.value)}>
          <option value="working">Working drafts</option><option value="reader">Current reader copy</option>
        </select></label>
      </div>
      <div className="admin-composition-variable-legend" aria-label="Composition color key">
        <span className="variable-fact">Example placement</span><span className="variable-copy">Editable summary</span><span>Plain text: sentence template</span>
      </div>
      {composition.errors.length ? <div role="alert">{composition.errors.map(error => <p key={error}>{error}</p>)}</div> : (
        <div className="admin-template-reader-surface">
          <div className="admin-composition-preview-chrome"><span>Sun + Moon</span><span>{copyView === "working" ? "Working preview" : "Reader preview"}</span></div>
          <div className="admin-template-reader-copy">
            <section className="admin-composition-preview-field field-body">
              <p aria-label="Combined Sun and Moon preview">{composition.parts.map((part, index) => {
                const source = composition.sources.find(source => source.field.key === part.sourceKey);
                if (source) return <a href={`#exact-content?q=${encodeURIComponent(source.field.key)}`} key={index} aria-disabled={busy} className="admin-composition-variable admin-template-reader-variable variable-copy"
                  aria-label={`Edit ${source.field.label} summary`} onClick={event => { event.preventDefault(); if (!busy) onEdit(source.field); }}>{part.text}</a>;
                if (part.action) return <span key={index} className="admin-composition-variable variable-fact" title="Example placement">{part.text}</span>;
                return <span key={index}>{part.text}</span>;
              })}</p>
            </section>
          </div>
        </div>
      )}
      <div className="admin-editor-guidance" aria-label="Composition sources">
        {composition.sources.map(source => <div key={source.body}>
          <strong>{source.field.label}</strong><p>{source.status}{source.emptyWorkingCopy ? ". Empty working copy; the preview uses the app fallback." : ""}</p>
          <button type="button" disabled={busy} onClick={() => onEdit(source.field)}>Edit {source.body === "sun" ? "Sun" : "Moon"} source</button>
        </div>)}
        <p>The sentence template joins Sun and Moon with “while the Moon moves through”, adding each summary when available.</p>
        <p>Editing the source updates the working preview. Publishing remains a separate action.</p>
      </div>
    </section>
    <div className="admin-content-filters">
      <label><span>Summary section</span><select aria-label="Summary section" value={group} onChange={event => setGroup(event.target.value)}>
        <option value="all">All summary fields</option>
        {["Sun summaries", "Moon summaries", "Timing and retrogrades"].map(value => <option key={value}>{value}</option>)}
      </select></label>
      <label><span>Search summary wording</span><input aria-label="Search summary wording" value={query} onChange={event => setQuery(event.target.value)} /></label>
    </div>
    <div className="admin-daily-glance-pair-list" aria-label="Daily Sky Summary fields">
      {visible.map(field => {
        const saved = rows.find(row => row.content_key === field.key);
        return <article key={field.key} aria-label={field.label}>
          <div>
            <strong>{field.label}</strong>
            <p>{saved?.body ?? importedSkySummary(field.key) ?? (field.body || "No summary added. Sky shows the calculated placement.")}</p>
            <small>{saved ? `Saved ${saved.status.toLowerCase()}` : importedSkySummary(field.key) !== undefined ? "Supplied working copy" : field.body ? "Current app copy" : "Optional summary"}</small>
            {field.allowedSlots.length > 0 && <small> · Calculated fields: {field.allowedSlots.map(slot => `{${slot}}`).join(", ")}</small>}
          </div>
          <button type="button" disabled={busy} onClick={() => onEdit(field)}>Edit wording</button>
        </article>;
      })}
      {visible.length === 0 && <p className="admin-empty">No summary fields match this search.</p>}
    </div>
  </section>;
}
