import { useEffect, useRef, useState } from 'react';
import { StudioButton } from './StudioControls';
import { SKY_INGRESS_ARTICLE_FORMAT } from '../../web/src/content/skyIngressEssay.mjs';
import { articleAspectHref, articleFactsReferenceDate, articlePeriodAspects, type ArticleWindow, type ArticleEventFacts } from './skyArticleRelatedContent';

type Props = { window: ArticleWindow; facts?: ArticleEventFacts | null;
  request: <T>(path: string, options?: RequestInit) => Promise<T> };
export default function SkyArticleAspects({ window, facts, request }: Props) {
  const [loaded, setLoaded] = useState<ArticleEventFacts | null>(null);
  const [error, setError] = useState(''), [retry, setRetry] = useState(0);
  const read = useRef(request); read.current = request;
  const supplied = articlePeriodAspects(window, facts);
  const result = supplied ?? articlePeriodAspects(window, loaded);
  useEffect(() => {
    setLoaded(null); setError('');
    if (supplied) return;
    const controller = new AbortController();
    void (async () => {
      // Reconstruct an older article only if the engine confirms its exact saved
      // bounds. Today's date must never substitute a different visit or chapter.
      const date = articleFactsReferenceDate(window);
      if (!date) throw new Error('This saved period has no reference date supported by the aspect lookup. Its article text is retained.');
      for (const period of ['current', 'visit']) {
        const payload = await read.current<{ ok: boolean; facts: ArticleEventFacts }>(`/api/admin/sky-article-facts?${new URLSearchParams({ planet: window.planet, date, period, format: SKY_INGRESS_ARTICLE_FORMAT })}`, { signal: controller.signal });
        if (payload.ok && articlePeriodAspects(window, payload.facts)) { if (!controller.signal.aborted) setLoaded(payload.facts); return; }
      }
      throw new Error('Calculated aspects could not be matched to this saved period.');
    })().catch(reason => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Calculated aspects could not load.'); });
    return () => controller.abort();
  }, [window.planet, window.sign, window.transitStartInstant, window.transitEndInstant, Boolean(supplied), retry]);
  const date = (instant: string) => new Intl.DateTimeFormat('en-US', { timeZone: facts?.referenceTimeZone ?? loaded?.referenceTimeZone ?? 'America/New_York', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(instant));
  return <section className="studio-section" aria-label="Aspects during this article period">
    <h3>Aspects during this period</h3>
    <p>{date(window.transitStartInstant)} to {date(window.transitEndInstant)}. These are calculated sky aspects involving this article’s planet.</p>
    {error ? <div role="alert"><p>{error}</p><StudioButton onClick={() => setRetry(value => value + 1)}>Retry aspects</StudioButton></div>
      : !result ? <p role="status">Loading calculated aspects…</p>
      : <>
        {!result.complete && <p role="status">The calculation covers through {date(result.coverageEnd)}. Later aspects have not been calculated.</p>}
        {result.events.length ? <ul className="studio-article-events">{result.events.map(event => <li key={event.id}>
          <a href={articleAspectHref(event)} target="_blank" rel="noopener noreferrer">{event.title}</a>
          <span>{date(event.startsAt)}</span>
        </li>)}</ul> : <p>{result.complete ? 'No exact aspects involving this planet fall within this period.' : 'No exact aspects involving this planet were found in the calculated portion.'}</p>}
      </>}
  </section>;
}
