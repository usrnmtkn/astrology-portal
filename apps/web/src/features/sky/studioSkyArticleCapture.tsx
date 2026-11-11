import { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { SkyDetailArticle, type SkyDetail } from './SkyDetailArticle';
import { prepareStudioSkyPlacementReader } from './studioSkyReaderPreparation';
import { skyReaderPreviewSource } from './studioSkyReaderPreviewModel';
import { skyReaderCsvRecord } from './skyReaderCsvExport';
import { skyReaderDateHref, type SkyReaderPreviewRequest, type SkyReaderPreviewResult } from '../../../../../src/shared/skyReaderPreview';

/** Render and export the canonical reader in the host document, without a frame or worker. */
export async function captureStudioSkyArticle(input: SkyReaderPreviewRequest, signal: AbortSignal): Promise<SkyReaderPreviewResult> {
  if (!input.captureArticle || input.mode !== 'published' || input.draft || !input.readerSky)
    throw new Error('Open the verified published article before editing its wording.');
  const loaded = await prepareStudioSkyPlacementReader(input);
  const detail = await loaded.render(loaded.content);
  signal.throwIfAborted();
  return new Promise((resolve, reject) => {
    const host = document.createElement('div');
    host.className = 'sr-only'; host.setAttribute('aria-hidden', 'true'); host.inert = true;
    document.body.append(host);
    const root = createRoot(host, { onUncaughtError: fail });
    const cleanup = () => { signal.removeEventListener('abort', aborted); queueMicrotask(() => { root.unmount(); host.remove(); }); };
    function fail(reason: unknown) { cleanup(); reject(reason); }
    function aborted() { fail(signal.reason); }
    const complete = () => {
      try {
        signal.throwIfAborted();
        const article = host.querySelector<HTMLElement>('.sky-detail-article');
        if (!article) throw new Error('The complete reader article has not rendered.');
        const record = skyReaderCsvRecord(article, detail, new URL(skyReaderDateHref(window.location.origin,
          input.planet, input.sign, input.date), window.location.origin).href, { generalArticleOnly: true });
        const published = skyReaderPreviewSource(detail);
        cleanup();
        resolve({ instant: loaded.instant, timeZone: loaded.timeZone, placement: loaded.placement,
          published, displayed: published, draftSelected: false, draftError: null,
          article: { title: record.title, summary: record.summary, body: record.body, sourceKeys: published.keys,
            versions: published.versions, instant: record.reference_instant, timeZone: record.time_zone, readerUrl: record.reader_url } });
      } catch (reason) { fail(reason); }
    };
    signal.addEventListener('abort', aborted, { once: true });
    if (signal.aborted) { aborted(); return; }
    root.render(<Capture detail={detail} complete={complete} />);
  });
}
function Capture({ detail, complete }: { detail: SkyDetail; complete: () => void }) {
  useEffect(complete, [complete]);
  return <SkyDetailArticle detail={detail} onClose={() => undefined} />;
}
