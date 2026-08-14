import type { ApprovedExactSkyAspectCopy } from "../content/domainRegistry";
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

function lowerSentenceStart(value: string) {
  return value ? `${value.charAt(0).toLowerCase()}${value.slice(1)}` : value;
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

type SkyAspectPrecedenceCandidates<T> = {
  signSpecific?: T | null;
  exact?: T | null;
  phrasebook?: T | null;
  generated?: T | null;
  fallback?: T | null;
};

export function selectSkyAspectCopyByPrecedence<T>({
  signSpecific,
  exact,
  phrasebook,
  generated,
  fallback
}: SkyAspectPrecedenceCandidates<T>): T | null {
  return signSpecific ?? exact ?? phrasebook ?? generated ?? fallback ?? null;
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

  const storedBody = interpolateTemplateString(copy.body, slots, {
    contentKey: copy.contentId,
    field: "body"
  })
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .join("\n\n");
  const body = copy.calendarLeadIn === "date-placements-collective-level"
    && slots.dateLine
    ? calendarExactLeadIn(storedBody, aspect, slots)
    : storedBody;

  if (!body || !isReaderFacingCopy(body)) {
    return null;
  }

  return {
    body,
    heading,
    layer: "authored",
    sourceKeys: [copy.contentId, `packages/astro-knowledge/data/transits/${copy.sourceId}.json`],
    tier: "approved-exact-sky-aspect-v1"
  };
}
