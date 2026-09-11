import { isEligibleTransitReturn } from "../../web/src/services/transitReturns.js";
import { fullDetailReaderFacingCopy, isReaderFacingCopy } from "../../web/src/content/readerSafety.js";
import { isDynamicTransitNatalExactKey } from "../../web/src/content/transitNatalIdentity.js";
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

export type TransitNatalReadingContext = {
  pass?: number;
  variant?: number;
  isRetrograde?: boolean;
  window?: string;
};

export type TransitNatalSelection = TransitNatalReadingContext & {
  planet: TransitNatalPlanet;
  sign: TransitNatalSign;
  transitHouse: TransitNatalHouse;
  aspect: TransitNatalAspect;
  natalPoint: TransitNatalPoint;
  natalHouse: TransitNatalHouse;
};

export type TransitPassageSource = {
  contentKey: string; field: string; audience: string;
  publication?: { origin: "package" | "published"; packageVersion: string; revision?: number; rowId?: string; rowUpdatedAt?: string };
};
export type TransitPassageParagraph = { text: string; sources: TransitPassageSource[] };

type TransitPreviewRenderer = {
  renderTransitAspect: (facts: TransitNatalReadingContext & { transiting: string; natal: string; aspect: string; sign: string; voice: string }) => TransitPreviewResult;
  renderTransitReturn: (facts: { planet: string }) => TransitPreviewResult;
};
type TransitPreviewResult = { headline: string; parts: string[]; templateKey: string; contentKey?: string; sourceKeys?: string[]; paragraphSources?: TransitPassageParagraph[]; headlineSources?: TransitPassageSource[] };

export function transitNatalLabel(selection: Pick<TransitNatalSelection, "planet" | "aspect" | "natalPoint">) {
  const title = (value: string) => value.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
  return `${title(selection.planet)} ${selection.aspect} your ${title(selection.natalPoint)}`;
}

/** Preview selection is delegated to the shipped reader resolver, never assembled in Studio. */
export function renderTransitNatalPreview(selection: TransitNatalReadingContext & Pick<TransitNatalSelection, "planet" | "sign" | "aspect" | "natalPoint">, renderer: TransitPreviewRenderer, voice = "you") {
  const rendered = isEligibleTransitReturn(selection.planet, selection.natalPoint, selection.aspect)
    ? renderer.renderTransitReturn({ planet: selection.planet })
    : renderer.renderTransitAspect({ transiting: selection.planet, natal: selection.natalPoint, aspect: selection.aspect, sign: selection.sign, voice, pass: selection.pass, variant: selection.variant, isRetrograde: selection.isRetrograde, window: selection.window });
  const body = fullDetailReaderFacingCopy(rendered.parts);
  if (!body || !isReaderFacingCopy(body)) throw new Error("No reader-eligible passage is available for this selection.");
  const paragraphs = rendered.paragraphSources;
  if (!paragraphs?.length || paragraphs.map(part => part.text).join("\n\n") !== body
    || paragraphs.some(part => !part.sources.length)) throw new Error("The reading's source links could not be verified.");
  return {
    paragraphs,
    headlineSources: rendered.headlineSources ?? [],
    headline: rendered.headline || transitNatalLabel(selection),
    body,
    sourceKeys: [...new Set((rendered.sourceKeys?.length ? rendered.sourceKeys : [rendered.contentKey ?? rendered.templateKey]))]
  };
}

export type TransitNatalResolvedSource = { key: string; text: string };

export function transitNatalExactContentKey(selection: Pick<TransitNatalSelection, "planet" | "natalPoint" | "aspect">) {
  const key = isEligibleTransitReturn(selection.planet, selection.natalPoint, selection.aspect)
    ? `authored/transit-return/${selection.planet}`
    : `authored/transit-aspect/${selection.planet}/${selection.natalPoint}/${selection.aspect}`;
  return isDynamicTransitNatalExactKey(key) ? key : null;
}

/** An empty authoring draft, never copied from or labeled as the fallback it will replace. */
export function transitNatalExactSourceDraft(selection: Pick<TransitNatalSelection, "planet" | "natalPoint" | "aspect">) {
  const contentKey = transitNatalExactContentKey(selection);
  if (!contentKey) throw new Error("This transit aspect is not supported by the reader.");
  const isReturn = contentKey.startsWith("authored/transit-return/");
  return {
    id: null,
    contentKey,
    surface: "you" as const,
    mode: "in_depth" as const,
    status: "DRAFT" as const,
    headline: isReturn ? `${selection.planet.split("-").map(word => word[0].toUpperCase() + word.slice(1)).join(" ")} return` : transitNatalLabel(selection),
    summary: "",
    body: "",
    lane: "reference" as const,
    reviewState: "needs-review" as const,
    blockType: "fallback_hook" as const,
    promptVersion: "manual-admin",
    sections: { packageRecord: {
      contentKey, content_role: "full_copy", grammar_frame: "complete_sentence", surface: isReturn ? "transit-return" : "transit-aspect",
      body: "", ...(!isReturn ? { body_you: "", body_they: "" } : {}),
      reader_only: true, render_policy: "personal-transit-exact-v1", review_status: "needs_review"
    } },
    facts: { fallbackArchitectureV3: true, transiting: selection.planet, natal: selection.natalPoint, aspect: selection.aspect },
    reviewerNotes: "Exact personal-transit source shared by Sky Placement and You Transit. Review the complete passage before publishing.",
    sourceSnapshot: { contentType: "authored-content", contentSystem: "fallback", content_role: "full_copy", review_status: "needs_review", sourcePackage: "tldrastro-fallback-architecture-v3" }
  };
}
