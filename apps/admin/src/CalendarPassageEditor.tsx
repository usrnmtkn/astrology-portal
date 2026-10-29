import { CalendarPassageProse } from '../../../src/shared/features/calendar/CalendarPassageProse';
import { lunarContentIdentity } from './lunarCalendarContent';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { StudioButton, StudioInput } from './StudioControls';
import CalendarPassageTemplateEditor, { type CalendarTemplateHandle } from './CalendarPassageTemplateEditor';
import { calendarPassageVariableLabel as variableLabel, calendarPassageVariableHelp, calendarVariableKind, isConditionVariable } from './variablePresentation';
import { calendarPassageMoonTiming } from './calendarPassageMoonTiming';
import { calendarVariableColor } from './calendarOverviewTemplate';
import { AdminDisclosureSummary, AdminSelect } from './AdminNativeControls';
import { calculateCalendarPreview, type CalendarPreviewCalculation } from './calendarPreviewCalculation';
import { calendarPreviewSourceKeys, calendarPreviewValues, type CalendarPreviewRow } from './calendarPreviewModel';
import { calendarSharedPassageSources } from './calendarSharedPassageSources';
import { requestStudioJson, studioInventoryDocumentPath } from './generatedContentClient';
import { announceContentUpdate, subscribeToContentUpdates } from '../../web/src/services/contentUpdateSignal';
import { zonedDateTimeToUtc } from '../../web/src/services/timezones';
import { calendarLocalDateKey } from '../../../src/shared/features/calendar/calendarPhaseLabel';
import { calendarEventGeneratedContentKeys } from '../../../src/shared/features/calendar/calendarContentKeys';
import { calendarStudioMoonSources, publishedPassageSources } from './calendarPassageSources';
import { calendarPassageKey, calendarPassageRecord, renderCalendarPassage, calendarPassageErrors, type CalendarPassagePeriod } from '../../../src/shared/features/calendar/calendarPassageTemplates';
import { calendarPassageDate, calendarPeriodPassageValues, calendarEditablePassage } from '../../../src/shared/features/calendar/calendarPassageAssembly';
import { isContentRetired } from '../../web/src/content/contentPublicationState';
import { refreshContentPublications } from '../../web/src/services/contentPublications';
import CalendarPassageReaderPreview from './CalendarPassageReaderPreview';
import { calendarDefaultPattern as defaultPattern, calendarWorkspaceReading, calendarWorkspaceTransitionKey } from './calendarPassageWorkspace';
import type { SkyForecastPeriod } from './skyForecastTemplates';
import type { StudioPassageEdit } from '../../../src/shared/studioPassageEdit';

const passageError = (reason: unknown, fallback: string) => reason instanceof Error && !reason.message.startsWith('/api/') ? reason.message : fallback;
const localEdits = new Map<string, string>();
type SavedRow = CalendarPreviewRow & { mode?: string; sections?: any; source_snapshot?: Record<string, any>; updated_at: string };
const bodyOf = (row?: SavedRow) => row?.sections?.packageDraft?.body_you ?? row?.sections?.packageDraft?.body ?? row?.sections?.packageRecord?.body_you ?? row?.sections?.packageRecord?.body ?? row?.body;

export default function CalendarPassageEditor({ period: studioPeriod, loadRows, secret, onEditSource, readerEntry, sourceEditor, sourceDraft }: {
  period: SkyForecastPeriod; loadRows: (keys: string[]) => Promise<CalendarPreviewRow[]>; secret: string;
  onEditSource: (row: CalendarPreviewRow) => void;
  readerEntry?: StudioPassageEdit | null;
  sourceEditor?: ReactNode;
  sourceDraft?: { contentKey: string; body: string } | null;
}) {
  const period = studioPeriod.split('-')[0] as CalendarPassagePeriod;
  const [timeZone, setTimeZone] = useState(() => readerEntry?.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
  const [date, setDate] = useState(() => readerEntry?.date || calendarLocalDateKey(new Date().toISOString(), timeZone));
  const [requested, setRequested] = useState({ date, timeZone });
  const [scope, setScope] = useState(readerEntry?.sourceKey.startsWith('authored/calendar-moon-transition/') ? 'shared' : 'date');
  const [target, setTarget] = useState(readerEntry?.sourceKey.startsWith('authored/calendar-moon-transition/') ? 'moon' : 'overview');
  const [contentKey, setContentKey] = useState(() => calendarPassageKey(period, date, timeZone));
  const [calculation, setCalculation] = useState<CalendarPreviewCalculation>();
  const [sources, setSources] = useState<CalendarPreviewRow[]>([]);
  const [loaded, setLoaded] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState<SavedRow>();
  const [published, setPublished] = useState<SavedRow>();
  const [body, setBody] = useState('');
  const templateEditor = useRef<CalendarTemplateHandle>(null);
  const [baseline, setBaseline] = useState('');
  const [historyId, setHistoryId] = useState('');
  const [history, setHistory] = useState<any[] | null>(null);
  const [sourcesChanged, setSourcesChanged] = useState(false);
  const [selectedSourceKey, setSelectedSourceKey] = useState('');
  const activeSourceKey = sourceEditor && sourceDraft?.contentKey === selectedSourceKey ? selectedSourceKey : '';
  const contextKey = `${studioPeriod}|${requested.date}|${requested.timeZone}|${attempt}|${scope}|${target}`;
  const sharedMoon = period === 'daily' && target === 'moon' && scope === 'shared';
  const selectionPending = date !== requested.date || timeZone !== requested.timeZone;
  const ready = !selectionPending && loaded === contextKey;
  const dirty = body !== baseline;
  const content = useMemo(() => publishedPassageSources(sources), [sources]);
  const values = useMemo(() => calculation ? calendarPeriodPassageValues(period, calculation, requested.date,
    new Map([[requested.date, calculation.sky]]), content, calendarStudioMoonSources(content)) : {}, [period, calculation, requested.date, content]);
  const sourceValues = useMemo(() => calculation && scope === 'shared' && !sharedMoon ? calendarPreviewValues({
    sunSign: calculation.sky.positions.find(position => position.planet === 'Sun')?.sign ?? '',
    moonSign: values.moonSign?.text ?? '', calculation, rows: sources
  }) : {}, [calculation, sources, values, scope, sharedMoon]);
  const errors = sharedMoon && /[{}]/u.test(body) ? ['Shared Moon transition sources use complete wording. Insert variables in a date-only passage or the daily template.'] : calendarPassageErrors(body);
  const rendered = ready && !errors.length ? sharedMoon ? body.trim() : renderCalendarPassage(body, values) : null;
  const previewIssues = errors.length ? errors : !rendered && ready ? ['The edited passage has no complete reader wording for this date. Check required values and conditions.'] : [];
  const publishedReading = useMemo(() => calculation ? calendarWorkspaceReading(period, calculation, requested.date, calculation.sky, content) : null, [period, calculation, requested.date, content]);
  const editingSource = useMemo(() => {
    if (sourceDraft && sourceDraft.contentKey !== contentKey
      && (sources.some(row => row.content_key === sourceDraft.contentKey) || Object.values(values).some(value => value.sourceKey === sourceDraft.contentKey))) return sourceDraft;
    if (scope !== 'shared' || !selectedSourceKey) return null;
    const drafts = sources.filter(row => row.content_key === selectedSourceKey && row.status === 'DRAFT' && !row.id.startsWith('package:'));
    const pending = drafts.find(row => 'mode' in row && row.mode === 'studio-draft') ?? drafts[0];
    const wording = bodyOf(pending as SavedRow | undefined);
    return typeof wording === 'string' ? { contentKey: selectedSourceKey, body: wording } : null;
  }, [sourceDraft, contentKey, sources, values, scope, selectedSourceKey]);
  const draftReading = useMemo(() => calculation ? calendarWorkspaceReading(period, calculation, requested.date, calculation.sky, content,
    [...(editingSource ? [{key:editingSource.contentKey,body:editingSource.body}] : []), { key: contentKey, body }]) : null,
    [period, calculation, requested.date, content, contentKey, body, editingSource]);
  const sourceDraftChanged = Boolean(editingSource && (publishedReading?.body !== draftReading?.body || publishedReading?.transition?.body !== draftReading?.transition?.body));
  const sourceDraftSaved = Boolean(editingSource && sources.some(row => row.content_key === editingSource.contentKey && row.status === 'DRAFT'
    && !row.id.startsWith('package:') && bodyOf(row as SavedRow) === editingSource.body));
  const transitionKey = calendarWorkspaceTransitionKey(values);
  const moonTiming = period === 'daily' && ready ? calendarPassageMoonTiming(calculation, requested.date, values.moonSign?.text) : null;
  const savedSources = saved?.sections?.calendarPassageSources as Record<string, string> | undefined;
  const sourceChanges = savedSources && sources.filter(row => row.status === 'LIVE' && savedSources[row.content_key] && savedSources[row.content_key] !== row.updated_at);
  const usedSources = sources.filter(row => row.body && !row.content_key.startsWith('calendar-passage/') && Object.values(values).some(value => value.kind === 'copy' && value.text.includes(row.body!.trim())));
  const sourceSnapshot = Object.fromEntries(sources.filter(row => row.updated_at && row.status === 'LIVE').map(row => [row.content_key, row.updated_at]));

  useEffect(() => {
    let active = true;
    setError(''); setStatus('Loading the assembled passage…'); setHistory(null);
    void (async () => {
      const instant = zonedDateTimeToUtc(requested.date, '12:00 PM', requested.timeZone);
      const result = await calculateCalendarPreview(studioPeriod, instant.toISOString(), requested.timeZone);
      await refreshContentPublications(true);
      const signs = [...result.days.map(day => day.moonSign), ...result.sky.positions.filter(item => item.planet === 'Sun').map(item => item.sign)];
      const keys = [...new Set([...calendarPreviewSourceKeys(studioPeriod, signs), ...result.events.flatMap(event => calendarEventGeneratedContentKeys(event)), calendarPassageKey(period, calendarPassageDate(period, requested.date, result.days), requested.timeZone), calendarPassageKey(period)])];
      const batches = Array.from({ length: Math.ceil(keys.length / 32) }, (_, index) => keys.slice(index * 32, (index + 1) * 32));
      const rows = await Promise.all(batches.map(async batch => {
          const params = new URLSearchParams({ status: 'all', visibility: 'all', limit: '200' });
          batch.forEach(key => params.append('contentKeys', key));
          const [response, packaged] = await Promise.all([
            requestStudioJson(`/api/admin/generated-content-inventory?${params}`, secret),
            requestStudioJson(`/api/admin/generated-content?${new URLSearchParams([...params].map(([key, value]) => [key, key === 'status' ? 'LIVE' : value]))}`, secret)
          ]);
          if (!Array.isArray(packaged.rows) || packaged.nextCursor || packaged.rows.some((row: SavedRow) => !batch.includes(row.content_key))) throw new Error('The published sources could not be verified. Reload before editing.');
          if (!Array.isArray(response.rows) || response.nextCursor || response.rows.some((row: SavedRow) => !batch.includes(row.content_key) || row.inventory_only)) throw new Error('The complete saved sources could not be verified. Reload before editing.');
          return [...response.rows, ...packaged.rows.filter((row: SavedRow) => row.id?.startsWith('package:'))] as CalendarPreviewRow[];
        })).then(result => result.flat());
      const sourceContent = publishedPassageSources(rows);
      const assembledValues = calendarPeriodPassageValues(period, result, requested.date, new Map([[requested.date, result.sky]]), sourceContent, calendarStudioMoonSources(sourceContent));
      const selectedKey = sharedMoon ? calendarWorkspaceTransitionKey(assembledValues) : calendarPassageKey(period, scope === 'date' ? calendarPassageDate(period, requested.date, result.days) : undefined, requested.timeZone);
      if (!selectedKey) throw new Error('No Moon transition source is available for this date. Choose another date or the daily overview.');
      if (readerEntry && requested.date === readerEntry.date && requested.timeZone === readerEntry.timeZone
        && (readerEntry.sourceKey.startsWith('authored/calendar-moon-transition/') ? sharedMoon : scope === 'date' && target === 'overview')
        && selectedKey !== readerEntry.sourceKey) throw new Error('The reader source does not match this date. Refresh the reader and reopen its passage.');
      const document = await requestStudioJson(studioInventoryDocumentPath(selectedKey, { status: 'all', limit: 10 }), secret);
      if (!active) return;
      if (!Array.isArray(document.rows) || document.rows.some((row: SavedRow) => row.content_key !== selectedKey || row.inventory_only)) throw new Error('The complete editing source could not be verified. Reload before editing.');
      const editions = document.rows as SavedRow[];
      if (sharedMoon && !editions.some(row => row.sections?.packageRecord)) throw new Error('The shared Moon transition source is unavailable. Reload or choose the date-only passage.');
      const live = isContentRetired(selectedKey) ? undefined : editions.find(row => row.status === 'LIVE' && row.mode !== 'studio-draft');
      const proposal = editions.find(row => row.status === 'DRAFT' && row.mode === 'studio-draft') ?? editions.find(row => row.status === 'DRAFT') ?? live;
      const retiredTarget = !live ? editions.find(row => row.status === 'LIVE' && row.mode !== 'studio-draft') : undefined;
      const shared = sourceContent.get(calendarPassageKey(period));
      const sharedPattern = shared?.body ?? defaultPattern(period);
      const pattern = bodyOf(proposal) ?? bodyOf(editions.find(row => row.id.startsWith('package:'))) ?? (scope === 'date' ? calendarEditablePassage(sharedPattern, assembledValues) : sharedPattern);
      setContentKey(selectedKey); setSourcesChanged(false); setCalculation(result); setSources(rows); setSaved(proposal ?? retiredTarget); setPublished(live); setHistoryId([live, proposal, editions[0]].find(row => row && !row.id.startsWith('package:'))?.id ?? '');
      setBody(localEdits.get(selectedKey) ?? pattern); setBaseline(pattern);
      setLoaded(contextKey); setStatus(proposal ? proposal.status === 'LIVE' ? 'Published passage. Editing creates a separate draft.' : proposal.id.startsWith('package:') ? 'Original shared source. Editing creates a draft; the current reader wording stays published.' : 'Saved draft. Readers still see the last published passage.' : period === 'monthly' && !shared && !assembledValues.overview ? 'No published monthly overview is available. Write a passage using the calculated variables below.' : 'Using the current shared writing. Nothing has been saved for this selection.');
    })().catch(reason => { if (active) { setError(passageError(reason, 'The passage could not load. Reload saved status to try again.')); setStatus(''); } });
    return () => { active = false; };
  }, [contextKey, loadRows, secret]);
  useEffect(() => {
    if (!ready) return;
    if (dirty) localEdits.set(contentKey, body); else localEdits.delete(contentKey);
    const guard = (event: BeforeUnloadEvent) => { if (dirty) event.preventDefault(); };
    window.addEventListener('beforeunload', guard);
    return () => window.removeEventListener('beforeunload', guard);
  }, [body, baseline, ready, dirty, contentKey]);

  useEffect(() => subscribeToContentUpdates(notice => {
    if (notice.contentKey !== contentKey && sources.some(row => row.content_key === notice.contentKey)) {
      setSourcesChanged(true);
      // Refresh only while this shared source's direct editor is open. The
      // retained preview selection must not authorize refresh after closing it.
      if (!dirty && scope === 'shared' && activeSourceKey === notice.contentKey) setAttempt(value => value + 1);
    }
  }), [contentKey, sources, dirty, scope, activeSourceKey]);

  async function save() {
    setBusy(true); setError('');
    try {
      if (sharedMoon && !saved?.sections?.packageRecord) throw new Error('The shared transition source is unavailable. Reload before saving.');
      const record = saved?.sections?.packageRecord ?? calendarPassageRecord(contentKey, body);
      const persisted = saved && !saved.id.startsWith('package:');
      const proposal = { ...record, body, body_you: body };
      const sections = { ...(saved?.sections ?? {}), packageRecord: record, packageDraft: proposal, calendarPassageSources: sourceSnapshot };
      const payload = persisted ? { id: saved.id, expectedUpdatedAt: saved.updated_at, sections }
        : { contentKey, surface: 'sky', mode: sharedMoon ? 'in_depth' : 'feed', eventType: sharedMoon ? 'fallback-hook' : 'calendar-passage', blockType: 'fallback_hook', status: 'DRAFT', lane: 'reference', headline: record.headline || 'Calendar assembled passage', body, facts: { fallbackArchitectureV3: true },
          provider: 'tldrastro-fallback-architecture-v3', sections, sourceSnapshot: { sourcePackage: record.source_package || 'tldrastro-fallback-architecture-v3', content_role: 'full_copy', review_status: 'needs_review' } };
      const result = await requestStudioJson('/api/admin/generated-content', secret, { method: persisted ? 'PATCH' : 'POST', body: JSON.stringify(payload) });
      const row = (result.rows as SavedRow[] | undefined)?.[0] as SavedRow | undefined;
      if (!row || row.content_key !== contentKey || bodyOf(row) !== body || !row.updated_at) throw new Error('The saved wording could not be confirmed. Reload saved status before trying again.');
      setSaved(row); setHistoryId(published?.id ?? row.id); setBaseline(body); localEdits.delete(contentKey); setStatus('Draft saved. The published passage has not changed.');
    } catch (reason) { setError(passageError(reason, 'Save failed. Your edits are still here.')); }
    finally { setBusy(false); }
  }
  async function publish() {
    if (!saved || dirty || !rendered) return;
    setBusy(true); setError('');
    try {
      const result = await requestStudioJson('/api/admin/generated-content', secret, { method: 'PATCH', body: JSON.stringify({ id: saved.id, expectedUpdatedAt: saved.updated_at, ownerAction: 'approve-package-revision' }) });
      const row = (result.rows as SavedRow[] | undefined)?.[0] as SavedRow | undefined;
      if (!row || row.status !== 'LIVE' || row.content_key !== contentKey || bodyOf(row) !== body) throw new Error('Publication could not be confirmed. Reload saved status before trying again.');
      await refreshContentPublications(true);
      setSources(current => [...current.filter(source => source.content_key !== contentKey), row]);
      setPublished(row); setSaved(row); setHistoryId(row.id); setStatus(sharedMoon ? 'Published. Calendar readings that select this shared transition use the new wording.' : 'Published. The Calendar uses this passage.'); announceContentUpdate({ contentKey, published: true, updatedAt: new Date().toISOString() });
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Publication failed. The saved draft is retained.'); }
    finally { setBusy(false); }
  }
  async function resetToShared() {
    if (!published) return;
    setBusy(true); setError('');
    try {
      await requestStudioJson('/api/admin/content-publication', secret, { method: 'POST', body: JSON.stringify({ action: 'retire', id: published.id, contentKey, expectedUpdatedAt: published.updated_at }) });
      setStatus('This date now uses the shared template. Its earlier wording remains in history.'); setPublished(undefined); announceContentUpdate({ contentKey, published: false, updatedAt: new Date().toISOString() }); setAttempt(value => value + 1);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'The publication could not be changed.'); }
    finally { setBusy(false); }
  }
  return <section className="admin-template-reader-drilldown studio-surface" aria-label="Assembled Calendar passage">
    <header className="admin-section-heading-row"><div><h3>Complete passage</h3><p>Edit your passage and check the reader preview for the selected date.</p></div></header>
    {readerEntry && <p className="admin-field-hint">Passage context · {readerEntry.date} · {readerEntry.timeZone}. Your existing saved draft opens first.</p>}
    <div className="admin-daily-glance-context-form">
      <label><span>Date</span><StudioInput type="date" aria-label="Passage date" value={date} disabled={busy || dirty} onChange={event => setDate(event.target.value)} /></label>
      <label><span>Time zone</span><StudioInput aria-label="Passage time zone" value={timeZone} disabled={busy || dirty} onChange={event => setTimeZone(event.target.value)} /></label>
      {period === 'daily' && <label><span>Editing passage</span><AdminSelect aria-label="Calendar editing passage" value={target} disabled={busy || dirty} onChange={event => setTarget(event.target.value)}><option value="overview">Daily overview</option><option value="moon">Moon transition passage</option></AdminSelect></label>}
      <label><span>Editing scope</span><AdminSelect aria-label="Passage editing scope" value={scope} disabled={busy || dirty} onChange={event => setScope(event.target.value)}><option value="date">This {period === 'daily' ? 'date' : period === 'weekly' ? 'week' : 'month'} only</option><option value="shared">{target === 'moon' && period === 'daily' ? 'Shared Moon transition · all matching readings' : 'Shared template · all dates'}</option></AdminSelect></label>
    </div>
    <div className="admin-new-actions"><StudioButton disabled={busy || dirty || !date} onClick={() => { setRequested({ date, timeZone }); setAttempt(value => value + 1); }}>Load passage</StudioButton><StudioButton disabled={busy || dirty} onClick={() => setAttempt(value => value + 1)}>Reload saved status</StudioButton></div>
    {!ready && <><p role="status" aria-label="Calendar save status">{selectionPending ? 'Choose Load passage to open the selected date and time zone.' : status}</p>{error && <p role="alert">{error}</p>}</>}
    {sourceEditor}
    {ready && <>
      {period === 'daily' && <div className="studio-variable-description studio-context-panel" aria-label="Calendar editing source">
        <p><strong>{target === 'moon' ? 'Moon transition passage' : 'Daily overview'} · {scope === 'date' ? 'Date-only edit' : 'Shared edit'}</strong></p>
        <p>{scope === 'date' ? `Editing the complete passage for ${requested.date} in ${requested.timeZone}. Other dates keep their writing.`
          : sharedMoon ? 'Editing the shared transition wording. It is used wherever the Calendar selects this Moon-sign pair.' : 'Editing the shared daily template. It is used on dates without a valid date-only passage.'}</p>
        {scope === 'date' && target === 'moon' && <p>{/\{\{\s*#\s*moonWriteup\s*\}\}/u.test(body) ? 'The Moon section is selected below. Saving preserves the complete daily passage, including its Sun section.' : 'This saved passage has no separate Moon section. Edit its complete wording below; saving affects this date only.'}</p>}
      </div>}
      {(sourcesChanged || sourceChanges && sourceChanges.length > 0) && <p role="note">Shared writing has changed since this passage was loaded or saved. Your wording has been preserved. {sourcesChanged ? 'Save your draft and reload the sources before publishing.' : 'Review the assembled preview before publishing.'}</p>}
      <CalendarPassageTemplateEditor key={loaded} ref={templateEditor} value={body} onChange={setBody} disabled={busy} values={values} label={scope === 'date' ? `This ${period === 'daily' ? 'date' : period === 'weekly' ? 'week' : 'month'} only` : sharedMoon ? 'Shared Moon transition' : 'Shared template · all dates'}
        sharedWording={scope === 'shared' && !sharedMoon ? names => <div aria-label="Shared passage wording" className="studio-section">
          <p>Edit the saved wording below. Each source is shared by all dates that use it. Signs, dates, and event times stay calculated.</p>
          {[...new Set(names)].filter(name => values[name]?.kind === 'copy').map(name => {
            const value = values[name];
            const editable = calendarSharedPassageSources(value, sourceValues[name], content, sources);
            return <div key={name} className="studio-context-panel" role="group" aria-label={`Shared ${variableLabel(name)} wording`}>
              <p><strong>{variableLabel(name)}</strong></p>
              <div className="studio-preview-canvas"><CalendarPassageProse text={value.text} /></div>
              <div className="admin-new-actions">{editable.map(row => <StudioButton key={row.id} data-calendar-source-key={row.content_key} disabled={busy || dirty} onClick={() => { setSelectedSourceKey(row.content_key); onEditSource(row); }}>
                Edit {lunarContentIdentity(row.content_key)?.title ?? row.headline ?? variableLabel(name)}
              </StudioButton>)}</div>
              {!editable.length && <p>No editable saved source is available for this wording. Calculated wording stays in the Calendar assembly.</p>}
            </div>;
          })}
          {!names.some(name => values[name]?.kind === 'copy') && <p>This section contains its wording directly. Open Template structure to edit it and keep its calculated variables.</p>}
        </div> : undefined}
        workspace={period === 'daily' && publishedReading && draftReading ? {
          date: requested.date, timeZone: requested.timeZone, literal: sharedMoon, template: scope === 'shared' && !sharedMoon, preferredSection: target === 'moon' && !sharedMoon ? 'moonWriteup' : undefined,
          reader: <CalendarPassageReaderPreview date={requested.date} timeZone={requested.timeZone} published={publishedReading} draft={draftReading} scope={scope} sourceKey={sourceDraftChanged && editingSource ? editingSource.contentKey : contentKey} saved={sourceDraftChanged ? sourceDraftSaved : Boolean(saved?.status === 'DRAFT' && !saved.id.startsWith('package:'))} publishedSource={saved?.status === 'LIVE'} dirty={dirty || sourceDraftChanged && !sourceDraftSaved} invalid={previewIssues} />,
          source: name => { const value = values[name]; const publishedSource = value?.sourceKey ? content.get(value.sourceKey) : undefined; const source = sources.find(row => row.id === publishedSource?.id); return <>
            {value?.kind === 'fact' ? <p>Source: Swiss Ephemeris calculation for {requested.date} · {requested.timeZone}.</p> : value?.sourceKey ? <p>Source: <code>{value.sourceKey}</code></p> : <p>Source: Calendar assembly for the selected date.</p>}
            {publishedSource?.updatedAt && <p>Published source version: {publishedSource.updatedAt}</p>}
            {source && <StudioButton disabled={dirty || busy} onClick={() => onEditSource(source)}>Open shared source for {variableLabel(name)}</StudioButton>}
            {name === 'moonWriteup' && transitionKey && <p>Transition source for this sign pair: <code>{transitionKey}</code>. The Calendar chooses this source only when its transition rules apply.</p>}
          </>; }
        } : undefined}
        actions={<>
          <div className="admin-new-actions"><StudioButton className="admin-primary-button" disabled={busy || !body.trim() || !dirty && Boolean(saved)} onClick={() => void save()}>Save draft</StudioButton><StudioButton disabled={busy || dirty || !saved || saved.id.startsWith('package:') || saved.status === 'LIVE' || !rendered || sourcesChanged} onClick={() => void publish()}>Publish passage</StudioButton>
            <a className="admin-source-action" href={`/?date=${requested.date}#calendar?view=${period === 'daily' ? 'day' : period === 'weekly' ? 'weekly' : 'month'}&date=${requested.date}`} target="_blank" rel="noreferrer">Open published Calendar</a>
            {dirty && <StudioButton disabled={busy} onClick={() => { setBody(baseline); setError(''); localEdits.delete(contentKey); }}>Discard unsaved changes</StudioButton>}
          </div>
        <p role="status" aria-label="Calendar save status">{status}{dirty ? ' Unsaved changes. Save or discard them before switching dates.' : ''}</p>
        {error && <p role="alert">{error}</p>}
        </>} />
      <details className="admin-workspace-details"><AdminDisclosureSummary>{moonTiming ? 'Source and Moon timing' : 'Source details'}</AdminDisclosureSummary>
      <p>Editing source: <code>{contentKey}</code></p>
      {moonTiming && <div className="studio-variable-description studio-context-panel" role="group" aria-label="Moon timing for selected day">
        <p>{values.date?.text} · {moonTiming.timeZone}</p>
        <dl className="studio-detail-list">{[
          ['Day starts in:', moonTiming.startingSign], ['Change today:', moonTiming.change],
          ...(moonTiming.nextChange ? [['Next change:', moonTiming.nextChange]] : []),
          ['Reader Moon sign at noon:', moonTiming.readerSign],
        ].map(([label, value]) => <div key={label}><dt>{label}</dt>{' '}<dd>{value}</dd></div>)}</dl>
        <p className="admin-field-hint">The reader’s Moon sign uses the noon position. Exact New and Full Moon headings use the lunation sign. The Moon passage follows this day’s selected writing.</p>
      </div>}
      </details>
      {period !== 'daily' && <div className="admin-template-reader-surface"><div className="admin-template-reader-copy" aria-label="Assembled passage preview">
        {rendered ? <CalendarPassageProse text={rendered} /> : <p role="status">{errors.join(' ') || 'A required source or variable is unavailable for this date. Check Sources and variables before publishing.'}</p>}
      </div></div>}
      <details className="admin-workspace-details"><AdminDisclosureSummary>Sources and variables</AdminDisclosureSummary>
      <div className="admin-new-actions">
        {scope === 'date' && <StudioButton disabled={busy} onClick={() => setBody(calendarEditablePassage(body, values))}>Expand shared writing for this date</StudioButton>}
      </div>
      <p className="admin-field-hint">Named variables keep dates, signs, and event times calculated. Editing a shared source affects every passage that uses it; expanding the writing here changes only this dated edition.</p>
      <div className="admin-editor-guidance"><p>Insert a variable or open its shared writing. The preview above uses the same assembly as the Calendar.</p>
        <div className="admin-data-table-scroll"><table className="admin-data-table"><thead><tr><th>Variable</th><th>Value preview</th><th>Action</th></tr></thead><tbody>{Object.entries(values).map(([name, value]) => <tr key={name}><td data-label="Variable">{variableLabel(name)}<br /><code data-variable-name={name} data-variable-color={calendarVariableColor(name)}>{`{{${name}}}`}</code><small className="admin-field-hint">{calendarVariableKind(name, value)}</small></td><td data-label="Value preview">{value.text}{calendarPassageVariableHelp(name) && <p className="admin-field-hint">{calendarPassageVariableHelp(name)}</p>}</td><td data-label="Action"><StudioButton disabled={sharedMoon} onClick={() => templateEditor.current?.insertVariable(name)}>{isConditionVariable(name) ? `Use ${variableLabel(name)} condition` : `Insert ${variableLabel(name)}`}</StudioButton>{value.sourceKey && sources.find(row => row.content_key === value.sourceKey) && <StudioButton onClick={() => onEditSource(sources.find(row => row.content_key === value.sourceKey)!)}>Edit shared {name}</StudioButton>}</td></tr>)}</tbody></table></div>
        {usedSources.length > 0 && <div className="admin-new-actions">{usedSources.map(row => <StudioButton key={row.id} onClick={() => onEditSource(row)}>Edit {lunarContentIdentity(row.content_key)?.title ?? "shared source"}</StudioButton>)}</div>}
        <a className="admin-source-action" href="#calendar-writeups?view=moon-transition-phrases">Edit Moon transition and timing templates</a>
      </div>
      </details>
      <details className="admin-workspace-details"><AdminDisclosureSummary>Publication and history</AdminDisclosureSummary>
            {scope === 'date' && published && <StudioButton disabled={busy || dirty} onClick={() => void resetToShared()}>Use shared template for this date</StudioButton>}
            {historyId && <StudioButton disabled={busy} onClick={() => void requestStudioJson(`/api/admin/content-history?id=${encodeURIComponent(historyId)}`, secret).then(result => setHistory((result.versions ?? []) as any[])).catch(reason => setError(reason.message))}>Version history</StudioButton>}
      {history && <details open><summary>Saved versions</summary>{history.length ? history.map((version, index) => <details key={version.versionId ?? index}><summary>{version.rowUpdatedAt} · {version.row?.status}</summary><CalendarPassageProse text={bodyOf(version.row) || ''} /></details>) : <p>No earlier saved versions.</p>}</details>}
      </details>
    </>}
  </section>;
}
