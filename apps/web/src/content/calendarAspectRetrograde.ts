// Motion variants belong to the same saved aspect as its default passage.
// A/B always follow the content key, never the order of a reader's event.
const rxBodies = new Set(["mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto", "chiron"]);
export const calendarAspectRetrogradeFields = ["RetrogradeBodyA", "RetrogradeBodyB", "RetrogradeBodyBoth"] as const;
export type CalendarAspectRetrogradeField = typeof calendarAspectRetrogradeFields[number];
export type AspectMotionFacts = { first: string; second: string; firstMotion?: string | null; secondMotion?: string | null };
const slug = (value: string) => value.trim().toLowerCase().replace(/[ _]+/gu, "-");
const title = (value: string) => value.replace(/-/gu, " ").replace(/\b\w/gu, letter => letter.toUpperCase());
const object = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};

export function calendarAspectRetrogradeIdentity(key: string) {
  const dot = key.match(/^sky\.aspect\.([a-z-]+)\.(conjunction|sextile|square|trine|quincunx|opposition)\.([a-z-]+)(?:\.|$)/u);
  if (dot) return { a: dot[1], b: dot[3] };
  const slash = key.match(/^(?:sky-card|fallback-hook\/sky-aspect-sign)\/([a-z-]+)\/[a-z-]+\/(conjunction|sextile|square|trine|quincunx|opposition)\/([a-z-]+)\/[a-z-]+$/u);
  return slash ? { a: slash[1], b: slash[3] } : null;
}

export function calendarAspectRetrogradeOptions(key: string): { field: CalendarAspectRetrogradeField; label: string; description: string }[] {
  const identity = calendarAspectRetrogradeIdentity(key);
  if (!identity) return [];
  const a = rxBodies.has(identity.a), b = rxBodies.has(identity.b);
  return [
    ...(a ? [{ field: "RetrogradeBodyA" as const, label: `Retrograde version · ${title(identity.a)} Rx`, description: b ? `Used when ${title(identity.a)} is retrograde and ${title(identity.b)} is direct.` : `Used when ${title(identity.a)} is retrograde.` }] : []),
    ...(b ? [{ field: "RetrogradeBodyB" as const, label: `Retrograde version · ${title(identity.b)} Rx`, description: a ? `Used when ${title(identity.b)} is retrograde and ${title(identity.a)} is direct.` : `Used when ${title(identity.b)} is retrograde.` }] : []),
    ...(a && b ? [{ field: "RetrogradeBodyBoth" as const, label: `Retrograde version · ${title(identity.a)} Rx and ${title(identity.b)} Rx`, description: "Used when both planets are retrograde." }] : [])
  ];
}

export function calendarAspectRetrogradeBody(key: string, sections: unknown, facts: AspectMotionFacts): string | null {
  const identity = calendarAspectRetrogradeIdentity(key);
  if (!identity) return null;
  const motions = new Map([[slug(facts.first), facts.firstMotion], [slug(facts.second), facts.secondMotion]]);
  if (!motions.has(identity.a) || !motions.has(identity.b)) return null;
  // Unknown motion cannot establish which version applies. Background-motion
  // points follow the app's existing Rx display policy, not variant selection.
  for (const body of [identity.a, identity.b]) {
    if (rxBodies.has(body) && !["direct", "retrograde"].includes(motions.get(body) ?? "")) return null;
  }
  const a = rxBodies.has(identity.a) && motions.get(identity.a) === "retrograde";
  const b = rxBodies.has(identity.b) && motions.get(identity.b) === "retrograde";
  const field = a && b ? "RetrogradeBodyBoth" : a ? "RetrogradeBodyA" : b ? "RetrogradeBodyB" : null;
  if (!field) return null;
  const saved = object(sections);
  // Never inspect packageDraft: only the published record is reader copy.
  const source = saved.packageRecord ? object(saved.packageRecord) : saved;
  const body = source[field];
  return typeof body === "string" && body.trim() ? body : null;
}
