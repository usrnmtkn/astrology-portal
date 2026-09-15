import { useRef } from "react";
import type { AdminDraft } from "./GeneratedContentAdminDashboard";
import { StudioButton, StudioTextarea } from "./StudioControls";
import { calendarOverviewFields, calendarOverviewPattern, calendarOverviewPeriod, calendarOverviewWriting, calendarSeasonVariables } from "./calendarOverviewTemplate";

export default function CalendarOverviewEditor({ draft, onChange }: { draft: AdminDraft; onChange: (draft: AdminDraft) => void }) {
  const { contentKey, body, sections } = draft;
  const change = (body: string, sections: Record<string, unknown>) => onChange({ ...draft, body, sections });
  const selected = useRef<HTMLTextAreaElement | null>(null);
  const period = calendarOverviewPeriod(contentKey);
  if (!period) return null;
  const writing = calendarOverviewWriting(sections);
  const update = (name: string, value: string) => change(body, { ...sections, calendarOverview: { ...writing, [name]: value } });
  const insert = (name: string) => {
    const element = selected.current;
    const field = element?.dataset.calendarField;
    const token = `{{${name}}}`;
    if (element && field) {
      const start = element.selectionStart, end = element.selectionEnd;
      update(field, element.value.slice(0, start) + token + element.value.slice(end));
      requestAnimationFrame(() => { element.focus(); element.setSelectionRange(start + token.length, start + token.length); });
    } else change(`${body}${body ? "\n\n" : ""}${token}`, sections ?? {});
  };
  return <section className="admin-editor-guidance" aria-label="Calendar overview writing">
    <p>Write the overview passages below. Each passage fills its named variable in the template and updates the preview. Save keeps the passages, pattern, and existing guidance together.</p>
    {calendarOverviewFields(period).map(field => <label className="admin-review-copy-editor studio-surface" key={field.name}>
      <span>{field.label} <code>{`{{${field.name}}}`}</code></span>
      <StudioTextarea aria-label={field.label} data-calendar-field={field.name} value={writing[field.name] ?? ""}
        onFocus={event => { selected.current = event.currentTarget; }} onChange={event => update(field.name, event.target.value)} />
      <small className="admin-field-hint">{field.help}</small>
    </label>)}
    <p>Insert a zodiac season variable into the last selected overview passage, or append it to the pattern. Season writing follows the selected Sun sign; opening and closing season variables follow the whole week or month.</p>
    <div className="admin-new-actions">{calendarSeasonVariables.map(name => <StudioButton key={name} type="button" aria-label={`Insert {{${name}}} into Calendar template`} onClick={() => insert(name)}>{`{{${name}}}`}</StudioButton>)}</div>
    {period !== "daily-sky" && <div className="admin-new-actions"><StudioButton type="button" onClick={() => {
      if (body !== calendarOverviewPattern(period) && !window.confirm("Replace the pattern with the overview structure? Your written overview passages and editor guidance will stay. Save applies the change.")) return;
      change(calendarOverviewPattern(period), sections ?? {});
    }}>Use overview structure</StudioButton></div>}
  </section>;
}
