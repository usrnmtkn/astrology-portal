import { useEffect, useId, useState } from "react";
import { ChevronLeft } from "lucide-react";
import type { SkySnapshot } from "../types";
import { natalChartReadings, natalReadingBody, natalTwelfthRuler, type NatalReadingAudience } from "../content/natalChartReadings";
import { subscribeToContentPublications } from "../content/contentPublicationState";
import { loadLiveGeneratedContentForKeys, type LiveGeneratedContent } from "../services/generatedContent";
import { closeNatalReadingPage } from "../services/natalReadingRoute";
import { FormattedProse } from "./FormattedProse";
import { PageLoading, PageLoadError } from "./PageLoading";
import { pointGlyph } from "./charts/chartAssets";
import "../styles/natal-sect-page.css";

/** Both saved insight sources remain complete, in their original paragraph order. */
export function NatalInsightPage({ snapshot, audience, ownerName, chartId, loading = false }: {
  snapshot?: SkySnapshot | null; audience: NatalReadingAudience; ownerName?: string; chartId?: string; loading?: boolean;
}) {
  const readings = natalChartReadings(snapshot, audience).filter(row => row.contentKey.includes("/natal-twelfth-ruler/"));
  const keys = JSON.stringify(readings.map(row => row.contentKey));
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<{ keys: string; revision: number; rows?: Map<string, LiveGeneratedContent>; error?: boolean } | null>(null);
  const titleId = useId();
  useEffect(() => subscribeToContentPublications(() => setRevision(value => value + 1)), []);
  useEffect(() => {
    let active = true;
    const requested: string[] = JSON.parse(keys);
    if (!requested.length) return;
    void loadLiveGeneratedContentForKeys(requested, { requireFresh: true }).then(rows => {
      if (active) setState({ keys, revision, rows });
    }).catch(() => { if (active) setState({ keys, revision, error: true }); });
    return () => { active = false; };
  }, [keys, revision]);
  useEffect(() => { document.getElementById(titleId)?.focus({ preventScroll: true }); }, [titleId, keys]);
  const pending = loading || Boolean(readings.length && (state?.keys !== keys || state.revision !== revision));
  const introduction = readings.find(row => row.contentKey.endsWith("/introduction"));
  const ruler = readings.find(row => row.contentKey.includes("/ruler-house/"));
  const body = (key?: string) => !pending && key ? natalReadingBody(state?.rows?.get(key), audience, ownerName) : null;
  const intro = body(introduction?.contentKey), detail = body(ruler?.contentKey);
  const paragraphs = (text: string) => text.split(/\n{2,}/u).map((paragraph, index) => <FormattedProse key={index} text={paragraph}/>);
  return <section className="natal-sect-page natal-insight-page" aria-labelledby={titleId}>
    <button className="floating-back-button natal-sect-back" type="button" aria-label="Back" onClick={() => closeNatalReadingPage("twelfth-ruler", chartId)}>
      <ChevronLeft size={16} aria-hidden="true"/><span>Back</span>
    </button>
    <article className="natal-sect-article">
      <div className="natal-sect-intro">
        <header className="natal-sect-header">
          <span className="natal-sect-glyph" data-tone="support" aria-hidden="true">{pointGlyph(natalTwelfthRuler(snapshot) ?? "✦")}</span>
          <div><p className="natal-sect-meta">Insight · {audience === "you" ? "Your natal chart" : `${ownerName ?? "Friend"}'s natal chart`}</p>
            <h1 id={titleId} tabIndex={-1}>{introduction?.label ?? "Understanding undoing"}</h1></div>
        </header>
        {pending ? <PageLoading message="Loading chart reading…"/> : state?.error
          ? <PageLoadError message="The chart reading could not load." onRetry={() => setRevision(value => value + 1)}/>
          : intro ? paragraphs(intro) : <p>{readings.length ? "This chart reading is not available yet." : "A known birth time is needed for this chart reading."}</p>}
      </div>
      {ruler && detail && <div className="natal-sect-sections"><section><h2>{ruler.label}</h2>{paragraphs(detail)}</section></div>}
    </article>
  </section>;
}
