import { forwardRef, useEffect, useId, useImperativeHandle, useRef, useState, type ReactNode } from 'react';
import { calendarPassageVariables, calendarPassageErrors } from '../../../src/calendar-writing/passageContract';
import type { CalendarOverviewValue } from '../../../src/shared/features/calendar/calendarOverviewResolve';
import { calendarVariableColor } from './calendarOverviewTemplate';
import { AdminDisclosureSummary, AdminSelect } from './AdminNativeControls';
import { AssemblySections } from './AssemblySections';
import { calendarTemplateParts, moveCalendarSection, insertCalendarVariable } from './calendarPassageTemplateParts';
import { StudioButton, StudioInput, StudioTextarea } from './StudioControls';

import { calendarPassageVariableLabel as variableLabel, calendarPassageVariableHelp, variableMatches, calendarVariableKind, isConditionVariable } from './variablePresentation';

const labels: Record<string, string> = { sunSummary: 'Sun summary', moonWriteup: 'Moon passage', overview: 'Monthly overview' };
const sectionLabel = (name: string) => labels[name] ?? name.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, letter => letter.toUpperCase());

export type CalendarTemplateHandle = { insertVariable: (name: string) => void };
export default forwardRef<CalendarTemplateHandle, {
  value: string; onChange: (value: string) => void; disabled: boolean; label: string;
  values: Record<string, CalendarOverviewValue>; actions: ReactNode;
  workspace?: { reader: ReactNode; date: string; timeZone: string; literal?: boolean; preferredSection?: string;
    source: (name: string) => ReactNode };
}>(function CalendarPassageTemplateEditor({ value, onChange, disabled, label, values, actions, workspace }, ref) {
  const field = useRef<HTMLTextAreaElement>(null);
  const sectionField = useRef<HTMLTextAreaElement>(null);
  const hintId = useId();
  const sectionId = useId();
  const { parts, sections: parsedSections } = calendarTemplateParts(value);
  const sections = parsedSections.map((section, index) => ({ ...section, id: `${section.name}-${index}` }));
  const [activeId, setActiveId] = useState<string | null>(() => sections.find(section => section.name === workspace?.preferredSection)?.id ?? null);
  const [wholeTemplate, setWholeTemplate] = useState(false);
  const [colors, setColors] = useState(true);
  const [variable, setVariable] = useState('date');
  const [query, setQuery] = useState('');
  const [includeMissing, setIncludeMissing] = useState(false);
  const active = sections.find(section => section.id === activeId);
  useEffect(() => {
    if (!activeId) return;
    sectionField.current?.focus();
    sectionField.current?.scrollIntoView({ block: 'center', behavior: 'instant' });
  }, [activeId]);
  const names = [...new Set(parts.filter(part => part.name && !part.marker).map(part => part.name!))];
  const variables = calendarPassageVariables.filter(name => (includeMissing || values[name] || names.includes(name))
    && variableMatches(query, name, variableLabel(name), calendarVariableKind(name, values[name]), calendarPassageVariableHelp(name) ?? ''));
  const selectedVariable = variables.includes(variable) ? variable : variables[0] ?? '';
  const kind = (name: string) => !calendarPassageVariables.includes(name) ? 'Unknown variable' : !values[name] ? 'Unavailable for this date' : calendarVariableKind(name, values[name]);
  const openSection = (id: string) => {
    setActiveId(id); setWholeTemplate(false);
    if (id === activeId) sectionField.current?.focus();
  };
  const openTemplate = () => {
    setActiveId(null); setWholeTemplate(true);
    requestAnimationFrame(() => field.current?.focus());
  };
  const insertVariable = (name: string) => {
    if (disabled || !calendarPassageVariables.includes(name)) return;
    const target = active ? sectionField.current : field.current;
    const start = (active?.start ?? 0) + (target?.selectionStart ?? 0);
    const end = (active?.start ?? 0) + (target?.selectionEnd ?? 0);
    const inserted = insertCalendarVariable(value, name, start, end);
    onChange(inserted.value);
    requestAnimationFrame(() => {
      target?.focus();
      target?.setSelectionRange(inserted.start - (active?.start ?? 0), inserted.end - (active?.start ?? 0));
    });
  };
  useImperativeHandle(ref, () => ({ insertVariable }));
  const invalid = calendarPassageErrors(value).length > 0;
  const roots = sections.filter(section => section.depth === 0);
  const picker = <div className="studio-section" role="group" aria-label="Passage variable picker">
      <label><span>Find a variable</span><StudioInput type="search" aria-label="Find passage variable" placeholder="Name, meaning, or token" value={query} onChange={event => setQuery(event.target.value)} /></label>
      <label className="studio-contained-toggle"><StudioInput type="checkbox" checked={includeMissing} onChange={event => setIncludeMissing(event.target.checked)} />Include unavailable variables</label>
      <div className="admin-new-actions">
        <label><span>Insert into {active ? sectionLabel(active.name) : 'complete template'}</span><AdminSelect aria-label="Passage variable" value={selectedVariable} disabled={disabled || !variables.length} onChange={event => setVariable(event.target.value)}>
          {['Saved writing', 'Calculated value', 'Condition', 'Example value'].map(group => {
            const choices = variables.filter(name => calendarVariableKind(name, values[name]) === group);
            return choices.length > 0 && <optgroup key={group} label={group}>{choices.map(name => <option key={name} value={name}>{variableLabel(name)} · {`{{${name}}}`}{!values[name] ? ' · Unavailable' : ''}</option>)}</optgroup>;
          })}
        </AdminSelect></label>
        <StudioButton disabled={disabled || !selectedVariable} onClick={() => insertVariable(selectedVariable)}>{isConditionVariable(selectedVariable) ? 'Wrap selection in condition' : 'Insert variable at cursor'}</StudioButton>
        {query && <StudioButton onClick={() => setQuery('')}>Clear variable search</StudioButton>}
      </div>
      {selectedVariable ? <div className="studio-variable-description studio-context-panel" aria-label="Selected passage variable">
        <p>{variableLabel(selectedVariable)} · {calendarVariableKind(selectedVariable, values[selectedVariable])} · <code>{`{{${selectedVariable}}}`}</code></p>
        {isConditionVariable(selectedVariable) ? <p>Wrap selected wording so it appears only when this condition is available. The condition itself is not printed.</p>
          : <p>{calendarPassageVariableHelp(selectedVariable) ?? (calendarVariableKind(selectedVariable, values[selectedVariable]) === 'Saved writing' ? 'Inserts the complete saved writing. Open its source to change shared wording.' : 'The Calendar supplies this value for the selected date. Insert the token to keep it calculated.')}</p>}
        {values[selectedVariable] ? <details><summary>Current value</summary><p className="studio-variable-value studio-preview-canvas">{values[selectedVariable].text}</p></details>
          : <p>Unavailable for this date. Missing conditions omit their wording; a required value must be available before this passage can be published.</p>}
      </div> : <p role="status">No matching passage variables. Clear the search or include unavailable variables.</p>}
    </div>;
  const usedNames = [...new Set([...((active ? value.slice(active.start, active.end) : value).matchAll(/\{\{\s*[#/]?\s*(\w+)\s*\}\}/gu))].map(match => match[1]))];
  if (active) for (const section of sections.filter(section => section.from <= active.from && section.to >= active.to)) {
    if (!usedNames.includes(section.name)) usedNames.push(section.name);
  }
  const displayedNames = workspace?.literal ? ['moonSign', 'nextMoonSign', 'nextMoonSignEntryTime'] : usedNames;
  return <div className={workspace ? 'studio-grid studio-dated-workspace' : undefined}>
    <div className="studio-calendar-template-editor studio-workspace-pane">
    {!workspace?.literal && sections.length > 0 && <label><span>Editing section</span><AdminSelect aria-label="Calendar editing section" value={active?.id ?? ''} disabled={disabled} onChange={event => event.target.value ? openSection(event.target.value) : openTemplate()}>
      <option value="">Complete passage</option>{sections.map(section => <option key={section.id} value={section.id}>{sectionLabel(section.name)}</option>)}
    </AdminSelect></label>}
    <p id={hintId} className="admin-field-hint">Save draft keeps your edits. Publish passage updates the Calendar.</p>
    {active && <label id={sectionId}><span>{sectionLabel(active.name)} wording · {label}</span><StudioTextarea
      key={active.id} ref={sectionField} aria-label={`${sectionLabel(active.name)} wording`} aria-describedby={hintId} rows={8}
      value={value.slice(active.start, active.end)} disabled={disabled}
      onChange={event => onChange(value.slice(0, active.start) + event.target.value + value.slice(active.end))} /></label>}
    <label hidden={Boolean(active)}><span>{label}</span><StudioTextarea ref={field} aria-label="Complete passage wording" aria-describedby={hintId} rows={12}
      value={value} disabled={disabled} onChange={event => onChange(event.target.value)}
      onClick={event => {
        const { selectionStart: start, selectionEnd: end } = event.currentTarget;
        if (!colors || wholeTemplate || start !== end) return;
        const section = [...sections].reverse().find(item => start >= item.from && start < item.to);
        if (section) openSection(section.id);
      }}
      highlight={colors ? parts.map((part, index) => part.name
        ? <span key={index} data-variable-name={part.name} data-variable-color={calendarVariableColor(part.name)}
          className={`studio-template-token ${part.marker ? 'studio-template-marker' : 'studio-template-value'}`}>{part.text}</span>
        : part.section ? <span key={index} className="studio-template-sentences" data-template-section={part.section} data-variable-color={calendarVariableColor(part.section)}>{part.text}</span> : part.text) : undefined} /></label>
    {actions}
    {workspace && <details className="admin-workspace-details" aria-label="Calendar passage values and sources">
      <AdminDisclosureSummary>Values and sources for this passage</AdminDisclosureSummary>
      <p>{workspace.date} · {workspace.timeZone}</p>
      {workspace.literal && <p>Shared transition wording is stored as complete text. These calculated values explain the selected date; they are not inserted into this shared source.</p>}
      {displayedNames.length ? displayedNames.map(name => <details key={name} open>
        <summary>{variableLabel(name)} · {`{{${name}}}`}</summary>
        <p>{kind(name)}</p>
        {active && sections.some(section => section.name === name && section.from <= active.from && section.to >= active.to)
          && <p>{values[name] ? 'Condition available.' : 'Condition unavailable: this section is omitted.'} The condition controls visibility; it does not insert the source wording.</p>}
        {values[name] ? <p className="studio-variable-value studio-preview-canvas">{values[name].text}</p> : <p role="status">No value for this date. A required token blocks publication; an unavailable condition omits its section.</p>}
        {calendarPassageVariableHelp(name) && <p className="admin-field-hint">{calendarPassageVariableHelp(name)}</p>}
        {workspace.source(name)}
      </details>) : <p>This passage stores its wording directly. No variables are inserted.</p>}
    </details>}
    {!workspace?.literal && <details className="admin-workspace-details"><AdminDisclosureSummary>Insert a variable</AdminDisclosureSummary>{picker}</details>}
    {!workspace?.literal && <details className="admin-workspace-details"><AdminDisclosureSummary>Template details</AdminDisclosureSummary>
    <p className="admin-field-hint">Sections appear in reading order. Conditional sections follow the Calendar’s source availability rules. Moving a section keeps its complete wording and variables together.</p>
    {sections.length > 0 && <AssemblySections label="Template passage sections">
      {sections.map(section => <li key={section.id}>
        <div><strong>{sectionLabel(section.name)}</strong><p className="admin-field-hint">{section.depth > 0 ? 'Nested section · ' : ''}Conditional on {`{{${section.name}}}`} · {kind(section.name)} · {sections.filter(parent => parent.from <= section.from && parent.to >= section.to).every(parent => values[parent.name]) ? 'Included for this date' : 'Omitted for this date · this condition or an enclosing condition is unavailable'}</p></div>
        <div className="admin-new-actions"><StudioButton disabled={disabled}
          data-variable-color={calendarVariableColor(section.name)} aria-pressed={active?.id === section.id}
          aria-controls={active ? sectionId : undefined} onClick={() => openSection(section.id)}>Edit {sectionLabel(section.name)}</StudioButton>
          {section.depth === 0 && ([-1, 1] as const).map(offset => <StudioButton key={offset} disabled={disabled || invalid || !roots[roots.indexOf(section) + offset]}
            aria-label={`Move ${sectionLabel(section.name)} ${offset === -1 ? 'earlier' : 'later'}`} onClick={() => {
              const moved = moveCalendarSection(value, section.from, offset);
              if (moved !== value) { setActiveId(null); onChange(moved); }
            }}>{offset === -1 ? 'Earlier' : 'Later'}</StudioButton>)}
        </div>
      </li>)}
    </AssemblySections>}
    <div className="admin-new-actions">
      {sections.length > 0 && <StudioButton disabled={disabled} onClick={openTemplate}>Edit complete template</StudioButton>}
      <StudioButton aria-pressed={colors} onClick={() => setColors(current => !current)}>{colors ? 'Hide template colors' : 'Show template colors'}</StudioButton>
    </div>
    {!active && names.length > 0 && <div className="studio-template-variable-key" aria-label="Template variable key">{names.map(name => <span key={name} className="admin-variable-key-item">
      <code data-variable-name={name} data-variable-color={calendarVariableColor(name)}>{`{{${name}}}`}</code><small>{kind(name)}</small>
    </span>)}</div>}
    </details>}
  </div>
    {workspace?.reader}
  </div>;
});
