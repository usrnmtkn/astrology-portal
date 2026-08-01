import bundledSkyCoreRowsV3 from "./fallbackArchitectureV3/bundled-sky-core-rows-v3.json";
import bundledSkyAuthoredCardsV3 from "./fallbackArchitectureV3/bundled-sky-authored-cards-v3.json";
import fallbackTemplatesV3 from "./fallbackArchitectureV3/templates/fallback-templates-v3.json";
import bundledManifestSummaryV3 from "./fallbackArchitectureV3/bundled-manifest-summary-v3.json";
import lunationBlendUnitsV1 from "./fallbackArchitectureV3/source-rows/lunation-blend-units-v1.json";
import placementInterimFixesV1 from "./fallbackArchitectureV3/source-rows/placement-interim-fixes-v1.json";
import skyArticleV1 from "./fallbackArchitectureV3/source-rows/sky-article-v1.json";
import skyAspectPhrasebookV1 from "./fallbackArchitectureV3/source-rows/sky-aspect-phrasebook-v1.json";
import skyPlacementVoicePassV1 from "./fallbackArchitectureV3/source-rows/sky-placement-inventories-voice-pass-v1.json";
import skyPlanetFramesV1 from "./fallbackArchitectureV3/source-rows/sky-planet-frames-v1.json";
import skySignCopySunV1 from "./fallbackArchitectureV3/source-rows/sky-sign-copy-sun-v1.json";
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

export type FallbackArchitectureV3PackageManifestSummary = Omit<
  FallbackArchitectureV3PackageManifest,
  "keys"
>;

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
    hookRows.length !== 42
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

function assertSkyPlanetFramesV1Import(
  source: typeof skyPlanetFramesV1
) {
  const rows = source.rows;
  const direct = rows.filter((row) => row.contentKey.startsWith("fallback-hook/sky-placement-frame/"));
  const retrograde = rows.filter((row) => row.contentKey.startsWith("fallback-hook/sky-placement-retro-frame/"));
  const keys = new Set(rows.map((row) => row.contentKey));

  if (
    rows.length !== 23
    || keys.size !== 23
    || direct.length !== 14
    || retrograde.length !== 9
    || rows.some((row) => row.review_status !== "approved")
    || rows.some((row) => row.body_you !== row.body_they)
  ) {
    throw new Error("Sky planet frames must contain 14 direct and 9 retrograde owner-approved single-voice rows.");
  }
}

assertSkyPlanetFramesV1Import(skyPlanetFramesV1);

function assertSkyPlacementVoicePassV1Import(
  source: typeof skyPlacementVoicePassV1
) {
  const rows = source.rows;
  const keys = new Set(rows.map((row) => row.contentKey));

  if (
    rows.length !== 42
    || keys.size !== 42
    || rows.some((row) => row.review_status !== "needs_review")
    || rows.some((row) => row.body_you !== row.body_they)
  ) {
    throw new Error("Sky placement voice pass must contain 42 review-gated, single-voice rows.");
  }
}

assertSkyPlacementVoicePassV1Import(skyPlacementVoicePassV1);

function assertSkySignCopySunV1Import(
  source: typeof skySignCopySunV1
) {
  const rows = source.rows;
  const supersededRows = source.superseded_rows;

  if (
    rows.length !== 1
    || rows[0]?.contentKey !== "fallback-hook/sky-sign-copy/sun/leo"
    || rows[0]?.review_status !== "approved"
    || rows[0]?.render_policy !== "sky-placement-continuous-v2"
    || rows.some((row) => row.body_you !== row.body_they)
    || supersededRows.length !== 13
    || new Set(supersededRows.map((row) => row.contentKey)).size !== 12
    || supersededRows.some((row) => row.review_status !== "superseded")
  ) {
    throw new Error("Sun sign copy must contain one approved continuous Leo unit and 13 historical non-rendering superseded rows.");
  }
}

assertSkySignCopySunV1Import(skySignCopySunV1);

function assertSkyAspectPhrasebookV1Import(phrasebook: typeof skyAspectPhrasebookV1) {
  const rows = phrasebook.hookRows;
  const expectedFamilies = new Map([
    ["fallback-hook/sky-aspect-pair/", 30],
    ["fallback-hook/sky-aspect-exact/", 3],
    ["fallback-hook/sky-placement-sign/", 36],
    ["fallback-hook/sky-aspect-sign/", 72]
  ]);

  if (rows.length !== 141 || rows.some((row) => row.review_status !== "reviewed")) {
    throw new Error("Sky aspect phrasebook must contain exactly 141 reviewed rows.");
  }

  for (const [prefix, expected] of expectedFamilies) {
    const count = rows.filter((row) => row.contentKey.startsWith(prefix)).length;

    if (count !== expected) {
      throw new Error(`Sky aspect phrasebook ${prefix} coverage mismatch: ${count}/${expected}.`);
    }
  }
}

assertSkyAspectPhrasebookV1Import(skyAspectPhrasebookV1);

const snapshotBundle: FallbackArchitectureV3Bundle = {
  transitLib: {
    authoredCards: [
      ...(bundledSkyAuthoredCardsV3.authoredCards as AuthoredCard[]),
      ...(lunationBlendUnitsV1.authoredCards as AuthoredCard[]),
      ...(skyArticleV1.authoredCards as AuthoredCard[]),
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
    hookRows: [
      ...((bundledSkyCoreRowsV3 as RowsFile).hookRows ?? []),
      ...(lunationBlendUnitsV1.hookRows as HookRow[]),
      ...(skyArticleV1.hookRows as HookRow[]),
      ...(skyAspectPhrasebookV1.hookRows as HookRow[]),
      ...(skyPlanetFramesV1.rows as HookRow[]),
      ...(skyPlacementVoicePassV1.rows as HookRow[]),
      ...(skySignCopySunV1.rows as HookRow[])
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

export function loadFallbackArchitectureV3BundledManifest() {
  bundledManifestPromise ??= import("./fallbackArchitectureV3/bundled-manifest-v3.json")
    .then((module) => module.default as FallbackArchitectureV3PackageManifest)
    .catch((error) => {
      bundledManifestPromise = null;
      throw error;
    });

  return bundledManifestPromise;
}

const initialReaderBundle = readerEligibleBundle(snapshotBundle);
let activeReaderBundle = initialReaderBundle;
let fullFallbackBundleInstalled = false;
let deferredFallbackBundlePromise: Promise<boolean> | null = null;
export let fallbackRendererV3 = createAppFallbackRenderer(initialReaderBundle);
export let transitSynastryFallbackRendererV3 = createAppTransitRenderer(initialReaderBundle);
let vocabularyRowsByKey = vocabularyRowsByContentKey(initialReaderBundle.rowsFile);
let hookRowsByKey = hookRowsByContentKey(initialReaderBundle.rowsFile);
let transitAuthoredCardsByKey = authoredCardsByContentKey(initialReaderBundle.transitLib);

function activateReaderBundle(readerBundle: FallbackArchitectureV3Bundle) {
  activeReaderBundle = readerBundle;
  fallbackRendererV3 = createAppFallbackRenderer(readerBundle);
  transitSynastryFallbackRendererV3 = createAppTransitRenderer(readerBundle);
  vocabularyRowsByKey = vocabularyRowsByContentKey(readerBundle.rowsFile);
  hookRowsByKey = hookRowsByContentKey(readerBundle.rowsFile);
  transitAuthoredCardsByKey = authoredCardsByContentKey(readerBundle.transitLib);
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
  fullFallbackBundleInstalled = true;
  activateReaderBundle(readerBundle);

  return manifest;
}

export function isDeferredFallbackArchitectureV3BundleLoaded() {
  return fullFallbackBundleInstalled;
}

export async function loadDeferredFallbackArchitectureV3Bundle() {
  if (fullFallbackBundleInstalled) {
    return false;
  }

  deferredFallbackBundlePromise ??= import("./fallbackArchitectureV3DeferredBundle")
    .then(({ deferredFallbackArchitectureV3Bundle }) => {
      if (fullFallbackBundleInstalled) {
        return false;
      }

      const readerBundle = readerEligibleBundle({
        transitLib: {
          // The original package order places transit rows before the smaller
          // Sky/weekly overrides that are already active.
          authoredCards: [
            ...deferredFallbackArchitectureV3Bundle.transitLib.authoredCards,
            ...activeReaderBundle.transitLib.authoredCards
          ]
        },
        templatesFile: activeReaderBundle.templatesFile,
        rowsFile: {
          hookRows: [
            ...(activeReaderBundle.rowsFile.hookRows ?? []),
            ...(deferredFallbackArchitectureV3Bundle.rowsFile.hookRows ?? [])
          ],
          vocabularyRows: [
            ...(activeReaderBundle.rowsFile.vocabularyRows ?? []),
            ...(deferredFallbackArchitectureV3Bundle.rowsFile.vocabularyRows ?? [])
          ]
        }
      });

      fullFallbackBundleInstalled = true;
      activateReaderBundle(readerBundle);
      return true;
    })
    .catch((error) => {
      deferredFallbackBundlePromise = null;
      throw error;
    });

  return deferredFallbackBundlePromise;
}
