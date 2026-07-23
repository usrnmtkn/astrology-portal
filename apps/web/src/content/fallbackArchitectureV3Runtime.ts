import fallbackSourceRowsV3 from "./fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json";
import fallbackTemplatesV3 from "./fallbackArchitectureV3/templates/fallback-templates-v3.json";
import transitSynastryRowsV1 from "./fallbackArchitectureV3/source-rows/transit-synastry-rows-v1.json";
// The package ships a prebuilt ESM bundle. Keep resolver logic package-owned.
// @ts-ignore Package bundle is JavaScript-only; app-facing types live below.
import { createFallbackRenderer, createTransitSynastryRenderer, normalizeAspect, PACKAGE_VERSION, SourceGapError } from "./fallbackArchitectureV3/dist/tldr-content.js";

export { normalizeAspect, SourceGapError };
export const fallbackArchitectureV3PackageVersion = PACKAGE_VERSION;

export type ReviewStatus = "approved" | "approved_reuse" | "reviewed" | string;

export type AuthoredCard = {
  contentKey: string;
  content_role?: string | null;
  headline?: string | null;
  body?: string | null;
  tag?: string | null;
  review_status?: ReviewStatus | null;
  [key: string]: unknown;
};

export type HookRow = {
  contentKey: string;
  content_role?: string | null;
  title?: string | null;
  body?: string | null;
  body_you?: string | null;
  body_they?: string | null;
  question?: string | null;
  review_status?: ReviewStatus | null;
  [key: string]: unknown;
};

export type VocabRow = {
  contentKey: string;
  content_role?: string | null;
  body?: string | null;
  review_status?: ReviewStatus | null;
  [key: string]: unknown;
};

export type TemplateRow = {
  contentKey: string;
  content_role?: string | null;
  body?: string | null;
  body_you?: string | null;
  body_they?: string | null;
  requiredSlots?: string[];
  review_status?: ReviewStatus | null;
  [key: string]: unknown;
};

export type TransitLibFile = {
  authoredCards: AuthoredCard[];
};

export type HouseTransitFacts = {
  planet: string;
  house: number;
  sign?: string | null;
  motion?: "direct" | "retrograde" | null;
  window?: string | null;
  voice?: "you" | string;
};

export type RowsFile = {
  hookRows?: HookRow[];
  vocabularyRows?: VocabRow[];
};

export type TemplatesFile = {
  templates: TemplateRow[];
};

export type FallbackArchitectureV3Bundle = {
  transitLib: TransitLibFile;
  templatesFile: TemplatesFile;
  rowsFile: RowsFile;
};

export type SkyEvent = {
  type: string;
  a?: string;
  b?: string;
  aspect?: string;
  sign?: string;
  aSign?: string;
  bSign?: string;
  dateLine?: string;
  [key: string]: unknown;
};

export type AngleFacts = {
  angle: "ascendant" | "descendant" | "midheaven" | "imum-coeli";
  sign: string;
  voice?: "you" | string;
  [key: string]: unknown;
};

export type AspectFacts = {
  planetA: string;
  planetB: string;
  aspect: "conjunction" | "opposition" | "square" | "trine" | "sextile";
  voice?: "you" | string;
  [key: string]: unknown;
};

const snapshotBundle: FallbackArchitectureV3Bundle = {
  transitLib: {
    authoredCards: transitSynastryRowsV1.authoredCards as AuthoredCard[]
  },
  templatesFile: fallbackTemplatesV3 as TemplatesFile,
  rowsFile: fallbackSourceRowsV3 as RowsFile
};

const readerEligibleReviewStatuses = new Set(["approved", "approved_reuse", "reviewed"]);

function isReaderEligible(row: { review_status?: ReviewStatus | null }) {
  return readerEligibleReviewStatuses.has(String(row.review_status ?? "").trim().toLowerCase());
}

function createAppTransitRenderer(bundle: FallbackArchitectureV3Bundle) {
  // The package transit factory intentionally exposes review rows for admin QA.
  // Production gets a reader-eligible view so needs_review additions stay dark.
  const readerBundle: FallbackArchitectureV3Bundle = {
    transitLib: {
      authoredCards: bundle.transitLib.authoredCards.filter(isReaderEligible)
    },
    templatesFile: bundle.templatesFile,
    rowsFile: {
      hookRows: (bundle.rowsFile.hookRows ?? []).filter(isReaderEligible),
      vocabularyRows: (bundle.rowsFile.vocabularyRows ?? []).filter(isReaderEligible)
    }
  };

  return createTransitSynastryRenderer(
    readerBundle.transitLib,
    readerBundle.templatesFile,
    readerBundle.rowsFile
  );
}

export let fallbackRendererV3 = createFallbackRenderer(snapshotBundle.templatesFile, snapshotBundle.rowsFile);
export let transitSynastryFallbackRendererV3 = createAppTransitRenderer(snapshotBundle);
let vocabularyRowsByKey = vocabularyRowsByContentKey(snapshotBundle.rowsFile);
let transitAuthoredCardsByKey = authoredCardsByContentKey(snapshotBundle.transitLib);

const signRulers: Record<string, string> = {
  aries: "Mars",
  taurus: "Venus",
  gemini: "Mercury",
  cancer: "Moon",
  leo: "Sun",
  virgo: "Mercury",
  libra: "Venus",
  scorpio: "Mars",
  sagittarius: "Jupiter",
  capricorn: "Saturn",
  aquarius: "Saturn",
  pisces: "Jupiter"
};

function contentIdPart(value: string | number) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function vocabularyRowsByContentKey(rowsFile: RowsFile) {
  return new Map((rowsFile.vocabularyRows ?? []).map((row) => [row.contentKey, row]));
}

function authoredCardsByContentKey(transitLib: TransitLibFile) {
  return new Map((transitLib.authoredCards ?? []).map((card) => [card.contentKey, card]));
}

function vocabularyBody(contentKey: string) {
  const body = vocabularyRowsByKey.get(contentKey)?.body;
  return typeof body === "string" ? body : "";
}

export function fallbackV3PlanetTopic(planet: string) {
  const normalized = contentIdPart(planet);
  const nodeAlias = normalized === "true-node" ? "north-node" : normalized;
  return vocabularyBody(`fallback-vocab/planet-function/${nodeAlias}`);
}

export function fallbackV3HouseTopic(house: number) {
  return vocabularyBody(`fallback-vocab/house-topic/${house}`);
}

export function fallbackV3SignStyle(sign: string) {
  return vocabularyBody(`fallback-vocab/sign-style/${contentIdPart(sign)}`);
}

export function fallbackV3AspectFeel(aspect: string) {
  const normalized = normalizeAspect(aspect);
  return normalized ? vocabularyBody(`fallback-vocab/aspect-feel/${normalized}`) : "";
}

export function fallbackV3SignRuler(sign: string) {
  return signRulers[contentIdPart(sign)] ?? "";
}

export function transitV3AuthoredCardForContentKey(contentKey: string | null | undefined) {
  return contentKey ? transitAuthoredCardsByKey.get(contentKey) ?? null : null;
}

export function transitV3SameBeatKeyForContentKey(contentKey: string | null | undefined) {
  const notes = transitV3AuthoredCardForContentKey(contentKey)?.editorial_notes;
  const text = typeof notes === "string" ? notes.toLowerCase() : "";

  if (text.includes("stop calling it coincidence") || text.includes("none of it is random")) {
    return "transit-same-beat/randomness-pattern";
  }

  return null;
}

export function installFallbackArchitectureV3Bundle(bundle: FallbackArchitectureV3Bundle) {
  fallbackRendererV3 = createFallbackRenderer(bundle.templatesFile, bundle.rowsFile);
  transitSynastryFallbackRendererV3 = createAppTransitRenderer(bundle);
  vocabularyRowsByKey = vocabularyRowsByContentKey(bundle.rowsFile);
  transitAuthoredCardsByKey = authoredCardsByContentKey(bundle.transitLib);
}
