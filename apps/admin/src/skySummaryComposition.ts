import { moonSummaryKey, moonEventNames, type MoonSummaryKind } from "../../web/src/content/skyMoonSummary";
import { importedSkySummary } from "./skySummaryImportedCopy";
import { skyDailySummaryParts } from "../../web/src/content/skyDailySummary";
import { skyDailySummaryFields, skySummaryTemplateErrors, currentSkySummaryWording } from "../../web/src/content/skyDailySummaryCatalog";
import { isGeneratedContentReaderBoundaryAllowed, isReaderServableGeneratedContentRow } from "../../web/src/content/generatedContentEligibility";
import type { LiveGeneratedContent } from "../../web/src/services/generatedContent";

export type SummaryCompositionRow = {
  id?: string; updated_at?: string | null;
  content_key: string; body?: string | null; status: string; lane?: string | null;
  summary?: string | null;
  review_state?: string | null; inventory_only?: boolean; source_snapshot?: Record<string, unknown> | null;
};
export type SummaryCompositionDraft = { contentKey: string; body: string };

export function publishedSkySummaryContent(rows: SummaryCompositionRow[]) {
  return new Map<string, LiveGeneratedContent>(rows.filter(row => !row.inventory_only && row.status === "LIVE" && row.lane === "serving" && !row.review_state
    && isGeneratedContentReaderBoundaryAllowed(row) && isReaderServableGeneratedContentRow(row)
    && !skySummaryTemplateErrors(row.content_key, row.body ?? "").length).map(row => [row.content_key, {
      id: row.id ?? row.content_key, contentKey: row.content_key, surface: "sky", mode: "feed", eventType: null,
      targetDate: null, headline: null, summary: row.summary ?? null, body: currentSkySummaryWording(row.content_key, row.body ?? ""), sections: null, model: null,
      updatedAt: row.updated_at ?? "", status: "LIVE"
    }]));
}

export function buildSkySummaryComposition(sun: string, moon: string, rows: SummaryCompositionRow[], working: boolean, draft?: SummaryCompositionDraft | null, moonKind: MoonSummaryKind = "regular") {
  const content = publishedSkySummaryContent(rows);
  const errors: string[] = [];
  const sources = (["sun", "moon"] as const).map((body, index) => {
    const sign = index === 0 ? sun : moon;
    const key = body === "moon" ? moonSummaryKey(sign, moonKind) : `cms/sky-daily-summary/${body}/${sign.toLowerCase()}`;
    const field = skyDailySummaryFields.find(field => field.key === key)!;
    const saved = rows.find(row => row.content_key === key);
    const editor = working && draft?.contentKey === key ? draft : undefined;
    const readerReady = saved && saved.status === "LIVE" && saved.lane === "serving" && !saved.review_state
      && isGeneratedContentReaderBoundaryAllowed(saved) && isReaderServableGeneratedContentRow(saved);
    const useSaved = saved && !saved.inventory_only && (working
      ? ["DRAFT", "REVIEWED", "LIVE"].includes(saved.status) && saved.lane === "serving"
      : readerReady);
    const imported = working ? field.body || importedSkySummary(key) : undefined;
    const copy = editor?.body ?? (useSaved ? saved.body : imported);
    const validation = copy ? skySummaryTemplateErrors(key, copy) : [];
    if (saved?.inventory_only) errors.push(`${field.label}: saved wording is still loading.`);
    errors.push(...validation.map(error => `${field.label}: ${error}`));
    if (copy?.trim() && !validation.length) {
      // This map is private to the editorial preview. Drafts are never passed to the reader.
      content.set(key, { id: saved?.id ?? key, contentKey: key, surface: "sky", mode: "feed", eventType: null,
        targetDate: null, headline: null, summary: null, body: copy, sections: null, model: null, updatedAt: saved?.updated_at ?? "", status: "LIVE" });
    }
    return { body, field, copy: copy?.trim() || field.body, status: editor ? "Open editor copy"
      : useSaved ? saved.status === "LIVE" ? readerReady ? "Published copy" : "Held copy (preview only)" : `Saved ${saved.status.toLowerCase()}`
      : imported !== undefined ? "Supplied working copy" : field.body ? "Current app copy" : "No summary; placement only",
      statusRow: useSaved ? saved : { id: `builtin:${key}` },
      unsaved: Boolean(editor && editor.body !== (useSaved ? saved.body : field.body)) || !useSaved && Boolean(copy && copy !== field.body),
      emptyWorkingCopy: copy !== undefined && !copy?.trim() };
  });
  const parts = skyDailySummaryParts({ sun: { sign: sun }, moon: { sign: moon }, moonIsVoid: false, event: moonKind === "regular" ? undefined : { name: moonEventNames[moonKind], sign: moon, isToday: true, countdown: "today", eclipseType: moonKind === "solarEclipse" ? "solar" : moonKind === "lunarEclipse" ? "lunar" : undefined } }, content, { editorialPreview: working });
  return { parts, sources, errors, joined: sources.every(source => Boolean(source.copy)) };
}
