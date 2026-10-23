import { Fragment, useEffect, useState } from "react";
import type { SkySnapshot } from "../types";
import { natalChartReadings, natalReadingBody, type NatalReadingAudience } from "../content/natalChartReadings";
import { subscribeToContentPublications } from "../content/contentPublicationState";
import { loadLiveGeneratedContentForKeys, type LiveGeneratedContent } from "../services/generatedContent";
import { FormattedProse } from "./FormattedProse";
import { PageLoading, PageLoadError } from "./PageLoading";

export function NatalChartReadings({ snapshot, audience, ownerName, planet, disabled = false }: {
  snapshot: SkySnapshot | null | undefined;
  audience: NatalReadingAudience;
  ownerName?: string;
  planet?: string;
  disabled?: boolean;
}) {
  const readings = disabled ? [] : natalChartReadings(snapshot, audience, planet);
  const keys = JSON.stringify(readings.map(reading => reading.contentKey));
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<{ keys: string; revision: number; rows: Map<string, LiveGeneratedContent> | null } | null>(null);
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
  if (!readings.length) return null;
  if (!state || state.keys !== keys || state.revision !== revision) return <PageLoading message="Loading chart readings" />;
  if (!state.rows) return <PageLoadError message="Chart readings could not be loaded." onRetry={() => setRevision(value => value + 1)} />;
  return <>{readings.map(reading => {
    const body = natalReadingBody(state.rows!.get(reading.contentKey), audience, ownerName);
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
