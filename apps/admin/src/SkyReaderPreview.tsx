import { useEffect, useMemo, useRef, useState } from 'react';
import { StudioButton } from './StudioControls';
import { Stack, Text } from './studio-ds/primitives';
import { containedDisclosure, surfaceSection } from './studio-ds/recipes';
import { AdminDisclosureSummary, AdminSelect } from './AdminNativeControls';
import { reviseSkyArticleEdition, type CompiledSkyArticleEdition, type SkyArticleEditableFields } from '../../web/src/content/skyArticleTemplateCompiler';
import { getInitialLocation } from '../../web/src/services/skySelection';
import { sharedSkyPlacementKeys } from './skyPlacementSourceSelection';
import { subscribeToContentUpdates } from '../../web/src/services/contentUpdateSignal';
import { isSkyReaderPreviewDate, skyPreviewReferenceDate, skyReaderDateHref, skyReaderPreviewFrameUrl, skyReaderPreviewProtocol, type SkyReaderPreviewRequest, type SkyReaderPreviewResult } from '../../../src/shared/skyReaderPreview';
import type { SkyArticleVariableDraft } from '../../../src/shared/skyArticleVariableDraft';
import { skyDatedArticleChanges } from './skyDatedArticleDraft';

export type SkyPreviewDraft = { id: string; label: string; sourceKey?: string; baseVersion?: string; base: CompiledSkyArticleEdition; fields: SkyArticleEditableFields; variables?: SkyArticleVariableDraft | null; baseVariables?: SkyArticleVariableDraft | null; saveState?: string };
export type SkyReaderState = { result: SkyReaderPreviewResult | null; error: string };
type Props = { planet: string; sign: string; date: string; timeZone?: string; drafts: SkyPreviewDraft[]; onClose?: () => void; compact?: boolean; onReaderState: (state: SkyReaderState) => void };

export default function SkyReaderPreview({ planet, sign, date, timeZone, drafts, onClose, compact = false, onReaderState }: Props) {
  const [mode, setMode] = useState<'published' | 'draft'>('published');
  const [draftId, setDraftId] = useState(drafts[0]?.id ?? '');
  const candidate = drafts.find(draft => draft.id === draftId) ?? drafts[0];
  const [draft, setDraft] = useState<SkyReaderPreviewRequest['draft']>(null);
  const [draftError, setDraftError] = useState('');
  const [compiling, setCompiling] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [ready, setReady] = useState(false);
  const [result, setResult] = useState<SkyReaderPreviewResult | null>(null);
  const [error, setError] = useState('');
  const [theme, setTheme] = useState<'light' | 'dark'>(() => document.querySelector('[data-studio-theme]')?.getAttribute('data-studio-theme') === 'dark' ? 'dark' : 'light');
  const frame = useRef<HTMLIFrameElement>(null);
  const requestId = useRef(0);
  const requestTimer = useRef<number | undefined>(undefined);
  const close = useRef(onClose);
  close.current = onClose;
  const readerState = useRef(onReaderState);
  readerState.current = onReaderState;
  const readerDate = useRef(date);
  readerDate.current = date;
  const draftIdentity = JSON.stringify(candidate ? [candidate.base, candidate.fields, candidate.variables, candidate.baseVersion, candidate.sourceKey] : null);
  const location = useMemo(() => ({ ...getInitialLocation().location, ...(timeZone ? { timeZone } : {}) }), [timeZone]);
  const channel = useMemo(() => { void attempt; return crypto.randomUUID(); }, [attempt]);
  const frameUrl = useMemo(() => skyReaderPreviewFrameUrl(window.location.origin, channel), [channel]);
  const readerOrigin = new URL(frameUrl).origin;
  const comparisonIdentity = JSON.stringify([channel, draftIdentity, date, location.timeZone]);
  const sentIdentity = useRef(''), verifiedIdentity = useRef('');
  const validDate = isSkyReaderPreviewDate(date);
  const changes = candidate ? skyDatedArticleChanges(candidate.base, candidate.fields, candidate.variables, candidate.baseVariables) : [];

  useEffect(() => subscribeToContentUpdates(notice => {
    if (notice.contentKey.startsWith(`sky-article/${planet}/`) || [...sharedSkyPlacementKeys(planet, sign), ...sharedSkyPlacementKeys(planet, result?.placement.signKey ?? sign)].includes(notice.contentKey)) setAttempt(value => value + 1);
  }), [planet, sign, result?.placement.signKey]);
  useEffect(() => {
    const shell = document.querySelector('[data-studio-theme]');
    if (!shell) return;
    const observer = new MutationObserver(() => setTheme(shell.getAttribute('data-studio-theme') === 'dark' ? 'dark' : 'light'));
    observer.observe(shell, { attributes: true, attributeFilter: ['data-studio-theme'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    setDraft(null); setDraftError(''); setCompiling(Boolean(candidate));
    if (!candidate) return;
    const timer = window.setTimeout(() => {
      void reviseSkyArticleEdition(candidate.base, candidate.fields, candidate.variables).then(edition => {
        if (!cancelled) { setDraft({ edition, baseCompiledHash: candidate.base.compiledHash, baseVersion: candidate.baseVersion,
          requiresPublishedBase: candidate.sourceKey?.startsWith('sky-article-revision/') }); setCompiling(false); }
      }).catch(reason => {
        if (!cancelled) { setDraftError(reason instanceof Error ? reason.message : 'The draft is incomplete.'); setCompiling(false); }
      });
    }, 250);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [draftIdentity]);

  useEffect(() => {
    setReady(false); setResult(null); setError('');
    readerState.current({ result: null, error: '' });
    const failed = (message: string) => { setError(message); readerState.current({ result: null, error: message }); };
    const timer = window.setTimeout(() => failed('The reader preview did not connect. Retry the preview.'), 60_000);
    const receive = (event: MessageEvent) => {
      const data = event.data;
      if (event.origin !== readerOrigin || event.source !== frame.current?.contentWindow || data?.protocol !== skyReaderPreviewProtocol || data.channel !== channel) return;
      if (data.type === 'ready') { clearTimeout(timer); setReady(true); }
      else if (data.type === 'close') close.current?.();
      else if (data.requestId === requestId.current) {
        clearTimeout(requestTimer.current);
        if (data.type === 'result' && skyPreviewReferenceDate(data.result.instant, data.result.timeZone) === readerDate.current) {
          verifiedIdentity.current = sentIdentity.current; setResult(data.result); setError(''); readerState.current({ result: data.result, error: '' });
        }
        if (data.type === 'error') { setResult(null); failed(data.error); }
      }
    };
    window.addEventListener('message', receive);
    return () => { clearTimeout(timer); window.removeEventListener('message', receive); };
  }, [channel, readerOrigin]);

  useEffect(() => {
    const id = ++requestId.current;
    setResult(null); setError('');
    if (!ready || !validDate || compiling || mode === 'draft' && (!draft || draftError)) return;
    const request: SkyReaderPreviewRequest = { protocol: skyReaderPreviewProtocol, channel, type: 'render', requestId: id,
      planet, sign, date, location, mode, theme, draft };
    sentIdentity.current = comparisonIdentity;
    frame.current?.contentWindow?.postMessage(request, readerOrigin);
    requestTimer.current = window.setTimeout(() => {
      const error = 'The Sky reading did not finish loading. Retry the preview.';
      setError(error); readerState.current({ result: null, error });
    }, 60_000);
    return () => clearTimeout(requestTimer.current);
  }, [ready, validDate, date, mode, draft, draftError, compiling, planet, sign, location, channel, readerOrigin, theme]);

  const displayed = result?.displayed;
  const referenceDate = result ? skyPreviewReferenceDate(result.instant, result.timeZone) : date;
  const inDraftWindow = candidate && result ? Date.parse(candidate.base.transitStartInstant) <= Date.parse(result.instant)
    && Date.parse(result.instant) < Date.parse(candidate.base.transitEndInstant) : false;
  const readerHref = validDate ? skyReaderDateHref(window.location.origin, planet, result?.placement.signKey ?? sign, date) : '';
  const sourceDetails = displayed && <>
    {candidate && <Text size="meta" tone="secondary">Draft: {candidate.label} · {candidate.saveState === 'saved' || !candidate.saveState ? 'Saved revision' : 'Includes editor changes'}</Text>}
      <Text>{displayed.role === 'Dated article'
        ? 'This edition covers the reference instant and takes precedence over shared fallback writing.'
        : 'No eligible dated article is selected for this reference instant. Sky uses reusable placement writing.'}</Text>
      <Text size="meta" tone="secondary">Reference: {result.instant} · {result.timeZone}</Text>
      {result.placement.signKey !== sign && <Text>{result.placement.planet} in {sign[0].toUpperCase() + sign.slice(1)} is not active on {date}. {result.placement.planet} is in {result.placement.sign}, so this preview shows {result.placement.planet} in {result.placement.sign} for the selected date.</Text>}
      {displayed.validFrom && <Text size="meta" tone="secondary">Article window: {displayed.validFrom} to {displayed.validTo} · Start inclusive; end exclusive.</Text>}
      <details className={containedDisclosure}><AdminDisclosureSummary>Source keys and saved versions</AdminDisclosureSummary>
        {mode === 'draft' && candidate && <p>Draft source: <code>{candidate.sourceKey ?? candidate.id}</code></p>}
        {candidate && <p>Publication target: <code>{candidate.base.contentKey}</code></p>}
        {displayed.keys.map(key => <p key={key}><code>{key}</code></p>)}
        {displayed.versions.map(version => <Text size="meta" key={version}>{version}</Text>)}
      </details>
  </>;
  const comparisonReady = verifiedIdentity.current === comparisonIdentity && result && draft && !compiling && !draftError && !result.draftError
    && skyPreviewReferenceDate(result.instant, result.timeZone) === date && result.draftSelected
    && result.published.keys.includes(candidate?.base.contentKey ?? '');
  const wordingUnchanged = changes.every(change => change.fieldId === 'variableSources');
  const comparison = comparisonReady && <div className="studio-context-panel" role="status" aria-label="Reader wording comparison">
    <Text><strong>{wordingUnchanged ? 'Reader wording unchanged' : 'Reader wording changed'}</strong></Text>
    <Text>{wordingUnchanged
      ? changes.length ? compact ? 'Publishing saves variable sources only.' : 'Published and Draft use the same wording. Publishing saves the editable variable sources and their captured values.' : 'There are no article changes to publish.'
      : `Publishing changes ${changes.filter(change => change.fieldId !== 'variableSources').map(change => change.label).join(', ')}. Compare Published and Draft before publishing.`}</Text>
  </div>;
  const impact = displayed && candidate && <Stack as="section" gap="sm" aria-label="Sky publication impact">
        <Text><strong>What publishing will change</strong></Text>
        <Text>{changes.length ? `Changes to ${changes.map(change => change.label).join(', ')} in ${candidate.base.headline}.` : 'This draft has no changes from its article baseline.'} The dated article window is {candidate.base.validFrom} to {candidate.base.validTo} (end exclusive).</Text>
        {draftError ? <Text>Complete the required draft fields before publishing.</Text> : result.draftError ? <p role="alert">{result.draftError}</p> : <Text>{result.draftSelected
          ? `For ${referenceDate}, publishing would select this revision in place of the currently published reading: ${result.published.title}.`
          : result.placement.signKey !== sign ? `For ${referenceDate}, this revision is not selected because ${result.placement.planet} is in ${result.placement.sign}. Readers would continue to receive ${result.published.title}.`
          : inDraftWindow ? `For ${referenceDate}, this revision is not selected because a newer eligible dated article takes precedence: ${result.published.title}.`
            : `For ${referenceDate}, this revision is not selected because the date is outside its article window. Readers would continue to receive ${result.published.title}.`}</Text>}
        <Text>Shared fallback writing and other dated articles keep their existing text. Use Review &amp; publish in the article editor to publish the revision.</Text>
      </Stack>;
  const readerFrame = <iframe ref={frame} key={channel} src={frameUrl} title="Sky reader preview frame" className={`studio-reader-preview-frame${compact ? ' studio-reader-preview-frame-compact' : ''}`}
      hidden={!validDate || mode === 'draft' && (!draft || Boolean(draftError))} referrerPolicy="no-referrer" sandbox="allow-scripts allow-same-origin" />;
  return <section className={surfaceSection} aria-label="Sky reader preview" aria-busy={!result && !error && !draftError && validDate}>
    <div className="admin-fallback-diagnostic-heading"><h4>Sky reader preview</h4>{compact && <Text size="meta">{date} · {result?.timeZone ?? location.timeZone}</Text>}{onClose && <StudioButton type="button" onClick={onClose}>Close preview</StudioButton>}</div>
    {!compact && <Text>Preview the public Sky article. Draft simulates publishing the selected dated revision; personalized chart sections are separate.</Text>}
    {!compact && <Text size="meta">Reader date: {date} · {result?.timeZone ?? location.timeZone}</Text>}
    {drafts.length > 1 && <div className="admin-filter-form">
      <label><span>Draft revision</span><AdminSelect aria-label="Sky preview draft revision" value={candidate?.id ?? ''} onChange={event => setDraftId(event.target.value)}>
        {drafts.map(item => <option value={item.id} key={item.id}>{item.label}</option>)}
      </AdminSelect></label>
    </div>}
    <div className="admin-surface-actions" aria-label="Sky preview views">
      <StudioButton type="button" aria-pressed={mode === 'published'} onClick={() => setMode('published')}>Published</StudioButton>
      <StudioButton type="button" aria-pressed={mode === 'draft'} disabled={!candidate || compiling || Boolean(draftError)} onClick={() => setMode('draft')}>Draft</StudioButton>
      <StudioButton type="button" onClick={() => setAttempt(value => value + 1)}>Refresh preview</StudioButton>
      {!compact && validDate && result && <a className="admin-create-button admin-secondary-button" href={readerHref} target="_blank" rel="noopener noreferrer">Read this date in Sky</a>}
    </div>
    {!candidate && <Text>No dated draft revision is available. Open a dated article to edit its draft.</Text>}
    {!compact && candidate && <Text size="meta" tone="secondary">Draft: {candidate.label} · {candidate.saveState === 'saved' || !candidate.saveState ? 'Saved revision' : 'Includes editor changes'}</Text>}
    {draftError && <p role="alert">Draft preview unavailable: {draftError}</p>}
    {!validDate && <p role="alert">Choose a valid preview date.</p>}
    {error && <p role="alert">{error}</p>}
    {displayed && <Text><strong>Source used:</strong> {displayed.status} · {displayed.role} · {displayed.title}</Text>}
    {comparison}
    {compact && result?.draftError && <p role="alert">{result.draftError}</p>}
    {compact && result && !result.draftSelected && impact}
    {!result && !error && validDate && !draftError && <Text role="status">Loading reader preview…</Text>}
    {compact ? <>
      {readerFrame}
      {(!result || result.draftSelected) && <details className={containedDisclosure}><AdminDisclosureSummary>What publishing will change</AdminDisclosureSummary>{impact}</details>}
      {displayed && <details className={containedDisclosure}><AdminDisclosureSummary>Reader source details</AdminDisclosureSummary>{sourceDetails}</details>}
    </> : <>
      {sourceDetails}
      {impact}
      {readerFrame}
    </>}
  </section>;
}
