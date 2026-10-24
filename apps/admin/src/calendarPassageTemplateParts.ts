import { calendarPassageErrors } from '../../../src/calendar-writing/passageContract';
import { isConditionVariable } from './variablePresentation';

/** Availability flags wrap wording; printing their raw "yes" value is not prose. */
export function insertCalendarVariable(value: string, name: string, start: number, end: number) {
  const opening = isConditionVariable(name) ? `{{#${name}}}` : `{{${name}}}`;
  const selected = isConditionVariable(name) ? value.slice(start, end) : '';
  const closing = isConditionVariable(name) ? `{{/${name}}}` : '';
  return { value: value.slice(0, start) + opening + selected + closing + value.slice(end),
    start: start + opening.length, end: start + opening.length + selected.length };
}

/** Character offsets always refer to the original template, including whitespace. */
export function calendarTemplateParts(value: string) {
  const parts: { text: string; name?: string; section?: string; marker?: string }[] = [];
  const sections: { name: string; start: number; end: number; from: number; to: number; depth: number }[] = [];
  const stack: { name: string; start: number; from: number; depth: number }[] = [];
  let cursor = 0;
  for (const match of value.matchAll(/\{\{\s*([#/!]?)\s*([^{}]*?)\s*\}\}/gu)) {
    const [text, marker, name] = match;
    const start = match.index!;
    if (start > cursor) parts.push({ text: value.slice(cursor, start), section: stack.at(-1)?.name });
    parts.push({ text, name, marker });
    cursor = start + text.length;
    if (marker === '#') stack.push({ name, start: cursor, from: start, depth: stack.length });
    if (marker === '/' && stack.at(-1)?.name === name) sections.push({ ...stack.pop()!, end: start, to: cursor });
  }
  if (cursor < value.length) parts.push({ text: value.slice(cursor), section: stack.at(-1)?.name });
  return { parts, sections: sections.sort((a, b) => a.start - b.start) };
}

/** Swap complete top-level blocks; preserve every character inside and between them. */
export function moveCalendarSection(value: string, from: number, offset: -1 | 1) {
  if (calendarPassageErrors(value).length) return value;
  const roots = calendarTemplateParts(value).sections.filter(section => section.depth === 0);
  const index = roots.findIndex(section => section.from === from);
  const other = roots[index + offset];
  if (index < 0 || !other) return value;
  const [first, last] = [roots[index], other].sort((a, b) => a.from - b.from);
  return value.slice(0, first.from) + value.slice(last.from, last.to) + value.slice(first.to, last.from)
    + value.slice(first.from, first.to) + value.slice(last.to);
}
