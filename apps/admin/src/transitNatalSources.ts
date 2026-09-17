import { isEligibleTransitReturn } from "../../web/src/services/transitReturns.js";
import { fullDetailReaderFacingCopy, isReaderFacingCopy } from "../../web/src/content/readerSafety.js";
import { isDynamicTransitNatalExactKey, transitAspectSituationKey } from "../../web/src/content/transitNatalIdentity.js";
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

export const transitNatalPlanetPoints = [
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
  "chiron"
] as const;

export const transitNatalNodePoints = ["north-node", "south-node", "lilith"] as const;

export const transitNatalChartPoints = ["ascendant", "midheaven", "descendant", "imum-coeli"] as const;

export const transitNatalPointGroups = [
  { label: "Natal planets", values: transitNatalPlanetPoints },
  { label: "Natal nodes", values: transitNatalNodePoints },
  { label: "Natal chart points", values: transitNatalChartPoints }
] as const;

export const transitNatalPoints = [
  ...transitNatalPlanetPoints,
  ...transitNatalNodePoints,
  ...transitNatalChartPoints
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

export type TransitNatalContact = {
  planet: TransitNatalPlanet;
  aspect: TransitNatalAspect;
  natalPoint: TransitNatalPoint;
};

export type TransitNatalSelection = TransitNatalReadingContext & TransitNatalContact & {
  sign: TransitNatalSign;
  transitHouse?: TransitNatalHouse | "";
  natalHouse?: TransitNatalHouse | "";
};

export function transitNatalContactReady(
  selection: { planet?: string; aspect?: string; natalPoint?: string }
): selection is TransitNatalContact {
  return Boolean(selection.planet && selection.aspect && selection.natalPoint);
}

export function transitNatalContactFromFields(
  planet: TransitNatalPlanet | "",
  aspect: TransitNatalAspect | "",
  natalPoint: TransitNatalPoint | ""
): TransitNatalContact | null {
  return planet && aspect && natalPoint ? { planet, aspect, natalPoint } : null;
}

export type TransitPassageSource = {
  contentKey: string; field: string; audience: string;
  publication?: { origin: "package" | "published"; packageVersion: string; revision?: number; rowId?: string; rowUpdatedAt?: string };
};
export type TransitPassageParagraph = { text: string; sources: TransitPassageSource[] };

type TransitPreviewRenderer = {
  renderTransitAspect: (facts: TransitNatalReadingContext & { transiting: string; natal: string; aspect: string; sign: string; voice: string; transitHouse?: string; natalHouse?: string }) => TransitPreviewResult;
  renderTransitReturn: (facts: { planet: string }) => TransitPreviewResult;
};
type TransitPreviewResult = { headline: string; parts: string[]; templateKey: string; contentKey?: string; sourceKeys?: string[]; paragraphSources?: TransitPassageParagraph[]; headlineSources?: TransitPassageSource[] };

export function transitNatalLabel(selection: Pick<TransitNatalSelection, "planet" | "aspect" | "natalPoint">) {
  const title = (value: string) => value.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
  return `${title(selection.planet)} ${selection.aspect} your ${title(selection.natalPoint)}`;
}

/** Preview selection is delegated to the shipped reader resolver, never assembled in Studio. */
export function renderTransitNatalPreview(selection: TransitNatalReadingContext & Pick<TransitNatalSelection, "planet" | "sign" | "aspect" | "natalPoint" | "transitHouse" | "natalHouse">, renderer: TransitPreviewRenderer, voice = "you") {
  const rendered = isEligibleTransitReturn(selection.planet, selection.natalPoint, selection.aspect)
    ? renderer.renderTransitReturn({ planet: selection.planet })
    : renderer.renderTransitAspect({
      transiting: selection.planet,
      natal: selection.natalPoint,
      aspect: selection.aspect,
      sign: selection.sign,
      voice,
      pass: selection.pass,
      variant: selection.variant,
      isRetrograde: selection.isRetrograde,
      window: selection.window,
      transitHouse: selection.transitHouse || undefined,
      natalHouse: selection.natalHouse || undefined
    });
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

export function transitNatalContactContentKey(selection: Pick<TransitNatalSelection, "planet" | "natalPoint" | "aspect">) {
  const key = isEligibleTransitReturn(selection.planet, selection.natalPoint, selection.aspect)
    ? `authored/transit-return/${selection.planet}`
    : `authored/transit-aspect/${selection.planet}/${selection.natalPoint}/${selection.aspect}`;
  return isDynamicTransitNatalExactKey(key) ? key : null;
}

export function transitNatalSituationContentKey(selection: Pick<TransitNatalSelection, "planet" | "natalPoint" | "aspect" | "sign" | "transitHouse" | "natalHouse">) {
  const contactKey = transitNatalContactContentKey(selection);
  if (!contactKey?.startsWith("authored/transit-aspect/")) return null;
  const key = transitAspectSituationKey(
    selection.planet,
    selection.natalPoint,
    selection.aspect,
    selection.sign,
    selection.transitHouse,
    selection.natalHouse
  );
  return key && isDynamicTransitNatalExactKey(key) ? key : null;
}

export function transitNatalExactContentKey(selection: Pick<TransitNatalSelection, "planet" | "natalPoint" | "aspect"> & Partial<Pick<TransitNatalSelection, "sign" | "transitHouse" | "natalHouse">>) {
  if (selection.sign && selection.transitHouse && selection.natalHouse) {
    return transitNatalSituationContentKey({
      planet: selection.planet,
      natalPoint: selection.natalPoint,
      aspect: selection.aspect,
      sign: selection.sign,
      transitHouse: selection.transitHouse,
      natalHouse: selection.natalHouse
    }) ?? transitNatalContactContentKey(selection);
  }
  return transitNatalContactContentKey(selection);
}

export function transitNatalSharedFallbackKey(selection: Pick<TransitNatalSelection, "planet" | "natalPoint" | "aspect">) {
  if (!transitNatalExactContentKey(selection) || isEligibleTransitReturn(selection.planet, selection.natalPoint, selection.aspect)) return null;
  const family = selection.aspect === "trine" || selection.aspect === "sextile" ? "soft" : "hard";
  return `authored/transit-aspect/${selection.planet}/${selection.natalPoint}/${family}`;
}

export function transitNatalStarterCopy(source: Record<string, unknown> | null | undefined) {
  const you = typeof source?.body_you === "string" && source.body_you.trim()
    ? source.body_you
    : typeof source?.body === "string" ? source.body : "";
  const they = typeof source?.body_they === "string" ? source.body_they : "";
  return { body_you: you, body_they: they };
}

/** New exact-key draft. Optional starter copy is the shared fallback currently shown, never labeled as that source. */
export function transitNatalExactSourceDraft(
  selection: Pick<TransitNatalSelection, "planet" | "natalPoint" | "aspect"> & Partial<Pick<TransitNatalSelection, "sign" | "transitHouse" | "natalHouse">>,
  starter: { body_you?: string; body_they?: string } = {}
) {
  const contentKey = transitNatalExactContentKey(selection);
  if (!contentKey) throw new Error("This transit aspect is not supported by the reader.");
  const isReturn = contentKey.startsWith("authored/transit-return/");
  const you = typeof starter.body_you === "string" ? starter.body_you : "";
  const they = typeof starter.body_they === "string" ? starter.body_they : "";
  return {
    id: null,
    contentKey,
    surface: "you" as const,
    mode: "in_depth" as const,
    status: "DRAFT" as const,
    headline: isReturn
      ? `${selection.planet.split("-").map(word => word[0].toUpperCase() + word.slice(1)).join(" ")} return`
      : contentKey.split("/").length === 8
        ? `${transitNatalLabel(selection)} · ${selection.sign} houses ${selection.transitHouse}/${selection.natalHouse}`
        : transitNatalLabel(selection),
    summary: "",
    body: you,
    lane: "reference" as const,
    reviewState: "needs-review" as const,
    blockType: "fallback_hook" as const,
    promptVersion: "manual-admin",
    sections: { packageRecord: {
      contentKey, content_role: "full_copy", grammar_frame: "complete_sentence", surface: isReturn ? "transit-return" : "transit-aspect",
      body: you, ...(!isReturn ? { body_you: you, body_they: they } : {}),
      requiredSlots: ["aspectWord", "untilDate"], optionalSlots: ["Name"],
      reader_only: true, render_policy: "personal-transit-exact-v1", review_status: "needs_review"
    } },
    facts: {
      fallbackArchitectureV3: true,
      transiting: selection.planet,
      natal: selection.natalPoint,
      aspect: selection.aspect,
      ...(selection.sign ? { sign: selection.sign } : {}),
      ...(selection.transitHouse ? { transitHouse: selection.transitHouse } : {}),
      ...(selection.natalHouse ? { natalHouse: selection.natalHouse } : {})
    },
    reviewerNotes: "Exact personal-transit source shared by Sky Placement and You Transit. Review the complete passage before publishing.",
    sourceSnapshot: { contentType: "authored-content", contentSystem: "fallback", content_role: "full_copy", review_status: "needs_review", sourcePackage: "tldrastro-fallback-architecture-v3" }
  };
}
