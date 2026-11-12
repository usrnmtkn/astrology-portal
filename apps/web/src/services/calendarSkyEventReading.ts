import type { CalendarSkyEventSnapshot, LunarCalendarEvent } from "./ephemeris.js";
import { generatedContentParagraphs, loadFallbackArchitectureV3DashboardBundle, loadLiveGeneratedContentForKeys, type LiveGeneratedContent } from "./generatedContent.js";
import type { SkyDetail } from "../features/sky/SkyDetailArticle.js";
import { cmsSurfaceKeys, resolveCmsSurfaceOverride } from "../content/cmsSurfaceOverrides.js";
import { contentPublication, contentPublicationRecords, publicationAllowsContent, publicationTimestamp } from "../content/contentPublicationState.js";
import { fallbackV3HookBody, skyV4ReaderRenderer } from "../content/fallbackArchitectureV3Runtime.js";
import { calendarMoonTransitionReading } from "../../../../src/shared/features/calendar/calendarMoonTransitionReading.js";
import { calendarTransitDetailContentKeys } from "../../../../src/shared/features/calendar/calendarContentKeys.js";
import { skyIngressEssayPublicationKeys } from "../content/skyIngressEssayPublicationKeys.js";
import { readerFacingParagraphs } from "../content/readerSafety.js";
import { calendarSkyEventRoute } from "./calendarSkyEventIdentity.js";
import { calendarEventPassageEditHref } from "../../../../src/shared/calendarEventPassageEdit.js";
import { studioPassageEditHref } from "../../../../src/shared/studioPassageEdit.js";
import { prepareSkyPlacementSources, skyPlacementPublicationIdentity } from "./skyPlacementHydration.js";
import { assertRequiredSkyDetailContent, eligibleSkyDetailContent, loadSkyDetailContent } from "./skyDetailContent.js";
import { calendarEventArticleSourceKeys, contentMatchesCalendarEventFacts } from "../features/calendar/calendarEventContentIdentity.js";
export { calendarEventArticleSourceKeys } from "../features/calendar/calendarEventContentIdentity.js";

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

const freshDatedEventRows = new WeakSet<LiveGeneratedContent>();
function eventHasPublicationPin(row: LiveGeneratedContent) {
  const publication = contentPublication(row.contentKey);
  return Boolean(publication?.row_id || publication?.row_updated_at);
}
function calendarEventPublicationAllows(row: LiveGeneratedContent) {
  const pinned = eventHasPublicationPin(row);
  return (!row.targetDate || pinned || freshDatedEventRows.has(row))
    && publicationAllowsContent(row.contentKey, row.id, row.updatedAt, pinned ? null : row.targetDate);
}

function eligibleCalendarContent(content: Map<string, LiveGeneratedContent>, eventKeys: string[], fresh = false) {
  const eligible = eligibleSkyDetailContent(content);
  for (const key of eventKeys) {
    const row = eligible.get(key);
    if (row && (row.targetDate && !eventHasPublicationPin(row) && !fresh || !calendarEventPublicationAllows(row))) eligible.delete(key);
  }
  return eligible;
}

/** One deduplicated request; pinless dated units need fresh canonical proof. */
export async function loadCalendarEventArticleContent(event: LunarCalendarEvent, existing: Map<string, LiveGeneratedContent>,
  keys: string[], load: typeof loadLiveGeneratedContentForKeys) {
  const eventKeys = calendarEventArticleSourceKeys(event);
  const retained = eligibleCalendarContent(existing, eventKeys);
  const missing = [...new Set(keys)].filter(key => !retained.has(key));
  if (!missing.length) return retained;
  const requireFresh = missing.some(key => eventKeys.includes(key));
  const incoming = await load(missing, { requireFresh });
  if (requireFresh) for (const [key, row] of incoming) {
    if (missing.includes(key) && eventKeys.includes(key) && row.contentKey === key && row.targetDate
      && contentMatchesCalendarEventFacts(event, row)) freshDatedEventRows.add(row);
  }
  return eligibleCalendarContent(new Map([...retained, ...incoming]), eventKeys, true);
}

/** Event source discovery stays off the initial App graph. */
export async function prepareCalendarSkyEventContent(calculated: CalendarSkyEventSnapshot,
  existing: Map<string, LiveGeneratedContent>, load: typeof loadLiveGeneratedContentForKeys,
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
  let content: Map<string, LiveGeneratedContent>;
  try {
    content = eventKeys.length ? await loadCalendarEventArticleContent(event, existing, keys, load)
      : await loadSkyDetailContent(sky, eligibleSkyDetailContent(existing), keys, load, []);
  } catch (error) {
    const required = eventKeys.some(key => {
      const row = existing.get(key), publication = contentPublication(key);
      return publication?.state === "live" && (publication.row_id || publication.row_updated_at)
        || row?.targetDate && row.contentKey === key && contentMatchesCalendarEventFacts(event, row)
          && publicationAllowsContent(key, row.id, row.updatedAt, row.targetDate);
    });
    if (!independent || required) throw error;
    content = eligibleSkyDetailContent(existing);
    // An independent canonical unit may recover without remote discovery;
    // no unverified exact event row is allowed to supply that fallback.
    for (const key of eventKeys) content.delete(key);
  }
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
  const eventKey = calendarEventArticleSource(event, content)?.key;
  const exact = `Exact · ${new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit", timeZone: timeZone || "UTC" }).format(new Date(event.startsAt))}`;
  return { routePath: calendarSkyEventRoute(event)!, glyph: event.glyph, kicker: "", title: event.title,
    passageEditHref: eventKey ? calendarEventPassageEditHref({ kind: event.type === "ingress" ? "ingress" : "station",
      sourceKey: eventKey, date: event.dateKey, timeZone: timeZone || "UTC" })
      : source ? studioPassageEditHref({ surface: "calendar", sourceKey: source.key,
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

function calendarEventArticleSource(event: LunarCalendarEvent, content: Map<string, LiveGeneratedContent>) {
  for (const key of calendarEventArticleSourceKeys(event)) {
    const row = content.get(key);
    if (row?.contentKey === key && calendarEventPublicationAllows(row) && contentMatchesCalendarEventFacts(event, row)) {
      return { key, body: readerFacingParagraphs(generatedContentParagraphs(row)).join("\n\n") };
    }
  }
  return null;
}

/** Preserve complete event-specific units instead of borrowing another event's article. */
export function calendarSpecialEventReading(event: LunarCalendarEvent, content: Map<string, LiveGeneratedContent>) {
  const article = calendarEventArticleSource(event, content);
  if (article) return article.body;
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
