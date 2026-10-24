import { useEffect, useState } from 'react';
import { SkyDetailArticle, type SkyDetail } from './SkyDetailArticle';
import { skyReaderPreviewDraftMap, skyReaderPreviewSource } from './studioSkyReaderPreviewModel';
import { skyReaderPreviewProtocol, isSkyReaderPreviewDate, isTrustedSkyPreviewParent, type SkyReaderPreviewRequest } from '../../../../../src/shared/skyReaderPreview';
import { PageLoading } from '../../components/PageLoading';

export default function StudioSkyReaderPreviewPage() {
  const [detail, setDetail] = useState<SkyDetail | null>(null);
  const [error, setError] = useState('');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  useEffect(() => {
    const url = new URL(window.location.href), channel = url.searchParams.get('channel');
    const parentOrigin = url.searchParams.get('parentOrigin');
    if (!channel || !parentOrigin || window.parent === window) { setError('Open this preview from Content Studio.'); return; }
    if (!isTrustedSkyPreviewParent(parentOrigin, window.location.origin, import.meta.env.VITE_STUDIO_PARENT_ORIGIN)) { setError('Open this preview from Content Studio.'); return; }
    let disposed = false, latest = 0;
    let context: { key: string; request: ReturnType<typeof import('./studioSkyReaderPreparation')['prepareStudioSkyPlacementReader']> } | null = null;
    const send = (data: Record<string, unknown>) => window.parent.postMessage({ protocol: skyReaderPreviewProtocol, channel, ...data }, parentOrigin);
    const receive = (event: MessageEvent) => {
      const input = event.data as SkyReaderPreviewRequest;
      if (event.source !== window.parent || event.origin !== parentOrigin || input?.protocol !== skyReaderPreviewProtocol || input.channel !== channel || input.type !== 'render') return;
      const sequence = ++latest;
      setDetail(null); setError('');
      void (async () => {
        if (!Number.isInteger(input.requestId) || !isSkyReaderPreviewDate(input.date) || !['published', 'draft'].includes(input.mode)
          || !/^[a-z-]+$/u.test(input.planet) || !/^[a-z-]+$/u.test(input.sign)) throw new Error('Choose a valid placement and preview date.');
        const nextTheme = input.theme === 'dark' ? 'dark' : 'light';
        document.documentElement.dataset.theme = nextTheme; setTheme(nextTheme);
        const key = JSON.stringify([input.planet, input.sign, input.date, input.location]);
        if (context?.key !== key) {
          const { prepareStudioSkyPlacementReader } = await import('./studioSkyReaderPreparation');
          context = { key, request: prepareStudioSkyPlacementReader(input) };
        }
        const loaded = await context.request;
        const published = await loaded.render(loaded.content);
        let proposed = published, draftError: string | null = null;
        if (input.draft) {
          try { proposed = await loaded.render(skyReaderPreviewDraftMap(loaded.content, input.draft, input.planet, input.sign)); }
          catch (reason) { draftError = reason instanceof Error ? reason.message : 'The draft could not be previewed.'; }
        }
        if (disposed || sequence !== latest) return;
        const displayed = input.mode === 'draft' ? proposed : published;
        if (input.mode === 'draft' && draftError) throw new Error(draftError);
        const draftSelected = proposed.readerExport?.rows.some(row => row.id === 'studio-preview-only') ?? false;
        setDetail({ ...displayed, previewLabel: input.mode === 'draft'
          ? draftSelected ? 'Draft preview · Unpublished simulation' : 'Draft preview · Revision not selected for this date'
          : 'Published reader preview' });
        send({ type: 'result', requestId: input.requestId, result: { instant: loaded.instant, timeZone: loaded.timeZone, placement: loaded.placement,
          published: skyReaderPreviewSource(published), displayed: skyReaderPreviewSource(displayed),
          draftSelected, draftError } });
      })().catch(reason => {
        if (disposed || sequence !== latest) return;
        context = null;
        const message = reason instanceof Error ? reason.message : 'The Sky reader preview could not load.';
        setError(message); send({ type: 'error', requestId: input.requestId, error: message });
      });
    };
    window.addEventListener('message', receive);
    send({ type: 'ready' });
    return () => { disposed = true; latest++; window.removeEventListener('message', receive); };
  }, []);
  return <main className={`app-shell theme-${theme} mode-detail`}>
    {error ? <p role="alert">{error}</p> : detail ? <SkyDetailArticle detail={detail} onClose={() => {
      const url = new URL(window.location.href);
      window.parent.postMessage({ protocol: skyReaderPreviewProtocol, channel: url.searchParams.get('channel'), type: 'close' }, url.searchParams.get('parentOrigin')!);
    }} /> : <PageLoading message="Loading Sky reader preview…" />}
  </main>;
}
