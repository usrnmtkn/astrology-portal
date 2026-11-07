import { Suspense, useEffect, useRef, useState } from 'react';
import { studioLazy as lazy } from './studioLazy';
import StudioSidePanel from './StudioSidePanel';
import { StudioButton, StudioTabs } from './StudioControls';
import type { CompositionMapRow } from './compositionMap';
import { horoscopeOverlapsArticle, type ArticleWindow } from './skyArticleRelatedContent';
import { validateHoroscopeWindow, horoscopeWindowLabel, horoscopeSignLabel } from '../../web/src/content/horoscopeEditions.mjs';
const FallbackHoroscopeStudio = lazy(() => import('./FallbackHoroscopeStudio'));
const HoroscopeEditionsStudio = lazy(() => import('./HoroscopeEditionsStudio'));
export type HoroscopeEditorState = { dirty: boolean; busy: boolean };
type EditionInventoryRow = Pick<CompositionMapRow, 'id' | 'content_key' | 'headline' | 'status' | 'updated_at'> & {
  horoscope_window: ReturnType<typeof validateHoroscopeWindow>;
};
type Props = {
  window?: ArticleWindow; placement: { planet: string; sign: string }; rows: CompositionMapRow[]; credential: string;
  request: <T>(path: string, options?: RequestInit) => Promise<T>;
  onLoadRow: (row: CompositionMapRow) => Promise<unknown>; onEditRow: (row: CompositionMapRow) => void;
  onEditorState: (state: HoroscopeEditorState) => void;
};

export default function SkyArticleHoroscopes(props: Props) {
  const [open, setOpen] = useState(false), [tab, setTab] = useState('dated');
  const [rows, setRows] = useState<EditionInventoryRow[]>([]), [loading, setLoading] = useState(true);
  const [error, setError] = useState(''), [retry, setRetry] = useState(0);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const listRequest = useRef<AbortController | null>(null);
  const loadedIds = useRef(new Set<string>()), usedCursors = useRef(new Set<string>());
  const [editionId, setEditionId] = useState<string | null>(null);
  const [editor, setEditor] = useState<HoroscopeEditorState>({ dirty: false, busy: false });
  const latest = useRef(props); latest.current = props;
  useEffect(() => { latest.current.onEditorState(editor); }, [editor.dirty, editor.busy]);
  useEffect(() => () => { latest.current.onEditorState({ dirty: false, busy: false }); }, []);
  async function loadPage(cursor = '') {
    const current = latest.current;
    if (!current.credential.trim()) return;
    listRequest.current?.abort();
    const controller = new AbortController(); listRequest.current = controller;
    setLoading(true); setError('');
    try {
      const query = new URLSearchParams({ horoscopeEditions: 'true', editionInventory: 'true', editionInventoryPage: 'true', horoscopeEditor: 'true' });
      if (current.window) {
        query.set('articleStartsAt', new Date(current.window.transitStartInstant).toISOString());
        query.set('articleEndsAt', new Date(current.window.transitEndInstant).toISOString());
      }
      if (cursor) query.set('cursor', cursor);
      const payload = await current.request<{ ok: boolean; rows: EditionInventoryRow[]; nextCursor: string | null }>(`/api/admin/generated-content?${query}`, { signal: controller.signal });
      if (controller.signal.aborted) return;
      if (!payload.ok || !Array.isArray(payload.rows) || payload.rows.length > 30
        || payload.nextCursor !== null && (typeof payload.nextCursor !== 'string' || !payload.nextCursor.trim()
          || payload.nextCursor === cursor || usedCursors.current.has(payload.nextCursor) || !payload.rows.length)) throw new Error('The horoscope edition list could not be verified.');
      const ids = new Set<string>();
      for (const row of payload.rows) {
        if (!row.id || ids.has(row.id) || loadedIds.current.has(row.id)) throw new Error('The horoscope edition list did not advance.');
        ids.add(row.id); validateHoroscopeWindow(row.horoscope_window);
      }
      usedCursors.current.add(cursor); ids.forEach(id => loadedIds.current.add(id));
      setRows(previous => cursor ? [...previous, ...payload.rows] : payload.rows);
      setNextCursor(payload.nextCursor);
    } catch { if (!controller.signal.aborted) setError('Saved horoscope editions could not load.'); }
    finally { if (!controller.signal.aborted) setLoading(false); }
  }
  useEffect(() => {
    if (!open || tab !== 'dated' || editionId) return;
    setRows([]); setNextCursor(null); setLoading(true); setError('');
    loadedIds.current.clear(); usedCursors.current.clear();
    if (!props.credential.trim()) return;
    void loadPage();
    return () => listRequest.current?.abort();
  }, [open, tab, editionId, retry, props.credential, props.window?.transitStartInstant, props.window?.transitEndInstant]);
  const mayLeave = () => !editor.busy && (!editor.dirty || window.confirm('Discard unsaved changes to this horoscope edition?'));
  const leaveEdition = () => { if (!mayLeave()) return false; setEditionId(null); setEditor({ dirty: false, busy: false }); return true; };
  const visible = rows.filter(row => !props.window || horoscopeOverlapsArticle(props.window, row.horoscope_window)).sort((a, b) =>
      Date.parse(a.horoscope_window.startsAt) - Date.parse(b.horoscope_window.startsAt));
  return <>
    <StudioButton disabled={!props.credential.trim()} onClick={() => { setTab(props.window ? 'dated' : 'evergreen'); setOpen(true); }}>Horoscopes</StudioButton>
    {open && <StudioSidePanel title="Horoscopes" busy={editor.busy} onClose={() => { if (leaveEdition()) setOpen(false); }}>
      <StudioTabs label="Linked horoscopes" tabs={[{ value: 'dated', label: 'Dated editions' }, { value: 'evergreen', label: 'Evergreen' }]} value={tab}
        onValueChange={value => { if (value !== tab && leaveEdition()) setTab(value); }}>
        {tab === 'dated' ? <>
          <p>{props.window ? 'Saved daily, weekly, monthly and seasonal editions whose dates overlap this article’s full period.' : 'Saved daily, weekly, monthly and seasonal editions.'}</p>
          {editionId ? <>
            <StudioButton disabled={editor.busy} onClick={leaveEdition}>Back to horoscope editions</StudioButton>
            <Suspense fallback={<p role="status">Loading horoscope editor…</p>}>
              <HoroscopeEditionsStudio editRequestedEdition secret={props.credential} requestedEditionId={editionId}
                onEditionChange={id => { if (id) setEditionId(id); else leaveEdition(); }} onStateChange={setEditor} />
            </Suspense>
          </> : <>
            {error && <div role="alert"><p>{error}</p><StudioButton onClick={() => setRetry(value => value + 1)}>Retry horoscope editions</StudioButton></div>}
            {visible.length ? <ul className="studio-article-events" aria-label="Linked horoscope editions">{visible.map(row => {
              return <li key={row.id}><strong>{row.headline}</strong><span>{horoscopeSignLabel(row.horoscope_window.period)} · {horoscopeWindowLabel(row.horoscope_window)} · {row.status === 'LIVE' ? 'Published' : row.status === 'DRAFT' ? 'Draft' : 'Archived'}</span>
                <StudioButton onClick={() => setEditionId(row.id)}>Edit</StudioButton></li>;
            })}</ul> : !loading && !error && <p>{nextCursor ? 'Load more to continue browsing saved editions.' : props.window ? 'No saved horoscope editions overlap this article period.' : 'No saved horoscope editions yet.'}</p>}
            {loading && <p role="status">Loading horoscope editions…</p>}
            {nextCursor && <StudioButton disabled={loading || !props.credential.trim()} onClick={() => void loadPage(nextCursor)}>Load more editions</StudioButton>}
          </>}
        </> : <Suspense fallback={<p role="status">Loading evergreen horoscopes…</p>}>
          <FallbackHoroscopeStudio rows={props.rows} placement={props.placement} credential={props.credential}
            onLoadCatalog={signal => props.request('/api/admin/content-live-status', { method: 'POST', signal, body: JSON.stringify({ action: 'composition-catalog' }) })}
            onLoadRow={props.onLoadRow} onSourceChange={() => {}}
            onEditRow={row => { setOpen(false); props.onEditRow(row); }} onOpenPlacement={() => {}} />
        </Suspense>}
      </StudioTabs>
    </StudioSidePanel>}
  </>;
}
