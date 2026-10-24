import { useState } from 'react';
import { CalendarPassageProse } from '../../../src/shared/features/calendar/CalendarPassageProse';
import { AdminDisclosureSummary } from './AdminNativeControls';
import { StudioButton, StudioStatusBadge } from './StudioControls';
import type { calendarWorkspaceReading } from './calendarPassageWorkspace';

type Reading = ReturnType<typeof calendarWorkspaceReading>;
export default function CalendarPassageReaderPreview({ date, timeZone, published, draft, scope, sourceKey, saved, publishedSource, dirty, invalid }: {
  date: string; timeZone: string; published: Reading; draft: Reading; scope: string; sourceKey: string;
  saved: boolean; publishedSource: boolean; dirty: boolean; invalid: string[];
}) {
  const [view, setView] = useState<'published' | 'draft'>('published');
  const current = view === 'published' ? published : draft;
  const overviewUnchanged = published.body === draft.body;
  const transitionUnchanged = published.transition?.body === draft.transition?.body;
  const unchanged = overviewUnchanged && transitionUnchanged;
  return <section className="studio-section studio-workspace-pane" aria-label="Calendar reader workspace">
    <header className="admin-section-heading-row"><div><h3>Reader preview</h3><p>{date} · {timeZone}</p></div></header>
    <div className="admin-new-actions" role="group" aria-label="Calendar reader view">
      <StudioButton aria-pressed={view === 'published'} onClick={() => setView('published')}>Published</StudioButton>
      <StudioButton aria-pressed={view === 'draft'} onClick={() => setView('draft')}>Draft</StudioButton>
    </div>
    <p>{view === 'published' ? 'Published · what readers see for this date.' : `Draft · ${dirty ? 'includes unsaved wording' : saved ? 'saved unpublished wording' : publishedSource ? 'current published wording; no draft changes' : 'starting wording; not yet saved'}.`}</p>
    <div className="studio-variable-description studio-context-panel" aria-label="Calendar publication impact">
      <p><strong>{invalid.length ? 'Draft needs valid wording' : unchanged ? 'Reader wording unchanged' : 'Reader wording will change'}</strong></p>
      <details><AdminDisclosureSummary>What publishing will change</AdminDisclosureSummary>
      <p>{scope === 'date' ? `Date-only impact · ${date} in ${timeZone}. Publishing replaces the complete passage for this date.`
        : 'Shared impact · publishing changes every reading that selects this source, including other dates. Date-only passages take precedence for the daily overview. Moon event cards use their shared transition source.'}</p>
      {scope === 'shared' && published.sourceLabel === 'Date-only passage' && <p>The daily overview uses its date-only passage. Shared Moon transition edits can still change the Moon event card.</p>}
      </details>
      <p>{scope === 'date' ? `Date-only impact · ${date}` : 'Shared impact · all readings using this source'}</p>
      {[
        { label: 'Daily overview', unchanged: overviewUnchanged },
        { label: 'Moon event card', unchanged: transitionUnchanged },
      ].map(unit => <p key={unit.label} aria-label={`${unit.label} impact`}>
        {unit.label} · <StudioStatusBadge tone={invalid.length ? 'error' : unit.unchanged ? 'inactive' : 'ready'}>{invalid.length ? 'Cannot compare' : unit.unchanged ? 'Unchanged' : 'Changed'}</StudioStatusBadge>
      </p>)}
      {!invalid.length && !published.transition && !draft.transition && <p>No Moon event card on this date.</p>}
      {!invalid.length && unchanged && scope === 'shared' && published.sourceLabel !== 'Date-only passage' && <p>The Calendar selects other writing for this date, or this edit resolves to the same reader wording.</p>}
      {invalid.length > 0 && <p role="alert">{invalid.join(' ')} Save remains available; publishing is blocked.</p>}
    </div>
    <div className="admin-template-reader-surface"><div className="admin-template-reader-copy" aria-label="Assembled passage preview" aria-live="polite">
      <p><strong>{current.sourceLabel}</strong></p>
      {current.body && !(view === 'draft' && invalid.length) ? <CalendarPassageProse text={current.body} /> : <p role="status">No complete passage can be assembled for this date. Review missing values and conditions before publishing.</p>}
    </div></div>
    {current.transition && !(view === 'draft' && invalid.length) && <div className="admin-template-reader-surface"><div className="admin-template-reader-copy" aria-label="Moon transition reader passage">
      <p><strong>Moon transition · event card</strong></p>
      <CalendarPassageProse text={current.transition.body} />
    </div></div>}
    <details className="admin-workspace-details"><AdminDisclosureSummary>Reader source details</AdminDisclosureSummary>
      <p>Editing source: <code>{sourceKey}</code></p>
      {current.sourceKey && <p>Daily overview source: <code>{current.sourceKey}</code></p>}
      {current.transition && <p>Moon event source: <code>{current.transition.key}</code></p>}
    <p className="admin-field-hint">Both views use this date and time zone, the Calendar’s source selection, and its passage renderer. The daily overview and Moon event passage are shown separately. Draft simulates publishing only the source you are editing.</p>
    </details>
  </section>;
}
