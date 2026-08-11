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

  const body = interpolateTemplateString(copy.body, slots, {
    contentKey: copy.contentId,
    field: "body"
  })
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .join("\n\n");

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
