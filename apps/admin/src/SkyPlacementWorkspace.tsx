import { writeupHoroscopesReady } from '../../../src/shared/skyWriteupHoroscopes.js';
import type { WriteupHoroscope } from '../../../src/shared/skyWriteupHoroscopes.js';
import { Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { studioLazy as lazy } from './studioLazy';
import { AdminDisclosureSummary, AdminSelect } from './AdminNativeControls';
import { StudioButton, StudioInput, StudioStatusBadge, StudioTabs, StudioTextarea } from './StudioControls';
const SkyPlacementComposition = lazy(() => import('./SkyPlacementComposition'));
import SkyVisitArticleWriter from './SkyVisitArticleWriter';
import SkyArticlePublication from './SkyArticlePublication';
const SkyArticleAspects = lazy(() => import('./SkyArticleAspects'));
const SkyArticleHoroscopes = lazy(() => import('./SkyArticleHoroscopes'));
const SkyWriteupHoroscopesEditor = lazy(() => import('./SkyWriteupHoroscopesEditor'));
const SkyReaderArticleEntry = lazy(() => import('./SkyReaderArticleEntry'));
import type { StudioPassageEdit } from '../../../src/shared/studioPassageEdit';
import type { SkyReaderArticleCopy } from '../../../src/shared/skyReaderPreview';
import { skyArticleVariableDraftRecord } from '../../../src/shared/skyArticleVariableDraft';
import { skyPublicationScheduled } from './skyArticlePublicationState';
import { SKY_INGRESS_ARTICLE_FORMAT } from '../../web/src/content/skyIngressEssay.mjs';
import { reviseSkyArticleEdition, skyArticleEditableFields, skyArticleEditionContentKey } from '../../web/src/content/skyArticleTemplateCompiler';
import { assertPlacementVisit, placementEdition, placementTemplateKeys, placementVisitDraft, placementVisitRows, placementWorkspaceDocuments, placementWorkspaceTabs,
  type PlacementGeneratedArticle, type PlacementVisitFacts, type PlacementWorkspaceRow as Row } from './skyPlacementWorkspaceModel';
import type { SkyPlacementSelection } from './skyPlacementAssembly';
import type { LiveStatus } from './ContentLiveStatus';
import { placementWritingDraft, placementWritingDraftPayload, placementWritingFacts } from './skyPlacementWritingDraft';

type Request = <T>(path: string, options?: RequestInit) => Promise<T>;
type Props = {
  rows: Row[]; selection: SkyPlacementSelection; request: Request; credential: string;
  date: string | null; onDateChange: (date: string) => void;
  readerEntry?: StudioPassageEdit | null;
  readerSources: ReactNode;
  onRows: (rows: Row[]) => void; onDirty: (dirty: boolean, busy: boolean) => void;
  onEditRow: (row: Row) => void; onEditField: (row: Row, path: string, selection: SkyPlacementSelection) => void;
  onLoadRow: (row: Row) => Promise<unknown>;
};
const title = (value: string) => value.split('-').map(word => word[0].toUpperCase() + word.slice(1)).join(' ');
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const empty: { headline: string; summary: string; body: string; writeupHoroscopes?: WriteupHoroscope[] } = { headline: '', summary: '', body: '' };

export default function SkyPlacementWorkspace(props: Props) {
  const { selection } = props;
  const latest = useRef(props); latest.current = props;
  const [tab, setTab] = useState<'visit' | 'default' | 'setup'>('visit');
  const [composing, setComposing] = useState(false);
  const [articlePeriod, setArticlePeriod] = useState<'current' | 'visit'>('current');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const date = props.date ?? today();
  const [documents, setDocuments] = useState<Row[]>([]);
  const [ready, setReady] = useState(false);
  const [retry, setRetry] = useState(0);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [horoscopeEditor, setHoroscopeEditor] = useState({ dirty: false, busy: false });
  const [writeupHoroscopesOpen, setWriteupHoroscopesOpen] = useState(false);
  const [writeupAiDirty,setWriteupAiDirty]=useState(false);
  const [publicationRequest, setPublicationRequest] = useState(0);
  const publicationPanel = useRef<HTMLDivElement>(null);
  const [facts, setFacts] = useState<PlacementVisitFacts | null>(null);
  const [factsReferenceDate, setFactsReferenceDate] = useState('');
  const [generationOpen, setGenerationOpen] = useState(false);
  const [generationDirty, setGenerationDirty] = useState(false);
  const [generated, setGenerated] = useState<PlacementGeneratedArticle | null>(null);
  const [editorOpenRequest, setEditorOpenRequest] = useState(0);
  const articlePanel = useRef<HTMLElement>(null), writerPanel = useRef<HTMLElement>(null);
  const [editing, setEditing] = useState<Row | null>(null);
  const [writingDraft, setWritingDraft] = useState<Row | null>(null);
  const [fields, setFields] = useState(empty);
  const [baseline, setBaseline] = useState(empty);
  const [readerImport, setReaderImport] = useState<SkyReaderArticleCopy | null>(null);
  const [readerOpening, setReaderOpening] = useState(false);
  const readerOpened = useRef('');
  const [message, setMessage] = useState('');
  const [statuses, setStatuses] = useState<LiveStatus[] | null>(null);
  const [statusError, setStatusError] = useState('');
  const mounted = useRef(true);
  const passageDirty = JSON.stringify(fields) !== JSON.stringify(baseline);
  const dirty = passageDirty || generationDirty || horoscopeEditor.dirty || writeupAiDirty;
  useEffect(() => { latest.current.onDirty(dirty, busy || horoscopeEditor.busy); }, [dirty, busy, horoscopeEditor.busy]);
  useEffect(() => {
    if (!publicationRequest) return;
    const panel = publicationPanel.current;
    panel?.scrollIntoView({ block: 'nearest' });
    panel?.querySelector<HTMLButtonElement>('button[data-publish-action]')?.focus({ preventScroll: true });
  }, [publicationRequest]);
  useEffect(() => {
    if (!editorOpenRequest) return;
    const panel = generationOpen ? writerPanel.current : articlePanel.current;
    panel?.scrollIntoView({ block: 'start' }); panel?.focus({ preventScroll: true });
  }, [editorOpenRequest, generationOpen]);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; latest.current.onDirty(false, false); }; }, []);
  const templates = placementTemplateKeys(selection.planet, selection.sign);
  const inventoryRevision = props.rows.filter(row => row.content_key.startsWith(`sky-article/${selection.planet}/${selection.sign}/`)
    || row.content_key.startsWith(`sky-article-revision/${selection.planet}/${selection.sign}/`)
    || row.content_key.startsWith(`sky-article-workspace/${selection.planet}/${selection.sign}/`))
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
        load({ contentKeyPrefix: `sky-article-workspace/${prefix}` }),
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
    if (busy || dirty || writingDraft || !refreshedEditing || refreshedEditing.updated_at === editing?.updated_at) return;
    if (!latest.current.readerEntry && openVariableArticle(refreshedEditing)) return;
    const edition = placementEdition(refreshedEditing);
    if (!edition) return;
    const next = { headline: edition.headline, summary: edition.tldr, body: edition.body, ...(edition.writeupHoroscopes ? { writeupHoroscopes: edition.writeupHoroscopes } : {}) };
    setEditing(refreshedEditing); setFields(next); setBaseline(next);
  }, [refreshedEditing, editing?.updated_at, dirty, busy, writingDraft]);
  const visitKey = (row: Row) => placementEdition(row)?.contentKey ?? placementWritingDraft(row)?.targetContentKey;
  const compiledVisits = placementVisitRows(allRows, selection.planet, selection.sign);
  const workingVisits = allRows.filter(row => row.status === 'DRAFT' && placementWritingDraft(row)?.facts.planet === selection.planet
    && placementWritingDraft(row)?.facts.sign === selection.sign && !placementWritingDraft(row)?.compiledDraft);
  const visits = [...compiledVisits.filter(row => !workingVisits.some(working => visitKey(working) === visitKey(row))), ...workingVisits];
  const readerIdentity = JSON.stringify(props.readerEntry ?? null);
  useEffect(() => {
    const entry = latest.current.readerEntry;
    if (!ready || !entry || readerOpened.current === readerIdentity) return;
    readerOpened.current = readerIdentity;
    const saved = visits.filter(row => visitKey(row) === entry.sourceKey)
      .sort((a, b) => Number(b.status === 'DRAFT') - Number(a.status === 'DRAFT') || (b.updated_at ?? '').localeCompare(a.updated_at ?? ''))[0];
    if (saved) {
      edit(saved, true);
      setMessage(saved.status === 'DRAFT' ? 'Opened your saved draft. Its complete wording and saved period are preserved.' : 'Opened the saved article. Edit its complete wording, then Save draft.');
    } else setReaderOpening(true);
  }, [ready, readerIdentity]);
  const setupRows = templates.flatMap(key => {
    const row = allRows.find(row => row.content_key === key && row.status !== 'ARCHIVED');
    return row ? [row] : [];
  });

  function discard() { return !dirty || window.confirm('Discard the unsaved changes to this dated article?'); }
  function openVariableArticle(row: Row) {
    if (!(row.sections as Record<string, unknown> | null)?.skyArticleVariableDraft) return false;
    setWritingDraft(null); setEditing(null); setFields(empty); setBaseline(empty); setFacts(null); setError(''); setMessage('');
    setGenerationOpen(false); setGenerationDirty(false); setGenerated(null);
    latest.current.onEditRow(row);
    return true;
  }
  function edit(row: Row, fromReader = false) {
    if (busy || !discard()) return;
    const working = placementWritingDraft(row);
    if (working) {
      const target = working.targetRowId ? allRows.find(candidate => candidate.id === working.targetRowId) : null;
      if (working.targetRowId && !target) { setError('The original article could not be loaded. Retry before editing this draft.'); return; }
      setWritingDraft(row); setEditing(target ? { ...target, updated_at: working.targetRowUpdatedAt } : null);
      setFields(working.fields); setBaseline(working.fields); setFacts(working.facts); setReaderImport(working.readerImport);
      setReaderOpening(false); setError(''); setMessage(''); setComposing(true); setGenerationOpen(false); setGenerationDirty(false); setGenerated(null);
      setEditorOpenRequest(value => value + 1);
      return;
    }
    if (!fromReader && openVariableArticle(row)) return;
    const edition = placementEdition(row);
    if (!edition) return;
    const next = { headline: edition.headline, summary: edition.tldr, body: edition.body, ...(edition.writeupHoroscopes ? { writeupHoroscopes: edition.writeupHoroscopes } : {}) };
    setWritingDraft(null); setReaderImport(null); setReaderOpening(false); setEditing(row); setFields(next); setBaseline(next); setFacts(null); setError(''); setMessage('');
    setComposing(true);
    setGenerationOpen(false); setGenerationDirty(false); setGenerated(null);
    setEditorOpenRequest(value => value + 1);
  }
  function openReaderArticle(copy: SkyReaderArticleCopy, calculated: PlacementVisitFacts) {
    const key = skyArticleEditionContentKey({ ...calculated, format: SKY_INGRESS_ARTICLE_FORMAT });
    const saved = visits.filter(row => visitKey(row) === key)
      .sort((a, b) => Number(b.status === 'DRAFT') - Number(a.status === 'DRAFT') || (b.updated_at ?? '').localeCompare(a.updated_at ?? ''))[0];
    if (saved) {
      edit(saved, true);
      setMessage('Opened your existing article draft. Its complete wording and saved period have been preserved.');
      return;
    }
    const next = { headline: copy.title, summary: copy.summary, body: copy.body };
    setWritingDraft(null); setEditing(null); setFields(next); setBaseline(next); setReaderImport(copy); setReaderOpening(false);
    setFacts(calculated); setFactsReferenceDate(props.readerEntry!.date); setArticlePeriod('current');
    setGenerated(null); setGenerationOpen(false); setGenerationDirty(false); setComposing(true); setTab('visit');
    setEditorOpenRequest(value => value + 1);
    setMessage('The complete published wording is loaded for this calculated period. Nothing has been saved or published.');
  }
  async function loadVisit(generate = false) {
    if (busy || !discard()) return;
    setBusy(true); setError(''); setMessage(''); setComposing(true);
    setReaderImport(null);
    try {
      const payload = await latest.current.request<{ ok: boolean; facts: PlacementVisitFacts }>(`/api/admin/sky-article-facts?${new URLSearchParams({ planet: selection.planet, date, period: articlePeriod, format: SKY_INGRESS_ARTICLE_FORMAT })}`);
      if (payload.ok !== true || !payload.facts) throw new Error('The calculated dates could not be loaded.');
      if (articlePeriod === 'current' && payload.facts.articlePeriod !== 'current') throw new Error('The placement period could not be verified. Reload Studio before writing this article.');
      assertPlacementVisit(payload.facts, selection.planet, selection.sign);
      if (!mounted.current) return;
      const key = skyArticleEditionContentKey({ ...payload.facts, format: SKY_INGRESS_ARTICLE_FORMAT });
      const saved = visits.find(row => visitKey(row) === key);
      if (saved) {
        const savedPeriod = placementEdition(saved) ?? placementWritingDraft(saved)!.facts;
        if (savedPeriod.transitStartInstant !== payload.facts.transitStartInstant || savedPeriod.transitEndInstant !== payload.facts.transitEndInstant)
          throw new Error('An article already uses this start date with different coverage. Open it from Articles to keep its saved period.');
        if (placementWritingDraft(saved)) { setBusy(false); edit(saved); return; }
        if (openVariableArticle(saved)) return;
        const edition = placementEdition(saved)!;
        const next = { headline: edition.headline, summary: edition.tldr, body: edition.body, ...(edition.writeupHoroscopes ? { writeupHoroscopes: edition.writeupHoroscopes } : {}) };
        setWritingDraft(null); setEditing(saved); setFields(next); setBaseline(next);
      }
      else { setWritingDraft(null); setEditing(null); setFields({ ...empty, headline: payload.facts.slotValues.articleTitle ?? '' }); setBaseline({ ...empty, headline: payload.facts.slotValues.articleTitle ?? '' }); }
      setFacts(payload.facts); setFactsReferenceDate(date); setGenerated(null); setGenerationDirty(false);
      setGenerationOpen(generate && !saved);
      setEditorOpenRequest(value => value + 1);
      setMessage(saved ? 'Your saved article is open. Its wording has been preserved. No generation was started.'
        : generate ? 'Review the full calculated visit below, then choose Generate this draft to start the writer.' : 'Write your article below for the full calculated visit.');
    } catch (reason) { if (mounted.current) setError(reason instanceof Error ? reason.message : 'Calculated dates could not load.'); }
    finally { if (mounted.current) setBusy(false); }
  }
  async function save(forPublication = false) {
    if (busy) return null;
    setBusy(true); setError(''); setMessage('');
    try {
      if (!forPublication && (!fields.headline.trim() || !fields.summary.trim() || !fields.body.trim() || /\{\{|\}\}/u.test(fields.headline + fields.summary + fields.body))) {
        const calculated = facts ?? (editing ? placementWritingFacts(editing) : null);
        if (!calculated) throw new Error('Load the article period before saving. Your writing is still here.');
        const body = placementWritingDraftPayload(calculated, fields, readerImport, editing, writingDraft);
        const result = await latest.current.request<{ ok: boolean; rows: Row[] }>('/api/admin/generated-content', {
          method: writingDraft ? 'PATCH' : 'POST', body: JSON.stringify(writingDraft
            ? { ...body, id: writingDraft.id, expectedUpdatedAt: writingDraft.updated_at } : body) });
        const saved = result.rows?.[0];
        if (!result.ok || saved?.status !== 'DRAFT' || !placementWritingDraft(saved)) throw new Error('Draft save was not confirmed. Your writing is still here.');
        setWritingDraft(saved); setBaseline(fields); setDocuments(rows => [...rows.filter(row => row.id !== saved.id), saved]); latest.current.onRows([saved]);
        setMessage('Draft saved. Nothing was published.');
        return saved;
      }
      let payload: { ok: boolean; rows: Row[]; skippedLiveRows?: unknown[] };
      const base = editing && placementEdition(editing);
      if (editing && base) {
        if (!editing.updated_at) throw new Error('Reload this saved article to get its current version before saving.');
        const updated = { ...skyArticleEditableFields(base), headline: fields.headline, tldr: fields.summary, body: fields.body, writeupHoroscopes: fields.writeupHoroscopes };
        const variables = skyArticleVariableDraftRecord((editing.sections as Record<string, unknown> | null)?.skyArticleVariableDraft);
        const revised = await reviseSkyArticleEdition(base, updated);
        payload = await latest.current.request('/api/admin/generated-content', { method: 'PATCH', body: JSON.stringify({
          id: editing.id, expectedUpdatedAt: editing.updated_at, ownerAction: 'save-sky-article-edition-revision', sections: { skyArticleEdition: revised,
            ...(variables ? { skyArticleVariableDraft: { ...variables, templates: { headline: updated.headline, tldr: updated.tldr, body: updated.body } } } : {}) }
        }) });
      } else {
        if (!facts) throw new Error('Load calculated dates before saving this visit.');
        const row = await placementVisitDraft(facts, fields, setupRows[0], { generated, readerImport });
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
      if (writingDraft) {
        // Retain the exact recovery copy, recording completion only after the compiled save succeeds.
        try {
          const result = await latest.current.request<{ ok: boolean; rows: Row[] }>('/api/admin/generated-content', { method: 'PATCH', body: JSON.stringify({
            id: writingDraft.id, expectedUpdatedAt: writingDraft.updated_at, sections: {
              ...(writingDraft.sections as Record<string, unknown>), skyPlacementWritingDraft: { ...placementWritingDraft(writingDraft), compiledDraft: { id: saved.id, updatedAt: saved.updated_at } }
            }
          }) });
          if (result.ok && result.rows?.[0]) { const recovery = result.rows[0]; setDocuments(rows => [...rows.filter(row => row.id !== recovery.id), recovery]); latest.current.onRows([recovery]); }
        } catch { /* The confirmed compiled draft is saved; a concurrent recovery copy remains intact. */ }
      }
      const next = { headline: edition.headline, summary: edition.tldr, body: edition.body, ...(edition.writeupHoroscopes ? { writeupHoroscopes: edition.writeupHoroscopes } : {}) };
      setWritingDraft(null); setEditing(saved); setFields(next); setBaseline(next); setGenerated(null); setMessage('Draft saved. Nothing was published.');
      return saved;
    } catch (reason) { if (mounted.current) {
      const status = (reason as { status?: number } | null)?.status;
      setError(status === 409 ? 'This article changed in another editor. Your unsaved writing is still here. Reload saved writing before trying again.'
        : reason instanceof Error && !reason.message.includes('/api/') ? reason.message : 'The draft could not be saved. Your unsaved writing is still here.');
    } }
    finally { if (mounted.current) setBusy(false); }
    return null;
  }

  const update = (key: keyof typeof fields, value: string) => setFields(current => ({ ...current, [key]: value }));
  const filteredVisits = visits.filter(row => (statusFilter === 'all' || (statusFilter === 'scheduled' ? skyPublicationScheduled(row) : row.status === statusFilter && !skyPublicationScheduled(row)))
    && `${row.headline} ${placementEdition(row)?.validFrom ?? placementWritingDraft(row)?.facts.validFrom} ${placementEdition(row)?.validTo ?? placementWritingDraft(row)?.facts.validTo}`.toLowerCase().includes(query.trim().toLowerCase()));
  const shortDate = (instant: string) => new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(instant));
  const openedEdition = editing ? placementEdition(editing) : null;
  const openedFacts = facts ?? (editing?.source_snapshot as { engineFacts?: PlacementVisitFacts } | null)?.engineFacts;
  const articleWindow = openedEdition ?? facts;
  const horoscopes = (period = false) => <Suspense fallback={<p role="status">Loading linked horoscopes…</p>}>
    <SkyArticleHoroscopes window={period && articleWindow ? articleWindow : undefined} buttonLabel={period ? 'Related horoscope editions' : undefined} placement={selection} rows={props.rows} credential={props.credential}
      request={props.request} onLoadRow={props.onLoadRow} onEditRow={props.onEditRow} onEditorState={setHoroscopeEditor}
      onWritePlanetaryHoroscopes={period ? () => setWriteupHoroscopesOpen(true) : undefined} />
  </Suspense>;
  const canSave = !busy && !generationOpen && !writeupAiDirty && (editing || writingDraft ? passageDirty : Boolean(fields.headline || fields.summary || fields.body || fields.writeupHoroscopes?.some(passage => passage.body)));
  const missingFields = [['Title', fields.headline], ['Summary', fields.summary], ['Content', fields.body]].filter(([, value]) => !value.trim()).map(([label]) => label);
  const publishRequirements = [
    missingFields.length && `Required: ${missingFields.join(', ')}.`,
    !writeupHoroscopesReady(fields.writeupHoroscopes) && 'Complete all 12 horoscopes.',
    writeupAiDirty && 'Use or discard AI draft.',
    horoscopeEditor.dirty && 'Save related horoscopes.',
    editing?.status === 'LIVE' && !passageDirty && !writingDraft && 'Edit before publishing.'
  ].filter(Boolean).join(' ');
  const publishDisabled = busy || generationOpen || Boolean(publishRequirements);
  const publishStatus = busy ? 'Working…' : publishRequirements || 'Ready to publish.';
  async function openPublication() {
    if (publishDisabled) return;
    if ((!editing || passageDirty || writingDraft) && !await save(true)) return;
    setPublicationRequest(value => value + 1);
  }
  const publicationControls = <div ref={publicationPanel} tabIndex={-1} aria-label="Article publication">{editing ? <SkyArticlePublication row={editing} request={latest.current.request} disabled={busy || dirty} onBusyChange={setBusy}
    publicationBlocked={writeupHoroscopesReady(fields.writeupHoroscopes) ? undefined : 'Complete all 12 sign readings before publishing these write-up horoscopes. You can keep saving the draft.'}
    onSaved={saved => { setEditing(saved); setDocuments(rows => [...rows.filter(row => row.id !== saved.id), saved]); latest.current.onRows([saved]); }} />
    : <p className="admin-field-hint">{publishStatus}</p>}</div>;
  function backToArticles() {
    if (busy || !discard()) return;
    setComposing(false); setWritingDraft(null); setReaderImport(null); setReaderOpening(false); setWriteupHoroscopesOpen(false); setEditing(null); setFacts(null); setFields(empty); setBaseline(empty);
    setGenerationOpen(false); setGenerationDirty(false); setGenerated(null); setMessage(''); setError('');
  }
  const periodFinder = <div className="studio-section">
    <label><span>Find a period containing</span><StudioInput aria-label="Visit reference date" type="date" value={date} disabled={busy} onChange={event => props.onDateChange(event.target.value)} /></label>
    <label><span>Article coverage</span><AdminSelect aria-label="Article coverage" value={articlePeriod} disabled={busy} onChange={event => setArticlePeriod(event.target.value as 'current' | 'visit')}>
      <option value="current">Placement period (retrograde or visit)</option><option value="visit">Full sign visit</option>
    </AdminSelect></label>
    <div className="admin-toolbar-actions">
      <StudioButton className="admin-primary-button" disabled={busy || !date} onClick={() => void loadVisit()}>Write article</StudioButton>
      <StudioButton disabled={busy || !date} onClick={() => void loadVisit(true)}>Generate draft</StudioButton>
    </div>
  </div>;
  return <section className="admin-workspace studio-sky-cms" aria-label={`${title(selection.planet)} in ${title(selection.sign)} workspace`}>
    <StudioTabs label="Planet and sign writing" tabs={placementWorkspaceTabs} value={tab} onValueChange={value => setTab(value)}>
      {tab === 'visit' ? <section className="admin-workspace" aria-label="Dated visit articles" aria-busy={busy}>
        {!ready && !error && <p role="status">Loading saved writing…</p>}
        {ready && readerOpening && props.readerEntry && <Suspense fallback={<p role="status">Opening the reader article…</p>}>
          <SkyReaderArticleEntry context={props.readerEntry} request={props.request} onOpen={openReaderArticle}
            onReload={() => { readerOpened.current = ''; setReaderOpening(false); setRetry(value => value + 1); }} />
        </Suspense>}
        {ready && !composing && !readerOpening && <section className="studio-section" aria-label="Saved visits">
          <header className="studio-section-header">
            <h3>Articles</h3>
            <StudioButton className="admin-primary-button" disabled={busy} onClick={() => { setComposing(true); setWritingDraft(null); setEditing(null); setFacts(null); setFields(empty); setBaseline(empty); }}>New article</StudioButton>
          </header>
          <div className="admin-collection-toolbar">
            <label className="admin-title-field studio-sky-article-search"><span>Search articles</span><StudioInput type="search" aria-label="Search saved articles" placeholder="Search title or period" value={query} onChange={event => setQuery(event.target.value)} /></label>
            <label><span>Status</span><AdminSelect aria-label="Article status" value={statusFilter} onChange={event => setStatusFilter(event.target.value)}>
              <option value="all">All statuses</option><option value="DRAFT">Draft</option><option value="LIVE">Published</option><option value="scheduled">Scheduled</option>
            </AdminSelect></label>
          </div>
          {!visits.length ? <p>No articles yet. Create an article for a calculated placement period.</p> : <div className="admin-content-table-scroll">
            <table className="admin-data-table studio-sky-article-table" aria-label="Saved articles">
              <thead><tr><th scope="col">Article</th><th scope="col">Period</th><th scope="col">Status</th><th scope="col">Updated</th><th scope="col">Actions</th></tr></thead>
              <tbody>{filteredVisits.map(row => { const edition = placementEdition(row), working = placementWritingDraft(row); const period = edition ?? working!.facts; return <tr key={row.id}>
                <td data-label="Article"><strong>{edition?.headline || working?.fields.headline || 'Untitled article'}</strong>{edition && edition.contentKey !== row.content_key && <div><small>Working revision</small></div>}</td>
                <td data-label="Period">{shortDate(period.transitStartInstant)} to {shortDate(period.transitEndInstant)}{edition?.scope === 'day' && <div><small>Saved day article</small></div>}</td>
                <td data-label="Status"><StudioStatusBadge tone={row.status === 'LIVE' ? statuses?.some(status => status.id === row.id && status.live) ? 'live' : 'unknown' : 'draft'}>{row.status === 'LIVE' ? statuses === null ? 'Checking…' : statuses.some(status => status.id === row.id && status.live) ? 'Published' : 'Inactive' : skyPublicationScheduled(row) ? 'Scheduled' : 'Draft'}</StudioStatusBadge></td>
                <td data-label="Updated">{row.updated_at ? shortDate(row.updated_at) : 'Unavailable'}</td>
                <td data-label="Actions"><StudioButton disabled={busy} onClick={() => edit(row)}>Edit</StudioButton></td>
              </tr>; })}</tbody>
            </table>
            {!filteredVisits.length && <p className="admin-empty">No articles match these filters.</p>}
          </div>}
        </section>}
        {ready && composing && !editing && !facts && <section className="studio-section" aria-label="New article period">
          <header className="studio-section-header"><h3>New article</h3><StudioButton disabled={busy} onClick={backToArticles}>Back to articles</StudioButton></header>
          {periodFinder}
        </section>}
        {composing && facts && generationOpen && <section ref={writerPanel} tabIndex={-1} className="admin-workspace" aria-label="Dated article generation workspace">
          <SkyVisitArticleWriter key={`${facts.transitStartInstant}/${facts.transitEndInstant}`} facts={facts} referenceDate={factsReferenceDate}
            request={props.request} onBusyChange={setBusy} onDirtyChange={setGenerationDirty} onUse={article => {
              setGenerated(article); setFields({ headline: article.edition.headline, summary: article.edition.tldr, body: article.edition.body });
              setGenerationOpen(false); setGenerationDirty(false); setMessage('Generated wording is in the editor. Review it, then Save draft. Nothing has been saved or published.');
              setEditorOpenRequest(value => value + 1);
            }} />
          <StudioButton disabled={busy} onClick={() => {
            if (generationDirty && !window.confirm('Discard the generated suggestion and direction before writing your article?')) return;
            setGenerationOpen(false); setGenerationDirty(false);
            setEditorOpenRequest(value => value + 1);
          }}>Write article instead</StudioButton>
        </section>}
        {composing && (editing || facts) && !generationOpen && <section ref={articlePanel} tabIndex={-1} className="admin-workspace" aria-label="Article for this visit">
          <header className="studio-sky-editor-toolbar admin-review-status-bar">
            <div className="admin-toolbar-actions"><StudioButton disabled={busy} onClick={backToArticles}>Back to articles</StudioButton><span className="admin-editor-save-state" role="status">{busy ? 'Working…' : passageDirty ? 'Unsaved changes' : editing || writingDraft ? 'Saved' : 'Not saved'}</span></div>
            <div className="studio-stack" data-gap="sm">
              <div className="admin-toolbar-actions">
                <StudioButton disabled={!canSave} onClick={() => void save()}>Save draft</StudioButton>
                <StudioButton className="admin-primary-button studio-publish" disabled={publishDisabled} aria-describedby="sky-publish-help" onClick={() => void openPublication()}>Publish</StudioButton>
              </div>
              <p id="sky-publish-help" role="status">{publishStatus}</p>
            </div>
            {error && <p role="alert">{error}</p>}
          </header>
          <div className="studio-sky-editor-layout">
            <div className="studio-sky-editor-writing studio-section studio-workspace-pane">
              <label className="admin-title-field"><span>Title</span><StudioInput aria-label="Visit article title" value={fields.headline} disabled={busy} onChange={event => update('headline', event.target.value)} /></label>
              <label className="admin-review-copy-editor"><span>Summary</span><StudioTextarea className="studio-sky-summary" formatting={false} aria-label="Visit article summary" rows={2} value={fields.summary} disabled={busy} onChange={event => update('summary', event.target.value)} /></label>
              <label className="admin-review-copy-editor"><span>Content</span><StudioTextarea aria-label="Visit article body" rows={16} value={fields.body} disabled={busy} onChange={event => update('body', event.target.value)} /></label>
              {articleWindow && <Suspense fallback={<p role="status">Loading article aspects…</p>}>
                <SkyArticleAspects window={articleWindow} facts={openedFacts} request={props.request} />
              </Suspense>}
            </div>
            <aside className="studio-sky-editor-settings studio-section studio-workspace-pane" aria-label="Article settings">
              <h3>Article settings</h3>
              <Suspense fallback={<p role="status">Loading write-up horoscopes…</p>}>
                <SkyWriteupHoroscopesEditor passages={fields.writeupHoroscopes} period={facts?.slotValues.when ?? openedEdition?.slotValues.when ?? ''}
                  open={writeupHoroscopesOpen} onOpenChange={setWriteupHoroscopesOpen} publicationControls={publicationControls}
                  missingFields={missingFields} onPublish={() => void openPublication()} publishDisabled={publishDisabled}
                  row={editing} request={latest.current.request} onBusyChange={setBusy} aiDirty={writeupAiDirty} onAiDirtyChange={setWriteupAiDirty}
                  busy={busy} canSave={canSave} message={message} error={error} onSave={() => void save()}
                  onChange={writeupHoroscopes => setFields(current => ({ ...current, writeupHoroscopes }))} />
              </Suspense>
              {horoscopes(true)}
              {!writeupHoroscopesOpen && publicationControls}
              <dl className="studio-detail-list">
                <div><dt>Status</dt><dd>{skyPublicationScheduled(editing) ? 'Scheduled' : editing?.status === 'LIVE' ? 'Editing a new draft of a published article' : 'Draft'}</dd></div>
                <div><dt>Placement</dt><dd>{title(selection.planet)}{openedFacts?.motion === 'retrograde' ? ' Rx' : ''} in {title(selection.sign)}</dd></div>
                <div><dt>Article period</dt><dd>{facts?.slotValues.when ?? openedEdition?.slotValues.when}</dd></div>
                <div><dt>Coverage</dt><dd>{openedEdition?.scope === 'day' ? 'Saved day article' : openedFacts?.periodLabel ?? 'Full sign visit'}</dd></div>
              </dl>
              {!editing && <details className="studio-contained-disclosure"><AdminDisclosureSummary>Choose another period</AdminDisclosureSummary>{periodFinder}</details>}
              {editing && <details className="studio-contained-disclosure"><AdminDisclosureSummary>Advanced</AdminDisclosureSummary><StudioButton disabled={busy || dirty} onClick={() => latest.current.onEditRow(editing)}>History & article actions</StudioButton></details>}
            </aside>
          </div>
        </section>}
        {message && <p role="status">{message}</p>}
      </section> : tab === 'default' ? <section className="admin-workspace" aria-label="Default placement reading">
        <p>Used when no dated article is published.</p>
        {horoscopes()}
        <Suspense fallback={<p role="status">Loading default reading sources…</p>}><SkyPlacementComposition defaultReadingOnly rows={props.rows} selection={selection} onEditRow={props.onEditRow} onEditField={props.onEditField} onLoadRow={props.onLoadRow} /></Suspense>
      </section> : <section className="admin-workspace" aria-label="Reusable writing setup">
        <p>Templates for new articles.</p>
        {ready && !setupRows.length && <p>No saved templates.</p>}
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
    <details className="studio-contained-disclosure" onToggle={event => setSourcesOpen(event.currentTarget.open)}>
      <AdminDisclosureSummary>Reader preview & source details</AdminDisclosureSummary>
      {sourcesOpen && <>{statusError && <p role="alert">{statusError}</p>}{props.readerSources}</>}
    </details>
    {error && (!composing || !facts && !editing) && <p role="alert">{error} <StudioButton disabled={busy} onClick={() => setRetry(value => value + 1)}>Reload saved writing</StudioButton></p>}
  </section>;
}
