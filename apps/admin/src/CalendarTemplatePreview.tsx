import { useEffect, useMemo, useState } from "react";
import { AdminSelect } from "./AdminNativeControls";
import { StudioButton, StudioInput, StudioTabs } from "./StudioControls";
import { lunarSigns, lunarContentIdentity } from "./lunarCalendarContent";
import { skyForecastTemplates, type SkyForecastPeriod } from "./skyForecastTemplates";
import type { CalendarPreviewCalculation } from "./calendarPreviewCalculation";
import { calendarMoonPassages, calendarPreviewSign, calendarPreviewSourceKeys, calendarPreviewValues, calendarTemplateSegments, type CalendarPreviewRow } from "./calendarPreviewModel";

export type CalendarTemplatePreviewProps = {
  period: SkyForecastPeriod;
  rows: CalendarPreviewRow[];
  loadRows: (keys: string[]) => Promise<CalendarPreviewRow[]>;
  draft?: { contentKey: string; body: string } | null;
};
const dateInput = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}T${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;

export default function CalendarTemplatePreview({ period, rows, loadRows, draft }: CalendarTemplatePreviewProps) {
  const [mode, setMode] = useState("ephemeris");
  const [view, setView] = useState("preview");
  const [date, setDate] = useState(() => dateInput(new Date()));
  const [live, setLive] = useState(true);
  const [sun, setSun] = useState("");
  const [moon, setMoon] = useState("");
  const [moonKey, setMoonKey] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [calculated, setCalculated] = useState<{ key: string; value?: CalendarPreviewCalculation; error?: string }>();
  const [loaded, setLoaded] = useState<{ key: string; rows?: CalendarPreviewRow[]; error?: string }>();
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const calculationKey = `${period}|${date}|${timeZone}|${attempt}`;
  const calculation = mode === "ephemeris" && calculated?.key === calculationKey ? calculated.value : undefined;
  const calculationError = mode === "ephemeris" && calculated?.key === calculationKey ? calculated.error : undefined;
  const sunSign = mode === "signs" ? sun : calculation?.sky.positions.find(position => position.planet === "Sun")?.sign ?? "";
  const moonSign = mode === "signs" ? moon : calculation?.sky.positions.find(position => position.planet === "Moon")?.sign ?? "";
  const sourceKeys = calendarPreviewSourceKeys(period, [sunSign, moonSign, ...(calculation?.days.map(day => day.moonSign) ?? [])]);
  const keysJson = JSON.stringify(sourceKeys);
  const revisions = rows.filter(row => sourceKeys.includes(row.content_key)).map(row => `${row.id}:${row.updated_at}:${row.status}`).join("|");
  const sourceKey = `${keysJson}|${revisions}|${attempt}`;
  const sources = loaded?.key === sourceKey ? loaded.rows : undefined;
  const sourceError = loaded?.key === sourceKey ? loaded.error : undefined;
  useEffect(() => {
    if (!live || mode !== "ephemeris") return;
    const timer = window.setInterval(() => setDate(dateInput(new Date())), 60_000);
    return () => window.clearInterval(timer);
  }, [live, mode]);
  useEffect(() => {
    if (mode !== "ephemeris") return;
    let active = true;
    void import("./calendarPreviewCalculation").then(({ calculateCalendarPreview }) => {
      const instant = new Date(date);
      if (!Number.isFinite(instant.getTime()) || dateInput(instant) !== date) throw new Error("Choose a valid local date and time. This time may not exist during a daylight-saving change.");
      return calculateCalendarPreview(period, instant.toISOString(), timeZone);
    })
      .then(value => { if (active) setCalculated({ key: calculationKey, value }); })
      .catch(reason => { if (active) setCalculated({ key: calculationKey, error: reason instanceof Error ? reason.message : "Could not calculate this sky." }); });
    return () => { active = false; };
  }, [calculationKey, mode]);
  useEffect(() => {
    let active = true;
    void loadRows(JSON.parse(keysJson)).then(rows => { if (active) setLoaded({ key: sourceKey, rows }); })
      .catch(reason => { if (active) setLoaded({ key: sourceKey, error: reason instanceof Error ? reason.message : "Could not load saved writing." }); });
    return () => { active = false; };
  }, [sourceKey, loadRows]);
  const values = useMemo(() => calendarPreviewValues({ sunSign, moonSign, calculation, rows: sources ?? [], moonKey }), [sunSign, moonSign, calculation, sources, moonKey]);
  const template = skyForecastTemplates[period];
  const saved = sources?.find(row => row.content_key === template.contentKey);
  const pattern = draft?.contentKey === template.contentKey ? draft.body : saved?.body ?? template.body;
  const passages = calendarMoonPassages(sources ?? [], moonSign);
  const segments = calendarTemplateSegments(pattern, values);
  const missing = [...new Set(segments.filter(segment => segment.name && !segment.value).map(segment => segment.name!))];
  const ready = Boolean(sources) && (mode === "signs" || Boolean(calculation));
  return <section className="admin-template-reader-drilldown studio-surface" aria-label="Calendar template preview">
    <header className="admin-section-heading-row"><div><h4>Template preview</h4><p>Choose example signs or use the calculated sky. Your saved passages stay complete; opening and closing sections remain yours to write.</p></div></header>
    <div className="admin-daily-glance-context-form">
      <label><span>Preview source</span><AdminSelect aria-label="Preview source" value={mode} onChange={event => {
        if (event.target.value === "signs") { setSun(sunSign); setMoon(moonSign); }
        setMode(event.target.value);
      }}><option value="ephemeris">Use ephemeris</option><option value="signs">Choose signs</option></AdminSelect></label>
      <label><span>Date and time · {timeZone}</span><StudioInput aria-label="Preview date and time" type="datetime-local" value={date} disabled={mode === "signs"} onChange={event => { setLive(false); setDate(event.target.value); }} /></label>
      <label><span>Sun sign</span><AdminSelect aria-label="Preview Sun sign" value={sunSign} disabled={mode === "ephemeris"} onChange={event => setSun(event.target.value)}><option value="">Choose Sun sign</option>{lunarSigns.map(sign => <option key={sign}>{calendarPreviewSign(sign)}</option>)}</AdminSelect></label>
      <label><span>Moon sign</span><AdminSelect aria-label="Preview Moon sign" value={moonSign} disabled={mode === "ephemeris"} onChange={event => { setMoon(event.target.value); setMoonKey(""); }}><option value="">Choose Moon sign</option>{lunarSigns.map(sign => <option key={sign}>{calendarPreviewSign(sign)}</option>)}</AdminSelect></label>
      {passages.length > 0 && <label><span>Moon passage for this preview</span><AdminSelect aria-label="Preview Moon passage" value={passages.some(row => row.content_key === moonKey) ? moonKey : passages[0].content_key} onChange={event => setMoonKey(event.target.value)}>{passages.map(row => <option key={row.id} value={row.content_key}>{lunarContentIdentity(row.content_key)?.title}</option>)}</AdminSelect></label>}
    </div>
    <div className="admin-new-actions"><StudioButton onClick={() => { setMode("ephemeris"); setLive(true); setDate(dateInput(new Date())); setAttempt(value => value + 1); }}>Use current sky</StudioButton><StudioButton onClick={() => setAttempt(value => value + 1)}>Refresh preview</StudioButton></div>
    <p role="status">{mode === "signs" ? "Example signs · degrees and event timing are unavailable in this mode." : calculation ? `${live ? "Live sky" : "Selected sky"} · ${values.asOf?.text} · ${timeZone} · Swiss Ephemeris · tropical, geocentric` : calculationError ? "Calculation unavailable." : "Calculating ephemeris facts…"}</p>
    {(calculationError || sourceError) && <p role="alert">{calculationError || sourceError} Use Refresh preview to retry.</p>}
    {!sources && !sourceError && <p role="status">Loading the full saved template and matching passages…</p>}
    <StudioTabs label="Calendar template views" value={view} onValueChange={setView} tabs={[{ value: "preview", label: "Preview" }, { value: "pattern", label: "Template pattern" }, { value: "variables", label: "Variables" }]}>
      {view === "pattern" ? <div className="admin-composition-preview-field"><span>{draft?.contentKey === template.contentKey ? "Open editor pattern" : saved ? "Saved template pattern" : "Starter template pattern"}</span><p className="admin-calendar-template-text" aria-label="Calendar template pattern">{sources ? pattern : "Loading saved template…"}</p></div>
        : view === "variables" ? <div className="admin-editor-guidance"><p>Use these named variables in the template pattern. Ephemeris values cannot be edited; saved writing is edited at its source.</p><dl aria-label="Calendar preview variables">{Object.entries(values).map(([name, value]) => <div key={name}><dt><code>{`{{${name}}}`}</code> · {value.kind === "fact" ? "Read-only ephemeris" : value.kind === "example" ? "Example sign" : "Saved writing"}</dt><dd className="admin-calendar-template-text">{value.text}{value.sourceKey && <p><a href={`#exact-content?q=${encodeURIComponent(value.sourceKey)}`}>Open writing source</a></p>}</dd></div>)}</dl></div>
        : <div className="admin-template-reader-surface"><div className="admin-template-reader-copy">
          {ready ? <>
            {period !== "daily-sky" && !["sunSummary", "moonWriteup"].every(name => segments.some(segment => segment.name === name)) && <section className="admin-composition-preview-field" aria-label="Selected Sun and Moon writing"><span>Selected Sun and Moon writing</span>{["sunSummary", "moonWriteup"].map(name => <p key={name} className="admin-calendar-template-text">{values[name]?.text ?? `{{${name}}}`}</p>)}</section>}
            <div className="admin-composition-preview-field"><span>{saved ? "Saved template" : "Starter template"}{draft?.contentKey === template.contentKey ? " · including open editor changes" : ""}</span><p className="admin-calendar-template-text" aria-label="Rendered Calendar template">{segments.map((segment, index) => <span key={index} className={segment.value ? `admin-composition-variable variable-${segment.value.kind === "copy" ? "copy" : "fact"}` : segment.name ? "variable-unmapped" : undefined} title={segment.name ? `{{${segment.name}}} · ${segment.value?.kind === "fact" ? "Read-only ephemeris" : segment.value?.kind === "copy" ? "Saved writing" : segment.value ? "Example sign" : "Needs writing or a calculated value"}` : undefined}>{segment.text}</span>)}</p></div>
            {missing.length > 0 && <p role="note">Unfilled variables: {missing.map(name => `{{${name}}}`).join(", ")}. Opening and integration passages are not generated.</p>}
          </> : <p>The preview will appear when its facts and saved sources are ready.</p>}
        </div></div>}
    </StudioTabs>
  </section>;
}
