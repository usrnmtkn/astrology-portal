import { useEffect, useMemo, useState, useRef, useId } from "react";
import type { CompositionMapRow } from "./compositionMap";
import { skyPlacementBodies, skyPlacementSigns } from "./skyWriteupRelations";
import ContentLiveStatusBadge from "./ContentLiveStatus";
import { skyPlacementAssembly, skyPlacementAssemblyFields, skyRetrogradeBodies as retrogradeBodies, type SkyPlacementAssemblyField, type SkyPlacementWriting, type SkyPlacementSelection as Selection } from "./skyPlacementAssembly";
import { openContextualReaderHref } from "./adminReaderDestinations";

type Props = {
  rows: CompositionMapRow[];
  selection?: Selection;
  onEditRow: (row: CompositionMapRow) => void;
  onEditField?: (row: CompositionMapRow, path: string, selection: Selection) => void;
  onLoadRow?: (row: CompositionMapRow) => Promise<unknown>;
};
const title = (value: string) => value.split("-").map(word => word[0].toUpperCase() + word.slice(1)).join(" ");

export function skyPlacementCompositionKeys({ planet, sign, motion }: Selection) {
  const base = planet === "lilith" ? `sky-lilith/article/${sign}`
    : planet.endsWith("-node") ? `sky-nodes/${planet}/${sign}` : `sky-placement/article/${planet}/${sign}`;
  return [...(motion === "retrograde" && retrogradeBodies.has(planet) ? [`sky-placement/retrograde/${planet}`] : []), base];
}

export default function SkyPlacementComposition({ rows, selection, onEditRow, onEditField, onLoadRow }: Props) {
  const [view, setView] = useState<"preview" | "template" | "assembly">("preview");
  const [writing, setWriting] = useState<SkyPlacementWriting>("article");
  const viewId = useId();
  const loadRowRef = useRef(onLoadRow);
  loadRowRef.current = onLoadRow;
  const [context, setContext] = useState<Selection>({ planet: "saturn", sign: "aries", motion: "retrograde" });
  const current = selection ?? context;
  const [loaded, setLoaded] = useState<Record<string, CompositionMapRow>>({});
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const keys = useMemo(() => skyPlacementCompositionKeys(current), [current.planet, current.sign, current.motion]);
  useEffect(() => {
    const loadRow = loadRowRef.current;
    if (!loadRow) return;
    let active = true;
    setError("");
    void Promise.all(keys.map(async key => {
      const row = await loadRow({ id: `package:${key}`, content_key: key, inventory_only: true } as CompositionMapRow);
      if (active && row) setLoaded(existing => ({ ...existing, [key]: row as CompositionMapRow }));
    })).catch(error => { if (active) setError(error instanceof Error ? error.message : "Could not load these sources."); });
    return () => { active = false; };
  }, [keys, retry]);
  const selectedRows = keys.map(key => rows.find(row => row.content_key === key && !row.inventory_only && !row.id.startsWith("package:"))
    ?? loaded[key] ?? rows.find(row => row.content_key === key && !row.inventory_only));
  const availableRows = selectedRows.filter((row): row is CompositionMapRow => Boolean(row));
  const assembly = skyPlacementAssembly(availableRows, writing);
  const selectedWriting = assembly.hasFallback ? writing : "article";
  const parts = selectedWriting === writing ? assembly.parts : skyPlacementAssembly(availableRows, selectedWriting).parts;
  const edit = (field: SkyPlacementAssemblyField) => onEditField ? onEditField(field.row, field.path, current) : onEditRow(field.row);
  const scope = (row: CompositionMapRow) => row.content_key.includes("/retrograde/")
    ? `Shared by ${title(current.planet)} retrograde in every sign.`
    : `Shared by ${title(current.planet)} in ${title(current.sign)}, direct and retrograde.`;
  const views = [{ id: "preview", label: "Reader preview" }, { id: "template", label: "Main template" }, { id: "assembly", label: "Assembly" }] as const;
  return <section className="admin-composition-surface-actions admin-sky-placement-composition" aria-label="Sky placement composition map">
    <header><div><p className="admin-eyebrow">Composition Map</p><h3>{title(current.planet)}{current.motion === "retrograde" && retrogradeBodies.has(current.planet) ? " Rx" : ""} in {title(current.sign)}</h3></div>
      <button type="button" onClick={() => openContextualReaderHref(`/#sky/placement/${current.planet}/${current.sign}`)}>View in app</button>
    </header>
    {!selection && <div className="admin-natal-placement-selectors">
      <label>Planet or point<select aria-label="Composition planet or point" value={context.planet} onChange={event => setContext({ ...context, planet: event.target.value })}>
        {skyPlacementBodies.map(planet => <option key={planet} value={planet}>{title(planet)}</option>)}
      </select></label>
      <label>Zodiac sign<select aria-label="Composition zodiac sign" value={context.sign} onChange={event => setContext({ ...context, sign: event.target.value })}>
        {skyPlacementSigns.map(sign => <option key={sign} value={sign}>{title(sign)}</option>)}
      </select></label>
      <label>Motion<select aria-label="Composition motion" value={context.motion} onChange={event => setContext({ ...context, motion: event.target.value })}>
        <option value="direct">Direct</option><option value="retrograde">Retrograde</option>
      </select></label>
    </div>}
    <p>The placement article is shared by direct and retrograde motion. Retrograde adds its own opening paragraph. Choose a writing path, then select a colored passage to edit its source.</p>
    {error && <p role="alert">{error} <button type="button" onClick={() => setRetry(value => value + 1)}>Retry sources</button></p>}
    {keys.map((key, index) => !selectedRows[index] && <p role="status" key={key}>{error ? "Source unavailable: " : "Loading "}{key.includes("/retrograde/") ? "retrograde paragraph" : "planet-in-sign source"}{!error && "…"}</p>)}
    {availableRows.length > 0 && <>
      <div className="admin-sky-placement-sources" aria-label="Selected sources">
        {availableRows.map(row => <div key={row.content_key}>
          <strong>{row.headline || row.content_key}</strong><ContentLiveStatusBadge row={row} />
          <p>{scope(row)}</p>
        </div>)}
      </div>
      <label className="admin-sky-placement-writing">Writing path
        <select aria-label="Placement writing path" value={selectedWriting} onChange={event => setWriting(event.target.value as SkyPlacementWriting)}>
          <option value="article">Placement article</option>
          <option value="fallback" disabled={!assembly.hasFallback}>Fallback hooks</option>
        </select>
      </label>
      <p>{selectedWriting === "fallback" ? "The fallback replaces the placement passage when the full article is unavailable. It keeps the TLDR and any retrograde opening." : "The full placement article takes priority when it is available."} This preview uses saved sources, including saved drafts. Dates, event additions, aspects, and horoscopes are added on the reader page.</p>
      <div className="admin-composition-view-tabs" role="tablist" aria-label="Sky placement composition views">
        {views.map((item, index) => <button key={item.id} id={`${viewId}-${item.id}`} type="button" role="tab"
          aria-selected={view === item.id} aria-controls={`${viewId}-panel`} tabIndex={view === item.id ? 0 : -1}
          className={view === item.id ? "active" : ""} onClick={() => setView(item.id)}
          onKeyDown={event => {
            const next = event.key === "ArrowRight" ? (index + 1) % views.length : event.key === "ArrowLeft" ? (index + views.length - 1) % views.length : event.key === "Home" ? 0 : event.key === "End" ? views.length - 1 : -1;
            if (next < 0) return;
            event.preventDefault(); setView(views[next].id);
            document.getElementById(`${viewId}-${views[next].id}`)?.focus();
          }}>{item.label}</button>)}
      </div>
      <div className="admin-composition-variable-legend" aria-label="Composition color key">
        <span className="variable-fact">Calculated fact</span><span className="variable-hook">Authored hook</span><span className="variable-copy">Saved copy</span>
      </div>
      <div id={`${viewId}-panel`} role="tabpanel" aria-labelledby={`${viewId}-${view}`}>
        {view === "preview" && <div className="admin-template-reader-surface">
          <div className="admin-composition-preview-chrome"><span>Sky placement</span><span>Saved source preview</span></div>
          <div className="admin-template-reader-copy">
            <div className="admin-composition-preview-field"><span className="admin-eyebrow">Headline</span>
              <p><span className="admin-composition-variable variable-fact" title="Planet and motion come from the selected chart context">{title(current.planet)}{current.motion === "retrograde" && retrogradeBodies.has(current.planet) ? " Rx" : ""}</span> in <span className="admin-composition-variable variable-fact" title="Sign comes from the selected chart context">{title(current.sign)}</span></p>
            </div>
            {parts.map(field => <div className="admin-composition-preview-field field-body" key={`${field.row.content_key}/${field.path}`}>
              <span className="admin-eyebrow">{field.label}</span>
              <p><button type="button" className={`admin-composition-variable variable-${field.kind}`} aria-label={`Edit ${field.label.toLowerCase()}`} onClick={() => edit(field)}>
                {field.value ? field.value.split(/(\{\{[^{}]+\}\})/u).map((part, index) => part.startsWith("{{")
                  ? <span key={index} className="variable-fact" title="Calculated on the reader page">{part}</span> : part)
                  : "No writing saved. Select to write this section."}
              </button></p>
            </div>)}
          </div>
        </div>}
        {view === "template" && <div className="admin-sky-placement-template">
          <p>Read from top to bottom. Each slot below links to the field that supplies its wording. Empty fields are omitted by the reader.</p>
          <ol aria-label="Placement template order">
            {parts.map(field => <li key={`${field.row.content_key}/${field.path}`}>
              <button type="button" className={`admin-composition-variable variable-${field.kind}`} onClick={() => edit(field)} aria-label={`Edit ${field.label.toLowerCase()}`}>
                <code>{`{{${field.path}}}`}</code> · {field.label}
              </button>
              <p>{scope(field.row)}</p>
            </li>)}
          </ol>
          <p>The app owns this order. Edit the linked fields to change the wording. The short retrograde copy is managed under Assembly and is not part of this article.</p>
        </div>}
        {view === "assembly" && availableRows.map(row => {
          const fields = skyPlacementAssemblyFields(row);
          return <article className="admin-composition-source-card" key={row.content_key} aria-label={row.content_key.includes("/retrograde/") ? "Retrograde source" : "Planet-in-sign source"}>
            <strong>{row.headline || row.content_key}</strong>
            {fields.length ? fields.map(field => <div key={field.path} className="admin-composition-source-card">
              <strong className={`variable-${field.kind}`}>{field.label}</strong>
              <small>{parts.some(part => part.row.content_key === row.content_key && part.path === field.path) ? "Included in this writing path" : "Used in another writing path"}</small>
              <p className="admin-composition-source-copy">{field.value || "No writing saved for this section."}</p>
              <button type="button" onClick={() => edit(field)}>Edit {field.label.toLowerCase()}</button>
            </div>) : <><p className="admin-composition-source-copy">{row.body}</p><button type="button" onClick={() => onEditRow(row)}>Edit source</button></>}
            <details><summary>Source details</summary><code>{row.content_key}</code></details>
          </article>;
        })}
      </div>
    </>}
  </section>;
}
