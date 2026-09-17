import { useEffect, useMemo, useState } from "react";
import { PageLoading } from "../../web/src/components/PageLoading";
import { AdminSelect } from "./AdminNativeControls";
import { StudioButton, StudioInput, StudioTabs } from "./StudioControls";
import { lunarSigns, lunarContentIdentity } from "./lunarCalendarContent";
import { skyForecastTemplates, type SkyForecastPeriod } from "./skyForecastTemplates";
import { calendarOverviewFields, calendarOverviewPattern, calendarOverviewWriting, calendarSeasonVariables, calendarSeasonSourceKey, calendarVariableColor } from "./calendarOverviewTemplate";
import { calendarTemplateDefinitionInputs, calendarTemplateDefinitions } from "./calendarTemplateDefinitions";
import CalendarVariableText from "./CalendarVariableText";
import type { CalendarPreviewCalculation } from "./calendarPreviewCalculation";
import { calendarMoonPassages, calendarPreviewSeasons, calendarPreviewSign, calendarPreviewSourceKeys, calendarPreviewValues, calendarResolveOverviewField, calendarTemplateSegments, calendarContextualVariableNames, type CalendarPreviewRow, type CalendarPreviewValue } from "./calendarPreviewModel";

export type CalendarTemplatePreviewProps = {
  period: SkyForecastPeriod;
  rows: CalendarPreviewRow[];
  loadRows: (keys: string[]) => Promise<CalendarPreviewRow[]>;
  draft?: { contentKey: string; body: string; sections?: unknown } | null;
  onEditSource: (row: CalendarPreviewRow) => void;
  onEditOverview: (field: string) => void;
};
const dateInput = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}T${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;

export default function CalendarTemplatePreview({ period, rows, loadRows, draft, onEditSource, onEditOverview }: CalendarTemplatePreviewProps) {
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
  const seasons = calendarPreviewSeasons(calculation);
  const sourceKeys = calendarPreviewSourceKeys(period, [sunSign, moonSign, seasons.opening?.sign ?? "", seasons.closing?.sign ?? "", ...(calculation?.days.map(day => day.moonSign) ?? [])]);
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
    const keys: string[] = JSON.parse(keysJson);
    // The owner API accepts at most 64 exact keys; a full month spans all 12 signs.
    const batches = Array.from({ length: Math.ceil(keys.length / 64) }, (_, index) => keys.slice(index * 64, (index + 1) * 64));
    void Promise.all(batches.map(keys => loadRows(keys))).then(rows => { if (active) setLoaded({ key: sourceKey, rows: rows.flat() }); })
      .catch(reason => { if (active) setLoaded({ key: sourceKey, error: reason instanceof Error ? reason.message : "Could not load saved writing." }); });
    return () => { active = false; };
  }, [sourceKey, loadRows]);
  const baseValues = useMemo(() => calendarPreviewValues({ sunSign, moonSign, calculation,
    rows: (sources ?? []).map(row => row.content_key === draft?.contentKey ? { ...row, body: draft.body, sections: draft.sections } : row), moonKey
  }), [sunSign, moonSign, calculation, sources, moonKey, draft]);
  const template = skyForecastTemplates[period];
  const saved = sources?.find(row => row.content_key === template.contentKey);
  const templateSections = draft?.contentKey === template.contentKey ? draft.sections : saved?.sections;
  const pattern = draft?.contentKey === template.contentKey ? draft.body : saved?.body ?? calendarOverviewPattern(period);
  const writing = calendarOverviewWriting(templateSections);
  const overviewFields = calendarOverviewFields(period);
  const definitions = (() => {
    try { return calendarTemplateDefinitions(templateSections); } catch { return {}; }
  })();
  const definitionInputs = calendarTemplateDefinitionInputs(definitions);
  const reservedNames = new Set([...Object.keys(baseValues), ...overviewFields.map(field => field.name), ...calendarSeasonVariables]);
  const phraseValues: Record<string, CalendarPreviewValue> = Object.fromEntries(Object.entries(definitionInputs.phrases)
    .filter(([name]) => !reservedNames.has(name))
    .map(([name, text]) => [name, { text, kind: "copy", sourceKey: template.contentKey }]));
  const customTemplates = Object.fromEntries(Object.entries(definitionInputs.templates).filter(([name]) => !reservedNames.has(name)));
  const nestedTemplates = { ...customTemplates, ...writing };
  const leafValues: Record<string, CalendarPreviewValue> = { ...phraseValues, ...baseValues };
  const values: Record<string, CalendarPreviewValue> = { ...leafValues };
  for (const field of overviewFields) {
    if (writing[field.name]?.trim()) values[field.name] = { text: calendarResolveOverviewField(field.name, writing[field.name], leafValues, nestedTemplates, calculation), kind: "copy", sourceKey: template.contentKey };
  }
  if (writing.planetaryHighlights?.trim()) values.hasPlanetaryHighlights = { text: "yes", kind: "copy", sourceKey: template.contentKey };
  if (writing.lunationConnection?.trim()) values.hasLunationConnection = { text: "yes", kind: "copy", sourceKey: template.contentKey };
  const passages = calendarMoonPassages(sources ?? [], moonSign);
  const segments = calendarTemplateSegments(pattern, values, customTemplates);
  const missing = [...new Set([...segments.map(segment => segment.text).join("").matchAll(/\{\{\s*([\w.]+)\s*\}\}/gu)].map(match => match[1]))];
  const availableNames = [...new Set([...calendarSeasonVariables, ...Object.keys(values), ...overviewFields.map(field => field.name)])]
    .filter(name => !calendarContextualVariableNames.includes(name as typeof calendarContextualVariableNames[number]));
  const ready = Boolean(sources) && (mode === "signs" || Boolean(calculation));
  return <section className="admin-template-reader-drilldown studio-surface" aria-label="Calendar template preview">
    <header className="admin-section-heading-row"><div><h4>Template preview</h4><p>Choose signs or a date to preview the template. Open the template to write the overview passages and insert zodiac season variables.</p></div></header>
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
    {!sources && !sourceError && <PageLoading message="Loading the full saved template and matching passages…" />}
    <StudioTabs label="Calendar template views" value={view} onValueChange={setView} tabs={[{ value: "preview", label: "Preview" }, { value: "pattern", label: "Template pattern" }, { value: "variables", label: "Variables" }]}>
      {view === "pattern" ? <div className="admin-composition-preview-field"><span>{draft?.contentKey === template.contentKey ? "Open editor pattern" : saved ? "Saved template pattern" : "Starter template pattern"}</span><p className="admin-calendar-template-text" aria-label="Calendar template pattern">{sources ? <CalendarVariableText text={pattern} /> : "Loading saved template…"}</p></div>
        : view === "variables" ? <div className="admin-editor-guidance admin-calendar-variables"><p>Select Edit passage to change reusable writing, or Write passage to fill an overview field. Changes appear in the preview while you edit; Save keeps them. Dates and positions update from the ephemeris.</p>
          {calculation && !seasons.closing && <p role="note">No zodiac season change in this period. Closing-season variables are not needed.</p>}
          <p>Names such as signTitle, entryDate, exitDate, and eventDate follow the passage they appear in: the opening season, incoming season, New Moon, Full Moon, or eclipse.</p>
          <table className="admin-data-table" aria-label="Calendar preview variables"><thead><tr><th scope="col">Variable</th><th scope="col">Writing or value</th><th scope="col">Edit</th></tr></thead><tbody>{availableNames.filter(name => !calculation || seasons.closing || !/^(closing|seasonChangeDate)/u.test(name)).map(name => {
          const value = values[name];
          const sourceKey = value?.sourceKey ?? calendarSeasonSourceKey(name, sunSign, values.openingSeasonSign?.text ?? "", values.closingSeasonSign?.text ?? "");
          const field = overviewFields.find(field => field.name === name);
          const source = sources?.find(row => row.content_key === sourceKey);
          const unavailable = field ? field.help : sourceKey ? "Add or edit the shared passage for this sign." : mode === "signs" ? "Choose Use ephemeris to calculate dates and season changes." : "This fact is not available for the selected period.";
          const kind = value?.kind === "fact" ? "Read-only ephemeris" : value?.kind === "example" ? "Example sign" : value?.sourceLabel ?? (value ? "Saved writing" : field || sourceKey ? "Needs writing" : "Unavailable");
          return <tr key={name}><th scope="row"><code className="admin-composition-variable-token" data-variable-name={name} data-variable-color={calendarVariableColor(name)}>{`{{${name}}}`}</code><span className="admin-field-hint">{kind}</span></th>
            <td><p className="admin-calendar-template-text">{value?.text ?? unavailable}</p></td>
            <td>{field ? <StudioButton onClick={() => onEditOverview(field.name)} aria-label={`Edit ${name}`}>{value ? "Edit passage" : "Write passage"}</StudioButton>
              : source ? <StudioButton onClick={() => onEditSource(source)} aria-label={`Edit ${name}`}>Edit passage</StudioButton>
              : <span className="admin-field-hint">{value?.kind === "example" ? "Use sign selectors above" : sourceKey ? "Choose a sign and refresh sources" : "Calculated automatically"}</span>}</td></tr>; })}</tbody></table></div>
        : <div className="admin-template-reader-surface"><div className="admin-template-reader-copy">
          {ready ? <>

            <div className="admin-composition-preview-field"><span>{saved ? "Saved template" : "Starter template"}{draft?.contentKey === template.contentKey ? " · including open editor changes" : ""}</span><p className="admin-calendar-template-text" aria-label="Rendered Calendar template">{segments.map((segment, index) => <span key={index} data-variable-name={segment.name} data-variable-color={segment.name ? calendarVariableColor(segment.name) : undefined} className={segment.value ? `admin-composition-variable variable-${segment.value.kind === "copy" ? "copy" : "fact"}` : segment.name ? "admin-composition-variable variable-unmapped" : undefined} title={segment.name ? `{{${segment.name}}} · ${segment.value?.kind === "fact" ? "Read-only ephemeris" : segment.value?.kind === "copy" ? "Saved writing" : segment.value ? "Example sign" : "Needs writing or a calculated value"}` : undefined}>{segment.text}</span>)}</p></div>
            {missing.length > 0 && <p role="note">Unfilled variables: {missing.map(name => `{{${name}}}`).join(", ")}. Open the template to fill the overview passages. Missing season passages can be written in the shared Zodiac season sources.</p>}
          </> : <p>The preview will appear when its facts and saved sources are ready.</p>}
        </div></div>}
    </StudioTabs>
  </section>;
}