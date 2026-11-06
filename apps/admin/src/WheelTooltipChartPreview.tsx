import { useEffect, useMemo, useState } from "react";
import { AdminSelect } from "./AdminNativeControls";
import { StudioButton, StudioInput, StudioTextarea } from "./StudioControls";
import { Stack } from "./studio-ds/primitives";
import { getSupabaseClient, getVerifiedAuthUser, isAuthSessionStorageKey } from "../../web/src/services/auth";
import { InteractiveZodiacWheel } from "../../../src/shared/components/charts/InteractiveZodiacWheel";
import { useWheelTooltipTemplates } from "../../../src/shared/components/charts/useWheelTooltipTemplates";
import { wheelTooltipDraftPreview, wheelTooltipPreviewTemplates, type WheelTooltipPreviewBody } from "../../web/src/content/wheelTooltipCopy";
import { wheelOrdinal, zodiacWheelFacts } from "../../web/src/services/zodiacWheelFacts";
import { wheelTooltipField, wheelTooltipFields, WHEEL_TOOLTIP_PREFIX, type WheelTooltipName } from "../../web/src/content/wheelTooltipCatalog";
import { wheelHouseForSource, wheelPreviewRuler, wheelSourceForHouse } from "./wheelTooltipWayfinding";
import { getAstrodienstSkyOffMainThread } from "../../web/src/services/skyCalculationClient";
import { zonedDateTimeToUtc } from "../../web/src/services/timezones";
import { natalSnapshotWithBirthTimeReliability } from "../../web/src/services/birthTimeReliability";
import type { ZodiacWheelSnapshot } from "../../web/src/services/zodiacWheelFacts";
import { wheelTooltipPreviewCharts, type WheelPreviewChart } from "./wheelTooltipPreviewCharts";

type Voice = "you" | "she" | "he" | "they" | "unspecified";
function initialVoice(key: string): Voice {
  for (const voice of ["she", "he", "they", "unspecified"] as const) if (key.endsWith(`possessive-${voice}`)) return voice;
  return key.endsWith("owner-friend") ? "they" : "you";
}

export default function WheelTooltipChartPreview({ contentKey, body, onChange, onSourceChange, pendingBodies, disabled }: { contentKey: string; body: string; onChange: (body: string) => void; onSourceChange: (key: string) => Promise<void>; pendingBodies: readonly WheelTooltipPreviewBody[]; disabled: boolean }) {
  const published = useWheelTooltipTemplates();
  const draft = useMemo(() => wheelTooltipDraftPreview(wheelTooltipPreviewTemplates(published, pendingBodies), contentKey, body), [published, pendingBodies, contentKey, body]);
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState<{ charts: WheelPreviewChart[]; error?: string }>();
  const [selectedId, setSelectedId] = useState("");
  const [voice, setVoice] = useState<Voice>(() => initialVoice(contentKey));
  const [house, setHouse] = useState<number>();
  const [calculated, setCalculated] = useState<{ chart: WheelPreviewChart; snapshot?: ZodiacWheelSnapshot; error?: string }>();

  useEffect(() => {
    const controller = new AbortController();
    let active = true, stop = () => {}, verifiedId: string | null | undefined;
    setLoaded(undefined); setCalculated(undefined); setSelectedId("");
    const invalidate = () => {
      if (!active) return;
      active = false; controller.abort(); setLoaded(undefined); setCalculated(undefined); setAttempt(value => value + 1);
    };
    const onStorage = (event: StorageEvent) => { if (isAuthSessionStorageKey(event.key)) invalidate(); };
    window.addEventListener("storage", onStorage);
    void (async () => {
      const client = await getSupabaseClient();
      if (!active) return;
      if (!client) throw new Error("Sign in through the app’s Login option to preview your chart and saved friends.");
      const { data } = client.auth.onAuthStateChange((_event, session) => {
        if (active && verifiedId !== undefined && (session?.user.id ?? null) !== verifiedId) {
          invalidate();
        }
      });
      stop = () => data.subscription.unsubscribe();
      const user = await getVerifiedAuthUser(client);
      if (!active) return;
      verifiedId = user?.id ?? null;
      if (!user) throw new Error("Sign in through the app’s Login option to preview your chart and saved friends.");
      // Browser publishable client + verified user's ownership filters + existing RLS.
      // These are reads only; avoid the manual-chart cache/sync write paths.
      const [profile, friends] = await Promise.all([
        client.from("user_profiles").select("data").eq("user_id", user.id).abortSignal(controller.signal).maybeSingle(),
        client.from("manual_charts").select("id,owner_user_id,display_name,birth_date,birth_time,birth_time_unknown,birth_place,birth_latitude,birth_longitude,birth_timezone")
          .eq("owner_user_id", user.id).order("display_name").abortSignal(controller.signal)
      ]);
      if (!active) return;
      if (profile.error || friends.error) throw new Error("Your charts could not be loaded. Please retry.");
      const charts = wheelTooltipPreviewCharts(profile.data?.data, friends.data ?? [], user.id);
      setLoaded({ charts });
      setSelectedId((charts.find(chart => chart.own && chart.subject.datetime.timeKnown) ?? charts.find(chart => chart.subject.datetime.timeKnown) ?? charts[0])?.id ?? "");
    })().catch(error => { if (active) setLoaded({ charts: [], error: error instanceof Error ? error.message : "Your charts could not be loaded." }); });
    return () => { active = false; controller.abort(); stop(); window.removeEventListener("storage", onStorage); };
  }, [attempt]);

  const selected = loaded?.charts.find(chart => chart.id === selectedId);
  useEffect(() => {
    if (!selected) return;
    let active = true;
    setCalculated(undefined); setHouse(undefined);
    void (async () => {
      const subject = selected.subject;
      if (!subject.datetime.time || !subject.datetime.timeZone) throw new Error("This chart needs a birth time and time zone.");
      const instant = zonedDateTimeToUtc(subject.datetime.date, subject.datetime.time, subject.datetime.timeZone);
      const sky = await getAstrodienstSkyOffMainThread({ ...subject.location, timeZone: subject.location.timeZone ?? undefined }, instant, { includeDailyEvents: false, includeTransitWindows: false, includeAspectTiming: false });
      const snapshot = natalSnapshotWithBirthTimeReliability(sky, subject.datetime.timeKnown === true);
      if (active && snapshot) setCalculated({ chart: selected, snapshot });
    })().catch(error => { if (active) setCalculated({ chart: selected, error: error instanceof Error ? error.message : "The chart could not be calculated." }); });
    return () => { active = false; };
  }, [selected, attempt]);
  const current = calculated?.chart === selected ? calculated : undefined;
  const facts = useMemo(() => current?.snapshot ? zodiacWheelFacts(current.snapshot, "natal", !selected?.subject.datetime.timeKnown) : null, [current?.snapshot, selected]);
  const field = wheelTooltipField(contentKey);
  const suggestedHouse = facts && field ? wheelHouseForSource(field.name, facts, 1) ?? 1 : 1;
  const activeHouse = house ?? suggestedHouse;
  const ruler = facts ? wheelPreviewRuler(facts, activeHouse) : undefined;
  useEffect(() => {
    if (!field) return;
    if (facts) setHouse(current => wheelHouseForSource(field.name, facts, current ?? 1) ?? current);
    if (field.name.startsWith("variables/") && !field.name.includes("house-ordinal")) setVoice(initialVoice(contentKey));
  }, [contentKey, facts]);
  const chooseHouse = (house: number) => {
    if (disabled || !facts || !field) return;
    setHouse(house);
    void onSourceChange(WHEEL_TOOLTIP_PREFIX + wheelSourceForHouse(field.name, facts, house));
  };
  const chooseSource = (source: WheelTooltipName, house: number) => {
    if (disabled) return;
    setHouse(house); void onSourceChange(WHEEL_TOOLTIP_PREFIX + source);
  };

  if (!field) return <p role="alert">Choose a registered wheel tooltip source.</p>;
  if (!loaded) return <p role="status">Loading your chart and saved friends…</p>;
  if (loaded.error) return <div role="alert"><p>{loaded.error}</p><StudioButton onClick={() => setAttempt(value => value + 1)}>Retry chart preview</StudioButton></div>;
  if (!loaded.charts.length) return <div role="status"><p>No saved charts with complete birth date and location are available. Add or finish a chart in You or Friends, then retry.</p><StudioButton onClick={() => setAttempt(value => value + 1)}>Retry chart preview</StudioButton></div>;
  return <div className="admin-template-two-column">
    <Stack gap="md">
      <div className="admin-daily-glance-context-form">
        <label><span>Tooltip group</span><AdminSelect aria-label="Preview tooltip group" disabled={disabled} value={field.group}
          onChange={event => void onSourceChange(wheelTooltipFields.find(field => field.group === event.target.value)!.key)}>
          {[...new Set(wheelTooltipFields.map(field => field.group))].map(group => <option key={group}>{group}</option>)}
        </AdminSelect></label>
        <label><span>Wording source</span><AdminSelect aria-label="Preview wording source" disabled={disabled} value={contentKey} onChange={event => void onSourceChange(event.target.value)}>
          {wheelTooltipFields.filter(source => source.group === field.group).map(source => <option key={source.key} value={source.key}>{source.label}</option>)}
        </AdminSelect></label>
      </div>
      <label><span>Preview wording</span><StudioTextarea aria-label="Preview wording" formatting={false} rows={2} value={body} disabled={disabled}
        onFocus={event => event.currentTarget.closest(".admin-template-two-column")?.scrollIntoView({ block: "start", inline: "nearest" })}
        onChange={event => onChange(event.target.value)} /></label>
      <div className="admin-daily-glance-context-form">
        <label><span>Chart</span><AdminSelect aria-label="Wheel preview chart" disabled={disabled} value={selectedId} onChange={event => setSelectedId(event.target.value)}>
          {loaded.charts.map(chart => <option key={chart.id} value={chart.id}>{chart.own ? "You" : chart.name}{!chart.subject.datetime.timeKnown ? " · Time unknown" : ""}</option>)}
        </AdminSelect></label>
        <label><span>Preview voice</span><AdminSelect aria-label="Wheel preview voice" disabled={disabled} value={voice} onChange={event => setVoice(event.target.value as Voice)}>
          <option value="you">You</option><option value="she">Friend · She</option><option value="he">Friend · He</option><option value="they">Friend · They</option><option value="unspecified">Friend · Unspecified pronouns</option>
        </AdminSelect></label>
        <label><span>House</span><AdminSelect aria-label="Wheel preview house" disabled={disabled || !facts?.hasHouses} value={activeHouse} onChange={event => chooseHouse(Number(event.target.value))}>
          {Array.from({ length: 12 }, (_, i) => <option key={i} value={i + 1}>{wheelOrdinal(i + 1)} house</option>)}
        </AdminSelect></label>
        <label><span>Ruler’s house</span><StudioInput aria-label="Wheel preview ruler house" readOnly value={ruler?.house ? `${wheelOrdinal(ruler.house)} house · ${ruler.name}` : "Unavailable"} /></label>
      </div>
      <p>Click a house, the ruler title, or its opening sentence to find the wording. Unsaved changes stay in this editor while you explore.</p>
      {draft.errors.length > 0 && <div role="alert" aria-label="Wheel preview wording errors"><p>Fix the wording to preview it on the wheel.</p><ul>{draft.errors.map(error => <li key={error}>{error}</li>)}</ul></div>}
    </Stack>
    <Stack gap="md" className="admin-wheel-preview-canvas">
      {facts?.hasHouses && wheelHouseForSource(field.name, facts, activeHouse) === null && <p role="status">This wording is not used by a house in this chart. Choose another source or chart.</p>}
      {!current && <p role="status">Calculating your chart…</p>}
      {current?.error && <div role="alert"><p>{current.error}</p><StudioButton onClick={() => setAttempt(value => value + 1)}>Retry chart preview</StudioButton></div>}
      {current?.snapshot && draft.templates && <>
        {!selected?.subject.datetime.timeKnown && <p role="status">Birth time is unknown. Houses and house ruler tooltips cannot be previewed for this chart.</p>}
        <InteractiveZodiacWheel snapshot={current.snapshot} mode="natal" birthTimeUnknown={!selected?.subject.datetime.timeKnown}
          ownerName={voice === "you" ? undefined : selected?.name} pronouns={voice === "you" || voice === "unspecified" ? undefined : voice}
          tooltipPreview={{ templates: draft.templates, house: activeHouse, source: field.name, disabled, onHouseChange: chooseHouse, onSourcePick: chooseSource }} />
      </>}
    </Stack>
  </div>;
}
