import type {
  ApprovedExactSkyAspectCopy,
  ResolvedSkyCalendarComposedCard
} from "../content/domainRegistry";
import { isReaderFacingCopy } from "../content/readerSafety";
import {
  interpolateTemplateString,
  type TemplateSlotValues
} from "./templateInterpolation";

export type ApprovedExactSkyAspectLookup = (
  planetA: string,
  aspect: string,
  planetB: string
) => ApprovedExactSkyAspectCopy | null;

export type ResolvedApprovedExactSkyAspectCopy = {
  body: string;
  heading: string;
  layer: "authored";
  sourceKeys: string[];
  tier: "approved-exact-sky-aspect-v1";
};

const calendarAspectLeadVerb: Record<string, string> = {
  conjunction: "conjoins",
  opposition: "opposes",
  quincunx: "quincunxes",
  sextile: "sextiles",
  square: "squares",
  trine: "trines"
};

const southNodeAspectForNorthNodeAspect: Record<string, string> = {
  conjunction: "opposition",
  sextile: "trine",
  square: "square",
  trine: "sextile",
  opposition: "conjunction"
};

function lowerSentenceStart(value: string) {
  return value ? `${value.charAt(0).toLowerCase()}${value.slice(1)}` : value;
}

function pointSlug(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/gu, "-").replace(/^-+|-+$/gu, "");
}

function calendarExactLeadIn(
  body: string,
  aspect: string,
  slots: TemplateSlotValues
) {
  const dateLine = String(slots.dateLine ?? "").trim();
  const planetA = String(slots.planetA ?? "").trim();
  const planetB = String(slots.planetB ?? "").trim();
  const signA = String(slots.signA ?? "").trim();
  const signB = String(slots.signB ?? "").trim();
  const aspectVerb = calendarAspectLeadVerb[aspect.trim().toLowerCase()] ?? "";

  if (!dateLine || !planetA || !planetB || !signA || !signB || !aspectVerb) {
    return null;
  }

  return `${dateLine}, ${planetA} in ${signA} ${aspectVerb} ${planetB} in ${signB}, and on a collective level, ${lowerSentenceStart(body)}`;
}

function exactStoredBody(
  copy: ApprovedExactSkyAspectCopy,
  slots: TemplateSlotValues
) {
  return interpolateTemplateString(copy.body, slots, {
    contentKey: copy.contentId,
    field: "body"
  })
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .join("\n\n");
}

export type SkyCalendarComposedCardLookup = (
  planetA: string,
  signA: string,
  aspect: string,
  planetB: string,
  signB: string
) => ResolvedSkyCalendarComposedCard | null;

export type ResolvedComposedSkyCalendarCard = {
  body: string;
  details: string;
  heading: string;
  layer: "authored";
  sourceKeys: string[];
  tier: "composed-sky-calendar-card-v1";
};

export function resolveComposedSkyCalendarCard({
  aspect,
  first,
  heading,
  lookup,
  second,
  slots
}: {
  aspect: string;
  first: string;
  heading: string;
  lookup?: SkyCalendarComposedCardLookup | null;
  second: string;
  slots: TemplateSlotValues;
}): ResolvedComposedSkyCalendarCard | null {
  const signA = String(slots.signA ?? "").trim();
  const signB = String(slots.signB ?? "").trim();

  if (!signA || !signB) {
    return null;
  }

  const card = lookup?.(first, signA, aspect, second, signB);

  if (!card) {
    return null;
  }

  // The stored forecast begins lowercase and the Calendar composes the date
  // lead-in. Without a date line there is nothing to lead with, so the card
  // stays unserved rather than rendering a fragment.
  const dateLine = String(slots.dateLine ?? "").trim();

  if (!dateLine) {
    return null;
  }

  const body = `${dateLine}, ${lowerSentenceStart(card.forecast)}`;

  if (!isReaderFacingCopy(body) || !isReaderFacingCopy(card.details)) {
    return null;
  }

  return {
    body,
    details: card.details,
    heading,
    layer: "authored",
    sourceKeys: [
      card.contentId,
      "packages/astro-knowledge/data/sky-calendar/composed-cards-v1.json"
    ],
    tier: "composed-sky-calendar-card-v1"
  };
}

type SkyAspectPrecedenceCandidates<T> = {
  composed?: T | null;
  signSpecific?: T | null;
  exact?: T | null;
  phrasebook?: T | null;
  generated?: T | null;
  fallback?: T | null;
};

export function selectSkyAspectCopyByPrecedence<T>({
  composed,
  signSpecific,
  exact,
  phrasebook,
  generated,
  fallback
}: SkyAspectPrecedenceCandidates<T>): T | null {
  return composed ?? exact ?? signSpecific ?? phrasebook ?? generated ?? fallback ?? null;
}

export function resolveApprovedExactSkyAspectCopy({
  aspect,
  first,
  heading,
  lookup,
  second,
  slots
}: {
  aspect: string;
  first: string;
  heading: string;
  lookup?: ApprovedExactSkyAspectLookup | null;
  second: string;
  slots: TemplateSlotValues;
}): ResolvedApprovedExactSkyAspectCopy | null {
  const copy = lookup?.(first, aspect, second);

  if (!copy) {
    return null;
  }

  const storedBody = exactStoredBody(copy, slots);
  const primaryBody = copy.calendarLeadIn === "date-placements-collective-level"
    && slots.dateLine
    ? calendarExactLeadIn(storedBody, aspect, slots)
    : storedBody;

  if (!primaryBody || !isReaderFacingCopy(primaryBody)) {
    return null;
  }

  const sourceKeys = [copy.contentId, `packages/astro-knowledge/data/transits/${copy.sourceId}.json`];
  const firstSlug = pointSlug(first);
  const secondSlug = pointSlug(second);
  const northNodeIsFirst = firstSlug === "north-node" || firstSlug === "true-node";
  const northNodeIsSecond = secondSlug === "north-node" || secondSlug === "true-node";
  const southAspect = southNodeAspectForNorthNodeAspect[aspect.trim().toLowerCase()];

  if ((northNodeIsFirst || northNodeIsSecond) && southAspect) {
    const counterpart = northNodeIsFirst ? second : first;
    const southCopy = lookup?.(counterpart, southAspect, "South Node");

    if (southCopy) {
      const southSlots: TemplateSlotValues = {
        ...slots,
        aspect: southAspect,
        planetA: northNodeIsFirst ? "South Node" : slots.planetA,
        planetB: northNodeIsSecond ? "South Node" : slots.planetB
      };
      // South Node and North Node are opposite points, so the canonical event's
      // node sign cannot be reused as a South Node sign. The approved South Node
      // Calendar bodies are sign-independent; keep their stored wording intact.
      const southBody = exactStoredBody(southCopy, southSlots);

      if (southBody && isReaderFacingCopy(southBody)) {
        const combinedBody = [
          `North Node (${aspect.trim().toLowerCase()}): ${primaryBody}`,
          `South Node (${southAspect}): ${southBody}`
        ].join("\n\n");

        if (isReaderFacingCopy(combinedBody)) {
          return {
            body: combinedBody,
            heading,
            layer: "authored",
            sourceKeys: [
              ...sourceKeys,
              southCopy.contentId,
              `packages/astro-knowledge/data/transits/${southCopy.sourceId}.json`
            ],
            tier: "approved-exact-sky-aspect-v1"
          };
        }
      }
    }
  }

  return {
    body: primaryBody,
    heading,
    layer: "authored",
    sourceKeys,
    tier: "approved-exact-sky-aspect-v1"
  };
}
