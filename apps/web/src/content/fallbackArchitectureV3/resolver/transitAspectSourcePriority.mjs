/** Keep the selected contact's exact pass/variant/base ahead of shared variants.
 * Eligibility and publication checks still run on each candidate in the caller.
 * Non-exact candidates retain their existing fallback order, including mirrors.
 */
export function prioritizeExactTransitSources(keys, transiting, natal, aspect) {
  const exact = `authored/transit-aspect/${transiting}/${natal}/${aspect}`;
  const isExact = key => key === exact || key.startsWith(`${exact}/`);
  return [...keys.filter(isExact), ...keys.filter(key => !isExact(key))];
}
