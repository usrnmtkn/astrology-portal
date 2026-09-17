const situationSigns = new Set([
  "aries", "taurus", "gemini", "cancer", "leo", "virgo",
  "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"
]);
const situationHouses = new Set(["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"]);

function token(value) {
  return typeof value === "string" || typeof value === "number" ? String(value).trim().toLowerCase() : "";
}

function houseToken(value) {
  const match = token(value).match(/^(1[0-2]|[1-9])(?:st|nd|rd|th)?$/u);
  return match?.[1] ?? "";
}

/** Six-finder identity: transiting, aspect, natal, current sign, transit house, natal house. */
export function transitAspectSituationKey(transiting, natal, aspect, sign, transitHouse, natalHouse) {
  const signToken = token(sign);
  const fromHouse = houseToken(transitHouse);
  const natalHouseToken = houseToken(natalHouse);
  if (!transiting || !natal || !aspect || !situationSigns.has(signToken) || !situationHouses.has(fromHouse) || !situationHouses.has(natalHouseToken)) {
    return null;
  }
  return `authored/transit-aspect/${transiting}/${natal}/${aspect}/${signToken}/${fromHouse}/${natalHouseToken}`;
}

/** Keep the selected contact's exact pass/variant/base ahead of shared variants.
 * Eligibility and publication checks still run on each candidate in the caller.
 * Non-exact candidates retain their existing fallback order, including mirrors.
 */
export function prioritizeExactTransitSources(keys, transiting, natal, aspect) {
  const exact = `authored/transit-aspect/${transiting}/${natal}/${aspect}`;
  const isExact = key => key === exact || key.startsWith(`${exact}/`);
  return [...keys.filter(isExact), ...keys.filter(key => !isExact(key))];
}
