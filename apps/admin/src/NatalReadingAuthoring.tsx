import { useState } from "react";
import type { LocationInput, SkySnapshot } from "../../web/src/types";
import { natalInsightTopics, type NatalInsightId } from "../../web/src/content/natalInsightCatalog";
import { surfaceSection } from "./studio-ds/recipes";
import { natalInsightFacts } from "../../web/src/services/natalInsightReading";
import { natalSnapshotWithBirthTimeReliability } from "../../web/src/services/birthTimeReliability";
import { validChartBirthDate, validChartBirthTime } from "../../web/src/services/chartProfile";
import { zonedDateTimeToUtc } from "../../web/src/services/timezones";
import { requestStudioJson } from "./generatedContentClient";
import { StudioButton, StudioInput } from "./StudioControls";
import type { PersonalizedReadingRow } from "./PersonalizedReadingEditor";

type Reader = { userId: string; name: string };
type Chart = { subjectId: string; audience: "you" | "friend"; name: string; version: string; birthDate: string; birthTime: string | null; birthTimeKnown: boolean; location: LocationInput | null; sky: SkySnapshot | null };
const endpoint = "/api/admin/user-generated-content";

export function NatalReadingAuthoring({ secret, beforeOpen, onOpen }: {
  secret: string; beforeOpen: () => boolean; onOpen: (row: PersonalizedReadingRow) => void;
}) {
  const [query, setQuery] = useState("");
  const [readers, setReaders] = useState<Reader[]>([]);
  const [searched, setSearched] = useState(false);
  const [reader, setReader] = useState<Reader | null>(null);
  const [charts, setCharts] = useState<Chart[]>([]);
  const [selected, setSelected] = useState<Chart | null>(null);
  const [sky, setSky] = useState<SkySnapshot | null>(null);
  const [topic, setTopic] = useState<NatalInsightId>("approach");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function run(action: () => Promise<void>) {
    setBusy(true); setError("");
    try { await action(); } catch (error) { setError(error instanceof Error ? error.message : "The chart could not load."); }
    finally { setBusy(false); }
  }
  async function search() {
    if (!beforeOpen()) return;
    setReader(null); setCharts([]); setSelected(null); setSky(null); setSearched(false);
    await run(async () => {
      const payload = await requestStudioJson(`${endpoint}?view=readers&query=${encodeURIComponent(query.trim())}`, secret);
      if (!Array.isArray(payload.readers)) throw new Error("The reader search could not be verified.");
      setReaders(payload.readers as Reader[]); setSearched(true);
    });
  }
  async function chooseReader(next: Reader) {
    if (!beforeOpen()) return;
    setReader(next); setCharts([]); setSelected(null); setSky(null);
    await run(async () => {
      const payload = await requestStudioJson(`${endpoint}?view=charts&userId=${encodeURIComponent(next.userId)}`, secret);
      if (!Array.isArray(payload.charts)) throw new Error("Saved charts could not be verified.");
      setCharts(payload.charts as Chart[]);
    });
  }
  async function chooseChart(next: Chart) {
    if (!beforeOpen()) return;
    setSelected(next); setSky(null);
    await run(async () => {
      let calculated = next.sky;
      if (!calculated) {
        if (!next.location?.timeZone || !next.birthDate || next.birthTimeKnown && !next.birthTime) throw new Error("Complete the saved chart's birth details before writing a reading.");
        const { getAstrodienstSkyOffMainThread } = await import("../../web/src/services/skyCalculationClient");
        calculated = await getAstrodienstSkyOffMainThread(next.location,
          zonedDateTimeToUtc(validChartBirthDate(next), next.birthTimeKnown ? validChartBirthTime(next) : "12:00 PM", next.location.timeZone), { includeDailyEvents: false });
      }
      if (!calculated.positions?.length || !Array.isArray(calculated.aspects)) throw new Error("Recalculate this saved chart before writing its reading.");
      setSky(natalSnapshotWithBirthTimeReliability(calculated, next.birthTimeKnown));
    });
  }
  async function open() {
    if (!reader || !selected || !sky || !beforeOpen()) return;
    await run(async () => {
      const payload = await requestStudioJson(endpoint, secret, { method: "POST", body: JSON.stringify({
        userId: reader.userId, subjectId: selected.subjectId, audience: selected.audience, chartVersion: selected.version, topic, sky
      }) });
      const row = (payload.rows as PersonalizedReadingRow[] | undefined)?.[0];
      if (!row?.id || !row.updated_at) throw new Error("The reading could not be opened. Reload before trying again.");
      onOpen(row);
    });
  }
  const facts = sky && selected ? natalInsightFacts(topic, sky, selected.birthTimeKnown) : null;
  return <section className={surfaceSection} aria-label="Write a natal reading">
    <h3>Write a natal reading</h3>
    <p>Choose a saved reader and chart, then write one complete reading for each topic.</p>
    <form onSubmit={event => { event.preventDefault(); void search(); }}>
      <label className="admin-field-wide">Find a reader<StudioInput value={query} onChange={event => setQuery(event.target.value)} placeholder="Name or account ID" disabled={busy} /></label>
      <StudioButton type="submit" disabled={busy || query.trim().length < 2}>Find reader</StudioButton>
    </form>
    {searched && !readers.length && <p>No saved readers match this search.</p>}
    {readers.length > 0 && <label className="admin-field-wide">Reader<select aria-label="Reader" disabled={busy} value={reader?.userId ?? ""} onChange={event => { const next = readers.find(item => item.userId === event.target.value); if (next) void chooseReader(next); }}>
      <option value="" disabled>Choose a reader</option>{readers.map(item => <option key={item.userId} value={item.userId}>{item.name} · {item.userId}</option>)}
    </select></label>}
    {reader && !busy && !charts.length && !error && <p>This reader has no saved charts.</p>}
    {charts.length > 0 && <label className="admin-field-wide">Chart<select aria-label="Chart" disabled={busy} value={selected?.subjectId ?? ""} onChange={event => { const next = charts.find(item => item.subjectId === event.target.value); if (next) void chooseChart(next); }}>
      <option value="" disabled>Choose a chart</option>{charts.map(item => <option key={item.subjectId} value={item.subjectId}>{item.name} · {item.audience === "you" ? "You" : "Friends"}</option>)}
    </select></label>}
    {selected && <label className="admin-field-wide">Topic<select aria-label="Topic" disabled={busy} value={topic} onChange={event => { if (beforeOpen()) setTopic(event.target.value as NatalInsightId); }}>
      {natalInsightTopics.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}
    </select></label>}
    {facts && <details><summary>Chart facts for this topic</summary>
      {!facts.birthTimeKnown && <p>Birth time is unknown. Houses and angles are omitted.</p>}
      <ul>{facts.placements.map(p => <li key={p.planet}>{p.planet} in {p.sign}{p.house ? ` · House ${p.house}` : ""}</li>)}</ul>
      <ul>{facts.houses.map(h => <li key={h.house}>House {h.house} · {h.sign} · Ruler: {h.ruler}</li>)}</ul>
      <ul>{facts.aspects.map((a, i) => <li key={i}>{a.from} {a.type} {a.to} · Orb {a.orb}°</li>)}</ul>
    </details>}
    {busy && <p role="status">Loading chart or reading…</p>}
    {error && <p role="alert">{error}</p>}
    {selected && <StudioButton disabled={busy || !sky} onClick={() => void open()}>Open topic write-up</StudioButton>}
  </section>;
}
