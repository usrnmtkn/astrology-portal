import { approvedExactSkyAspectCopy } from "../content/skyRegistry";
import type { AspectToneBucket, SkyDetailSection } from "../features/sky/SkyDetailArticle";
import { isReaderFacingCopy } from "../content/readerSafety";
import { normalizedArticleAspectToneBucket } from "../utils/articleAspects";
import { getSkyPlacementTransitFacts } from "./ephemeris";

export type SkyPlacementResidencyAspectRequest = {
  planet: string;
  sign: string;
  referenceDate: string;
  timeZone: string;
};

export type SkyPlacementResidencyAspectAuditEvent = {
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

export type SkyPlacementResidencyAspectResult = {
  status: "resolved" | "unsupported-pilot";
  sections: SkyDetailSection[];
  events: SkyPlacementResidencyAspectAuditEvent[];
  unresolvedEventIds: string[];
};

const PILOT_PLANETS = new Set(["sun"]);

function normalizedPart(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/gu, "-").replace(/^-|-$/gu, "");
}

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
  contentId: string;
  date: string;
  body: string;
  first: string;
  second: string;
  sourceId: string;
}): SkyDetailSection {
  return {
    heading: `${first} ${titleCase(aspect)} ${second}`,
    body: `${date}\n\n${body}`,
    role: "aspect",
    aspectType: aspect,
    group: normalizedArticleAspectToneBucket(aspect) as AspectToneBucket,
    sourceKeys: [
      contentId,
      `packages/astro-knowledge/data/transits/${sourceId}.json`
    ]
  };
}

export async function skyPlacementResidencyAspectSections(
  request: SkyPlacementResidencyAspectRequest
): Promise<SkyPlacementResidencyAspectResult> {
  const planet = normalizedPart(request.planet);
  const sign = normalizedPart(request.sign);

  if (!PILOT_PLANETS.has(planet)) {
    return {
      status: "unsupported-pilot",
      sections: [],
      events: [],
      unresolvedEventIds: []
    };
  }

  const referenceDate = new Date(request.referenceDate);
  if (Number.isNaN(referenceDate.getTime())) {
    throw new Error(`Invalid Sky Placement residency aspect reference date: ${request.referenceDate}`);
  }

  const facts = await getSkyPlacementTransitFacts({
    planet,
    sign,
    referenceDate,
    timeZone: request.timeZone
  });

  const events = [...facts.rankedEventsDuringTransit]
    .sort((first, second) => first.occursAt.localeCompare(second.occursAt));
  const seen = new Set<string>();
  const sections: SkyDetailSection[] = [];
  const auditEvents: SkyPlacementResidencyAspectAuditEvent[] = [];
  const unresolvedEventIds: string[] = [];

  for (const event of events) {
    if (seen.has(event.id)) {
      continue;
    }
    seen.add(event.id);

    const copy = approvedExactSkyAspectCopy(event.planet, event.aspect, event.otherPlanet);
    const eventDateLine = dateLine(event.occursAt, facts.timeZone);
    const heading = `${event.planet} ${titleCase(event.aspect)} ${event.otherPlanet}`;
    const body = copy?.body?.trim() ?? "";
    const copyNeedsCalendarComposition = copy?.calendarLeadIn === "date-placements-collective-level";
    const copyHasSlots = /\{\{[^}]+\}\}/u.test(body);
    const resolved = Boolean(
      copy
      && body
      && !copyNeedsCalendarComposition
      && !copyHasSlots
      && isReaderFacingCopy(body)
    );

    auditEvents.push({
      id: event.id,
      occursAt: event.occursAt,
      dateLine: eventDateLine,
      heading,
      aspect: event.aspect,
      otherPlanet: event.otherPlanet,
      resolution: resolved ? "resolved-approved-exact" : "unresolved-exact",
      sourceId: resolved ? copy?.sourceId ?? null : null,
      contentId: resolved ? copy?.contentId ?? null : null
    });

    if (!resolved || !copy) {
      unresolvedEventIds.push(event.id);
      continue;
    }

    sections.push(exactAspectSection({
      aspect: event.aspect,
      contentId: copy.contentId,
      date: eventDateLine,
      body,
      first: event.planet,
      second: event.otherPlanet,
      sourceId: copy.sourceId
    }));
  }

  return {
    status: "resolved",
    sections,
    events: auditEvents,
    unresolvedEventIds
  };
}