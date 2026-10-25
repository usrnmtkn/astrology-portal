import { skySummarySourceKeys, missingPublishedSkySummaryKeys } from "./skySummarySources";
export { skySummarySourceKeys, missingPublishedSkySummaryKeys } from "./skySummarySources";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { PageLoading, PageLoadError } from "../../components/PageLoading";
import { skyDailySummaryParts, type SkyDailySummaryFacts, type SummaryPart } from "../../content/skyDailySummary";
import { skySummaryEventFacts } from "../../content/skySummaryEvents";
import { skyListPublicationsResolved, refreshSkyListPublications } from "../../services/contentPublications";
import { generatedContentMapFromRows, loadLiveGeneratedContentForKeys, type LiveGeneratedContent } from "../../services/generatedContent";
import { initialSkyReaderRows } from "../../services/initialSkyReader";
import { subscribeToContentUpdates, subscribeToContentRevalidation } from "../../services/contentUpdateSignal";
import { contentPublicationGeneration, subscribeToContentPublications } from "../../content/contentPublicationState";
import type { LunarCalendarEvent } from "../../services/ephemeris";
import { useSkySummarySettled } from "./SkyReadingLayout";

type Content = Map<string, LiveGeneratedContent>;
type LoadState = { key: string; content: Content; status: "loading" | "ready" | "error" };

/** Resolve sources before the first prose paint, independently of the broader
 * Sky map that is cleared while unrelated placements/aspects revalidate.
 * This owns loading state, not writing. The canonical composer is unchanged.
 */
export function PublishedSkySummary({ facts, events, factsReady, factsError, onRetryFacts, children }: {
  facts: SkyDailySummaryFacts;
  events: LunarCalendarEvent[];
  factsReady: boolean;
  factsError: boolean;
  onRetryFacts: () => void;
  children: (parts: SummaryPart[]) => ReactNode;
}) {
  const keys = skySummarySourceKeys(facts, events);
  const sourceKey = JSON.stringify(keys);
  const [refresh, setRefresh] = useState(0);
  const [state, setState] = useState<LoadState>(() => ({ key: "", content: new Map(), status: "loading" }));
  const body = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | undefined>();
  // The verified opening response already contains these complete projected
  // sources. Render through the same mapper/composer on the first facts frame;
  // the ordinary async owner still handles refresh, expiry, failure and Retry.
  const prepared = useMemo(() => {
    if (!factsReady || !skyListPublicationsResolved()) return null;
    const rows = initialSkyReaderRows({keys: JSON.parse(sourceKey)});
    if (!rows) return null;
    const content = generatedContentMapFromRows(rows);
    return missingPublishedSkySummaryKeys(JSON.parse(sourceKey), content).length ? null : content;
  }, [sourceKey, factsReady, refresh, contentPublicationGeneration]);
  const displayed: LoadState = prepared ? {key:sourceKey,content:prepared,status:"ready"} : state;

  useEffect(() => {
    const update = () => setRefresh(value => value + 1);
    const stopPublications = subscribeToContentPublications(update);
    const stopUpdates = subscribeToContentUpdates(notice => {
      if (notice.contentKey === "*" || keys.includes(notice.contentKey)) update();
    });
    const stopRevalidation = subscribeToContentRevalidation(update);
    return () => { stopPublications(); stopUpdates(); stopRevalidation(); };
  }, [sourceKey]);

  useEffect(() => {
    let active = true;
    const requestedKeys: string[] = JSON.parse(sourceKey);
    // Keep a current, previously resolved map on harmless background checks.
    setState(previous => previous.key === sourceKey && previous.status === "ready"
      ? previous : { key: sourceKey, content: previous.key === sourceKey ? previous.content : new Map(), status: "loading" });
    const fail = () => setState(previous => previous.key === sourceKey && previous.status === "ready"
      && skyListPublicationsResolved() && !missingPublishedSkySummaryKeys(requestedKeys, previous.content).length
      ? previous : { key: sourceKey, content: new Map(), status: "error" });
    const timeout = window.setTimeout(() => { if (active) { fail(); active = false; } }, 20_000);
    void (async () => {
      await refreshSkyListPublications();
      const content = await loadLiveGeneratedContentForKeys(requestedKeys);
      const missing = missingPublishedSkySummaryKeys(requestedKeys, content);
      const publicationsResolved = skyListPublicationsResolved();
      if (!publicationsResolved || missing.length) {
        throw new Error("The current Daily Sky publication could not be loaded.");
      }
      if (active) setState({ key: sourceKey, content, status: "ready" });
    })().catch(() => { if (active) fail(); }).finally(() => window.clearTimeout(timeout));
    return () => { active = false; window.clearTimeout(timeout); };
  }, [sourceKey, refresh]);

  const current = displayed.key === sourceKey;
  const ready = current && displayed.status === "ready" && skyListPublicationsResolved()
    && missingPublishedSkySummaryKeys(keys, displayed.content).length === 0;
  const failed = factsError || current && displayed.status === "error";
  const loading = !failed && (!factsReady || !ready);
  useSkySummarySettled(!loading);
  useLayoutEffect(() => {
    if (loading || failed || !body.current) return;
    const observer = new ResizeObserver(() => {
      const measured = body.current?.scrollHeight;
      if (measured) setHeight(previous => previous === measured ? previous : measured);
    });
    observer.observe(body.current);
    return () => observer.disconnect();
  }, [loading, failed, sourceKey]);
  const retry = () => {
    void refreshSkyListPublications(true).finally(() => {
      onRetryFacts();
      setRefresh(value => value + 1);
    });
  };
  return <div ref={body} className="sky-daily-summary__body" aria-label="Daily sky summary" aria-busy={loading}
    style={loading || failed ? { minHeight: height } : undefined}>
    {failed ? <PageLoadError message="The daily summary could not load. Your published writing has not changed." onRetry={retry} />
      : loading ? <PageLoading message="Loading the daily sky summary…" announce={false} />
      : children(skyDailySummaryParts({ ...facts, ...skySummaryEventFacts(events, displayed.content) }, displayed.content, { sunSummaryLength: "short" }))}
  </div>;
}
