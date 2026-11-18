import { StudioButton, StudioInput, StudioTextarea } from "./StudioControls";
import { AdminDisclosureSummary, AdminSelect } from "./AdminNativeControls";
import { moonEventNames, type MoonSummaryKind } from "../../web/src/content/skyMoonSummary";
import { AssemblySections } from './AssemblySections';
import { SkyInlineTemplate } from "./SkyInlineTemplate";
import { useRef, useState, type ReactNode } from "react";
import { skyAssemblyFields, skyDailySummaryFields, skySummaryTemplateErrors, type SkySummaryField } from "../../web/src/content/skyDailySummaryCatalog";
import { skyDailySummaryParts, skySummaryParagraphs } from "../../web/src/content/skyDailySummary";
import { publishedSkySummaryContent, type SummaryCompositionRow } from "./skySummaryComposition";

const layoutField = skyAssemblyFields.find(field => field.key.endsWith("/layout"))!;
const categories = ["exactAspectsSentence", "stationsSentence", "ingressesSentence"] as const;
const labels = { exactAspectsSentence: "Exact aspects", stationsSentence: "Stations", ingressesSentence: "Ingresses" };

const sectionTemplates: Record<string, { label: string; keys: string[] }> = {
  openingSentence: { label: 'Sun and Moon opening', keys: ['assembly/opening', 'assembly/openingSameSign', 'assembly/sunOnly', 'assembly/moonOnly'] },
  voidSentence: { label: 'Moon void of course', keys: ['void', 'voidRemaining'] },
  ingressesSentence: { label: 'Ingresses', keys: ['assembly/ingressesFirstOne', 'assembly/ingressesFirstMany', 'assembly/ingressesAlsoOne', 'assembly/ingressesAlsoMany'] },
  stationsSentence: { label: 'Stations', keys: skyAssemblyFields.filter(field => /\/stations?[A-Z]/u.test(field.key)).map(field => field.key.replace('cms/sky-daily-summary/', '')) },
  exactAspectsSentence: { label: 'Exact aspects', keys: skyAssemblyFields.filter(field => /\/aspects/u.test(field.key)).map(field => field.key.replace('cms/sky-daily-summary/', '')) },
  currentRetrogradesSentence: { label: 'Current retrogrades', keys: ['assembly/retrogrades', 'retrograde'] },
  seasonTransitionSentence: { label: 'Season transition', keys: ['seasonTransition', 'assembly/sunIngressBefore', 'assembly/sunIngressAfter'] },
  lunationSentence: { label: 'Lunation', keys: ['lunation', 'assembly/lunationToday', 'assembly/lunationAlsoToday'] }
};

export function SkySummaryAssemblyStudio({ rows, onEdit, busy, sunSign, moonSign, openingSlots, moonKind }: {
  rows: SummaryCompositionRow[]; onEdit: (field: SkySummaryField, initialBody?: string) => void;
  busy: boolean; sunSign: string; moonSign: string; openingSlots: Record<string, ReactNode>; moonKind: MoonSummaryKind;
}) {
  const layoutDetails = useRef<HTMLDetailsElement>(null);
  const layoutInput = useRef<HTMLTextAreaElement>(null);
  const sentenceSelect = useRef<HTMLSelectElement>(null);
  const sentenceDrafts = useRef(new Map<string, string>());
  const content = publishedSkySummaryContent(rows);
  const publishedLayout = content.get(layoutField.key)?.body ?? layoutField.body;
  const [editedLayout, setEditedLayout] = useState<string | null>(null);
  const layout = editedLayout ?? publishedLayout;
  const [paragraphSlots, setParagraphSlots] = useState<string[] | null>(null);
  const [selected, setSelected] = useState(skyAssemblyFields[1].key);
  const [aspectExamples, setAspectExamples] = useState("");
  const [stationExamples, setStationExamples] = useState("");
  const [stationDirection, setStationDirection] = useState<"direct" | "retrograde">("retrograde");
  const [stationOccurred, setStationOccurred] = useState(true);
  const [ingressExamples, setIngressExamples] = useState("");
  const [retrogrades, setRetrogrades] = useState("");
  const [voidRemaining, setVoidRemaining] = useState("");
  const [lunation, setLunation] = useState("none");
  const errors = skySummaryTemplateErrors(layoutField.key, layout);
  const templateFields = skyDailySummaryFields.filter(field => field !== layoutField && (paragraphSlots
    ? paragraphSlots.some(slot => sectionTemplates[slot]?.keys.includes(field.key.replace('cms/sky-daily-summary/', '')))
    : field.group === 'Assembly templates'));
  const selectedField = skyDailySummaryFields.find(field => field.key === selected)!;
  const examples = (text: string, prefix: string) => text.split(";").map(label => label.trim()).filter(Boolean).map((label, i) => ({ id: `${prefix}-${i}`, label }));
  // Explicit editor examples, never imported by the reader or used as calculated facts.
  const previewContent = new Map(content);
  previewContent.set(layoutField.key, { id: layoutField.key, contentKey: layoutField.key, body: layout,
    surface: "sky", mode: "feed", eventType: null, targetDate: null, headline: null, summary: null,
    sections: null, model: null, updatedAt: "", status: "LIVE" });
  const exampleTime = Date.now();
  const parts = skyDailySummaryParts({ sun: { sign: sunSign }, moon: { sign: moonSign }, moonIsVoid: Boolean(voidRemaining.trim()), voidRemainingLabel: voidRemaining.trim() || undefined,
    asOf: new Date(exampleTime).toISOString(),
    retrogradePlanets: retrogrades.split(";").map(name => name.trim()).filter(Boolean),
    exactAspects: examples(aspectExamples, "aspect"), stations: examples(stationExamples, "station").map(event => ({ ...event, direction: stationDirection,
      planet: event.label.match(new RegExp(`^(.+?) stations ${stationDirection} in `, "u"))?.[1],
      startsAt: new Date(exampleTime + (stationOccurred ? -60_000 : 60_000)).toISOString() })),
    ingresses: examples(ingressExamples, "ingress"),
    event: moonKind !== "regular" ? { name: moonEventNames[moonKind], sign: moonSign, countdown: "today", isToday: true, eclipseType: moonKind === "solarEclipse" ? "solar" : moonKind === "lunarEclipse" ? "lunar" : undefined } : lunation === "none" ? undefined : { name: "New Moon", sign: sunSign, countdown: "in 3 days", isToday: lunation === "today" }
  }, previewContent, { editorialPreview: true });
  const order = [...layout.matchAll(/\{(exactAspectsSentence|stationsSentence|ingressesSentence)\}/gu)].map(match => match[1]);
  function move(slot: string, offset: number) {
    const index = order.indexOf(slot), other = order[index + offset];
    if (!other) return;
    setEditedLayout(layout.replace(`{${slot}}`, "\u0000").replace(`{${other}}`, `{${slot}}`).replace("\u0000", `{${other}}`));
  }
  return <section className="admin-template-reader-drilldown admin-sky-summary-composition" aria-label="Full summary assembly">
    <header className="admin-section-heading-row"><div>
      <h4>Full summary template</h4>
      <p>Click the white words to edit a sentence around its protected variables. Edit the opening with the Sun and Moon examples below. Paragraph and event controls are available here too.</p>
    </div></header>
    <AssemblySections label="Sky summary paragraph order">
      {layout.split(/\n\s*\n/gu).filter(paragraph => paragraph.trim()).map((paragraph, index) => {
        const slots = [...paragraph.matchAll(/\{([^{}]+)\}/gu)].map(match => match[1]);
        const fields = skyDailySummaryFields.filter(field => slots.some(slot => sectionTemplates[slot]?.keys.includes(field.key.replace('cms/sky-daily-summary/', ''))));
        return <li key={index}><div><strong>Paragraph {index + 1}</strong><p>{slots.map(slot => sectionTemplates[slot]?.label ?? slot).join(' · ') || paragraph}</p></div>
          <StudioButton disabled={busy} onClick={() => {
            if (fields.length) { setParagraphSlots(slots); setSelected(fields[0].key); requestAnimationFrame(() => { sentenceSelect.current?.focus(); sentenceSelect.current?.scrollIntoView({ block: 'center' }); }); }
            else if (layoutDetails.current) { layoutDetails.current.open = true; layoutInput.current?.focus(); layoutInput.current?.scrollIntoView({ block: 'center' }); }
          }}>Edit paragraph {index + 1} wording</StudioButton>
        </li>;
      })}
    </AssemblySections>
    <p className="admin-field-hint">Paragraphs follow the layout above. Sections without matching facts are omitted. The preview uses example facts. Choose a sentence variant by event count and order, then use the existing review, save, and publish controls.</p>
    <details ref={layoutDetails} className="admin-workspace-details"><AdminDisclosureSummary>Paragraphs and event order</AdminDisclosureSummary>
    <label><span>Assembly layout</span><StudioTextarea ref={layoutInput} aria-label="Assembly layout" rows={6} value={layout} onChange={event => setEditedLayout(event.target.value)} /></label>
    <div className="admin-editor-guidance">
      <p>Use single braces for slots. Blank lines start new paragraphs. The opening is required; other sections can be removed. Event wording uses the first or additional variant according to this order.</p>
      {categories.map(slot => <div key={slot}>
        <StudioButton type="button" aria-pressed={order.includes(slot)} onClick={() => setEditedLayout(!order.includes(slot) ? `${layout}\n\n{${slot}}` : layout.replace(`{${slot}}`, ""))}>{labels[slot]}: {order.includes(slot) ? "Included" : "Omitted"}</StudioButton>
        <StudioButton type="button" aria-label={`Move ${labels[slot]} earlier`} disabled={order.indexOf(slot) <= 0} onClick={() => move(slot, -1)}>Earlier</StudioButton>
        <StudioButton type="button" aria-label={`Move ${labels[slot]} later`} disabled={!order.includes(slot) || order.indexOf(slot) === order.length - 1} onClick={() => move(slot, 1)}>Later</StudioButton>
      </div>)}
      <StudioButton type="button" disabled={busy || errors.length > 0} onClick={() => onEdit(layoutField, layout)}>Edit and publish full template</StudioButton>
      {editedLayout !== null && <StudioButton type="button" onClick={() => setEditedLayout(null)}>Use published layout</StudioButton>}
    </div>
    </details>
    <label><span>Sentence template</span><AdminSelect ref={sentenceSelect} aria-label="Sentence template" value={selected} onChange={event => setSelected(event.target.value)}>
      {templateFields.map(field => <option key={field.key} value={field.key}>{field.label}</option>)}
    </AdminSelect></label>
    {paragraphSlots && <StudioButton onClick={() => { setParagraphSlots(null); setSelected(skyAssemblyFields[1].key); }}>Show all assembly templates</StudioButton>}
    <p className="admin-field-hint">Editing shared wording: {selectedField.label} · {content.has(selected) ? 'Published source' : 'Built-in source'} · <code>{selectedField.key}</code></p>
    <div className="admin-template-reader-surface"><div className="admin-template-reader-copy"><section className="admin-composition-preview-field field-body">
      <SkyInlineTemplate key={`${selected}:${content.get(selected)?.body ?? selectedField.body}`} field={selectedField} body={content.get(selected)?.body ?? selectedField.body}
        slots={openingSlots} busy={busy} onEdit={onEdit} label="Sentence wording editor" drafts={sentenceDrafts.current} />
    </section></div></div>
    <StudioButton type="button" disabled={busy} onClick={() => onEdit(selectedField)}>Edit sentence template</StudioButton>
    <details className="admin-workspace-details"><AdminDisclosureSummary>Preview event examples</AdminDisclosureSummary>
      <p>These are examples for checking grammar, not today’s calculated sky. Separate multiple event labels with semicolons. Placement examples use the Sun and Moon selectors below.</p>
      <label><span>Retrograde planet examples</span><StudioInput aria-label="Retrograde planet examples" value={retrogrades} onChange={event => setRetrogrades(event.target.value)} /></label>
      <label><span>Void of course remaining time example</span><StudioInput aria-label="Void of course remaining time example" value={voidRemaining} onChange={event => setVoidRemaining(event.target.value)} /></label>
      <label><span>Exact aspect examples</span><StudioInput aria-label="Exact aspect examples" value={aspectExamples} onChange={event => setAspectExamples(event.target.value)} /></label>
      <label><span>Station examples</span><StudioInput aria-label="Station examples" value={stationExamples} onChange={event => setStationExamples(event.target.value)} /></label>
      <label><span>Single station motion</span><AdminSelect value={stationDirection} onChange={event => setStationDirection(event.target.value as "direct" | "retrograde")}><option value="retrograde">Retrograde</option><option value="direct">Direct</option></AdminSelect></label>
      <label className="studio-contained-toggle"><StudioInput type="checkbox" checked={stationOccurred} onChange={event => setStationOccurred(event.target.checked)} />Station has occurred in this example</label>
      <label><span>Ingress examples</span><StudioInput aria-label="Ingress examples" value={ingressExamples} onChange={event => setIngressExamples(event.target.value)} /></label>
      <label><span>Lunation example</span><AdminSelect aria-label="Lunation example" value={lunation} onChange={event => setLunation(event.target.value)}><option value="none">None</option><option value="today">New Moon today</option><option value="future">New Moon in 3 days</option></AdminSelect></label>
    </details>
    {errors.length > 0 ? <div role="alert">{errors.join(" ")}</div> : <div className="admin-template-reader-surface">
      <div className="admin-composition-preview-chrome"><span>Full summary</span><span>{editedLayout === null || editedLayout === publishedLayout ? "Published template · example facts" : "Unsaved layout preview"}</span></div>
      <div className="admin-template-reader-copy"><section className="admin-composition-preview-field field-body admin-summary-assembly-preview" aria-label="Full summary preview">
        {skySummaryParagraphs(parts).map((paragraph, i) => <p key={i}>{paragraph.map((part, j) => part.action ? <span key={j} className="admin-composition-variable variable-fact">{part.text}</span> : <span key={j}>{part.text}</span>)}</p>)}
      </section></div>
    </div>}
  </section>;
}
