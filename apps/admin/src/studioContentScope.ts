import { STUDIO_SKY_WRITEUP_PREFIXES, STUDIO_TEMPLATE_PREFIXES, STUDIO_VOCABULARY_PREFIXES, STUDIO_FALLBACK_PREFIXES } from "./studioSectionInventory.js";

// The UI classifies saved rows by their metadata as well as their content key.
// These are deliberately inclusive storage predicates; the existing UI classifiers
// still decide which rows belong in each view. Excluding prefix passes avoids
// downloading the same compact inventory twice.
const templateMetadata = [
  ...["lunar", "lunation", "moon-phase", "moon-sign", "eclipse", "new-moon", "full-moon", "cms/calendar-day"].map(part => `content_key.like.*${part}*`),
  "block_type.eq.template", "block_type.eq.fallback_template",
  "source_snapshot->>content_role.eq.template", "sections->packageRecord->>content_role.eq.template"
];
const fallbackMetadata = [
  "block_type.eq.fallback_template", "block_type.eq.fallback_hook", "prompt_version.eq.fallback-hook-template-v1",
  ...["contentRole", "content_role", "sourceRole", "source_role", "role", "contentType", "content_type", "type"]
    .flatMap(field => ["fallback-hook", "fallback_hook", "template"].map(role => `source_snapshot->>${field}.ilike.${role}`)),
  ...["fallback-hook", "fallback_hook", "template"].map(role => `sections->packageRecord->>content_role.ilike.${role}`)
];
const vocabularyMetadata = [
  "block_type.eq.vocabulary_phrase", "event_type.eq.vocab", "prompt_version.eq.vocab-v1", "prompt_version.eq.tagline-v1",
  ...["contentRole", "content_role", "sourceRole", "source_role", "role", "contentType", "content_type", "type", "bucket", "targetContentFamily"]
    .flatMap(field => ["vocab", "vocabulary"].map(role => `source_snapshot->>${field}.ilike.${role}`)),
  "sections->packageRecord->>content_role.ilike.vocabulary"
];
function metadataOutsidePrefixes(conditions: readonly string[], prefixes: readonly string[]) {
  return `(and(or(${[...new Set(conditions)].join(",")}),${[...new Set(prefixes)].map(prefix => `content_key.not.like.${prefix}*`).join(",")}))`;
}

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
  if (scope === "sky-types") return metadataOutsidePrefixes(["block_type.eq.sky_placement", "block_type.eq.sky_article"], STUDIO_SKY_WRITEUP_PREFIXES);
  if (scope === "template-types") return metadataOutsidePrefixes(templateMetadata, STUDIO_TEMPLATE_PREFIXES);
  if (scope === "fallback-types") return metadataOutsidePrefixes(fallbackMetadata, STUDIO_FALLBACK_PREFIXES);
  if (scope === "vocabulary-types") return metadataOutsidePrefixes(vocabularyMetadata, STUDIO_VOCABULARY_PREFIXES);
  if (scope === "slot-types") return metadataOutsidePrefixes([...templateMetadata, ...fallbackMetadata, ...vocabularyMetadata], [...STUDIO_TEMPLATE_PREFIXES, ...STUDIO_VOCABULARY_PREFIXES]);
  if (scope === "compatibility") return `(${[
    ...compatibilityKeyPrefixes.map(prefix => `content_key.like.${prefix}*`),
    "event_type.eq.friends.compatibility.planet-card", "block_type.eq.compatibility_planet_card"
  ].join(",")})`;
  if (scope === "composite") return "(surface.eq.composite,content_key.like.*composite*,block_type.eq.composite_aspect)";
  return null;
}
