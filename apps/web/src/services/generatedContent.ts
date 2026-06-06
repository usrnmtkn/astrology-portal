import { supabase } from "./auth";

export type GeneratedContentMode = "feed" | "in_depth" | "article";

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
  updatedAt: string;
};

type GeneratedContentRow = {
  id: string;
  content_key: string;
  surface: string;
  mode: GeneratedContentMode;
  event_type: string | null;
  target_date: string | null;
  headline: string | null;
  summary: string | null;
  body: string;
  sections: unknown | null;
  updated_at: string;
};

export type GeneratedContentSection = {
  heading: string;
  body: string;
};

function fromRow(row: GeneratedContentRow): LiveGeneratedContent {
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
    updatedAt: row.updated_at
  };
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

export async function loadLiveGeneratedContent(surface: string, targetDate?: string) {
  if (!supabase) {
    return new Map<string, LiveGeneratedContent>();
  }

  let query = supabase
    .from("generated_interpretations")
    .select("id, content_key, surface, mode, event_type, target_date, headline, summary, body, sections, updated_at")
    .eq("surface", surface)
    .eq("status", "LIVE")
    .order("updated_at", { ascending: false });

  if (targetDate) {
    query = query.or(`target_date.is.null,target_date.eq.${targetDate}`);
  }

  const { data, error } = await query.returns<GeneratedContentRow[]>();

  if (error) {
    console.warn("Live generated content failed to load; using local knowledge fallback.", error);
    return new Map<string, LiveGeneratedContent>();
  }

  const byKey = new Map<string, LiveGeneratedContent>();

  for (const row of data ?? []) {
    if (!byKey.has(row.content_key)) {
      byKey.set(row.content_key, fromRow(row));
    }
  }

  return byKey;
}
