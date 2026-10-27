import { sunSeasonHasRetrograde } from "../../web/src/content/skySunSeason";
import { StudioButton, StudioInput } from "./StudioControls";
import { AdminDisclosureSummary, AdminSelect } from "./AdminNativeControls";
import { Stack, Text } from "./studio-ds/primitives";
import { containedDisclosure } from "./studio-ds/recipes";
import { suppliedSkySummaryCandidate, loadSkySummarySourceBank, type SkySummarySourceBank } from "./skySummarySourceBank";
import { loadSkyMoonSummarySources, type SkyMoonSummarySources } from "./skyMoonSummarySources";
import { moonEventNames, type MoonSummaryKind } from "../../web/src/content/skyMoonSummary";
import SkyWritingSystemDetails from "./SkyWritingSystemDetails";
import { importedSkySummary } from "./skySummaryImportedCopy";
import ContentLiveStatusBadge from "./ContentLiveStatus";
import { useEffect, useRef, useState } from "react";
import { currentSkySummaryWording, skyDailySummaryFields, skyIngressBodies, skyIngressSummaryFields, skySummarySigns, type SkySummaryField } from "../../web/src/content/skyDailySummaryCatalog";
import { publishedIngressTldr } from "./skyIngressTldrSources";

import type { SummaryCompositionRow } from "./skySummaryComposition";
import SkySummaryEditingWorkspace, { type SummaryEditingActions } from './SkySummaryEditingWorkspace';
export function SkyDailySummaryStudio({ rows, onEdit, busy, focusSunSummaries = false, editingActions }: {
  rows: SummaryCompositionRow[];
  onEdit: (field: SkySummaryField, initialBody?: string) => void;
  busy: boolean;
  focusSunSummaries?: boolean;
  editingActions?: SummaryEditingActions;
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
  const [sunVersion, setSunVersion] = useState("standard");
  const [sunFilter, setSunFilter] = useState("all");
  const [moonKind, setMoonKind] = useState<MoonSummaryKind>("regular");
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState(focusSunSummaries ? "Sun summaries" : "all");
  const summarySection = useRef<HTMLSelectElement>(null);
  useEffect(() => {
    if (!focusSunSummaries) return;
    setGroup("Sun summaries");
    setQuery("");
  }, [focusSunSummaries]);
  useEffect(() => {
    if (!focusSunSummaries || busy) return;
    const frame = requestAnimationFrame(() => {
      summarySection.current?.focus({ preventScroll: true });
      summarySection.current?.scrollIntoView({ block: "center" });
    });
    return () => cancelAnimationFrame(frame);
  }, [focusSunSummaries, busy]);
  const [ingressPlanet, setIngressPlanet] = useState("Mercury");
  const [ingressSign, setIngressSign] = useState("Libra");
  const isIngress = group === "Ingress TLDRs";
  const ingressSource = isIngress ? publishedIngressTldr(rows, ingressPlanet, ingressSign) : undefined;
  const visible = (isIngress ? skyIngressSummaryFields.filter(field => field.label === `${ingressPlanet} enters ${ingressSign}`) : skyDailySummaryFields).filter(field => field.group !== "Assembly templates" && field.readerEnabled !== false && (group === "all" || field.group === group) && (field.group !== "Moon summaries" || field.key.endsWith(`/${moonKind}`))
    && (field.group !== "Sun summaries" || field.key.endsWith("/ruler-retrograde") === (sunVersion === "retrograde") && (sunFilter === "all" || field.key.split("/")[3] === sunFilter.toLowerCase()))
    && `${field.label} ${field.body} ${importedSkySummary(field.key) ?? ""} ${rows.find(row => row.content_key === field.key)?.body ?? ""}`.toLowerCase().includes(query.toLowerCase()));
  return <section className="admin-daily-glance-studio" aria-label="Daily Sky Summary editor">
    <header className="admin-section-heading-row">
      <Stack gap="sm">
        <Text size="meta" tone="secondary">Sky Write-ups</Text>
        <h3>Daily Sky Summary</h3>
        <Text size="body">Edit shared wording and compare it with the reader preview.</Text>
      </Stack>
    </header>
    {editingActions && <SkySummaryEditingWorkspace key={focusSunSummaries ? 'sun' : 'summary'} rows={rows} busy={busy} focusSunSummaries={focusSunSummaries} actions={editingActions} />}
    <details className="admin-workspace-details" open={editingActions ? undefined : true}>
    <AdminDisclosureSummary>Sources and writing system</AdminDisclosureSummary>
    <SkyWritingSystemDetails system="summary" />
    <div className="admin-content-filters admin-filter-form">
      <label><span>Summary section</span><AdminSelect ref={summarySection} aria-label="Summary section" value={group} onChange={event => setGroup(event.target.value)}>
        <option value="all">Sun, Moon, and timing</option>
        {["Sun summaries", "Moon summaries", "Timing and retrogrades", "Ingress TLDRs"].map(value => <option key={value}>{value}</option>)}
      </AdminSelect></label>
      {group === "Sun summaries" && <>
        <label><span>Sun sign</span><AdminSelect aria-label="Sun passage sign" value={sunFilter} onChange={event => { setSunFilter(event.target.value); if (!sunSeasonHasRetrograde(event.target.value) && event.target.value !== "all") setSunVersion("standard"); }}>
          <option value="all">All signs</option>{skySummarySigns.map(sign => <option key={sign}>{sign}</option>)}
        </AdminSelect></label>
        <label><span>Version</span><AdminSelect aria-label="Sun passage version" value={sunVersion} onChange={event => setSunVersion(event.target.value)}>
          <option value="standard">Standard</option>
          {(sunFilter === "all" || sunSeasonHasRetrograde(sunFilter)) && <option value="retrograde">Ruler retrograde</option>}
        </AdminSelect></label>
      </>}
      {(group === 'all' || group === 'Moon summaries') && <label><span>Moon event</span><AdminSelect aria-label="Source Moon event" value={moonKind} onChange={event => setMoonKind(event.target.value as MoonSummaryKind)}>{Object.entries(moonEventNames).map(([kind, label]) => <option key={kind} value={kind}>{label}</option>)}</AdminSelect></label>}
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
            <p>{(saved?.body ? currentSkySummaryWording(field.key, saved.body) : undefined) ?? ingressSource?.summary ?? (field.body || importedSkySummary(field.key) || (field.key.endsWith("/ruler-retrograde") ? "No retrograde version. Readers use Standard." : isIngress ? "No ingress TLDR added here. Add your wording, or open an existing ingress write-up to edit its TLDR." : "No summary added. Sky shows the calculated placement."))}</p>
            {source && <p><span>Source status: {saved?.body && saved.body !== source.body ? "Owner edit" : source.status}</span>{source.sources.map(url => <span key={url}> · <a href={url} target="_blank" rel="noreferrer">Source URL</a></span>)}</p>}
            <ContentLiveStatusBadge row={saved ?? ingressSource ?? (isIngress ? {} : { id: `builtin:${field.key}` })} />
            {candidate && candidate.body !== currentBody && <details className={`${containedDisclosure} admin-workspace-details`}>
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
    </details>
  </section>;
}
