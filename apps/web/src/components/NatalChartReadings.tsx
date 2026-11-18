import { Fragment, useEffect, useRef, useState } from "react";
import type { SkySnapshot } from "../types";
import { natalChartReadings, natalReadingKeys, selectedNatalReadingBody, natalTwelfthRuler, type NatalReadingAudience } from "../content/natalChartReadings";
import { subscribeToContentPublications } from "../content/contentPublicationState";
import { loadLiveGeneratedContentForKeys, type LiveGeneratedContent } from "../services/generatedContent";
import { FormattedProse } from "./FormattedProse";
import { PageLoading, PageLoadState } from "./PageLoading";
import { NatalInsightCard } from "./NatalInsightCard";
import { pointGlyph } from "./charts/chartAssets";
import { natalReadingHref, natalReadingTriggerId, openNatalReadingPage } from "../services/natalReadingRoute";
import { natalReadingRoute } from "../services/natalReadingPath";

export function NatalChartReadings({ snapshot, audience, ownerName, chartId, planet, disabled = false, presentation = "overview", showHeading = true }: {
  snapshot: SkySnapshot | null | undefined;
  audience: NatalReadingAudience;
  ownerName?: string;
  chartId?: string;
  planet?: string;
  disabled?: boolean;
  presentation?: "overview" | "sect" | "insights";
  showHeading?: boolean;
}) {
  const readings = (disabled ? [] : natalChartReadings(snapshot, audience, planet)).filter(reading =>
    presentation === "sect" ? reading.contentKey.includes("/sect/")
      : presentation === "insights" ? reading.contentKey.includes("/natal-twelfth-ruler/") : true);
  const keys = JSON.stringify(natalReadingKeys(readings));
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<{ keys: string; revision: number; rows: Map<string, LiveGeneratedContent> | null } | null>(null);
  const readingFocusRestored = useRef(false);
  useEffect(() => subscribeToContentPublications(() => setRevision(value => value + 1)), []);
  useEffect(() => {
    const requestedKeys: string[] = JSON.parse(keys);
    if (!requestedKeys.length) return;
    let active = true;
    void loadLiveGeneratedContentForKeys(requestedKeys, { requireFresh: true }).then(rows => {
      if (active) setState({ keys, revision, rows });
    }).catch(() => {
      if (active) setState({ keys, revision, rows: null });
    });
    return () => { active = false; };
  }, [keys, revision]);
  useEffect(() => {
    const id = natalReadingTriggerId(presentation === "sect" ? "sect" : "twelfth-ruler", chartId);
    const opener = document.getElementById(id);
    if (readingFocusRestored.current || presentation === "overview" || natalReadingRoute(window.location.pathname) || window.history.state?.natalReadingOpener !== id
      || !opener || opener.closest("[hidden], [inert]")) return;
    opener.focus();
    readingFocusRestored.current = true;
  }, [state, chartId, presentation]);
  if (!readings.length) return null;
  const pending = !state || state.keys !== keys || state.revision !== revision;
  if (pending || !state.rows) return <PageLoadState what={presentation === "sect" ? "Chart sect" : presentation === "insights" ? "Patterns & Insights" : "Chart readings"} failed={!pending && !state?.rows} pending={pending} onRetry={() => setRevision(value => value + 1)}>
    <PageLoading message="Loading chart readings"/>
  </PageLoadState>;
  if (!planet && presentation !== "overview") {
    const visible = readings.filter(reading => presentation === "sect" ? reading.contentKey.includes("/sect/") : reading.contentKey.endsWith("/introduction"))
      .flatMap(reading => { const body = selectedNatalReadingBody(reading, state.rows!, audience, ownerName); return body ? [{ ...reading, body }] : []; });
    const ruler = readings.find(reading => reading.contentKey.includes("/ruler-house/"));
    if (!visible.length) return null;
    return <>
      <section className={`natal-readings natal-readings--${presentation}`} aria-label={presentation === "sect" ? "Chart sect" : "Insights"}>
        {presentation === "insights" && showHeading && <h2>Insights</h2>}
        <div className="natal-readings__items">{visible.map(reading => presentation === "insights" ? <NatalInsightCard key={reading.contentKey} glyph={pointGlyph(natalTwelfthRuler(snapshot) ?? "✦")} meta={ruler?.label.replace(/^Twelfth-house/u, "12th house")} id={natalReadingTriggerId("twelfth-ruler", chartId)} href={natalReadingHref("twelfth-ruler", chartId)} title="Understanding undoing" body={reading.body} onOpen={() => openNatalReadingPage(natalReadingHref("twelfth-ruler", chartId))}/> : <a id={natalReadingTriggerId("sect", chartId)} className="natal-reading-card" key={reading.contentKey} href={natalReadingHref("sect", chartId)} onClick={event => { if (event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return; event.preventDefault(); openNatalReadingPage(natalReadingHref("sect", chartId)); }}>
          <span className="natal-reading-card__glyph" aria-hidden="true">{reading.label === "Day chart" ? "☉" : "☽"}</span>
          <strong>{reading.label}</strong>
          <span className="natal-reading-card__preview">{reading.body.split(/(?<=[.!?])\s/u)[0]}</span>
        </a>)}</div>
      </section>

    </>;
  }
  return <>{readings.map(reading => {
    const body = selectedNatalReadingBody(reading, state.rows!, audience, ownerName);
    if (!body) return null;
    const paragraphs = body.split(/\n{2,}/u).map((text, index) => <FormattedProse key={index} text={text} />);
    if (planet) return <section className="article-section sky-detail-section" aria-label={reading.label} key={reading.contentKey}>
      <h2>{reading.label}</h2>{paragraphs}
    </section>;
    return <Fragment key={reading.contentKey}>
      <h2 className="eyebrow section-label">{reading.label}</h2>
      <section className="you-signatures-card" aria-label={reading.label}>
        <div className="you-signatures-main">{paragraphs}</div>
      </section>
    </Fragment>;
  })}</>;
}
