"use strict";

/**
 * Which aspects can physically occur between two points.
 *
 * Some planet pairs cannot form some aspects. Not "we have not written them
 * yet" — they cannot happen in any chart, ever. Enumerating them produces
 * phantom coverage gaps and, worse, invites someone to author doctrine for a
 * configuration no reader will ever have.
 *
 * Two independent causes.
 *
 * 1. ELONGATION LIMITS. Mercury and Venus orbit inside Earth, so from Earth
 *    they never appear far from the Sun. Mercury reaches about 28 degrees of
 *    greatest elongation, Venus about 47.8. So the Sun and Mercury can never
 *    be 60 degrees apart, and a Sun-Mercury sextile does not exist. Mercury
 *    and Venus can be at most about 75.8 degrees apart (both extremes, opposite
 *    sides), which permits a sextile but not a square.
 *
 * 2. FIXED AXES. Some points are defined as each other's opposite and are
 *    therefore always exactly 180 degrees apart. The lunar nodes are the two
 *    intersections of the Moon's orbit with the ecliptic. The Ascendant and
 *    Descendant are the two ends of the horizon. The Midheaven and Imum Coeli
 *    are the two ends of the meridian. Each pair is permanently in opposition
 *    and can form no other aspect with itself.
 *
 * The catalog already reflects this. Mercury-Venus sextile is present while
 * Mercury-Venus square is not, which is the exact signature of correct
 * astronomy rather than a random hole. This module makes that reasoning
 * explicit so enumerations stop reporting the absences as gaps.
 *
 * Orbs are the ones the sky engine uses: 5 degrees, 3 for the quincunx.
 */

/** Greatest elongation from the Sun, in degrees. */
const MAX_ELONGATION_FROM_SUN = Object.freeze({ mercury: 28.3, venus: 47.8 });

/** Pairs defined as opposite ends of one axis. Always 180 degrees apart. */
const FIXED_OPPOSITION_PAIRS = Object.freeze([
  Object.freeze(["north_node", "south_node"]),
  Object.freeze(["ascendant", "descendant"]),
  Object.freeze(["midheaven", "imum_coeli"])
]);

const ASPECT_ANGLE = Object.freeze({
  conjunction: 0, semisextile: 30, sextile: 60, square: 90,
  trine: 120, quincunx: 150, opposition: 180
});

const ASPECT_ORB = Object.freeze({ quincunx: 3 });
const DEFAULT_ORB = 5;

const normalize = (value) => String(value ?? "").toLowerCase().replace(/-/gu, "_");

/** Greatest possible separation between two points, or null if unconstrained. */
function maximumSeparation(a, b) {
  const [x, y] = [normalize(a), normalize(b)];
  if (x === y) return 0;
  const pair = new Set([x, y]);
  if (pair.has("sun")) {
    const other = x === "sun" ? y : x;
    return MAX_ELONGATION_FROM_SUN[other] ?? null;
  }
  if (pair.has("mercury") && pair.has("venus")) {
    // Both at greatest elongation on opposite sides of the Sun.
    return MAX_ELONGATION_FROM_SUN.mercury + MAX_ELONGATION_FROM_SUN.venus;
  }
  return null;
}

function isFixedOppositionPair(a, b) {
  const [x, y] = [normalize(a), normalize(b)];
  return FIXED_OPPOSITION_PAIRS.some((pair) => pair.includes(x) && pair.includes(y) && x !== y);
}

/**
 * These limits hold only WITHIN A SINGLE CHART.
 *
 * This distinction matters more than the limits themselves. Transiting Sun
 * square natal Sun happens twice a year. One person's Mercury can sit
 * anywhere relative to another person's Sun. Two charts are two moments, so
 * nothing constrains the angle between them.
 *
 *   natal-aspect      one chart              LIMITS APPLY
 *   composite-aspect  one derived chart      LIMITS APPLY (see below)
 *   sky / daily       one moment             LIMITS APPLY
 *   synastry-aspect   two people's charts    no limits
 *   transit-aspect    two moments            no limits
 *
 * Composite deserves the reasoning spelled out, because it is a midpoint chart
 * and midpoints are not obviously well behaved. Composite Sun is the midpoint
 * of the two Suns and composite Mercury the midpoint of the two Mercurys, so
 * the composite Sun-Mercury elongation is the average of the two charts'
 * signed elongations. An average of values bounded by 28 degrees is itself
 * bounded by 28 degrees, so the limit survives. The fixed axes survive too:
 * if South Node is North Node plus 180 in both charts, the midpoints stay
 * exactly 180 apart.
 */
const SINGLE_CHART_KINDS = Object.freeze(new Set(["natal", "composite", "sky", "daily"]));

/**
 * @param {string} a
 * @param {string} b
 * @param {string} aspect
 * @returns {{possible: boolean, reason: string|null, detail: string|null}}
 */
function aspectPossibility(a, b, aspect) {
  const angle = ASPECT_ANGLE[normalize(aspect).replace(/_/gu, "")] ?? ASPECT_ANGLE[String(aspect).toLowerCase()];
  if (angle == null) return { possible: true, reason: null, detail: null };

  if (isFixedOppositionPair(a, b)) {
    if (angle === 180) return { possible: true, reason: null, detail: null };
    return {
      possible: false,
      reason: "fixed-axis",
      detail: `${a} and ${b} are opposite ends of one axis and are always exactly 180 degrees apart, so only an opposition can occur.`
    };
  }

  const maximum = maximumSeparation(a, b);
  if (maximum == null) return { possible: true, reason: null, detail: null };

  const orb = ASPECT_ORB[normalize(aspect)] ?? DEFAULT_ORB;
  if (angle - orb <= maximum) return { possible: true, reason: null, detail: null };
  return {
    possible: false,
    reason: "elongation-limit",
    detail: `${a} and ${b} are never more than about ${maximum} degrees apart, so a ${aspect} (${angle} degrees, orb ${orb}) cannot occur.`
  };
}

const isAspectPossible = (a, b, aspect) => aspectPossibility(a, b, aspect).possible;

/** True when `kind` describes a single chart, so the limits bind. */
const isSingleChartKind = (kind) => SINGLE_CHART_KINDS.has(String(kind ?? "").replace(/-aspect$/u, ""));

/**
 * Possibility for a named chart kind. Cross-chart kinds are always possible.
 * @param {"natal"|"composite"|"synastry"|"transit"|"sky"|"daily"} kind
 */
function aspectPossibilityForKind(kind, a, b, aspect) {
  if (!isSingleChartKind(kind)) return { possible: true, reason: null, detail: null };
  return aspectPossibility(a, b, aspect);
}

/**
 * True when this canonical ID names an aspect that cannot occur.
 *
 * The namespace list must stay in step with SINGLE_CHART_KINDS. `sky-aspect`
 * was missing here while `sky` was already a single-chart kind, so sky IDs
 * would have passed unchecked the moment that namespace was created.
 */
function isImpossibleCanonicalId(canonicalId) {
  const [namespace, a, b, aspect] = String(canonicalId).split("/");
  if (!/^(natal|synastry|composite|transit|sky|daily)-aspect$/u.test(namespace)) return false;
  if (!a || !b || !aspect) return false;
  return !aspectPossibilityForKind(namespace, a, b, aspect).possible;
}

module.exports = {
  MAX_ELONGATION_FROM_SUN,
  FIXED_OPPOSITION_PAIRS,
  ASPECT_ANGLE,
  SINGLE_CHART_KINDS,
  maximumSeparation,
  isFixedOppositionPair,
  isSingleChartKind,
  aspectPossibility,
  aspectPossibilityForKind,
  isAspectPossible,
  isImpossibleCanonicalId
};
