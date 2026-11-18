import type {GeneratedContentRow,LiveGeneratedContent,GeneratedContentSection} from './generatedContent.js';
import {hasStudioOwnerWording} from '../content/studioOwnerWording.mjs';
// @ts-ignore Exact owner-requested source versions, shared with package materialization.
import {correctedReaderSummary} from '../content/fallbackArchitectureV3/readerSummaryReferenceCorrections.mjs';
import {publicationAllowsContent,type ContentPublication} from '../content/contentPublicationState.js';
import {isGeneratedContentReaderBoundaryAllowed,isReaderServableGeneratedContentRow} from '../content/generatedContentEligibility.js';
import {hasMissingTemplateSlots,hasTemplateSlots,interpolateTemplateString,type TemplateSlotValues} from './templateInterpolation.js';
import {isReaderFacingCopy} from '../content/readerSafety.js';
import {noProseSourceFiles,servedFieldInstructionMarkers,servedFieldInternalBlacklist,servedFieldLabels,servedFieldsContract,type ServedFieldSurface} from '../content/servedFieldsContract.js';

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

    if (!body || !hasStudioOwnerWording(content) && (!isReaderFacingCopy(body) || containsBlockedScaffoldCopy(body))) {
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

export function isReaderServableGeneratedContent(content: LiveGeneratedContent) {
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

  if (!hasStudioOwnerWording(content) && containsInstructionMarker(visibleText)) {
    return false;
  }

  if (content.blockType === "fallback_template" && containsSingleBraceSlot(visibleText)) {
    return false;
  }

  return true;
}

export function fromRow(
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
  slots?: TemplateSlotValues,
  publications?: ReadonlyMap<string, ContentPublication>
): LiveGeneratedContent | null {
  if (!content || !publicationAllowsContent(content.contentKey, content.id, content.updatedAt, content.targetDate, publications)) {
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

/** Render an already admitted reader row against its explicit ledger snapshot. */
export function renderAdmittedGeneratedContentRow(row: GeneratedContentRow, slots: TemplateSlotValues, publications: ReadonlyMap<string, ContentPublication>) {
  if (!isGeneratedContentReaderBoundaryAllowed(row) || !isReaderServableGeneratedContentRow(row)) return null;
  const content=fromRow(row);
  return isReaderServableGeneratedContent(content) ? renderGeneratedContentTemplate(content,slots,publications) : null;
}

export function generatedContentParagraphs(content?: LiveGeneratedContent | null) {
  if (content && isNoProseGeneratedContent(content)) {
    return [];
  }

  const servedSections = content ? servedFieldSections(content) : [];

  if (servedSections.length > 0) {
    return readerUniqueParagraphs(servedSections.map((section) => section.body), hasStudioOwnerWording(content));
  }

  if (!content?.body) {
    return [];
  }

  return readerUniqueParagraphs(content.body
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim()), hasStudioOwnerWording(content));
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

function readerUniqueParagraphs(values: string[], ownerWording = false) {
  const seen = new Set<string>();

  return values.filter((value) => {
    const paragraph = value.trim();
    const normalized = paragraph.replace(/\s+/g, " ").toLowerCase();

    if (
      !paragraph
      || !ownerWording && seen.has(normalized)
      || !ownerWording && (!isReaderFacingCopy(paragraph)
      || containsBlockedScaffoldCopy(paragraph)
      || containsInstructionMarker(paragraph))
    ) {
      return false;
    }

    seen.add(normalized);
    return true;
  });
}

function normalizeSection(value: unknown, ownerWording = false): GeneratedContentSection | null {
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

  if (!ownerWording && (!isReaderFacingCopy(body) || containsBlockedScaffoldCopy(body))) {
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
    return sections.map(value => normalizeSection(value, hasStudioOwnerWording(content))).filter((section): section is GeneratedContentSection => Boolean(section));
  }

  if (sections && typeof sections === "object") {
    const record = sections as Record<string, unknown>;
    const nestedSections = record.sections;

    if (Array.isArray(nestedSections)) {
      return nestedSections.map(value => normalizeSection(value, hasStudioOwnerWording(content))).filter((section): section is GeneratedContentSection => Boolean(section));
    }
  }

  return [];
}
