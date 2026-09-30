import { useId, useRef, useState } from 'react';
import { calendarPassageVariables } from '../../../src/calendar-writing/passageContract';
import type { CalendarOverviewValue } from '../../web/src/features/calendar/calendarOverviewResolve';
import { calendarVariableColor } from './calendarOverviewTemplate';
import { StudioButton, StudioTextarea } from './StudioControls';

const labels: Record<string, string> = { sunSummary: 'Sun summary', moonWriteup: 'Moon passage', overview: 'Monthly overview' };
const sectionLabel = (name: string) => labels[name] ?? name.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, letter => letter.toUpperCase());

/** Highlighting is presentation only: every character stays in the native textarea. */
function templateParts(value: string) {
  const parts: { text: string; name?: string; section?: string; marker?: string }[] = [];
  const sections: { name: string; start: number; end: number }[] = [];
  const stack: { name: string; start: number }[] = [];
  let cursor = 0;
  for (const match of value.matchAll(/\{\{\s*([#/!]?)\s*([^{}]*?)\s*\}\}/gu)) {
    const [text, marker, name] = match;
    const start = match.index!;
    if (start > cursor) parts.push({ text: value.slice(cursor, start), section: stack.at(-1)?.name });
    parts.push({ text, name, marker });
    cursor = start + text.length;
    if (marker === '#') stack.push({ name, start: cursor });
    if (marker === '/' && stack.at(-1)?.name === name) {
      const section = stack.pop()!;
      sections.push({ ...section, end: start });
    }
  }
  if (cursor < value.length) parts.push({ text: value.slice(cursor), section: stack.at(-1)?.name });
  return { parts, sections: sections.sort((a, b) => a.start - b.start) };
}

export default function CalendarPassageTemplateEditor({ value, onChange, disabled, label, values }: {
  value: string; onChange: (value: string) => void; disabled: boolean; label: string;
  values: Record<string, CalendarOverviewValue>;
}) {
  const field = useRef<HTMLTextAreaElement>(null);
  const hintId = useId();
  const [colors, setColors] = useState(true);
  const { parts, sections } = templateParts(value);
  const names = [...new Set(parts.filter(part => part.name && !part.marker).map(part => part.name!))];
  const kind = (name: string) => !calendarPassageVariables.includes(name) ? 'Unknown variable' : values[name]?.kind === 'copy' ? 'Saved writing' : 'Calculated value';
  const select = (start: number, end: number) => {
    const element = field.current;
    if (!element) return;
    element.focus();
    element.setSelectionRange(start, end);
    const layer = element.parentElement?.querySelector('.studio-highlighted-backdrop');
    if (layer) {
      const walker = document.createTreeWalker(layer, NodeFilter.SHOW_TEXT);
      let offset = 0, node: Node | null;
      while ((node = walker.nextNode())) {
        if (offset + (node.textContent?.length ?? 0) > start) {
          const range = document.createRange();
          range.setStart(node, start - offset); range.collapse(true);
          element.scrollTop += range.getBoundingClientRect().top - layer.getBoundingClientRect().top;
          break;
        }
        offset += node.textContent?.length ?? 0;
      }
    }
    element.scrollIntoView({ block: 'center', behavior: 'instant' });
  };
  return <div className="studio-calendar-template-editor">
    <div className="admin-new-actions" aria-label="Template passage sections">
      {sections.map((section, index) => <StudioButton key={`${section.name}-${index}`} disabled={disabled}
        data-variable-color={calendarVariableColor(section.name)} aria-label={`Select ${sectionLabel(section.name)} sentences`}
        onClick={() => select(section.start, section.end)}>{sectionLabel(section.name)}</StudioButton>)}
      <StudioButton aria-pressed={colors} onClick={() => setColors(current => !current)}>{colors ? 'Hide template colors' : 'Show template colors'}</StudioButton>
    </div>
    <p id={hintId} className="admin-field-hint">Tinted sentences belong to the named passages. Underlined variables supply calculated values or saved writing. Select a passage above to edit its sentences.</p>
    <label><span>{label}</span><StudioTextarea ref={field} aria-label="Complete passage wording" aria-describedby={hintId} rows={12}
      value={value} disabled={disabled} onChange={event => onChange(event.target.value)}
      highlight={colors ? parts.map((part, index) => part.name
        ? <span key={index} data-variable-name={part.name} data-variable-color={calendarVariableColor(part.name)}
          className={`studio-template-token ${part.marker ? 'studio-template-marker' : 'studio-template-value'}`}>{part.text}</span>
        : part.section ? <span key={index} className="studio-template-sentences" data-template-section={part.section} data-variable-color={calendarVariableColor(part.section)}>{part.text}</span> : part.text) : undefined} /></label>
    {names.length > 0 && <div className="studio-template-variable-key" aria-label="Template variable key">{names.map(name => <span key={name} className="admin-variable-key-item">
      <code data-variable-name={name} data-variable-color={calendarVariableColor(name)}>{`{{${name}}}`}</code><small>{kind(name)}</small>
    </span>)}</div>}
  </div>;
}
