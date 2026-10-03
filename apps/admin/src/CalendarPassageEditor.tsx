import { CalendarPassageProse } from '../../web/src/features/calendar/CalendarPassageProse';
import { lunarContentIdentity } from './lunarCalendarContent';
import { useEffect, useMemo, useState } from 'react';
import { StudioButton, StudioInput } from './StudioControls';
import CalendarPassageTemplateEditor from './CalendarPassageTemplateEditor';
import { calendarVariableColor } from './calendarOverviewTemplate';
import { AdminSelect } from './AdminNativeControls';
import { calculateCalendarPreview, type CalendarPreviewCalculation } from './calendarPreviewCalculation';
import { calendarPreviewSourceKeys, type CalendarPreviewRow } from './calendarPreviewModel';
import { requestStudioJson, studioInventoryDocumentPath } from './generatedContentClient';
import { announceContentUpdate, subscribeToContentUpdates } from '../../web/src/services/contentUpdateSignal';
import { zonedDateTimeToUtc } from '../../web/src/services/timezones';
import { calendarLocalDateKey } from '../../web/src/features/calendar/calendarPhaseLabel';
import { calendarEventGeneratedContentKeys } from '../../web/src/features/calendar/calendarContentKeys';
import { calendarStudioMoonSources, publishedPassageSources } from './calendarPassageSources';
import { calendarPassageKey, calendarPassageRecord, renderCalendarPassage, calendarPassageErrors, type CalendarPassagePeriod } from '../../web/src/features/calendar/calendarPassageTemplates';
import { calendarPassageDate, calendarPeriodPassageValues, calendarEditablePassage } from '../../web/src/features/calendar/calendarPassageAssembly';
import { isContentRetired } from '../../web/src/content/contentPublicationState';
import { refreshContentPublications } from '../../web/src/services/contentPublications';
import type { SkyForecastPeriod } from './skyForecastTemplates';

const passageError = (reason: unknown, fallback: string) => reason instanceof Error && !reason.message.startsWith('/api/') ? reason.message : fallback;
const localEdits = new Map<string, string>();
type SavedRow = CalendarPreviewRow & { mode?: string; sections?: any; source_snapshot?: Record<string, any>; updated_at: string };
const bodyOf = (row?: SavedRow) => row?.sections?.packageDraft?.body_you ?? row?.sections?.packageRecord?.body_you ?? row?.body;
const defaultPattern = (period: CalendarPassagePeriod) => period === 'daily' ? '{{#sunSummary}}{{sunSummary}}{{/sunSummary}}\n\n{{#moonWriteup}}{{moonWriteup}}{{/moonWriteup}}'
  : period === 'monthly' ? '{{overview}}' : ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'].map(day => `{{#${day}Writeup}}{{${day}Date}}\n\n{{${day}Writeup}}{{/${day}Writeup}}`).join('\n\n');

export default function CalendarPassageEditor({ period: studioPeriod, loadRows, secret, onEditSource }: {
  period: SkyForecastPeriod; loadRows: (keys: string[]) => Promise<CalendarPreviewRow[]>; secret: string;
  onEditSource: (row: CalendarPreviewRow) => void;
}) {
  const period = studioPeriod.split('-')[0] as CalendarPassagePeriod;
  const [timeZone, setTimeZone] = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
  const [date, setDate] = useState(() => calendarLocalDateKey(new Date().toISOString(), timeZone));
  const [requested, setRequested] = useState({ date, timeZone });
  const [scope, setScope] = useState('date');
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
  const [baseline, setBaseline] = useState('');
  const [historyId, setHistoryId] = useState('');
  const [history, setHistory] = useState<any[] | null>(null);
  const [showSources, setShowSources] = useState(false);
  const [sourcesChanged, setSourcesChanged] = useState(false);
  const keyDate = calendarPassageDate(period, requested.date, calculation?.days ?? []);
  const contentKey = calendarPassageKey(period, scope === 'date' ? keyDate : undefined, requested.timeZone);
  const contextKey = `${studioPeriod}|${requested.date}|${requested.timeZone}|${attempt}`;
  const selectionPending = date !== requested.date || timeZone !== requested.timeZone;
  const ready = !selectionPending && loaded === `${contextKey}|${contentKey}`;
  const dirty = body !== baseline;
  const content = useMemo(() => publishedPassageSources(sources), [sources]);
  const values = useMemo(() => calculation ? calendarPeriodPassageValues(period, calculation, requested.date,
    new Map([[requested.date, calculation.sky]]), content, calendarStudioMoonSources(content)) : {}, [period, calculation, requested.date, content]);
  const rendered = ready ? renderCalendarPassage(body, values) : null;
  const errors = calendarPassageErrors(body);
  const savedSources = saved?.sections?.calendarPassageSources as Record<string, string> | undefined;
  const sourceChanges = savedSources && sources.filter(row => savedSources[row.content_key] && savedSources[row.content_key] !== row.updated_at);
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
      const keys = [...new Set([...calendarPreviewSourceKeys(studioPeriod, signs), ...result.events.flatMap(event => calendarEventGeneratedContentKeys(event)), contentKey, calendarPassageKey(period)])];
      const batches = Array.from({ length: Math.ceil(keys.length / 32) }, (_, index) => keys.slice(index * 32, (index + 1) * 32));
      const [rows, document] = await Promise.all([Promise.all(batches.map(async batch => {
          const params = new URLSearchParams({ status: 'all', visibility: 'all', limit: '200' });
          batch.forEach(key => params.append('contentKeys', key));
          const [response, packaged] = await Promise.all([
            requestStudioJson(`/api/admin/generated-content-inventory?${params}`, secret),
            requestStudioJson(`/api/admin/generated-content?${new URLSearchParams([...params].map(([key, value]) => [key, key === 'status' ? 'LIVE' : value]))}`, secret)
          ]);
          if (!Array.isArray(packaged.rows) || packaged.nextCursor || packaged.rows.some((row: SavedRow) => !batch.includes(row.content_key))) throw new Error('The published sources could not be verified. Reload before editing.');
          if (!Array.isArray(response.rows) || response.nextCursor || response.rows.some((row: SavedRow) => !batch.includes(row.content_key) || row.inventory_only)) throw new Error('The complete saved sources could not be verified. Reload before editing.');
          return [...response.rows, ...packaged.rows.filter((row: SavedRow) => row.id?.startsWith('package:'))] as CalendarPreviewRow[];
        })).then(result => result.flat()),
        requestStudioJson(studioInventoryDocumentPath(contentKey, { status: 'all', limit: 10 }), secret)]);
      if (!active) return;
      const editions = (document.rows ?? []) as SavedRow[];
      const live = isContentRetired(contentKey) ? undefined : editions.find(row => row.status === 'LIVE' && row.mode !== 'studio-draft');
      const proposal = editions.find(row => row.status === 'DRAFT' && row.mode === 'studio-draft') ?? editions.find(row => row.status === 'DRAFT') ?? live;
      const retiredTarget = !live ? editions.find(row => row.status === 'LIVE' && row.mode !== 'studio-draft') : undefined;
      const sourceContent = publishedPassageSources(rows);
      const shared = sourceContent.get(calendarPassageKey(period));
      const assembledValues = calendarPeriodPassageValues(period, result, requested.date, new Map([[requested.date, result.sky]]), sourceContent, calendarStudioMoonSources(sourceContent));
      const sharedPattern = shared?.body ?? defaultPattern(period);
      const pattern = bodyOf(proposal) ?? (scope === 'date' ? calendarEditablePassage(sharedPattern, assembledValues) : sharedPattern);
      setSourcesChanged(false); setCalculation(result); setSources(rows); setSaved(proposal ?? retiredTarget); setPublished(live); setHistoryId(live?.id ?? proposal?.id ?? editions[0]?.id ?? '');
      setBody(localEdits.get(contentKey) ?? pattern); setBaseline(pattern);
      setLoaded(`${contextKey}|${contentKey}`); setStatus(proposal ? proposal.status === 'LIVE' ? 'Published passage. Editing creates a separate draft.' : 'Saved draft. Readers still see the last published passage.' : period === 'monthly' && !shared && !assembledValues.overview ? 'No published monthly overview is available. Write a passage using the calculated variables below.' : 'Using the current shared writing. Nothing has been saved for this selection.');
    })().catch(reason => { if (active) { setError(passageError(reason, 'The passage could not load. Reload saved status to try again.')); setStatus(''); } });
    return () => { active = false; };
  }, [contextKey, contentKey, loadRows, secret]);
  useEffect(() => {
    if (!ready) return;
    if (dirty) localEdits.set(contentKey, body); else localEdits.delete(contentKey);
    const guard = (event: BeforeUnloadEvent) => { if (dirty) event.preventDefault(); };
    window.addEventListener('beforeunload', guard);
    return () => window.removeEventListener('beforeunload', guard);
  }, [body, baseline, ready, dirty, contentKey]);

  useEffect(() => subscribeToContentUpdates(notice => {
    if (notice.contentKey !== contentKey && sources.some(row => row.content_key === notice.contentKey)) setSourcesChanged(true);
  }), [contentKey, sources]);

  async function save() {
    setBusy(true); setError('');
    try {
      const record = saved?.sections?.packageRecord ?? calendarPassageRecord(contentKey, body);
      const proposal = { ...record, body, body_you: body };
      const sections = { ...(saved?.sections ?? {}), packageRecord: record, packageDraft: proposal, calendarPassageSources: sourceSnapshot };
      const payload = saved ? { id: saved.id, expectedUpdatedAt: saved.updated_at, sections }
        : { contentKey, surface: 'sky', mode: 'feed', eventType: 'calendar-passage', status: 'DRAFT', lane: 'reference', headline: 'Calendar assembled passage', body,
          provider: 'tldrastro-fallback-architecture-v3', sections, sourceSnapshot: { sourcePackage: 'tldrastro-fallback-architecture-v3', content_role: 'full_copy', review_status: 'needs_review' } };
      const result = await requestStudioJson('/api/admin/generated-content', secret, { method: saved ? 'PATCH' : 'POST', body: JSON.stringify(payload) });
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
      setPublished(row); setSaved(row); setHistoryId(row.id); setStatus('Published. The Calendar uses this passage.'); announceContentUpdate({ contentKey, published: true, updatedAt: new Date().toISOString() });
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
    <header className="admin-section-heading-row"><div><h3>Complete passage</h3><p>Choose a date to read the assembled writing, edit its wording, and publish it to the Calendar.</p></div></header>
    <div className="admin-daily-glance-context-form">
      <label><span>Date</span><StudioInput type="date" aria-label="Passage date" value={date} disabled={busy || dirty} onChange={event => setDate(event.target.value)} /></label>
      <label><span>Time zone</span><StudioInput aria-label="Passage time zone" value={timeZone} disabled={busy || dirty} onChange={event => setTimeZone(event.target.value)} /></label>
      <label><span>Editing scope</span><AdminSelect aria-label="Passage editing scope" value={scope} disabled={busy || dirty} onChange={event => setScope(event.target.value)}><option value="date">This {period === 'daily' ? 'date' : period === 'weekly' ? 'week' : 'month'} only</option><option value="shared">Shared template · all dates</option></AdminSelect></label>
    </div>
    <div className="admin-new-actions"><StudioButton disabled={busy || dirty || !date} onClick={() => { setRequested({ date, timeZone }); setAttempt(value => value + 1); }}>Load passage</StudioButton><StudioButton disabled={busy || dirty} onClick={() => setAttempt(value => value + 1)}>Reload saved status</StudioButton></div>
    {!ready && <><p role="status">{selectionPending ? 'Choose Load passage to open the selected date and time zone.' : status}</p>{error && <p role="alert">{error}</p>}</>}
    {ready && <>
      {(sourcesChanged || sourceChanges && sourceChanges.length > 0) && <p role="note">Shared writing has changed since this passage was loaded or saved. Your wording has been preserved. {sourcesChanged ? 'Save your draft and reload the sources before publishing.' : 'Review the assembled preview before publishing.'}</p>}
      <CalendarPassageTemplateEditor value={body} onChange={setBody} disabled={busy} values={values} label={scope === 'date' ? `This ${period === 'daily' ? 'date' : period === 'weekly' ? 'week' : 'month'} only` : 'Shared template · all dates'}
        actions={<>
          <div className="admin-new-actions"><StudioButton className="admin-primary-button" disabled={busy || !body.trim() || !dirty && Boolean(saved)} onClick={() => void save()}>Save draft</StudioButton><StudioButton disabled={busy || dirty || !saved || saved.status === 'LIVE' || !rendered || sourcesChanged} onClick={() => void publish()}>Publish passage</StudioButton>
            <a className="admin-source-action" href={`/?date=${requested.date}#calendar?view=${period === 'daily' ? 'day' : period === 'weekly' ? 'weekly' : 'month'}&date=${requested.date}`} target="_blank" rel="noreferrer">Open published Calendar</a>
            {scope === 'date' && published && <StudioButton disabled={busy || dirty} onClick={() => void resetToShared()}>Use shared template for this date</StudioButton>}
            {historyId && <StudioButton disabled={busy} onClick={() => void requestStudioJson(`/api/admin/content-history?id=${encodeURIComponent(historyId)}`, secret).then(result => setHistory((result.versions ?? []) as any[])).catch(reason => setError(reason.message))}>Version history</StudioButton>}
          </div>
        <p role="status">{status}{dirty ? ' Unsaved changes. Save or discard them before switching dates.' : ''}</p>
        {error && <p role="alert">{error}</p>}
        </>} />
      <div className="admin-new-actions">
        {scope === 'date' && <StudioButton disabled={busy} onClick={() => setBody(calendarEditablePassage(body, values))}>Expand shared writing for this date</StudioButton>}
        <StudioButton disabled={busy} onClick={() => setShowSources(value => !value)}>{showSources ? 'Hide sources and variables' : 'Sources and variables'}</StudioButton>
        {dirty && <StudioButton disabled={busy} onClick={() => { setBody(baseline); setError(''); localEdits.delete(contentKey); }}>Discard unsaved changes</StudioButton>}
      </div>
      <p className="admin-field-hint">Named variables keep dates, signs, and event times calculated. Editing a shared source affects every passage that uses it; expanding the writing here changes only this dated edition.</p>
      <div className="admin-template-reader-surface"><div className="admin-template-reader-copy" aria-label="Assembled passage preview">
        {rendered ? <CalendarPassageProse text={rendered} /> : <p role="status">{errors.join(' ') || 'A required source or variable is unavailable for this date. Check Sources and variables before publishing.'}</p>}
      </div></div>
      {showSources && <div className="admin-editor-guidance"><p>Insert a variable or open its shared writing. The preview above uses the same assembly as the Calendar.</p>
        <div className="admin-data-table-scroll"><table className="admin-data-table"><thead><tr><th>Variable</th><th>Value preview</th><th>Action</th></tr></thead><tbody>{Object.entries(values).map(([name, value]) => <tr key={name}><td data-label="Variable"><code data-variable-name={name} data-variable-color={calendarVariableColor(name)}>{`{{${name}}}`}</code><small className="admin-field-hint">{value.kind === 'copy' ? 'Saved writing' : 'Calculated value'}</small></td><td data-label="Value preview">{value.text.slice(0, 180)}{value.text.length > 180 ? '…' : ''}</td><td data-label="Action"><StudioButton onClick={() => setBody(text => `${text}{{${name}}}`)}>Insert {name}</StudioButton>{value.sourceKey && sources.find(row => row.content_key === value.sourceKey) && <StudioButton onClick={() => onEditSource(sources.find(row => row.content_key === value.sourceKey)!)}>Edit shared {name}</StudioButton>}</td></tr>)}</tbody></table></div>
        {usedSources.length > 0 && <div className="admin-new-actions">{usedSources.map(row => <StudioButton key={row.id} onClick={() => onEditSource(row)}>Edit {lunarContentIdentity(row.content_key)?.title ?? "shared source"}</StudioButton>)}</div>}
        <a className="admin-source-action" href="#calendar-writeups?view=moon-transition-phrases">Edit Moon transition and timing templates</a>
      </div>}
      {history && <details open><summary>Saved versions</summary>{history.length ? history.map((version, index) => <details key={version.versionId ?? index}><summary>{version.rowUpdatedAt} · {version.row?.status}</summary><CalendarPassageProse text={bodyOf(version.row) || ''} /></details>) : <p>No earlier saved versions.</p>}</details>}
    </>}
  </section>;
}
