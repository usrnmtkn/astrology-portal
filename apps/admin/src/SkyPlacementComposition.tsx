import { useEffect, useMemo, useState, useRef } from "react";
import type { CompositionMapRow } from "./compositionMap";
import { skyPlacementBodies, skyPlacementSigns } from "./skyWriteupRelations";
import ContentLiveStatusBadge from "./ContentLiveStatus";
import { openContextualReaderHref } from "./adminReaderDestinations";

type Selection = { planet: string; sign: string; motion: string };
type Props = {
  rows: CompositionMapRow[];
  selection?: Selection;
  onEditRow: (row: CompositionMapRow) => void;
  onLoadRow?: (row: CompositionMapRow) => Promise<unknown>;
};
const title = (value: string) => value.split("-").map(word => word[0].toUpperCase() + word.slice(1)).join(" ");
const object = (value: unknown): Record<string, any> => value && typeof value === "object" ? value as Record<string, any> : {};
const valueAt = (source: Record<string, any>, path: string) => path.split(".").reduce((value, key) => object(value)[key], source);
const retrogradeBodies = new Set(["mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto", "chiron"]);

export function skyPlacementCompositionKeys({ planet, sign, motion }: Selection) {
  const base = planet === "lilith" ? `sky-lilith/article/${sign}`
    : planet.endsWith("-node") ? `sky-nodes/${planet}/${sign}` : `sky-placement/article/${planet}/${sign}`;
  return [...(motion === "retrograde" && retrogradeBodies.has(planet) ? [`sky-placement/retrograde/${planet}`] : []), base];
}

export default function SkyPlacementComposition({ rows, selection, onEditRow, onLoadRow }: Props) {
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
  return <section className="admin-composition-surface-actions" aria-label="Sky placement composition map">
    <header><div><p className="admin-eyebrow">Composition Map</p><h3>{title(current.planet)}{current.motion === "retrograde" ? " Rx" : ""} in {title(current.sign)}</h3></div>
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
    <p>The planet-in-sign article is shared by both motions. Retrograde adds its own paragraph. Select a section below to edit its source; the fallback sections belong to the same planet-in-sign source.</p>
    {error && <p role="alert">{error} <button type="button" onClick={() => setRetry(value => value + 1)}>Retry sources</button></p>}
    {keys.map((key, index) => {
      const row = selectedRows[index];
      if (!row) return <p role="status" key={key}>{error ? "Source unavailable: " : "Loading "}{key.includes("/retrograde/") ? "retrograde paragraph" : "planet-in-sign source"}{!error && "…"}</p>;
      const sections = object(row.sections);
      const source = object(sections.packageDraft ?? sections.packageRecord);
      const fields = Array.isArray(source.studio_editable_fields) ? source.studio_editable_fields as Array<{ path: string; label: string }> : [];
      return <article className="admin-composition-source-card" key={key} aria-label={key.includes("/retrograde/") ? "Retrograde source" : "Planet-in-sign source"}>
        <strong>{row.headline || key}</strong><ContentLiveStatusBadge row={row} />
        <p>{key.includes("/retrograde/") ? `Shared by ${title(current.planet)} retrograde in every sign.` : `Shared by ${title(current.planet)} in ${title(current.sign)}, direct and retrograde.`}</p>
        {fields.length ? fields.map(field => <div key={field.path} className="admin-composition-source-card">
          <strong>{field.label.replace(/ draft$/u, "")}</strong>
          <p className="admin-composition-source-copy">{String(valueAt(source, field.path) ?? "") || "No writing saved for this section."}</p>
          <button type="button" onClick={() => onEditRow(row)}>Edit {field.label.replace(/ draft$/u, "").toLowerCase()}</button>
        </div>) : <><p className="admin-composition-source-copy">{row.body}</p><button type="button" onClick={() => onEditRow(row)}>Edit source</button></>}
        <details><summary>Source details</summary><code>{key}</code></details>
      </article>;
    })}
  </section>;
}
