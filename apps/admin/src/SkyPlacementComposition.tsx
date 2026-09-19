import { zodiacSeasonSourceKey } from "../../web/src/content/fallbackArchitectureV3/resolver/zodiacSeasonVariables.mjs";
import { StudioTabs, StudioButton } from "./StudioControls";
import { AdminDisclosureSummary, AdminSelect } from "./AdminNativeControls";
import { useEffect, useMemo, useState, useRef } from "react";
import type { CompositionMapRow } from "./compositionMap";
import { skyPlacementBodies, skyPlacementSigns } from "./skyWriteupRelations";
import SkyIngressComposer from "./SkyIngressComposer";
import SkyWritingSystemDetails from "./SkyWritingSystemDetails";
import { effectivePackageRecord } from "./skyFallbackWorkspace";
import ContentLiveStatusBadge from "./ContentLiveStatus";
import { studioServingStatusRow } from "./studioServingStatus";
import { skyPlacementAssembly, skyPlacementAssemblyFields, skyRetrogradeBodies as retrogradeBodies, type SkyPlacementAssemblyField, type SkyPlacementWriting, type SkyPlacementSelection as Selection } from "./skyPlacementAssembly";
import { openContextualReaderHref } from "./adminReaderDestinations";
import SkyPlacementVariableKey, { SkyVariableText } from "./SkyPlacementVariableKey";
// @ts-ignore Shared inline-variable contract, separate from composition section slots.
import { isSkyPlacementVariableField, skyPlacementVariableFacts } from "../../web/src/content/fallbackArchitectureV3/resolver/skyPlacementVariables.mjs";

// @ts-ignore Shared article scope; other sections remain facts-only.
import { isSkyPlacementArticleField, skyPlacementArticlePhraseNames } from "../../web/src/content/fallbackArchitectureV3/resolver/skyPlacementArticleVariables.mjs";

type Props = {
  rows: CompositionMapRow[];
  selection?: Selection;
  onEditRow: (row: CompositionMapRow) => void;
  onEditField?: (row: CompositionMapRow, path: string, selection: Selection) => void;
  onLoadRow?: (row: CompositionMapRow) => Promise<unknown>;
};
const title = (value: string) => value.split("-").map(word => word[0].toUpperCase() + word.slice(1)).join(" ");

export function skyPlacementCompositionKeys({ planet, sign, motion }: Selection, hemisphere = "neutral") {
  const base = planet === "moon" ? `fallback-hook/sky-placement-hook/moon/${sign}` : planet === "lilith" ? `sky-lilith/article/${sign}`
    : planet.endsWith("-node") ? `sky-nodes/${planet}/${sign}` : `sky-placement/article/${planet}/${sign}`;
  if (planet.endsWith("-node")) {
    const opposite = skyPlacementSigns[(skyPlacementSigns.indexOf(sign as typeof skyPlacementSigns[number]) + 6) % 12];
    const axis = planet === "north-node" ? `${sign}-${opposite}` : `${opposite}-${sign}`;
    return ["sky-nodes/education", `sky-nodes/axis/${axis}`, base];
  }
  const seasonal = planet === "sun" && ["aries", "cancer", "libra", "capricorn"].includes(sign)
    ? [`sky-placement/seasonal-context/${sign}/${hemisphere}`] : [];
  return [...seasonal, ...(motion === "retrograde" && retrogradeBodies.has(planet) ? [`sky-placement/retrograde/${planet}`] : []), base];
}

export default function SkyPlacementComposition({ rows, selection, onEditRow, onEditField, onLoadRow }: Props) {
  const [view, setView] = useState<"preview" | "template" | "assembly">("preview");
  const [hemisphere, setHemisphere] = useState("neutral");
  const [writing, setWriting] = useState<SkyPlacementWriting | "ingress">("article");
  const loadRowRef = useRef(onLoadRow);
  loadRowRef.current = onLoadRow;
  const [context, setContext] = useState<Selection>({ planet: "saturn", sign: "aries", motion: "retrograde" });
  const current = selection ? { ...selection, motion: selection.motion === "all" ? context.motion : selection.motion } : { ...context };
  if (!retrogradeBodies.has(current.planet)) current.motion = "direct";
  const variableFacts = skyPlacementVariableFacts({ ...current, isRetrograde: current.motion === "retrograde" && retrogradeBodies.has(current.planet) });
  const [loaded, setLoaded] = useState<Record<string, CompositionMapRow>>({});
  const [finished, setFinished] = useState<Record<string, boolean>>({});
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const keys = useMemo(() => skyPlacementCompositionKeys(current, hemisphere), [current.planet, current.sign, current.motion, hemisphere]);
  useEffect(() => {
    const loadRow = loadRowRef.current;
    if (!loadRow) return;
    let active = true;
    setError("");
    void Promise.all(keys.map(async key => {
      const row = await loadRow({ id: `package:${key}`, content_key: key, inventory_only: true } as CompositionMapRow);
      if (active) setFinished(existing => ({ ...existing, [key]: true }));
      if (active && row) setLoaded(existing => ({ ...existing, [key]: row as CompositionMapRow }));
    })).catch(error => { if (active) setError(error instanceof Error ? error.message : "Could not load these sources."); });
    return () => { active = false; };
  }, [keys, retry]);
  const currentSource = (row: CompositionMapRow) => !row.inventory_only
    && !(row.status === "ARCHIVED" && row.review_state === "published-revision");
  const selectedRows = keys.map(key => rows.find(row => row.content_key === key && currentSource(row) && !row.id.startsWith("package:"))
    ?? (loaded[key] && currentSource(loaded[key]) ? loaded[key] : undefined)
    ?? rows.find(row => row.content_key === key && currentSource(row)));
  const availableRows = selectedRows.filter((row): row is CompositionMapRow => Boolean(row));
  const assembly = skyPlacementAssembly(availableRows, writing === "ingress" ? "fallback" : writing, current.motion);
  const ingressRow = availableRows.find(row => /^sky-placement\/article\//u.test(row.content_key));
  const phraseRecord = useMemo(() => ingressRow ? effectivePackageRecord(ingressRow.sections) as Record<string, any> : undefined, [ingressRow?.sections]);
  const [phraseReferences, setPhraseReferences] = useState<Record<string, any>[]>([]);
  const phraseReferenceKey = JSON.stringify([...new Set(["placementArticle", "placementArticleDirect", "placementArticleRetrograde"]
    .flatMap(path => skyPlacementArticlePhraseNames(phraseRecord?.[path]))
    .map((name: any) => zodiacSeasonSourceKey(name, current.sign) ? { contentKey: zodiacSeasonSourceKey(name, current.sign) } : phraseRecord?.ingress?.sources?.[name]?.reference)
    .filter(Boolean))]);
  useEffect(() => {
    let active = true;
    const refs: Array<{ contentKey: string }> = JSON.parse(phraseReferenceKey);
    const referenceKeys = [...new Set(refs.map(ref => ref.contentKey))].filter(key => key !== phraseRecord?.contentKey);
    setPhraseReferences([]);
    void Promise.all(referenceKeys.map(async key => {
      const row = await loadRowRef.current?.({ id: `package:${key}`, content_key: key, inventory_only: true } as CompositionMapRow) as CompositionMapRow | undefined;
      return row ? effectivePackageRecord(row.sections) as Record<string, any> : undefined;
    })).then(records => { if (active) setPhraseReferences(records.filter((row): row is Record<string, any> => Boolean(row))); })
      .catch(reason => { if (active) setError(reason instanceof Error ? reason.message : "Linked writing could not be loaded."); });
    return () => { active = false; };
  }, [phraseReferenceKey, phraseRecord?.contentKey]);
  const selectedWriting = writing === "ingress" && ingressRow ? writing : assembly.hasFallback ? writing === "ingress" ? "article" : writing : "article";
  const parts = selectedWriting === writing ? assembly.parts : skyPlacementAssembly(availableRows, selectedWriting === "ingress" ? "fallback" : selectedWriting, current.motion).parts;
  const edit = (field: SkyPlacementAssemblyField) => onEditField && !field.row.content_key.startsWith("fallback-hook/") ? onEditField(field.row, field.path, current) : onEditRow(field.row);
  const sectionIdentity = (field: SkyPlacementAssemblyField) => field.row.content_key.includes("/retrograde/")
    ? `${title(current.planet)} retrograde · ${field.path === "Body" ? "Opening" : field.label}`
    : `${field.row.headline || `${title(current.planet)} in ${title(current.sign)}`} · ${field.label}`;
  const scope = (row: CompositionMapRow) => row.content_key.includes("/retrograde/")
    ? `Shared by ${title(current.planet)} retrograde in every sign.`
    : row.content_key.startsWith("sky-placement/seasonal-context/") ? "Seasonal paragraph for the selected hemisphere. The reader selects this from the location."
    : row.content_key === "sky-nodes/education" ? "Shared node education." : row.content_key.startsWith("sky-nodes/axis/") ? "Shared by both ends of this node axis." : `Writing for ${title(current.planet)} in ${title(current.sign)}. Each section can be shared or specific to one motion.`;
  const views = [{ id: "preview", label: "Saved preview" }, { id: "template", label: "Main template" }, { id: "assembly", label: "Assembly" }] as const;
  return <section className="admin-composition-surface-actions admin-sky-placement-composition" aria-label="Sky placement composition map">
    <header><div><p className="admin-eyebrow">Composition Map</p><h3>{title(current.planet)}{current.motion === "retrograde" && retrogradeBodies.has(current.planet) ? " Rx" : ""} in {title(current.sign)}</h3></div>
      <StudioButton type="button" onClick={() => openContextualReaderHref(`/#sky/placement/${current.planet}/${current.sign}`)}>Open published reader</StudioButton>
    </header>
    {!selection && <div className="admin-natal-placement-selectors">
      <label>Planet or point<AdminSelect aria-label="Composition planet or point" value={context.planet} onChange={event => setContext({ ...context, planet: event.target.value })}>
        {skyPlacementBodies.map(planet => <option key={planet} value={planet}>{title(planet)}</option>)}
      </AdminSelect></label>
      <label>Zodiac sign<AdminSelect aria-label="Composition zodiac sign" value={context.sign} onChange={event => setContext({ ...context, sign: event.target.value })}>
        {skyPlacementSigns.map(sign => <option key={sign} value={sign}>{title(sign)}</option>)}
      </AdminSelect></label>
      <label>Motion<AdminSelect aria-label="Composition motion" value={context.motion} onChange={event => setContext({ ...context, motion: event.target.value })}>
        <option value="direct">Direct</option>{retrogradeBodies.has(current.planet) && <option value="retrograde">Retrograde</option>}
      </AdminSelect></label>
    </div>}
    <p>Choose a writing path to inspect its saved sources and ordered blocks. This choice changes the preview, not what is published. Use the section buttons below or select a colored passage to edit its exact source. Imported article templates in the library below are separate records.</p>
    {ingressRow && <>
      <details className="admin-workspace-details admin-writing-system-details" aria-label="Placement reader selection">
        <AdminDisclosureSummary>How the reader chooses writing</AdminDisclosureSummary>
        <p>The reader uses the first available, eligible published body for the calculated motion and occurrence:</p>
        <ol aria-label="Published placement selection order">
          <li>Complete article for the current motion.</li>
          <li>Shared complete placement article.</li>
          <li>Enabled placement composition with all required modules resolved.</li>
          <li>Evergreen fallback sections matching the motion, in their saved order. Empty sections are skipped.</li>
        </ol>
        <p>TLDR, retrograde opening, dates, and other occurrence additions keep their own sources. Live badges report source eligibility; they do not prove that every field below is selected. Saved previews can include drafts. Open the published reader to check what readers receive.</p>
      </details>
      <SkyWritingSystemDetails system="placement" />
    </>}
    {selection?.motion === "all" && retrogradeBodies.has(current.planet) && <label>Preview motion<AdminSelect aria-label="Composition motion" value={current.motion} onChange={event => setContext({ ...context, motion: event.target.value })}><option value="direct">Direct</option><option value="retrograde">Retrograde</option></AdminSelect></label>}
    {keys.some(key => key.startsWith("sky-placement/seasonal-context/")) && <label>Seasonal paragraph
      <AdminSelect aria-label="Seasonal preview hemisphere" value={hemisphere} onChange={event => setHemisphere(event.target.value)}>
        <option value="neutral">No location / equator</option><option value="northern">Northern hemisphere</option><option value="southern">Southern hemisphere</option>
      </AdminSelect>
    </label>}
    {error && <p role="alert">{error} <StudioButton type="button" onClick={() => setRetry(value => value + 1)}>Retry sources</StudioButton></p>}
    {keys.map((key, index) => !selectedRows[index] && <p role="status" key={key}>{error || finished[key] ? "Source unavailable: " : "Loading "}{key.includes("/retrograde/") ? "retrograde paragraph" : key.includes("/seasonal-context/") ? "seasonal paragraph" : "planet-in-sign source"}{!error && !finished[key] && "…"}</p>)}
    {availableRows.length > 0 && <>
      <div className="admin-sky-placement-sources" aria-label="Selected sources">
        {availableRows.map(row => <div key={row.content_key}>
          <strong>{row.headline || row.content_key}</strong><ContentLiveStatusBadge row={studioServingStatusRow(row, row.content_key)} />
          <p>{scope(row)}</p>
        </div>)}
      </div>
      {selectedWriting !== "ingress" && <div className="admin-sky-writing-source-actions" role="group" aria-label="Open placement section editors">
        {parts.map(field => <StudioButton key={`${field.row.content_key}/${field.path}`} type="button" onClick={() => edit(field)}>Open {field.label.toLowerCase()} editor</StudioButton>)}
      </div>}
      <label className="admin-sky-placement-writing">Writing path
        <AdminSelect aria-label="Placement writing path" value={selectedWriting} onChange={event => setWriting(event.target.value as SkyPlacementWriting | "ingress")}>
          <option value="article">Placement article</option>
          <option value="fallback" disabled={!assembly.hasFallback}>Fallback hooks</option>
          {ingressRow && <option value="ingress">Placement composition</option>}
        </AdminSelect>
      </label>
      {selectedWriting === "ingress" && ingressRow ? <SkyIngressComposer key={ingressRow.content_key} source={effectivePackageRecord(ingressRow.sections)} motion={current.motion}
        onOpenSource={(key, path) => {
          const row = availableRows.find(item => item.content_key === key) ?? { id: `package:${key}`, content_key: key, inventory_only: true } as CompositionMapRow;
          if (onEditField) onEditField(row, path, current); else onEditRow(row);
        }}
        onLoadSource={async key => {
          const row = await loadRowRef.current?.({ id: `package:${key}`, content_key: key, inventory_only: true } as CompositionMapRow) as CompositionMapRow | undefined;
          return row ? effectivePackageRecord(row.sections) : undefined;
        }} /> : <>
      <p>{selectedWriting === "fallback" ? "These evergreen sections work for any occurrence of this placement. On canonical placement pages, they supply the body when neither a complete article nor an eligible placement composition is available. Only blocks matching the selected motion are included. Open a section to add writing or change the section order." : "This is the complete authored passage for the selected motion, or the shared passage when no motion-specific article is saved. It can be evergreen writing; it is not necessarily a dated article edition. Complete articles take priority over sentence composition and fallback sections."} This preview uses saved sources, including saved drafts. Dates, event additions, aspects, and horoscopes are added on the reader page.</p>
      {selectedWriting === "fallback" && <StudioButton type="button" onClick={() => openContextualReaderHref(`/?skyPlacementPreview=fallback#sky/placement/${current.planet}/${current.sign}`)}>Preview evergreen in app</StudioButton>}
      <StudioTabs label="Sky placement composition views" value={view} onValueChange={setView}
        tabs={views.map(item => ({ value: item.id, label: item.label }))}>
      <div className="admin-composition-variable-legend" aria-label="Composition color key">
        <span className="variable-fact" data-variable-color="1">Calculated fact</span><span className="variable-hook" data-variable-color="2">Authored hook</span><span className="variable-copy" data-variable-color="3">Saved copy</span>
      </div>
        {view === "preview" && <div className="admin-template-reader-surface">
          <div className="admin-composition-preview-chrome"><span>Sky placement</span><span>Saved source preview</span></div>
          <div className="admin-template-reader-copy">
            <div className="admin-composition-preview-field"><span className="admin-eyebrow">Headline</span>
              <p><span className="admin-composition-variable variable-fact" data-variable-color="1" title="Planet and motion come from the selected chart context">{title(current.planet)}{current.motion === "retrograde" && retrogradeBodies.has(current.planet) ? " Rx" : ""}</span> in <span className="admin-composition-variable variable-fact" data-variable-color="1" title="Sign comes from the selected chart context">{title(current.sign)}</span></p>
            </div>
            {parts.map(field => <div className="admin-composition-preview-field field-body" key={`${field.row.content_key}/${field.path}`}>
              <span className="admin-eyebrow">{field.label}</span>
              <p><StudioButton type="button" className={`admin-composition-variable variable-${field.kind}`} data-variable-color={field.kind === "hook" ? "2" : "3"} aria-label={`Edit ${field.label.toLowerCase()}`} onClick={() => edit(field)}>
                {field.value ? isSkyPlacementVariableField(field.row.content_key, field.path)
                  ? <SkyVariableText value={field.value} facts={variableFacts} source={isSkyPlacementArticleField(field.row.content_key, field.path) ? phraseRecord : undefined} references={phraseRecord ? [phraseRecord, ...phraseReferences] : []} /> : field.value
                  : "No writing saved. Select to write this section."}
              </StudioButton></p>
            </div>)}
          </div>
        </div>}
        {view === "template" && <div className="admin-sky-placement-template">
          <p>The template joins the sections below in order. Each section slot supplies a whole passage; article variables substitute calculated facts and saved Writing Library phrases within that passage. Fallback sections retain their calculated-variable contract. Empty sections are skipped.</p>
          <ol aria-label="Placement template order">
            {parts.map(field => <li key={`${field.row.content_key}/${field.path}`}>
              <StudioButton type="button" className={`admin-composition-variable variable-${field.kind}`} data-variable-color={field.kind === "hook" ? "2" : "3"} onClick={() => edit(field)} aria-label={`Edit ${field.label.toLowerCase()}`}>
                {sectionIdentity(field)}
              </StudioButton>
              <code className="admin-sky-section-reference">{`${field.row.content_key}#${field.path}`}</code>
              <p>{field.motion && field.motion !== "all" ? `Used only while ${field.motion}.` : /^placementArticle(?:Direct|Retrograde)$/u.test(field.path) ? `Used only while ${field.path.endsWith("Retrograde") ? "retrograde" : "direct"}.` : scope(field.row)}</p>
              {(field.editorial?.paragraphs || field.editorial?.items) && <details className="admin-workspace-details">
                <AdminDisclosureSummary>Section structure</AdminDisclosureSummary>
                <p>Role: {field.editorial.role ?? "main"} · Target depth: {field.editorial.depth ?? "standard"}. Editorial labels are not reader copy.</p>
                <ol aria-label={`${field.label} paragraph plan`}>
                  {(field.editorial.paragraphs ?? field.editorial.items ?? []).map((unit, index) => <li key={unit.id}>
                    <p>{"job" in unit ? unit.job || `Paragraph ${index + 1}` : `Practical item ${index + 1}: action`}</p>
                    <p>{unit.phrases.length ? unit.phrases.map(phrase => phrase.role?.replaceAll("-", " ") || "authored phrase").join(" → ") : "No ingredients saved."}</p>
                  </li>)}
                </ol>
              </details>}
              <div className="admin-sky-template-comparison">
                <div><span className="admin-eyebrow">Saved section text</span><p className="admin-composition-source-copy">{field.value || "Empty · skipped"}</p></div>
                <div><span className="admin-eyebrow">With selected variables</span><p className="admin-composition-source-copy">{field.value
                  ? isSkyPlacementVariableField(field.row.content_key, field.path) ? <SkyVariableText value={field.value} facts={variableFacts} source={isSkyPlacementArticleField(field.row.content_key, field.path) ? phraseRecord : undefined} references={phraseRecord ? [phraseRecord, ...phraseReferences] : []} /> : field.value
                  : "Empty · skipped"}</p></div>
              </div>
            </li>)}
          </ol>
          <SkyPlacementVariableKey facts={variableFacts} phraseSource={phraseRecord && ingressRow ? {
            planet: current.planet,
            sign: current.sign,
            label: `${title(current.planet)} in ${title(current.sign)}`,
            record: phraseRecord,
            onLoadSource: async key => {
              const row = await loadRowRef.current?.({ id: `package:${key}`, content_key: key, inventory_only: true } as CompositionMapRow) as CompositionMapRow | undefined;
              return row ? effectivePackageRecord(row.sections) as Record<string, any> : undefined;
            },
            onEdit: sourceId => onEditField ? onEditField(ingressRow, `ingress.sources.${sourceId}`, current) : onEditRow(ingressRow)
          } : undefined} />
          <p>{selectedWriting === "fallback" ? "You can add and reorder evergreen sections in the linked editor. Empty sections are skipped." : "The app owns the article order. Edit the linked fields to change the wording."} The short retrograde copy is managed under Assembly and is not part of this article.</p>
        </div>}
        {view === "assembly" && availableRows.map(row => {
          const fields = skyPlacementAssemblyFields(row);
          return <article className="admin-composition-source-card" key={row.content_key} aria-label={row.content_key.includes("/retrograde/") ? "Retrograde source" : row.content_key.includes("/seasonal-context/") ? "Seasonal source" : "Planet-in-sign source"}>
            <strong>{row.headline || row.content_key}</strong>
            {fields.length ? fields.map(field => <div key={field.path} className="admin-composition-source-card">
              <strong className={`variable-${field.kind}`}>{field.label}</strong>
              <small>{parts.some(part => part.row.content_key === row.content_key && part.path === field.path) ? "Included in this writing path" : "Used in another writing path"}</small>
              <p className="admin-composition-source-copy">{field.value || "No writing saved for this section."}</p>
              <StudioButton type="button" onClick={() => edit(field)}>Edit {field.label.toLowerCase()}</StudioButton>
            </div>) : <><p className="admin-composition-source-copy">{row.body}</p><StudioButton type="button" onClick={() => onEditRow(row)}>Edit source</StudioButton></>}
            <p className="admin-natal-source-key"><span>Source key</span><code>{row.content_key}</code></p>
          </article>;
        })}
      </StudioTabs>
      </>}
    </>}
  </section>;
}
