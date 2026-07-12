import { getSupabaseClient } from "./auth";
import {
  hasMissingTemplateSlots,
  hasTemplateSlots,
  interpolateTemplateString,
  type TemplateSlotValues
} from "./templateInterpolation";
import { generatedContentAliases } from "./generatedContentKeys";
import { isReaderFacingCopy } from "../content/readerSafety";

export type GeneratedContentMode = "feed" | "in_depth" | "article";
export type GeneratedContentBlockType =
  | "sign"
  | "house"
  | "ruler"
  | "natal_aspect"
  | "sky_aspect"
  | "transit_to_natal_aspect"
  | "synastry_aspect"
  | "composite_aspect"
  | "synthesis"
  | "essay";

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
  model: string | null;
  updatedAt: string;
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
  model: string | null;
  updated_at: string;
};

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

  return contentType === "template" || contentType === "synastry-kb-seed";
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

  if (
    content.sourceSnapshot?.contentType === "template"
    && hasMissingGeneratedContentTemplateSlots(content, slots)
  ) {
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

  if (content.sourceSnapshot?.contentType === "template") {
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

export function generatedContentParagraphs(content?: LiveGeneratedContent | null) {
  if (!content?.body) {
    return [];
  }

  return content.body
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .map(repairGeneratedParagraph)
    .filter((paragraph) => paragraph && isReaderFacingCopy(paragraph) && !containsBlockedScaffoldCopy(paragraph));
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

function repairGeneratedParagraph(text: string) {
  return text
    .replace(/\bmake it all about they\b/gi, "make it all about themselves")
    .replace(/\babout they\b/gi, "about themselves")
    .replace(/\bgiving they\b/gi, "giving them")
    .replace(/\brewards they\b/gi, "rewards them")
    .replace(/\bIt rewards they\b/gi, "It rewards them");
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

  const repairedBody = repairGeneratedParagraph(body);

  if (!isReaderFacingCopy(repairedBody) || containsBlockedScaffoldCopy(repairedBody)) {
    return null;
  }

  return { heading, body: repairedBody };
}

export function generatedContentSections(content?: LiveGeneratedContent | null): GeneratedContentSection[] {
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

export async function loadLiveGeneratedContentForSurfaces(
  requestedSurfaces: string[],
  targetDate?: string
) {
  const supabase = await getSupabaseClient();

  if (!supabase) {
    return new Map<string, LiveGeneratedContent>();
  }

  const surfaces = Array.from(new Set([...requestedSurfaces, "modifier"]));
  let query = supabase
    .from("generated_interpretations")
    .select("id, content_key, surface, mode, status, lane, review_state, event_type, target_date, facts, source_snapshot, headline, summary, body, sections, block_type, flags, provider, model, updated_at")
    .in("surface", surfaces)
    .eq("status", "LIVE")
    .eq("lane", "serving")
    .is("review_state", null)
    .order("updated_at", { ascending: false });

  if (targetDate && !requestedSurfaces.includes("sky")) {
    query = query.or(`target_date.is.null,target_date.eq.${targetDate}`);
  }

  const { data, error } = await query.returns<GeneratedContentRow[]>();

  if (error) {
    console.warn("Live generated content failed to load; unpublished content will remain hidden.", error);
    return new Map<string, LiveGeneratedContent>();
  }

  const byKey = new Map<string, LiveGeneratedContent>();

  for (const row of data ?? []) {
    if (!isReaderServableGeneratedContentRow(row)) {
      continue;
    }

    const content = fromRow(row);

    if (!byKey.has(row.content_key)) {
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
  row: Pick<GeneratedContentRow, "facts" | "flags"> & { status?: string | null; lane?: string | null; review_state?: string | null }
) {
  const facts = row.facts && typeof row.facts === "object" ? row.facts : {};
  const store = facts.tldrStore && typeof facts.tldrStore === "object"
    ? facts.tldrStore as Record<string, unknown>
    : null;

  if (!store) {
    return true;
  }

  const flags = new Set([
    ...(Array.isArray(row.flags) ? row.flags : []),
    ...(Array.isArray(store.flags) ? store.flags.map(String) : [])
  ]);
  const lane = row.lane ?? (typeof store.lane === "string" ? store.lane : null);
  const review = row.review_state ?? (typeof store.review === "string" ? store.review : null);
  const sourceStatus = typeof store.sourceStatus === "string" ? store.sourceStatus : null;

  if (row.status && row.status !== "LIVE") return false;
  if (lane && lane !== "serving") return false;
  if (review) return false;
  if (sourceStatus && ["REFERENCE_ONLY", "RAW_QUARANTINE", "MANUAL_ONLY", "DEPRECATED"].includes(sourceStatus)) return false;
  if (flags.has("REFERENCE_ONLY_NEVER_SERVE_VERBATIM")) return false;
  if (flags.has("PARAPHRASE_PENDING")) return false;
  if (flags.has("BLOCKLIST_MATCH")) return false;

  return true;
}
