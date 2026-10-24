import { publicationRestoresBaseline, publicationAllowsContent, contentPublicationRecords, subscribeToContentPublications } from "./contentPublicationState";
import bundledSkyCoreRowsV3 from "./fallbackArchitectureV3/initial-sky-core-transport-v1.json";
import { authoredCards as readerAuthoredCards } from "./fallbackArchitectureV3/bundled-initial-reader-rows-v3.json";
import approvedServingProjectionV1 from "./fallbackArchitectureV3/approved-serving-projection-v1.json";
import bundledManifestSummaryV3 from "./fallbackArchitectureV3/bundled-manifest-summary-v3.json";
import { isGovernedReaderEligible } from "./fallbackArchitectureV3/resolver/readerEligibility.browser";
// The package ships a prebuilt ESM bundle. Keep resolver logic package-owned.
// @ts-ignore Package bundle is JavaScript-only; app-facing types live below.
import { createFallbackRenderer, createPackageManifest, createTransitSynastryRenderer, normalizeAspect, PACKAGE_VERSION, SourceGapError } from "./fallbackArchitectureV3/dist/tldr-content.js";

export { normalizeAspect, SourceGapError };
export {
  CANONICAL_NATAL_CONTENT_FLAG,
  canonicalNatalContentEnabled,
  createCanonicalNatalAdapter
} from "./canonicalContent/natalAdapter";
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

let loadedSkyV4ReaderRoute: ((input: Record<string, unknown>) => unknown) | null = null;

export const skyV4ReaderRenderer = {
  renderRoute(input: Record<string, unknown>) {
    if (!loadedSkyV4ReaderRoute) {
      throw new Error("SKY_V4_SOURCE_GAP: canonical reader package has not loaded.");
    }
    return loadedSkyV4ReaderRoute(input);
  }
};

function assertApprovedServingProjection() {
  if (
    approvedServingProjectionV1.schema !== "tldrastro-approved-serving-projection/v1"
    || approvedServingProjectionV1.packageVersion !== PACKAGE_VERSION
    || approvedServingProjectionV1.policy.pendingRowsPresent !== false
    || approvedServingProjectionV1.manifest.contentHash !== bundledManifestSummaryV3.contentHash
    || approvedServingProjectionV1.manifest.keyManifestHash !== bundledManifestSummaryV3.keyManifestHash
    || approvedServingProjectionV1.manifest.keyCount !== bundledManifestSummaryV3.keyCount
  ) {
    throw new Error("Fallback V3 approved-serving projection is stale or invalid.");
  }
}

assertApprovedServingProjection();

export type ReviewStatus = "approved" | "approved_reuse" | "reviewed" | string;

export type StructuredApproval = {
  approvalLevel?: string | null;
  [key: string]: unknown;
};

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
  dailyGlanceVariants?: {
    schema: string;
    version: string;
    note?: string;
    keys: Record<string, {
      pairing_policy: "explicit_pairs_only";
      headlines: Array<{ id: string; text: string; review_status: ReviewStatus; provenance?: Record<string, string> }>;
      bodies: Array<{ id: string; text: string; review_status: ReviewStatus; provenance?: Record<string, string> }>;
      pairings: Array<{ id: string; headline_id: string; body_id: string; review_status: ReviewStatus; provenance?: Record<string, string> }>;
    }>;
  };
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

export type NormalizedAspect = "conjunction" | "opposition" | "square" | "trine" | "sextile" | "quincunx" | "semisextile";
export type AspectInput = NormalizedAspect | "nonagen";
export type AspectFacts = {
  planetA: string;
  planetB: string;
  aspect: AspectInput;
  voice?: "you" | string;
  [key: string]: unknown;
};

function latestByContentKey<T extends { contentKey: string }>(rows: T[]): T[] {
  return [...new Map(rows.map((row) => [row.contentKey, row])).values()];
}

const approvedInitialAuthoredCards = latestByContentKey([
  ...(bundledSkyCoreRowsV3.authoredCards as AuthoredCard[])
]);
const approvedInitialHookRows = latestByContentKey([
  ...(bundledSkyCoreRowsV3.hookRows as HookRow[])
]);
const approvedInitialVocabularyRows = latestByContentKey([
  ...(bundledSkyCoreRowsV3.vocabularyRows as VocabRow[])
]);
const snapshotBundle: FallbackArchitectureV3Bundle = {
  transitLib: {
    authoredCards: approvedInitialAuthoredCards
  },
  templatesFile: {
    templates: bundledSkyCoreRowsV3.templates as TemplateRow[]
  },
  rowsFile: {
    hookRows: approvedInitialHookRows,
    vocabularyRows: approvedInitialVocabularyRows
  }
};

function isReaderEligible(row: { contentKey: string; review_status?: ReviewStatus | null; [key: string]: unknown }) {
  return isGovernedReaderEligible(row);
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
      vocabularyRows: packageRowsWithLatestReaderEligibleOverride(bundle.rowsFile.vocabularyRows ?? []),
      dailyGlanceVariants: bundle.rowsFile.dailyGlanceVariants
    }
  };
}

function withoutRetiredContent(bundle: FallbackArchitectureV3Bundle): FallbackArchitectureV3Bundle {
  const active = <T extends { contentKey: string }>(rows: T[]) => rows.filter((row) => {
    const identity = row as T & { publicationRowId?: string; publicationRowUpdatedAt?: string };
    return publicationAllowsContent(row.contentKey, identity.publicationRowId, identity.publicationRowUpdatedAt);
  });
  return {
    transitLib: { ...bundle.transitLib, authoredCards: active(bundle.transitLib.authoredCards) },
    templatesFile: { ...bundle.templatesFile, templates: active(bundle.templatesFile.templates) },
    rowsFile: { ...bundle.rowsFile, hookRows: active(bundle.rowsFile.hookRows ?? []), vocabularyRows: active(bundle.rowsFile.vocabularyRows ?? []) }
  };
}

function blockedPublicationKeys(bundle: FallbackArchitectureV3Bundle) {
  const records = [...bundle.transitLib.authoredCards, ...bundle.templatesFile.templates,
    ...(bundle.rowsFile.hookRows ?? []), ...(bundle.rowsFile.vocabularyRows ?? [])] as Array<{ contentKey: string; publicationRowId?: string; publicationRowUpdatedAt?: string }>;
  const available = new Set(records.filter((row) => publicationAllowsContent(row.contentKey, row.publicationRowId, row.publicationRowUpdatedAt)).map((row) => row.contentKey));
  return contentPublicationRecords().filter((record) => !publicationRestoresBaseline(record) && !available.has(record.content_key)).map((record) => record.content_key);
}

function createAppTransitRenderer(readerBundle: FallbackArchitectureV3Bundle) {
  return createTransitSynastryRenderer(readerBundle.transitLib, readerBundle.templatesFile, readerBundle.rowsFile,
    { blockedContentKeys: blockedPublicationKeys(readerBundle) });
}

function createAppFallbackRenderer(readerBundle: FallbackArchitectureV3Bundle) {
  return createFallbackRenderer(readerBundle.templatesFile, {
    hookRows: readerBundle.rowsFile.hookRows,
    vocabularyRows: readerBundle.rowsFile.vocabularyRows
  }, { blockedContentKeys: blockedPublicationKeys(readerBundle) });
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
let localBaseReaderSupportBundle: FallbackArchitectureV3Bundle | null = null;
let baseReaderSupportPromise: Promise<void> | null = null;
function loadBaseReaderSupportBundle() {
  if (localBaseReaderSupportBundle) return Promise.resolve();
  baseReaderSupportPromise ??= import('./fallbackArchitectureV3/deferred-base-reader-support-v1.json').then(({default:rows})=>{
    const authoredCards=[...new Map([...rows.authoredCards,...readerAuthoredCards].map(row=>[row.contentKey,row])).values()];
    localBaseReaderSupportBundle=readerEligibleBundle({transitLib:{authoredCards},templatesFile:{templates:rows.templates},rowsFile:rows});
    recomposeReaderBundle();
  }).catch(error=>{baseReaderSupportPromise=null;throw error;});
  return baseReaderSupportPromise;
}
let localReaderSupportBundle: FallbackArchitectureV3Bundle | null = null;
let readerSupportPromise: Promise<void> | null = null;
function loadReaderSupportBundle() {
  if (localReaderSupportBundle) return Promise.resolve();
  readerSupportPromise ??= Promise.all([loadBaseReaderSupportBundle(),import('./fallbackArchitectureV3/deferred-reader-support-transport-v1.json')]).then(([, { default: rows }]) => {
    localReaderSupportBundle = readerEligibleBundle({ transitLib: { authoredCards: rows.authoredCards }, templatesFile: { templates: rows.templates }, rowsFile: rows });
    recomposeReaderBundle();
  }).catch(error => { readerSupportPromise = null; throw error; });
  return readerSupportPromise;
}
async function withReaderSupport<T>(read: Promise<T>) {
  const [value] = await Promise.all([read, loadReaderSupportBundle()]);
  return value;
}
let localDeferredReaderBundle: FallbackArchitectureV3Bundle | null = null;
let localCalendarReaderBundle: FallbackArchitectureV3Bundle | null = null;
let localEmptyHouseReaderBundle: FallbackArchitectureV3Bundle | null = null;
let localRelationshipReaderBundle: FallbackArchitectureV3Bundle | null = null;
let localLunationBookReaderBundle: FallbackArchitectureV3Bundle | null = null;
let localSkyPlacementHouseReaderBundle: FallbackArchitectureV3Bundle | null = null;
let skyPlacementHouseBundlePromise: Promise<boolean> | null = null;
let localSkyPlacementReaderBundle: FallbackArchitectureV3Bundle | null = null;
let localInitialSkyListReaderBundle: FallbackArchitectureV3Bundle | null = null;
let initialSkyListBundlePromise: Promise<boolean> | null = null;
let lastKnownGoodReaderBundle: FallbackArchitectureV3Bundle | null = null;
let dashboardCoreReaderBundle: FallbackArchitectureV3Bundle | null = null;
let dashboardSkyCoreReaderBundle: FallbackArchitectureV3Bundle | null = null;
let dashboardPersonalTransitReaderBundle: FallbackArchitectureV3Bundle | null = null;
let dashboardCompatibilityReaderBundle: FallbackArchitectureV3Bundle | null = null;
let dashboardSkyPlacementReaderBundle: FallbackArchitectureV3Bundle | null = null;
let skyPlacementFallbackBundlePromise: Promise<boolean> | null = null;
export let fallbackRendererV3 = createAppFallbackRenderer(initialReaderBundle);
export let transitSynastryFallbackRendererV3 = createAppTransitRenderer(initialReaderBundle);
let vocabularyRowsByKey = vocabularyRowsByContentKey(withoutRetiredContent(initialReaderBundle).rowsFile);
let hookRowsByKey = hookRowsByContentKey(withoutRetiredContent(initialReaderBundle).rowsFile);
let transitAuthoredCardsByKey = authoredCardsByContentKey(withoutRetiredContent(initialReaderBundle).transitLib);

function activateReaderBundle(readerBundle: FallbackArchitectureV3Bundle) {
  fallbackRendererV3 = createAppFallbackRenderer(readerBundle);
  transitSynastryFallbackRendererV3 = createAppTransitRenderer(readerBundle);
  readerBundle = withoutRetiredContent(readerBundle);
  vocabularyRowsByKey = vocabularyRowsByContentKey(readerBundle.rowsFile);
  hookRowsByKey = hookRowsByContentKey(readerBundle.rowsFile);
  transitAuthoredCardsByKey = authoredCardsByContentKey(readerBundle.transitLib);
}

function mergeReaderBundles(
  base: FallbackArchitectureV3Bundle,
  extension: FallbackArchitectureV3Bundle | null
): FallbackArchitectureV3Bundle {
  if (!extension) return base;
  extension = withoutRetiredContent(extension);

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
  // Preserve overlay precedence: verified offline rows stay below local content,
  // and current dashboard rows override it. A Calendar-only load is replaced
  // by the complete deferred bundle; a partial CMS response cannot erase it.
  activateReaderBundle([
    localBaseReaderSupportBundle,
    localReaderSupportBundle,
    lastKnownGoodReaderBundle,
    localDeferredReaderBundle ?? localCalendarReaderBundle,
    localEmptyHouseReaderBundle,
    localRelationshipReaderBundle,
    localLunationBookReaderBundle,
    dashboardCoreReaderBundle,
    dashboardSkyCoreReaderBundle,
    dashboardPersonalTransitReaderBundle,
    dashboardCompatibilityReaderBundle,
    localInitialSkyListReaderBundle,
    localSkyPlacementReaderBundle,
    localSkyPlacementHouseReaderBundle,
    dashboardSkyPlacementReaderBundle
  ].reduce<FallbackArchitectureV3Bundle>(mergeReaderBundles, initialReaderBundle));
}

subscribeToContentPublications(recomposeReaderBundle);

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

export function fallbackV3ApprovalLevelForContentKey(contentKey: string | null | undefined) {
  if (!contentKey) return null;

  const row = transitAuthoredCardsByKey.get(contentKey)
    ?? hookRowsByKey.get(contentKey)
    ?? vocabularyRowsByKey.get(contentKey);
  if (!row) return null;

  const approval = row.approval as StructuredApproval | null | undefined;
  const approvalLevel = approval?.approvalLevel;

  return typeof approvalLevel === "string" && approvalLevel.trim()
    ? approvalLevel.trim()
    : "ungated";
}

export function transitV3SameBeatKeyForContentKey(contentKey: string | null | undefined) {
  const notes = transitV3AuthoredCardForContentKey(contentKey)?.editorial_notes;
  const text = typeof notes === "string" ? notes.toLowerCase() : "";

  if (text.includes("stop calling it coincidence") || text.includes("none of it is random")) {
    return "transit-same-beat/randomness-pattern";
  }

  return null;
}

export function updateLastKnownGoodFallbackArchitectureV3Bundle(
  update: (previous: FallbackArchitectureV3Bundle | null) => FallbackArchitectureV3Bundle
) {
  lastKnownGoodReaderBundle = readerEligibleBundle(update(lastKnownGoodReaderBundle));
  recomposeReaderBundle();
}

export function installFallbackArchitectureV3Bundle(
  bundle: FallbackArchitectureV3Bundle | null,
  packageVersion = bundle?.packageManifest?.packageVersion ?? fallbackArchitectureV3PackageVersion
) {
  // A complete inventory supersedes the smaller Sky overlay.
  dashboardSkyCoreReaderBundle = null;
  if (!bundle) {
    dashboardCoreReaderBundle = null;
    recomposeReaderBundle();
    return null;
  }
  const readerBundle = readerEligibleBundle(bundle);
  const manifest = fallbackArchitectureV3ManifestForBundle(readerBundle, packageVersion);
  dashboardCoreReaderBundle = readerBundle;
  recomposeReaderBundle();

  return manifest;
}

/** Keep a Sky-only response separate so navigation cannot erase other overlays. */
export function installSkyCoreFallbackArchitectureV3Bundle(bundle: FallbackArchitectureV3Bundle | null) {
  dashboardSkyCoreReaderBundle = bundle ? readerEligibleBundle(bundle) : null;
  recomposeReaderBundle();
}

/** A targeted transit read must not erase the broader dashboard or Sky overlay. */
export function installPersonalTransitFallbackArchitectureV3Bundle(bundle: FallbackArchitectureV3Bundle | null) {
  dashboardPersonalTransitReaderBundle = bundle ? readerEligibleBundle(bundle) : null;
  recomposeReaderBundle();
}

export function installCompatibilityFallbackArchitectureV3Bundle(
  bundle: FallbackArchitectureV3Bundle | null,
  packageVersion = bundle?.packageManifest?.packageVersion ?? fallbackArchitectureV3PackageVersion
) {
  if (!bundle) {
    dashboardCompatibilityReaderBundle = null;
    recomposeReaderBundle();
    return null;
  }
  const readerBundle = readerEligibleBundle(bundle);
  const manifest = fallbackArchitectureV3ManifestForBundle(readerBundle, packageVersion);
  dashboardCompatibilityReaderBundle = readerBundle;
  recomposeReaderBundle();

  return manifest;
}

export function installSkyPlacementFallbackArchitectureV3Bundle(
  bundle: FallbackArchitectureV3Bundle | null,
  packageVersion = bundle?.packageManifest?.packageVersion ?? fallbackArchitectureV3PackageVersion
) {
  if (!bundle) {
    dashboardSkyPlacementReaderBundle = null;
    recomposeReaderBundle();
    return null;
  }
  const readerBundle = readerEligibleBundle(bundle);
  const manifest = fallbackArchitectureV3ManifestForBundle(readerBundle, packageVersion);
  dashboardSkyPlacementReaderBundle = readerBundle;
  recomposeReaderBundle();

  return manifest;
}

// All local domains share retry/coalescing behavior. A partial CMS overlay does
// not establish local readiness, and a late import cannot replace a full load.
function localBundleLoader(
  read: () => Promise<FallbackArchitectureV3Bundle>,
  isLoaded: () => boolean,
  install: (bundle: FallbackArchitectureV3Bundle) => void
) {
  let pending: Promise<boolean> | null = null;
  return async () => {
    if (isLoaded()) return false;
    pending ??= read().then(bundle => {
      if (isLoaded()) return false;
      install(readerEligibleBundle(bundle));
      recomposeReaderBundle();
      return true;
    }).catch(error => { pending = null; throw error; });
    return pending;
  };
}

export function isDeferredFallbackArchitectureV3BundleLoaded() {
  return Boolean(localDeferredReaderBundle);
}

export function isCalendarFallbackArchitectureV3BundleLoaded() {
  return Boolean(localCalendarReaderBundle || localDeferredReaderBundle);
}

export const loadCalendarFallbackArchitectureV3Bundle = localBundleLoader(
  () => withReaderSupport(import("./fallbackArchitectureV3CalendarBundle").then(module => module.calendarFallbackArchitectureV3Bundle)),
  isCalendarFallbackArchitectureV3BundleLoaded,
  bundle => { localCalendarReaderBundle = bundle; }
);

export const loadDeferredFallbackArchitectureV3Bundle = localBundleLoader(
  () => withReaderSupport(import("./fallbackArchitectureV3DeferredBundle").then(module => module.deferredFallbackArchitectureV3Bundle)),
  isDeferredFallbackArchitectureV3BundleLoaded,
  bundle => { localDeferredReaderBundle = bundle; }
);

export function isEmptyHouseFallbackArchitectureV3BundleLoaded() {
  return Boolean(localEmptyHouseReaderBundle);
}

export const loadEmptyHouseFallbackArchitectureV3Bundle = localBundleLoader(
  () => withReaderSupport(import("./fallbackArchitectureV3EmptyHouseBundle").then(module => module.emptyHouseFallbackArchitectureV3Bundle)),
  isEmptyHouseFallbackArchitectureV3BundleLoaded,
  bundle => { localEmptyHouseReaderBundle = bundle; }
);

export function isRelationshipFallbackArchitectureV3BundleLoaded() {
  return Boolean(localRelationshipReaderBundle);
}

export const loadRelationshipFallbackArchitectureV3Bundle = localBundleLoader(
  () => withReaderSupport(import("./fallbackArchitectureV3RelationshipBundle").then(module => module.relationshipFallbackArchitectureV3Bundle)),
  isRelationshipFallbackArchitectureV3BundleLoaded,
  bundle => { localRelationshipReaderBundle = bundle; }
);

export function isSkyPlacementFallbackArchitectureV3BundleLoaded(includeHouses = true) {
  // CMS overlays may contain only the selected list rows. They cannot prove
  // that the full local article/Calendar partition is ready.
  return Boolean(loadedSkyV4ReaderRoute && localSkyPlacementReaderBundle && (!includeHouses || localSkyPlacementHouseReaderBundle));
}

export function loadInitialSkyListFallbackArchitectureV3Bundle() {
  if (loadedSkyV4ReaderRoute && (localInitialSkyListReaderBundle || localSkyPlacementReaderBundle)) return Promise.resolve(false);
  initialSkyListBundlePromise ??= Promise.all([
    import('./fallbackArchitectureV3SkyListBundle'),
    import('./canonicalSkyReaderAssets').then(({ loadCanonicalSkyReaderAssets }) => loadCanonicalSkyReaderAssets())
  ]).then(async ([{ initialSkyListBundle, loadCanonicalSkyV4ReaderRoute }]) => {
    const render = await loadCanonicalSkyV4ReaderRoute(() => [
      ...hookRowsByKey.values(), ...transitAuthoredCardsByKey.values()
    ]);
    if (localSkyPlacementReaderBundle) return false;
    loadedSkyV4ReaderRoute = render;
    localInitialSkyListReaderBundle = readerEligibleBundle(initialSkyListBundle);
    recomposeReaderBundle();
    return true;
  }).catch(error => { initialSkyListBundlePromise = null; throw error; });
  return initialSkyListBundlePromise;
}

export async function loadSkyPlacementFallbackArchitectureV3Bundle(includeHouses = true) {
  if (isSkyPlacementFallbackArchitectureV3BundleLoaded(includeHouses)) return false;
  const placement = loadSkyPlacementListBundle();
  if (!includeHouses) return placement;
  skyPlacementHouseBundlePromise ??= import("./fallbackArchitectureV3SkyPlacementHouseBundle")
    .then(({ skyPlacementHouseBundle }) => {
      if (localSkyPlacementHouseReaderBundle) return false;
      localSkyPlacementHouseReaderBundle = readerEligibleBundle(skyPlacementHouseBundle);
      recomposeReaderBundle();
      return true;
    }).catch((error) => { skyPlacementHouseBundlePromise = null; throw error; });
  const changes = await Promise.all([placement, skyPlacementHouseBundlePromise]);
  return changes.some(Boolean);
}

async function loadSkyPlacementListBundle() {
  if (loadedSkyV4ReaderRoute && localSkyPlacementReaderBundle) {
    return false;
  }

  // Discover JSON assets alongside the large placement module, after App is
  // available. Prefetching them at entry delayed the shell on slow networks.
  skyPlacementFallbackBundlePromise ??= Promise.all([
    import("./fallbackArchitectureV3SkyPlacementBundle"),
    import("./canonicalSkyReaderAssets").then(({ loadCanonicalSkyReaderAssets }) => loadCanonicalSkyReaderAssets()),
    import("./protectedOwnerSkyPlacementPassages").then(({ loadProtectedOwnerSkyPlacementPassages }) => loadProtectedOwnerSkyPlacementPassages()),
    loadReaderSupportBundle()
  ]).then(async ([{ skyPlacementFallbackArchitectureV3Bundle, loadCanonicalSkyV4ReaderRoute }]) => {
      loadedSkyV4ReaderRoute = await loadCanonicalSkyV4ReaderRoute(() => [
        ...hookRowsByKey.values(), ...transitAuthoredCardsByKey.values()
      ]);
      if (localSkyPlacementReaderBundle) {
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

export function isLunationBookFallbackArchitectureV3BundleLoaded() {
  return Boolean(localLunationBookReaderBundle);
}

export const loadLunationBookFallbackArchitectureV3Bundle = localBundleLoader(
  () => Promise.all([loadBaseReaderSupportBundle(),import("./fallbackArchitectureV3LunationBookBundle")]).then(([,module])=>module.lunationBookFallbackArchitectureV3Bundle),
  isLunationBookFallbackArchitectureV3BundleLoaded,
  bundle => { localLunationBookReaderBundle = bundle; }
);
