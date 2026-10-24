/** Complete lifecycle coverage for initial Sky list sources and dated editions.
 * Includes every sign and revision, not only today's selected placements.
 * Articles, Calendar and personal readers still require the full ledger.
 */
export function isSkyListPublicationKey(key: string) {
  // Retain flat/dotted legacy event aliases across all signs. Aspect articles
  // belong to the full reader and have their own complete publication check.
  return !/^(?:sky[./-]aspect[./-]|fallback-hook\/sky-aspect-)/u.test(key)
    && /^(?:sky[./-]|fallback-(?:vocab|template)\/|fallback-hook\/(?:sky-|transit-retro\/|dignity-line\/)|cc\/(?:planet|sign)\/|cms\/(?:sky-|lunation-article\/)|authored\/sky-lunation-macro\/)/u.test(key);
}
