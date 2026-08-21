import {
  NATAL_ASPECT_DEFINITIONS,
  NATAL_ASPECT_POINT_ORDER
} from "../sky-aspects/browser.mjs";

/**
 * Shared declaration of the semantic objects accepted by the natal reader
 * content path. The canonical-content builder imports this runtime contract;
 * it does not maintain a second body, angle, sign, or aspect list.
 *
 * `nonagen` is retained as a source alias for the canonical semisextile
 * identity. Both names are present in the approved corpus, but they resolve to
 * one 30-degree canonical unit.
 */
export const NATAL_CONTENT_SIGNS = Object.freeze([
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
]);

export const NATAL_CONTENT_ANGLE_POINTS = Object.freeze([
  "Ascendant",
  "Midheaven"
]);

export const NATAL_CONTENT_PLACEMENT_POINTS = Object.freeze([
  ...NATAL_ASPECT_POINT_ORDER.filter((point) => !NATAL_CONTENT_ANGLE_POINTS.includes(point)),
  "Part of Fortune"
]);

export const NATAL_CONTENT_ASPECT_POINTS = Object.freeze([
  ...NATAL_CONTENT_PLACEMENT_POINTS,
  ...NATAL_CONTENT_ANGLE_POINTS
]);

export const NATAL_CONTENT_ASPECT_SOURCE_TYPES = Object.freeze([
  ...NATAL_ASPECT_DEFINITIONS.map(({ type }) => Object.freeze({ sourceType: type, canonicalType: type })),
  Object.freeze({ sourceType: "semisextile", canonicalType: "semisextile" }),
  Object.freeze({ sourceType: "nonagen", canonicalType: "semisextile" })
]);

const excludedAspectPairs = new Set([
  ["North Node", "South Node"].sort().join("|"),
  ["Ascendant", "Midheaven"].sort().join("|")
]);

export function isSupportedNatalContentAspectPair(first, second) {
  return first !== second && !excludedAspectPairs.has([first, second].sort().join("|"));
}
