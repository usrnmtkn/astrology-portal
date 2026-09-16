import { useEffect, useRef } from "react";
import type { AdminDraft } from "./GeneratedContentAdminDashboard";
import { StudioButton, StudioTextarea } from "./StudioControls";
import { calendarOverviewFields, calendarOverviewPattern, calendarOverviewPeriod, calendarOverviewWriting, calendarPhraseSourceLabel, calendarPhraseVariables, calendarSeasonVariables, calendarVariableColor } from "./calendarOverviewTemplate";

export default function CalendarOverviewEditor({ draft, initialField, onChange }: { draft: AdminDraft; initialField?: string; onChange: (draft: AdminDraft) => void }) {
  const { contentKey, body, sections } = draft;
  const change = (body: string, sections: Record<string, unknown>) => onChange({ ...draft, body, sections });
  const selected = useRef<HTMLTextAreaElement | null>(null);
  const container = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const field = Array.from(container.current?.querySelectorAll<HTMLTextAreaElement>("textarea[data-sky-field]") ?? []).find(element => element.dataset.skyField === initialField);
    if (field) { field.focus({ preventScroll: true }); field.scrollIntoView({ block: "center" }); }
  }, [initialField]);
  const period = calendarOverviewPeriod(contentKey);
  if (!period) return null;
  const writing = calendarOverviewWriting(sections);
  const phraseVariables = calendarPhraseVariables(period);
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
  return <section ref={container} className="admin-editor-guidance" aria-label="Calendar overview writing">
    <p>Write the overview passages below. Each passage fills its named variable in the template and updates the preview. Save keeps the passages, pattern, and existing guidance together.</p>
    {calendarOverviewFields(period).map(field => <label className="admin-review-copy-editor studio-surface" key={field.name}>
      <span>{field.label} <code className="admin-composition-variable-token" data-variable-name={field.name} data-variable-color={calendarVariableColor(field.name)}>{`{{${field.name}}}`}</code></span>
      <StudioTextarea aria-label={field.label} data-calendar-field={field.name} data-sky-field={`calendarOverview.${field.name}`} value={writing[field.name] ?? ""}
        onFocus={event => { selected.current = event.currentTarget; }} onChange={event => update(field.name, event.target.value)} />
      <small className="admin-field-hint">{field.help}</small>
    </label>)}
    <p>Reuse an existing passage by inserting its variable into the selected overview field. The full passage follows your chosen signs and stays editable from the Variables tab.</p>
    <div className="admin-new-actions">{[{ name: "sunSummary", label: "Use Sun summary" }, { name: "moonWriteup", label: "Use Moon passage" }, { name: "openingZodiacSeason", label: "Use opening season passage" }, { name: "openingZodiacSeasonPolarAxis", label: "Use season axis passage" }].map(item => <StudioButton key={item.name} type="button" data-variable-name={item.name} data-variable-color={calendarVariableColor(item.name)} onClick={() => insert(item.name)}>{item.label}</StudioButton>)}</div>
    {phraseVariables.length > 0 && <>
      <p>Build monthly sentences from smaller phrase variables. This step registers their meaning, grammar, and source scope only; sign-specific and month-specific phrase values are bound separately so one month’s writing cannot leak into another.</p>
      <div className="admin-new-actions">{phraseVariables.map(variable => <StudioButton key={variable.name} type="button" data-variable-name={variable.name} data-variable-color={calendarVariableColor(variable.name)} title={`${variable.grammar} · ${calendarPhraseSourceLabel[variable.source]} · ${variable.help}`} aria-label={`Insert {{${variable.name}}} · ${variable.grammar} · ${calendarPhraseSourceLabel[variable.source]}`} onClick={() => insert(variable.name)}>{`{{${variable.name}}}`}</StudioButton>)}</div>
    </>}
    <p>Insert a zodiac season variable into the last selected overview passage, or append it to the pattern. Season writing follows the selected Sun sign; opening and closing season variables follow the whole week or month.</p>
    <div className="admin-new-actions">{calendarSeasonVariables.map(name => <StudioButton key={name} type="button" data-variable-name={name} data-variable-color={calendarVariableColor(name)} aria-label={`Insert {{${name}}} into Calendar template`} onClick={() => insert(name)}>{`{{${name}}}`}</StudioButton>)}</div>
    {period !== "daily-sky" && <div className="admin-new-actions"><StudioButton type="button" onClick={() => {
      if (body !== calendarOverviewPattern(period) && !window.confirm("Replace the pattern with the overview structure? Your written overview passages and editor guidance will stay. Save applies the change.")) return;
      change(calendarOverviewPattern(period), sections ?? {});
    }}>Use overview structure</StudioButton></div>}
  </section>;
}
