import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { studioLazy as lazy } from './studioLazy';
import { AdminDisclosureSummary } from './AdminNativeControls';
import { StudioButton, StudioInput, StudioStatusBadge, StudioTabs, StudioTextarea } from './StudioControls';
const SkyPlacementComposition = lazy(() => import('./SkyPlacementComposition'));
import { openContextualReaderHref } from './adminReaderDestinations';
import { isSkyIngressEssay, SKY_INGRESS_ARTICLE_FORMAT } from '../../web/src/content/skyIngressEssay.mjs';
import { reviseSkyArticleEdition, selectActiveSkyArticleEdition, skyArticleEditableFields, skyArticleEditionContentKey } from '../../web/src/content/skyArticleTemplateCompiler';
import { assertPlacementVisit, placementEdition, placementTemplateKeys, placementVisitDraft, placementVisitRows, placementWorkspaceDocuments, placementWorkspaceTabs,
  type PlacementVisitFacts, type PlacementWorkspaceRow as Row } from './skyPlacementWorkspaceModel';
import type { SkyPlacementSelection } from './skyPlacementAssembly';
import type { LiveStatus } from './ContentLiveStatus';

type Request = <T>(path: string, options?: RequestInit) => Promise<T>;
type Props = {
  rows: Row[]; selection: SkyPlacementSelection; request: Request;
  onRows: (rows: Row[]) => void; onDirty: (dirty: boolean, busy: boolean) => void;
  onEditRow: (row: Row) => void; onEditField: (row: Row, path: string, selection: SkyPlacementSelection) => void;
  onLoadRow: (row: Row) => Promise<unknown>;
};
const title = (value: string) => value.split('-').map(word => word[0].toUpperCase() + word.slice(1)).join(' ');
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const empty = { headline: '', summary: '', body: '' };

export default function SkyPlacementWorkspace(props: Props) {
  const { selection } = props;
  const latest = useRef(props); latest.current = props;
  const [tab, setTab] = useState<'visit' | 'default' | 'setup'>('visit');
  const [date, setDate] = useState(today);
  const [documents, setDocuments] = useState<Row[]>([]);
  const [ready, setReady] = useState(false);
  const [retry, setRetry] = useState(0);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [facts, setFacts] = useState<PlacementVisitFacts | null>(null);
  const [editing, setEditing] = useState<Row | null>(null);
  const [fields, setFields] = useState(empty);
  const [baseline, setBaseline] = useState(empty);
  const [message, setMessage] = useState('');
  const [statuses, setStatuses] = useState<LiveStatus[] | null>(null);
  const [statusError, setStatusError] = useState('');
  const mounted = useRef(true);
  const dirty = JSON.stringify(fields) !== JSON.stringify(baseline);
  useEffect(() => { latest.current.onDirty(dirty, busy); }, [dirty, busy]);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; latest.current.onDirty(false, false); }; }, []);
  const templates = placementTemplateKeys(selection.planet, selection.sign);
  const inventoryRevision = props.rows.filter(row => row.content_key.startsWith(`sky-article/${selection.planet}/${selection.sign}/`)
    || row.content_key.startsWith(`sky-article-revision/${selection.planet}/${selection.sign}/`))
    .map(row => `${row.id}/${row.updated_at}/${row.status}`).sort().join('|');

  useEffect(() => {
    const controller = new AbortController();
    let loadedInventory = false;
    setReady(false); setError(''); setStatuses(null); setStatusError('');
    void (async () => {
      const request = latest.current.request;
      const load = async (query: Record<string, string>) => {
        const result: Row[] = []; const seen = new Set<string>(); let cursor = '';
        do {
          const page = await request<{ ok: boolean; rows: Row[]; nextCursor?: string | null }>(`/api/admin/generated-content-inventory?${new URLSearchParams({ ...query, status: 'all', visibility: 'all', limit: '80', ...(cursor ? { cursor } : {}) })}`, { signal: controller.signal });
          if (page.ok !== true || !Array.isArray(page.rows)) throw new Error('The saved writing inventory could not be verified.');
          result.push(...page.rows); cursor = page.nextCursor ?? '';
          if (cursor && seen.has(cursor)) throw new Error('The saved writing inventory did not finish loading.');
          seen.add(cursor);
        } while (cursor);
        return result;
      };
      const prefix = `${selection.planet}/${selection.sign}/`;
      const lists = await Promise.all([
        load({ contentKeyPrefix: `sky-article/${prefix}` }),
        load({ contentKeyPrefix: `sky-article-revision/${prefix}` }),
        load({ contentKeys: templates.join(',') })
      ]);
      const rows = [...new Map(lists.flat().map(row => [row.id, row])).values()];
      const full = await Promise.all(rows.map(async row => {
        if (!row.inventory_only) return row;
        const payload = await request<{ ok: boolean; rows: Row[] }>(`/api/admin/generated-content-inventory?${new URLSearchParams({ id: row.id, status: 'all', visibility: 'all', limit: '1' })}`, { signal: controller.signal });
        const document = payload.rows?.find(item => item.id === row.id);
        if (payload.ok !== true || !document || document.inventory_only) throw new Error('A saved article could not be loaded. Retry before editing.');
        return document;
      }));
      if (controller.signal.aborted) return;
      loadedInventory = true; setDocuments(full); setReady(true);
      const live = full.filter(row => row.status === 'LIVE' && placementEdition(row));
      const verified: LiveStatus[] = [];
      for (let start = 0; start < live.length; start += 64) {
        const result = await request<{ ok: boolean; statuses: LiveStatus[] }>('/api/admin/content-live-status', {
          method: 'POST', signal: controller.signal, body: JSON.stringify({ ids: live.slice(start, start + 64).map(row => row.id) })
        });
        if (result.ok !== true || !Array.isArray(result.statuses)) throw new Error('Publication status could not be verified.');
        for (const row of live.slice(start, start + 64)) {
          const status = result.statuses.find(status => status.id === row.id);
          if (!status || row.updated_at && status.updatedAt && Date.parse(row.updated_at) !== Date.parse(status.updatedAt)) throw new Error('Publication status is stale.');
          verified.push(status);
        }
      }
      if (!controller.signal.aborted) setStatuses(verified);
    })().catch(reason => { if (!controller.signal.aborted) {
      if (!loadedInventory) setError('Saved visits could not be loaded. Your existing content has not changed.');
      setStatusError('Publication status could not be verified. Open the published reader to check the current writing.');
    } });
    return () => controller.abort();
  }, [selection.planet, selection.sign, retry, inventoryRevision]);

  const allRows = useMemo(() => placementWorkspaceDocuments(documents, props.rows), [documents, props.rows]);
  const refreshedEditing = editing ? allRows.find(row => row.id === editing.id) : null;
  useEffect(() => {
    if (busy || dirty || !refreshedEditing || refreshedEditing.updated_at === editing?.updated_at) return;
    const edition = placementEdition(refreshedEditing);
    if (!edition) return;
    const next = { headline: edition.headline, summary: edition.tldr, body: edition.body };
    setEditing(refreshedEditing); setFields(next); setBaseline(next);
  }, [refreshedEditing, editing?.updated_at, dirty, busy]);
  const visits = placementVisitRows(allRows, selection.planet, selection.sign);
  const setupRows = templates.flatMap(key => {
    const row = allRows.find(row => row.content_key === key && row.status !== 'ARCHIVED');
    return row ? [row] : [];
  });
  const published = statuses ? selectActiveSkyArticleEdition(visits.filter(row => isSkyIngressEssay(placementEdition(row)?.format) && statuses.some(status => status.id === row.id && status.live)).map(row => ({
    ...row, contentKey: row.content_key, sourceSnapshot: row.source_snapshot as Record<string, unknown> | null
  })), { ...selection, activeInstant: new Date().toISOString() }) : null;

  function discard() { return !dirty || window.confirm('Discard the unsaved changes to this dated article?'); }
  function edit(row: Row) {
    if (busy || !discard()) return;
    const edition = placementEdition(row);
    if (!edition) return;
    const next = { headline: edition.headline, summary: edition.tldr, body: edition.body };
    setEditing(row); setFields(next); setBaseline(next); setFacts(null); setError(''); setMessage('');
  }
  async function loadVisit() {
    if (busy || !discard()) return;
    setBusy(true); setError(''); setMessage('');
    try {
      const payload = await latest.current.request<{ ok: boolean; facts: PlacementVisitFacts }>(`/api/admin/sky-article-facts?${new URLSearchParams({ planet: selection.planet, date, format: SKY_INGRESS_ARTICLE_FORMAT })}`);
      if (payload.ok !== true || !payload.facts) throw new Error('The calculated dates could not be loaded.');
      assertPlacementVisit(payload.facts, selection.planet, selection.sign);
      if (!mounted.current) return;
      const key = skyArticleEditionContentKey({ ...payload.facts, format: SKY_INGRESS_ARTICLE_FORMAT });
      const saved = visits.find(row => placementEdition(row)?.contentKey === key);
      if (saved) {
        const edition = placementEdition(saved)!;
        const next = { headline: edition.headline, summary: edition.tldr, body: edition.body };
        setEditing(saved); setFields(next); setBaseline(next);
      }
      else { setEditing(null); setFields({ ...empty, headline: payload.facts.slotValues.articleTitle ?? '' }); setBaseline({ ...empty, headline: payload.facts.slotValues.articleTitle ?? '' }); }
      setFacts(payload.facts);
      setMessage(saved ? 'Your saved article is open. Its wording has been preserved.' : 'Calculated dates loaded. Write the article for this visit below.');
    } catch (reason) { if (mounted.current) setError(reason instanceof Error ? reason.message : 'Calculated dates could not load.'); }
    finally { if (mounted.current) setBusy(false); }
  }
  async function save() {
    if (busy) return;
    setBusy(true); setError(''); setMessage('');
    try {
      let payload: { ok: boolean; rows: Row[]; skippedLiveRows?: unknown[] };
      const base = editing && placementEdition(editing);
      if (editing && base) {
        if (!editing.updated_at) throw new Error('Reload this saved article to get its current version before saving.');
        const revised = await reviseSkyArticleEdition(base, { ...skyArticleEditableFields(base), headline: fields.headline, tldr: fields.summary, body: fields.body });
        payload = await latest.current.request('/api/admin/generated-content', { method: 'PATCH', body: JSON.stringify({
          id: editing.id, expectedUpdatedAt: editing.updated_at, ownerAction: 'save-sky-article-edition-revision', sections: { skyArticleEdition: revised }
        }) });
      } else {
        if (!facts) throw new Error('Load calculated dates before saving this visit.');
        const row = await placementVisitDraft(facts, fields, setupRows[0]);
        // Re-read exact identity before creating. Existing drafts are opened, never bulk-replaced.
        const current = await latest.current.request<{ ok: boolean; rows: Row[] }>(`/api/admin/generated-content-inventory?${new URLSearchParams({ contentKey: row.contentKey, status: 'all', visibility: 'all', limit: '2' })}`);
        if (current.ok !== true || !Array.isArray(current.rows)) throw new Error('The existing draft could not be checked. Your writing is still here.');
        if (current.rows.length) throw new Error('An article already exists for this visit. Open its saved version before editing; your unsaved writing is still here.');
        payload = await latest.current.request('/api/admin/generated-content', { method: 'POST', body: JSON.stringify({ rows: [row] }) });
      }
      const saved = payload.rows?.[0];
      if (payload.ok !== true || !saved || saved.status !== 'DRAFT' || payload.skippedLiveRows?.length) throw new Error('Draft save was not confirmed. Your writing is still here. Reload the saved inventory before retrying.');
      if (!mounted.current) return;
      setDocuments(rows => [...rows.filter(row => row.id !== saved.id), saved]); latest.current.onRows([saved]);
      const edition = placementEdition(saved);
      if (!edition) throw new Error('The saved draft is missing its article record.');
      const next = { headline: edition.headline, summary: edition.tldr, body: edition.body };
      setEditing(saved); setFields(next); setBaseline(next); setMessage('Draft saved. Nothing was published.');
    } catch (reason) { if (mounted.current) {
      const status = (reason as { status?: number } | null)?.status;
      setError(status === 409 ? 'This article changed in another editor. Your unsaved writing is still here. Reload saved writing before trying again.'
        : reason instanceof Error && !reason.message.includes('/api/') ? reason.message : 'The draft could not be saved. Your unsaved writing is still here.');
    } }
    finally { if (mounted.current) setBusy(false); }
  }

  const update = (key: keyof typeof fields, value: string) => setFields(current => ({ ...current, [key]: value }));
  return <section className="admin-workspace" aria-label={`${title(selection.planet)} in ${title(selection.sign)} workspace`}>
    <section className="studio-section" aria-label="Currently live">
      <h3>Currently live</h3>
      {!ready && !error ? <p role="status">Loading saved visits…</p> : statusError ? <p role="alert">{statusError}</p> : statuses === null ? <p role="status">Checking publication…</p> : published ? <>
        <p><strong>{published.edition.headline}</strong> · Published dated article</p>
        <details className="admin-workspace-details"><AdminDisclosureSummary>Read published article</AdminDisclosureSummary>
          <StudioTextarea aria-label="Published dated article" readOnly formatting={false} value={published.edition.body} rows={12} />
        </details>
      </> : <p>No published dated article covers right now. The reader uses its approved default sources for this placement.</p>}
      <StudioButton onClick={() => openContextualReaderHref(`/#sky/placement/${selection.planet}/${selection.sign}`)}>Open published reader</StudioButton>
    </section>
    <StudioTabs label="Planet and sign writing" tabs={placementWorkspaceTabs} value={tab} onValueChange={value => setTab(value)}>
      {tab === 'visit' ? <section className="admin-workspace" aria-label="Dated visit articles" aria-busy={busy}>
        <p>Write for one calculated visit. Your default reading and reusable templates stay separate. Drafts stay private until you explicitly review and publish.</p>
        {!ready && !error && <p role="status">Loading saved writing…</p>}
        {ready && <>
          <section className="admin-workspace" aria-label="Saved visits">
            <h3>Saved visits</h3>
            {!visits.length && <p>No dated article is saved for this placement. The default reading remains available.</p>}
            {visits.map(row => { const edition = placementEdition(row)!; return <article className="admin-hook-detail-section" key={row.id}>
              <strong>{edition.headline}</strong> <StudioStatusBadge tone={row.status === 'LIVE' ? 'live' : 'draft'}>{row.status === 'LIVE' ? 'Published' : 'Draft'}</StudioStatusBadge>
              <p>{edition.validFrom} to {edition.validTo}{edition.contentKey !== row.content_key ? ' · Working revision' : ''}</p>
              <StudioButton disabled={busy} onClick={() => edit(row)}>{row.status === 'LIVE' ? 'Edit a draft of this article' : 'Open saved draft'}</StudioButton>
            </article>; })}
          </section>
          <div className="admin-sky-edition-facts-row">
            <label className="admin-title-field"><span>Date during this visit</span><StudioInput aria-label="Visit reference date" type="date" value={date} disabled={busy} onChange={event => setDate(event.target.value)} /></label>
            <StudioButton disabled={busy || !date} onClick={() => void loadVisit()}>Load calculated dates</StudioButton>
          </div>
          <p className="admin-field-hint">Choose a date when {title(selection.planet)} is in {title(selection.sign)}. Retrograde returns are separate visits, even within the same year.</p>
        </>}
        {(editing || facts) && <section className="admin-workspace" aria-label="Article for this visit">
          <p><strong>Calculated dates:</strong> {facts?.slotValues.when ?? placementEdition(editing!)?.slotValues.when}</p>
          <label className="admin-title-field"><span>Article title</span><StudioInput aria-label="Visit article title" value={fields.headline} disabled={busy} onChange={event => update('headline', event.target.value)} /></label>
          <label className="admin-review-copy-editor"><span>Summary</span><StudioTextarea aria-label="Visit article summary" value={fields.summary} disabled={busy} onChange={event => update('summary', event.target.value)} /></label>
          <label className="admin-review-copy-editor"><span>Article body</span><StudioTextarea aria-label="Visit article body" rows={20} value={fields.body} disabled={busy} onChange={event => update('body', event.target.value)} /></label>
          <div className="admin-toolbar-actions">
            <StudioButton className="admin-primary-button" disabled={busy || !fields.headline.trim() || !fields.summary.trim() || !fields.body.trim() || editing !== null && !dirty} onClick={() => void save()}>Save draft</StudioButton>
            {editing && <StudioButton disabled={busy || dirty} onClick={() => latest.current.onEditRow(editing)}>Review saved draft</StudioButton>}
          </div>
          <p className="admin-field-hint">Save draft changes only this dated article. Review saved draft opens the existing review and publication controls.</p>
        </section>}
        {message && <p role="status">{message}</p>}
      </section> : tab === 'default' ? <section className="admin-workspace" aria-label="Default placement reading">
        <p>This reusable reading supplies content when no dated article is published for a visit. Keep it year-neutral. Existing wording is preserved; changing a dated article never replaces it.</p>
        <Suspense fallback={<p role="status">Loading default reading sources…</p>}><SkyPlacementComposition defaultReadingOnly rows={props.rows} selection={selection} onEditRow={props.onEditRow} onEditField={props.onEditField} onLoadRow={props.onLoadRow} /></Suspense>
      </section> : <section className="admin-workspace" aria-label="Reusable writing setup">
        <p>Reusable templates and writing sources apply to future visits. Edit a dated article in This visit.</p>
        {ready && !setupRows.length && <p>No saved reusable article template is available for this placement. You can still save a dated article using the standard ingress layout.</p>}
        {setupRows.map(row => <article className="admin-hook-detail-section" key={row.id}>
          <strong>{row.headline || row.content_key}</strong>
          <p>Reusable article template</p>
          <StudioButton onClick={() => props.onEditRow(row)}>Edit reusable template</StudioButton>
        </article>)}
        <details className="admin-workspace-details"><AdminDisclosureSummary>Advanced source details</AdminDisclosureSummary>
          {setupRows.map(row => <p key={row.id}><code>{row.content_key}</code></p>)}
          <p>Default readings, dated articles and templates retain their existing content identities. No content is migrated or published by opening this workspace.</p>
          <Suspense fallback={<p role="status">Loading source details…</p>}><SkyPlacementComposition rows={props.rows} selection={selection} onEditRow={props.onEditRow} onEditField={props.onEditField} onLoadRow={props.onLoadRow} /></Suspense>
        </details>
      </section>}
    </StudioTabs>
    {error && <p role="alert">{error} <StudioButton disabled={busy} onClick={() => setRetry(value => value + 1)}>Reload saved writing</StudioButton></p>}
  </section>;
}
