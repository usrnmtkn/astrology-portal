import { getSupabaseClient } from "./auth";
import {
  interpolateTemplateString,
  type TemplateInterpolationContext
} from "../content/templateInterpolation";
import { generatedContentAliases } from "./generatedContentKeys";

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
  event_type: string | null;
  target_date: string | null;
  facts?: Record<string, unknown> | null;
  source_snapshot?: Record<string, unknown> | null;
  headline: string | null;
  summary: string | null;
  body: string;
  sections: unknown | null;
  block_type?: GeneratedContentBlockType | null;
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

export type GeneratedContentTemplateContexts =
  | Map<string, TemplateInterpolationContext>
  | Record<string, TemplateInterpolationContext>;

function primitiveContext(record: Record<string, unknown> | null | undefined): TemplateInterpolationContext {
  if (!record) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(record).filter((entry): entry is [string, string | number | null | undefined] => {
      const value = entry[1];

      return typeof value === "string" || typeof value === "number" || value === null || value === undefined;
    })
  );
}

function explicitTemplateContext(
  row: GeneratedContentRow,
  templateContexts?: GeneratedContentTemplateContexts
): TemplateInterpolationContext {
  if (!templateContexts) {
    return {};
  }

  if (templateContexts instanceof Map) {
    return templateContexts.get(row.content_key) ?? {};
  }

  return templateContexts[row.content_key] ?? {};
}

function templateContextFromRow(
  row: GeneratedContentRow,
  templateContexts?: GeneratedContentTemplateContexts
): TemplateInterpolationContext {
  const sourceContext = row.source_snapshot?.context;

  return {
    ...primitiveContext(row.facts),
    ...primitiveContext(sourceContext && typeof sourceContext === "object" && !Array.isArray(sourceContext)
      ? sourceContext as Record<string, unknown>
      : null),
    ...explicitTemplateContext(row, templateContexts)
  };
}

function isTemplateRow(row: GeneratedContentRow) {
  return row.source_snapshot?.contentType === "template";
}

function fromRow(
  row: GeneratedContentRow,
  templateContexts?: GeneratedContentTemplateContexts
): LiveGeneratedContent {
  const templateContext = isTemplateRow(row) ? templateContextFromRow(row, templateContexts) : null;
  const headline = templateContext
    ? interpolateTemplateString(row.headline, templateContext, { contentId: row.content_key, fieldName: "headline" }) || null
    : row.headline;
  const summary = templateContext
    ? interpolateTemplateString(row.summary, templateContext, { contentId: row.content_key, fieldName: "summary" }) || null
    : row.summary;
  const body = templateContext
    ? interpolateTemplateString(row.body, templateContext, { contentId: row.content_key, fieldName: "body" })
    : row.body;

  return {
    id: row.id,
    contentKey: row.content_key,
    surface: row.surface,
    mode: row.mode,
    eventType: row.event_type,
    targetDate: row.target_date,
    headline,
    summary,
    body,
    sections: row.sections ?? {},
    blockType: row.block_type ?? null,
    sourceSnapshot: row.source_snapshot ?? null,
    model: row.model,
    updatedAt: row.updated_at
  };
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
    .filter(Boolean);
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

  return { heading, body };
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
  targetDate?: string,
  templateContexts?: GeneratedContentTemplateContexts
) {
  const supabase = await getSupabaseClient();

  if (!supabase) {
    return new Map<string, LiveGeneratedContent>();
  }

  let query = supabase
    .from("generated_interpretations")
    .select("id, content_key, surface, mode, event_type, target_date, facts, source_snapshot, headline, summary, body, sections, block_type, model, updated_at")
    .eq("surface", surface)
    .eq("status", "LIVE")
    .order("updated_at", { ascending: false });

  if (targetDate && surface !== "sky") {
    query = query.or(`target_date.is.null,target_date.eq.${targetDate}`);
  }

  const { data, error } = await query.returns<GeneratedContentRow[]>();

  if (error) {
    console.warn("Live generated content failed to load; unpublished content will remain hidden.", error);
    return new Map<string, LiveGeneratedContent>();
  }

  const byKey = new Map<string, LiveGeneratedContent>();

  for (const row of data ?? []) {
    const content = fromRow(row, templateContexts);

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
