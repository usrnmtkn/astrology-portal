import bundledSkyCoreRowsV3 from "./fallbackArchitectureV3/bundled-sky-core-rows-v3.json";
import bundledSkyAuthoredCardsV3 from "./fallbackArchitectureV3/bundled-sky-authored-cards-v3.json";
import fallbackTemplatesV3 from "./fallbackArchitectureV3/templates/fallback-templates-v3.json";
import bundledManifestSummaryV3 from "./fallbackArchitectureV3/bundled-manifest-summary-v3.json";
import lunationBlendUnitsV1 from "./fallbackArchitectureV3/source-rows/lunation-blend-units-v1.json";
import placementInterimFixesV1 from "./fallbackArchitectureV3/source-rows/placement-interim-fixes-v1.json";
import skyArticleV1 from "./fallbackArchitectureV3/source-rows/sky-article-v1.json";
import skyAspectPhrasebookV1 from "./fallbackArchitectureV3/source-rows/sky-aspect-phrasebook-v1.json";
import timingEventReaderCopyV2 from "./fallbackArchitectureV3/source-rows/timing-event-reader-copy-v2.json";
import weeklySourceRowsV1 from "./fallbackArchitectureV3/source-rows/station-cards-week-openers-v1.json";
// The package ships a prebuilt ESM bundle. Keep resolver logic package-owned.
// @ts-ignore Package bundle is JavaScript-only; app-facing types live below.
import { createFallbackRenderer, createPackageManifest, createTransitSynastryRenderer, normalizeAspect, PACKAGE_VERSION, SourceGapError } from "./fallbackArchitectureV3/dist/tldr-content.js";

export { normalizeAspect, SourceGapError };
export {
  KNOWLEDGE_MATRIX_V9_BASE_PATH,
  KNOWLEDGE_MATRIX_V9_VERSION,
  loadKnowledgeMatrixV9Runtime,
  renderKnowledgeMatrixV9HouseActivation,
  renderKnowledgeMatrixV9TransitMeaning
} from "./knowledgeMatrixV9Runtime";
export {
  KNOWLEDGE_MATRIX_V13_BASE_PATH,
  KNOWLEDGE_MATRIX_V13_VERSION,
  loadKnowledgeMatrixV13Runtime,
  renderKnowledgeMatrixV13NatalAspect,
  renderKnowledgeMatrixV13Placement,
  renderKnowledgeMatrixV13WorkbookKey
} from "./knowledgeMatrixV13Runtime";
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
  // Legacy package field name. Current Sky continuous rows are collective;
  // the renderer reads their structured fields and performs no pronoun rewrite.
  body_you?: string | null;
  body_they?: string | null;
  body_sky?: string | null;
  question?: string | null;
  review_status?: ReviewStatus | null;
  render_policy?: string | null;
  fact_line?: string | null;
  aspect_insert?: string | null;
  opening?: string | null;
  tension?: string | null;
  development?: string | null;
  close?: string | null;
  try_this?: string[];
  aspect_units?: Array<{
    planets: string[];
    aspect: string;
    heading: string;
    opportunity: string;
    check: string;
  }>;
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

export type FallbackArchitectureV3PackagePartitionSummary = Omit<
  FallbackArchitectureV3PackageManifest,
  "keys" | "packageVersion"
>;

export type FallbackArchitectureV3PackageManifestSummary = Omit<
  FallbackArchitectureV3PackageManifest,
  "keys"
> & {
  runtimeCapability?: string;
  partitions?: {
    core: FallbackArchitectureV3PackagePartitionSummary;
    skyPlacement: FallbackArchitectureV3PackagePartitionSummary;
  };
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
  aspect: "conjunction" | "opposition" | "square" | "trine" | "sextile" | "quincunx" | "semisextile" | "nonagen";
  voice?: "you" | string;
  [key: string]: unknown;
};

function assertSkyArticleV1Import(
  registry: typeof skyArticleV1
) {
  const articles = registry.authoredCards;
  const hookRows = registry.hookRows;
  const vocabularyRows = registry.vocabularyRows;
  const articleKeys = new Set(articles.map((row) => row.contentKey));
  const vocabularyKeys = new Set(vocabularyRows.map((row) => row.contentKey));

  if (articles.length !== articleKeys.size) {
    throw new Error("Sky article registry contains duplicate article keys.");
  }
  if (
    vocabularyRows.length !== 25
    || vocabularyKeys.size !== 25
    || vocabularyRows.some((row) => !row.contentKey.startsWith("fallback-vocab/sky-"))
  ) {
    throw new Error("Sky article registry must contain exactly 25 surface-scoped vocabulary rows.");
  }
  if (
    hookRows.length !== 14
    || hookRows.some((row) => row.review_status !== "approved")
    || vocabularyRows.some((row) => row.review_status !== "approved")
  ) {
    throw new Error("Sky V3 frames and surface-scoped vocabulary must be owner-approved.");
  }
  const literalSkyRowDate = /\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?|\d{4})\b/u;
  for (const row of hookRows) {
    if (literalSkyRowDate.test(row.body_you)) {
      throw new Error(`Sky placement V3 row contains a literal date: ${row.contentKey}`);
    }
  }
  if (vocabularyRows.some((row) => (
    row.contentKey.startsWith("fallback-vocab/sign-style/")
    || row.contentKey.startsWith("fallback-vocab/planet-function/")
  ))) {
    throw new Error("Sky article imports may not modify shared sign-style or planet-function banks.");
  }
  for (const article of articles) {
    if (
      !/^sky-article\/[a-z-]+\/[a-z-]+\/\d{4}$/u.test(article.contentKey)
      || !/^\d{4}-\d{2}-\d{2}$/u.test(article.valid_from)
      || !/^\d{4}-\d{2}-\d{2}$/u.test(article.valid_to)
      || article.valid_from > article.valid_to
    ) {
      throw new Error(`Invalid sky article registry row: ${article.contentKey}`);
    }
  }
  const saturnArchive = articles.find((row) => row.contentKey === "sky-article/saturn/pisces/2023");
  const saturnAries = articles.find((row) => row.contentKey === "sky-article/saturn/aries/2026");
  if (
    !saturnArchive
    || saturnArchive.archive_only !== true
    || saturnArchive.key_dates.length !== 9
  ) {
    throw new Error("Saturn in Pisces must import as the nine-date archive calibration article.");
  }
  if (
    !saturnAries
    || saturnAries.review_status !== "approved"
    || saturnAries.article_variant !== "retrograde"
    || saturnAries.key_dates_mode !== "engine"
  ) {
    throw new Error("Saturn in Aries must be an approved, engine-dated retrograde article.");
  }
}

assertSkyArticleV1Import(skyArticleV1);

function assertSkyAspectPhrasebookV1Import(phrasebook: typeof skyAspectPhrasebookV1) {
  const rows = phrasebook.hookRows;
  const expectedFamilies = new Map([
    ["fallback-hook/sky-aspect-pair/", 30],
    ["fallback-hook/sky-aspect-exact/", 4],
    ["fallback-hook/sky-placement-sign/", 36],
    ["fallback-hook/sky-aspect-sign/", 78]
  ]);

  if (rows.length !== 148 || rows.some((row) => row.review_status !== "reviewed")) {
    throw new Error("Sky aspect phrasebook must contain exactly 148 reviewed rows.");
  }

  for (const [prefix, expected] of expectedFamilies) {
    const count = rows.filter((row) => row.contentKey.startsWith(prefix)).length;

    if (count !== expected) {
      throw new Error(`Sky aspect phrasebook ${prefix} coverage mismatch: ${count}/${expected}.`);
    }
  }
}

assertSkyAspectPhrasebookV1Import(skyAspectPhrasebookV1);

function assertTimingEventReaderCopyV2Import(
  source: typeof timingEventReaderCopyV2
) {
  const cards = source.authoredCards;
  const keys = new Set(cards.map((card) => card.contentKey));

  if (
    source.version !== "timing-event-reader-copy-v2"
    || cards.length !== 4
    || keys.size !== 4
    || cards.some((card) => card.review_status !== "approved")
    || cards.some((card) => card.content_role !== "full_copy")
    || cards.some((card) => !card.owner_authored)
    || cards.some((card) => !card.headline.trim() || !card.body.includes("\n\n"))
    || cards.some((card) => !card.source_keys.includes("owner/timing-event-reader-copy-v2-approved"))
  ) {
    throw new Error("Timing-event reader copy V2 must contain four unique, owner-approved exact cards.");
  }
}

assertTimingEventReaderCopyV2Import(timingEventReaderCopyV2);

const snapshotBundle: FallbackArchitectureV3Bundle = {
  transitLib: {
    authoredCards: [
      ...(bundledSkyAuthoredCardsV3.authoredCards as AuthoredCard[]),
      ...(lunationBlendUnitsV1.authoredCards as AuthoredCard[]),
      ...(skyArticleV1.authoredCards as AuthoredCard[]),
      ...(weeklySourceRowsV1 as AuthoredCard[]),
      ...(timingEventReaderCopyV2.authoredCards as AuthoredCard[])
    ]
  },
  templatesFile: {
    templates: [
      ...((fallbackTemplatesV3 as TemplatesFile).templates ?? []),
      ...(placementInterimFixesV1.templates as TemplateRow[])
    ]
  },
  rowsFile: {
    hookRows: [
      ...((bundledSkyCoreRowsV3 as RowsFile).hookRows ?? []),
      ...(lunationBlendUnitsV1.hookRows as HookRow[]),
      ...(skyArticleV1.hookRows as HookRow[]),
      ...(skyAspectPhrasebookV1.hookRows as HookRow[])
    ],
    vocabularyRows: [
      ...((bundledSkyCoreRowsV3 as RowsFile).vocabularyRows ?? []),
      ...(placementInterimFixesV1.vocabularyRows as VocabRow[]),
      ...(skyArticleV1.vocabularyRows as VocabRow[])
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

function createAppTransitRenderer(readerBundle: FallbackArchitectureV3Bundle) {
  return createTransitSynastryRenderer(
    readerBundle.transitLib,
    readerBundle.templatesFile,
    readerBundle.rowsFile
  );
}

function createAppFallbackRenderer(readerBundle: FallbackArchitectureV3Bundle) {
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

export const fallbackArchitectureV3BundledManifestSummary = bundledManifestSummaryV3 as FallbackArchitectureV3PackageManifestSummary;
let bundledManifestPromise: Promise<FallbackArchitectureV3PackageManifest> | null = null;
let bundledCoreManifestPromise: Promise<FallbackArchitectureV3PackageManifest> | null = null;
let bundledSkyPlacementManifestPromise: Promise<FallbackArchitectureV3PackageManifest> | null = null;

export function loadFallbackArchitectureV3BundledManifest() {
  bundledManifestPromise ??= import("./fallbackArchitectureV3/bundled-manifest-v3.json")
    .then((module) => module.default as FallbackArchitectureV3PackageManifest)
    .catch((error) => {
      bundledManifestPromise = null;
      throw error;
    });

  return bundledManifestPromise;
}

export function loadFallbackArchitectureV3BundledCoreManifest() {
  bundledCoreManifestPromise ??= import("./fallbackArchitectureV3/bundled-core-manifest-v3.json")
    .then((module) => module.default as FallbackArchitectureV3PackageManifest)
    .catch((error) => {
      bundledCoreManifestPromise = null;
      throw error;
    });

  return bundledCoreManifestPromise;
}

export function loadFallbackArchitectureV3BundledSkyPlacementManifest() {
  bundledSkyPlacementManifestPromise ??= import("./fallbackArchitectureV3/bundled-sky-placement-manifest-v3.json")
    .then((module) => module.default as FallbackArchitectureV3PackageManifest)
    .catch((error) => {
      bundledSkyPlacementManifestPromise = null;
      throw error;
    });

  return bundledSkyPlacementManifestPromise;
}

const initialReaderBundle = readerEligibleBundle(snapshotBundle);
let localDeferredReaderBundle: FallbackArchitectureV3Bundle | null = null;
let localEmptyHouseReaderBundle: FallbackArchitectureV3Bundle | null = null;
let localRelationshipReaderBundle: FallbackArchitectureV3Bundle | null = null;
let localSkyPlacementReaderBundle: FallbackArchitectureV3Bundle | null = null;
let dashboardCoreReaderBundle: FallbackArchitectureV3Bundle | null = null;
let dashboardSkyPlacementReaderBundle: FallbackArchitectureV3Bundle | null = null;
let deferredFallbackBundlePromise: Promise<boolean> | null = null;
let emptyHouseFallbackBundlePromise: Promise<boolean> | null = null;
let relationshipFallbackBundlePromise: Promise<boolean> | null = null;
let skyPlacementFallbackBundlePromise: Promise<boolean> | null = null;
export let fallbackRendererV3 = createAppFallbackRenderer(initialReaderBundle);
export let transitSynastryFallbackRendererV3 = createAppTransitRenderer(initialReaderBundle);
let vocabularyRowsByKey = vocabularyRowsByContentKey(initialReaderBundle.rowsFile);
let hookRowsByKey = hookRowsByContentKey(initialReaderBundle.rowsFile);
let transitAuthoredCardsByKey = authoredCardsByContentKey(initialReaderBundle.transitLib);

function activateReaderBundle(readerBundle: FallbackArchitectureV3Bundle) {
  fallbackRendererV3 = createAppFallbackRenderer(readerBundle);
  transitSynastryFallbackRendererV3 = createAppTransitRenderer(readerBundle);
  vocabularyRowsByKey = vocabularyRowsByContentKey(readerBundle.rowsFile);
  hookRowsByKey = hookRowsByContentKey(readerBundle.rowsFile);
  transitAuthoredCardsByKey = authoredCardsByContentKey(readerBundle.transitLib);
}

function mergeReaderBundles(
  base: FallbackArchitectureV3Bundle,
  extension: FallbackArchitectureV3Bundle | null
): FallbackArchitectureV3Bundle {
  if (!extension) return base;

  return readerEligibleBundle({
    transitLib: {
      authoredCards: [
        ...base.transitLib.authoredCards,
        ...extension.transitLib.authoredCards
      ]
    },
    templatesFile: {
      templates: [
        ...base.templatesFile.templates,
        ...extension.templatesFile.templates
      ]
    },
    rowsFile: {
      hookRows: [
        ...(base.rowsFile.hookRows ?? []),
        ...(extension.rowsFile.hookRows ?? [])
      ],
      vocabularyRows: [
        ...(base.rowsFile.vocabularyRows ?? []),
        ...(extension.rowsFile.vocabularyRows ?? [])
      ]
    }
  });
}

function recomposeReaderBundle() {
  const localCoreWithDeferred = mergeReaderBundles(initialReaderBundle, localDeferredReaderBundle);
  const localCoreWithEmptyHouses = mergeReaderBundles(localCoreWithDeferred, localEmptyHouseReaderBundle);
  const localCoreWithRelationships = mergeReaderBundles(localCoreWithEmptyHouses, localRelationshipReaderBundle);
  const core = dashboardCoreReaderBundle ?? localCoreWithRelationships;
  const placement = dashboardSkyPlacementReaderBundle ?? localSkyPlacementReaderBundle;
  activateReaderBundle(mergeReaderBundles(core, placement));
}

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

export function fallbackV3LunationCompact(kind: "new-moon" | "full-moon", sign: string) {
  const signKey = contentIdPart(sign);
  const contentKey = `fallback-hook/lunation-sign-compact/${kind}/${signKey}`;
  const body = fallbackV3HookBody(contentKey).trim();

  if (!body) return null;

  const signTitle = signKey
    .split("-")
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
  return {
    headline: `${kind === "new-moon" ? "New Moon" : "Full Moon"} in ${signTitle}`,
    body,
    parts: [body],
    contentKey
  };
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
  dashboardCoreReaderBundle = readerBundle;
  recomposeReaderBundle();

  return manifest;
}

export function installSkyPlacementFallbackArchitectureV3Bundle(
  bundle: FallbackArchitectureV3Bundle,
  packageVersion = bundle.packageManifest?.packageVersion ?? fallbackArchitectureV3PackageVersion
) {
  const readerBundle = readerEligibleBundle(bundle);
  const manifest = fallbackArchitectureV3ManifestForBundle(readerBundle, packageVersion);
  dashboardSkyPlacementReaderBundle = readerBundle;
  recomposeReaderBundle();

  return manifest;
}

export function isDeferredFallbackArchitectureV3BundleLoaded() {
  return Boolean(localDeferredReaderBundle || dashboardCoreReaderBundle);
}

export async function loadDeferredFallbackArchitectureV3Bundle() {
  if (localDeferredReaderBundle || dashboardCoreReaderBundle) {
    return false;
  }

  deferredFallbackBundlePromise ??= import("./fallbackArchitectureV3DeferredBundle")
    .then(({ deferredFallbackArchitectureV3Bundle }) => {
      if (localDeferredReaderBundle || dashboardCoreReaderBundle) {
        return false;
      }

      localDeferredReaderBundle = readerEligibleBundle(deferredFallbackArchitectureV3Bundle);
      recomposeReaderBundle();
      return true;
    })
    .catch((error) => {
      deferredFallbackBundlePromise = null;
      throw error;
    });

  return deferredFallbackBundlePromise;
}

export function isEmptyHouseFallbackArchitectureV3BundleLoaded() {
  return Boolean(localEmptyHouseReaderBundle || dashboardCoreReaderBundle);
}

export async function loadEmptyHouseFallbackArchitectureV3Bundle() {
  if (localEmptyHouseReaderBundle || dashboardCoreReaderBundle) {
    return false;
  }

  emptyHouseFallbackBundlePromise ??= import("./fallbackArchitectureV3EmptyHouseBundle")
    .then(({ emptyHouseFallbackArchitectureV3Bundle }) => {
      if (localEmptyHouseReaderBundle || dashboardCoreReaderBundle) {
        return false;
      }

      localEmptyHouseReaderBundle = readerEligibleBundle(emptyHouseFallbackArchitectureV3Bundle);
      recomposeReaderBundle();
      return true;
    })
    .catch((error) => {
      emptyHouseFallbackBundlePromise = null;
      throw error;
    });

  return emptyHouseFallbackBundlePromise;
}

export function isRelationshipFallbackArchitectureV3BundleLoaded() {
  return Boolean(localRelationshipReaderBundle || dashboardCoreReaderBundle);
}

export async function loadRelationshipFallbackArchitectureV3Bundle() {
  if (localRelationshipReaderBundle || dashboardCoreReaderBundle) {
    return false;
  }

  relationshipFallbackBundlePromise ??= import("./fallbackArchitectureV3RelationshipBundle")
    .then(({ relationshipFallbackArchitectureV3Bundle }) => {
      if (localRelationshipReaderBundle || dashboardCoreReaderBundle) {
        return false;
      }

      localRelationshipReaderBundle = readerEligibleBundle(relationshipFallbackArchitectureV3Bundle);
      recomposeReaderBundle();
      return true;
    })
    .catch((error) => {
      relationshipFallbackBundlePromise = null;
      throw error;
    });

  return relationshipFallbackBundlePromise;
}

export function isSkyPlacementFallbackArchitectureV3BundleLoaded() {
  return Boolean(localSkyPlacementReaderBundle || dashboardSkyPlacementReaderBundle);
}

export async function loadSkyPlacementFallbackArchitectureV3Bundle() {
  if (localSkyPlacementReaderBundle || dashboardSkyPlacementReaderBundle) {
    return false;
  }

  skyPlacementFallbackBundlePromise ??= import("./fallbackArchitectureV3SkyPlacementBundle")
    .then(({ skyPlacementFallbackArchitectureV3Bundle }) => {
      if (localSkyPlacementReaderBundle || dashboardSkyPlacementReaderBundle) {
        return false;
      }

      localSkyPlacementReaderBundle = readerEligibleBundle(skyPlacementFallbackArchitectureV3Bundle);
      recomposeReaderBundle();
      return true;
    })
    .catch((error) => {
      skyPlacementFallbackBundlePromise = null;
      throw error;
    });

  return skyPlacementFallbackBundlePromise;
}
