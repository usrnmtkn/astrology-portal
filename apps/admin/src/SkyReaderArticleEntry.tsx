import { useEffect, useRef, useState } from 'react';
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
  const [channel, setChannel] = useState(() => crypto.randomUUID()), [error, setError] = useState('');
  const frame = useRef<HTMLIFrameElement>(null);
  const recovery = useRef(false);
  const latest = useRef({ request, onOpen }); latest.current = { request, onOpen };
  const url = skyReaderPreviewFrameUrl(window.location.origin, channel);
  const origin = new URL(url).origin;
  // Saved dated articles are opened by the workspace inventory. Never turn an absent/archived identity into a new fallback draft.
  const unavailable = context.sourceKey.startsWith('sky-article/');
  useEffect(() => {
    if (unavailable) { setError('This source is no longer available. Open Content Library to inspect or restore its saved writing.'); return; }
    let cancelled = false, requested = false, received = false;
    const controller = new AbortController();
    setError('');
    const connect = () => frame.current?.contentWindow?.postMessage({ protocol: skyReaderPreviewProtocol, channel, type: 'ready-request' }, origin);
    const connectionTimer = window.setInterval(connect, 500);
    const stop = () => { cancelled = true; clearInterval(connectionTimer); clearTimeout(timer); controller.abort(); };
    const timer = window.setTimeout(() => {
      if (!received && !recovery.current) {
        recovery.current = true; stop(); setChannel(crypto.randomUUID());
      } else failed('The complete reader article did not finish loading. Retry opening it.');
    }, 60_000);
    const failed = (reason: unknown) => {
      if (cancelled) return;
      stop();
      setError(typeof reason === 'string' ? reason : reason instanceof Error ? reason.message : 'The reader article could not be opened.');
    };
    const placement = skyPassageEditPlacement(context.sourceKey);
    const readFacts = (instant: string) => latest.current.request<{ ok: boolean; facts: PlacementVisitFacts }>(`/api/admin/sky-article-facts?${new URLSearchParams({
      planet: placement.planet, date: context.date, instant, timeZone: context.timeZone, period: 'current', format: SKY_INGRESS_ARTICLE_FORMAT
    })}`, { signal: controller.signal });
    // Reader links already carry the exact instant, so these independent reads
    // can share the loading budget. Both results are verified before opening.
    const factsRequest = context.instant ? readFacts(context.instant) : null;
    void factsRequest?.catch(failed);
    const receive = async (event: MessageEvent) => {
      const data = event.data;
      if (cancelled || event.source !== frame.current?.contentWindow || event.origin !== origin
        || data?.protocol !== skyReaderPreviewProtocol || data.channel !== channel) return;
      if (data.type === 'ready' && !requested) {
        requested = true; clearInterval(connectionTimer);
        const input: SkyReaderPreviewRequest = { protocol: skyReaderPreviewProtocol, channel, type: 'render', requestId: 1,
          ...placement, date: context.date, instant: context.instant, captureArticle: true,
          location: { ...getInitialLocation().location, timeZone: context.timeZone }, mode: 'published', theme: 'light', draft: null };
        frame.current?.contentWindow?.postMessage(input, origin);
      }
      if (data.requestId !== 1 || received) return;
      if (data.type === 'error') { failed(data.error); return; }
      if (data.type !== 'result') return;
      received = true;
      try {
        const result = data.result as SkyReaderPreviewResult, copy = result.article;
        if (!copy?.body?.trim() || !copy.title?.trim() || copy.timeZone !== context.timeZone
          || skyPreviewReferenceDate(copy.instant, copy.timeZone) !== context.date || context.instant && copy.instant !== new Date(context.instant).toISOString()
          || !copy.sourceKeys.includes(context.sourceKey) || result.placement.signKey !== placement.sign)
          throw new Error('The published reader source changed or its complete wording could not be verified. Reopen Edit from the reader.');
        const payload = await (factsRequest ?? readFacts(copy.instant));
        if (!payload.ok || payload.facts?.articlePeriod !== 'current') throw new Error('The calculated article period could not be verified.');
        assertPlacementVisit(payload.facts, placement.planet, placement.sign);
        if (Date.parse(payload.facts.generatedAt) !== Date.parse(copy.instant)
          || !(Date.parse(payload.facts.transitStartInstant) <= Date.parse(copy.instant) && Date.parse(copy.instant) < Date.parse(payload.facts.transitEndInstant)))
          throw new Error('The calculated period does not match this reader instant. Retry opening the article.');
        if (!cancelled) { stop(); latest.current.onOpen(copy, payload.facts); }
      } catch (reason) { failed(reason); }
    };
    window.addEventListener('message', receive);
    connect();
    return () => { stop(); window.removeEventListener('message', receive); };
  }, [channel, origin, context, unavailable]);
  return <div aria-label="Passage opened from reader">
    {error ? <><p role="alert">{error}</p><StudioButton type="button" onClick={() => { recovery.current = false; if (unavailable) onReload(); else setChannel(crypto.randomUUID()); }}>Retry opening passage</StudioButton></>
      : <p role="status">Loading the complete published wording and calculated article period…</p>}
    {!unavailable && <iframe hidden ref={frame} key={channel} src={url} title="Published article copy" sandbox="allow-scripts allow-same-origin" referrerPolicy="no-referrer" />}
  </div>;
}
