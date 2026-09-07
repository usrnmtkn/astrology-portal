import { useMemo, useState } from "react";
import type { CompositionMapRow, CompositionMapTemplate } from "./compositionMap";
import { compositionSourceFamily, compositionSourcesForSurface } from "./compositionSurfaceSources";
import ContentLiveStatusBadge from "./ContentLiveStatus";

type Props = {
  surfaceId: string;
  rows: CompositionMapRow[];
  templates: CompositionMapTemplate[];
  onEditRow: (row: CompositionMapRow) => void;
  onSelectTemplate: (key: string) => void;
};

export default function CompositionSurfaceSources({ surfaceId, rows, templates, onEditRow, onSelectTemplate }: Props) {
  const [query, setQuery] = useState("");
  const [family, setFamily] = useState("");
  const [selectedKey, setSelectedKey] = useState("");
  const [allSources, setAllSources] = useState(false);
  const sources = useMemo(() => allSources ? rows : compositionSourcesForSurface(surfaceId, rows, templates), [surfaceId, rows, templates, allSources]);
  const families = [...new Set(sources.map((row) => compositionSourceFamily(row.content_key)))].sort();
  const filtered = sources.filter((row) => (!family || compositionSourceFamily(row.content_key) === family)
    && query.toLowerCase().split(/\s+/).every((term) => `${row.content_key} ${row.headline ?? ""} ${row.body ?? ""}`.toLowerCase().includes(term)));
  const selected = filtered.find((row) => row.content_key === selectedKey) ?? filtered[0];
  const template = selected && templates.find((item) => item.row.content_key === selected.content_key);
  const sections = selected?.sections as { packageDraft?: Record<string, unknown>; packageRecord?: Record<string, unknown>; body_you?: string; body_they?: string } | undefined;
  const record = sections?.packageDraft ?? sections?.packageRecord;
  const copy = [record?.body_you ?? sections?.body_you ?? selected?.body, record?.body_they ?? sections?.body_they]
    .filter((value, index, values): value is string => typeof value === "string" && Boolean(value) && values.indexOf(value) === index);
  return <section className="admin-composition-surface-actions" aria-label="Manage composition sources">
    <header><div><p className="admin-eyebrow">Composition Map</p><h3>Select and manage sources</h3></div><strong>{filtered.length} sources</strong></header>
    <div className="admin-composition-source-tools">
      <input aria-label="Search composition sources" placeholder="Planet, sign, house, phrase, or key" value={query} onChange={(event) => setQuery(event.target.value)} />
      <select aria-label="Source family" value={family} onChange={(event) => setFamily(event.target.value)}>
        <option value="">All source families</option>{families.map((key) => <option key={key} value={key}>{key}</option>)}
      </select>
      <label><input type="checkbox" checked={allSources} onChange={(event) => { setAllSources(event.target.checked); setFamily(""); }} /> Search all Studio sources</label>
      <label>Selected source<select aria-label="Selected composition source" value={selected?.content_key ?? ""} onChange={(event) => setSelectedKey(event.target.value)}>
        {filtered.map((row) => <option key={row.id || row.content_key} value={row.content_key}>{row.headline || row.content_key} · {row.content_key}</option>)}
      </select></label>
    </div>
    {selected ? <article className="admin-composition-source-card">
      <strong>{selected.headline || selected.content_key}</strong>
      <ContentLiveStatusBadge row={selected} />
      <code>{selected.content_key}</code>
      {copy.map((body, index) => <p key={index} className="admin-composition-source-copy">{body}</p>)}
      {!copy.length && <p>Open this source to load its complete writing.</p>}
      <button type="button" onClick={() => onEditRow(selected)}>Edit selected source</button>
      {template && <button type="button" onClick={() => onSelectTemplate(selected.content_key)}>Open template assembly</button>}
      <small>Shared sources can affect more than one surface. Saving a revision keeps it separate from the live copy until you publish.</small>
    </article> : <p role="status">No sources match this selection. Clear the filters, search all Studio sources, or use an authoring destination below.</p>}
  </section>;
}
