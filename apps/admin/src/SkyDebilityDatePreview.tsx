import { useEffect, useState } from "react";
import { AdminDisclosureSummary } from "./AdminNativeControls";
import { StudioButton, StudioInput } from "./StudioControls";
import { readGeneratedContentRows } from "./generatedContentClient";
import type { SummaryCompositionRow } from "./skySummaryComposition";
import { getInitialLocation } from "../../web/src/services/skySelection";
import { SkyDebilityInline } from "../../web/src/content/skyDebilityInline";
import { presentSkyDebilityParts, skyDebilityPlacementLinks, skyDebilityTemplateParts, type SkyDebilityDisplayPosition } from "../../web/src/content/skyDebilityPresentation";
import { assembleSkyDebilityDraftPreview, skyDebilityPreviewInstant, skyDebilityPreviewRange, skyDebilityReviewDraftPrefix, verifiedSkyDebilityPreviewPositions } from "./skyDebilityDateSelection";

function previewParameters() { return new URLSearchParams(window.location.hash.split("?")[1] ?? ""); }
function rememberDate(date: string, time: string) {
  const url = new URL(window.location.href);
  const params = previewParameters();
  params.set("previewDate", date); params.set("previewTime", time);
  url.hash = `${url.hash.split("?")[0]}?${params}`;
  window.history.replaceState(null, "", url);
}

export function SkyDebilityDatePreview({ secret, rows, onOpen, busy }: {
  secret: string;
  rows: SummaryCompositionRow[];
  onOpen: (row: SummaryCompositionRow & { id: string }) => void;
  busy: boolean;
}) {
  const [open, setOpen] = useState(() => previewParameters().has("previewDate"));
  const [location] = useState(() => getInitialLocation().location);
  const timeZone = location.timeZone || "UTC";
  const range = skyDebilityPreviewRange(new Date(), timeZone);
  const [date, setDate] = useState(() => previewParameters().get("previewDate") || range.min);
  const [time, setTime] = useState(() => previewParameters().get("previewTime") || "12:00");
  const [attempt, setAttempt] = useState(0);
  const [sources, setSources] = useState<{ secret: string; attempt: number; rows: SummaryCompositionRow[]; error?: string }>();
  const [calculated, setCalculated] = useState<{ key: string; positions?: SkyDebilityDisplayPosition[]; instant?: string; error?: string }>();
  const calculationKey = `${date}|${time}|${timeZone}|${attempt}`;
  const current = calculated?.key === calculationKey ? calculated : undefined;
  const loaded = sources?.secret === secret && sources.attempt === attempt ? sources : undefined;

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    const params = new URLSearchParams({ contentKeyPrefix: skyDebilityReviewDraftPrefix, status: "DRAFT", visibility: "all", view: "detail", limit: "80" });
    void readGeneratedContentRows(`/api/admin/generated-content-inventory?${params}`, secret, controller.signal)
      .then(value => { if (!controller.signal.aborted) setSources({ secret, attempt, rows: value as SummaryCompositionRow[] }); })
      .catch(reason => { if (!controller.signal.aborted) setSources({ secret, attempt, rows: [], error: reason instanceof Error ? reason.message : "Saved drafts could not be loaded." }); });
    return () => controller.abort();
  }, [open, secret, attempt]);

  useEffect(() => {
    if (!open) return;
    let active = true;
    void (async () => {
      const instant = skyDebilityPreviewInstant(date, time, timeZone, range);
      const { getAstrodienstSkyOffMainThread } = await import("../../web/src/services/skyCalculationClient");
      const sky = await getAstrodienstSkyOffMainThread(location, instant, { includeDailyEvents: false, includeTransitWindows: false, includeAspectTiming: false });
      const positions = verifiedSkyDebilityPreviewPositions(sky, instant.toISOString());
      if (active) setCalculated({ key: calculationKey, positions, instant: instant.toISOString() });
    })().catch(reason => { if (active) setCalculated({ key: calculationKey, error: reason instanceof Error ? reason.message : "This sky could not be calculated." }); });
    return () => { active = false; };
  }, [open, calculationKey, location, range.min, range.max]);

  const latest = new Map(rows.filter(row => !row.inventory_only).map(row => [row.id, row]));
  const saved = loaded?.rows.map(row => {
    const update = latest.get(row.id);
    return update && (update.updated_at ?? "") >= (row.updated_at ?? "") ? { ...row, ...update } : row;
  }) ?? [];
  let result: ReturnType<typeof assembleSkyDebilityDraftPreview> | undefined;
  let error = current?.error || loaded?.error || "";
  if (!error && current?.positions && loaded) {
    try { result = assembleSkyDebilityDraftPreview(current.positions, saved); }
    catch (reason) { error = reason instanceof Error ? reason.message : "This draft could not be previewed."; }
  }
  const loading = open && !error && (!current || !loaded);
  const copy = result?.copy;
  const links = copy ? skyDebilityPlacementLinks(copy.allPlacementKeys, current?.positions, "reading") : [];
  return <details open={open} className="admin-workspace-details" data-testid="sky-debility-date-preview" onToggle={event => {
    const next = event.currentTarget.open;
    if (next && !open) setAttempt(value => value + 1);
    setOpen(next);
  }}>
    <AdminDisclosureSummary>Preview by date</AdminDisclosureSummary>
    <p>Choose a date in the next 12 months to see the saved draft matching every qualifying planet, sign, and motion. This simulates the exact reading selection; these drafts are not published on the Sky page.</p>
    <div className="admin-daily-glance-context-form">
      <label><span>Preview date</span><StudioInput type="date" aria-label="Dignity preview date" min={range.min} max={range.max} value={date}
        onChange={event => { setDate(event.target.value); rememberDate(event.target.value, time); }} /></label>
      <label><span>Time · {timeZone}</span><StudioInput type="time" aria-label="Dignity preview time" value={time}
        onChange={event => { setTime(event.target.value); rememberDate(date, event.target.value); }} /></label>
    </div>
    <p>The preview starts at noon. Change the time to check a sign change or station within the day.</p>
    <StudioButton disabled={loading} onClick={() => setAttempt(value => value + 1)}>Refresh date preview</StudioButton>
    {loading && <p role="status">Calculating sky and loading saved drafts…</p>}
    {error && <p role="alert">{error}</p>}
    {!error && result && <>
      <p>{result.snapshot.count === 0 ? "No qualifying planets" : result.snapshot.count === 1 ? "One-planet reading" : `${result.snapshot.count} planets · Combined reading`} · {date} at {time} · {timeZone}</p>
      <ul aria-label="Calculated qualifying placements">{result.snapshot.planets.map(planet => <li key={planet.planet}>
        {planet.planet}{current?.positions?.find(row => row.planet === planet.planet)?.motion === "retrograde" ? " retrograde" : " direct"} in {planet.sign} · {planet.dignities.join(" and ")}
      </li>)}</ul>
      {!result.snapshot.count ? <p role="status">No planets are in detriment or fall at this time. The Sky page hides this section.</p>
        : !result.row ? <p role="status">No saved draft matches this complete sky. A reading for a smaller set or different motion is not substituted.</p>
        : copy && <>
          <div className="admin-template-reader-surface">
            <div className="admin-composition-preview-chrome"><span>Exact reading preview</span><span>Saved draft · Not published</span></div>
            <div className="admin-template-reader-copy">
              <section className="admin-composition-preview-field field-body" aria-label="Date-selected dignity reading" data-testid="sky-debility-date-reading">
                <h4>{copy.openingHook}</h4>
                {copy.paragraphTemplates.map((template, index) => <p key={index}><SkyDebilityInline
                  parts={presentSkyDebilityParts(skyDebilityTemplateParts(template, copy.slots), links)} linkPrefix="/" linkTarget="_blank" /></p>)}
              </section>
            </div>
          </div>
          <StudioButton disabled={busy} onClick={() => { if (result?.row?.id) onOpen({ ...result.row, id: result.row.id }); }}>Open selected draft</StudioButton>
        </>}
      <details className="admin-workspace-details admin-editor-key-details"><AdminDisclosureSummary>Selection details</AdminDisclosureSummary>
        <p>Calculated with the Sky page’s Swiss Ephemeris engine. All seven classical planets are checked; Mercury in Pisces counts once with both conditions.</p>
        <p>Reference instant: {current?.instant}</p>
        {result.key && <p>Exact target: <code>{result.key}</code></p>}
        {result.row && <p>Saved source: <code>{result.row.content_key}</code></p>}
      </details>
    </>}
  </details>;
}
