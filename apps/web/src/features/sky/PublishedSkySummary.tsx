import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { PageLoading, PageLoadError } from "../../components/PageLoading";
import { skyDailySummaryParts, type SkyDailySummaryFacts, type SummaryPart } from "../../content/skyDailySummary";
import { skyDailySummaryFields, skySummaryTemplateErrors } from "../../content/skyDailySummaryCatalog";
import { moonSummaryKey, selectedMoonKind } from "../../content/skyMoonSummary";
import { ingressSummaryKeys, skySummaryEventFacts } from "../../content/skySummaryEvents";
import { contentPublication, publicationAllowsContent } from "../../content/contentPublicationState";
import { contentPublicationsResolved, refreshContentPublications } from "../../services/contentPublications";
import { loadLiveGeneratedContentForKeys, type LiveGeneratedContent } from "../../services/generatedContent";
import { subscribeToContentUpdates, subscribeToContentRevalidation } from "../../services/contentUpdateSignal";
import type { LunarCalendarEvent } from "../../services/ephemeris";
import { useSkySummarySettled } from "./SkyReadingLayout";

type Content = Map<string, LiveGeneratedContent>;
type LoadState = { key: string; content: Content; status: "loading" | "ready" | "error" };

export function skySummarySourceKeys(facts: SkyDailySummaryFacts, events: LunarCalendarEvent[]) {
  const kind = selectedMoonKind(facts.event);
  const sun = kind === "regular" || facts.sunTransition ? facts.sun : facts.event?.sun ?? facts.sun;
  const moon = kind === "regular" ? facts.moon : facts.event;
  const common = skyDailySummaryFields.filter(field => !/^cms\/sky-daily-summary\/(sun|moon)\//u.test(field.key)).map(field => field.key);
  return [...new Set([...common,
    ...(sun?.sign ? [`cms/sky-daily-summary/sun/${sun.sign.toLowerCase()}`] : []),
    ...(moon?.sign ? [moonSummaryKey(moon.sign, kind)] : []),
    ...events.flatMap(ingressSummaryKeys)
  ])].sort();
}

export function missingPublishedSkySummaryKeys(keys: readonly string[], content: Content) {
  return keys.filter(key => {
    const publication = contentPublication(key);
    if (publication?.state !== "live") return false;
    const row = content.get(key);
    // The canonical loader has already checked LIVE/serving/review-clear;
    // normalized LiveGeneratedContent does not always retain the status field.
    return !row || !publicationAllowsContent(key, row.id, row.updatedAt, row.targetDate)
      || Boolean(row.status && row.status !== "LIVE") || !row.body.trim()
      || skySummaryTemplateErrors(key, row.body).length > 0;
  });
}

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

  useEffect(() => {
    const update = () => setRefresh(value => value + 1);
    const stopUpdates = subscribeToContentUpdates(notice => {
      if (notice.contentKey === "*" || keys.includes(notice.contentKey)) update();
    });
    const stopRevalidation = subscribeToContentRevalidation(update);
    return () => { stopUpdates(); stopRevalidation(); };
  }, [sourceKey]);

  useEffect(() => {
    let active = true;
    const requestedKeys: string[] = JSON.parse(sourceKey);
    // Keep a current, previously resolved map on harmless background checks.
    setState(previous => previous.key === sourceKey && previous.status === "ready"
      ? previous : { key: sourceKey, content: previous.key === sourceKey ? previous.content : new Map(), status: "loading" });
    const fail = () => setState(previous => previous.key === sourceKey && previous.status === "ready"
      && contentPublicationsResolved() && !missingPublishedSkySummaryKeys(requestedKeys, previous.content).length
      ? previous : { key: sourceKey, content: new Map(), status: "error" });
    const timeout = window.setTimeout(() => { if (active) { fail(); active = false; } }, 20_000);
    void (async () => {
      await refreshContentPublications();
      const content = await loadLiveGeneratedContentForKeys(requestedKeys);
      const missing = missingPublishedSkySummaryKeys(requestedKeys, content);
      const publicationsResolved = contentPublicationsResolved();
      if (!publicationsResolved || missing.length) {
        throw new Error("The current Daily Sky publication could not be loaded.");
      }
      if (active) setState({ key: sourceKey, content, status: "ready" });
    })().catch(() => { if (active) fail(); }).finally(() => window.clearTimeout(timeout));
    return () => { active = false; window.clearTimeout(timeout); };
  }, [sourceKey, refresh]);

  const current = state.key === sourceKey;
  const ready = current && state.status === "ready" && contentPublicationsResolved()
    && missingPublishedSkySummaryKeys(keys, state.content).length === 0;
  const failed = factsError || current && state.status === "error";
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
    void refreshContentPublications(true).finally(() => {
      onRetryFacts();
      setRefresh(value => value + 1);
    });
  };
  return <div ref={body} className="sky-daily-summary__body" aria-label="Daily sky summary" aria-busy={loading}
    style={loading || failed ? { minHeight: height } : undefined}>
    {failed ? <PageLoadError message="The daily summary could not load. Your published writing has not changed." onRetry={retry} />
      : loading ? <PageLoading message="Loading the daily sky summary…" announce={false} />
      : children(skyDailySummaryParts({ ...facts, ...skySummaryEventFacts(events, state.content) }, state.content))}
  </div>;
}
