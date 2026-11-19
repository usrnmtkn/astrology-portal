import initial from "../../apps/web/src/content/fallbackArchitectureV3/bundled-initial-reader-rows-v3.json" with { type: "json" };
import core from "../../apps/web/src/content/fallbackArchitectureV3/bundled-sky-core-rows-v3.json" with { type: "json" };
import deferred from "../../apps/web/src/content/fallbackArchitectureV3/bundled-deferred-core-rows-v3.json" with { type: "json" };
import calendar from "../../apps/web/src/content/fallbackArchitectureV3/bundled-calendar-rows-v3.json" with { type: "json" };
import shared from "../../apps/web/src/content/fallbackArchitectureV3/bundled-shared-placement-rows-v3.json" with { type: "json" };
import placements from "../../apps/web/src/content/fallbackArchitectureV3/bundled-sky-placement-rows-v3.json" with { type: "json" };
import cards from "../../apps/web/src/content/fallbackArchitectureV3/bundled-sky-authored-cards-v3.json" with { type: "json" };
import knowledge from "../../packages/astro-knowledge/dist/sky-runtime-web.json" with { type: "json" };
// The same shipped resolver and approved reader partitions used by Calendar.
// @ts-ignore Generated artifact exposes its runtime contract without declarations.
import { createTransitSynastryRenderer, SourceGapError } from "../../apps/web/src/content/fallbackArchitectureV3/dist/tldr-content.js";
import { isGovernedReaderEligible } from "../../apps/web/src/content/fallbackArchitectureV3/resolver/readerEligibility.browser.js";
import { publicationAllowsContent, type ContentPublication } from "../../apps/web/src/content/contentPublicationState.js";
import { createDomainRegistry } from "../../apps/web/src/content/domainRegistry.js";
import { isReaderFacingCopy } from "../../apps/web/src/content/readerSafety.js";
import { resolveApprovedExactSkyAspectCopy, resolveComposedSkyCalendarCard, selectSkyAspectCopyByPrecedence } from "../../apps/web/src/services/skyAspectRouting.js";
import { resolveCalendarAspectPublication } from "../../apps/web/src/features/calendar/calendarAspectPublication.js";
import { canonicalContentStudioExactSkyPoint, contentStudioExactSkyAspectKeys, contentStudioExactRow, resolveSkyAspectContentStudioExact, resolveSkyAspectOwnerAuthoredSigned, resolveSkyAspectGeneratedContent } from "../../apps/web/src/services/skyAspectContent.js";
import { fromRow, isReaderServableGeneratedContent } from "../../apps/web/src/services/generatedContentRendering.js";
import type { GeneratedContentRow, LiveGeneratedContent } from "../../apps/web/src/services/generatedContent.js";
import { moonSignTransitionForPair, moonSignTransitionKey } from "../../apps/web/src/features/calendar/moonSignTransitions.js";
import type { LunarCalendarEvent } from "../../apps/web/src/services/ephemeris.js";
import { skyPlacementSourceCorpus } from "./sky-placement-sources.js";
import { createPublishedSkyReader } from "../../apps/web/src/content/skyPlacementPublishedSources.js";
import { isReaderServableGeneratedContentRow, isGeneratedContentReaderBoundaryAllowed } from "../../apps/web/src/content/generatedContentEligibility.js";
import { resolveCalendarLunationAspectReading } from "../../apps/web/src/content/skyLunationAspectReading.js";
import { isRetiredCompositionKey } from "../../apps/web/src/content/fallbackArchitectureV3/resolver/retiredCompositions.mjs";

const registry = createDomainRegistry(knowledge as any);
const slug = (value: string) => value.trim().toLowerCase().replace(/\s+/gu, "-");
const partitions = [initial, core, deferred, calendar, shared, placements, cards] as Record<string, any[]>[];
const buckets = ["authoredCards", "hookRows", "vocabularyRows", "templates"] as const;
export const calendarWeekCopyKeys = ["quiet", "standard", "headliner", "station", "new-moon", "full-moon"].map(key => `authored/week-opener/${key}`);

/** Request-scoped lifecycle filtering: one subscriber must not change global reader state. */
export function calendarFeedCopyReader(publications: ReadonlyMap<string, ContentPublication>, publishedRows: Record<string, any>[] = []) {
  const allowed = (key: string) => publicationAllowsContent(key, undefined, undefined, undefined, publications);
  // Variable imports do not replace the approved article. Keep ineligible
  // article revisions visible to the shared reader so they block stale copy.
  const canonicalSources = publishedRows.filter(row => row.sections?.packageRecord?.contentKey === row.content_key
    && row.sections.packageRecord.studio_version_status === "approved-serving-revision")
    .map(row => ({ ...row.sections.packageRecord,
      review_status: row.status === "LIVE" && row.lane === "serving" && !row.review_state && !row.sections.packageDraft
        && isReaderServableGeneratedContentRow({ ...row, content_key: row.content_key }) ? row.sections.packageRecord.review_status : "needs_review",
      publicationRowId: row.id, publicationRowUpdatedAt: row.updated_at }));
  const canonicalReader = createPublishedSkyReader(skyPlacementSourceCorpus, undefined, () => canonicalSources, publications);
  const data = Object.fromEntries(buckets.map(bucket => [bucket,
    [...new Map(partitions.flatMap(partition => partition[bucket] ?? []).map(row => [row.contentKey, row])).values()]
      .filter(row => isGovernedReaderEligible(row) && allowed(row.contentKey))
  ])) as Record<typeof buckets[number], any[]>;
  const renderer = createTransitSynastryRenderer({ authoredCards: data.authoredCards }, { templates: data.templates },
    { hookRows: data.hookRows, vocabularyRows: data.vocabularyRows },
    { blockedContentKeys: [...publications.keys()].filter(key => !allowed(key)) });
  const hook = (key: string) => data.hookRows.find(row => row.contentKey === key);
  const safe = (body: string | undefined) => body && isReaderFacingCopy(body) && !/\{\{[^]*?\}\}/u.test(body) ? body : "";
  const eligibleRows = publishedRows.filter(row => row.status === "LIVE" && row.lane === "serving" && !row.review_state && !row.sections?.packageDraft
    && isReaderServableGeneratedContentRow(row as GeneratedContentRow) && isGeneratedContentReaderBoundaryAllowed(row as GeneratedContentRow)
    && publicationAllowsContent(row.content_key, row.id, row.updated_at, row.target_date, publications))
    .sort((a, b) => Number(Boolean(b.target_date)) - Number(Boolean(a.target_date)) || b.updated_at.localeCompare(a.updated_at));
  function publishedContentForDate(date: string) {
    const content = new Map<string, LiveGeneratedContent>();
    for (const row of eligibleRows) {
      if (content.has(row.content_key) || row.target_date && row.target_date !== date) continue;
      const value = fromRow(row as GeneratedContentRow);
      if (isReaderServableGeneratedContent(value)) content.set(row.content_key, value);
    }
    return content;
  }
  function eventBody(event: LunarCalendarEvent, timeZone: string, events: LunarCalendarEvent[]) {
    const dateLine = `On ${new Intl.DateTimeFormat("en-US", { timeZone, weekday: "long", month: "long", day: "numeric" }).format(new Date(event.startsAt))}`;
    const quarterPhase = event.type === "lunation" && /quarter/iu.test(event.title)
      ? /first/iu.test(event.title) ? "first-quarter" : "last-quarter" : null;
    if (event.type === "ingress" && event.planet === "Moon") {
      const key = moonSignTransitionKey(event.fromSign ?? "", event.toSign ?? event.sign ?? "");
      return allowed(key) ? moonSignTransitionForPair(event.fromSign ?? "", event.toSign ?? event.sign ?? "") : "";
    }
    if (quarterPhase) {
      const row = hook(`fallback-hook/moon-phase/${quarterPhase}`);
      return safe(row?.body_you?.replaceAll("{{signTitle}}", event.sign ?? ""));
    }
    const canonicalInput = event.type === "lunation" && event.sign
      ? event.eclipseType
        ? { route: "eclipse", exactEventKey: `sky-lunation/${event.eclipseType}-eclipse/${event.startsAt.slice(0, 10)}-${slug(event.sign)}` }
        : { route: /new moon/iu.test(event.title) ? "new-moon" : "full-moon", sign: slug(event.sign) }
      : event.type === "ingress" && event.planet && (event.toSign || event.sign)
        ? { route: "placement", planet: slug(event.planet), sign: slug(event.toSign ?? event.sign!) }
        : event.type === "station" && event.planet === "Lilith" ? { route: "lilith-station", stationSupported: true } : null;
    if (canonicalInput) {
      try {
        const rendered = canonicalReader(canonicalInput);
        if (!rendered.contentKey) return "";
        const body = safe(rendered.readerParts?.join("\n\n"));
        if (body) return body;
      } catch (error) {
        if (!(error instanceof Error) || !/^SKY_V4_(?:NOT_RELEASED|NOT_SERVABLE|SOURCE_GAP)/u.test(error.message)) throw error;
        if (/^SKY_V4_SOURCE_GAP/u.test(error.message)) return "";
      }
    }
    try {
      if (event.type === "aspect" && event.planets && event.aspect) {
        const [first, second] = event.planets;
        const a = canonicalContentStudioExactSkyPoint(first), b = canonicalContentStudioExactSkyPoint(second);
        const relation = slug(event.aspect);
        if ([`sky.aspect.${a}.${relation}.${b}`, `sky.aspect.${b}.${relation}.${a}`]
          .some(key => isRetiredCompositionKey(key) || publications.get(key)?.state === "retired")) return "";
        const generatedContent = publishedContentForDate(event.dateKey);
        const lunar = resolveCalendarLunationAspectReading(event, generatedContent, publications);
        if (lunar) return safe(lunar.body);
        const slots = { dateLine, planetA: first, planetB: second, signA: event.fromSign, signB: event.toSign, aspect: slug(event.aspect) };
        const composed = resolveComposedSkyCalendarCard({ first, second, aspect: event.aspect, heading: event.title, slots, lookup: registry.skyCalendarComposedCard });
        const options = { generatedContent, first, second, aspect: event.aspect,
          firstSign: event.fromSign ?? "", secondSign: event.toSign ?? "", firstMotion: event.fromMotion, secondMotion: event.toMotion, targetDate: event.dateKey };
        const publication = resolveCalendarAspectPublication(options);
        const signed = resolveSkyAspectOwnerAuthoredSigned(options);
        const studio = resolveSkyAspectContentStudioExact(options);
        const pinnedExactKeys = publication || signed || composed && composed.sourceKeys.every(allowed)
          ? [] : contentStudioExactSkyAspectKeys(first, event.aspect, second);
        for (const key of pinnedExactKeys) {
          const pin = publications.get(key);
          const [, , a, aspect, b] = key.split(".");
          if (pin?.state === "live" && (pin.row_id || pin.row_updated_at) && !contentStudioExactRow(options.generatedContent, { a, aspect, b })) return "";
        }
        const exact = resolveApprovedExactSkyAspectCopy({ first, second, aspect: event.aspect, heading: event.title, slots, lookup: registry.approvedExactSkyAspectCopy });
        let rendered;
        try { rendered = renderer.renderSkyAspectCard({ a: slug(first), b: slug(second), aspect: slug(event.aspect), aSign: event.fromSign && slug(event.fromSign), bSign: event.toSign && slug(event.toSign), dateLine }); }
        catch (error) { if (!(error instanceof SourceGapError)) throw error; }
        const specific = rendered?.contentKey?.startsWith("fallback-hook/sky-aspect-") ? { body: rendered.parts.join("\n\n") } : null;
        const selected = selectSkyAspectCopyByPrecedence<{ body: string; details?: string }>({
          composed: publication ? { body: publication.body, details: composed?.details } : composed && composed.sourceKeys.every(allowed) ? composed : null,
          exact: signed ?? studio ?? (exact?.sourceKeys.every(allowed) ? exact : null),
          signSpecific: rendered?.contentKey?.startsWith("fallback-hook/sky-aspect-sign/") ? specific : null,
          phrasebook: specific,
          generated: resolveSkyAspectGeneratedContent(options)
        });
        return safe([selected?.body, selected?.details].filter(Boolean).join("\n\n"));
      }
      if (event.type === "lunation" && event.sign && !event.eclipseType) {
        return safe(renderer.renderCalendarPhase({ phase: /new moon/iu.test(event.title) ? "new-moon" : "full-moon", sign: slug(event.sign) }).parts.join("\n\n"));
      }
      if (event.type === "ingress" && event.planet && (event.toSign || event.sign)) {
        // Use only calculated adjacent ingresses for the placement's dates.
        const next = events.filter(candidate => candidate.type === "ingress" && candidate.planet === event.planet && candidate.startsAt > event.startsAt)
          .sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0];
        const formatDate = (date: string) => new Intl.DateTimeFormat("en-US", { timeZone, month: "long", day: "numeric", year: "numeric" }).format(new Date(date));
        return safe(renderer.renderSkyPlacement({ planet: slug(event.planet), sign: slug(event.toSign ?? event.sign!), surface: "calendar",
          asOfDate: event.startsAt, entryDate: formatDate(event.startsAt), exitDate: next && formatDate(next.startsAt) }).parts.join("\n\n"));
      }
      if (event.type === "station" && event.planet && event.planet !== "Lilith") {
        const station = data.authoredCards.find(row => row.contentKey === `authored/station/${slug(event.planet)}/${event.direction === "retrograde" ? "rx" : "direct"}`);
        if (station?.body) return safe(station.body);
        if (event.direction === "retrograde") return safe(renderer.renderTransitRetro({ planet: slug(event.planet), sign: event.sign && slug(event.sign), format: "card" }).parts.join("\n\n"));
        const frame = hook("fallback-hook/sky-event/station-direct")?.body;
        const topic = data.vocabularyRows.find(row => row.contentKey === `fallback-vocab/planet-function/${slug(event.planet)}`)?.body;
        return frame && topic ? safe(frame.replaceAll("{{dateLine}}", dateLine).replaceAll("{{aRef}}", `${event.planet}${event.sign ? ` in ${event.sign}` : ""}`).replaceAll("{{aTopic}}", topic)) : "";
      }
    } catch (error) {
      if (!(error instanceof SourceGapError)) throw error;
    }
    return "";
  }
  function weekSource(events: LunarCalendarEvent[]) {
    const lunation = events.find(event => event.type === "lunation" && event.primary);
    const kind = lunation ? /new moon/iu.test(lunation.title) || lunation.eclipseType === "solar" ? "new-moon" : "full-moon"
      : events.some(event => event.type === "station") ? "station" : events.some(event => event.primary) ? "headliner" : events.length ? "standard" : "quiet";
    const key = `authored/week-opener/${kind}`;
    const row = data.authoredCards.find(row => row.contentKey === key);
    const body = (row?.weeklyOverview ?? row?.body ?? "").replaceAll("{{signTitle}}", lunation?.sign ?? "");
    return { key, body: safe(body), signTitle: lunation?.sign ?? "" };
  }
  return { eventBody, weekSource };
}
