import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { FormattedProse } from '../../web/src/components/FormattedProse';
import { PageLoading } from '../../web/src/components/PageLoading';
import { AdminSelect } from './AdminNativeControls';
import { StudioButton, StudioInput, StudioTabs } from './StudioControls';
import { dropSupersededPackageStarters } from './contentStudioState';
import { lunarContentIdentity, lunarSigns, lunarWorkspaceSelectionFromQuery } from './lunarCalendarContent';
import type { Props, Row } from './LunarCalendarWorkspace';

const CompositionMapWorkspace = lazy(() => import('./CompositionMapWorkspace'));
const object = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
const savedBody = (row: Row) => {
  const draft = object(object(row.sections).packageDraft);
  return typeof draft.body === 'string' ? draft.body : row.body ?? '';
};
const archived = (row: Row) => row.status === 'ARCHIVED' || object(row.source_snapshot).review_status === 'deprecated' || row.facts?.review_status === 'deprecated';
const title = (sign: string) => sign[0].toUpperCase() + sign.slice(1);

export default function SeasonTransitionWorkspace({ scope, rows, editor, query, isLoading, onQuery, onEdit, onLoad, loadRows }: Props) {
  const ingress = scope === 'lunar-ingresses';
  const family = ingress ? 'Lunar ingresses' : 'Season transitions';
  const workspaceLabel = ingress ? 'Lunar ingresses' : 'Calendar season transitions';
  const selectLabel = ingress ? 'Moon enters' : 'Season transition';
  const searchLabel = ingress ? 'Search lunar ingresses' : 'Search season transitions';
  const tableLabel = ingress ? 'Lunar ingress passages' : 'Season transition passages';
  const [sign, setSign] = useState('all');
  const [status, setStatus] = useState('active');
  const [view, setView] = useState('writeups');
  const [limit, setLimit] = useState(12);
  const [retry, setRetry] = useState(0);
  const [documents, setDocuments] = useState<{ key: string; rows: Row[]; error?: string }>();
  const openedFromQuery = useRef('');
  const sources = useMemo(() => dropSupersededPackageStarters(rows).filter(row => lunarContentIdentity(row.content_key)?.family === family), [rows, family]);
  const requestKey = JSON.stringify(sources.filter(row => row.inventory_only).map(row => [row.content_key, row.id, row.updated_at]));
  useEffect(() => {
    const keys: string[] = JSON.parse(requestKey).map(([key]: string[]) => key);
    let active = true;
    // The inventory has no prose. Read saved documents in bounded batches, including
    // drafts, before searching copy; never substitute bundled prose for a failed read.
    const batches = Array.from({ length: Math.ceil(keys.length / 32) }, (_, index) => keys.slice(index * 32, (index + 1) * 32));
    void Promise.all(batches.map(keys => loadRows(keys))).then(results => {
      const rows = results.flat();
      if (keys.some(key => !rows.some(row => row.content_key === key && !row.inventory_only))) throw new Error('Some saved passages could not be loaded.');
      if (active) setDocuments({ key: requestKey, rows });
    }).catch(() => { if (active) setDocuments({ key: requestKey, rows: [], error: `Could not load the saved ${ingress ? 'lunar ingress' : 'season'} passages. Try again to see your latest edits.` }); });
    return () => { active = false; };
  }, [requestKey, retry, loadRows, ingress]);
  const currentDocuments = documents?.key === requestKey ? documents : undefined;
  const entries = sources.map(source => {
    const row = source.inventory_only ? currentDocuments?.rows.find(row => row.content_key === source.content_key) ?? source : source;
    return { row, identity: lunarContentIdentity(row.content_key)! };
  });
  const selection = lunarWorkspaceSelectionFromQuery(query);
  useEffect(() => {
    if (selection?.family !== family) return;
    const entry = entries.find(entry => entry.row.content_key === selection.key);
    if (!entry || entry.row.inventory_only || openedFromQuery.current === entry.row.id) return;
    openedFromQuery.current = entry.row.id;
    onEdit(entry.row);
  }, [selection?.key, entries, onEdit, family]);
  useEffect(() => { setLimit(12); }, [sign, status, query]);
  const filtered = entries.filter(({ row, identity }) => {
    const haystack = `${identity.title} ${savedBody(row)}`.toLowerCase();
    return (sign === 'all' || identity.sign === sign)
      && (status === 'all' || (status === 'active' ? !archived(row) : status === 'archived' ? archived(row) : row.status === status && !archived(row)))
      && (selection ? row.content_key === selection.key : query.toLowerCase().split(/\s+/).every(term => haystack.includes(term)));
  }).sort((a, b) => lunarSigns.indexOf(a.identity.sign) - lunarSigns.indexOf(b.identity.sign) || a.identity.variant - b.identity.variant);
  const loading = sources.some(row => row.inventory_only) && !currentDocuments;
  const reset = () => { setSign('all'); setStatus('active'); onQuery(''); };
  return <section className="admin-template-page" aria-label={workspaceLabel}>
    {ingress && <p>Edit the complete passage for each Moon sign change. Calendar uses these passages for Moon ingress events and Day and Week sign changes.</p>}
    <div className="admin-review-filter-grid studio-surface">
      <label><span>{selectLabel}</span><AdminSelect aria-label={selectLabel} value={sign} onChange={event => setSign(event.target.value)}><option value="all">{ingress ? "All signs" : "All season transitions"}</option>{lunarSigns.map((from, index) => <option key={from} value={from}>{ingress ? title(from) : `${title(from)} to ${title(lunarSigns[(index + 1) % lunarSigns.length])}`}</option>)}</AdminSelect></label>
      <label><span>{searchLabel}</span><StudioInput aria-label={searchLabel} value={query} onChange={event => onQuery(event.target.value)} placeholder={ingress ? "Sign or words from a passage" : "Season pair or words from a passage"} /></label>
      <label><span>Publication</span><AdminSelect aria-label="Publication" value={status} onChange={event => setStatus(event.target.value)}><option value="active">Active sources</option><option value="LIVE">Published</option><option value="DRAFT">Drafts</option><option value="archived">Archived</option><option value="all">All states</option></AdminSelect></label>
    </div>
    <StudioTabs label={ingress ? "Lunar ingress views" : "Season transition views"} value={view} onValueChange={setView} tabs={[{ value: 'writeups', label: 'Write-ups' }, { value: 'composition', label: 'Composition & variables' }]}>
      {view === 'composition' ? <Suspense fallback={<PageLoading message="Loading composition…" />}><CompositionMapWorkspace rows={entries.map(entry => entry.row)} templateKeys={filtered.map(entry => entry.row.content_key)} initialKey={filtered[0]?.row.content_key} onEditRow={onEdit} onLoadRow={onLoad} editor={editor} /></Suspense> : <>
        {editor}
        <section aria-label={tableLabel} className="admin-template-page">
          <p role="status">{filtered.length} {filtered.length === 1 ? 'passage' : 'passages'}{loading ? ' · Loading saved writing…' : ''}</p>
          {currentDocuments?.error && <div role="alert" className="admin-error"><p>{currentDocuments.error}</p><StudioButton onClick={() => { setDocuments(undefined); setRetry(value => value + 1); }}>Retry passages</StudioButton></div>}
          <div className="admin-data-table-shell"><table className="admin-data-table admin-season-transition-table" aria-label={tableLabel}>
            <thead><tr><th scope="col">{ingress ? "Moon ingress" : "Transition"}</th><th scope="col">Saved passage</th><th scope="col" className="admin-col-visibility">Publication</th><th scope="col" className="admin-col-edit"><span className="sr-only">Edit</span></th></tr></thead>
            <tbody>{filtered.slice(0, limit).map(({ row, identity }) => <tr key={row.content_key}>
              <td data-label={ingress ? "Moon ingress" : "Transition"}>{identity.title}</td>
              <td data-label="Saved passage">{row.inventory_only ? <p>{currentDocuments?.error ? 'Passage unavailable. Retry to load your saved writing.' : 'Loading saved passage…'}</p> : <><FormattedProse className="admin-variable-source-prose" text={savedBody(row)} />{!savedBody(row) && <p>No saved passage.</p>}</>}</td>
              <td data-label="Publication">{ingress && row.id.startsWith('package:') ? 'Original passage' : archived(row) ? 'Archived' : row.status === 'LIVE' ? 'Published' : row.status === 'DRAFT' ? 'Draft' : row.status.toLowerCase()}{row.updated_at && <small className="admin-field-hint">Saved {new Date(row.updated_at).toLocaleString()}</small>}</td>
              <td className="admin-col-edit"><StudioButton aria-label={`Edit ${identity.title}`} disabled={row.inventory_only} onClick={() => onEdit(row)}>Edit</StudioButton></td>
            </tr>)}</tbody>
          </table></div>
          {filtered.length > limit && <StudioButton onClick={() => setLimit(value => value + 12)}>Show more passages</StudioButton>}
          {!filtered.length && <div className="admin-empty">{loading || isLoading ? <PageLoading compact message="Loading saved passages…" /> : <><p>{ingress ? "No lunar ingresses match these filters." : "No season transitions match these filters."}</p><StudioButton onClick={reset}>Reset filters</StudioButton></>}</div>}
        </section>
      </>}
    </StudioTabs>
  </section>;
}
