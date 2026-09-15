import { StudioButton, StudioInput } from "./StudioControls";
import { AdminSelect } from "./AdminNativeControls";
import SkyPlacementComposition from "./SkyPlacementComposition";
import type { SkyPlacementSelection } from "./skyPlacementAssembly";
import { useEffect, useMemo, useState } from "react";
import type { CompositionMapRow, CompositionMapTemplate } from "./compositionMap";
import { compositionSourceFamily, compositionSourcesForSurface } from "./compositionSurfaceSources";
import { emptyHouseRulers, emptyHouseSourceKeys } from "./emptyHouseSources";
import ContentLiveStatusBadge from "./ContentLiveStatus";

type Props = {
  surfaceId: string;
  rows: CompositionMapRow[];
  templates: CompositionMapTemplate[];
  onEditRow: (row: CompositionMapRow) => void;
  onEditField?: (row: CompositionMapRow, path: string, selection: SkyPlacementSelection) => void;
  onSelectTemplate: (key: string) => void;
  onLoadRow?: (row: CompositionMapRow) => Promise<unknown>;
};

export default function CompositionSurfaceSources({ surfaceId, rows, templates, onEditRow, onEditField, onSelectTemplate, onLoadRow }: Props) {
  const [house, setHouse] = useState(1);
  const [sign, setSign] = useState("aries");
  const [rulerHouse, setRulerHouse] = useState(2);
  const [contextOnly, setContextOnly] = useState(true);
  const emptyKeys = emptyHouseSourceKeys(house, sign, rulerHouse);
  const [query, setQuery] = useState("");
  const [family, setFamily] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [allSources, setAllSources] = useState(false);
  const sources = useMemo(() => allSources ? rows : compositionSourcesForSurface(surfaceId, rows, templates), [surfaceId, rows, templates, allSources]);
  const families = [...new Set(sources.map((row) => compositionSourceFamily(row.content_key)))].sort();
  const filtered = sources.filter((row) => (surfaceId !== "natal-empty-house" || !contextOnly || allSources || emptyKeys.includes(row.content_key) || row.content_key.startsWith("cms/natal-empty-house/"))
    && (!family || compositionSourceFamily(row.content_key) === family)
    && query.toLowerCase().split(/\s+/).every((term) => `${row.content_key} ${row.headline ?? ""} ${row.body ?? ""}`.toLowerCase().includes(term)));
  const selected = filtered.find((row) => row.id === selectedId) ?? filtered[0];
  const [loadError, setLoadError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    setLoadError("");
    if (!selected) return;
    setSelectedId(selected.id);
    if (!selected.inventory_only || !onLoadRow) return;
    let active = true;
    void onLoadRow(selected).catch((error) => { if (active) setLoadError(error instanceof Error ? error.message : "Could not load this source."); });
    return () => { active = false; };
  }, [selected?.id, selected?.inventory_only, retry]);
  const template = selected && templates.find((item) => item.row.content_key === selected.content_key);
  const sections = selected?.sections as { packageDraft?: Record<string, unknown>; packageRecord?: Record<string, unknown>; body_you?: string; body_they?: string } | undefined;
  const record = sections?.packageDraft ?? sections?.packageRecord;
  const copy = [record?.body_you ?? sections?.body_you ?? record?.body ?? record?.text ?? selected?.body, record?.body_they ?? sections?.body_they]
    .filter((value, index, values): value is string => typeof value === "string" && Boolean(value) && values.indexOf(value) === index);
  if (surfaceId === "sky-placement-detail") return <SkyPlacementComposition onEditField={onEditField} rows={rows} onEditRow={onEditRow} onLoadRow={onLoadRow} />;
  return <section className="admin-composition-surface-actions" aria-label="Manage composition sources">
    <header><h3 className="sr-only">Select and manage sources</h3><span>{filtered.length} source{filtered.length === 1 ? "" : "s"}</span></header>
    {surfaceId === "natal-empty-house" && <div className="admin-natal-placement-selectors" aria-label="Empty house source context">
      <label>Empty house<AdminSelect aria-label="Empty house" value={house} onChange={(event) => { const next = Number(event.target.value); setHouse(next); if (next === rulerHouse) setRulerHouse(next === 12 ? 1 : next + 1); }}>
        {Array.from({length:12}, (_, i) => <option key={i+1} value={i+1}>{i+1}</option>)}
      </AdminSelect></label>
      <label>Cusp sign<AdminSelect aria-label="Empty house cusp sign" value={sign} onChange={(event) => setSign(event.target.value)}>
        {Object.keys(emptyHouseRulers).map((sign) => <option key={sign} value={sign}>{sign[0].toUpperCase()+sign.slice(1)}</option>)}
      </AdminSelect></label>
      <label>Ruler’s house<AdminSelect aria-label="Empty house ruler house" value={rulerHouse} onChange={(event) => setRulerHouse(Number(event.target.value))}>
        {Array.from({length:12}, (_, i) => i+1).filter((value) => value !== house).map((value) => <option key={value} value={value}>{value}</option>)}
      </AdminSelect></label>
      <StudioButton type="button" aria-pressed={contextOnly} onClick={() => setContextOnly(!contextOnly)}>{contextOnly ? "Show all empty-house sources" : "Show selected context"}</StudioButton>
    </div>}
    <div className="admin-composition-source-tools">
      <StudioInput aria-label="Search composition sources" placeholder="Planet, sign, house, phrase, or key" value={query} onChange={(event) => setQuery(event.target.value)} />
      <AdminSelect aria-label="Source family" value={family} onChange={(event) => setFamily(event.target.value)}>
        <option value="">All source families</option>{families.map((key) => <option key={key} value={key}>{key}</option>)}
      </AdminSelect>
      <StudioButton type="button" aria-pressed={allSources} onClick={() => { setAllSources((value) => !value); setFamily(""); }}>Search all Studio sources</StudioButton>
      <label>Selected source<AdminSelect aria-label="Selected composition source" disabled={!filtered.length} value={selected?.id ?? ""} onChange={(event) => setSelectedId(event.target.value)}>
        {!filtered.length && <option value="">No matching sources</option>}
        {filtered.map((row) => <option key={row.id || row.content_key} value={row.id}>{row.headline || row.content_key} · {row.content_key}</option>)}
      </AdminSelect></label>
    </div>
    {loadError && <p role="alert">{loadError} <StudioButton type="button" onClick={() => setRetry((value) => value + 1)}>Retry source</StudioButton></p>}
    {selected ? <article className="admin-composition-source-card">
      <ContentLiveStatusBadge row={selected} />
      {copy.map((body, index) => <p key={index} className="admin-composition-source-copy">{body}</p>)}
      {!copy.length && <p>Open this source to load its complete writing.</p>}
      <StudioButton type="button" onClick={() => onEditRow(selected)}>Edit selected source</StudioButton>
      {template && <StudioButton type="button" onClick={() => onSelectTemplate(selected.content_key)}>Open template assembly</StudioButton>}
      <p>Changes stay in draft until published.</p>
    </article> : <p role="status">No sources match this selection. Clear the filters, search all Studio sources, or use an authoring destination below.</p>}
  </section>;
}
