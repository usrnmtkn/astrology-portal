import { StudioTabs, StudioButton, StudioInput } from "./StudioControls";
import { AdminDisclosureSummary, AdminSelect } from "./AdminNativeControls";
import { MetricCard } from "./studio-ds/patterns";
import { Grid, Stack, Text } from "./studio-ds/primitives";
import { containedDisclosure, metricGrid } from "./studio-ds/recipes";
import { lazy, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { CompositionMapRow } from './compositionMap';
import { dropSupersededPackageStarters } from './contentStudioState';
import { lunarContentIdentity, lunarSigns, lunarWorkspaceFamilyOrder, lunarWorkspaceJobs, lunarWorkspaceSelectionFromQuery } from './lunarCalendarContent';
import { PageLoading } from '../../web/src/components/PageLoading';
const CompositionMapWorkspace = lazy(() => import('./CompositionMapWorkspace'));
type Row = CompositionMapRow & { inventory_only?: boolean; facts?: Record<string, unknown> | null };
const isArchived = (row: Row) => row.status === 'ARCHIVED'
  || (row.source_snapshot as Record<string, unknown> | null)?.review_status === 'deprecated'
  || (row.facts as Record<string, unknown> | null)?.review_status === 'deprecated';
type Props = { rows: Row[]; editor: ReactNode; query: string; createRequest?: number; onCreateRequestHandled?: () => void; isLoading?: boolean; onQuery: (value: string) => void; onEdit: (row: Row) => void; onLoad: (row: Row) => Promise<unknown>; onCreate: (sign: string) => void };
export default function LunarCalendarWorkspace({ rows, editor, query, createRequest = 0, onCreateRequestHandled, isLoading = false, onQuery, onEdit, onLoad, onCreate }: Props) {
  const [job, setJob] = useState('Day and Week Moon story');
  const [family, setFamily] = useState('Moon-sign leftover');
  const [sign, setSign] = useState('all');
  const [status, setStatus] = useState('active');
  const [view, setView] = useState('writeups');
  const [selectedKey, setSelectedKey] = useState('');
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [limit, setLimit] = useState(12);
  const [adding, setAdding] = useState(false);
  const [newSign, setNewSign] = useState('');
  const openedFromQuery = useRef('');
  useEffect(() => { if (createRequest) { setAdding(true); setNewSign(''); setView('writeups'); onCreateRequestHandled?.(); } }, [createRequest, onCreateRequestHandled]);
  useEffect(() => {
    const selection = lunarWorkspaceSelectionFromQuery(query);
    if (!selection) return;
    setJob(selection.job);
    setFamily(selection.family);
    setSign(selection.sign);
    setSelectedKey(selection.key);
    setView('writeups');
  }, [query]);
  useEffect(() => { setLimit(12); setView('writeups'); }, [job, family, sign, status, query]);
  const entries = useMemo(() => dropSupersededPackageStarters(rows).flatMap(row => {
    const identity = lunarContentIdentity(row.content_key);
    return identity ? [{ row, identity }] : [];
  }), [rows]);
  const discoveredFamilies = [...new Set(entries.map(entry => entry.identity.family))];
  const families = [
    ...lunarWorkspaceFamilyOrder.filter(value => discoveredFamilies.includes(value) && (job === 'all' || entries.some(entry => entry.identity.family === value && entry.identity.job === job))),
    ...discoveredFamilies.filter(value => !lunarWorkspaceFamilyOrder.includes(value) && (job === 'all' || entries.some(entry => entry.identity.family === value && entry.identity.job === job)))
  ];
  const filtered = entries.filter(({ row, identity }) => {
    const archived = isArchived(row);
    const haystack = `${identity.title} ${identity.family} ${identity.job} ${row.content_key} ${row.body ?? ""}`.toLowerCase();
    return (job === 'all' || identity.job === job)
      && (family === 'all' || identity.family === family) && (sign === 'all' || identity.sign === sign)
      && (status === 'all' || (status === 'archived' ? archived : status === 'active' ? !archived : row.status === status && !archived))
      && query.toLowerCase().split(/\s+/).every(term => haystack.includes(term));
  }).sort((a, b) => a.identity.job.localeCompare(b.identity.job) || a.identity.family.localeCompare(b.identity.family) || lunarSigns.indexOf(a.identity.sign) - lunarSigns.indexOf(b.identity.sign) || a.identity.variant - b.identity.variant);
  const selected = filtered.find(entry => entry.row.content_key === selectedKey) ?? filtered[0];
  const selectedRow = selected?.row;
  const existingForSign = entries.filter(({ row, identity }) => row.content_key.startsWith('authored/calendar-weekly-moon/') && identity.sign === newSign);
  const usedVariants = new Set(existingForSign.map(({ identity }) => identity.variant));
  const availableVariant = [1, 2, 3, 4].find(value => !usedVariants.has(value) && !(newSign === 'cancer' && value === 1));
  useEffect(() => {
    setError('');
    if (!selectedRow?.inventory_only) return;
    let active = true;
    void onLoad(selectedRow).catch(error => { if (active) setError(error instanceof Error ? error.message : 'Could not load this passage.'); });
    return () => { active = false; };
  }, [selectedRow?.id, selectedRow?.inventory_only, retry]);
  useEffect(() => {
    const selection = lunarWorkspaceSelectionFromQuery(query);
    if (!selection || !selectedRow || selectedRow.content_key !== selection.key) return;
    if (openedFromQuery.current === selectedRow.id) return;
    openedFromQuery.current = selectedRow.id;
    onEdit(selectedRow);
  }, [onEdit, query, selectedRow]);
  const keys = useMemo(() => filtered.map(entry => entry.row.content_key), [rows, job, family, sign, status, query]);
  return <section className="admin-template-page" aria-label="Lunar Calendar workspace">
    <section className="admin-content-toolbar"><div><p>Choose the writing job first. Day and Week leftover is one Moon-sign passage per visit on a quiet day, after the lunation article. Timing sentences cover continuation, ingress, and season change. Lunar journal stays on event readings. Sun and Moon daily summary sentences are shared with Sky.</p><p>To write another leftover for a Moon sign, add a separate write-up. Source keys stay the same.</p></div><StudioButton type="button" onClick={() => { setNewSign(sign === 'all' ? '' : sign); setAdding(true); setView('writeups'); }}>Add leftover write-up</StudioButton></section>
    {adding && <section className="admin-panel" aria-label="Add leftover write-up">
      <header className="admin-composition-detail-header"><Stack gap="sm"><h2>Add leftover write-up</h2><Text size="body" tone="secondary">Create a leftover Moon-sign passage for Calendar Day and Week. Lunation articles and event readings are separate families.</Text></Stack><StudioButton onClick={() => setAdding(false)}>Cancel</StudioButton></header>
      <div className="admin-review-filter-grid"><label><span>Moon sign for the new write-up</span><AdminSelect autoFocus aria-label="Moon sign for the new write-up" value={newSign} onChange={event => setNewSign(event.target.value)}><option value="">Choose a Moon sign</option>{lunarSigns.map(value => <option key={value} value={value}>{value[0].toUpperCase() + value.slice(1)}</option>)}</AdminSelect></label></div>
      {isLoading ? <PageLoading compact message="Loading saved write-ups…" /> : <p role="status">{!newSign ? 'Choose the sign before starting a draft.' : !availableVariant ? 'All available alternatives already exist for this sign. Edit or restore a saved write-up.' : existingForSign.length ? `${existingForSign.length} saved write-ups. This creates a separate alternative; your existing writing stays in place.` : 'No saved write-ups for this sign. Start its first draft.'}</p>}
      <div className="admin-new-actions"><StudioButton className="admin-primary-button" disabled={!newSign || !availableVariant || isLoading} onClick={() => {
        setSign(newSign); setJob('Day and Week Moon story'); setFamily('Moon-sign leftover'); setStatus('active'); onQuery('');
        setSelectedKey(`authored/calendar-weekly-moon/${newSign}${availableVariant === 1 ? '' : `/variant-${availableVariant}`}`);
        onCreate(newSign); setAdding(false);
      }}>Start draft</StudioButton>
      {newSign && existingForSign.length > 0 && <StudioButton onClick={() => { setSign(newSign); setJob('Day and Week Moon story'); setFamily('Moon-sign leftover'); setStatus('all'); onQuery(''); setAdding(false); }}>View saved write-ups</StudioButton>}</div>
      <p className="admin-field-hint">Opening a draft does not save or publish it. Save draft keeps unfinished work for later; Save &amp; publish makes it available for Calendar selection.</p>
    </section>}
    <div className="admin-review-filter-grid studio-surface">
      <label><span>Writing job</span><AdminSelect aria-label="Writing job" value={job} onChange={event => {
        const next = event.target.value;
        setJob(next);
        setFamily(next === 'Day and Week Moon story' ? 'Moon-sign leftover' : 'all');
      }}><option value="all">All jobs</option>{lunarWorkspaceJobs.map(value => <option key={value}>{value}</option>)}</AdminSelect></label>
      <label><span>Moon sign</span><AdminSelect aria-label="Moon sign" value={sign} onChange={event => setSign(event.target.value)}><option value="all">All signs</option>{lunarSigns.map(value => <option key={value} value={value}>{value[0].toUpperCase() + value.slice(1)}</option>)}</AdminSelect></label>
      <label><span>Search Lunar Calendar</span><StudioInput aria-label="Search Lunar Calendar" value={query} onChange={event => onQuery(event.target.value)} placeholder="Moon in Libra, leftover, or passage name" /></label>
      <label><span>Content family</span><AdminSelect aria-label="Content family" value={family} onChange={event => setFamily(event.target.value)}><option value="all">All families</option>{families.map(value => <option key={value}>{value}</option>)}</AdminSelect></label>
      <label><span>Publication</span><AdminSelect aria-label="Publication" value={status} onChange={event => setStatus(event.target.value)}><option value="active">Active sources</option><option value="LIVE">Published</option><option value="DRAFT">Drafts</option><option value="archived">Archived</option><option value="all">All states</option></AdminSelect></label>
    </div>
    <StudioTabs label="Lunar workspace views" value={view} onValueChange={setView}
      tabs={[{ value: 'writeups', label: 'Write-ups' }, { value: 'composition', label: 'Composition & variables' }]}>

    {view === 'composition' ? <Suspense fallback={<PageLoading message="Loading composition…" />}><CompositionMapWorkspace rows={rows} templateKeys={keys} initialKey={selected?.row.content_key} onEditRow={onEdit} onLoadRow={onLoad} editor={editor} /></Suspense> : <>
      {editor}
      <div className="admin-composition-map-layout">
        <section className="admin-composition-detail" aria-label="Selected lunar passage">{selected && <>
          {error && <div className="admin-error" role="alert"><p>{error}</p><StudioButton type="button" onClick={() => setRetry(value => value + 1)}>Retry passage</StudioButton></div>}
          <label><span>Selected passage</span>{filtered.length ? <AdminSelect aria-label="Selected passage" value={selected.row.content_key} onChange={event => setSelectedKey(event.target.value)}>{filtered.map(({ row, identity }) => <option key={row.id} value={row.content_key}>{identity.title}</option>)}</AdminSelect> : <p className="admin-field-hint">No passages match these filters.</p>}</label>
          <header className="admin-composition-detail-header"><Stack gap="sm"><Text size="meta" tone="secondary">{selected.identity.job} · {selected.identity.destination}</Text><h2>{selected.identity.title}</h2></Stack><StudioButton type="button" disabled={Boolean(error)} onClick={() => onEdit(selected.row)}>Edit passage</StudioButton></header>
          <Grid className={metricGrid} aria-label="Selected lunar passage coverage">
            <MetricCard label="Publication" value={isArchived(selected.row) ? "Archived" : selected.row.status === "LIVE" ? "Published" : selected.row.status.toLowerCase()} />
            <MetricCard label="Kind" value={selected.identity.kind} />
          </Grid>
          <p>{selected.identity.selection}</p>{selected.identity.excluded && <p role="note">The owner excluded this base Cancer passage. The Calendar selects another approved variant even when this stored row says Published.</p>}
          {selected.row.inventory_only ? <PageLoading compact message="Loading full passage…" /> : <div className="admin-composition-preview-field"><span>Saved passage</span>{(selected.row.body ?? '').split(/\n\n/).map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>}
          <StudioButton type="button" onClick={() => setView('composition')}>Review composition and variables</StudioButton>
          <details className={`${containedDisclosure} admin-workspace-details`}><AdminDisclosureSummary>Source key and editorial notes</AdminDisclosureSummary><code>{selected.row.content_key}</code><p>{selected.row.summary}</p></details>
        </>}</section>
        <aside className="admin-composition-template-list" aria-label="Lunar passages">
          <header><Stack gap="sm"><Text size="meta" tone="secondary">Lunar passages</Text><strong>{filtered.length} {filtered.length === 1 ? 'passage' : 'passages'}</strong></Stack></header>
          <div className="studio-grid">{filtered.slice(0, limit).map(({ row, identity }) => <article className="admin-template-card" key={row.id}>
            <StudioButton type="button" aria-pressed={row.id === selected?.row.id} onClick={() => setSelectedKey(row.content_key)}>{identity.title}</StudioButton>
            <Text size="meta" tone="secondary">{isArchived(row) ? 'Archived' : row.status === 'LIVE' ? 'Published' : row.status.toLowerCase()} · {identity.kind}{identity.excluded ? ' · Excluded by owner' : ''}</Text>
            <StudioButton type="button" aria-label={`Edit ${identity.title}`} onClick={() => { setSelectedKey(row.content_key); onEdit(row); }}>Edit passage</StudioButton>
          </article>)}</div>
          {filtered.length > limit && <StudioButton type="button" onClick={() => setLimit(value => value + 12)}>Show more passages</StudioButton>}
          {!filtered.length && <div className="admin-empty"><p>No lunar passages match these filters.</p><StudioButton type="button" onClick={() => { setJob('Day and Week Moon story'); setFamily('Moon-sign leftover'); setSign('all'); setStatus('active'); onQuery(''); }}>Reset filters</StudioButton></div>}
        </aside>
      </div>
    </>}
    </StudioTabs>
  </section>;
}
