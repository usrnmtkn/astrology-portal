import packageMeta from "../../content/fallbackArchitectureV3/authored-inputs/sky-v4-placement-lunar-context-v1.json";
import sunRows from "../../content/fallbackArchitectureV3/authored-inputs/sky-v4-placement-lunar-context-sun-v1.json";
import mercuryRows from "../../content/fallbackArchitectureV3/authored-inputs/sky-v4-placement-lunar-context-mercury-v1.json";
import venusRows from "../../content/fallbackArchitectureV3/authored-inputs/sky-v4-placement-lunar-context-venus-v1.json";
import marsRows from "../../content/fallbackArchitectureV3/authored-inputs/sky-v4-placement-lunar-context-mars-v1.json";
import jupiterRows from "../../content/fallbackArchitectureV3/authored-inputs/sky-v4-placement-lunar-context-jupiter-v1.json";
import saturnRows from "../../content/fallbackArchitectureV3/authored-inputs/sky-v4-placement-lunar-context-saturn-v1.json";
import uranusRows from "../../content/fallbackArchitectureV3/authored-inputs/sky-v4-placement-lunar-context-uranus-v1.json";
import neptuneRows from "../../content/fallbackArchitectureV3/authored-inputs/sky-v4-placement-lunar-context-neptune-v1.json";
import plutoRows from "../../content/fallbackArchitectureV3/authored-inputs/sky-v4-placement-lunar-context-pluto-v1.json";
import chironRows from "../../content/fallbackArchitectureV3/authored-inputs/sky-v4-placement-lunar-context-chiron-v1.json";

export type SkyV4PlacementLunarEventType = "new-moon" | "full-moon" | "solar-eclipse" | "lunar-eclipse";
type LunarRow = {
  ContentKey: string; Planet: string; EventType: SkyV4PlacementLunarEventType; EventLabel: string;
  FullPageBody: string; FallbackBody: string;
  ReviewStatus: string; OwnerApproved: boolean; ServingEnabled: boolean;
};
type LunarMeta = {
  schema: string; review_status: string; owner_approved: boolean; serving_enabled: boolean;
  approval_id: string; expected_records: number; record_files: string[];
};
type PlacementContext = { contextKind?: unknown; contextBodyOrEvent?: unknown; contextSign?: unknown };
type RenderedPlacement = Record<string, unknown> & { page?: string; readerParts?: string[]; resolution?: string; selectedFallbackOverlayKeys?: string[] };
const rowFiles = [sunRows, mercuryRows, venusRows, marsRows, jupiterRows, saturnRows, uranusRows, neptuneRows, plutoRows, chironRows] as Array<{ planet: string; records: LunarRow[] }>;
const signs = ["aries", "taurus", "gemini", "cancer", "leo", "virgo", "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"] as const;

function record(value: unknown): Record<string, unknown> { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function slug(value: unknown) { return String(value ?? "").trim().toLowerCase().replace(/[\s_]+/gu, "-"); }
function title(value: string) { return value.replace(/-/gu, " ").replace(/\b\w/gu, (letter) => letter.toUpperCase()); }
function oppositeSign(value: string) { const index = signs.indexOf(slug(value) as typeof signs[number]); return index < 0 ? "" : title(signs[(index + 6) % 12]); }
function fillTokens(value: string, facts: Record<string, string>) { return value.replace(/\{\{\s*([A-Za-z][A-Za-z0-9_.-]*)\s*\}\}/gu, (match, key: string) => Object.prototype.hasOwnProperty.call(facts, key) ? facts[key] : match); }
function selectedEvent(input: Record<string, unknown>) {
  const contexts = Array.isArray(input.contexts) ? input.contexts as PlacementContext[] : [];
  const context = contexts.find((candidate) => slug(candidate.contextKind) === "placement-lunar-event");
  if (!context) return null;
  const eventType = slug(context.contextBodyOrEvent) as SkyV4PlacementLunarEventType;
  if (!["new-moon", "full-moon", "solar-eclipse", "lunar-eclipse"].includes(eventType)) return null;
  const eventSign = title(slug(context.contextSign));
  return eventSign ? { eventType, eventSign, oppositeSign: oppositeSign(eventSign) } : null;
}
function releasedModule(planet: string, eventType: SkyV4PlacementLunarEventType) {
  const meta = packageMeta as LunarMeta;
  const rows = rowFiles.flatMap((file) => file.records);
  if (meta.schema !== "tldrastro-sky-v4-placement-lunar-context/v1"
    || meta.serving_enabled !== true || meta.owner_approved !== true || meta.review_status !== "approved"
    || meta.expected_records !== 40 || meta.record_files.length !== 10 || rows.length !== 40) return null;
  const row = rows.find((candidate) => slug(candidate.Planet) === slug(planet) && candidate.EventType === eventType);
  return row && row.ReviewStatus === "approved" && row.OwnerApproved === true && row.ServingEnabled === true ? row : null;
}
function continuousArticle(corpus: unknown, planet: string, sign: string) {
  const content = record(record(corpus).content); const continuous = Array.isArray(content.continuous) ? content.continuous : [];
  const key = `sky-placement/article/${slug(planet)}/${slug(sign)}`;
  return continuous.map(record).find((row) => row.contentKey === key) ?? null;
}
function contextualOverlay(corpus: unknown, key: string) {
  const content = record(record(corpus).content); const overlays = Array.isArray(content.contextualTransitOverlays) ? content.contextualTransitOverlays : [];
  return overlays.map(record).find((row) => row.OverlayKey === key) ?? null;
}
function filled(value: unknown, facts: Record<string, string>) { return fillTokens(String(value ?? ""), facts).trim(); }
function replaceFirst(source: string, before: string, after: string) { const index = source.indexOf(before); return index < 0 ? source : `${source.slice(0, index)}${after}${source.slice(index + before.length)}`; }
function replaceReaderPart(parts: string[], before: string, after: string, insertAfter?: string) {
  const index = parts.findIndex((part) => part === before); if (index < 0) return parts;
  if (insertAfter) return [...parts.slice(0, index + 1), insertAfter, ...parts.slice(index + 1)];
  return parts.map((part, partIndex) => partIndex === index ? after : part);
}

export function applySkyV4PlacementLunarContext(rendered: unknown, input: Record<string, unknown>, corpus: unknown) {
  const result = record(rendered) as RenderedPlacement;
  if (slug(input.route) !== "placement") return result;
  const event = selectedEvent(input); if (!event) return result;
  const module = releasedModule(String(input.planet ?? ""), event.eventType); if (!module) return result;
  const facts = { ...Object.fromEntries(Object.entries(record(input.facts)).map(([key, value]) => [key, String(value ?? "")])), eventSign: event.eventSign, oppositeSign: event.oppositeSign };
  const article = continuousArticle(corpus, String(input.planet ?? ""), String(input.sign ?? "")); if (!article) return result;
  const readerParts = Array.isArray(result.readerParts) ? [...result.readerParts] : []; const page = String(result.page ?? "");
  if (result.resolution === "exact-fallback") {
    const fallback = record(article.fallback);
    const fallbackOverlayKey = Array.isArray(result.selectedFallbackOverlayKeys) ? result.selectedFallbackOverlayKeys[0] : undefined;
    const overlay = fallbackOverlayKey ? contextualOverlay(corpus, fallbackOverlayKey) : null;
    const oldBase = [filled(fallback.hook, facts), filled(overlay?.FallbackHookOverlay, facts), filled(fallback.lived, facts), filled(fallback.turn, facts)].filter(Boolean).join("\n\n");
    const nextBase = [filled(fallback.hook, facts), filled(module.FallbackBody, facts), filled(overlay?.FallbackHookOverlay, facts), filled(fallback.lived, facts), filled(fallback.turn, facts)].filter(Boolean).join("\n\n");
    return { ...result, page: oldBase ? replaceFirst(page, oldBase, nextBase) : page, readerParts: oldBase ? replaceReaderPart(readerParts, oldBase, nextBase) : readerParts, placementLunarContextKey: module.ContentKey };
  }
  if (result.resolution !== "canonical-article") return result;
  const baseBody = filled(article.placementArticle, facts); const lunarBody = filled(module.FullPageBody, facts); if (!baseBody || !lunarBody) return result;
  return { ...result, page: replaceFirst(page, baseBody, `${baseBody}\n\n## What changes today\n\n${lunarBody}`), readerParts: replaceReaderPart(readerParts, baseBody, baseBody, lunarBody), placementLunarContextKey: module.ContentKey };
}

export function skyV4PlacementLunarContextReleaseState() {
  const meta = packageMeta as LunarMeta;
  return {
    schema: meta.schema,
    expectedRecords: meta.expected_records,
    recordCount: rowFiles.flatMap((file) => file.records).length,
    ownerApproved: meta.owner_approved === true,
    servingEnabled: meta.serving_enabled === true,
    reviewStatus: meta.review_status,
    approvalId: meta.approval_id
  };
}

export function skyV4PlacementLunarContextStudioRecords() {
  const meta = packageMeta as LunarMeta;
  return rowFiles.flatMap((file) => file.records).map((row) => ({
    ...row,
    contentKey: row.ContentKey,
    headline: `${row.EventLabel}: ${row.Planet}`,
    body_you: row.FullPageBody,
    summary: row.FallbackBody,
    surface: "sky",
    content_role: "full_copy",
    review_status: row.ReviewStatus,
    studio_content_type: "placement-lunar-context",
    studio_editable_fields: [
      { path: "FullPageBody", label: "Full-page placement context" },
      { path: "FallbackBody", label: "Fallback event context" }
    ],
    studio_read_only_fields: ["ContentKey", "Planet", "EventType", "EventLabel"],
    studio_version_status: row.ServingEnabled ? "approved-serving-baseline" : "draft",
    studio_review_category: "owner-approved-reader-copy",
    owner_approved: row.OwnerApproved,
    serving_enabled: row.ServingEnabled,
    owner_approved_fields: ["FullPageBody", "FallbackBody"],
    owner_approval_id: meta.approval_id,
    approved_via: "owner approval in conversation on 2026-09-01"
  }));
}
