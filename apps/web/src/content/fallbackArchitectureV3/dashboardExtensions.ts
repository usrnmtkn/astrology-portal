const retrogradeCapableNatalBodies = new Set([
  "mercury",
  "venus",
  "mars",
  "jupiter",
  "saturn",
  "uranus",
  "neptune",
  "pluto",
  "chiron",
  "lilith",
  "north-node",
  "south-node"
]);

const natalBodies = new Set([
  "sun",
  "moon",
  ...retrogradeCapableNatalBodies
]);

const zodiacSigns = new Set([
  "aries",
  "taurus",
  "gemini",
  "cancer",
  "leo",
  "virgo",
  "libra",
  "scorpio",
  "sagittarius",
  "capricorn",
  "aquarius",
  "pisces"
]);

const exactNatalPlacementPrefix = "fallback-hook/natal-you-placement-complete-final/";

export type FallbackDashboardExtensionRecord = {
  contentKey: string;
  content_role?: unknown;
  reader_only?: unknown;
  render_policy?: unknown;
};

export function isDynamicNatalPlacementExactKey(contentKey: string) {
  if (!contentKey.startsWith(exactNatalPlacementPrefix)) return false;
  const parts = contentKey.slice(exactNatalPlacementPrefix.length).split("/");
  if (parts.length !== 3 && parts.length !== 4) return false;
  const [planet, sign, house, motion] = parts;
  if (!natalBodies.has(planet) || !zodiacSigns.has(sign) || !/^(?:[1-9]|1[0-2])$/u.test(house)) return false;
  if (motion === undefined) return true;
  return motion === "retrograde" && retrogradeCapableNatalBodies.has(planet);
}

export function isDynamicNatalPlacementExactRecord(record: FallbackDashboardExtensionRecord) {
  return isDynamicNatalPlacementExactKey(record.contentKey)
    && record.content_role === "full_copy"
    && record.reader_only === true
    && record.render_policy === "reader-only-exact-lived-v1";
}

export function isFallbackDashboardRecordAllowed(
  record: FallbackDashboardExtensionRecord,
  currentPackageKeys: ReadonlySet<string>
) {
  return currentPackageKeys.has(record.contentKey)
    || isDynamicNatalPlacementExactRecord(record);
}
