import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { calendarPassageVariables } from '../../../src/calendar-writing/passageContract';
import type { CalendarOverviewValue } from '../../web/src/features/calendar/calendarOverviewResolve';
import { calendarVariableColor } from './calendarOverviewTemplate';
import { StudioButton, StudioTextarea } from './StudioControls';

const labels: Record<string, string> = { sunSummary: 'Sun summary', moonWriteup: 'Moon passage', overview: 'Monthly overview' };
const sectionLabel = (name: string) => labels[name] ?? name.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, letter => letter.toUpperCase());

/** Highlighting is presentation only: every character stays in the native textarea. */
function templateParts(value: string) {
  const parts: { text: string; name?: string; section?: string; marker?: string }[] = [];
  const sections: { name: string; start: number; end: number; from: number; to: number }[] = [];
  const stack: { name: string; start: number; from: number }[] = [];
  let cursor = 0;
  for (const match of value.matchAll(/\{\{\s*([#/!]?)\s*([^{}]*?)\s*\}\}/gu)) {
    const [text, marker, name] = match;
    const start = match.index!;
    if (start > cursor) parts.push({ text: value.slice(cursor, start), section: stack.at(-1)?.name });
    parts.push({ text, name, marker });
    cursor = start + text.length;
    if (marker === '#') stack.push({ name, start: cursor, from: start });
    if (marker === '/' && stack.at(-1)?.name === name) {
      const section = stack.pop()!;
      sections.push({ ...section, end: start, to: cursor });
    }
  }
  if (cursor < value.length) parts.push({ text: value.slice(cursor), section: stack.at(-1)?.name });
  return { parts, sections: sections.sort((a, b) => a.start - b.start) };
}

export default function CalendarPassageTemplateEditor({ value, onChange, disabled, label, values, actions }: {
  value: string; onChange: (value: string) => void; disabled: boolean; label: string;
  values: Record<string, CalendarOverviewValue>; actions: ReactNode;
}) {
  const field = useRef<HTMLTextAreaElement>(null);
  const sectionField = useRef<HTMLTextAreaElement>(null);
  const hintId = useId();
  const sectionId = useId();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [wholeTemplate, setWholeTemplate] = useState(false);
  const [colors, setColors] = useState(true);
  const { parts, sections: parsedSections } = templateParts(value);
  const sections = parsedSections.map((section, index) => ({ ...section, id: `${section.name}-${index}` }));
  const active = sections.find(section => section.id === activeId);
  useEffect(() => {
    if (!activeId) return;
    sectionField.current?.focus();
    sectionField.current?.scrollIntoView({ block: 'center', behavior: 'instant' });
  }, [activeId]);
  const names = [...new Set(parts.filter(part => part.name && !part.marker).map(part => part.name!))];
  const kind = (name: string) => !calendarPassageVariables.includes(name) ? 'Unknown variable' : values[name]?.kind === 'copy' ? 'Saved writing' : 'Calculated value';
  const openSection = (id: string) => {
    setActiveId(id); setWholeTemplate(false);
    if (id === activeId) sectionField.current?.focus();
  };
  const openTemplate = () => {
    setActiveId(null); setWholeTemplate(true);
    requestAnimationFrame(() => field.current?.focus());
  };
  return <div className="studio-calendar-template-editor">
    <div className="admin-new-actions" aria-label="Template passage sections">
      {sections.map(section => <StudioButton key={section.id} disabled={disabled}
        data-variable-color={calendarVariableColor(section.name)} aria-pressed={active?.id === section.id}
        aria-controls={active ? sectionId : undefined} onClick={() => openSection(section.id)}>Edit {sectionLabel(section.name)}</StudioButton>)}
      {sections.length > 0 && <StudioButton disabled={disabled} onClick={openTemplate}>Edit complete template</StudioButton>}
      <StudioButton aria-pressed={colors} onClick={() => setColors(current => !current)}>{colors ? 'Hide template colors' : 'Show template colors'}</StudioButton>
    </div>
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
    {!active && names.length > 0 && <div className="studio-template-variable-key" aria-label="Template variable key">{names.map(name => <span key={name} className="admin-variable-key-item">
      <code data-variable-name={name} data-variable-color={calendarVariableColor(name)}>{`{{${name}}}`}</code><small>{kind(name)}</small>
    </span>)}</div>}
  </div>;
}
