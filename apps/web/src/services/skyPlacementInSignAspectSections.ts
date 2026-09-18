import { approvedExactSkyAspectCopy } from "../content/skyRegistry";
import type { AspectToneBucket, SkyDetailSection } from "../features/sky/SkyDetailArticle";
import { isReaderFacingCopy } from "../content/readerSafety";
import { normalizedArticleAspectToneBucket } from "../utils/articleAspects";
import type { LiveGeneratedContent } from "./generatedContent";
import { contentStudioExactSkyAspectKeys, resolveSkyAspectContentStudioExact } from "./skyAspectContent";

export type SkyPlacementInSignAspectEvent = {
  id: string;
  occursAt: string;
  planet: string;
  aspect: string;
  otherPlanet: string;
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

function exactAspectSection({
  aspect,
  contentId,
  date,
  body,
  first,
  second,
  sourceId
}: {
  aspect: string;
  contentId: string | null;
  date: string;
  body: string;
  first: string;
  second: string;
  sourceId: string | null;
}): SkyDetailSection {
  return {
    heading: `${first} ${titleCase(aspect)} ${second}`,
    body: body ? `${date}\n\n${body}` : date,
    role: "aspect",
    aspectType: aspect,
    group: normalizedArticleAspectToneBucket(aspect) as AspectToneBucket,
    sourceKeys: contentId && sourceId
      ? [contentId, sourceId === "content-studio-exact" ? contentId : `packages/astro-knowledge/data/transits/${sourceId}.json`]
      : []
  };
}

function eventCopy(
  event: SkyPlacementInSignAspectEvent,
  generatedContent?: Map<string, LiveGeneratedContent>
) {
  const studio = generatedContent
    ? resolveSkyAspectContentStudioExact({
        generatedContent,
        first: event.planet,
        second: event.otherPlanet,
        aspect: event.aspect,
        firstSign: "",
        secondSign: ""
      })
    : null;
  if (studio?.body) {
    return {
      body: studio.body.trim(),
      contentId: studio.content.contentKey,
      sourceId: "content-studio-exact"
    };
  }

  const copy = approvedExactSkyAspectCopy(event.planet, event.aspect, event.otherPlanet);
  const body = copy?.body?.trim() ?? "";
  const copyHasSlots = /\{\{[^}]+\}\}/u.test(body);
  if (!copy || !body || copyHasSlots || !isReaderFacingCopy(body)) {
    return { body: "", contentId: null as string | null, sourceId: null as string | null };
  }
  return {
    body,
    contentId: copy.contentId,
    sourceId: copy.sourceId
  };
}

export function skyPlacementInSignAspectContentKeys(events: SkyPlacementInSignAspectEvent[]) {
  return [...new Set(events.flatMap((event) => contentStudioExactSkyAspectKeys(event.planet, event.aspect, event.otherPlanet)))];
}

/** One Gifts/Lessons card per exact in-sign contact, matching Key dates.
 * Approved copy fills the card. Missing copy still keeps the calculated fact row.
 */
export function skyPlacementInSignAspectSections(
  events: SkyPlacementInSignAspectEvent[],
  timeZone: string,
  generatedContent?: Map<string, LiveGeneratedContent>
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
  }>();
  const auditEvents: SkyPlacementInSignAspectAuditEvent[] = [];
  const unresolvedEventIds: string[] = [];

  for (const event of ordered) {
    if (seen.has(event.id)) continue;
    seen.add(event.id);

    const copy = eventCopy(event, generatedContent);
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
      sourceId: resolved ? copy.sourceId : null
    });
  }

  const sections = Array.from(sectionGroups.values())
    .sort((first, second) => first.firstOccursAt.localeCompare(second.firstOccursAt))
    .map((section) => exactAspectSection({
      aspect: section.aspect,
      contentId: section.contentId,
      date: joinedExactDateLines(section.dateLines),
      body: section.body,
      first: section.first,
      second: section.second,
      sourceId: section.sourceId
    }));

  return { sections, events: auditEvents, unresolvedEventIds };
}
