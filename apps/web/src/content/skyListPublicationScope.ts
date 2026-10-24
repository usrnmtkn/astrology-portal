/** Complete lifecycle coverage for initial Sky list sources and dated editions.
 * Includes every sign and revision, not only today's selected placements.
 * Articles, Calendar and personal readers still require the full ledger.
 */
export function isSkyListPublicationKey(key: string) {
  // Legacy event aliases use flat/dotted Sky keys. Cover the whole Sky family
  // so a new ingress alias cannot restart the full unrelated ledger download.
  return /^(?:sky[./-]|fallback-(?:vocab|template)\/|fallback-hook\/(?:sky-|transit-retro\/|dignity-line\/)|cc\/(?:planet|sign)\/|cms\/(?:sky-|lunation-article\/)|authored\/sky-lunation-macro\/)/u.test(key);
}
