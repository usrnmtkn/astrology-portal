import type { AspectToneBucket, SkyDetailSection } from "../features/sky/SkyDetailArticle";
import { normalizedArticleAspectToneBucket } from "../utils/articleAspects";
import type { LiveGeneratedContent } from "./generatedContent";
import { resolveSkyAspectReading } from "./skyAspectReading";
import { skyAspectReadingDateLine, type skyAspectPackageCandidates } from "./skyAspectReaderFacts";
import type { ApprovedExactSkyAspectLookup, SkyCalendarComposedCardLookup } from "./skyAspectRouting";
import type { SkyPlacementAspectEvent } from "../types";
import { placementAspectIdentity } from "./skyPlacementAspectContentKeys";
export { skyPlacementInSignAspectContentKeys } from "./skyPlacementAspectContentKeys";

export type { ApprovedExactSkyAspectLookup } from "./skyAspectRouting";
export type SkyPlacementInSignAspectEvent = SkyPlacementAspectEvent;
type ReadingSources = {
  composedLookup?: SkyCalendarComposedCardLookup | null;
  phrasebook?: (facts: Parameters<typeof skyAspectPackageCandidates>[0]) => ReturnType<typeof skyAspectPackageCandidates>;
};

export type SkyPlacementInSignAspectAuditEvent = {
  id: string;
  occursAt: string;
  dateLine: string;
  heading: string;
  aspect: string;
  otherPlanet: string;
  resolution: "resolved-approved-exact" | "unresolved-exact";
  sourceId: string | null;
  contentId: string | null;
};

export type SkyPlacementInSignAspectResult = {
  sections: SkyDetailSection[];
  events: SkyPlacementInSignAspectAuditEvent[];
  unresolvedEventIds: string[];
};

function titleCase(value: string) {
  return value
    .split(/[-_\s]+/gu)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1).toLowerCase()}`)
    .join(" ");
}

function dateLine(value: string, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone
  }).format(new Date(value));
}

function naturalDateList(values: string[]) {
  if (values.length <= 1) return values[0] ?? "";
  if (values.length === 2) return `${values[0]} and ${values[1]}`;
  return `${values.slice(0, -1).join(", ")}, and ${values.at(-1)}`;
}

function joinedExactDateLines(values: string[]) {
  const unique = [...new Set(values)];
  if (unique.length <= 1) return unique[0] ?? "";
  const parsed = unique.map((value) => value.match(/^(.*), (\d{4})$/u));
  const sharedYear = parsed[0]?.[2];
  if (sharedYear && parsed.every((match) => match?.[2] === sharedYear)) {
    return `${naturalDateList(parsed.map((match) => match?.[1] ?? ""))}, ${sharedYear}`;
  }
  return naturalDateList(unique);
}

function aspectRoutePath(first: string, aspect: string, second: string, occursAt: string) {
  const part = (value: string) => encodeURIComponent(value.trim().toLowerCase().replace(/\s+/gu, "-"));
  return `sky/aspect/${part(first)}/${part(aspect)}/${part(second)}/at/${encodeURIComponent(occursAt)}`;
}

function exactAspectSection({
  aspect,
  date,
  body,
  first,
  firstOccursAt,
  second,
  sourceKeys
}: {
  aspect: string;
  date: string;
  body: string;
  first: string;
  firstOccursAt: string;
  second: string;
  sourceKeys: string[];
}): SkyDetailSection {
  return {
    heading: `${first} ${titleCase(aspect)} ${second}`,
    body: body ? `${date}\n\n${body}` : date,
    href: aspectRoutePath(first, aspect, second, firstOccursAt),
    role: "aspect",
    aspectType: aspect,
    group: normalizedArticleAspectToneBucket(aspect) as AspectToneBucket,
    sourceKeys
  };
}

function eventCopy(event: SkyPlacementInSignAspectEvent, timeZone: string,
  generatedContent: Map<string, LiveGeneratedContent> | undefined,
  exactLookup: ApprovedExactSkyAspectLookup | undefined, sources: ReadingSources) {
  const identity = placementAspectIdentity(event, timeZone);
  const dateLine = skyAspectReadingDateLine(event.occursAt, timeZone);
  const reading = resolveSkyAspectReading({ ...identity, generatedContent: generatedContent ?? new Map(),
    dateLine,
    exactLookup, composedLookup: sources.composedLookup,
    ...sources.phrasebook?.({ ...identity, dateLine }) });
  const sourceKeys = reading?.sourceKeys ?? [];
  const corpus = sourceKeys.find(key => key.startsWith("packages/astro-knowledge/data/transits/"));
  return { body: reading ? [reading.body, reading.details].filter(Boolean).join("\n\n") : "",
    contentId: sourceKeys[0] ?? null,
    sourceId: corpus ? corpus.split("/").at(-1)!.replace(/\.json$/u, "") : reading?.tier ?? null, sourceKeys };
}

/** One Gifts/Lessons card per exact in-sign contact, matching Key dates.
 * Approved copy fills the card. Missing copy still keeps the calculated fact row.
 */
export function skyPlacementInSignAspectSections(
  events: SkyPlacementInSignAspectEvent[],
  timeZone: string,
  generatedContent?: Map<string, LiveGeneratedContent>,
  approvedExactSkyAspectCopy?: ApprovedExactSkyAspectLookup,
  sources: ReadingSources = {}
): SkyPlacementInSignAspectResult {
  const ordered = [...events].sort((first, second) => first.occursAt.localeCompare(second.occursAt));
  const seen = new Set<string>();
  const sectionGroups = new Map<string, {
    aspect: string;
    body: string;
    contentId: string | null;
    dateLines: string[];
    first: string;
    firstOccursAt: string;
    second: string;
    sourceId: string | null;
    sourceKeys: string[];
  }>();
  const auditEvents: SkyPlacementInSignAspectAuditEvent[] = [];
  const unresolvedEventIds: string[] = [];

  for (const event of ordered) {
    if (seen.has(event.id)) continue;
    seen.add(event.id);

    const copy = eventCopy(event, timeZone, generatedContent, approvedExactSkyAspectCopy, sources);
    const eventDateLine = dateLine(event.occursAt, timeZone);
    const heading = `${event.planet} ${titleCase(event.aspect)} ${event.otherPlanet}`;
    const resolved = Boolean(copy.body);

    auditEvents.push({
      id: event.id,
      occursAt: event.occursAt,
      dateLine: eventDateLine,
      heading,
      aspect: event.aspect,
      otherPlanet: event.otherPlanet,
      resolution: resolved ? "resolved-approved-exact" : "unresolved-exact",
      sourceId: resolved ? copy.sourceId : null,
      contentId: resolved ? copy.contentId : null
    });

    if (!resolved) unresolvedEventIds.push(event.id);

    const sectionKey = resolved
      ? `${heading}|${copy.contentId}|${copy.body}`
      : `${heading}|facts`;
    const existingSection = sectionGroups.get(sectionKey);
    if (existingSection) {
      existingSection.dateLines.push(eventDateLine);
      if (event.occursAt < existingSection.firstOccursAt) {
        existingSection.firstOccursAt = event.occursAt;
      }
      continue;
    }

    sectionGroups.set(sectionKey, {
      aspect: event.aspect,
      body: resolved ? copy.body : "",
      contentId: resolved ? copy.contentId : null,
      dateLines: [eventDateLine],
      first: event.planet,
      firstOccursAt: event.occursAt,
      second: event.otherPlanet,
      sourceId: resolved ? copy.sourceId : null,
      sourceKeys: copy.sourceKeys
    });
  }

  const sections = Array.from(sectionGroups.values())
    .sort((first, second) => first.firstOccursAt.localeCompare(second.firstOccursAt))
    .map((section) => exactAspectSection({
      aspect: section.aspect,
      date: joinedExactDateLines(section.dateLines),
      body: section.body,
      first: section.first,
      firstOccursAt: section.firstOccursAt,
      second: section.second,
      sourceKeys: section.sourceKeys
    }));

  return { sections, events: auditEvents, unresolvedEventIds };
}

export { loadSkyPlacementArchiveReading } from "./skyPlacementArchiveReading";
