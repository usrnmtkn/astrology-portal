import fallbackSourceRowsV3 from "./fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json";
import fallbackTemplatesV3 from "./fallbackArchitectureV3/templates/fallback-templates-v3.json";
import lunationBlendUnitsV1 from "./fallbackArchitectureV3/source-rows/lunation-blend-units-v1.json";
import placementInterimFixesV1 from "./fallbackArchitectureV3/source-rows/placement-interim-fixes-v1.json";
import transitSynastryRowsV1 from "./fallbackArchitectureV3/source-rows/transit-synastry-rows-v1.json";
import weeklySourceRowsV1 from "./fallbackArchitectureV3/source-rows/station-cards-week-openers-v1.json";
// The package ships a prebuilt ESM bundle. Keep resolver logic package-owned.
// @ts-ignore Package bundle is JavaScript-only; app-facing types live below.
import { createFallbackRenderer, createPackageManifest, createTransitSynastryRenderer, normalizeAspect, PACKAGE_VERSION, SourceGapError } from "./fallbackArchitectureV3/dist/tldr-content.js";

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
  body_sky?: string | null;
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

export type TransitHouseEventFacts = {
  natal: string;
  aspect: "conjunction" | "opposition" | "square" | "trine" | "sextile";
  window?: string | null;
};

export type HouseTransitFacts = {
  planet: string;
  house: number;
  sign?: string | null;
  motion?: "direct" | "retrograde" | null;
  window?: string | null;
  voice?: "you" | string;
  variant?: 1 | 2 | 3 | null;
  events?: TransitHouseEventFacts[];
  isRetrograde?: boolean;
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
  packageManifest?: FallbackArchitectureV3PackageManifest;
};

export type FallbackArchitectureV3PackageManifest = {
  packageVersion: string;
  contentHash: string;
  keyManifestHash: string;
  keyCount: number;
  keys: string[];
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
  exactDate?: string;
  applying?: boolean;
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
    authoredCards: [
      ...(transitSynastryRowsV1.authoredCards as AuthoredCard[]),
      ...(lunationBlendUnitsV1.authoredCards as AuthoredCard[]),
      ...(weeklySourceRowsV1 as AuthoredCard[])
    ]
  },
  templatesFile: {
    templates: [
      ...((fallbackTemplatesV3 as TemplatesFile).templates ?? []),
      ...(placementInterimFixesV1.templates as TemplateRow[])
    ]
  },
  rowsFile: {
    ...(fallbackSourceRowsV3 as RowsFile),
    hookRows: [
      ...((fallbackSourceRowsV3 as RowsFile).hookRows ?? []),
      ...(lunationBlendUnitsV1.hookRows as HookRow[])
    ],
    vocabularyRows: [
      ...((fallbackSourceRowsV3 as RowsFile).vocabularyRows ?? []),
      ...(placementInterimFixesV1.vocabularyRows as VocabRow[])
    ]
  }
};

const readerEligibleReviewStatuses = new Set(["approved", "approved_reuse", "reviewed"]);

function isReaderEligible(row: { review_status?: ReviewStatus | null }) {
  return readerEligibleReviewStatuses.has(String(row.review_status ?? "").trim().toLowerCase());
}

function packageRowsWithLatestReaderEligibleOverride<
  T extends { contentKey: string; review_status?: ReviewStatus | null }
>(
  rows: T[],
  isEligible: (row: T) => boolean = isReaderEligible
) {
  const candidates = new Map<string, T[]>();
  for (const row of rows) {
    const keyed = candidates.get(row.contentKey) ?? [];
    keyed.push(row);
    candidates.set(row.contentKey, keyed);
  }

  return [...candidates.values()]
    .map((keyed) => [...keyed].reverse().find(isEligible))
    .filter((row): row is T => Boolean(row));
}

function readerEligibleBundle(bundle: FallbackArchitectureV3Bundle): FallbackArchitectureV3Bundle {
  // The package transit factory intentionally exposes review rows for admin QA.
  // Production gets a reader-eligible view so needs_review additions stay dark.
  return {
    transitLib: {
      authoredCards: packageRowsWithLatestReaderEligibleOverride(bundle.transitLib.authoredCards)
    },
    templatesFile: {
      templates: packageRowsWithLatestReaderEligibleOverride(
        bundle.templatesFile.templates,
        (row) => !row.review_status || isReaderEligible(row)
      )
    },
    rowsFile: {
      hookRows: packageRowsWithLatestReaderEligibleOverride(bundle.rowsFile.hookRows ?? []),
      vocabularyRows: packageRowsWithLatestReaderEligibleOverride(bundle.rowsFile.vocabularyRows ?? [])
    }
  };
}

function createAppTransitRenderer(bundle: FallbackArchitectureV3Bundle) {
  const readerBundle = readerEligibleBundle(bundle);
  return createTransitSynastryRenderer(
    readerBundle.transitLib,
    readerBundle.templatesFile,
    readerBundle.rowsFile
  );
}

function createAppFallbackRenderer(bundle: FallbackArchitectureV3Bundle) {
  const readerBundle = readerEligibleBundle(bundle);

  return createFallbackRenderer({
    templates: readerBundle.templatesFile.templates
  }, {
    hookRows: readerBundle.rowsFile.hookRows,
    vocabularyRows: readerBundle.rowsFile.vocabularyRows
  });
}

export function fallbackArchitectureV3ManifestForBundle(
  bundle: FallbackArchitectureV3Bundle,
  packageVersion = fallbackArchitectureV3PackageVersion
): FallbackArchitectureV3PackageManifest {
  return createPackageManifest(readerEligibleBundle(bundle), packageVersion);
}

export const fallbackArchitectureV3BundledManifest = fallbackArchitectureV3ManifestForBundle(snapshotBundle);

const initialReaderBundle = readerEligibleBundle(snapshotBundle);
export let fallbackRendererV3 = createAppFallbackRenderer(initialReaderBundle);
export let transitSynastryFallbackRendererV3 = createAppTransitRenderer(initialReaderBundle);
let vocabularyRowsByKey = vocabularyRowsByContentKey(initialReaderBundle.rowsFile);
let hookRowsByKey = hookRowsByContentKey(initialReaderBundle.rowsFile);
let transitAuthoredCardsByKey = authoredCardsByContentKey(initialReaderBundle.transitLib);

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
  return new Map((rowsFile.vocabularyRows ?? []).filter(isReaderEligible).map((row) => [row.contentKey, row]));
}

function hookRowsByContentKey(rowsFile: RowsFile) {
  return new Map((rowsFile.hookRows ?? []).filter(isReaderEligible).map((row) => [row.contentKey, row]));
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

export function fallbackV3VocabularyBody(contentKey: string) {
  return vocabularyBody(contentKey);
}

export function fallbackV3DignityGlossary(dignity: string) {
  return vocabularyBody(`fallback-vocab/dignity-glossary/${contentIdPart(dignity)}`);
}

export function fallbackV3HookBody(contentKey: string, voice: "you" | "they" = "you") {
  const row = hookRowsByKey.get(contentKey);
  const body = voice === "you" ? row?.body_you ?? row?.body : row?.body_they ?? row?.body;
  return typeof body === "string" ? body : "";
}

// Approved per-placement sentence (planet in sign), voice-aware. "they" is the
// third-person variant used for friend/event charts. Returns "" on SOURCE_GAP so
// callers hide the surface rather than substitute copy. The 23c package covers
// Ascendant and Midheaven; Descendant and IC intentionally remain uncovered.
export function fallbackV3PlacementSentence(planet: string, sign: string, voice: "you" | "they" = "they") {
  return fallbackV3HookBody(
    `fallback-hook/placement-sentence/${contentIdPart(planet)}/${contentIdPart(sign)}`,
    voice
  );
}

// Approved essential-dignity line (dignity + planet), voice-aware. Returns "" on
// SOURCE_GAP; coverage is partial, so most combinations hide until authored.
// "sky" is the impersonal, transient framing for the Sky page (the placement is
// happening now for everyone, not a trait of the reader). It reads only body_sky
// and never falls back to the personal you/they text.
export function fallbackV3DignityLine(dignity: string, planet: string, voice: "you" | "they" | "sky" = "you") {
  const contentKey = `fallback-hook/dignity-line/${contentIdPart(dignity)}/${contentIdPart(planet)}`;

  if (voice === "sky") {
    const body = hookRowsByKey.get(contentKey)?.body_sky;
    return typeof body === "string" ? body : "";
  }

  return fallbackV3HookBody(contentKey, voice);
}

export function renderHouseGlossaryV3(house: number, voice: "you" | string = "you") {
  return fallbackRendererV3.renderHouseGlossary({ house, voice });
}

// renderAspectPatternV3 was retired when the governed astro-knowledge
// resolver became the canonical copy system for the aspect-pattern reader
// (see api/_lib/aspect-patterns.ts). The V3 aspect-pattern source rows are
// archived in the package and are no longer a serving path.

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

export function installFallbackArchitectureV3Bundle(
  bundle: FallbackArchitectureV3Bundle,
  packageVersion = bundle.packageManifest?.packageVersion ?? fallbackArchitectureV3PackageVersion
) {
  const readerBundle = readerEligibleBundle(bundle);
  const manifest = fallbackArchitectureV3ManifestForBundle(readerBundle, packageVersion);
  fallbackRendererV3 = createAppFallbackRenderer(readerBundle);
  transitSynastryFallbackRendererV3 = createAppTransitRenderer(readerBundle);
  vocabularyRowsByKey = vocabularyRowsByContentKey(readerBundle.rowsFile);
  hookRowsByKey = hookRowsByContentKey(readerBundle.rowsFile);
  transitAuthoredCardsByKey = authoredCardsByContentKey(readerBundle.transitLib);

  return manifest;
}
