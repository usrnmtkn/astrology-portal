import { StudioButton, StudioInput } from "./StudioControls";
import { AdminDisclosureSummary, AdminSelect } from "./AdminNativeControls";
import { skySummaryOpeningKey } from "../../web/src/content/skyDailySummary";
import { suppliedSkySummaryCandidate, loadSkySummarySourceBank, type SkySummarySourceBank } from "./skySummarySourceBank";
import { pairedSummarySign } from "../../web/src/content/skySummaryGeometry";
import { loadSkyMoonSummarySources, type SkyMoonSummarySources } from "./skyMoonSummarySources";
import { moonEventNames, type MoonSummaryKind } from "../../web/src/content/skyMoonSummary";
import { SkyInlineTemplate } from "./SkyInlineTemplate";
import { SkySummaryAssemblyStudio } from "./SkySummaryAssemblyStudio";
import SkyWritingSystemDetails from "./SkyWritingSystemDetails";
import { importedSkySummary } from "./skySummaryImportedCopy";
import ContentLiveStatusBadge from "./ContentLiveStatus";
import { useEffect, useMemo, useState } from "react";
import { currentSkySummaryWording, skyDailySummaryFields, skyIngressBodies, skyIngressSummaryFields, skySummarySigns, type SkySummaryField } from "../../web/src/content/skyDailySummaryCatalog";
import { publishedIngressTldr } from "./skyIngressTldrSources";

import { publishedSkySummaryContent, buildSkySummaryComposition, type SummaryCompositionRow } from "./skySummaryComposition";
export function SkyDailySummaryStudio({ rows, onEdit, busy }: {
  rows: SummaryCompositionRow[];
  onEdit: (field: SkySummaryField, initialBody?: string) => void;
  busy: boolean;
}) {
  const [moonSources, setMoonSources] = useState<SkyMoonSummarySources>();
  const [sourceBank, setSourceBank] = useState<SkySummarySourceBank>();
  const [bankError, setBankError] = useState("");
  const [bankAttempt, setBankAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setBankError("");
    void Promise.all([loadSkySummarySourceBank(), loadSkyMoonSummarySources()]).then(([bank, moon]) => {
      if (active) { setSourceBank(bank); setMoonSources(moon); }
    })
      .catch(() => { if (active) setBankError("Supplied summary wording could not load."); });
    return () => { active = false; };
  }, [bankAttempt]);
  const [sunSign, setSunSign] = useState("Virgo");
  const [moonSign, setMoonSign] = useState("Cancer");
  const [moonKind, setMoonKind] = useState<MoonSummaryKind>("regular");
  const composition = useMemo(() => buildSkySummaryComposition(sunSign, moonSign, rows, false, null, moonKind), [sunSign, moonSign, rows, moonKind]);
  const openingKey = skySummaryOpeningKey(sunSign, moonSign, publishedSkySummaryContent(rows));
  const openingField = skyDailySummaryFields.find(field => field.key.endsWith(`/assembly/${openingKey}`))!;
  const openingBody = publishedSkySummaryContent(rows).get(openingField.key)?.body ?? openingField.body;
  const slots = Object.fromEntries(composition.sources.map(source => [`${source.body}Summary`,
    <a href={`#exact-content?q=${encodeURIComponent(source.field.key)}`} aria-disabled={busy} className="admin-composition-variable admin-template-reader-variable variable-copy"
      aria-label={`Edit ${source.field.label} summary`} onClick={event => { event.preventDefault(); if (!busy) onEdit(source.field); }}>{composition.parts.filter(part => part.sourceKey === source.field.key).map(part => part.text).join("")}</a>
  ]));
  for (const [body, name, sign] of [["sun", "Sun", sunSign], ["moon", moonEventNames[moonKind], moonSign]]) {
    slots[`${body}Name`] = <span className="admin-composition-variable variable-fact" title="Calculated planet">{name}</span>;
    slots[`${body}Sign`] = <span className="admin-composition-variable variable-fact" title="Calculated sign">{sign}</span>;
    slots[`${body}Degree`] = <span className="admin-summary-omitted-variable" aria-label={`${name} degree, omitted in this example`} />;
  }
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState("all");
  const [ingressPlanet, setIngressPlanet] = useState("Mercury");
  const [ingressSign, setIngressSign] = useState("Libra");
  const isIngress = group === "Ingress TLDRs";
  const ingressSource = isIngress ? publishedIngressTldr(rows, ingressPlanet, ingressSign) : undefined;
  const visible = (isIngress ? skyIngressSummaryFields.filter(field => field.label === `${ingressPlanet} enters ${ingressSign}`) : skyDailySummaryFields).filter(field => field.group !== "Assembly templates" && field.readerEnabled !== false && (group === "all" || field.group === group) && (field.group !== "Moon summaries" || field.key.endsWith(`/${moonKind}`))
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
    <SkyWritingSystemDetails system="summary" />
    <SkySummaryAssemblyStudio rows={rows} onEdit={onEdit} busy={busy} sunSign={sunSign} moonSign={moonSign} openingSlots={slots} moonKind={moonKind} />
    <section className="admin-template-reader-drilldown admin-sky-summary-composition studio-surface" aria-label="Sun and Moon composition map">
      <header className="admin-section-heading-row">
        <div>
          <h4>Sun and Moon together</h4>
          <p>Choose example signs to read the app’s published summaries together. This previews the opening paragraph, with degrees omitted.</p>
        </div>
      </header>
      <div className="admin-daily-glance-context-form">
        <label><span>Sun sign</span><AdminSelect aria-label="Composition Sun sign" value={sunSign} onChange={event => { setSunSign(event.target.value); if (moonKind !== "regular") setMoonSign(pairedSummarySign(event.target.value, moonKind)); }}>
          {skySummarySigns.map(sign => <option key={sign}>{sign}</option>)}
        </AdminSelect></label>
        <label><span>Moon sign</span><AdminSelect aria-label="Composition Moon sign" value={moonSign} onChange={event => { setMoonSign(event.target.value); if (moonKind !== "regular") setSunSign(pairedSummarySign(event.target.value, moonKind)); }}>
          {skySummarySigns.map(sign => <option key={sign}>{sign}</option>)}
        </AdminSelect></label>
        <label><span>Moon event</span><AdminSelect aria-label="Composition Moon event" value={moonKind} onChange={event => { const kind = event.target.value as MoonSummaryKind; setMoonKind(kind); if (kind !== "regular") setMoonSign(pairedSummarySign(sunSign, kind)); }}>
          {Object.entries(moonEventNames).map(([kind, name]) => <option key={kind} value={kind}>{name}</option>)}
        </AdminSelect></label>
      </div>
      {moonKind !== "regular" && <p role="status">{moonKind === "newMoon" || moonKind === "solarEclipse" ? "The Sun and Moon share a sign at this event." : "The Sun and Moon occupy opposite signs at this event."} Changing either sign updates the other.</p>}
      <div className="admin-composition-variable-legend" aria-label="Composition color key">
        <span className="variable-fact">Example placement</span><span className="variable-copy">Editable summary</span><span>White words: click to edit</span>
      </div>
      {composition.errors.length ? <div role="alert">{composition.errors.map(error => <p key={error}>{error}</p>)}</div> : (
        <div className="admin-template-reader-surface">
          <div className="admin-composition-preview-chrome"><span>Sun + Moon</span><span>Reader preview</span></div>
          <div className="admin-template-reader-copy">
            <section className="admin-composition-preview-field field-body">
              {composition.sources.some(source => !source.copy) ? <p aria-label="Combined Sun and Moon preview">{composition.parts.map((part, index) => <span key={index} className={part.action ? "admin-composition-variable variable-fact" : undefined}>{part.text}</span>)}</p>
                : <SkyInlineTemplate key={openingBody} field={openingField} body={openingBody} slots={slots} onEdit={onEdit} busy={busy} label="Combined Sun and Moon preview" />}
            </section>
          </div>
        </div>
      )}
      <div className="admin-editor-guidance" aria-label="Composition sources">
        {composition.sources.map(source => <div key={source.body}>
          <strong>{source.field.label}</strong>{moonSources?.rows.filter(row => row.key === source.field.key).map(row => <p key={row.key}>Source status: {source.copy !== row.body ? "Owner edit" : row.status}{row.sources.map(url => <span key={url}> · <a href={url} target="_blank" rel="noreferrer">Source URL</a></span>)}</p>)}<p><ContentLiveStatusBadge row={source.statusRow} unsaved={source.unsaved} />{source.emptyWorkingCopy ? " · Empty working copy; the preview uses the app fallback." : ""}</p>
          <StudioButton type="button" disabled={busy} onClick={() => onEdit(source.field)}>Edit {source.body === "sun" ? "Sun" : "Moon"} source</StudioButton>
        </div>)}
        <p>The opening uses the published assembly template and the summaries selected above.</p>
        <p>Click the white words or punctuation to edit the template. Click a green summary to edit its source. Changes reach the app only after Save & publish.</p>
      </div>
    </section>
    <div className="admin-content-filters">
      <label><span>Summary section</span><AdminSelect aria-label="Summary section" value={group} onChange={event => setGroup(event.target.value)}>
        <option value="all">Sun, Moon, and timing</option>
        {["Sun summaries", "Moon summaries", "Timing and retrogrades", "Ingress TLDRs"].map(value => <option key={value}>{value}</option>)}
      </AdminSelect></label>
      {isIngress && <>
        <label><span>Ingress planet or point</span><AdminSelect aria-label="Ingress planet or point" value={ingressPlanet} onChange={event => setIngressPlanet(event.target.value)}>
          {skyIngressBodies.map(planet => <option key={planet}>{planet}</option>)}
        </AdminSelect></label>
        <label><span>Ingress sign</span><AdminSelect aria-label="Ingress sign" value={ingressSign} onChange={event => setIngressSign(event.target.value)}>
          {skySummarySigns.map(sign => <option key={sign}>{sign}</option>)}
        </AdminSelect></label>
      </>}
      <label><span>Search summary wording</span><StudioInput aria-label="Search summary wording" value={query} onChange={event => setQuery(event.target.value)} /></label>
    </div>
    {bankError && <p role="alert">{bankError} <StudioButton type="button" onClick={() => setBankAttempt(value => value + 1)}>Retry supplied wording</StudioButton></p>}
    <div className="admin-daily-glance-pair-list" aria-label="Daily Sky Summary fields">
      {visible.map(field => {
        const saved = rows.find(row => row.content_key === field.key);
        const source = moonSources?.rows.find(row => row.key === field.key);
        const candidate = suppliedSkySummaryCandidate(field.key, sourceBank);
        const currentBody = saved?.body ?? field.body;
        return <article key={field.key} aria-label={field.label}>
          <div>
            <strong>{field.label}</strong>
            <p>{(saved?.body ? currentSkySummaryWording(field.key, saved.body) : undefined) ?? ingressSource?.summary ?? (field.body || importedSkySummary(field.key) || (isIngress ? "No ingress TLDR added here. Add your wording, or open an existing ingress write-up to edit its TLDR." : "No summary added. Sky shows the calculated placement."))}</p>
            {source && <p><span>Source status: {saved?.body && saved.body !== source.body ? "Owner edit" : source.status}</span>{source.sources.map(url => <span key={url}> · <a href={url} target="_blank" rel="noreferrer">Source URL</a></span>)}</p>}
            <ContentLiveStatusBadge row={saved ?? ingressSource ?? (isIngress ? {} : { id: `builtin:${field.key}` })} />
            {candidate && candidate.body !== currentBody && <details className="admin-workspace-details">
              <AdminDisclosureSummary>Review supplied wording</AdminDisclosureSummary>
              <p>{candidate.body}</p>
              <p>This supplied version is not published. Open it to review the complete wording, then Save draft or Save &amp; publish.</p>
              <StudioButton type="button" disabled={busy || saved?.inventory_only} onClick={() => onEdit(field, candidate.body)}>Open supplied wording</StudioButton>
            </details>}
            {field.allowedSlots.length > 0 && <small> · Calculated fields: {field.allowedSlots.map(slot => `{${slot}}`).join(", ")}</small>}
          </div>
          <StudioButton type="button" disabled={busy} onClick={() => onEdit(!saved && ingressSource ? { ...field, key: ingressSource.content_key } : field)}>{!saved && ingressSource ? "Edit existing write-up" : "Edit wording"}</StudioButton>
        </article>;
      })}
      {visible.length === 0 && <p className="admin-empty">No summary fields match this search.</p>}
    </div>
  </section>;
}
