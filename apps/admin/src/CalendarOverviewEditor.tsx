import { useEffect, useRef } from "react";
import type { AdminDraft } from "./GeneratedContentAdminDashboard";
import { StudioButton, StudioTextarea } from "./StudioControls";
import { calendarMonthlyEditorialPattern, calendarOverviewFields, calendarOverviewPattern, calendarOverviewPeriod, calendarOverviewWriting, calendarSeasonVariables, calendarVariableColor } from "./calendarOverviewTemplate";

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
  const fields = calendarOverviewFields(period);
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
  const adoptStarter = (name: string, starter: string) => {
    const existing = writing[name]?.trim();
    if (existing && writing[name] !== starter && !window.confirm("Replace this field with its sentence-template starter?")) return;
    update(name, starter);
  };
  return <section ref={container} className="admin-editor-guidance" aria-label="Calendar overview writing">
    <p>{period === "monthly-sky" ? "Monthly opening and season transition are reusable sentence templates. Existing writing stays until you choose a starter. The monthly editorial structure is opt-in and does not convert saved passages." : "Write the overview passages below. Each passage fills its named variable in the template and updates the preview."}</p>
    {fields.map(field => <label className="admin-review-copy-editor studio-surface" key={field.name}>
      <span>{field.label} <code className="admin-composition-variable-token" data-variable-name={field.name} data-variable-color={calendarVariableColor(field.name)}>{`{{${field.name}}}`}</code></span>
      <StudioTextarea aria-label={field.label} data-calendar-field={field.name} data-sky-field={`calendarOverview.${field.name}`} value={writing[field.name] ?? ""}
        onFocus={event => { selected.current = event.currentTarget; }} onChange={event => update(field.name, event.target.value)} />
      <small className="admin-field-hint">{field.help}</small>
    </label>)}
    {(fields.some(field => field.starter) || fields.some(field => field.starters?.length)) && <div className="admin-new-actions">
      {fields.filter(field => field.starter).map(field => <StudioButton key={field.name} type="button" onClick={() => adoptStarter(field.name, field.starter!)}>Use {field.label.toLowerCase()} starter</StudioButton>)}
      {fields.flatMap(field => (field.starters ?? []).map(starter => <StudioButton key={`${field.name}:${starter.action}`} type="button" onClick={() => adoptStarter(field.name, starter.value)}>{starter.action}</StudioButton>))}
    </div>}
    <p>Insert a saved passage variable into the selected field.</p>
    <div className="admin-new-actions">{[{ name: "sunSummary", label: "Use Sun summary" }, { name: "moonWriteup", label: "Use Moon passage" }, { name: "openingZodiacSeason", label: "Use opening season passage" }, { name: "openingZodiacSeasonPolarAxis", label: "Use season axis passage" }].map(item => <StudioButton key={item.name} type="button" data-variable-name={item.name} data-variable-color={calendarVariableColor(item.name)} onClick={() => insert(item.name)}>{item.label}</StudioButton>)}</div>
    <p>Insert a season variable into the selected field or template pattern.</p>
    <div className="admin-new-actions">{calendarSeasonVariables.map(name => <StudioButton key={name} type="button" data-variable-name={name} data-variable-color={calendarVariableColor(name)} aria-label={`Insert {{${name}}} into Calendar template`} onClick={() => insert(name)}>{`{{${name}}}`}</StudioButton>)}</div>
    {period !== "daily-sky" && <div className="admin-new-actions"><StudioButton type="button" onClick={() => {
      if (body !== calendarOverviewPattern(period) && !window.confirm("Replace the pattern with the overview structure?")) return;
      change(calendarOverviewPattern(period), sections ?? {});
    }}>Use overview structure</StudioButton>
    {period === "monthly-sky" && <StudioButton type="button" onClick={() => {
      if (body !== calendarMonthlyEditorialPattern() && !window.confirm("Replace the pattern with the monthly editorial structure? Existing overview passages stay until you choose a starter.")) return;
      change(calendarMonthlyEditorialPattern(), sections ?? {});
    }}>Use monthly editorial structure</StudioButton>}</div>}
  </section>;
}
