import { getSupabaseClient } from "./auth";

let contentStudioLastKnownGoodRowsPromise: Promise<GeneratedContentRow[]> | null = null;

export async function loadContentStudioLastKnownGoodRows(): Promise<GeneratedContentRow[]> {
  if (!contentStudioLastKnownGoodRowsPromise) {
    contentStudioLastKnownGoodRowsPromise = (async () => {
      try {
        const response = await fetch("/content-studio-last-known-good.json", { cache: "no-cache" });
        if (!response.ok) return [];
        const snapshot = await response.json() as { schema?: unknown; rowCount?: unknown; rows?: unknown };
        return snapshot.schema === "content-studio-last-known-good-v1"
          && Array.isArray(snapshot.rows)
          && snapshot.rowCount === snapshot.rows.length
          ? snapshot.rows as GeneratedContentRow[]
          : [];
      } catch {
        return [];
      }
    })();
  }
  const rows = await contentStudioLastKnownGoodRowsPromise;
  if (!rows.length) contentStudioLastKnownGoodRowsPromise = null;
  return rows;
}
import {
  hasMissingTemplateSlots,
  hasTemplateSlots,
  interpolateTemplateString,
  type TemplateSlotValues
} from "./templateInterpolation";
import { generatedContentAliases } from "./generatedContentKeys";
import { fallbackArchitectureV3DashboardPackageDestination } from "./fallbackArchitectureV3DashboardPackaging";
import { selectLatestLiveServingDashboardRows } from "./fallbackArchitectureV3DashboardOverlay";
import { isFallbackDashboardRecordAllowed } from "../content/fallbackArchitectureV3/dashboardExtensions";
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
  fallbackArchitectureV3ManifestForBundle,
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
  status?: "DRAFT" | "REVIEWED" | "LIVE" | "ARCHIVED" | "ERROR" | string;
};

type GeneratedContentRow = {
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
const fallbackArchitectureV3ApprovedReviews = new Set(["approved", "approved_reuse", "reviewed"]);
const fallbackArchitectureV3BundleCacheKey = "tldrastro:fallbackArchitectureV3:dashboardBundle";
const fallbackArchitectureV3BundleVersionKey = "tldrastro:fallbackArchitectureV3:dashboardBundleVersion";
const fallbackArchitectureV3BundleCacheSchema = "fallback-architecture-v3-dashboard-overlay-cache-v6";
const fallbackArchitectureV3SkyPlacementBundleCacheKey = "tldrastro:fallbackArchitectureV3:skyPlacementDashboardBundle";
const fallbackArchitectureV3SkyPlacementBundleVersionKey = "tldrastro:fallbackArchitectureV3:skyPlacementDashboardBundleVersion";
const fallbackArchitectureV3SkyPlacementBundleCacheSchema = "fallback-architecture-v3-sky-placement-dashboard-cache-v2";

function isSkyPlacementFallbackPartitionKey(contentKey: string) {
  return contentKey.startsWith("fallback-hook/sky-sign-copy/")
    || (
      contentKey.startsWith("fallback-hook/sky-placement-")
      && !contentKey.startsWith("fallback-hook/sky-placement-sign/")
    );
}

function isSkyPlacementDashboardDistributionEligible(row: GeneratedContentRow) {
  const record = packageRecord(row);
  const isContinuous = record.render_policy === "sky-placement-continuous-v2"
    || row.content_key.startsWith("fallback-hook/sky-sign-copy/");

  if (!isContinuous) return true;

  const sourceSnapshot = rowSourceSnapshot(row);
  const facts = rowFacts(row);
  return stringFrom(
    sourceSnapshot.distributionState,
    sourceSnapshot.distribution_state,
    facts.distributionState,
    facts.distribution_state
  ) === "serving";
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

type FallbackArchitectureV3MirrorMetadata = {
  packageVersion: string;
  contentHash: string;
  keyManifestHash: string;
  keyCount: number;
};

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
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
    mode: row.mode,
    eventType: row.event_type,
    targetDate: row.target_date,
    headline: row.headline,
    summary: row.summary,
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
  if (!content) {
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

function generatedRowSourceType(row: Pick<GeneratedContentRow, "source_snapshot">) {
  const sourceSnapshot = row.source_snapshot && typeof row.source_snapshot === "object"
    ? row.source_snapshot as Record<string, unknown>
    : null;
  const sourceType = typeof sourceSnapshot?.sourceType === "string" ? sourceSnapshot.sourceType : "";

  return sourceType;
}

function isEmergencyFloorContentKey(contentKey: string) {
  return contentKey.startsWith("fallback-hook/")
    || contentKey.startsWith("slot-template/")
    || contentKey.startsWith("vocab/")
    || contentKey.startsWith("fallback-vocab/")
    || contentKey.startsWith("guide-phrase/");
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

function isLegacyLiveWritingRow(row: Pick<GeneratedContentRow, "content_key" | "provider" | "source_snapshot">) {
  if (isEmergencyFloorContentKey(row.content_key)) {
    return false;
  }

  const sourceType = generatedRowSourceType(row);

  return row.provider === "local-normalized-dashboard-source"
    || sourceType === "normalized-dashboard-source"
    || sourceType === "source-grounded-generated-snapshot";
}

function generatedRowSectionCopyValues(sections: unknown): string[] {
  if (typeof sections === "string") {
    return [sections];
  }

  if (Array.isArray(sections)) {
    return sections.flatMap((section) => {
      if (!section || typeof section !== "object" || Array.isArray(section)) {
        return [];
      }

      const record = section as Record<string, unknown>;

      return [record.body, record.text]
        .filter((value): value is string => typeof value === "string" && value.trim().length > 0);
    });
  }

  if (sections && typeof sections === "object") {
    const record = sections as Record<string, unknown>;
    const nestedSections = Array.isArray(record.sections) ? generatedRowSectionCopyValues(record.sections) : [];

    return [record.body, record.text, ...nestedSections]
      .filter((value): value is string => typeof value === "string" && value.trim().length > 0);
  }

  return [];
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

function generatedRowPackageRole(row: Pick<GeneratedContentRow, "facts" | "source_snapshot"> & { sections?: unknown }) {
  const facts = row.facts && typeof row.facts === "object" ? row.facts as Record<string, unknown> : {};
  const sourceSnapshot = row.source_snapshot && typeof row.source_snapshot === "object"
    ? row.source_snapshot as Record<string, unknown>
    : {};
  const sections = row.sections && typeof row.sections === "object" ? row.sections as Record<string, unknown> : {};
  const record = sections.packageRecord && typeof sections.packageRecord === "object"
    ? sections.packageRecord as Record<string, unknown>
    : {};
  const role = sourceSnapshot.content_role
    ?? sourceSnapshot.contentRole
    ?? facts.content_role
    ?? facts.contentRole
    ?? record.content_role
    ?? record.contentRole;
  const review = sourceSnapshot.review_status
    ?? sourceSnapshot.reviewStatus
    ?? facts.review_status
    ?? facts.reviewStatus
    ?? record.review_status
    ?? record.reviewStatus;

  return {
    role: typeof role === "string" ? role : "",
    reviewStatus: typeof review === "string" ? review : ""
  };
}

function rowSourceSnapshot(row: Pick<GeneratedContentRow, "source_snapshot">) {
  return isRecord(row.source_snapshot) ? row.source_snapshot : {};
}

function rowFacts(row: Pick<GeneratedContentRow, "facts">) {
  return isRecord(row.facts) ? row.facts : {};
}

function rowSections(row: Pick<GeneratedContentRow, "sections">) {
  return isRecord(row.sections) ? row.sections : {};
}

function packageRecord(row: Pick<GeneratedContentRow, "sections">) {
  const sections = rowSections(row);
  return isRecord(sections.packageRecord) ? sections.packageRecord : {};
}

function stringFrom(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

function stringArrayFrom(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];
}

function fallbackSystemBucket(row: GeneratedContentRow) {
  const sourceSnapshot = rowSourceSnapshot(row);
  const facts = rowFacts(row);
  const contentType = stringFrom(
    sourceSnapshot.contentType,
    sourceSnapshot.content_type,
    facts.contentType,
    facts.content_type
  );
  const { role } = generatedRowPackageRole(row);

  return { contentType, role };
}

function isApprovedFallbackArchitectureV3Row(
  row: GeneratedContentRow,
  provider = fallbackArchitectureV3Provider
) {
  const { role, reviewStatus } = generatedRowPackageRole(row);

  return Boolean(
    row.provider === provider
      && (
        fallbackArchitectureV3ApprovedReviews.has(reviewStatus)
        || (role === "template" && !reviewStatus)
      )
  );
}

function fallbackArchitectureV3RowMirrorMetadata(
  row: GeneratedContentRow,
  partition: "core" | "sky-placement"
): FallbackArchitectureV3MirrorMetadata | null {
  const sourceSnapshot = rowSourceSnapshot(row);
  const facts = rowFacts(row);
  const record = packageRecord(row);
  const packageVersion = stringFrom(
    sourceSnapshot.packageVersion,
    sourceSnapshot.package_version,
    facts.packageVersion,
    facts.package_version,
    record.packageVersion,
    record.package_version
  );
  const contentHash = stringFrom(
    sourceSnapshot.packagePartitionContentHash,
    sourceSnapshot.package_partition_content_hash,
    facts.packagePartitionContentHash,
    facts.package_partition_content_hash,
    record.packagePartitionContentHash,
    record.package_partition_content_hash,
    sourceSnapshot.packageContentHash,
    sourceSnapshot.package_content_hash,
    facts.packageContentHash,
    facts.package_content_hash,
    record.packageContentHash,
    record.package_content_hash
  );
  const keyManifestHash = stringFrom(
    sourceSnapshot.packagePartitionKeyManifestHash,
    sourceSnapshot.package_partition_key_manifest_hash,
    facts.packagePartitionKeyManifestHash,
    facts.package_partition_key_manifest_hash,
    record.packagePartitionKeyManifestHash,
    record.package_partition_key_manifest_hash,
    sourceSnapshot.packageKeyManifestHash,
    sourceSnapshot.package_key_manifest_hash,
    facts.packageKeyManifestHash,
    facts.package_key_manifest_hash,
    record.packageKeyManifestHash,
    record.package_key_manifest_hash
  );
  const rowPartition = stringFrom(
    sourceSnapshot.packagePartition,
    sourceSnapshot.package_partition,
    facts.packagePartition,
    facts.package_partition,
    record.packagePartition,
    record.package_partition
  );
  const rawKeyCount = sourceSnapshot.packagePartitionKeyCount
    ?? sourceSnapshot.package_partition_key_count
    ?? facts.packagePartitionKeyCount
    ?? facts.package_partition_key_count
    ?? record.packagePartitionKeyCount
    ?? record.package_partition_key_count
    ?? sourceSnapshot.packageKeyCount
    ?? sourceSnapshot.package_key_count
    ?? facts.packageKeyCount
    ?? facts.package_key_count
    ?? record.packageKeyCount
    ?? record.package_key_count;
  const keyCount = Number(rawKeyCount);

  if (
    !packageVersion
    || (rowPartition && rowPartition !== partition)
    || !contentHash
    || !keyManifestHash
    || !Number.isInteger(keyCount)
    || keyCount <= 0
  ) {
    return null;
  }

  return { packageVersion, contentHash, keyManifestHash, keyCount };
}

function equalFallbackArchitectureV3MirrorMetadata(
  first: FallbackArchitectureV3MirrorMetadata,
  second: FallbackArchitectureV3MirrorMetadata
) {
  return first.packageVersion === second.packageVersion
    && first.contentHash === second.contentHash
    && first.keyManifestHash === second.keyManifestHash
    && first.keyCount === second.keyCount;
}

async function fallbackArchitectureV3BundleManifestIfValid(
  bundle: FallbackArchitectureV3Bundle,
  metadata: FallbackArchitectureV3MirrorMetadata,
  loadBundledPartitionManifest: () => Promise<FallbackArchitectureV3PackageManifest>,
  { allowEditorialContentOverrides = false }: { allowEditorialContentOverrides?: boolean } = {}
): Promise<FallbackArchitectureV3PackageManifest | null> {
  if (metadata.packageVersion !== fallbackArchitectureV3BundledManifestSummary.packageVersion) {
    return null;
  }

  const manifest = fallbackArchitectureV3ManifestForBundle(bundle, metadata.packageVersion);
  const bundledManifest = await loadBundledPartitionManifest();

  if (
    manifest.keyManifestHash !== bundledManifest.keyManifestHash
    || manifest.keyCount !== bundledManifest.keyCount
    || manifest.keyManifestHash !== metadata.keyManifestHash
    || manifest.keyCount !== metadata.keyCount
    || (
      !allowEditorialContentOverrides
      && (
        manifest.contentHash !== bundledManifest.contentHash
        || manifest.contentHash !== metadata.contentHash
      )
    )
  ) {
    return null;
  }

  return manifest;
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

export function clearCachedFallbackArchitectureV3Bundle() {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.removeItem(fallbackArchitectureV3BundleVersionKey);
    window.localStorage.removeItem(fallbackArchitectureV3BundleCacheKey);
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

async function readCachedFallbackArchitectureV3Partition({
  cacheKey,
  cacheSchema,
  clear,
  loadManifest,
  partition,
  versionKey
}: {
  cacheKey: string;
  cacheSchema: string;
  clear: () => void;
  loadManifest: () => Promise<FallbackArchitectureV3PackageManifest>;
  partition: "core" | "skyPlacement";
  versionKey: string;
}): Promise<CachedFallbackArchitectureV3Bundle | null> {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const version = Number(window.localStorage.getItem(versionKey) ?? "0");
    const rawBundle = window.localStorage.getItem(cacheKey);

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
    const bundledPartition = fallbackArchitectureV3BundledManifestSummary.partitions?.[partition];

    if (
      !bundledPartition
      || envelope?.schema !== cacheSchema
      || envelope?.runtimeCapability !== fallbackArchitectureV3BundledManifestSummary.runtimeCapability
      || envelope?.bundledPackageVersion !== fallbackArchitectureV3BundledManifestSummary.packageVersion
      || envelope?.bundledContentHash !== bundledPartition.contentHash
      || envelope?.bundledKeyManifestHash !== bundledPartition.keyManifestHash
      || envelope?.dashboardVersion !== version
      || !bundle?.transitLib
      || !bundle?.rowsFile
      || !bundle?.templatesFile
    ) {
      clear();
      return null;
    }

    const mirrorMetadata: FallbackArchitectureV3MirrorMetadata = {
      packageVersion: String(envelope.mirrorPackageVersion ?? ""),
      contentHash: String(envelope.mirrorContentHash ?? ""),
      keyManifestHash: String(envelope.mirrorKeyManifestHash ?? ""),
      keyCount: Number(envelope.mirrorKeyCount)
    };
    const mirror = await fallbackArchitectureV3BundleManifestIfValid(
      bundle,
      mirrorMetadata,
      loadManifest,
      { allowEditorialContentOverrides: true }
    );

    if (!mirror) {
      clear();
      return null;
    }

    return {
      version,
      bundle: { ...bundle, packageManifest: mirror },
      mirror
    };
  } catch {
    clear();
    return null;
  }
}

export function readCachedFallbackArchitectureV3Bundle(): CachedFallbackArchitectureV3Overlay | null {
  if (typeof window === "undefined") return null;

  try {
    const version = Number(window.localStorage.getItem(fallbackArchitectureV3BundleVersionKey) ?? "0");
    const rawBundle = window.localStorage.getItem(fallbackArchitectureV3BundleCacheKey);
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
      clearCachedFallbackArchitectureV3Bundle();
      return null;
    }

    return { version, bundle };
  } catch {
    clearCachedFallbackArchitectureV3Bundle();
    return null;
  }
}

function readCachedFallbackArchitectureV3SkyPlacementBundle() {
  return readCachedFallbackArchitectureV3Partition({
    cacheKey: fallbackArchitectureV3SkyPlacementBundleCacheKey,
    cacheSchema: fallbackArchitectureV3SkyPlacementBundleCacheSchema,
    clear: clearCachedFallbackArchitectureV3SkyPlacementBundle,
    loadManifest: loadFallbackArchitectureV3BundledSkyPlacementManifest,
    partition: "skyPlacement",
    versionKey: fallbackArchitectureV3SkyPlacementBundleVersionKey
  });
}

function cacheFallbackArchitectureV3Partition(
  version: number,
  bundle: FallbackArchitectureV3Bundle,
  mirror: FallbackArchitectureV3PackageManifest,
  {
    cacheKey,
    cacheSchema,
    partition,
    versionKey
  }: {
    cacheKey: string;
    cacheSchema: string;
    partition: "core" | "skyPlacement";
    versionKey: string;
  }
) {
  if (typeof window === "undefined" || !version) {
    return;
  }

  try {
    const bundledPartition = fallbackArchitectureV3BundledManifestSummary.partitions?.[partition];
    if (!bundledPartition) return;

    window.localStorage.setItem(versionKey, String(version));
    window.localStorage.setItem(cacheKey, JSON.stringify({
      schema: cacheSchema,
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
  bundle: FallbackArchitectureV3Bundle
) {
  if (typeof window === "undefined" || !version) return;

  try {
    window.localStorage.setItem(fallbackArchitectureV3BundleVersionKey, String(version));
    window.localStorage.setItem(fallbackArchitectureV3BundleCacheKey, JSON.stringify({
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

function cacheFallbackArchitectureV3SkyPlacementBundle(
  version: number,
  bundle: FallbackArchitectureV3Bundle,
  mirror: FallbackArchitectureV3PackageManifest
) {
  cacheFallbackArchitectureV3Partition(version, bundle, mirror, {
    cacheKey: fallbackArchitectureV3SkyPlacementBundleCacheKey,
    cacheSchema: fallbackArchitectureV3SkyPlacementBundleCacheSchema,
    partition: "skyPlacement",
    versionKey: fallbackArchitectureV3SkyPlacementBundleVersionKey
  });
}

function packageAuthoredCardFromRow(row: GeneratedContentRow): AuthoredCard | null {
  const record = packageRecord(row);
  const { role, reviewStatus } = generatedRowPackageRole(row);
  const recordBody = stringFrom(row.body, record.body);
  const recordBodyYou = stringFrom(record.body_you);
  const recordBodyThey = stringFrom(record.body_they);

  if (!recordBody && !recordBodyYou && !recordBodyThey) {
    return null;
  }

  return {
    ...record,
    contentKey: row.content_key,
    content_role: role || stringFrom(record.content_role) || "full_copy",
    ...(recordBody ? { body: recordBody } : {}),
    ...(recordBodyYou ? { body_you: recordBodyYou } : {}),
    ...(recordBodyThey ? { body_they: recordBodyThey } : {}),
    review_status: reviewStatus || stringFrom(record.review_status) || "approved"
  };
}

function packageHookRowFromRow(row: GeneratedContentRow): HookRow | null {
  const record = packageRecord(row);
  const { role, reviewStatus } = generatedRowPackageRole(row);
  const recordBody = stringFrom(record.body);
  const recordBodyYou = stringFrom(record.body_you);
  const recordBodyThey = stringFrom(record.body_they);

  if (!recordBody && !recordBodyYou && !recordBodyThey) {
    return null;
  }

  return {
    ...record,
    contentKey: row.content_key,
    content_role: role || stringFrom(record.content_role) || "fallback_hook",
    ...(recordBody ? { body: recordBody } : {}),
    ...(recordBodyYou ? { body_you: recordBodyYou } : {}),
    ...(recordBodyThey ? { body_they: recordBodyThey } : {}),
    review_status: reviewStatus || stringFrom(record.review_status) || "approved"
  };
}

function packageVocabRowFromRow(row: GeneratedContentRow): VocabRow | null {
  const record = packageRecord(row);
  const { role, reviewStatus } = generatedRowPackageRole(row);
  const body = stringFrom(record.body);
  const grammarFrame = stringFrom(record.grammar_frame);

  if (!body) {
    return null;
  }

  return {
    ...record,
    contentKey: row.content_key,
    content_role: role || stringFrom(record.content_role) || "vocabulary",
    ...(grammarFrame ? { grammar_frame: grammarFrame } : {}),
    body,
    review_status: reviewStatus || stringFrom(record.review_status) || "approved"
  };
}

function packageTemplateRowFromRow(row: GeneratedContentRow): TemplateRow | null {
  const record = packageRecord(row);
  const { role, reviewStatus } = generatedRowPackageRole(row);
  const body = stringFrom(record.body);

  if (!body) {
    return null;
  }

  return {
    ...record,
    contentKey: row.content_key,
    content_role: role || stringFrom(record.content_role) || "template",
    body,
    ...(stringFrom(record.body_you) ? { body_you: stringFrom(record.body_you) } : {}),
    ...(stringFrom(record.body_they) ? { body_they: stringFrom(record.body_they) } : {}),
    ...(stringArrayFrom(record.requiredSlots).length ? { requiredSlots: stringArrayFrom(record.requiredSlots) } : {}),
    ...(stringArrayFrom(record.optionalSlots).length ? { optionalSlots: stringArrayFrom(record.optionalSlots) } : {}),
    review_status: reviewStatus || stringFrom(record.review_status) || "approved_reuse"
  };
}

function packageFallbackArchitectureV3CoreRows(
  rows: GeneratedContentRow[],
  currentCoreManifest: FallbackArchitectureV3PackageManifest
): FallbackArchitectureV3Bundle | null {
  const currentCoreKeys = new Set(currentCoreManifest.keys.map((manifestKey) => {
    const separatorIndex = manifestKey.indexOf(":");
    return separatorIndex >= 0 ? manifestKey.slice(separatorIndex + 1) : manifestKey;
  }));
  for (const row of rows) {
    const extensionRecord = { ...packageRecord(row), contentKey: row.content_key };
    if (isFallbackDashboardRecordAllowed(extensionRecord, currentCoreKeys)) currentCoreKeys.add(row.content_key);
  }
  const overlayRows = selectLatestLiveServingDashboardRows(
    rows,
    currentCoreKeys,
    (row) => isApprovedFallbackArchitectureV3Row(row),
    (row) => isSkyPlacementFallbackPartitionKey(row.content_key)
  );
  const authoredCards: AuthoredCard[] = [];
  const hookRows: HookRow[] = [];
  const vocabularyRows: VocabRow[] = [];
  const templates: TemplateRow[] = [];
  for (const row of overlayRows) {
    const { contentType, role } = fallbackSystemBucket(row);
    const destination = fallbackArchitectureV3DashboardPackageDestination({ contentKey: row.content_key, contentType, role });
    if (destination === "authored") {
      const value = packageAuthoredCardFromRow(row);
      if (value) authoredCards.push(value);
    } else if (destination === "hook") {
      const value = packageHookRowFromRow(row);
      if (value) hookRows.push(value);
    } else if (destination === "vocabulary") {
      const value = packageVocabRowFromRow(row);
      if (value) vocabularyRows.push(value);
    } else if (destination === "template") {
      const value = packageTemplateRowFromRow(row);
      if (value) templates.push(value);
    }
  }
  if (!authoredCards.length && !hookRows.length && !vocabularyRows.length && !templates.length) return null;
  return { transitLib: { authoredCards }, rowsFile: { hookRows, vocabularyRows }, templatesFile: { templates } };
}

async function loadContentStudioLastKnownGoodCoreBundle() {
  try {
    const manifest = await loadFallbackArchitectureV3BundledCoreManifest();
    return packageFallbackArchitectureV3CoreRows(await loadContentStudioLastKnownGoodRows(), manifest);
  } catch {
    return null;
  }
}

function packageFallbackArchitectureV3CompatibilityRows(rows: GeneratedContentRow[]) {
  const seen = new Set<string>();
  const authoredCards: AuthoredCard[] = [];
  for (const row of sortGeneratedRowsNewestFirst(rows)) {
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

export async function loadFallbackArchitectureV3DashboardBundle(): Promise<FallbackArchitectureV3Bundle | null> {
  const supabase = await getSupabaseClient();
  const cached = readCachedFallbackArchitectureV3Bundle();

  if (!supabase) return cached?.bundle ?? await loadContentStudioLastKnownGoodCoreBundle();

  const { data: runtimeRevision, error: runtimeRevisionError } = await supabase
    .rpc("content_runtime_revision", { p_provider: fallbackArchitectureV3Provider });
  let dashboardVersion = typeof runtimeRevision === "string" ? Date.parse(runtimeRevision) : 0;

  if (runtimeRevisionError || !Number.isFinite(dashboardVersion)) {
    // Backward-compatible rollout path while the DB migration reaches an environment.
    // This fallback cannot detect every demotion, so it is used only when the revision
    // RPC is unavailable.
    const { data: versionRows, error: versionError } = await supabase
      .from("generated_interpretations")
      .select("updated_at")
      .eq("provider", fallbackArchitectureV3Provider)
      .eq("status", "LIVE")
      .eq("lane", "serving")
      .order("updated_at", { ascending: false })
      .limit(1)
      .returns<Array<Pick<GeneratedContentRow, "updated_at">>>();
    if (versionError) {
      console.warn("Fallback architecture V3 live overlay version failed to load; nightly/cached/local copy remains active.", versionError);
      return cached?.bundle ?? await loadContentStudioLastKnownGoodCoreBundle();
    }
    dashboardVersion = fallbackArchitectureV3DashboardVersionFromRows(versionRows ?? []);
  }
  if (cached && dashboardVersion && cached.version === dashboardVersion) return cached.bundle;

  const rows: GeneratedContentRow[] = [];
  const pageSize = 1000;
  let cursorId: string | null = null;

  for (let page = 0; page < 10; page += 1) {
    let query = supabase
      .from("generated_interpretations")
      .select("id, content_key, surface, mode, status, lane, review_state, event_type, target_date, facts, source_snapshot, headline, summary, body, sections, block_type, flags, provider, judge_score, judge_gate, model, updated_at")
      .eq("provider", fallbackArchitectureV3Provider)
      .eq("status", "LIVE")
      .eq("lane", "serving")
      .order("id", { ascending: true })
      .limit(pageSize);
    if (cursorId) query = query.gt("id", cursorId);
    const { data, error } = await query.returns<GeneratedContentRow[]>();

    if (error) {
      console.warn("Fallback architecture V3 live overlay failed to load; nightly/cached/local copy remains active.", error);
      return cached?.bundle ?? await loadContentStudioLastKnownGoodCoreBundle();
    }

    rows.push(...(data ?? []));
    const lastId = data?.at(-1)?.id ?? null;
    if (!data || data.length < pageSize || !lastId) break;
    cursorId = lastId;
  }

  let currentCoreManifest: FallbackArchitectureV3PackageManifest;
  try {
    currentCoreManifest = await loadFallbackArchitectureV3BundledCoreManifest();
  } catch (error) {
    console.warn("Fallback architecture V3 current key manifest failed to load; cached/local copy remains active.", error);
    return cached?.bundle ?? null;
  }
  const bundle = packageFallbackArchitectureV3CoreRows(rows, currentCoreManifest);
  if (!bundle) {
    clearCachedFallbackArchitectureV3Bundle();
    return null;
  }
  cacheFallbackArchitectureV3Bundle(dashboardVersion || fallbackArchitectureV3DashboardVersionFromRows(rows), bundle);
  return bundle;

}

export async function loadFallbackArchitectureV3CompatibilityDashboardBundle(): Promise<FallbackArchitectureV3Bundle | null> {
  const supabase = await getSupabaseClient();
  if (!supabase) return loadContentStudioLastKnownGoodCompatibilityBundle();

  const rows: GeneratedContentRow[] = [];
  const pageSize = 1000;
  let cursorId: string | null = null;

  for (let page = 0; page < 10; page += 1) {
    let query = supabase
      .from("generated_interpretations")
      .select("id, content_key, surface, mode, status, lane, review_state, event_type, target_date, facts, source_snapshot, headline, summary, body, sections, block_type, flags, provider, judge_score, judge_gate, model, updated_at")
      .like("content_key", "authored/compat-pair/%")
      .order("id", { ascending: true })
      .limit(pageSize);
    if (cursorId) query = query.gt("id", cursorId);
    const { data, error } = await query.returns<GeneratedContentRow[]>();

    if (error) {
      console.warn("Compatibility dashboard content failed to load; nightly/bundled relationship copy remains active.", error);
      return loadContentStudioLastKnownGoodCompatibilityBundle();
    }

    rows.push(...(data ?? []));
    const lastId = data?.at(-1)?.id ?? null;
    if (!data || data.length < pageSize || !lastId) break;
    cursorId = lastId;
  }

  return packageFallbackArchitectureV3CompatibilityRows(rows);

}

export async function loadFallbackArchitectureV3SkyPlacementDashboardBundle(): Promise<FallbackArchitectureV3Bundle | null> {
  const supabase = await getSupabaseClient();
  const cached = await readCachedFallbackArchitectureV3SkyPlacementBundle();

  if (!supabase) return cached?.bundle ?? null;

  const { data: versionRows, error: versionError } = await supabase
    .from("generated_interpretations")
    .select("updated_at")
    .eq("provider", fallbackArchitectureV3SkyPlacementProvider)
    .order("updated_at", { ascending: false })
    .limit(1)
    .returns<Array<Pick<GeneratedContentRow, "updated_at">>>();

  if (versionError) {
    console.warn("Sky Placement dashboard partition version failed to load; cached/local content remains active.", versionError);
    return cached?.bundle ?? null;
  }

  const dashboardVersion = fallbackArchitectureV3DashboardVersionFromRows(versionRows ?? []);
  if (!dashboardVersion) return cached?.bundle ?? null;
  if (cached?.version === dashboardVersion) return cached.bundle;

  const rows: GeneratedContentRow[] = [];
  const pageSize = 1000;
  let cursorId: string | null = null;

  for (let page = 0; page < 10; page += 1) {
    let query = supabase
      .from("generated_interpretations")
      .select("id, content_key, surface, mode, status, lane, review_state, event_type, target_date, facts, source_snapshot, headline, summary, body, sections, block_type, flags, provider, judge_score, judge_gate, model, updated_at")
      .eq("provider", fallbackArchitectureV3SkyPlacementProvider)
      .order("id", { ascending: true })
      .limit(pageSize);
    if (cursorId) query = query.gt("id", cursorId);
    const { data, error } = await query.returns<GeneratedContentRow[]>();

    if (error) {
      console.warn("Sky Placement dashboard partition failed to load; cached/local content remains active.", error);
      return cached?.bundle ?? null;
    }

    rows.push(...(data ?? []));
    const lastId = data?.at(-1)?.id ?? null;
    if (!data || data.length < pageSize || !lastId) break;
    cursorId = lastId;
  }

  const approvedRows = rows.filter((row) => (
    isApprovedFallbackArchitectureV3Row(row, fallbackArchitectureV3SkyPlacementProvider)
    && isSkyPlacementFallbackPartitionKey(row.content_key)
    && isSkyPlacementDashboardDistributionEligible(row)
  ));
  const metadataByRow = approvedRows.map((row) => fallbackArchitectureV3RowMirrorMetadata(row, "sky-placement"));
  const metadata = metadataByRow.find((value): value is FallbackArchitectureV3MirrorMetadata => Boolean(value));

  if (
    !metadata
    || metadataByRow.some((value) => !value || !equalFallbackArchitectureV3MirrorMetadata(value, metadata))
  ) {
    clearCachedFallbackArchitectureV3SkyPlacementBundle();
    return null;
  }

  const seen = new Set<string>();
  const hookRows: HookRow[] = [];

  for (const row of approvedRows) {
    if (seen.has(row.content_key)) {
      clearCachedFallbackArchitectureV3SkyPlacementBundle();
      return null;
    }
    seen.add(row.content_key);

    const { contentType, role } = fallbackSystemBucket(row);
    if (contentType === "source-material" || role !== "fallback_hook") continue;
    const hook = packageHookRowFromRow(row);
    if (hook) hookRows.push(hook);
  }

  const candidateBundle: FallbackArchitectureV3Bundle = {
    transitLib: { authoredCards: [] },
    templatesFile: { templates: [] },
    rowsFile: { hookRows, vocabularyRows: [] }
  };
  const mirror = await fallbackArchitectureV3BundleManifestIfValid(
    candidateBundle,
    metadata,
    loadFallbackArchitectureV3BundledSkyPlacementManifest,
    { allowEditorialContentOverrides: true }
  );

  if (!mirror) {
    clearCachedFallbackArchitectureV3SkyPlacementBundle();
    return null;
  }

  const bundle = { ...candidateBundle, packageManifest: mirror };
  cacheFallbackArchitectureV3SkyPlacementBundle(dashboardVersion, bundle, mirror);
  return bundle;
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

const generatedContentSelect = "id, content_key, surface, mode, status, lane, review_state, event_type, target_date, facts, source_snapshot, headline, summary, body, sections, block_type, flags, provider, judge_score, judge_gate, model, updated_at";

type GeneratedContentReaderBoundaryRow = Pick<
  GeneratedContentRow,
  "content_key" | "event_type" | "source_snapshot" | "surface"
>;

export function isGeneratedContentReaderBoundaryAllowed(row: GeneratedContentReaderBoundaryRow) {
  const contentType = typeof row.source_snapshot?.contentType === "string"
    ? row.source_snapshot.contentType
    : "";
  const isSynastryGeneratedLane = row.surface === "synastry"
    || contentType === "synastry-kb-seed"
    || row.event_type?.startsWith("synastry-")
    || row.content_key.startsWith("synastry.")
    || row.content_key.startsWith("synastry-")
    || /^A-[^/]+_B-[^/]+_/u.test(row.content_key);
  const isSkyPlacementWorkspace = row.content_key.startsWith("sky.placement.")
    || row.event_type === "collective-placement-card"
    || row.event_type === "collective-placement-topper"
    || row.event_type === "sky-article-edition"
    || row.event_type === "sky-article-edition-revision"
    || row.event_type === "sky-article-edition-workspace";

  if (!isSynastryGeneratedLane && !isSkyPlacementWorkspace) {
    return true;
  }

  // Package-originated rows are installed through
  // loadFallbackArchitectureV3DashboardBundle and rendered by the package
  // resolver. The generic generated-content map remains available to writer,
  // judge, and owner-review tooling, but must never become a second reader
  // copy source for synastry or Sky Placement.
  return false;
}

async function loadLastKnownGoodGeneratedContentForSurfaces(
  requestedSurfaces: string[],
  targetDate?: string,
  previewMode: GeneratedContentPreviewMode = readGeneratedContentPreviewMode()
) {
  const includeSharedTransitFloor = requestedSurfaces.includes("sky");
  const surfaces = new Set([
    ...requestedSurfaces,
    "modifier",
    ...(includeSharedTransitFloor ? ["you"] : [])
  ]);
  const rows = (await loadContentStudioLastKnownGoodRows()) as GeneratedContentRow[];
  const filtered = rows.filter((row) => {
    if (!surfaces.has(row.surface)) return false;
    if (!targetDate || requestedSurfaces.includes("sky")) return true;
    return row.target_date === null || row.target_date === targetDate;
  });
  return generatedContentMapFromRows(sortGeneratedRowsNewestFirst(filtered), previewMode);
}

async function loadLastKnownGoodGeneratedContentForKeys(contentKeys: string[]) {
  const keySet = new Set(contentKeys);
  const rows = (await loadContentStudioLastKnownGoodRows()) as GeneratedContentRow[];
  return generatedContentMapFromRows(sortGeneratedRowsNewestFirst(rows.filter((row) => keySet.has(row.content_key))));
}

export async function loadLiveGeneratedContentForSurfaces(
  requestedSurfaces: string[],
  targetDate?: string,
  previewMode: GeneratedContentPreviewMode = readGeneratedContentPreviewMode()
) {
  const supabase = await getSupabaseClient();

  if (!supabase) {
    return loadLastKnownGoodGeneratedContentForSurfaces(requestedSurfaces, targetDate, previewMode);
  }

  const includeSharedTransitFloor = requestedSurfaces.includes("sky");
  const surfaces = Array.from(new Set([
    ...requestedSurfaces,
    "modifier",
    ...(includeSharedTransitFloor ? ["you"] : [])
  ]));
  const rows: GeneratedContentRow[] = [];
  const pageSize = 1000;
  let cursorId: string | null = null;

  for (let page = 0; page < 10; page += 1) {
    let query = supabase
      .from("generated_interpretations")
      .select(generatedContentSelect)
      .in("surface", surfaces)
      .eq("status", "LIVE")
      .eq("lane", "serving")
      .is("review_state", null)
      .order("id", { ascending: true })
      .limit(pageSize);

    if (cursorId) query = query.gt("id", cursorId);
    if (targetDate && !requestedSurfaces.includes("sky")) {
      query = query.or(`target_date.is.null,target_date.eq.${targetDate}`);
    }

    const { data, error } = await query.returns<GeneratedContentRow[]>();

    if (error) {
      console.warn("Live generated content failed to load; using the nightly reader-safe snapshot.", error);
      return loadLastKnownGoodGeneratedContentForSurfaces(requestedSurfaces, targetDate, previewMode);
    }

    rows.push(...(data ?? []));
    const lastId = data?.at(-1)?.id ?? null;
    if (!data || data.length < pageSize || !lastId) break;
    cursorId = lastId;
  }

  return generatedContentMapFromRows(sortGeneratedRowsNewestFirst(rows), previewMode);
}

export async function loadLiveGeneratedContentForKeys(contentKeys: string[]) {
  const keys = Array.from(new Set(contentKeys.map((key) => key.trim()).filter(Boolean)));

  if (keys.length === 0) {
    return new Map<string, LiveGeneratedContent>();
  }

  const supabase = await getSupabaseClient();

  if (!supabase) {
    return loadLastKnownGoodGeneratedContentForKeys(keys);
  }

  const rows: GeneratedContentRow[] = [];
  const batchSize = 50;

  for (let index = 0; index < keys.length; index += batchSize) {
    const batch = keys.slice(index, index + batchSize);
    const { data, error } = await supabase
      .from("generated_interpretations")
      .select(generatedContentSelect)
      .in("content_key", batch)
      .eq("status", "LIVE")
      .eq("lane", "serving")
      .is("review_state", null)
      .order("updated_at", { ascending: false })
      .returns<GeneratedContentRow[]>();

    if (error) {
      console.warn("Targeted generated content failed to load; using the nightly reader-safe snapshot.", error);
      return loadLastKnownGoodGeneratedContentForKeys(keys);
    }

    rows.push(...(data ?? []));
  }

  return generatedContentMapFromRows(rows);
}

function generatedContentMapFromRows(
  rows: GeneratedContentRow[],
  previewMode: GeneratedContentPreviewMode = readGeneratedContentPreviewMode()
) {
  const byKey = new Map<string, LiveGeneratedContent>();

  for (const row of rows) {
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

export function isReaderServableGeneratedContentRow(
  row: Pick<GeneratedContentRow, "content_key" | "facts" | "flags" | "provider" | "source_snapshot"> & {
    status?: string | null;
    lane?: string | null;
    review_state?: string | null;
    headline?: string | null;
    summary?: string | null;
    body?: string | null;
    sections?: unknown;
  }
) {
  const normalizedContentKey = row.content_key.trim().toLowerCase();
  if (normalizedContentKey.startsWith("sky/article-template/") || normalizedContentKey.startsWith("sky-article-template/")) {
    return false;
  }
  const sections = isRecord(row.sections) ? row.sections : null;
  const skyArticleEdition = skyArticleEditionRecord(sections?.skyArticleEdition);
  if (skyArticleEdition) {
    if (row.status !== "LIVE" || row.lane !== "serving" || row.review_state) return false;
    if (row.content_key !== skyArticleEdition.contentKey) return false;
    if (!hasExactSkyArticleOwnerApproval(skyArticleEdition, row.source_snapshot)) return false;
  }
  const facts = row.facts && typeof row.facts === "object" ? row.facts : {};
  const store = facts.tldrStore && typeof facts.tldrStore === "object"
    ? facts.tldrStore as Record<string, unknown>
    : null;
  const metadataText = [
    row.content_key,
    row.provider,
    JSON.stringify(row.source_snapshot ?? {}),
    JSON.stringify(facts ?? {}),
    ...(Array.isArray(row.flags) ? row.flags : [])
  ].join(" ").toLowerCase();
  const copyValues = [
    row.summary,
    row.body,
    ...generatedRowSectionCopyValues(row.sections)
  ];
  const unsafeMetadataMarkers = [
    "legacy",
    "unsafe",
    "directional",
    "editorial-only",
    "editorial_only",
    "superseded",
    "local-normalized-dashboard-source",
    "revoice-pending",
    "revoice_pending",
    "reference-only",
    "raw_quarantine"
  ];
  const { role: packageRole, reviewStatus: packageReviewStatus } = generatedRowPackageRole(row);
  const blockedPackageRoles = new Set(["fallback_source", "source_material"]);
  const approvedPackageReviews = new Set(["approved", "approved_reuse", "reviewed"]);

  if (row.content_key.startsWith("cc/fallback")) return false;
  if (blockedPackageRoles.has(packageRole)) return false;
  if (packageReviewStatus && !approvedPackageReviews.has(packageReviewStatus)) return false;
  if (unsafeMetadataMarkers.some((marker) => metadataText.includes(marker))) return false;
  if (copyValues.some((value) => value && !isReaderFacingCopy(value))) return false;

  if (!store) {
    return true;
  }

  const flags = new Set([
    ...(Array.isArray(row.flags) ? row.flags : []),
    ...(Array.isArray(store.flags) ? store.flags.map(String) : [])
  ]);
  const lane = row.lane === undefined
    ? (typeof store.lane === "string" ? store.lane : null)
    : row.lane;
  const review = row.review_state === undefined
    ? (typeof store.review === "string" ? store.review : null)
    : row.review_state;
  const sourceStatus = typeof store.sourceStatus === "string" ? store.sourceStatus : null;

  if (row.status && row.status !== "LIVE") return false;
  if (lane && lane !== "serving") return false;
  if (review) return false;
  if (sourceStatus && ["REFERENCE_ONLY", "RAW_QUARANTINE", "MANUAL_ONLY", "DEPRECATED"].includes(sourceStatus)) return false;
  if (isLegacyLiveWritingRow(row)) return false;
  if (flags.has("REFERENCE_ONLY_NEVER_SERVE_VERBATIM")) return false;
  if (flags.has("PARAPHRASE_PENDING")) return false;
  if (flags.has("BLOCKLIST_MATCH")) return false;

  return true;
}
