import type { CompositionMapRow, CompositionMapTemplate } from "./compositionMap";

// Key contracts, not the imported row's surface label (many natal hooks are labelled Sky).
export const compositionSurfaceFamilies: Record<string, RegExp> = {
  "friends-compatibility-planet-cards": /^(?:authored\/compat-pair\/|fallback-(?:hook|template)\/friends[.]compatibility)/,
  "friends-compatibility-exact-dynamics": /^(?:authored\/compat-|fallback-hook\/(?:compat-domain|element-pattern|synastry-|bond-effect)|fallback-template\/friends[.]compatibility)/,
  "friends-synastry-contact": /^(?:synastry\/|fallback-hook\/(?:synastry-|bond-effect)|fallback-template\/synastry[.])/,
  "friends-house-overlays": /^(?:fallback-template\/(?:synastry[.]house|friends[.]house)|fallback-hook\/(?:house-meaning|house-glossary)|synastry\/house)/,
  "friends-composite": /^(?:composite\/|fallback-template\/composite[.]|fallback-hook\/(?:bond-effect|planet-mode|planet-grates|natal-core|element-pattern))/,
  "friends-pair-daily": /^fallback-(?:hook|template)\/pair-daily(?:\/|$)/,
  "natal-placement-detail": /^(?:natal\/placement|fallback-template\/natal[.](?:planet|node|angle)|fallback-hook\/(?:natal-you-placement|planet-intro|planet-best|planet-lived|sign-lived|placement-|house-lived|house-meaning|node-journey|angle-|dignity-line|natal-moon-phase-lived))/,
  "natal-aspect-detail": /^(?:natal\/aspect|fallback-template\/natal[.]aspect|fallback-hook\/(?:aspect-type|aspect-pair|aspect-lived|natal-aspect-lived))/,
  "natal-aspect-patterns": /^(?:authored\/(?:natal-pattern|aspect-pattern)|fallback-hook\/aspect-pattern)/,
  "sky-placement-detail": /^(?:authored\/sky-placement|sky-placement\/|fallback-template\/sky-placement|fallback-hook\/(?:sky-placement|sky-sign-copy|sky-sign-trap|sky-element-close|sky-planet-education|fog-note))/,
  "sky-aspect-detail": /^(?:authored\/sky-aspect|sky[.]|fallback-template\/sky[.]aspect|fallback-hook\/sky-aspect)/,
  "sky-retrograde-summary": /^(?:cms\/sky-retrograde-summary|fallback-template\/transit[.]retro|fallback-hook\/transit-retro)/,
  "personal-transit-detail": /^(?:cms\/personal-transit-aspect|transit\/|fallback-template\/transit[.]aspect|fallback-hook\/(?:transit-aspect-type|transit-effect|transit-retro-aspect))/,
  "sky-daily-timing": /^(?:daily-timing\/|fallback-template\/daily|fallback-hook\/daily-)/,
  "daily-at-a-glance": /^fallback-(?:hook|template)\/daily(?:[./-]|$)/,
  "sky-calendar-event-cards": /^(?:authored\/(?:sky-lunation|calendar)|lunation\/|season(?:-arc)?\/|transit-fallback\/|fallback-template\/(?:sky[.]|lunation)|fallback-hook\/(?:sky-event|sky-season|sky-lunation|sky-axis|sky-fullmoon|sky-newmoon|sky-eclipse|season-marker))/,
  "sky-lunar-day-editorial": /^(?:authored\/calendar|lunar\/|lunation\/|fallback-template\/(?:moon|lunation)|fallback-hook\/(?:moon-|lunation-))/,
  "sky-calendar-day-cards": /^(?:cms\/calendar-day|fallback-hook\/(?:moon-|season-marker|sky-event))/,
  "sky-horoscopes": /^(?:cms\/weekly-horoscope|fallback-template\/(?:lunation|sky[.]horoscope)|fallback-hook\/(?:sky-horoscope|lunation-))/,
  "chart-placement-row-microcopy": /^(?:cms\/chart-placement-row|fallback-hook\/(?:planet-intro|placement-sentence|dignity-line))/,
  "natal-empty-house": /^(?:cms\/natal-empty-house|fallback-template\/(?:empty-house|natal[.]empty-house)|fallback-vocab\/empty-house-|fallback-hook\/(?:empty-house|house-cusp|house-glossary|ruler-method))/,
  "personal-transit-house": /^(?:cms\/personal-transit-house|fallback-template\/transit[.]house|fallback-hook\/(?:transit-house|transit-effect-house|house-meaning))/,
  "generated-reports": /^(?:report\/|fallback-template\/(?:career|profection|circle)|fallback-hook\/(?:career-|profection-|circle-))/,
  "surface-specs-builders": /^(?:fallback-vocab\/|vocab\/|slot-template\/)/
};

export function compositionSourcesForSurface(surfaceId: string, rows: CompositionMapRow[], templates: CompositionMapTemplate[]) {
  const contract = compositionSurfaceFamilies[surfaceId];
  const direct = rows.filter((row) => contract?.test(row.content_key));
  const keys = new Set(direct.map((row) => row.content_key));
  // Include declared nested hook/vocabulary dependencies, even when shared across surfaces.
  for (const template of templates) {
    if (!keys.has(template.row.content_key)) continue;
    for (const slot of template.slots) for (const source of slot.sources) keys.add(source.row.content_key);
  }
  return rows.filter((row) => keys.has(row.content_key));
}

export function compositionSourceFamily(key: string) {
  return key.split("/").slice(0, 2).join("/");
}
