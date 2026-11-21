import { useEffect, useState } from "react";
import { natalInsightSigns, natalInsightTopics, type NatalInsightId } from "../../web/src/content/natalInsightDefinitions";
import { natalInsightCombinationFields, natalInsightCombinationKey, natalInsightCombinationLabel,
  natalInsightCompletePrefix, parseNatalInsightCombinationKey, type NatalInsightCombination } from "../../web/src/content/natalInsightCombination";
import { AdminSelect } from "./AdminNativeControls";
import { StudioButton } from "./StudioControls";
import { Text } from "./studio-ds/primitives";
import { readGeneratedContentPage } from "./generatedContentClient";
import ContentLiveStatusBadge from "./ContentLiveStatus";
import type { NatalInsightSourceProps } from "./NatalInsightSourceFinder";

type PageRow = { id: string; content_key: string; status: string; updated_at?: string | null };
export default function NatalInsightCombinationFinder({ secret, revision, insightSurfaces, onOpenInsight, isLoading, onOpenSource }: Pick<NatalInsightSourceProps, "insightSurfaces" | "onOpenInsight"> & {
  secret: string; revision: string; isLoading: boolean; onOpenSource: (key: string, label: string) => void;
}) {
  const [selection, setSelection] = useState<NatalInsightCombination>(() => {
    const query = new URLSearchParams(window.location.hash.split("?")[1] ?? "");
    return parseNatalInsightCombinationKey(query.get("reading") ?? "")
      ?? { topic: "home-belonging", audience: "you", timed: true, planets: {} };
  });
  const [cursors, setCursors] = useState<string[]>([]);
  const [retry, setRetry] = useState(0);
  const [result, setResult] = useState<{ identity: string; rows: PageRow[]; next?: string | null; error?: string } | null>(null);
  const fields = natalInsightCombinationFields(selection);
  const key = natalInsightCombinationKey(selection);
  const surface = insightSurfaces.find(item => item.id === `natal-insight-${selection.topic}`);
  const prefix = `${natalInsightCompletePrefix}${selection.audience === "you" ? "you" : "they"}/${selection.topic}/`;
  const cursor = cursors.at(-1);
  const identity = JSON.stringify([prefix, cursor, revision, retry]);
  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ contentKeyPrefix: prefix, status: "all", visibility: "all", view: "inventory", limit: "20" });
    if (cursor) params.set("cursor", cursor);
    void readGeneratedContentPage(`/api/admin/generated-content-inventory?${params}`, secret, controller.signal)
      .then(page => {
        if (page.rows.some(row => !row.content_key.startsWith(prefix) || !parseNatalInsightCombinationKey(row.content_key))) throw new Error("The saved combinations could not be verified.");
        if (!controller.signal.aborted) setResult({ identity, rows: page.rows, next: page.nextCursor });
      })
      .catch(error => { if (!controller.signal.aborted) setResult({ identity, rows: [], error: error instanceof Error ? error.message : "The saved readings could not load." }); });
    return () => controller.abort();
  }, [identity, prefix, cursor, secret]);
  const ready = result?.identity === identity;
  const change = (patch: Partial<NatalInsightCombination>) => {
    const next = { ...selection, ...patch };
    setSelection(next); setCursors([]);
    const url = new URL(window.location.href);
    const [route, query] = url.hash.split("?");
    const params = new URLSearchParams(query);
    const readingKey = natalInsightCombinationKey(next);
    if (readingKey) params.set("reading", readingKey); else params.delete("reading");
    url.hash = `${route}?${params}`;
    window.history.replaceState(window.history.state, "", url);
  };
  const signOptions = <><option value="">Choose a sign</option>{natalInsightSigns.map(sign => <option key={sign}>{sign}</option>)}</>;
  const topicTitle = natalInsightTopics.find(topic => topic.id === selection.topic)!.title;
  const label = natalInsightCombinationLabel(selection);
  return <section className="admin-natal-source-group" aria-label="Complete combination readings">
    <header><h3>Complete readings</h3><Text size="body" tone="secondary">Choose the chart combination to write or edit its complete reading. You and Friends have separate drafts.</Text></header>
    <div className="admin-natal-placement-selectors">
      <label><span>Reading topic</span><AdminSelect aria-label="Reading topic" value={selection.topic} onChange={event => change({ topic: event.target.value as NatalInsightId, sourceSign: undefined, planets: {}, midheaven: undefined })}>
        {natalInsightTopics.map(topic => <option value={topic.id} key={topic.id}>{topic.title}</option>)}
      </AdminSelect></label>
      <label><span>Reading audience</span><AdminSelect aria-label="Reading audience" value={selection.audience} onChange={event => change({ audience: event.target.value as "you" | "friend" })}><option value="you">You</option><option value="friend">Friends</option></AdminSelect></label>
      {selection.topic !== "emotional-needs" && <label><span>Birth time</span><AdminSelect aria-label="Birth time" value={selection.timed ? "known" : "unknown"} onChange={event => change({ timed: event.target.value === "known" })}><option value="known">Known</option><option value="unknown">Unknown</option></AdminSelect></label>}
      {!fields.unavailable && selection.timed && fields.anchor && <label><span>{fields.anchor === 1 ? "Rising sign" : `Sign in house ${fields.anchor}`}</span><AdminSelect aria-label={fields.anchor === 1 ? "Rising sign" : `Sign in house ${fields.anchor}`} value={selection.sourceSign ?? ""} onChange={event => change({ sourceSign: event.target.value })}>{signOptions}</AdminSelect></label>}
      {!fields.unavailable && fields.planets.map(planet => <label key={planet}><span>{planet.charAt(0).toUpperCase() + planet.slice(1)} sign</span><AdminSelect aria-label={`${planet.charAt(0).toUpperCase() + planet.slice(1)} sign`} value={selection.planets[planet] ?? ""} onChange={event => change({ planets: { ...selection.planets, [planet]: event.target.value } })}>{signOptions}</AdminSelect></label>)}
      {!fields.unavailable && selection.topic === "work-direction" && <label><span>Midheaven sign</span><AdminSelect aria-label="Midheaven sign" value={selection.midheaven ?? ""} onChange={event => change({ midheaven: event.target.value || undefined })}><option value="">Unavailable</option>{natalInsightSigns.map(sign => <option key={sign}>{sign}</option>)}</AdminSelect></label>}
    </div>
    {fields.unavailable ? <Text role="status" size="body">This topic needs a known birth time to determine its houses.</Text> : <>
      <Text size="body" tone="secondary">{label || "Choose the placements above. The ruler and its house will appear here."}</Text>
      <StudioButton disabled={isLoading || !key || !surface} onClick={() => {
        if (key && surface) onOpenInsight(surface, { contentKey: key, surface: "natal", headline: `${topicTitle} · ${selection.audience === "you" ? "You" : "Friends"} · ${label}`, label: "Complete reading", allowedSlots: selection.audience === "friend" ? ["ownerName"] : [] });
      }}>Open complete reading</StudioButton>
      <Text size="body" tone="secondary">Opening checks for saved writing first. A new reading starts blank and stays unpublished when you save a draft. Existing guides and templates remain available below.</Text>
    </>}
    <header><h4>Saved complete readings</h4><Text size="body" tone="secondary">{topicTitle} · {selection.audience === "you" ? "You" : "Friends"}</Text></header>
    {!ready ? <Text role="status" size="body">Loading saved readings…</Text> : result.error ? <div role="alert"><Text size="body">{result.error}</Text><StudioButton onClick={() => setRetry(value => value + 1)}>Retry saved readings</StudioButton></div> : <>
      {!result.rows.length && <Text role="status" size="body">No complete readings are saved on this page. Choose a combination above to start one.</Text>}
      {result.rows.map(row => <div className="admin-natal-source-card" key={row.id}>
        <Text size="body">{natalInsightCombinationLabel(parseNatalInsightCombinationKey(row.content_key)!)}</Text>
        <ContentLiveStatusBadge row={row} />
        <StudioButton disabled={isLoading} onClick={() => onOpenSource(row.content_key, topicTitle)}>Edit complete reading</StudioButton>
      </div>)}
      <div className="admin-action-row"><StudioButton disabled={!cursors.length} onClick={() => setCursors(current => current.slice(0, -1))}>Previous readings</StudioButton>
        <Text size="body">Page {cursors.length + 1}</Text><StudioButton disabled={!result.next} onClick={() => setCursors(current => [...current, result.next!])}>Next readings</StudioButton>
        <StudioButton onClick={() => { setCursors([]); setRetry(value => value + 1); }}>Refresh readings</StudioButton></div>
    </>}
  </section>;
}
