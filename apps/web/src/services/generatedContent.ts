import type { FallbackArchitectureV3MirrorMetadata } from "./fallbackArchitectureV3MirrorValidation";
import { isSkyArticleDashboardRow, isSkyDashboardRow, isSkyListDashboardRow } from "./skyDashboardScope";
import { loadReaderRows, ReaderAdmissionError } from "./readerContentClient";
import { isRecord, isApprovedFallbackArchitectureV3Row, isSkyPlacementFallbackPartitionKey, packageAuthoredCardFromRow, packageHookRowFromRow, packageVocabRowFromRow, packageTemplateRowFromRow, packageFallbackArchitectureV3CoreRows } from "./fallbackArchitectureV3CorePackaging";
// @ts-ignore Exact owner-requested source versions, shared with package materialization.
import { correctedReaderSummary } from "../content/fallbackArchitectureV3/readerSummaryReferenceCorrections.mjs";
import { publicationLedgerKey, publicationLedgerReady, publicationAllowsContent, contentPublication, contentPublicationRecords, contentPublicationGeneration, type ContentPublication } from "../content/contentPublicationState";
import { contentPublicationsAvailableOnline, refreshContentPublications, refreshSkyListPublications, skyListPublicationReadStarted } from "./contentPublications";
import { isSkyListPublicationKey } from "../content/skyListPublicationScope";
import { isGeneratedContentReaderBoundaryAllowed, isReaderServableGeneratedContentRow, isEmergencyFloorContentKey } from "../content/generatedContentEligibility";
export { isGeneratedContentReaderBoundaryAllowed, isReaderServableGeneratedContentRow } from "../content/generatedContentEligibility";
import { getSupabaseClient } from "./auth";
import { publicReaderConfigurationPresent } from "./publicReaderConfiguration";

async function anonymousReader() {
  if (!publicReaderConfigurationPresent) return null;
  const transport = await import("./anonymousReaderTransport");
  return transport.anonymousReaderAvailable() ? transport : null;
}
async function publicReaderAvailable() {
  return Boolean(await anonymousReader() || await getSupabaseClient());
}

let loadedLastKnownGoodRows: GeneratedContentRow[] = [];
export async function loadContentStudioLastKnownGoodRows(): Promise<GeneratedContentRow[]> {
  const { loadOfflineContentRows } = await import("./offlineContentSnapshot");
  loadedLastKnownGoodRows = await loadOfflineContentRows();
  return loadedLastKnownGoodRows;
}

import {
  hasMissingTemplateSlots,
  hasTemplateSlots,
  interpolateTemplateString,
  type TemplateSlotValues
} from "./templateInterpolation";
import { generatedContentAliases } from "./generatedContentKeys";
import { isReaderFacingCopy } from "../content/readerSafety";
import {
  hasExactSkyArticleOwnerApproval,
  skyArticleEditionRecord
} from "../content/skyArticleTemplateCompiler";
import {
  noProseSourceFiles,
  servedFieldInstructionMarkers,
  servedFieldInternalBlacklist,
  servedFieldLabels,
  servedFieldsContract,
  type ServedFieldSurface
} from "../content/servedFieldsContract";
import {
  fallbackArchitectureV3BundledManifestSummary,
  loadFallbackArchitectureV3BundledCoreManifest,
  loadFallbackArchitectureV3BundledSkyPlacementManifest,
  transitV3AuthoredCardForContentKey,
  type FallbackArchitectureV3Bundle,
  type FallbackArchitectureV3PackageManifest,
  type HookRow,
  type TemplateRow,
  type VocabRow,
  type AuthoredCard
} from "../content/fallbackArchitectureV3Runtime";

export type GeneratedContentMode = "feed" | "in_depth" | "article" | "report";
export type GeneratedContentBlockType =
  | "fallback_template"
  | "sign"
  | "house"
  | "ruler"
  | "natal_aspect"
  | "sky_aspect"
  | "sky_placement"
  | "daily_horoscope"
  | "transit_to_natal_aspect"
  | "synastry_aspect"
  | "composite_aspect"
  | "synthesis"
  | "essay";

export type GeneratedContentPreviewMode = "normal" | "emergency-floor" | "hide-emergency-floor";

export const generatedContentPreviewModeStorageKey = "tldrastro:generatedContentPreviewMode";
export const generatedContentPreviewModeChangeEvent = "tldrastro:generatedContentPreviewModeChange";

export type LiveGeneratedContent = {
  id: string;
  contentKey: string;
  surface: string;
  mode: GeneratedContentMode;
  eventType: string | null;
  targetDate: string | null;
  headline: string | null;
  summary: string | null;
  body: string;
  sections: unknown;
  blockType?: GeneratedContentBlockType | null;
  provider?: string | null;
  sourceSnapshot?: Record<string, unknown> | null;
  judgeScore?: number | null;
  judgeGate?: string | null;
  model: string | null;
  updatedAt: string;
  lane?: string | null;
  reviewState?: string | null;
  status?: "DRAFT" | "REVIEWED" | "LIVE" | "ARCHIVED" | "ERROR" | string;
};

export type GeneratedContentRow = {
  id: string;
  content_key: string;
  surface: string;
  mode: GeneratedContentMode;
  status?: string | null;
  lane?: "serving" | "reference" | null;
  review_state?: string | null;
  event_type: string | null;
  target_date: string | null;
  facts?: Record<string, unknown> | null;
  source_snapshot?: Record<string, unknown> | null;
  headline: string | null;
  summary: string | null;
  body: string;
  sections: unknown | null;
  block_type?: GeneratedContentBlockType | null;
  flags?: string[] | null;
  provider?: string | null;
  judge_score?: number | null;
  judge_gate?: string | null;
  model: string | null;
  updated_at: string;
};

const fallbackArchitectureV3Provider = "tldrastro-fallback-architecture-v3";
const fallbackArchitectureV3SkyPlacementProvider = "tldrastro-fallback-architecture-v3-sky-placement";
const fallbackArchitectureV3BundleCacheKey = "tldrastro:fallbackArchitectureV3:dashboardBundle";
const fallbackArchitectureV3BundleVersionKey = "tldrastro:fallbackArchitectureV3:dashboardBundleVersion";
// Admission changes can make an old overlay incomplete even when the database
// revision is unchanged. Refetch sources previously excluded by the key gate.
const fallbackArchitectureV3BundleCacheSchema = "fallback-architecture-v3-dashboard-overlay-cache-v9";
const fallbackArchitectureV3SkyPlacementBundleCacheKey = "tldrastro:fallbackArchitectureV3:skyPlacementDashboardBundle";
const fallbackArchitectureV3SkyPlacementBundleVersionKey = "tldrastro:fallbackArchitectureV3:skyPlacementDashboardBundleVersion";
const fallbackArchitectureV3SkyPlacementBundleCacheSchema = "fallback-architecture-v3-sky-placement-dashboard-cache-v3";


/** Live canonical article/Rx rows are overlay sources even when the ledger
 * marker is absent. The older dashboard partition path cannot fail them closed. */
function isSkyPlacementPublishedReaderKey(contentKey: string) {
  return isSkyPlacementFallbackPartitionKey(contentKey)
    || contentKey.startsWith("sky-placement/article/")
    || contentKey.startsWith("sky-placement/retrograde/");
}


export function fallbackArchitectureV3AuthoredContentForKey(contentKey: string): LiveGeneratedContent | null {
  const card = transitV3AuthoredCardForContentKey(contentKey);
  const body = typeof card?.body === "string" ? card.body.trim() : "";

  if (!card || !body) {
    return null;
  }

  const headline = typeof card.headline === "string" && card.headline.trim()
    ? card.headline.trim()
    : null;
  const surface = typeof card.surface === "string" && card.surface.trim()
    ? card.surface.trim()
    : "sky";
  const sourceKeys = Array.isArray(card.source_keys)
    ? card.source_keys.filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    : [];

  return {
    id: `fallback-architecture-v3:${contentKey}`,
    contentKey,
    surface,
    mode: "article",
    eventType: "timing-event",
    targetDate: null,
    headline,
    summary: null,
    body,
    sections: [],
    blockType: "essay",
    provider: fallbackArchitectureV3Provider,
    sourceSnapshot: {
      canonicalKey: contentKey,
      contentType: "authored-content",
      contentRole: card.content_role ?? "full_copy",
      reviewStatus: card.review_status ?? null,
      sourceKeys
    },
    judgeScore: null,
    judgeGate: null,
    model: null,
    updatedAt: ""
  };
}



type CachedFallbackArchitectureV3Bundle = {
  version: number;
  bundle: FallbackArchitectureV3Bundle;
  mirror: FallbackArchitectureV3PackageManifest;
};

type CachedFallbackArchitectureV3Overlay = {
  version: number;
  bundle: FallbackArchitectureV3Bundle;
};

function fallbackArchitectureV3VersionParts(version: string) {
  const match = /^v(\d+)-(\d{4})-(\d{2})-(\d{2})([a-z]+)?$/u.exec(version.trim().toLowerCase());

  if (!match) {
    return null;
  }

  const suffix = match[5] ?? "";
  let suffixValue = 0;

  for (const character of suffix) {
    suffixValue = (suffixValue * 26) + (character.charCodeAt(0) - 96);
  }

  return [
    Number(match[1]),
    Number(match[2]),
    Number(match[3]),
    Number(match[4]),
    suffixValue
  ];
}

export function compareFallbackArchitectureV3PackageVersions(first: string, second: string) {
  const firstParts = fallbackArchitectureV3VersionParts(first);
  const secondParts = fallbackArchitectureV3VersionParts(second);

  if (!firstParts || !secondParts) {
    return null;
  }

  for (let index = 0; index < firstParts.length; index += 1) {
    if (firstParts[index] !== secondParts[index]) {
      return firstParts[index] > secondParts[index] ? 1 : -1;
    }
  }

  return 0;
}


function isLocalGeneratedContentPreviewHost() {
  if (typeof window === "undefined") {
    return false;
  }

  return ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);
}

export function readGeneratedContentPreviewMode(): GeneratedContentPreviewMode {
  if (!isLocalGeneratedContentPreviewHost()) {
    return "normal";
  }

  try {
    const override = new URL(window.location.href).searchParams.get("contentPreview");

    if (override === "normal") {
      window.localStorage.removeItem(generatedContentPreviewModeStorageKey);
      return "normal";
    }

    if (override === "emergency-floor" || override === "hide-emergency-floor") {
      window.localStorage.setItem(generatedContentPreviewModeStorageKey, override);
      return override;
    }
  } catch {
    // Fall through to the stored preview mode.
  }

  try {
    const value = window.localStorage.getItem(generatedContentPreviewModeStorageKey);

    if (value === "emergency-floor" || value === "hide-emergency-floor") {
      return value;
    }
  } catch {
    return "normal";
  }

  return "normal";
}

export function writeGeneratedContentPreviewMode(mode: GeneratedContentPreviewMode) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    if (mode === "normal") {
      window.localStorage.removeItem(generatedContentPreviewModeStorageKey);
    } else {
      window.localStorage.setItem(generatedContentPreviewModeStorageKey, mode);
    }
  } catch {
    // Keep the in-memory UI usable when localStorage is unavailable.
  }

  window.dispatchEvent(new Event(generatedContentPreviewModeChangeEvent));
}

export type GeneratedContentSection = {
  heading: string;
  body: string;
};

export type GeneratedContentDrilldown = {
  title: string;
  summary: string;
  factors: Array<{
    label: string;
    technicalFact: string;
    plainMeaning: string;
  }>;
  whyThisScene: string;
  timingNote?: string;
};

function interpolateOptionalString(
  value: string | null,
  context: TemplateSlotValues,
  options: { contentKey: string; field: string; missingSlotBehavior?: "empty" | "preserve"; capitalizeSentenceStart?: boolean }
) {
  if (value === null) {
    return null;
  }

  return interpolateTemplateString(value, context, options);
}

function interpolateSections(
  value: unknown,
  context: TemplateSlotValues,
  contentKey: string,
  fieldPath = "sections",
  missingSlotBehavior: "empty" | "preserve" = "empty"
): unknown {
  if (typeof value === "string") {
    return interpolateTemplateString(value, context, {
      contentKey,
      field: fieldPath,
      missingSlotBehavior,
      capitalizeSentenceStart: true
    });
  }

  if (Array.isArray(value)) {
    return value.map((item, index) => interpolateSections(item, context, contentKey, `${fieldPath}.${index}`, missingSlotBehavior));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .map(([key, item]) => [key, interpolateSections(item, context, contentKey, `${fieldPath}.${key}`, missingSlotBehavior)] as const)
    );
  }

  return value;
}

function shouldInterpolateGeneratedContent(content: LiveGeneratedContent) {
  const contentType = content.sourceSnapshot?.contentType;

  return contentType === "template" || contentType === "mustache-template" || contentType === "synastry-kb-seed";
}

function hasGeneratedContentTemplateSlots(content: LiveGeneratedContent) {
  return Boolean(
    (content.headline && hasTemplateSlots(content.headline))
    || (content.summary && hasTemplateSlots(content.summary))
    || hasTemplateSlots(content.body)
    || hasTemplateSlots(JSON.stringify(content.sections ?? {}))
  );
}

function hasUnresolvedTemplateSlots(content: LiveGeneratedContent) {
  return Boolean(
    (content.headline && hasTemplateSlots(content.headline))
    || (content.summary && hasTemplateSlots(content.summary))
    || hasTemplateSlots(content.body)
    || hasTemplateSlots(JSON.stringify(content.sections ?? {}))
  );
}

function hasMissingGeneratedContentTemplateSlots(content: LiveGeneratedContent, slots: TemplateSlotValues) {
  return Boolean(
    (content.headline && hasMissingTemplateSlots(content.headline, slots))
    || (content.summary && hasMissingTemplateSlots(content.summary, slots))
    || hasMissingTemplateSlots(content.body, slots)
    || hasMissingTemplateSlots(JSON.stringify(content.sections ?? {}), slots)
  );
}

function hasReaderSafeRenderedTemplateOutput(content: LiveGeneratedContent) {
  const bodyParagraphs = content.body
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  const sectionBodies = Array.isArray(content.sections)
    ? content.sections.flatMap((section) => {
      if (!section || typeof section !== "object") return [];
      const body = (section as Record<string, unknown>).body;
      return typeof body === "string" && body.trim() ? [body.trim()] : [];
    })
    : [];

  return [
    content.summary,
    ...bodyParagraphs,
    ...sectionBodies
  ].some((value) => isReaderFacingCopy(value));
}

function sourceFileStem(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .split("/")
    .pop()
    ?.replace(/\.json$/i, "")
    .trim()
    ?? "";
}

function generatedContentSourceFileStem(content?: LiveGeneratedContent | null) {
  const sourceSnapshot = content?.sourceSnapshot ?? {};
  const fields = [
    sourceSnapshot.record_file,
    sourceSnapshot.recordFile,
    sourceSnapshot.file,
    sourceSnapshot.sourceFile
  ];

  for (const field of fields) {
    const stem = sourceFileStem(field);

    if (stem) {
      return stem;
    }
  }

  return "";
}

function generatedContentServedSurface(content: LiveGeneratedContent): ServedFieldSurface {
  if (content.surface === "sky") {
    return "sky";
  }

  if (content.contentKey.includes("horoscope") || content.eventType?.includes("horoscope")) {
    return "horoscope";
  }

  return "natal";
}

function servedFieldValue(record: Record<string, unknown>, path: string) {
  const parts = path.split(".");
  let value: unknown = record;

  for (const part of parts) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return "";
    }

    value = (value as Record<string, unknown>)[part];
  }

  return typeof value === "string" ? value.trim() : "";
}

function servedFieldNamesForContent(content: LiveGeneratedContent) {
  const file = generatedContentSourceFileStem(content);
  const spec = servedFieldsContract[file];

  if (!spec) {
    return [];
  }

  return [
    ...(spec.readerBySurface?.[generatedContentServedSurface(content)] ?? []),
    ...(spec.reader ?? []),
    ...(spec.extras ?? [])
  ];
}

function servedFieldSections(content: LiveGeneratedContent): GeneratedContentSection[] {
  const sections = content.sections;

  if (!sections || typeof sections !== "object" || Array.isArray(sections)) {
    return [];
  }

  const record = sections as Record<string, unknown>;

  return servedFieldNamesForContent(content).flatMap((field) => {
    if (servedFieldInternalBlacklist.has(field)) {
      return [];
    }

    const body = servedFieldValue(record, field);

    if (!body || !isReaderFacingCopy(body) || containsBlockedScaffoldCopy(body)) {
      return [];
    }

    return [{
      heading: servedFieldLabels[field] ?? "",
      body
    }];
  });
}

function isNoProseGeneratedContent(content: LiveGeneratedContent) {
  return noProseSourceFiles.has(generatedContentSourceFileStem(content));
}

function containsSingleBraceSlot(value: string) {
  return /(?<!\{)\{[A-Za-z][^{}\n]{0,80}\}(?!\})/.test(value);
}

function containsInstructionMarker(value: string) {
  const normalized = value.toLowerCase();

  return servedFieldInstructionMarkers.some((marker) => normalized.includes(marker.toLowerCase()));
}

function isReaderServableGeneratedContent(content: LiveGeneratedContent) {
  if (isNoProseGeneratedContent(content)) {
    return false;
  }

  const arraySectionBodies = Array.isArray(content.sections)
    ? content.sections.flatMap((section) => {
      if (!section || typeof section !== "object") return [];
      const body = (section as Record<string, unknown>).body;
      return typeof body === "string" ? [body] : [];
    })
    : [];
  const visibleText = [
    content.headline,
    content.summary,
    content.body,
    ...servedFieldSections(content).map((section) => section.body),
    ...arraySectionBodies
  ].filter(Boolean).join("\n");

  if (containsInstructionMarker(visibleText)) {
    return false;
  }

  if (content.blockType === "fallback_template" && containsSingleBraceSlot(visibleText)) {
    return false;
  }

  return true;
}

function fromRow(
  row: GeneratedContentRow
): LiveGeneratedContent {
  return {
    id: row.id,
    contentKey: row.content_key,
    surface: row.surface,
    status: row.status ?? undefined,
    lane: row.lane,
    reviewState: row.review_state,
    mode: row.mode,
    eventType: row.event_type,
    targetDate: row.target_date,
    headline: row.headline,
    summary: correctedReaderSummary(row.content_key, row.summary),
    body: row.body,
    sections: row.sections ?? {},
    blockType: row.block_type ?? null,
    sourceSnapshot: row.source_snapshot ?? null,
    judgeScore: row.judge_score ?? null,
    judgeGate: row.judge_gate ?? null,
    provider: row.provider ?? null,
    model: row.model,
    updatedAt: row.updated_at
  };
}

export function renderGeneratedContentTemplate(
  content: LiveGeneratedContent | null | undefined,
  slots?: TemplateSlotValues
): LiveGeneratedContent | null {
  if (!content || !publicationAllowsContent(content.contentKey, content.id, content.updatedAt, content.targetDate)) {
    return null;
  }

  if (!shouldInterpolateGeneratedContent(content)) {
    return content;
  }

  if (!slots) {
    if (content.sourceSnapshot?.contentType === "synastry-kb-seed" && !hasGeneratedContentTemplateSlots(content)) {
      return content;
    }

    return null;
  }

  const requiresAllTemplateSlots = content.sourceSnapshot?.contentType === "template"
    || content.sourceSnapshot?.contentType === "mustache-template";

  if (requiresAllTemplateSlots && hasMissingGeneratedContentTemplateSlots(content, slots)) {
    return null;
  }

  const preserveMissingSlots = content.sourceSnapshot?.contentType === "synastry-kb-seed";
  const headline = interpolateOptionalString(content.headline, slots, {
    contentKey: content.contentKey,
    field: "headline",
    missingSlotBehavior: preserveMissingSlots ? "preserve" : "empty",
    capitalizeSentenceStart: true
  });
  const summary = interpolateOptionalString(content.summary, slots, {
    contentKey: content.contentKey,
    field: "summary",
    missingSlotBehavior: preserveMissingSlots ? "preserve" : "empty",
    capitalizeSentenceStart: true
  });
  const body = interpolateTemplateString(content.body, slots, {
    contentKey: content.contentKey,
    field: "body",
    missingSlotBehavior: preserveMissingSlots ? "preserve" : "empty",
    capitalizeSentenceStart: true
  });
  const sections = interpolateSections(
    content.sections ?? {},
    slots,
    content.contentKey,
    "sections",
    preserveMissingSlots ? "preserve" : "empty"
  );

  if (
    content.sourceSnapshot?.contentType === "synastry-kb-seed"
    && hasGeneratedContentTemplateSlots(content)
    && (!body || (content.summary && hasTemplateSlots(content.summary) && !summary))
  ) {
    return null;
  }

  const rendered = {
    ...content,
    headline,
    summary,
    body,
    sections
  };

  if (requiresAllTemplateSlots) {
    if (hasUnresolvedTemplateSlots(rendered) || !hasReaderSafeRenderedTemplateOutput(rendered)) {
      return null;
    }
  }

  return rendered;
}

function shouldReplaceAlias(alias: string, current: LiveGeneratedContent, next: LiveGeneratedContent) {
  if (current.contentKey === alias) {
    return false;
  }

  if (next.contentKey === alias) {
    return true;
  }

  if (alias.startsWith("sky-retrograde-")) {
    const currentDate = current.targetDate ?? "";
    const nextDate = next.targetDate ?? "";

    if (nextDate !== currentDate) {
      return nextDate > currentDate;
    }
  }

  return false;
}

function isEmergencyFloorGeneratedRow(row: Pick<GeneratedContentRow, "content_key" | "event_type" | "block_type" | "source_snapshot">) {
  const sourceSnapshot = row.source_snapshot && typeof row.source_snapshot === "object"
    ? row.source_snapshot as Record<string, unknown>
    : null;

  return sourceSnapshot?.servingFloor === true
    || sourceSnapshot?.emergencyFloor === true
    || isEmergencyFloorContentKey(row.content_key)
    || row.event_type === "fallback-hook"
    || row.event_type === "vocabulary"
    || row.block_type === "fallback_template";
}

export function generatedContentParagraphs(content?: LiveGeneratedContent | null) {
  if (content && isNoProseGeneratedContent(content)) {
    return [];
  }

  const servedSections = content ? servedFieldSections(content) : [];

  if (servedSections.length > 0) {
    return readerUniqueParagraphs(servedSections.map((section) => section.body));
  }

  if (!content?.body) {
    return [];
  }

  return readerUniqueParagraphs(content.body
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim()));
}

const blockedScaffoldCopyPatterns = [
  /\bAt work this reads as\b/i,
  /\bLuck favors\b/i,
  /\bWatch:\s*/i,
  /\boverplaying the drama\b/i,
  /\bthe fuller story of this\b/i,
  /\bfollows .+ to wherever it sits\b/i,
  /\bmoves through\b.+\btone\b/i,
  /\bgives\b.+\bquality right now\b/i,
  /\bshows up in\b.+\bthe bigger picture\b/i,
  /\bBeing themselves and\b/i
];

function containsBlockedScaffoldCopy(text: string) {
  return blockedScaffoldCopyPatterns.some((pattern) => pattern.test(text));
}

function readerUniqueParagraphs(values: string[]) {
  const seen = new Set<string>();

  return values.filter((value) => {
    const paragraph = value.trim();
    const normalized = paragraph.replace(/\s+/g, " ").toLowerCase();

    if (
      !paragraph
      || seen.has(normalized)
      || !isReaderFacingCopy(paragraph)
      || containsBlockedScaffoldCopy(paragraph)
      || containsInstructionMarker(paragraph)
    ) {
      return false;
    }

    seen.add(normalized);
    return true;
  });
}

function normalizeSection(value: unknown): GeneratedContentSection | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const section = value as Record<string, unknown>;
  const heading = typeof section.heading === "string"
    ? section.heading.trim()
    : typeof section.title === "string"
      ? section.title.trim()
      : "";
  const body = typeof section.body === "string"
    ? section.body.trim()
    : typeof section.text === "string"
      ? section.text.trim()
      : "";

  if (!heading || !body) {
    return null;
  }

  if (!isReaderFacingCopy(body) || containsBlockedScaffoldCopy(body)) {
    return null;
  }

  return { heading, body };
}

export function generatedContentSections(content?: LiveGeneratedContent | null): GeneratedContentSection[] {
  if (!content || isNoProseGeneratedContent(content)) {
    return [];
  }

  const contractSections = servedFieldSections(content);

  if (contractSections.length > 0) {
    return contractSections;
  }

  const sections = content?.sections;

  if (Array.isArray(sections)) {
    return sections.map(normalizeSection).filter((section): section is GeneratedContentSection => Boolean(section));
  }

  if (sections && typeof sections === "object") {
    const record = sections as Record<string, unknown>;
    const nestedSections = record.sections;

    if (Array.isArray(nestedSections)) {
      return nestedSections.map(normalizeSection).filter((section): section is GeneratedContentSection => Boolean(section));
    }
  }

  return [];
}

function stringField(record: Record<string, unknown>, key: string) {
  const value = record[key];

  return typeof value === "string" ? value.trim() : "";
}












function fallbackArchitectureV3DashboardVersionFromRows(rows: Pick<GeneratedContentRow, "updated_at">[]) {
  return rows.reduce((version, row) => {
    const nextVersion = Date.parse(row.updated_at ?? "");
    return Number.isFinite(nextVersion) ? Math.max(version, nextVersion) : version;
  }, 0);
}

function sortGeneratedRowsNewestFirst(rows: GeneratedContentRow[]) {
  return [...rows].sort((first, second) => {
    const firstUpdated = Date.parse(first.updated_at ?? "");
    const secondUpdated = Date.parse(second.updated_at ?? "");
    const firstVersion = Number.isFinite(firstUpdated) ? firstUpdated : 0;
    const secondVersion = Number.isFinite(secondUpdated) ? secondUpdated : 0;
    if (firstVersion !== secondVersion) return secondVersion - firstVersion;
    return second.id.localeCompare(first.id);
  });
}

type DashboardScope = "all" | "sky" | "sky-list" | "sky-article";
const pendingDashboardBundles = new Map<string, {
  generation: number;
  promise: Promise<FallbackArchitectureV3Bundle | null>;
}>();
const dashboardCacheKey = (key: string, scope: DashboardScope) => scope === "all" ? key : `${key}:${scope}`;

export function clearCachedFallbackArchitectureV3Bundle(scope?: DashboardScope) {
  if (scope) pendingDashboardBundles.delete(scope);
  else for (const key of pendingDashboardBundles.keys()) if (!key.startsWith("placement:")) pendingDashboardBundles.delete(key);
  if (typeof window === "undefined") {
    return;
  }

  try {
    for (const partition of scope ? [scope] : ["all", "sky", "sky-list", "sky-article"] as const) {
      window.localStorage.removeItem(dashboardCacheKey(fallbackArchitectureV3BundleVersionKey, partition));
      window.localStorage.removeItem(dashboardCacheKey(fallbackArchitectureV3BundleCacheKey, partition));
    }
  } catch {
    // The static package remains active when browser storage is blocked.
  }
}

function clearCachedFallbackArchitectureV3SkyPlacementBundle() {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(fallbackArchitectureV3SkyPlacementBundleVersionKey);
    window.localStorage.removeItem(fallbackArchitectureV3SkyPlacementBundleCacheKey);
  } catch {
    // The route-owned static package remains active when browser storage is blocked.
  }
}

async function readCachedFallbackArchitectureV3SkyPlacementBundle(): Promise<CachedFallbackArchitectureV3Bundle | null> {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const version = Number(window.localStorage.getItem(fallbackArchitectureV3SkyPlacementBundleVersionKey) ?? "0");
    const rawBundle = window.localStorage.getItem(fallbackArchitectureV3SkyPlacementBundleCacheKey);

    if (!version || !rawBundle) {
      return null;
    }

    const envelope = JSON.parse(rawBundle) as {
      schema?: unknown;
      runtimeCapability?: unknown;
      bundledPackageVersion?: unknown;
      bundledContentHash?: unknown;
      bundledKeyManifestHash?: unknown;
      mirrorPackageVersion?: unknown;
      mirrorContentHash?: unknown;
      mirrorKeyManifestHash?: unknown;
      mirrorKeyCount?: unknown;
      dashboardVersion?: unknown;
      bundle?: unknown;
    };
    const bundle = envelope?.bundle as FallbackArchitectureV3Bundle | undefined;
    const bundledPartition = fallbackArchitectureV3BundledManifestSummary.partitions?.["skyPlacement"];

    if (
      !bundledPartition
      || envelope?.schema !== fallbackArchitectureV3SkyPlacementBundleCacheSchema
      || envelope?.runtimeCapability !== fallbackArchitectureV3BundledManifestSummary.runtimeCapability
      || envelope?.bundledPackageVersion !== fallbackArchitectureV3BundledManifestSummary.packageVersion
      || envelope?.bundledContentHash !== bundledPartition.contentHash
      || envelope?.bundledKeyManifestHash !== bundledPartition.keyManifestHash
      || envelope?.dashboardVersion !== version
      || !bundle?.transitLib
      || !bundle?.rowsFile
      || !bundle?.templatesFile
    ) {
      clearCachedFallbackArchitectureV3SkyPlacementBundle();
      return null;
    }

    const mirrorMetadata: FallbackArchitectureV3MirrorMetadata = {
      packageVersion: String(envelope.mirrorPackageVersion ?? ""),
      contentHash: String(envelope.mirrorContentHash ?? ""),
      keyManifestHash: String(envelope.mirrorKeyManifestHash ?? ""),
      keyCount: Number(envelope.mirrorKeyCount)
    };
    const { fallbackArchitectureV3BundleManifestIfValid } = await import("./fallbackArchitectureV3MirrorValidation");
    const mirror = await fallbackArchitectureV3BundleManifestIfValid(
      bundle,
      mirrorMetadata,
      loadFallbackArchitectureV3BundledSkyPlacementManifest,
      { allowEditorialContentOverrides: true }
    );

    if (!mirror) {
      clearCachedFallbackArchitectureV3SkyPlacementBundle();
      return null;
    }

    return {
      version,
      bundle: { ...bundle, packageManifest: mirror },
      mirror
    };
  } catch {
    clearCachedFallbackArchitectureV3SkyPlacementBundle();
    return null;
  }
}

export function readCachedFallbackArchitectureV3Bundle(scope: DashboardScope = "all"): CachedFallbackArchitectureV3Overlay | null {
  if (typeof window === "undefined") return null;
  // Scoped Sky visits no longer consume the unscoped overlay, but must still
  // evict obsolete schemas so a later full-inventory visit cannot revive them.
  if (scope !== "all") readCachedFallbackArchitectureV3Bundle("all");

  try {
    const version = Number(window.localStorage.getItem(dashboardCacheKey(fallbackArchitectureV3BundleVersionKey, scope)) ?? "0");
    const rawBundle = window.localStorage.getItem(dashboardCacheKey(fallbackArchitectureV3BundleCacheKey, scope));
    if (!version || !rawBundle) return null;

    const envelope = JSON.parse(rawBundle) as {
      schema?: unknown;
      runtimeCapability?: unknown;
      bundledPackageVersion?: unknown;
      dashboardVersion?: unknown;
      bundle?: unknown;
    };
    const bundle = envelope.bundle as FallbackArchitectureV3Bundle | undefined;

    if (
      envelope.schema !== fallbackArchitectureV3BundleCacheSchema
      || envelope.runtimeCapability !== fallbackArchitectureV3BundledManifestSummary.runtimeCapability
      || envelope.bundledPackageVersion !== fallbackArchitectureV3BundledManifestSummary.packageVersion
      || Number(envelope.dashboardVersion) !== version
      || !bundle?.transitLib
      || !bundle?.rowsFile
      || !bundle?.templatesFile
    ) {
      clearCachedFallbackArchitectureV3Bundle(scope);
      return null;
    }

    return { version, bundle };
  } catch {
    clearCachedFallbackArchitectureV3Bundle(scope);
    return null;
  }
}

function cacheFallbackArchitectureV3SkyPlacementBundle(
  version: number,
  bundle: FallbackArchitectureV3Bundle,
  mirror: FallbackArchitectureV3PackageManifest
) {
  if (typeof window === "undefined" || !version) {
    return;
  }

  try {
    const bundledPartition = fallbackArchitectureV3BundledManifestSummary.partitions?.["skyPlacement"];
    if (!bundledPartition) return;

    window.localStorage.setItem(fallbackArchitectureV3SkyPlacementBundleVersionKey, String(version));
    window.localStorage.setItem(fallbackArchitectureV3SkyPlacementBundleCacheKey, JSON.stringify({
      schema: fallbackArchitectureV3SkyPlacementBundleCacheSchema,
      runtimeCapability: fallbackArchitectureV3BundledManifestSummary.runtimeCapability,
      bundledPackageVersion: fallbackArchitectureV3BundledManifestSummary.packageVersion,
      bundledContentHash: bundledPartition.contentHash,
      bundledKeyManifestHash: bundledPartition.keyManifestHash,
      mirrorPackageVersion: mirror.packageVersion,
      mirrorContentHash: mirror.contentHash,
      mirrorKeyManifestHash: mirror.keyManifestHash,
      mirrorKeyCount: mirror.keyCount,
      dashboardVersion: version,
      bundle
    }));
  } catch {
    // The static package remains available when browser storage is full or blocked.
  }
}

function cacheFallbackArchitectureV3Bundle(
  version: number,
  bundle: FallbackArchitectureV3Bundle,
  scope: DashboardScope = "all"
) {
  if (typeof window === "undefined" || !version) return;

  try {
    window.localStorage.setItem(dashboardCacheKey(fallbackArchitectureV3BundleVersionKey, scope), String(version));
    window.localStorage.setItem(dashboardCacheKey(fallbackArchitectureV3BundleCacheKey, scope), JSON.stringify({
      schema: fallbackArchitectureV3BundleCacheSchema,
      runtimeCapability: fallbackArchitectureV3BundledManifestSummary.runtimeCapability,
      bundledPackageVersion: fallbackArchitectureV3BundledManifestSummary.packageVersion,
      dashboardVersion: version,
      bundle
    }));
  } catch {
    // The checked-in package remains available when browser storage is full or blocked.
  }
}

async function loadContentStudioLastKnownGoodCoreBundle(scope: DashboardScope = "all") {
  try {
    const manifest = await loadFallbackArchitectureV3BundledCoreManifest();
    const rows = await loadContentStudioLastKnownGoodRows();
    return packageFallbackArchitectureV3CoreRows(scope === "all" ? rows : rows.filter(scope === "sky" ? isSkyDashboardRow : scope === "sky-article" ? isSkyArticleDashboardRow : isSkyListDashboardRow), manifest);
  } catch {
    return null;
  }
}

function packageFallbackArchitectureV3CompatibilityRows(rows: GeneratedContentRow[]) {
  const seen = new Set<string>();
  const authoredCards: AuthoredCard[] = [];
  for (const row of sortGeneratedRowsNewestFirst(rows)) {
    if (!publicationAllowsContent(row.content_key, row.id, row.updated_at, row.target_date)) continue;
    if (seen.has(row.content_key)) continue;
    seen.add(row.content_key);
    if (!row.provider || !isApprovedFallbackArchitectureV3Row(row, row.provider)) continue;
    if (!isReaderServableGeneratedContentRow(row)) continue;
    const card = packageAuthoredCardFromRow(row);
    if (card) authoredCards.push(card);
  }
  return authoredCards.length
    ? { transitLib: { authoredCards }, templatesFile: { templates: [] }, rowsFile: { hookRows: [], vocabularyRows: [] } }
    : null;
}

async function loadContentStudioLastKnownGoodCompatibilityBundle() {
  return packageFallbackArchitectureV3CompatibilityRows(await loadContentStudioLastKnownGoodRows());
}

type ColdSkyArticleRead = {
  consume: () => ReturnType<typeof loadReaderRows> | undefined;
  discard: () => void;
};
let pendingColdSkyArticleRead: ColdSkyArticleRead | undefined;

/** Start only the first cold article's known query; admission still waits for
 * a complete live ledger. The opaque handle cannot expose unadmitted rows. */
export function prefetchColdSkyArticleRows(publications: Promise<void>): ColdSkyArticleRead | undefined {
  if (contentPublicationsAvailableOnline() || readCachedFallbackArchitectureV3Bundle("sky-article")) return;
  if (pendingColdSkyArticleRead) return pendingColdSkyArticleRead;
  const controller = new AbortController();
  const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(20_000)]);
  const admission = {
    ready: publications.then(() => contentPublicationsAvailableOnline()
      && !readCachedFallbackArchitectureV3Bundle("sky-article"), () => false),
    validate: (rows: readonly GeneratedContentRow[], buffered: readonly ContentPublication[]) => contentPublicationsAvailableOnline()
      && buffered.every(publication => (contentPublication(publication.content_key)?.revision ?? 0) >= publication.revision)
      && rows.every(row =>
      publicationAllowsContent(row.content_key, row.id, row.updated_at, row.target_date))
      && contentPublicationRecords().every(publication => publication.state !== "live" || !publication.row_id
        || !isSkyArticleDashboardRow(publication) || isSkyPlacementFallbackPartitionKey(publication.content_key)
        || rows.some(row => row.content_key === publication.content_key && row.id === publication.row_id
          && publicationAllowsContent(row.content_key, row.id, row.updated_at, row.target_date)))
  };
  let consumed = false;
  const request = publicReaderAvailable().then(client => client
    ? loadReaderRows({ provider: fallbackArchitectureV3Provider, scope: "sky-article" }, signal, admission)
    : { data: null, error: new Error("Reader storage is unavailable.") }, error => ({ data: null, error }))
    .finally(() => { if (pendingColdSkyArticleRead === entry) pendingColdSkyArticleRead = undefined; });
  const entry: ColdSkyArticleRead = {
    consume: () => { if (consumed) return; consumed = true; return request; },
    discard: () => { if (!consumed) { consumed = true; controller.abort(); } }
  };
  pendingColdSkyArticleRead = entry;
  return entry;
}

/** A bounded key read may travel before the ledger, but neither its rows nor
 * its publications escape until the complete online ledger admits them. */
function prefetchColdSkyKeys(keys: Promise<string[]>, publications: Promise<void>, limit: number) {
  const controller = new AbortController();
  const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(20_000)]);
  const ready = publications.then(() => contentPublicationsAvailableOnline(), () => false);
  let consumed = false, admissionEnabled = true;
  const request = keys.then(async candidates => {
    const selected = [...new Set(candidates)];
    if (!selected.length || selected.length > limit || signal.aborted || !await publicReaderAvailable() || !admissionEnabled || signal.aborted) {
      return { data: null, error: null };
    }
    return loadReaderRows({ keys: selected }, signal, {
      ready,
      validate: (rows, buffered) => admissionEnabled && contentPublicationsAvailableOnline()
        && buffered.every(publication => (publication.content_key === publicationLedgerKey || selected.includes(publication.content_key))
          && (contentPublication(publication.content_key)?.revision ?? 0) >= publication.revision)
        && rows.every(row => selected.includes(row.content_key)
          && publicationAllowsContent(row.content_key, row.id, row.updated_at, row.target_date))
    });
  }).catch(error => ({ data: null, error }));
  return {
    consume: () => { if (consumed) return; consumed = true; return {
      request, cancel: () => controller.abort(), detach: () => { admissionEnabled = false; }
    }; },
    discard: () => { if (!consumed) { consumed = true; controller.abort(); } }
  };
}

export function prefetchColdSkyContentForKeys(keys: string[], publications: Promise<void>) {
  // This wrapper is the sole owner; cancellation remains available after the
  // caller starts awaiting its private, ledger-admitted content map.
  const owned = prefetchColdSkyKeys(Promise.resolve(keys), publications, 50).consume()!;
  return {
    rows: owned.request.then(result => generatedContentMapFromRows(sortGeneratedRowsNewestFirst(result.data ?? [])))
      .catch(() => new Map<string, LiveGeneratedContent>()),
    discard: owned.cancel,
    detach: owned.detach
  };
}

export function prefetchColdSkyPlacementRows(selection: string, publications: Promise<void>) {
  if (pendingDashboardBundles.get(`placement:${selection}`)?.generation === contentPublicationGeneration) return;
  if (!selection.startsWith("article:") || contentPublicationsAvailableOnline()
    || readCachedFallbackArchitectureV3Bundle("sky-article")) return;
  try {
    if (window.localStorage.getItem(skyPublicationCacheKey)) return;
  } catch { /* Unavailable storage does not authorize any cached row. */ }
  // Only transport candidates: the normal selected publication-ID completion
  // below still owns exact selection, new keys, retirement and missing rows.
  const keys = Promise.all([loadFallbackArchitectureV3BundledSkyPlacementManifest(), import("./skyPlacementSourceScope")])
    .then(([manifest, { skyPlacementSourceInSelection }]) => {
      const known = manifest.keys.map(key => key.slice(key.indexOf(":") + 1))
        .filter(key => skyPlacementSourceInSelection(key, selection));
      const articles = selection.slice("article:".length).split(",").flatMap(pair => {
        const [planet, sign] = pair.split("/");
        return [`sky-placement/article/${pair}`, `sky-placement/retrograde/${planet}`,
          ...(["north-node", "south-node"].includes(planet) ? [`sky-nodes/${pair}`] : []),
          ...(["lilith", "black-moon-lilith"].includes(planet) ? [`sky-lilith/article/${sign}`] : [])];
      });
      return [...known, ...articles];
    });
  return prefetchColdSkyKeys(keys, publications, 200);
}

export async function loadFallbackArchitectureV3DashboardBundle(scope: DashboardScope = "all", earlyRead?: ColdSkyArticleRead): Promise<FallbackArchitectureV3Bundle | null> {
  await (scope === "sky-list" ? refreshSkyListPublications() : refreshContentPublications());
  return shareDashboardBundle(scope, canCache => {
    const earlyRows = scope === "sky-article" && !readCachedFallbackArchitectureV3Bundle(scope) ? earlyRead?.consume() : undefined;
    earlyRead?.discard();
    return readFallbackArchitectureV3DashboardBundle(scope, canCache, earlyRows);
  }, () => earlyRead?.discard());
}

function shareDashboardBundle(key: string, read: (canCache: () => boolean) => Promise<FallbackArchitectureV3Bundle | null>, joining: () => void) {
  const active = pendingDashboardBundles.get(key);
  if (active?.generation === contentPublicationGeneration) { joining(); return active.promise; }
  const entry = { generation: contentPublicationGeneration, promise: Promise.resolve(null) as Promise<FallbackArchitectureV3Bundle | null> };
  entry.promise = read(() => pendingDashboardBundles.get(key) === entry && entry.generation === contentPublicationGeneration).finally(() => {
    if (pendingDashboardBundles.get(key) === entry) pendingDashboardBundles.delete(key);
  });
  pendingDashboardBundles.set(key, entry);
  return entry.promise;
}

async function readFallbackArchitectureV3DashboardBundle(
  scope: DashboardScope,
  canCache: () => boolean,
  earlyRows?: ReturnType<typeof loadReaderRows>
): Promise<FallbackArchitectureV3Bundle | null> {
  const anonymous = scope === "sky-list" ? await anonymousReader() : null;
  const supabase = anonymous ? null : await getSupabaseClient();
  const cached = readCachedFallbackArchitectureV3Bundle(scope);
  const recoverUnavailableOverlay = (error: unknown) => {
    if (scope === "sky-list" && !(publicationLedgerReady() && loadedLastKnownGoodRows.length)) throw new Error("Current Sky content did not load.");
    console.warn(error);
    return cached?.bundle ?? loadContentStudioLastKnownGoodCoreBundle(scope);
  };

  if (!supabase && !anonymous) return cached?.bundle ?? await loadContentStudioLastKnownGoodCoreBundle(scope);

  // Cold Sky readers have no cached bundle for the revision check to reuse.
  // Fetch their rows and immutable manifest while that check runs, then retain
  // the same publication, revision and package admission below.
  const coldArticleRows = !cached && (scope === "sky-article" || scope === "sky-list")
    ? earlyRows ?? loadReaderRows({ provider: fallbackArchitectureV3Provider, scope }) : undefined;
  const coldArticleManifest = coldArticleRows
    ? loadFallbackArchitectureV3BundledCoreManifest()
    : undefined;
  void coldArticleManifest?.catch(() => { /* Joined by the existing recovery below. */ });

  const { data: runtimeRevision, error: runtimeRevisionError } = anonymous
    ? await anonymous.readAnonymousRuntimeRevision(fallbackArchitectureV3Provider)
    : await supabase!.rpc("content_runtime_revision", { p_provider: fallbackArchitectureV3Provider });
  let dashboardVersion = typeof runtimeRevision === "string" ? Date.parse(runtimeRevision) : 0;

  if (runtimeRevisionError || !Number.isFinite(dashboardVersion)) {
    // Backward-compatible rollout path while the DB migration reaches an environment.
    // This fallback cannot detect every demotion, so it is used only when the revision
    // RPC is unavailable.
    const { data: versionRows, error: versionError } = await loadReaderRows({ provider: fallbackArchitectureV3Provider, latestVersion: true });
    if (versionError) return recoverUnavailableOverlay(versionError);
    dashboardVersion = fallbackArchitectureV3DashboardVersionFromRows(versionRows ?? []);
  }
  if (cached && dashboardVersion && cached.version === dashboardVersion) return cached.bundle;

  let result = await (coldArticleRows ?? loadReaderRows({ provider: fallbackArchitectureV3Provider, ...(scope !== "all" ? { scope } : {}) }));
  // An initial live ledger can reveal edits or new keys absent from the early
  // snapshot. Discard it and use the unchanged post-ledger request once.
  if (earlyRows && result.error instanceof ReaderAdmissionError) {
    result = await loadReaderRows({ provider: fallbackArchitectureV3Provider, scope: "sky-article" });
  }
  const { data, error } = result;
  if (error) return recoverUnavailableOverlay(error);
  const rows = data ?? [];

  let currentCoreManifest: Pick<FallbackArchitectureV3PackageManifest, "keys">;
  try {
    currentCoreManifest = await (coldArticleManifest ?? loadFallbackArchitectureV3BundledCoreManifest());
  } catch (error) {
    console.warn("Fallback architecture V3 current key manifest failed to load; cached/local copy remains active.", error);
    return cached?.bundle ?? null;
  }
  const bundle = packageFallbackArchitectureV3CoreRows(rows, currentCoreManifest);
  if (!bundle) {
    if (canCache()) clearCachedFallbackArchitectureV3Bundle(scope);
    return null;
  }
  // Early rows may precede an edit observed by the concurrent revision RPC.
  // Never stamp that older snapshot with the later revision: a subsequent
  // revision-first visit must refresh it before establishing a cache hit.
  const cacheVersion = coldArticleRows ? fallbackArchitectureV3DashboardVersionFromRows(rows)
    : dashboardVersion || fallbackArchitectureV3DashboardVersionFromRows(rows);
  if (canCache()) cacheFallbackArchitectureV3Bundle(cacheVersion, bundle, scope);
  return bundle;

}

export async function loadFallbackArchitectureV3CompatibilityDashboardBundle(): Promise<FallbackArchitectureV3Bundle | null> {
  await refreshContentPublications();
  const supabase = await getSupabaseClient();
  if (!supabase) return loadContentStudioLastKnownGoodCompatibilityBundle();

  const { data, error } = await loadReaderRows({ prefix: "authored/compat-pair/" });
  if (error) {
    console.warn("Compatibility dashboard content failed to load; nightly/bundled relationship copy remains active.", error);
    return loadContentStudioLastKnownGoodCompatibilityBundle();
  }
  const rows = data ?? [];

  return packageFallbackArchitectureV3CompatibilityRows(rows);

}

const skyPublicationCacheKey = "tldrastro:sky-publication-rows:v2";
if (typeof window !== "undefined") {
  try { window.localStorage.removeItem("tldrastro:sky-publication-rows:v1"); } catch { /* Storage may be unavailable. */ }
}

async function loadPublishedSkyBundle(selection?: string, staged?: ReturnType<typeof loadReaderRows>, canCache = () => true): Promise<FallbackArchitectureV3Bundle | null> {
  const manifest = await loadFallbackArchitectureV3BundledSkyPlacementManifest();
  const keys = new Set(manifest.keys.map((key) => key.slice(key.indexOf(":") + 1)));
  const { skyPlacementSourceInSelection } = await import("./skyPlacementSourceScope");
  const isPublishedReaderKey = (contentKey: string) => (keys.has(contentKey) || isSkyPlacementPublishedReaderKey(contentKey))
    && skyPlacementSourceInSelection(contentKey, selection);
  const eligible = (row: GeneratedContentRow) => Boolean(row && typeof row === "object") && isPublishedReaderKey(row.content_key)
    && contentPublication(row.content_key)?.state === "live"
    && publicationAllowsContent(row.content_key, row.id, row.updated_at)
    && row.status === "LIVE" && row.lane === "serving" && !row.review_state
    && isReaderServableGeneratedContentRow(row) && isGeneratedContentReaderBoundaryAllowed(row);
  const packageRows = (rows: GeneratedContentRow[]): FallbackArchitectureV3Bundle | null => {
    const hookRows = rows.filter(eligible).map(packageHookRowFromRow).filter((row): row is HookRow => Boolean(row));
    return hookRows.length ? { transitLib: { authoredCards: [] }, templatesFile: { templates: [] }, rowsFile: { hookRows, vocabularyRows: [] } } : null;
  };
  let cached: GeneratedContentRow[] = [];
  try {
    const value = JSON.parse(window.localStorage.getItem(skyPublicationCacheKey) ?? "[]");
    if (Array.isArray(value)) cached = value;
  } catch { /* Keep the canonical publication guard even when storage is unavailable. */ }
  // The outage preparation has already installed the offline snapshot's ledger
  // and rows. Reuse those rows without another download; every row still has to
  // match the newest known publication, including cached retirements/revisions.
  // Add only the current selection, not the entire offline inventory. A verified
  // current snapshot row replaces an older browser row with the same ID.
  cached = [...new Map([...cached.filter(row => row && typeof row === "object"),
    ...loadedLastKnownGoodRows.filter(eligible)].map(row => [row.id, row])).values()];
  const publications = contentPublicationRecords().filter(publication => publication.state === "live"
    && isPublishedReaderKey(publication.content_key) && publication.row_id);
  const complete = (rows: GeneratedContentRow[]) => {
    const current = rows.filter(eligible);
    if (publications.some(publication => !current.some(row => row.id === publication.row_id))) {
      throw new Error("Current Sky publications did not load.");
    }
    return packageRows(current);
  };
  // Only rows matching the current ledger can recover a failed targeted read.
  // Do not turn an 8-second timeout into a full snapshot download.
  const fallback = () => complete(cached);
  const client = await publicReaderAvailable();
  if (!client || typeof navigator !== "undefined" && navigator.onLine === false) return fallback();
  const retainedRows = cached.filter(eligible);
  const completeCache = publications.every(publication => retainedRows.some(row => row.id === publication.row_id));
  const incoming = !completeCache && staged ? await staged : undefined;
  const rows = [...new Map([...retainedRows, ...(incoming?.data ?? []).filter(eligible)].map(row => [row.id, row])).values()];
  const ids = publications.filter(publication => !rows.some(row => row.id === publication.row_id)).map(publication => publication.row_id!);
  for (let offset = 0; offset < ids.length; offset += 200) {
    const batchIds = ids.slice(offset, offset + 200);
    const batchKeys = publications.filter(publication => batchIds.includes(publication.row_id!)).map(publication => publication.content_key);
    const { data, error } = await loadReaderRows({ ids: batchIds, keys: batchKeys });
    if (error || !Array.isArray(data)) {
      return fallback();
    }
    rows.push(...data);
  }
  const current = rows.filter(eligible);
  const bundle = complete(current);
  // Retain other visited selections, but drop retired and superseded rows.
  const retained = cached.filter(row => publicationAllowsContent(row.content_key, row.id, row.updated_at)
    && !current.some(incoming => incoming.content_key === row.content_key));
  try { if (canCache()) window.localStorage.setItem(skyPublicationCacheKey, JSON.stringify([...retained, ...current])); } catch { /* Memory remains guarded. */ }
  return bundle;
}

export async function loadFallbackArchitectureV3SkyPlacementDashboardBundle(selection?: string, earlyRead?: ReturnType<typeof prefetchColdSkyPlacementRows>, initialList = false): Promise<FallbackArchitectureV3Bundle | null> {
  // Claim before joining. A later caller cannot cancel the active owner's read.
  const staged = earlyRead?.consume();
  await (initialList ? refreshSkyListPublications() : refreshContentPublications()).catch(error => { staged?.cancel(); throw error; });
  return shareDashboardBundle(`placement:${selection ?? "all"}`,
    canCache => readSkyPlacementBundle(selection, staged, canCache).finally(() => staged?.cancel()),
    () => staged?.cancel());
}

async function readSkyPlacementBundle(selection: string | undefined, staged: ReturnType<NonNullable<ReturnType<typeof prefetchColdSkyPlacementRows>>["consume"]>, canCache: () => boolean): Promise<FallbackArchitectureV3Bundle | null> {
  if (publicationLedgerReady() || contentPublicationRecords().some((publication) => isSkyPlacementPublishedReaderKey(publication.content_key))) {
    return loadPublishedSkyBundle(selection, staged?.request, canCache);
  }
  staged?.cancel();
  const supabase = await publicReaderAvailable();
  const cached = await readCachedFallbackArchitectureV3SkyPlacementBundle();

  if (!supabase) return cached?.bundle ?? null;

  const { data: versionRows, error: versionError } = await loadReaderRows({ provider: fallbackArchitectureV3SkyPlacementProvider, latestVersion: true });

  if (versionError) {
    console.warn("Sky Placement dashboard partition version failed to load; cached/local content remains active.", versionError);
    return cached?.bundle ?? null;
  }

  const dashboardVersion = fallbackArchitectureV3DashboardVersionFromRows(versionRows ?? []);
  if (!dashboardVersion) {
    if (canCache()) clearCachedFallbackArchitectureV3SkyPlacementBundle();
    return null;
  }
  if (cached?.version === dashboardVersion) return cached.bundle;

  const { data, error } = await loadReaderRows({ provider: fallbackArchitectureV3SkyPlacementProvider });
  if (error) {
    console.warn("Sky Placement dashboard partition failed to load; cached/local content remains active.", error);
    return cached?.bundle ?? null;
  }
  const rows = data ?? [];

  let packageLegacySkyPlacementMirror: typeof import("./legacySkyPlacementMirror")["packageLegacySkyPlacementMirror"];
  try {
    ({ packageLegacySkyPlacementMirror } = await import("./legacySkyPlacementMirror"));
  } catch (error) {
    console.warn("Sky Placement dashboard partition failed to load; cached/local content remains active.", error);
    return cached?.bundle ?? null;
  }
  const packaged = await packageLegacySkyPlacementMirror(rows);
  if (!packaged) {
    if (canCache()) clearCachedFallbackArchitectureV3SkyPlacementBundle();
    return null;
  }
  if (canCache()) cacheFallbackArchitectureV3SkyPlacementBundle(dashboardVersion, packaged.bundle, packaged.mirror);
  return packaged.bundle;
}

export function generatedContentDrilldown(content?: LiveGeneratedContent | null): GeneratedContentDrilldown | null {
  const sections = content?.sections;

  if (!sections || typeof sections !== "object" || Array.isArray(sections)) {
    return null;
  }

  const record = sections as Record<string, unknown>;
  const rawDrilldown = record.astrologyDrilldown;

  if (!rawDrilldown || typeof rawDrilldown !== "object" || Array.isArray(rawDrilldown)) {
    return null;
  }

  const drilldown = rawDrilldown as Record<string, unknown>;
  const rawFactors = Array.isArray(drilldown.factors) ? drilldown.factors : [];
  const factors = rawFactors.flatMap((factor) => {
    if (!factor || typeof factor !== "object" || Array.isArray(factor)) {
      return [];
    }

    const factorRecord = factor as Record<string, unknown>;
    const label = stringField(factorRecord, "label");
    const technicalFact = stringField(factorRecord, "technicalFact");
    const plainMeaning = stringField(factorRecord, "plainMeaning");

    return label && technicalFact && plainMeaning ? [{ label, technicalFact, plainMeaning }] : [];
  });

  const title = stringField(drilldown, "title") || "Why this?";
  const summary = stringField(drilldown, "summary");
  const whyThisScene = stringField(drilldown, "whyThisScene");

  if (!summary && factors.length === 0 && !whyThisScene) {
    return null;
  }

  return {
    title,
    summary,
    factors,
    whyThisScene,
    timingNote: stringField(drilldown, "timingNote") || undefined
  };
}

export async function loadLiveGeneratedContent(
  surface: string,
  targetDate?: string
) {
  return loadLiveGeneratedContentForSurfaces([surface], targetDate);
}


async function loadLastKnownGoodGeneratedContentForSurfaces(
  effectiveSurfaces: string[],
  targetDate?: string,
  previewMode: GeneratedContentPreviewMode = readGeneratedContentPreviewMode()
) {
  const rows = (await loadContentStudioLastKnownGoodRows()) as GeneratedContentRow[];
  const filtered = rows.filter((row) => {
    if (!effectiveSurfaces.includes(row.surface)) return false;
    if (!targetDate) return true;
    return row.target_date === null || row.target_date === targetDate;
  });
  return generatedContentMapFromRows(sortGeneratedRowsNewestFirst(filtered), previewMode);
}

async function loadLastKnownGoodGeneratedContentForKeys(contentKeys: string[]) {
  const keySet = new Set(contentKeys);
  const rows = (await loadContentStudioLastKnownGoodRows()) as GeneratedContentRow[];
  return generatedContentMapFromRows(sortGeneratedRowsNewestFirst(rows.filter((row) => keySet.has(row.content_key))));
}

const pendingReaderContent = new Map<string, Promise<Map<string, LiveGeneratedContent>>>();
function sharePendingReaderContent(identity: unknown[], read: () => Promise<Map<string, LiveGeneratedContent>>) {
  const key = JSON.stringify(identity);
  let pending = pendingReaderContent.get(key);
  if (!pending) {
    pending = read().finally(() => pendingReaderContent.delete(key));
    pendingReaderContent.set(key, pending);
  }
  return pending;
}

export async function loadLiveGeneratedContentForSurfaces(
  requestedSurfaces: string[],
  targetDate?: string,
  previewMode: GeneratedContentPreviewMode = readGeneratedContentPreviewMode(),
  vocabularyOnly = false,
  publicationScope: "all" | "sky-list" = "all"
) {
  if (publicationScope === "sky-list" && !(vocabularyOnly && requestedSurfaces.every(surface => surface === "modifier"))) throw new Error("Invalid Sky vocabulary scope.");
  await (publicationScope === "sky-list" ? refreshSkyListPublications() : refreshContentPublications());
  const surfaces = [...new Set([
    ...requestedSurfaces, "modifier", ...(requestedSurfaces.includes("sky") ? ["you"] : [])
  ])];
  // Sky requests span publication dates; normalize that policy once for the
  // sharing identity, request and last-known-good fallback.
  if (surfaces.includes("sky")) targetDate = undefined;
  // Share only active equivalent reads after resolving publication generation.
  return sharePendingReaderContent([
    "surfaces", contentPublicationGeneration, [...surfaces].sort(), targetDate || null,
    previewMode, vocabularyOnly
  ], () => readLiveGeneratedContentForSurfaces(surfaces, targetDate, previewMode, vocabularyOnly));
}

async function readLiveGeneratedContentForSurfaces(
  surfaces: string[],
  targetDate: string | undefined,
  previewMode: GeneratedContentPreviewMode,
  vocabularyOnly: boolean
) {
  const supabase = await publicReaderAvailable();

  if (!supabase) {
    return loadLastKnownGoodGeneratedContentForSurfaces(surfaces, targetDate, previewMode);
  }
  // The publication ledger has its own deadline. Give the content request its
  // full budget instead of expiring it while it is still waiting for that ledger.
  const requestSignal = AbortSignal.timeout(8000);

  const { data, error } = await loadReaderRows({ surfaces, ...(vocabularyOnly ? { vocabularyOnly: true } : {}),
    ...(targetDate ? { targetDate } : {}) }, requestSignal);
  if (error) {
    console.warn("Content surface read failed.", error);
    return loadLastKnownGoodGeneratedContentForSurfaces(surfaces, targetDate, previewMode);
  }
  const rows = data ?? [];

  return generatedContentMapFromRows(sortGeneratedRowsNewestFirst(rows), previewMode);
}

export async function loadLiveGeneratedContentForKeys(contentKeys: string[], options: { requireFresh?: boolean } = {}) {
  await (skyListPublicationReadStarted() && contentKeys.every(isSkyListPublicationKey)
    ? refreshSkyListPublications() : refreshContentPublications());
  const keys = [...new Set(contentKeys.map((key) => key.trim()).filter(Boolean))].sort();

  if (keys.length === 0) {
    return new Map<string, LiveGeneratedContent>();
  }

  // Several mounted readers can request the same keys during publication
  // hydration. Share only in-flight work for the same revision/freshness policy;
  // settled requests and later revisions always revalidate.
  return sharePendingReaderContent(["keys", contentPublicationGeneration, options.requireFresh === true, keys],
    () => readLiveGeneratedContentForKeys(keys, options));
}

async function readLiveGeneratedContentForKeys(keys: string[], options: { requireFresh?: boolean }) {
  const supabase = await publicReaderAvailable();

  if (!supabase) {
    if (options.requireFresh) throw new Error("Live content is unavailable.");
    return loadLastKnownGoodGeneratedContentForKeys(keys);
  }
  const requestSignal = AbortSignal.timeout(8000);

  const rows: GeneratedContentRow[] = [];
  const batchSize = 50;

  for (let index = 0; index < keys.length; index += batchSize) {
    const batch = keys.slice(index, index + batchSize);
    const { data, error } = await loadReaderRows({ keys: batch }, requestSignal);

    if (error) {
      // A refresh must distinguish confirmed removals from an offline snapshot.
      if (options.requireFresh) throw error;
      console.warn("Targeted content read failed.", error);
      return loadLastKnownGoodGeneratedContentForKeys(keys);
    }

    rows.push(...(data ?? []));
  }

  return generatedContentMapFromRows(sortGeneratedRowsNewestFirst(rows));
}

export function generatedContentMapFromRows(
  rows: GeneratedContentRow[],
  previewMode: GeneratedContentPreviewMode = readGeneratedContentPreviewMode()
) {
  const byKey = new Map<string, LiveGeneratedContent>();

  for (const row of rows) {
    // Snapshot loading must apply the same serving filter as the live database query.
    if ((row.content_key.startsWith("cms/sky-daily-summary/")
      || row.content_key.startsWith("cms/sky-debility/"))
      && (row.status !== "LIVE" || row.lane !== "serving" || row.review_state)) continue;
    if (!publicationAllowsContent(row.content_key, row.id, row.updated_at, row.target_date)) continue;
    if (!isGeneratedContentReaderBoundaryAllowed(row)) {
      continue;
    }

    if (!isReaderServableGeneratedContentRow(row)) {
      continue;
    }

    const emergencyFloorRow = isEmergencyFloorGeneratedRow(row);

    const compatibilityPlanetCardRow = row.event_type === "friends.compatibility.planet-card";

    if (previewMode === "emergency-floor" && !emergencyFloorRow && !compatibilityPlanetCardRow) {
      continue;
    }

    if (previewMode === "hide-emergency-floor" && emergencyFloorRow) {
      continue;
    }

    const content = fromRow(row);

    if (!isReaderServableGeneratedContent(content)) {
      continue;
    }

    const existingForExactKey = byKey.get(row.content_key);

    if (!existingForExactKey || existingForExactKey.contentKey !== row.content_key) {
      byKey.set(row.content_key, content);
    }

    const aliases = generatedContentAliases(row);

    for (const alias of aliases) {
      const existing = byKey.get(alias);

      if (!existing || shouldReplaceAlias(alias, existing, content)) {
        byKey.set(alias, content);
      }
    }
  }

  return byKey;
}
