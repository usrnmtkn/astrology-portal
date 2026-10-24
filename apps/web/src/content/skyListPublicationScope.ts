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

/** A superset of the list's key families, plus the real global marker. Filter
 * after complete keyset pagination; future keys and retirements remain covered.
 */
export const skyListPublicationDatabaseFilter = '(content_key.eq.__content-publication-ledger/v1,'
  + ['sky.', 'sky/', 'sky-', 'fallback-vocab/', 'fallback-template/', 'fallback-hook/sky-',
    'fallback-hook/transit-retro/', 'fallback-hook/dignity-line/', 'cc/planet/', 'cc/sign/',
    'cms/sky-', 'cms/lunation-article/', 'authored/sky-lunation-macro/']
    .map(prefix => `content_key.like.${prefix}*`).join(',') + ')';
