const ASPECT_ALIASES = new Map<string, string>([
  ["conjunct", "conjunction"],
  ["conjunction", "conjunction"],
  ["opposes", "opposition"],
  ["opposite", "opposition"],
  ["opposition", "opposition"],
  ["square", "square"],
  ["squares", "square"],
  ["trine", "trine"],
  ["trines", "trine"],
  ["sextile", "sextile"],
  ["sextiles", "sextile"]
]);
const BODY_PATTERN = "Sun|Moon|Mercury|Venus|Mars|Jupiter|Saturn|Uranus|Neptune|Pluto|Chiron|Lilith|North Node|South Node|Ascendant|Rising|Midheaven|MC|Descendant|IC";
const SIGN_PATTERN = "Aries|Taurus|Gemini|Cancer|Leo|Virgo|Libra|Scorpio|Sagittarius|Capricorn|Aquarius|Pisces";
const DRIVER_ASPECT = new RegExp(`^(${BODY_PATTERN})\\s+(conjunct|conjunction|opposes|opposite|opposition|square|squares|trine|trines|sextile|sextiles)\\s+(${BODY_PATTERN})$`, "iu");
const WEEKLY_MOON_PLACEMENT = new RegExp(`^Moon\\s+in\\s+(${SIGN_PATTERN})$`, "iu");
const HOUSE_TEXT_PATTERN = /\b([1-9]|1[0-2])(?:st|nd|rd|th)?(?:\s+|-)house\b/giu;

function slug(value: unknown) {
  return typeof value === "string"
    ? value.trim().toLowerCase().replace(/&/gu, " and ").replace(/[^a-z0-9]+/gu, "-").replace(/^-+|-+$/gu, "")
    : "";
}

function canonicalAspect(value: unknown) {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  return ASPECT_ALIASES.get(normalized) ?? "";
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function addHouse(ids: Set<string>, value: unknown) {
  if (typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 12) {
    ids.add(`house-${value}`);
  }
}

function addTransit(ids: Set<string>, transitPlanet: unknown, aspect: unknown, natalPoint: unknown) {
  const planet = slug(transitPlanet);
  const canonical = canonicalAspect(aspect);
  const point = slug(natalPoint);
  if (planet && canonical && point) ids.add(`you-transit-v3-${planet}-${canonical}-${point}`);
}

function addDriver(ids: Set<string>, driverLabel: unknown) {
  const driver = stringValue(driverLabel);
  const match = DRIVER_ASPECT.exec(driver);
  if (match) addTransit(ids, match[1], match[2], match[3]);
}

function addWeeklyMoonPlacement(ids: Set<string>, source: unknown, driverLabel: unknown) {
  if (stringValue(source).toLowerCase() !== "weekly-moon") return;
  const match = WEEKLY_MOON_PLACEMENT.exec(stringValue(driverLabel));
  if (match) ids.add(`moon-in-${slug(match[1])}`);
}

function walkTechnicalEvidence(ids: Set<string>, value: unknown) {
  if (Array.isArray(value)) {
    value.forEach((entry) => walkTechnicalEvidence(ids, entry));
    return;
  }
  const item = record(value);
  if (!item) return;

  addTransit(ids, item.transitPlanet, item.aspect, item.natalPoint);
  addHouse(ids, item.house);
  addHouse(ids, item.natalHouse);
  addDriver(ids, item.driverLabel);
  addWeeklyMoonPlacement(ids, item.source, item.driverLabel);

  for (const entry of Object.values(item)) {
    if (entry && typeof entry === "object") walkTechnicalEvidence(ids, entry);
  }
}

function walkApprovedReaderText(ids: Set<string>, value: unknown) {
  if (typeof value === "string") {
    for (const match of value.matchAll(HOUSE_TEXT_PATTERN)) addHouse(ids, Number(match[1]));
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((entry) => walkApprovedReaderText(ids, entry));
    return;
  }
  const item = record(value);
  if (!item) return;
  Object.values(item).forEach((entry) => walkApprovedReaderText(ids, entry));
}

/**
 * These identifiers authorize the production model call against catalogued
 * mechanism evidence. They do not calculate new astrology and they do not
 * expand the factual ceiling; the You brief and fact lock remain authoritative.
 *
 * Weekly assemblies can intentionally carry `house: null` in a compact
 * technical reading while their approved personalized reader text already
 * names the governed house. In that case the named approved house is valid
 * evidence identity, just as it is for the deterministic fact lock. A weekly
 * Moon-sign headliner can also be the entire governed weekly source; its exact
 * Moon-in-sign driver therefore contributes the corresponding catalogued
 * placement identity without inventing a house or an aspect.
 */
export function youTransitReadingProductionKnowledgeIds(brief: {
  approvedReaderText?: Record<string, unknown>;
  technicalEvidence?: Record<string, unknown>;
}) {
  const ids = new Set<string>();
  walkTechnicalEvidence(ids, brief.technicalEvidence ?? {});
  walkApprovedReaderText(ids, brief.approvedReaderText ?? {});
  return [...ids];
}
