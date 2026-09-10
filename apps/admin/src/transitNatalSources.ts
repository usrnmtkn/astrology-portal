import { isEligibleTransitReturn } from "../../web/src/services/transitReturns.js";
import { fullDetailReaderFacingCopy, isReaderFacingCopy } from "../../web/src/content/readerSafety.js";
export const transitNatalPlanets = [
  "sun",
  "moon",
  "mercury",
  "venus",
  "mars",
  "jupiter",
  "saturn",
  "uranus",
  "neptune",
  "pluto",
  "chiron",
  "north-node",
  "south-node",
  "lilith"
] as const;

export const transitNatalSigns = [
  "aries",
  "taurus",
  "gemini",
  "cancer",
  "leo",
  "virgo",
  "libra",
  "scorpio",
  "sagittarius",
  "capricorn",
  "aquarius",
  "pisces"
] as const;

export const transitNatalHouses = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"] as const;

export const transitNatalAspects = ["conjunction", "opposition", "square", "trine", "sextile"] as const;

export const transitNatalPoints = [
  "sun",
  "moon",
  "mercury",
  "venus",
  "mars",
  "jupiter",
  "saturn",
  "uranus",
  "neptune",
  "pluto",
  "chiron",
  "north-node",
  "south-node",
  "lilith",
  "ascendant",
  "midheaven",
  "descendant",
  "imum-coeli"
] as const;

export type TransitNatalPlanet = typeof transitNatalPlanets[number];
export type TransitNatalSign = typeof transitNatalSigns[number];
export type TransitNatalHouse = typeof transitNatalHouses[number];
export type TransitNatalAspect = typeof transitNatalAspects[number];
export type TransitNatalPoint = typeof transitNatalPoints[number];

export type TransitNatalSelection = {
  planet: TransitNatalPlanet;
  sign: TransitNatalSign;
  transitHouse: TransitNatalHouse;
  aspect: TransitNatalAspect;
  natalPoint: TransitNatalPoint;
  natalHouse: TransitNatalHouse;
};

type TransitPreviewRenderer = {
  renderTransitAspect: (facts: { transiting: string; natal: string; aspect: string; sign: string; voice: string }) => TransitPreviewResult;
  renderTransitReturn: (facts: { planet: string }) => TransitPreviewResult;
};
type TransitPreviewResult = { headline: string; parts: string[]; templateKey: string; contentKey?: string; sourceKeys?: string[] };

export function transitNatalLabel(selection: Pick<TransitNatalSelection, "planet" | "aspect" | "natalPoint">) {
  const title = (value: string) => value.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
  return `${title(selection.planet)} ${selection.aspect} your ${title(selection.natalPoint)}`;
}

/** Preview selection is delegated to the shipped reader resolver, never assembled in Studio. */
export function renderTransitNatalPreview(selection: Pick<TransitNatalSelection, "planet" | "sign" | "aspect" | "natalPoint">, renderer: TransitPreviewRenderer, voice = "you") {
  const rendered = isEligibleTransitReturn(selection.planet, selection.natalPoint, selection.aspect)
    ? renderer.renderTransitReturn({ planet: selection.planet })
    : renderer.renderTransitAspect({ transiting: selection.planet, natal: selection.natalPoint, aspect: selection.aspect, sign: selection.sign, voice });
  const body = fullDetailReaderFacingCopy(rendered.parts);
  if (!body || !isReaderFacingCopy(body)) throw new Error("No reader-eligible passage is available for this selection.");
  return {
    headline: rendered.headline || transitNatalLabel(selection),
    body,
    sourceKeys: [...new Set([rendered.contentKey ?? rendered.templateKey, ...(rendered.sourceKeys ?? [])])]
  };
}

export type TransitNatalResolvedSource = { key: string; text: string };
