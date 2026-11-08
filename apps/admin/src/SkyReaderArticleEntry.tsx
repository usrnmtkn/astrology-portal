import { useEffect, useMemo, useRef, useState } from 'react';
import { StudioButton } from './StudioControls';
import { getInitialLocation } from '../../web/src/services/skySelection';
import { skyPassageEditPlacement, type StudioPassageEdit } from '../../../src/shared/studioPassageEdit';
import { skyPreviewReferenceDate, skyReaderPreviewFrameUrl, skyReaderPreviewProtocol,
  type SkyReaderArticleCopy, type SkyReaderPreviewRequest, type SkyReaderPreviewResult } from '../../../src/shared/skyReaderPreview';
import { SKY_INGRESS_ARTICLE_FORMAT } from '../../web/src/content/skyIngressEssay.mjs';
import { assertPlacementVisit, type PlacementVisitFacts } from './skyPlacementWorkspaceModel';

type Props = { context: StudioPassageEdit; request: <T>(path: string, options?: RequestInit) => Promise<T>;
  onOpen: (copy: SkyReaderArticleCopy, facts: PlacementVisitFacts) => void; onReload: () => void };

/** Resolve the published reader in its existing isolated frame. Opening is read-only. */
export default function SkyReaderArticleEntry({ context, request, onOpen, onReload }: Props) {
  const [attempt, setAttempt] = useState(0), [error, setError] = useState('');
  const frame = useRef<HTMLIFrameElement>(null);
  const latest = useRef({ request, onOpen }); latest.current = { request, onOpen };
  const channel = useMemo(() => { void attempt; return crypto.randomUUID(); }, [attempt]);
  const url = useMemo(() => skyReaderPreviewFrameUrl(window.location.origin, channel), [channel]);
  const origin = new URL(url).origin;
  // Saved dated articles are opened by the workspace inventory. Never turn an absent/archived identity into a new fallback draft.
  const unavailable = context.sourceKey.startsWith('sky-article/');
  useEffect(() => {
    if (unavailable) { setError('This source is no longer available. Open Content Library to inspect or restore its saved writing.'); return; }
    let cancelled = false, requested = false, received = false;
    const controller = new AbortController();
    setError('');
    const timer = window.setTimeout(() => { cancelled = true; controller.abort(); setError('The complete reader article did not finish loading. Retry opening it.'); }, 60_000);
    const receive = (event: MessageEvent) => {
      const data = event.data;
      if (cancelled || event.source !== frame.current?.contentWindow || event.origin !== origin
        || data?.protocol !== skyReaderPreviewProtocol || data.channel !== channel) return;
      if (data.type === 'ready' && !requested) {
        requested = true;
        const placement = skyPassageEditPlacement(context.sourceKey);
        const input: SkyReaderPreviewRequest = { protocol: skyReaderPreviewProtocol, channel, type: 'render', requestId: 1,
          ...placement, date: context.date, instant: context.instant, captureArticle: true,
          location: { ...getInitialLocation().location, timeZone: context.timeZone }, mode: 'published', theme: 'light', draft: null };
        frame.current?.contentWindow?.postMessage(input, origin);
      }
      if (data.requestId !== 1 || received) return;
      if (data.type === 'error') { clearTimeout(timer); setError(data.error); return; }
      if (data.type !== 'result') return;
      received = true;
      void (async () => {
        const result = data.result as SkyReaderPreviewResult, copy = result.article;
        const placement = skyPassageEditPlacement(context.sourceKey);
        if (!copy?.body?.trim() || !copy.title?.trim() || copy.timeZone !== context.timeZone
          || skyPreviewReferenceDate(copy.instant, copy.timeZone) !== context.date || context.instant && copy.instant !== new Date(context.instant).toISOString()
          || !copy.sourceKeys.includes(context.sourceKey) || result.placement.signKey !== placement.sign)
          throw new Error('The published reader source changed or its complete wording could not be verified. Reopen Edit from the reader.');
        const payload = await latest.current.request<{ ok: boolean; facts: PlacementVisitFacts }>(`/api/admin/sky-article-facts?${new URLSearchParams({
          planet: placement.planet, date: context.date, instant: copy.instant, timeZone: context.timeZone, period: 'current', format: SKY_INGRESS_ARTICLE_FORMAT
        })}`, { signal: controller.signal });
        if (!payload.ok || payload.facts?.articlePeriod !== 'current') throw new Error('The calculated article period could not be verified.');
        assertPlacementVisit(payload.facts, placement.planet, placement.sign);
        if (Date.parse(payload.facts.generatedAt) !== Date.parse(copy.instant)
          || !(Date.parse(payload.facts.transitStartInstant) <= Date.parse(copy.instant) && Date.parse(copy.instant) < Date.parse(payload.facts.transitEndInstant)))
          throw new Error('The calculated period does not match this reader instant. Retry opening the article.');
        if (!cancelled) { clearTimeout(timer); latest.current.onOpen(copy, payload.facts); }
      })().catch(reason => { if (!cancelled) { clearTimeout(timer); setError(reason instanceof Error ? reason.message : 'The reader article could not be opened.'); } });
    };
    window.addEventListener('message', receive);
    return () => { cancelled = true; clearTimeout(timer); controller.abort(); window.removeEventListener('message', receive); };
  }, [channel, origin, context.sourceKey, context.date, context.timeZone, context.instant, unavailable]);
  return <div aria-label="Passage opened from reader">
    {error ? <><p role="alert">{error}</p><StudioButton type="button" onClick={() => unavailable ? onReload() : setAttempt(value => value + 1)}>Retry opening passage</StudioButton></>
      : <p role="status">Loading the complete published wording and calculated article period…</p>}
    {!unavailable && <iframe hidden ref={frame} key={channel} src={url} title="Published article copy" sandbox="allow-scripts allow-same-origin" referrerPolicy="no-referrer" />}
  </div>;
}
