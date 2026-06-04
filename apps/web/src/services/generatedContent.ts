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
  sections: Record<string, unknown>;
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
  sections: Record<string, unknown> | null;
  updated_at: string;
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
