import lunarManifest from "../../content/fallbackArchitectureV3/authored-inputs/sky-v4-placement-lunar-context-v1.json";
import lunarChunk1 from "../../content/fallbackArchitectureV3/authored-inputs/sky-v4-placement-lunar-context-v1-chunk-1.json";
import lunarChunk2 from "../../content/fallbackArchitectureV3/authored-inputs/sky-v4-placement-lunar-context-v1-chunk-2.json";

export type SkyV4PlacementLunarEventType = "new-moon" | "full-moon" | "solar-eclipse" | "lunar-eclipse";
type PlacementLunarContextRecord = { ContentKey: string; Planet: string; EventType: SkyV4PlacementLunarEventType; EventLabel: string; FullPageBody: string; FallbackBody: string };
type PlacementLunarContextManifest = { schema: string; review_status: string; owner_approved: boolean; serving_enabled: boolean; expected_records: number; approval_id: string; release_id: string };
type PlacementLunarContextChunk = { schema: string; chunk: number; record_count: number; records: PlacementLunarContextRecord[] };
type PlacementLunarContextPackage = PlacementLunarContextManifest & { records: PlacementLunarContextRecord[] };
type PlacementContext = { contextKind?: unknown; contextBodyOrEvent?: unknown; contextSign?: unknown };
type RenderedSkyV4Placement = Record<string, unknown> & { page?: string; readerParts?: string[]; resolution?: string; selectedFallbackOverlayKeys?: string[] };

const signs = ["aries", "taurus", "gemini", "cancer", "leo", "virgo", "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"] as const;
const planets = ["sun", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto", "chiron"] as const;
const eventTypes: SkyV4PlacementLunarEventType[] = ["new-moon", "full-moon", "solar-eclipse", "lunar-eclipse"];
const bundledChunks = [lunarChunk1, lunarChunk2] as PlacementLunarContextChunk[];

function record(value: unknown): Record<string, unknown> { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function bundledSource(): PlacementLunarContextPackage { return { ...(lunarManifest as PlacementLunarContextManifest), records: bundledChunks.flatMap((chunk) => chunk.records) }; }
function normalized(value: unknown) { return String(value ?? "").trim().toLowerCase().replace(/[\s_]+/gu, "-"); }
function title(value: string) { return value.replace(/-/gu, " ").replace(/\b\w/gu, (letter) => letter.toUpperCase()); }
function oppositeSign(value: string) { const index = signs.indexOf(normalized(value) as typeof signs[number]); return index < 0 ? "" : title(signs[(index + 6) % 12]); }
function fillTokens(value: string, facts: Record<string, string>) { return value.replace(/\{\{\s*([A-Za-z][A-Za-z0-9_.-]*)\s*\}\}/gu, (match, key: string) => Object.hasOwn(facts, key) ? facts[key] : match); }

function selectedEvent(input: Record<string, unknown>) {
  const contexts = Array.isArray(input.contexts) ? input.contexts as PlacementContext[] : [];
  const context = contexts.find((candidate) => normalized(candidate.contextKind) === "placement-lunar-event");
  if (!context) return null;
  const eventType = normalized(context.contextBodyOrEvent) as SkyV4PlacementLunarEventType;
  if (!eventTypes.includes(eventType)) return null;
  const eventSign = title(normalized(context.contextSign));
  return eventSign ? { eventType, eventSign, oppositeSign: oppositeSign(eventSign) } : null;
}

function releasedPackage(source: PlacementLunarContextPackage) {
  if (
    source.schema !== "tldrastro-sky-v4-placement-lunar-context/v1"
    || source.serving_enabled !== true || source.owner_approved !== true || source.review_status !== "approved"
    || source.expected_records !== 40 || source.records.length !== 40
    || bundledChunks.some((chunk, index) => chunk.schema !== "tldrastro-sky-v4-placement-lunar-context/chunk-v1" || chunk.chunk !== index + 1 || chunk.record_count !== chunk.records.length)
  ) return null;
  const expectedKeys = new Set(planets.flatMap((planet) => eventTypes.map((eventType) => `sky-placement/lunar-context/${eventType}/${planet}`)));
  const actualKeys = new Set(source.records.map((item) => item.ContentKey));
  if (actualKeys.size !== 40 || [...expectedKeys].some((key) => !actualKeys.has(key))) return null;
  if (source.records.some((item) => !item.FullPageBody.trim() || !item.FallbackBody.trim())) return null;
  return source;
}

function releasedModule(source: PlacementLunarContextPackage, planet: string, eventType: SkyV4PlacementLunarEventType) {
  const released = releasedPackage(source);
  return released?.records.find((candidate) => normalized(candidate.Planet) === normalized(planet) && candidate.EventType === eventType) ?? null;
}
function continuousArticle(corpus: unknown, planet: string, sign: string) {
  const content = record(record(corpus).content); const continuous = Array.isArray(content.continuous) ? content.continuous : [];
  const key = `sky-placement/article/${normalized(planet)}/${normalized(sign)}`;
  return continuous.map(record).find((row) => row.contentKey === key) ?? null;
}
function contextualOverlay(corpus: unknown, key: string) {
  const content = record(record(corpus).content); const overlays = Array.isArray(content.contextualTransitOverlays) ? content.contextualTransitOverlays : [];
  return overlays.map(record).find((row) => row.OverlayKey === key) ?? null;
}
function filled(value: unknown, facts: Record<string, string>) { return fillTokens(String(value ?? ""), facts).trim(); }
function replaceFirst(source: string, before: string, after: string) { const index = source.indexOf(before); return index < 0 ? source : `${source.slice(0, index)}${after}${source.slice(index + before.length)}`; }
function replaceReaderPart(parts: string[], before: string, after: string, insertAfter?: string) { const index = parts.findIndex((part) => part === before); if (index < 0) return parts; return insertAfter ? [...parts.slice(0, index + 1), insertAfter, ...parts.slice(index + 1)] : parts.map((part, partIndex) => partIndex === index ? after : part); }

export function applySkyV4PlacementLunarContext(rendered: unknown, input: Record<string, unknown>, corpus: unknown, source: PlacementLunarContextPackage = bundledSource()) {
  const result = record(rendered) as RenderedSkyV4Placement;
  if (normalized(input.route) !== "placement") return result;
  const event = selectedEvent(input); if (!event) return result;
  const module = releasedModule(source, String(input.planet ?? ""), event.eventType); if (!module) return result;
  const facts = { ...Object.fromEntries(Object.entries(record(input.facts)).map(([key, value]) => [key, String(value ?? "")])), eventSign: event.eventSign, oppositeSign: event.oppositeSign };
  const article = continuousArticle(corpus, String(input.planet ?? ""), String(input.sign ?? "")); if (!article) return result;
  const readerParts = Array.isArray(result.readerParts) ? [...result.readerParts] : []; const page = String(result.page ?? "");
  if (result.resolution === "exact-fallback") {
    const fallback = record(article.fallback); const fallbackOverlayKey = Array.isArray(result.selectedFallbackOverlayKeys) ? result.selectedFallbackOverlayKeys[0] : undefined;
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
  const source = bundledSource();
  return { schema: source.schema, expectedRecords: source.expected_records, recordCount: source.records.length, ownerApproved: source.owner_approved === true, servingEnabled: source.serving_enabled === true, reviewStatus: source.review_status, approvalId: source.approval_id, releaseId: source.release_id };
}
