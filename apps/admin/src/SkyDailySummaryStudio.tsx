import { SkySummaryAssemblyStudio } from "./SkySummaryAssemblyStudio";
import { importedSkySummary } from "./skySummaryImportedCopy";
import ContentLiveStatusBadge from "./ContentLiveStatus";
import { useMemo, useState } from "react";
import { currentSkySummaryWording, skyDailySummaryFields, skyIngressBodies, skyIngressSummaryFields, skySummarySigns, type SkySummaryField } from "../../web/src/content/skyDailySummaryCatalog";
import { publishedIngressTldr } from "./skyIngressTldrSources";

import { buildSkySummaryComposition, type SummaryCompositionRow } from "./skySummaryComposition";
export function SkyDailySummaryStudio({ rows, onEdit, busy }: {
  rows: SummaryCompositionRow[];
  onEdit: (field: SkySummaryField, initialBody?: string) => void;
  busy: boolean;
}) {
  const [sunSign, setSunSign] = useState("Virgo");
  const [moonSign, setMoonSign] = useState("Cancer");
  const composition = useMemo(() => buildSkySummaryComposition(sunSign, moonSign, rows, false), [sunSign, moonSign, rows]);
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState("all");
  const [ingressPlanet, setIngressPlanet] = useState("Mercury");
  const [ingressSign, setIngressSign] = useState("Libra");
  const isIngress = group === "Ingress TLDRs";
  const ingressSource = isIngress ? publishedIngressTldr(rows, ingressPlanet, ingressSign) : undefined;
  const visible = (isIngress ? skyIngressSummaryFields.filter(field => field.label === `${ingressPlanet} enters ${ingressSign}`) : skyDailySummaryFields).filter(field => field.group !== "Assembly templates" && field.readerEnabled !== false && (group === "all" || field.group === group)
    && `${field.label} ${field.body} ${importedSkySummary(field.key) ?? ""} ${rows.find(row => row.content_key === field.key)?.body ?? ""}`.toLowerCase().includes(query.toLowerCase()));
  return <section className="admin-daily-glance-studio" aria-label="Daily Sky Summary editor">
    <header className="admin-section-heading-row">
      <div>
        <p className="admin-eyebrow">Sky Write-ups</p>
        <h3>Daily Sky Summary</h3>
        <p>Edit the wording in the paragraph at the top of Sky. Signs, degrees, planet names, and timing come from the calculated sky.</p>
        <p>Start Sun and Moon summaries with a finite verb, such as “turns” or “brings”, without a final period. If no summary is published or included in the app, Sky shows the placement alone. Save & publish makes your edits live. Save draft keeps your changes for later.</p>
      </div>
    </header>
    <SkySummaryAssemblyStudio rows={rows} onEdit={onEdit} busy={busy} sunSign={sunSign} moonSign={moonSign} />
    <section className="admin-template-reader-drilldown admin-sky-summary-composition" aria-label="Sun and Moon composition map">
      <header className="admin-section-heading-row">
        <div>
          <h4>Sun and Moon together</h4>
          <p>Choose example signs to read the app’s published summaries together. This previews the opening paragraph, with degrees omitted.</p>
        </div>
      </header>
      <div className="admin-daily-glance-context-form">
        <label><span>Sun sign</span><select aria-label="Composition Sun sign" value={sunSign} onChange={event => setSunSign(event.target.value)}>
          {skySummarySigns.map(sign => <option key={sign}>{sign}</option>)}
        </select></label>
        <label><span>Moon sign</span><select aria-label="Composition Moon sign" value={moonSign} onChange={event => setMoonSign(event.target.value)}>
          {skySummarySigns.map(sign => <option key={sign}>{sign}</option>)}
        </select></label>
      </div>
      <div className="admin-composition-variable-legend" aria-label="Composition color key">
        <span className="variable-fact">Example placement</span><span className="variable-copy">Editable summary</span><button type="button" disabled={busy} onClick={() => onEdit(skyDailySummaryFields.find(field => field.key.endsWith("/assembly/opening"))!)}>Edit assembly template</button>
      </div>
      {composition.errors.length ? <div role="alert">{composition.errors.map(error => <p key={error}>{error}</p>)}</div> : (
        <div className="admin-template-reader-surface">
          <div className="admin-composition-preview-chrome"><span>Sun + Moon</span><span>Reader preview</span></div>
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
          <strong>{source.field.label}</strong><p><ContentLiveStatusBadge row={source.statusRow} unsaved={source.unsaved} />{source.emptyWorkingCopy ? " · Empty working copy; the preview uses the app fallback." : ""}</p>
          <button type="button" disabled={busy} onClick={() => onEdit(source.field)}>Edit {source.body === "sun" ? "Sun" : "Moon"} source</button>
        </div>)}
        <p>The opening uses the published assembly template and the summaries selected above.</p>
        <p>This preview uses the app’s published copy. Draft edits stay in the editor until published.</p>
      </div>
    </section>
    <div className="admin-content-filters">
      <label><span>Summary section</span><select aria-label="Summary section" value={group} onChange={event => setGroup(event.target.value)}>
        <option value="all">Sun, Moon, and timing</option>
        {["Sun summaries", "Moon summaries", "Timing and retrogrades", "Ingress TLDRs"].map(value => <option key={value}>{value}</option>)}
      </select></label>
      {isIngress && <>
        <label><span>Ingress planet or point</span><select aria-label="Ingress planet or point" value={ingressPlanet} onChange={event => setIngressPlanet(event.target.value)}>
          {skyIngressBodies.map(planet => <option key={planet}>{planet}</option>)}
        </select></label>
        <label><span>Ingress sign</span><select aria-label="Ingress sign" value={ingressSign} onChange={event => setIngressSign(event.target.value)}>
          {skySummarySigns.map(sign => <option key={sign}>{sign}</option>)}
        </select></label>
      </>}
      <label><span>Search summary wording</span><input aria-label="Search summary wording" value={query} onChange={event => setQuery(event.target.value)} /></label>
    </div>
    <div className="admin-daily-glance-pair-list" aria-label="Daily Sky Summary fields">
      {visible.map(field => {
        const saved = rows.find(row => row.content_key === field.key);
        return <article key={field.key} aria-label={field.label}>
          <div>
            <strong>{field.label}</strong>
            <p>{(saved?.body ? currentSkySummaryWording(field.key, saved.body) : undefined) ?? ingressSource?.summary ?? (field.body || importedSkySummary(field.key) || (isIngress ? "No ingress TLDR added here. Add your wording, or open an existing ingress write-up to edit its TLDR." : "No summary added. Sky shows the calculated placement."))}</p>
            <ContentLiveStatusBadge row={saved ?? ingressSource ?? (isIngress ? {} : { id: `builtin:${field.key}` })} />
            {field.allowedSlots.length > 0 && <small> · Calculated fields: {field.allowedSlots.map(slot => `{${slot}}`).join(", ")}</small>}
          </div>
          <button type="button" disabled={busy} onClick={() => onEdit(!saved && ingressSource ? { ...field, key: ingressSource.content_key } : field)}>{!saved && ingressSource ? "Edit existing write-up" : "Edit wording"}</button>
        </article>;
      })}
      {visible.length === 0 && <p className="admin-empty">No summary fields match this search.</p>}
    </div>
  </section>;
}
