/** Shared membership for both inventory APIs and the corresponding Studio views. */
export const compatibilityKeyPrefixes = [
  "compatibility.", "compatibility/", "authored/compat-",
  "fallback-hook/friends", "fallback-hook/relationship", "fallback-hook/synastry",
  "fallback-hook/compat-", "fallback-hook/pair-daily/", "vocab/relationship/", "slot-template/compatibility/"
] as const;

type ScopeRow = { content_key: string; surface?: string | null; event_type?: string | null; block_type?: string | null };
export function isStudioCompatibilityRow(row: ScopeRow) {
  return compatibilityKeyPrefixes.some(prefix => row.content_key.toLowerCase().startsWith(prefix))
    || row.event_type === "friends.compatibility.planet-card" || row.block_type === "compatibility_planet_card";
}
export function isStudioCompositeRow(row: ScopeRow) {
  return row.surface === "composite" || row.content_key.includes("composite") || row.block_type === "composite_aspect";
}
export function studioScopeStorageFilter(scope: string) {
  if (scope === "compatibility") return `(${[
    ...compatibilityKeyPrefixes.map(prefix => `content_key.like.${prefix}*`),
    "event_type.eq.friends.compatibility.planet-card", "block_type.eq.compatibility_planet_card"
  ].join(",")})`;
  if (scope === "composite") return "(surface.eq.composite,content_key.like.*composite*,block_type.eq.composite_aspect)";
  return null;
}
