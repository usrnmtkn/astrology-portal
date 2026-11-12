import type { CalendarSkyEventSnapshot, LunarCalendarEvent } from "./ephemeris.js";
import { generatedContentParagraphs, loadFallbackArchitectureV3DashboardBundle, type LiveGeneratedContent } from "./generatedContent.js";
import type { SkyDetail } from "../features/sky/SkyDetailArticle.js";
import { cmsSurfaceKeys, resolveCmsSurfaceOverride } from "../content/cmsSurfaceOverrides.js";
import { contentPublicationRecords, publicationAllowsContent, publicationTimestamp } from "../content/contentPublicationState.js";
import { fallbackV3HookBody, skyV4ReaderRenderer } from "../content/fallbackArchitectureV3Runtime.js";
import { calendarMoonTransitionReading } from "../../../../src/shared/features/calendar/calendarMoonTransitionReading.js";
import { calendarTransitDetailContentKeys } from "../../../../src/shared/features/calendar/calendarContentKeys.js";
import { skyIngressEssayPublicationKeys } from "../content/skyIngressEssayPublicationKeys.js";
import { readerFacingParagraphs } from "../content/readerSafety.js";
import { calendarSkyEventRoute } from "./calendarSkyEventIdentity.js";
import { studioPassageEditHref } from "../../../../src/shared/studioPassageEdit.js";
import { prepareSkyPlacementSources, skyPlacementPublicationIdentity } from "./skyPlacementHydration.js";
import { assertRequiredSkyDetailContent, eligibleSkyDetailContent, loadSkyDetailContent } from "./skyDetailContent.js";
import { contentMatchesCalendarEventFacts } from "../features/calendar/calendarEventContentIdentity.js";

type PublicationScope = { keys: string[]; selection?: string };
export type CalendarSkyEventPublicationStamp = { routePath: string; scope: PublicationScope; identity: string };

function publicationIdentity(scope: PublicationScope) {
  const keys = new Set(scope.keys);
  return JSON.stringify([scope.selection ? skyPlacementPublicationIdentity(scope.selection) : null,
    contentPublicationRecords().filter(row => keys.has(row.content_key))
      .map(row => [row.content_key, row.state, row.revision, row.row_id, row.row_updated_at ? publicationTimestamp(row.row_updated_at) : null])
      .sort((a, b) => String(a[0]).localeCompare(String(b[0])))]);
}

export function calendarSkyEventDetailIsCurrent(stamp: CalendarSkyEventPublicationStamp | null, routePath: string) {
  return Boolean(stamp && stamp.routePath === routePath && stamp.identity === publicationIdentity(stamp.scope));
}

function eligibleCalendarContent(content: Map<string, LiveGeneratedContent>, eventKeys: string[]) {
  const eligible = eligibleSkyDetailContent(content);
  for (const key of eventKeys) {
    const row = eligible.get(key);
    if (row && !publicationAllowsContent(key, row.id, row.updatedAt)) eligible.delete(key);
  }
  return eligible;
}

/** Event source discovery stays off the initial App graph. */
export async function prepareCalendarSkyEventContent(calculated: CalendarSkyEventSnapshot,
  existing: Map<string, LiveGeneratedContent>, load: Parameters<typeof loadSkyDetailContent>[3],
  lunations: () => Promise<typeof import("../content/lunationArticleHoroscopes.js")>) {
  const { event, sky } = calculated;
  const slug = (value: string) => value.trim().toLowerCase().replace(/\s+/gu, "-");
  const placement = event.planet && event.planet !== "Moon"
    && !(event.planet === "Lilith" && /^station-/u.test(event.phase ?? ""));
  const specialKeys = calendarSpecialEventSourceKeys(event);
  const independent = event.type === "ingress" && event.planet === "Moon" || specialKeys.length > 0;
  const selection = placement ? `article:${slug(event.planet!)}/${slug(event.toSign ?? event.sign ?? "")}` : undefined;
  const sources = placement
    ? await prepareSkyPlacementSources(selection)
    // These complete units use their targeted publication keys and the already
    // loaded canonical Calendar/Sky bundles, without unrelated Sky inventory.
    : independent ? { coreBundle: undefined, placementBundle: null }
    : { coreBundle: await loadFallbackArchitectureV3DashboardBundle("sky-article"), placementBundle: null };
  const lunarKeys = event.type === "lunation" && !independent ? (await lunations()).lunationArticleSnapshotKeys(sky, event) : [];
  const ingressKeys = placement ? skyIngressEssayPublicationKeys(contentPublicationRecords(), {
    planet: slug(event.planet!), sign: slug(event.toSign ?? event.sign ?? "")
  }) : [];
  const eventKeys = calendarEventArticleSourceKeys(event);
  const keys = [...new Set([...eventKeys, ...(placement ? ingressKeys : event.type === "lunation" ? [...lunarKeys, ...specialKeys]
    : event.planet === "Moon" ? calendarTransitDetailContentKeys(event) : specialKeys)])];
  const content = eligibleCalendarContent(await loadSkyDetailContent(sky, eligibleCalendarContent(existing, eventKeys), keys, load, []), eventKeys);
  assertRequiredSkyDetailContent(content, keys);
  if ("identity" in sources && sources.identity !== skyPlacementPublicationIdentity(selection)) {
    throw new Error("Sky publications changed during loading.");
  }
  const scope = { keys, selection };
  return { ...sources, content, publication: { scope, identity: publicationIdentity(scope) } };
}

export function calendarSpecialEventDetail(event: LunarCalendarEvent, content: Map<string, LiveGeneratedContent>, timeZone: string): SkyDetail | null | undefined {
  const reading = calendarSpecialEventReading(event, content);
  if (reading === null) return undefined;
  if (!reading) return null;
  const source = calendarMoonTransitionReading(event, content);
  const exact = `Exact · ${new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit", timeZone: timeZone || "UTC" }).format(new Date(event.startsAt))}`;
  return { routePath: calendarSkyEventRoute(event)!, glyph: event.glyph, kicker: "", title: event.title,
    passageEditHref: source ? studioPassageEditHref({ surface: "calendar", sourceKey: source.key,
      date: event.dateKey, timeZone: timeZone || "UTC" }) : undefined,
    meta: exact, duration: exact, suppressTldr: true, plainBody: true, body: readerFacingParagraphs(reading.split(/\n\s*\n/u)),
    sections: [], historicalLookback: null, astrologyDrilldown: null };
}

export function calendarQuarterPhase(event: LunarCalendarEvent) {
  return event.type !== "lunation" ? null : /first quarter/iu.test(event.title) ? "first-quarter"
    : /last quarter|third quarter/iu.test(event.title) ? "last-quarter" : null;
}

export function calendarSpecialEventSourceKeys(event: LunarCalendarEvent) {
  const phase = calendarQuarterPhase(event);
  if (phase) return [...cmsSurfaceKeys.calendarDay("phase", phase), `fallback-hook/moon-phase/${phase}`];
  return event.type === "station" && event.planet === "Lilith" && /^station-/u.test(event.phase ?? "")
    ? ["sky-lilith/station"] : [];
}

/** Exact Calendar write-ups are complete units; generic card fallbacks stay separate. */
export function calendarEventArticleSourceKeys(event: LunarCalendarEvent) {
  if (!(event.type === "ingress" && event.planet && !["Sun", "Moon"].includes(event.planet)
    || event.type === "station" && /^station-(direct|retrograde)$/u.test(event.phase ?? ""))) return [];
  return calendarTransitDetailContentKeys(event).filter(key => key.startsWith("sky.") || key.startsWith("sky-")
    || key.startsWith("fallback-hook/sky.retrograde/"));
}

/** Preserve complete event-specific units instead of borrowing another event's article. */
export function calendarSpecialEventReading(event: LunarCalendarEvent, content: Map<string, LiveGeneratedContent>) {
  for (const key of calendarEventArticleSourceKeys(event)) {
    const row = content.get(key);
    if (row?.contentKey === key && (!row.targetDate || row.targetDate === (event.dateKey || event.startsAt.slice(0, 10)))
      && publicationAllowsContent(key, row.id, row.updatedAt) && contentMatchesCalendarEventFacts(event, row)) {
      return readerFacingParagraphs(generatedContentParagraphs(row)).join("\n\n");
    }
  }
  if (event.type === "ingress" && event.planet === "Moon") return calendarMoonTransitionReading(event, content)?.body ?? "";
  const phase = calendarQuarterPhase(event);
  if (phase) {
    const selected = resolveCmsSurfaceOverride(content, calendarSpecialEventSourceKeys(event));
    if (selected) return selected.body;
    const key = `fallback-hook/moon-phase/${phase}`;
    return publicationAllowsContent(key) ? fallbackV3HookBody(key) ?? "" : "";
  }
  if (event.type === "station" && event.planet === "Lilith" && /^station-/u.test(event.phase ?? "")) {
    const selected = resolveCmsSurfaceOverride(content, calendarSpecialEventSourceKeys(event));
    if (selected) return selected.body;
    if (!publicationAllowsContent("sky-lilith/station")) return "";
    const rendered = skyV4ReaderRenderer.renderRoute({ route: "lilith-station", stationSupported: true }) as { readerParts?: string[] };
    return rendered.readerParts?.join("\n\n") ?? "";
  }
  return null;
}
