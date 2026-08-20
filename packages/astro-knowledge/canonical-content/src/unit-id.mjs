const SEGMENT = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;

const BODY_ALIASES = Object.freeze({
  asc: "ascendant",
  mc: "midheaven",
  ic: "imum-coeli",
  "true-node": "north-node",
  "north-node": "north-node",
  "south-node": "south-node"
});

const ASPECT_ALIASES = Object.freeze({
  conj: "conjunction",
  conjunct: "conjunction",
  conjunction: "conjunction",
  inconjunct: "quincunx",
  nonagen: "semisextile",
  opposed: "opposition",
  opposite: "opposition",
  opposition: "opposition",
  quincunx: "quincunx",
  "semi-sextile": "semisextile",
  semisextile: "semisextile",
  sext: "sextile",
  sextile: "sextile",
  sq: "square",
  square: "square",
  trine: "trine"
});

export function normalizeCanonicalSegment(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/[’']/gu, "")
    .replace(/&/gu, "and")
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "");
}

export function normalizeCanonicalBody(value) {
  const segment = normalizeCanonicalSegment(value);
  return BODY_ALIASES[segment] ?? segment;
}

export function normalizeCanonicalAspect(value) {
  const segment = normalizeCanonicalSegment(value);
  return ASPECT_ALIASES[segment] ?? segment;
}

export function normalizeCanonicalHouse(value) {
  const match = String(value ?? "").trim().toLowerCase().match(/^(?:house[-\s]*)?(\d{1,2})(?:st|nd|rd|th)?$/u);
  const house = Number(match?.[1]);
  if (!Number.isInteger(house) || house < 1 || house > 12) {
    throw new Error(`Invalid canonical house: ${value}`);
  }
  return String(house);
}

export function canonicalAspectPair(first, second) {
  return [normalizeCanonicalBody(first), normalizeCanonicalBody(second)].sort((a, b) => a.localeCompare(b));
}

export function canonicalUnitId(...rawSegments) {
  const segments = rawSegments.flat().map(normalizeCanonicalSegment);
  if (segments.length < 3 || segments.some((segment) => !SEGMENT.test(segment))) {
    throw new Error(`Invalid canonical unit id segments: ${rawSegments.join("/")}`);
  }
  return segments.join("/");
}

export function canonicalNatalPlacementSignId(body, sign) {
  return canonicalUnitId("natal", "placement-sign", normalizeCanonicalBody(body), sign);
}

export function canonicalNatalPlacementHouseId(body, house) {
  return canonicalUnitId("natal", "placement-house", normalizeCanonicalBody(body), normalizeCanonicalHouse(house));
}

export function canonicalNatalAspectId(first, second, aspect) {
  const pair = canonicalAspectPair(first, second);
  return canonicalUnitId("natal", "aspect", pair[0], pair[1], normalizeCanonicalAspect(aspect));
}

export function canonicalNatalEmptyHouseId(house, sign, ruler, rulerHouse) {
  return canonicalUnitId(
    "natal",
    "empty-house",
    normalizeCanonicalHouse(house),
    sign,
    `${normalizeCanonicalBody(ruler)}-in-${normalizeCanonicalHouse(rulerHouse)}`
  );
}

export function assertCanonicalUnitId(unitId) {
  const segments = String(unitId ?? "").split("/");
  if (segments.length < 3 || segments.some((segment) => !SEGMENT.test(segment))) {
    throw new Error(`Invalid canonical unit id: ${unitId}`);
  }
  return unitId;
}
