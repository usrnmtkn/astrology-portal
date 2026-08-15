"use strict";

/**
 * Axis derivation: what one end of an axis tells you about the other.
 *
 * The Ascendant/Descendant and Midheaven/Imum Coeli are each two ends of one
 * line, permanently 180 degrees apart. That makes some facts about the second
 * end pure arithmetic rather than missing content.
 *
 * Owner confirmation, 2026-08-14: "you can use the ascendant to know what sign
 * the descendant is in."
 *
 * TWO KINDS OF DERIVATION, AND THEY ARE NOT THE SAME
 * --------------------------------------------------
 *
 * 1. IDENTITY is derivable, exactly. Aries rising means Libra setting, always.
 *    Mars conjunct the Descendant IS Mars opposite the Ascendant — not a
 *    similar configuration, the same one described from the other end.
 *
 * 2. MEANING is NOT derivable. The Ascendant is how you meet the world; the
 *    Descendant is what you seek in others and hand to them. A Libra Ascendant
 *    and a Libra Descendant are opposite readings of the same sign. Mars
 *    opposite Ascendant reads as something pushing against how you present.
 *    Mars conjunct Descendant reads as heat arriving through the other person.
 *
 * So this module resolves WHICH object holds the relevant material. It does
 * not license reusing that object's prose. Derived targets are returned as
 * mechanism reference with `framingAllowed: false`, the same treatment natal
 * material gets when it informs a transit.
 */

const OPPOSITE_SIGN = Object.freeze({
  aries: "libra", libra: "aries",
  taurus: "scorpio", scorpio: "taurus",
  gemini: "sagittarius", sagittarius: "gemini",
  cancer: "capricorn", capricorn: "cancer",
  leo: "aquarius", aquarius: "leo",
  virgo: "pisces", pisces: "virgo"
});

const AXIS_PARTNER = Object.freeze({
  ascendant: "descendant", descendant: "ascendant",
  midheaven: "imum_coeli", imum_coeli: "midheaven",
  north_node: "south_node", south_node: "north_node"
});

/**
 * An aspect to one end of an axis is a different aspect to the other end.
 * If Mars is 180 from the Ascendant it is 0 from the Descendant, and so on
 * around: 90 stays 90, 120 becomes 60, 150 becomes 30.
 */
const MIRRORED_ASPECT = Object.freeze({
  conjunction: "opposition", opposition: "conjunction",
  square: "square",
  trine: "sextile", sextile: "trine",
  quincunx: "semisextile", semisextile: "quincunx"
});

const norm = (value) => String(value ?? "").toLowerCase().replace(/-/gu, "_");

const oppositeSign = (sign) => OPPOSITE_SIGN[String(sign ?? "").toLowerCase()] ?? null;
const axisPartner = (point) => AXIS_PARTNER[norm(point)] ?? null;
const mirroredAspect = (aspect) => MIRRORED_ASPECT[norm(aspect)] ?? null;

/**
 * Where the material for `canonicalId` actually lives, when the object itself
 * is absent but its axis counterpart holds the same geometry.
 *
 * @returns {{sourceId: string, relation: string, note: string}|null}
 */
function deriveFromAxisPartner(canonicalId) {
  const segments = String(canonicalId).split("/");
  const [namespace] = segments;

  if (namespace === "placement-sign" || namespace === "composite-sign") {
    const [, point, sign] = segments;
    const partner = axisPartner(point);
    const flipped = oppositeSign(sign);
    if (!partner || !flipped) return null;
    return {
      sourceId: `${namespace}/${partner}/${flipped}`,
      relation: "axis-counterpart-sign",
      semanticRelation: "opposite-pole",
      targetUsage: "mechanism-reference",
      framingAllowed: false,
      note: `${point} in ${sign} means ${partner} in ${flipped}. The sign is derived; the reading is not. ${partner} describes the opposite pole of the same axis.`
    };
  }

  if (/^(natal|composite)-aspect$/u.test(namespace)) {
    const [, a, b, aspect] = segments;
    const mirrored = mirroredAspect(aspect);
    if (!mirrored) return null;
    for (const [point, other] of [[a, b], [b, a]]) {
      const partner = axisPartner(point);
      if (!partner) continue;
      // Catalog IDs are stored with the two bodies sorted.
      const [x, y] = [partner, other].sort();
      return {
        sourceId: `${namespace}/${x}/${y}/${mirrored}`,
        relation: "axis-counterpart-aspect",
        semanticRelation: "opposite-pole",
        targetUsage: "mechanism-reference",
        framingAllowed: false,
        note: `${other} ${aspect} ${point} is the same configuration as ${other} ${mirrored} ${partner}. The geometry is identical; the emphasis is not. ${point} frames it toward that pole.`
      };
    }
  }

  return null;
}

/** Every derivable target, given the set of IDs the catalog already holds. */
function derivableTargets(existingIds) {
  const held = existingIds instanceof Set ? existingIds : new Set(existingIds);
  const found = [];
  for (const id of held) {
    const segments = id.split("/");
    const [namespace] = segments;
    let candidate = null;
    if (namespace === "placement-sign" || namespace === "composite-sign") {
      const partner = axisPartner(segments[1]);
      const flipped = oppositeSign(segments[2]);
      if (partner && flipped) candidate = `${namespace}/${partner}/${flipped}`;
    } else if (/^(natal|composite)-aspect$/u.test(namespace)) {
      const mirrored = mirroredAspect(segments[3]);
      for (const [point, other] of [[segments[1], segments[2]], [segments[2], segments[1]]]) {
        const partner = axisPartner(point);
        if (!partner || !mirrored) continue;
        const [x, y] = [partner, other].sort();
        candidate = `${namespace}/${x}/${y}/${mirrored}`;
        break;
      }
    }
    if (candidate && !held.has(candidate)) found.push({ derivedId: candidate, from: id });
  }
  return found;
}

module.exports = {
  OPPOSITE_SIGN,
  AXIS_PARTNER,
  MIRRORED_ASPECT,
  oppositeSign,
  axisPartner,
  mirroredAspect,
  deriveFromAxisPartner,
  derivableTargets
};
