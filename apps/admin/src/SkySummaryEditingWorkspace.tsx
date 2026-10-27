import { useEffect, useRef, useState } from 'react';
import { AdminDisclosureSummary, AdminSelect } from './AdminNativeControls';
import { StudioButton, StudioInput, StudioTextarea } from './StudioControls';
import { skyDailySummaryFields, skySummarySigns, skySummaryTemplateErrors, type SkySummaryField } from '../../web/src/content/skyDailySummaryCatalog';
import { skyDailySummaryParts, skySummaryParagraphs, type SkyDailySummaryFacts } from '../../web/src/content/skyDailySummary';
import { moonEventNames, type MoonSummaryKind } from '../../web/src/content/skyMoonSummary';
import { sunSeasonRuler } from '../../web/src/content/skySunSeason';
import { pairedSummarySign } from '../../web/src/content/skySummaryGeometry';
import { publishedSkySummaryContent, type SummaryCompositionRow } from './skySummaryComposition';

export type SummaryEditingState = { key: string; body: string; id?: string | null; status: string; dirty: boolean };
export type SummaryEditingActions = {
  editing: SummaryEditingState | null;
  active: boolean;
  error: string;
  onOpen: (field: SkySummaryField) => Promise<boolean>;
  onChange: (body: string) => void;
  onSave: () => Promise<boolean>;
  onPublish: () => Promise<boolean>;
};
const sections = [
  { id: 'opening', label: 'Opening', accepts: (f: SkySummaryField) => /\/assembly\/(opening|openingSameSign|sunOnly|moonOnly)$/u.test(f.key) },
  { id: 'sun', label: 'Sun wording', accepts: (f: SkySummaryField) => f.group === 'Sun summaries' },
  { id: 'moon', label: 'Moon wording', accepts: (f: SkySummaryField) => f.group === 'Moon summaries' },
  { id: 'events', label: 'Sign changes & stations', accepts: (f: SkySummaryField) => /\/assembly\/(ingresses|station)/u.test(f.key) },
  { id: 'aspects', label: 'Exact aspects', accepts: (f: SkySummaryField) => /\/assembly\/aspects/u.test(f.key) },
  { id: 'retrogrades', label: 'Retrogrades', accepts: (f: SkySummaryField) => /\/(assembly\/retrogrades|retrograde|singleRetrograde)$/u.test(f.key) },
  { id: 'timing', label: 'Moon & season timing', accepts: (f: SkySummaryField) => f.group === 'Timing and retrogrades' && !/\/(retrograde|singleRetrograde)$/u.test(f.key) || /\/assembly\/(sunIngress|lunation)/u.test(f.key) },
  { id: 'structure', label: 'Structure', accepts: (f: SkySummaryField) => f.key.endsWith('/assembly/layout') }
];
const sectionFields = (id: string) => skyDailySummaryFields.filter(f => f.readerEnabled !== false && sections.find(s => s.id === id)!.accepts(f));
const opening = skyDailySummaryFields.find(f => f.key.endsWith('/assembly/opening'))!;
const sourceScope = (field: SkySummaryField) => field.group === 'Sun summaries' ? 'Shared wording · Sky and Calendar Sun summary' : 'Shared wording · Sky Daily Summary';

export default function SkySummaryEditingWorkspace({ rows, busy, focusSunSummaries, actions }: {
  rows: SummaryCompositionRow[]; busy: boolean; focusSunSummaries: boolean; actions: SummaryEditingActions;
}) {
  const [section, setSection] = useState(focusSunSummaries ? 'sun' : 'opening');
  const [selected, setSelected] = useState(() => focusSunSummaries ? sectionFields('sun').find(f => f.key.endsWith('/virgo'))! : opening);
  const [loadFailed, setLoadFailed] = useState(false);
  const openingRequest = useRef(false);
  const [view, setView] = useState<'published' | 'draft'>('draft');
  const [review, setReview] = useState(false);
  const [sun, setSun] = useState('Virgo');
  const [moon, setMoon] = useState('Cancer');
  const [moonKind, setMoonKind] = useState<MoonSummaryKind>('regular');
  const [aspects, setAspects] = useState('');
  const [ingresses, setIngresses] = useState('');
  const [stations, setStations] = useState('');
  const [stationDirection, setStationDirection] = useState<'direct' | 'retrograde'>('retrograde');
  const [stationOccurred, setStationOccurred] = useState(true);
  const [retrogrades, setRetrogrades] = useState('');
  const [voidRemaining, setVoidRemaining] = useState('');
  const [lunation, setLunation] = useState('none');
  const current = actions.editing?.key === selected.key ? actions.editing : null;
  const errors = current ? skySummaryTemplateErrors(selected.key, current.body) : [];
  const ready = Boolean(current && actions.active && !busy);
  async function open(field: SkySummaryField, nextSection = section) {
    if (openingRequest.current) return;
    openingRequest.current = true;
    setLoadFailed(false);
    try { if (await actions.onOpen(field)) {
      setSelected(field); setSection(nextSection); setReview(false); setView('draft');
      const [, , , sign, kind] = field.key.split('/');
      if (field.group === 'Sun summaries') {
        setSun(skySummarySigns.find(value => value.toLowerCase() === sign)!);
        const ruler = sunSeasonRuler(sign);
        setRetrogrades(previous => [...previous.split(';').map(value => value.trim()).filter(value => value && value.toLowerCase() !== ruler),
          ...(field.key.endsWith('/ruler-retrograde') ? [ruler] : [])].join('; '));
      }
      if (field.group === 'Moon summaries') {
        const nextMoon = skySummarySigns.find(value => value.toLowerCase() === sign)!;
        setMoon(nextMoon); setMoonKind(kind as MoonSummaryKind);
        if (kind !== 'regular') setSun(pairedSummarySign(nextMoon, kind as MoonSummaryKind));
      }
    } else setLoadFailed(!current);
    } finally { openingRequest.current = false; }
  }
  useEffect(() => {
    if (!actions.active || busy || current || loadFailed || openingRequest.current) return;
    void open(selected);
  }, [actions.active, busy, actions.editing, loadFailed]);

  const published = publishedSkySummaryContent(rows);
  const working = new Map(published);
  if (current && !errors.length) working.set(selected.key, { id: current.id ?? selected.key, contentKey: selected.key,
    surface: 'sky', mode: 'feed', eventType: null, targetDate: null, headline: null, summary: null, body: current.body,
    sections: null, model: null, updatedAt: '', status: 'LIVE' });
  const exampleEvents = (text: string, prefix: string) => text.split(';').map(label => label.trim()).filter(Boolean).map((label, i) => ({ id: `${prefix}-${i}`, label }));
  // These are explicitly labelled editor examples, never reader calculation inputs.
  const exampleTime = Date.now();
  const now = new Date(exampleTime).toISOString();
  const facts: SkyDailySummaryFacts = {
    sun: { sign: sun }, moon: { sign: moon }, moonIsVoid: Boolean(voidRemaining.trim()), voidRemainingLabel: voidRemaining,
    asOf: now, retrogradePlanets: retrogrades.split(';').map(s => s.trim()).filter(Boolean),
    exactAspects: exampleEvents(aspects, 'aspect'), ingresses: exampleEvents(ingresses, 'ingress'),
    stations: exampleEvents(stations, 'station').map(event => ({ ...event, direction: stationDirection,
      planet: event.label.match(new RegExp(`^(.+?) stations ${stationDirection} in `, 'u'))?.[1], startsAt: new Date(exampleTime + (stationOccurred ? -60_000 : 60_000)).toISOString() })),
    event: moonKind !== 'regular' ? { name: moonEventNames[moonKind], sign: moon, countdown: 'today', isToday: true,
      eclipseType: moonKind === 'solarEclipse' ? 'solar' : moonKind === 'lunarEclipse' ? 'lunar' : undefined }
      : lunation === 'none' ? undefined : { name: 'New Moon', sign: sun, countdown: 'in 3 days', isToday: lunation === 'today' }
  };
  const publishedParts = skyDailySummaryParts(facts, published);
  const draftParts = skyDailySummaryParts(facts, working, { editorialPreviewKeys: current && !errors.length ? [selected.key] : [] });
  const unchanged = publishedParts.map(p => p.text).join('') === draftParts.map(p => p.text).join('');
  const parts = view === 'published' ? publishedParts : draftParts;
  function change(body: string) { actions.onChange(body); setReview(false); setView('draft'); }
  const eventOrder = current ? [...current.body.matchAll(/\{(exactAspectsSentence|stationsSentence|ingressesSentence)\}/gu)].map(match => match[1]) : [];
  function moveEvent(slot: string, offset: number) {
    const other = eventOrder[eventOrder.indexOf(slot) + offset];
    if (current && other) change(current.body.replace(`{${slot}}`, '\u0000').replace(`{${other}}`, `{${slot}}`).replace('\u0000', `{${other}}`));
  }
  return <section className="admin-summary-editing-workspace" aria-label="Summary editing workspace">
    <nav className="admin-summary-section-nav" aria-label="Summary sections">
      {sections.map(item => <StudioButton key={item.id} aria-pressed={section === item.id} disabled={busy}
        onClick={() => void open(sectionFields(item.id)[0], item.id)}>{item.label}</StudioButton>)}
    </nav>
    <div className="admin-summary-editing-columns">
      <section className="admin-summary-wording" aria-label="Selected summary wording">
        <label><span>Wording</span><AdminSelect aria-label="Summary wording" disabled={busy}
          value={selected.key} onChange={event => void open(skyDailySummaryFields.find(f => f.key === event.target.value)!)}>
          {sectionFields(section).map(field => <option key={field.key} value={field.key}>{field.label}</option>)}
        </AdminSelect></label>
        <p className="admin-field-hint">{sourceScope(selected)}</p>
        {current ? <>
          <label><span>Edit wording</span><StudioTextarea aria-label="Summary wording text" rows={9} disabled={!ready}
            value={current.body} onChange={event => change(event.target.value)} /></label>
          {section === 'structure' && <details className="admin-workspace-details"><AdminDisclosureSummary>Paragraphs and event order</AdminDisclosureSummary>
            <p>Blank lines start paragraphs. Keep the opening; event sections without matching facts are omitted.</p>
            {(['ingressesSentence', 'stationsSentence', 'exactAspectsSentence'] as const).map(slot => <div key={slot} className="admin-summary-save-actions">
              <StudioButton disabled={!ready} aria-pressed={eventOrder.includes(slot)} onClick={() => change(eventOrder.includes(slot) ? current.body.replace(`{${slot}}`, '') : `${current.body}\n\n{${slot}}`)}>{slot === 'ingressesSentence' ? 'Ingresses' : slot === 'stationsSentence' ? 'Stations' : 'Exact aspects'}: {eventOrder.includes(slot) ? 'Included' : 'Omitted'}</StudioButton>
              <StudioButton disabled={!ready || eventOrder.indexOf(slot) <= 0} aria-label={`Move ${slot} earlier`} onClick={() => moveEvent(slot, -1)}>Earlier</StudioButton>
              <StudioButton disabled={!ready || !eventOrder.includes(slot) || eventOrder.indexOf(slot) === eventOrder.length - 1} aria-label={`Move ${slot} later`} onClick={() => moveEvent(slot, 1)}>Later</StudioButton>
            </div>)}
          </details>}
          {errors.length > 0 && <div role="alert">{errors.map(error => <p key={error}>{error}</p>)}</div>}
          <div className="admin-summary-save-actions">
            <StudioButton className="admin-primary-button" disabled={!ready || errors.length > 0 || Boolean(current.id && !current.dirty)} onClick={() => void actions.onSave()}>Save draft</StudioButton>
            <StudioButton disabled={!ready || errors.length > 0 || !current.id || current.dirty || current.status === 'LIVE'}
              onClick={() => { setReview(true); setView('draft'); }}>Review &amp; publish</StudioButton>
          </div>
          <p role="status">{busy ? 'Working…' : current.dirty ? 'Unsaved changes' : current.status === 'LIVE' ? 'Published wording' : current.id ? 'Draft saved · not published' : 'Built-in wording · no saved draft'}</p>
          {review && <section className="admin-summary-publication-review" aria-label="Review summary publication">
            <h4>Review shared wording</h4>
            <p>Publishing replaces this shared wording on every matching date. Check the Draft preview and compare Published before continuing.</p>
            <p>{sourceScope(selected)}</p>
            <StudioButton disabled={!ready || current.dirty || errors.length > 0} onClick={() => void actions.onPublish().then(saved => { if (saved) { setReview(false); setView('published'); } })}>Publish shared wording</StudioButton>
            <StudioButton disabled={busy} onClick={() => setReview(false)}>Back to editing</StudioButton>
          </section>}
        </> : <div role="status">{loadFailed ? 'The wording could not load. Your existing work is kept.' : 'Loading wording…'}
          {loadFailed && <StudioButton disabled={busy} onClick={() => void open(selected)}>Retry wording</StudioButton>}</div>}
        {actions.error && <p role="alert">{actions.error}</p>}
        <details className="admin-workspace-details"><AdminDisclosureSummary>Variables and source</AdminDisclosureSummary>
          <p>{selected.allowedSlots.length ? `Available variables: ${selected.allowedSlots.map(slot => `{${slot}}`).join(', ')}. The preview uses the example facts to resolve them.` : 'This passage uses your complete wording without calculated variables.'}</p>
          <code>{selected.key}</code>
        </details>
      </section>
      <section className="admin-summary-reader" aria-label="Summary reader preview">
        <h4>Reader preview</h4>
        <div className="admin-summary-preview-views" aria-label="Summary preview views">
          <StudioButton aria-pressed={view === 'published'} onClick={() => setView('published')}>Published</StudioButton>
          <StudioButton aria-pressed={view === 'draft'} onClick={() => setView('draft')}>Draft</StudioButton>
        </div>
        <p className="admin-field-hint">Example facts · Sun in {sun} · {moonEventNames[moonKind]} in {moon}</p>
        <p role="status">{view === 'published' ? 'Published wording with example facts' : errors.length ? 'Fix the wording errors to preview this draft.' : unchanged ? 'Reader wording unchanged for these example facts' : 'Draft preview · not published'}</p>
        {view === 'draft' && errors.length ? null : <div className="admin-template-reader-copy" aria-label="Summary preview passage">
          {skySummaryParagraphs(parts).map((paragraph, i) => <p key={i}>{paragraph.map(part => part.text).join('')}</p>)}
        </div>}
        {view === 'draft' && current?.dirty && unchanged && !errors.length && <p className="admin-field-hint">This wording may apply to a different example. Change the example facts to check that case.</p>}
        <details className="admin-workspace-details"><AdminDisclosureSummary>Change example facts</AdminDisclosureSummary>
          <div className="admin-summary-example-fields">
            <label><span>Sun sign</span><AdminSelect aria-label="Preview Sun sign" value={sun} onChange={e => { setSun(e.target.value); if (moonKind !== 'regular') setMoon(pairedSummarySign(e.target.value, moonKind)); }}>{skySummarySigns.map(s => <option key={s}>{s}</option>)}</AdminSelect></label>
            <label><span>Moon sign</span><AdminSelect aria-label="Preview Moon sign" value={moon} onChange={e => { setMoon(e.target.value); if (moonKind !== 'regular') setSun(pairedSummarySign(e.target.value, moonKind)); }}>{skySummarySigns.map(s => <option key={s}>{s}</option>)}</AdminSelect></label>
            <label><span>Moon event</span><AdminSelect aria-label="Preview Moon event" value={moonKind} onChange={e => { const kind = e.target.value as MoonSummaryKind; setMoonKind(kind); if (kind !== 'regular') setMoon(pairedSummarySign(sun, kind)); }}>{Object.entries(moonEventNames).map(([kind, label]) => <option key={kind} value={kind}>{label}</option>)}</AdminSelect></label>
            <label><span>Exact aspects</span><StudioInput aria-label="Preview aspect examples" value={aspects} onChange={e => setAspects(e.target.value)} /></label>
            <label><span>Sign changes</span><StudioInput aria-label="Preview ingress examples" value={ingresses} onChange={e => setIngresses(e.target.value)} /></label>
            <label><span>Stations</span><StudioInput aria-label="Preview station examples" value={stations} onChange={e => setStations(e.target.value)} /></label>
            <label><span>Station direction</span><AdminSelect aria-label="Preview station direction" value={stationDirection} onChange={e => setStationDirection(e.target.value as 'direct' | 'retrograde')}><option value="retrograde">Retrograde</option><option value="direct">Direct</option></AdminSelect></label>
            <label><span>Station has occurred</span><StudioInput type="checkbox" aria-label="Preview station has occurred" checked={stationOccurred} onChange={e => setStationOccurred(e.target.checked)} /></label>
            <label><span>Retrograde planets</span><StudioInput aria-label="Preview retrograde examples" value={retrogrades} onChange={e => setRetrogrades(e.target.value)} /></label>
            <label><span>Void of course remaining</span><StudioInput aria-label="Preview void remaining" value={voidRemaining} onChange={e => setVoidRemaining(e.target.value)} /></label>
            <label><span>Upcoming lunation</span><AdminSelect aria-label="Preview upcoming lunation" value={lunation} onChange={e => setLunation(e.target.value)}><option value="none">None</option><option value="today">Today</option><option value="future">In 3 days</option></AdminSelect></label>
          </div>
          <p className="admin-field-hint">Examples test wording, not today's calculated sky. Separate multiple events with semicolons.</p>
        </details>
      </section>
    </div>
  </section>;
}
