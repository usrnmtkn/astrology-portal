import { useEffect, useRef, useState } from 'react';
import { skyReaderCapture } from '../../../src/shared/skyReaderCapture';
import { StudioButton } from './StudioControls';
import { getInitialLocation, skyDateTimeFromInput } from '../../web/src/services/skySelection';
import type { SkySnapshot } from '../../web/src/types';
import { skyPassageEditPlacement, type StudioPassageEdit } from '../../../src/shared/studioPassageEdit';
import { skyPreviewReferenceDate, skyReaderPreviewFrameUrl, skyReaderPreviewProtocol,
  type SkyReaderArticleCopy, type SkyReaderPreviewRequest, type SkyReaderPreviewResult } from '../../../src/shared/skyReaderPreview';
import { SKY_INGRESS_ARTICLE_FORMAT } from '../../web/src/content/skyIngressEssay.mjs';
import { assertPlacementVisit, type PlacementVisitFacts } from './skyPlacementWorkspaceModel';

type Props = { context: StudioPassageEdit; request: <T>(path: string, options?: RequestInit) => Promise<T>;
  onOpen: (copy: SkyReaderArticleCopy, facts: PlacementVisitFacts) => void; onReload: () => void };

/** Resolve the complete published reader. Opening is read-only. */
export default function SkyReaderArticleEntry({ context, request, onOpen, onReload }: Props) {
  const [channel, setChannel] = useState(() => crypto.randomUUID()), [error, setError] = useState('');
  const frame = useRef<HTMLIFrameElement>(null);
  const recovery = useRef(false);
  const captureReader = skyReaderCapture();
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
    const connect = () => { if (!captureReader) frame.current?.contentWindow?.postMessage({ protocol: skyReaderPreviewProtocol, channel, type: 'ready-request' }, origin); };
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
    const location = { ...getInitialLocation().location, timeZone: context.timeZone };
    const instant = context.instant ?? skyDateTimeFromInput(context.date, location, true).toISOString();
    // The authenticated server calculates the same complete snapshot. A paused
    // calculation worker must not block capture of the verified reader copy.
    const factsRequest = latest.current.request<{ ok: boolean; facts: PlacementVisitFacts; readerSky: SkySnapshot }>(`/api/admin/sky-article-facts?${new URLSearchParams({
      planet: placement.planet, date: context.date, instant, timeZone: context.timeZone, period: 'current', format: SKY_INGRESS_ARTICLE_FORMAT,
      readerSign: placement.sign, lat: String(location.latitude), lon: String(location.longitude)
    })}`, { signal: controller.signal });
    void factsRequest.catch(failed);
    const openReader = async () => {
      if (requested) return;
      requested = true; clearInterval(connectionTimer);
      try {
        const payload = await factsRequest;
        if (!payload.ok || !payload.readerSky) throw new Error('The reader calculation could not be verified.');
        if (cancelled) return;
        const input: SkyReaderPreviewRequest = { protocol: skyReaderPreviewProtocol, channel, type: 'render', requestId: 1,
          ...placement, date: context.date, instant, captureArticle: true, readerSky: payload.readerSky,
          location, mode: 'published', theme: 'light', draft: null };
        if (captureReader) {
          const result = await captureReader(input, controller.signal);
          if (!cancelled) window.postMessage({ protocol: skyReaderPreviewProtocol, channel, type: 'result', requestId: 1, result }, window.location.origin);
        } else frame.current?.contentWindow?.postMessage(input, origin);
      } catch (reason) { failed(reason); }
    };
    const receive = async (event: MessageEvent) => {
      const data = event.data;
      if (cancelled || event.source !== (captureReader ? window : frame.current?.contentWindow) || event.origin !== (captureReader ? window.location.origin : origin)
        || data?.protocol !== skyReaderPreviewProtocol || data.channel !== channel) return;
      if (data.type === 'ready' && !requested) void openReader();
      if (data.requestId !== 1 || received) return;
      if (data.type === 'error') { failed(data.error); return; }
      if (data.type !== 'result') return;
      received = true;
      try {
        const result = data.result as SkyReaderPreviewResult, copy = result.article;
        if (!copy?.body?.trim() || !copy.title?.trim() || copy.timeZone !== context.timeZone
          || skyPreviewReferenceDate(copy.instant, copy.timeZone) !== context.date || copy.instant !== new Date(instant).toISOString()
          || !copy.sourceKeys.includes(context.sourceKey) || result.placement.signKey !== placement.sign)
          throw new Error('The published reader source changed or its complete wording could not be verified. Reopen Edit from the reader.');
        const payload = await factsRequest;
        if (!payload.ok || payload.facts?.articlePeriod !== 'current') throw new Error('The calculated article period could not be verified.');
        assertPlacementVisit(payload.facts, placement.planet, placement.sign);
        if (Date.parse(payload.facts.generatedAt) !== Date.parse(copy.instant)
          || !(Date.parse(payload.facts.transitStartInstant) <= Date.parse(copy.instant) && Date.parse(copy.instant) < Date.parse(payload.facts.transitEndInstant)))
          throw new Error('The calculated period does not match this reader instant. Retry opening the article.');
        if (!cancelled) { stop(); latest.current.onOpen(copy, payload.facts); }
      } catch (reason) { failed(reason); }
    };
    window.addEventListener('message', receive);
    if (captureReader) void openReader(); else connect();
    return () => { stop(); window.removeEventListener('message', receive); };
  }, [channel, origin, context, unavailable, captureReader]);
  return <div aria-label="Passage opened from reader">
    {error ? <><p role="alert">{error}</p><StudioButton type="button" onClick={() => { recovery.current = false; if (unavailable) onReload(); else setChannel(crypto.randomUUID()); }}>Retry opening passage</StudioButton></>
      : <p role="status">Loading the complete published wording and calculated article period…</p>}
    {!unavailable && !captureReader && <iframe hidden ref={frame} key={channel} src={url} title="Published article copy" sandbox="allow-scripts allow-same-origin" referrerPolicy="no-referrer" />}
  </div>;
}
