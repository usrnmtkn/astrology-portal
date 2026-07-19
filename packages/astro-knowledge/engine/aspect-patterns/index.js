"use strict";

const {
  CANONICAL_PAIR_ORDER,
  shortestArc,
  normalizeDegrees
} = require("../timing/aspects");
const { SIGNS, TRADITIONAL_RULERS } = require("../timing/constants");

const PLANET_IDS = Object.freeze(CANONICAL_PAIR_ORDER.slice());
const PLANET_SET = new Set(PLANET_IDS);
const SUPPORTED_ASPECTS = Object.freeze([
  "opposition",
  "trine",
  "square",
  "sextile",
  "quincunx"
]);

const ASPECT_PATTERN_ANGLES = Object.freeze({
  opposition: 180,
  trine: 120,
  square: 90,
  sextile: 60,
  quincunx: 150
});

const DEFAULT_ORB_POLICY = Object.freeze({
  id: "natal_aspect_patterns_v1",
  aspects: Object.freeze({
    opposition: 8,
    square: 7,
    trine: 7,
    sextile: 5,
    quincunx: 3
  }),
  patternTolerance: 1,
  allowOutOfSign: true
});

const DEFAULT_RANKING_POLICY = Object.freeze({
  id: "natal_pattern_ranking_v1",
  version: "1.0.0",
  weights: Object.freeze({
    geometryConfidence: 1,
    tightness: 1,
    luminary: 8,
    personalPlanet: 4,
    angularity: 6,
    chartRuler: 7,
    repeatedPlanet: 2,
    parentPattern: 12,
    containedPattern: -4
  })
});
const ASPECT_PATTERN_DETECTOR_VERSION = "aspect_pattern_detector_v1";
const ASPECT_PATTERN_CONTEXT_BUILDER_VERSION = "aspect_pattern_interpretation_context_v1";
const ASPECT_PATTERN_COPY_RESOLVER_VERSION = "aspect_pattern_copy_resolver_v1";
const ASPECT_PATTERN_ACTIVATION_VERSION = "aspect_pattern_activation_v1";
const ASPECT_PATTERN_ACTIVATION_CONTEXT_BUILDER_VERSION = "aspect_pattern_activation_interpretation_context_v1";
const ASPECT_PATTERN_ACTIVATION_COPY_RESOLVER_VERSION = "aspect_pattern_activation_copy_resolver_v1";

const PERSONAL_PLANETS = new Set(["mercury", "venus", "mars"]);
const LUMINARIES = new Set(["sun", "moon"]);
const ANGULAR_ORB_DEGREES = 5;
const ACTIVATION_CONTEXT_COPY_JOBS = Object.freeze([
  "describe_current_emphasis",
  "name_transit_trigger",
  "explain_target_planet_role",
  "describe_timing_state"
]);
const ACTIVATION_CONTEXT_SHARED_COPY_JOB = "explain_shared_planet_fanout";
const ACTIVATION_CONTEXT_STRUCTURE_COPY_JOB = "preserve_parent_child_structure";
const ACTIVATION_CONTEXT_AVOID_CLAIMS = Object.freeze([
  "do_not_predict_event",
  "do_not_change_natal_geometry",
  "do_not_treat_activation_as_permanent",
  "do_not_claim_every_linked_pattern_is_equally_noticeable",
  "do_not_treat_score_as_life_importance"
]);
const ASPECT_PATTERN_ACTIVATION_CONTENT_LEVELS = Object.freeze([
  "authored",
  "source_grounded_template",
  "madlib_fallback",
  "emergency_fallback"
]);
const ACTIVATION_COPY_SECTION_IDS = Object.freeze([
  "current_emphasis",
  "transit_trigger",
  "pattern_role",
  "linked_patterns",
  "timing",
  "watch_for",
  "confidence_note"
]);
const APPROVED_ACTIVATION_COPY_SLOTS = Object.freeze([
  "pattern_name",
  "primary_moving_body",
  "primary_target_planet",
  "primary_aspect_name",
  "primary_aspect_with_article",
  "primary_target_role",
  "primary_orb",
  "trigger_count",
  "additional_moving_bodies",
  "targeted_planets",
  "timing_state",
  "exact_at",
  "shared_planet_fanout",
  "linked_pattern_names",
  "parent_pattern_name",
  "child_pattern_names",
  "pattern_confidence",
  "is_currently_primary"
]);
const TIMING_LANGUAGE = Object.freeze({
  exact: "This transit is at or near its closest contact.",
  applying: "This contact is still building.",
  separating: "The closest contact has passed, but you may still be noticing what it brought up.",
  mixed: "Several contacts are involved, and they are not all at the same stage."
});
const DEFAULT_ACTIVATION_POLICY = Object.freeze({
  id: "aspect_pattern_activation_v1",
  version: "1.0.0",
  weights: Object.freeze({
    aspects: Object.freeze({
      conjunction: 10,
      opposition: 9,
      square: 8,
      trine: 5,
      sextile: 4,
      quincunx: 6
    }),
    maximumOrb: 5,
    applying: 2,
    luminary: 3,
    repeatedPlanet: 2,
    parentPattern: 1,
    containedPattern: 1,
    roles: Object.freeze({
      apex: 4,
      focal_planet: 4,
      opposition_axis: 2,
      base: 1,
      resource_planet: 1,
      spine: 1
    })
  })
});
const COPY_CONTEXT_DERIVED_POINT_TYPES = new Set([
  "empty_leg",
  "fallout_point",
  "opposite_apex",
  "pattern_midpoint"
]);
const ASPECT_PATTERN_CONTENT_LEVELS = Object.freeze([
  "authored",
  "source_grounded_template",
  "madlib_fallback",
  "emergency_fallback"
]);
const COPY_SECTION_IDS = Object.freeze([
  "how_it_works",
  "planet_roles",
  "pressure_or_support",
  "derived_point",
  "watch_for",
  "confidence_note"
]);
const APPROVED_COPY_SLOTS = Object.freeze([
  "pattern_name",
  "member_planets",
  "member_count",
  "apex_planet",
  "base_planets",
  "opposition_axis_one",
  "opposition_axis_two",
  "focal_planet",
  "opposed_trine_planet",
  "resource_planets",
  "empty_leg_sign",
  "empty_leg_house",
  "fallout_sign",
  "fallout_house",
  "element_consistency",
  "rectangle_variant",
  "confidence",
  "maximum_orb",
  "is_primary",
  "parent_pattern_name",
  "child_pattern_names"
]);

const PATTERN_COPY_JOBS = Object.freeze({
  t_square: Object.freeze({
    primaryJob: "Explain how the opposition creates recurring pressure that is acted through the apex.",
    supportingJobs: Object.freeze([
      "Name both ends of the opposition.",
      "Explain the apex as the place where the person is most likely to act.",
      "Describe the empty leg as an underused response, not a guaranteed solution."
    ]),
    avoidClaims: Object.freeze([
      "Do not call the apex the only outlet.",
      "Do not predict constant crisis.",
      "Do not treat the empty leg as another natal planet."
    ])
  }),
  grand_square: Object.freeze({
    primaryJob: "Explain how pressure moves among four connected planetary functions.",
    supportingJobs: Object.freeze([
      "Name both opposition axes.",
      "Explain that resolving one side may bring another side into focus.",
      "Describe endurance as a possibility, not a guaranteed strength."
    ]),
    avoidClaims: Object.freeze([
      "Do not assign one permanent apex.",
      "Do not write four separate T-square summaries as the main interpretation.",
      "Do not predict unavoidable crisis."
    ])
  }),
  grand_trine: Object.freeze({
    primaryJob: "Explain how three planetary functions cooperate with relatively little friction.",
    supportingJobs: Object.freeze([
      "Name what may come naturally.",
      "Explain that ease may reduce urgency.",
      "Mention element consistency only when established by the geometry."
    ]),
    avoidClaims: Object.freeze([
      "Do not promise talent, success, or genius.",
      "Do not describe ease as universally beneficial.",
      "Do not invent a missing challenge."
    ])
  }),
  kite: Object.freeze({
    primaryJob: "Explain how the opposition gives direction to the underlying Grand Trine.",
    supportingJobs: Object.freeze([
      "Name the focal planet and opposed trine planet.",
      "Explain the resource planets as supportive routes.",
      "Preserve the underlying Grand Trine as a separate child pattern."
    ]),
    avoidClaims: Object.freeze([
      "Do not treat the focal planet as equivalent to a T-square apex.",
      "Do not erase the opposition.",
      "Do not guarantee productive use of the trines."
    ])
  }),
  yod: Object.freeze({
    primaryJob: "Explain how two planets that work together require repeated adjustment through the apex.",
    supportingJobs: Object.freeze([
      "Name the sextile base.",
      "Name the apex.",
      "Explain the fallout point as a derived point opposite the apex.",
      "Emphasize timing and repeated recalibration."
    ]),
    avoidClaims: Object.freeze([
      "Do not use fate, destiny, or Finger of God language.",
      "Do not treat the fallout point as a natal placement.",
      "Do not promise a single final resolution."
    ])
  }),
  mystic_rectangle: Object.freeze({
    primaryJob: "Explain how two oppositions are connected through supportive routes.",
    supportingJobs: Object.freeze([
      "Name both opposition axes.",
      "Explain how trines and sextiles help movement between the two polarities.",
      "Preserve both sides of each opposition."
    ]),
    avoidClaims: Object.freeze([
      "Do not assign an apex.",
      "Do not describe the pattern as automatically balanced.",
      "Do not erase the tension of the oppositions."
    ])
  })
});
const PATTERN_DISPLAY_NAMES = Object.freeze({
  t_square: "T-square",
  grand_square: "Grand Square",
  grand_trine: "Grand Trine",
  kite: "Kite",
  yod: "Yod",
  mystic_rectangle: "Mystic Rectangle"
});
const AUTHORED_ASPECT_PATTERN_RECORDS = Object.freeze(buildAuthoredAspectPatternRecords());
const GOVERNED_COPY_RECORDS = Object.freeze(buildDefaultCopyRecords());
const GOVERNED_ACTIVATION_COPY_RECORDS = Object.freeze(buildDefaultActivationCopyRecords());
const AUTHORED_ASPECT_PATTERN_ACTIVATION_RECORDS = Object.freeze(buildAuthoredAspectPatternActivationRecords());

const ELEMENT_BY_SIGN = Object.freeze({
  aries: "fire",
  leo: "fire",
  sagittarius: "fire",
  taurus: "earth",
  virgo: "earth",
  capricorn: "earth",
  gemini: "air",
  libra: "air",
  aquarius: "air",
  cancer: "water",
  scorpio: "water",
  pisces: "water"
});

function normalizeToken(value) {
  if (typeof value !== "string") return null;
  return value.trim().toLowerCase().replaceAll("-", "_").replaceAll(" ", "_");
}

function planetRank(planet) {
  const index = PLANET_IDS.indexOf(planet);
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

function canonicalPlanets(planets) {
  return planets.map(normalizeToken).sort((a, b) => planetRank(a) - planetRank(b));
}

function canonicalPair(pointA, pointB) {
  return canonicalPlanets([pointA, pointB]);
}

function pairKey(pointA, pointB) {
  return canonicalPair(pointA, pointB).join("|");
}

function edgeKey(pointA, pointB, type) {
  return `${pairKey(pointA, pointB)}|${type}`;
}

function unique(values) {
  return [...new Set(values)];
}

function combinations(items, size) {
  const result = [];
  function visit(start, combo) {
    if (combo.length === size) {
      result.push(combo);
      return;
    }
    for (let index = start; index <= items.length - (size - combo.length); index += 1) {
      visit(index + 1, combo.concat(items[index]));
    }
  }
  visit(0, []);
  return result;
}

function signForLongitude(longitude) {
  return SIGNS[Math.floor(normalizeDegrees(longitude) / 30)];
}

function makeZodiacPoint(longitude, planetById) {
  const normalized = roundNumber(normalizeDegrees(longitude));
  const house = inferHouse(normalized, planetById);
  const point = {
    longitude: normalized,
    sign: signForLongitude(normalized)
  };
  if (house !== undefined) point.house = house;
  return point;
}

function inferHouse() {
  return undefined;
}

function oppositePoint(planet, planetById) {
  const source = planetById.get(planet);
  if (!source || typeof source.longitude !== "number") {
    throw new Error(`Cannot derive opposite point without longitude for ${planet}`);
  }
  return makeZodiacPoint(source.longitude + 180, planetById);
}

function roundNumber(value) {
  return Number(value.toFixed(6));
}

function normalizeOrbPolicy(policy) {
  const merged = {
    ...DEFAULT_ORB_POLICY,
    ...(policy || {}),
    aspects: {
      ...DEFAULT_ORB_POLICY.aspects,
      ...((policy && policy.aspects) || {})
    }
  };
  return Object.freeze({
    id: merged.id,
    aspects: Object.freeze({ ...merged.aspects }),
    patternTolerance: merged.patternTolerance,
    allowOutOfSign: Boolean(merged.allowOutOfSign)
  });
}

function normalizePlanet(input) {
  const id = normalizeToken(input && (input.id || input.planet || input.name));
  if (!PLANET_SET.has(id)) return null;
  const longitude = typeof input.longitude === "number"
    ? input.longitude
    : typeof input.degrees === "number"
      ? input.degrees
      : undefined;
  const planet = { id };
  if (typeof longitude === "number") planet.longitude = normalizeDegrees(longitude);
  if (typeof input.sign === "string") planet.sign = normalizeToken(input.sign);
  if (typeof input.house === "number") planet.house = input.house;
  return planet;
}

function normalizeAspect(input, index, orbPolicy) {
  const pointA = normalizeToken(input.pointA || input.bodyA || input.planetA || input.from);
  const pointB = normalizeToken(input.pointB || input.bodyB || input.planetB || input.to);
  const type = normalizeToken(input.type || input.aspect);
  const id = String(input.id || `${pointA || "unknown"}_${pointB || "unknown"}_${type || "aspect"}_${index}`);

  if (!PLANET_SET.has(pointA) || !PLANET_SET.has(pointB)) {
    return {
      skipped: true,
      aspectId: id,
      reason: "non_planet_pattern_member"
    };
  }

  if (!SUPPORTED_ASPECTS.includes(type)) {
    return {
      skipped: true,
      aspectId: id,
      reason: "unsupported_aspect_type"
    };
  }

  if (input.outOfSign && !orbPolicy.allowOutOfSign) {
    return {
      skipped: true,
      aspectId: id,
      reason: "out_of_sign_not_allowed"
    };
  }

  const orb = typeof input.orb === "number"
    ? input.orb
    : typeof input.orbDegrees === "number"
      ? input.orbDegrees
      : 0;
  const cap = orbPolicy.aspects[type];
  const outOfPolicyRange = orb > cap + orbPolicy.patternTolerance;
  if (outOfPolicyRange) {
    return {
      skipped: true,
      aspectId: id,
      reason: "outside_orb_policy"
    };
  }

  const [first, second] = canonicalPair(pointA, pointB);
  return {
    skipped: false,
    aspect: {
      id,
      pointA: first,
      pointB: second,
      type,
      exactAngle: typeof input.exactAngle === "number" ? input.exactAngle : ASPECT_PATTERN_ANGLES[type],
      orb: roundNumber(Math.abs(orb)),
      applying: Boolean(input.applying),
      outOfSign: Boolean(input.outOfSign),
      partial: Boolean(input.partial) || orb > cap
    }
  };
}

function buildAspectGraph(input = {}, policy = DEFAULT_ORB_POLICY) {
  const orbPolicy = normalizeOrbPolicy(policy);
  const planets = Array.isArray(input.planets) ? input.planets : [];
  const aspects = Array.isArray(input.aspects) ? input.aspects : [];
  const planetById = new Map();
  for (const planetInput of planets) {
    const planet = normalizePlanet(planetInput);
    if (planet) planetById.set(planet.id, planet);
  }

  const skippedAspects = [];
  const aspectByKey = new Map();
  for (let index = 0; index < aspects.length; index += 1) {
    const normalized = normalizeAspect(aspects[index], index, orbPolicy);
    if (normalized.skipped) {
      skippedAspects.push({
        aspectId: normalized.aspectId,
        reason: normalized.reason
      });
      continue;
    }

    const aspect = normalized.aspect;
    const key = edgeKey(aspect.pointA, aspect.pointB, aspect.type);
    const existing = aspectByKey.get(key);
    if (!existing || aspect.orb < existing.orb || (aspect.orb === existing.orb && aspect.id < existing.id)) {
      aspectByKey.set(key, aspect);
    }
    if (!planetById.has(aspect.pointA)) planetById.set(aspect.pointA, { id: aspect.pointA });
    if (!planetById.has(aspect.pointB)) planetById.set(aspect.pointB, { id: aspect.pointB });
  }

  return {
    orbPolicy,
    planetById,
    aspectByKey,
    skippedAspects,
    inputPlanetCount: planets.length,
    inputAspectCount: aspects.length
  };
}

function getAspect(graph, pointA, pointB, type) {
  return graph.aspectByKey.get(edgeKey(pointA, pointB, type)) || null;
}

function aspectsForPairs(graph, requirements) {
  const aspects = [];
  for (const [pointA, pointB, type] of requirements) {
    const aspect = getAspect(graph, pointA, pointB, type);
    if (!aspect) return null;
    aspects.push(aspect);
  }
  return aspects;
}

function geometryFor(aspects, orbPolicy) {
  const source = aspects.slice().sort((a, b) => a.id.localeCompare(b.id));
  const orbs = source.map((aspect) => aspect.orb);
  const maximumOrb = Math.max(...orbs);
  const averageOrb = orbs.reduce((total, orb) => total + orb, 0) / orbs.length;
  const partial = source.some((aspect) => aspect.partial);
  const outOfSign = source.some((aspect) => aspect.outOfSign);
  const warnings = [];
  if (partial) warnings.push("partial_pattern_from_policy_tolerance");
  if (outOfSign) warnings.push("out_of_sign_pattern");

  const ratios = source.map((aspect) => {
    const cap = orbPolicy.aspects[aspect.type] || 1;
    return cap === 0 ? 1 : aspect.orb / cap;
  });
  const maxRatio = Math.max(...ratios);
  let confidence = "exact";
  if (partial) {
    confidence = "partial";
  } else if (maxRatio > 0.7) {
    confidence = "wide";
    warnings.push("wide_orb_pattern");
  } else if (maxRatio > 0.25) {
    confidence = "strong";
  }

  return {
    orbPolicyId: orbPolicy.id,
    maximumOrb: roundNumber(maximumOrb),
    averageOrb: roundNumber(averageOrb),
    weakestAspectOrb: roundNumber(maximumOrb),
    isOutOfSign: outOfSign,
    confidence,
    warnings: unique(warnings).sort()
  };
}

function sourceIds(aspects) {
  return aspects.map((aspect) => aspect.id).sort();
}

function makePattern(type, planets, sourceAspects, roles, derivedPoints, geometry) {
  const sortedPlanets = canonicalPlanets(planets);
  return {
    id: patternId(type, roles, sortedPlanets),
    type,
    planets: sortedPlanets,
    sourceAspectIds: sourceIds(sourceAspects),
    roles,
    derivedPoints: derivedPoints.slice().sort((a, b) => {
      const typeOrder = a.type.localeCompare(b.type);
      return typeOrder || a.longitude - b.longitude;
    }),
    geometry
  };
}

function patternId(type, roles, sortedPlanets) {
  if (type === "t_square") {
    return `aspect-pattern:${type}:${roles.oppositionAxis.join("-")}:apex-${roles.apex}`;
  }
  if (type === "yod") {
    return `aspect-pattern:${type}:${roles.basePlanets.join("-")}:apex-${roles.apex}`;
  }
  if (type === "kite") {
    return `aspect-pattern:${type}:${roles.grandTrinePlanets.join("-")}:focal-${roles.focalPlanet}`;
  }
  if (type === "mystic_rectangle") {
    return `aspect-pattern:${type}:${roles.oppositionAxes.map((axis) => axis.join("-")).join("_")}`;
  }
  return `aspect-pattern:${type}:${sortedPlanets.join("-")}`;
}

function dedupePatterns(patterns) {
  const byId = new Map();
  for (const pattern of patterns) {
    const existing = byId.get(pattern.id);
    if (!existing || comparePatternQuality(pattern, existing) < 0) {
      byId.set(pattern.id, pattern);
    }
  }
  return [...byId.values()].sort(comparePattern);
}

function comparePatternQuality(a, b) {
  const confidenceOrder = { exact: 0, strong: 1, wide: 2, partial: 3 };
  return (confidenceOrder[a.geometry.confidence] - confidenceOrder[b.geometry.confidence])
    || (a.geometry.maximumOrb - b.geometry.maximumOrb)
    || a.id.localeCompare(b.id);
}

function comparePattern(a, b) {
  return a.id.localeCompare(b.id);
}

function detectTSquares(graph) {
  const patterns = [];
  const planets = canonicalPlanets([...graph.planetById.keys()]);
  for (const trio of combinations(planets, 3)) {
    for (const oppositionAxis of combinations(trio, 2)) {
      const [first, second] = oppositionAxis;
      const apex = trio.find((planet) => planet !== first && planet !== second);
      const aspects = aspectsForPairs(graph, [
        [first, second, "opposition"],
        [apex, first, "square"],
        [apex, second, "square"]
      ]);
      if (!aspects) continue;
      const axis = canonicalPair(first, second);
      const emptyLeg = oppositePoint(apex, graph.planetById);
      const roles = {
        type: "t_square",
        oppositionAxis: axis,
        apex,
        emptyLeg
      };
      patterns.push(makePattern(
        "t_square",
        trio,
        aspects,
        roles,
        [{ type: "empty_leg", ...emptyLeg }, { type: "opposite_apex", ...emptyLeg }],
        geometryFor(aspects, graph.orbPolicy)
      ));
    }
  }
  return patterns;
}

function detectGrandSquares(graph) {
  const patterns = [];
  const planets = canonicalPlanets([...graph.planetById.keys()]);
  for (const quad of combinations(planets, 4)) {
    const oppositions = combinations(quad, 2).filter(([a, b]) => getAspect(graph, a, b, "opposition"));
    if (oppositions.length !== 2) continue;
    const used = new Set(oppositions.flat());
    if (used.size !== 4) continue;
    const squarePairs = combinations(quad, 2).filter(([a, b]) => !oppositions.some((axis) => axis.includes(a) && axis.includes(b)));
    const squareAspects = squarePairs.map(([a, b]) => getAspect(graph, a, b, "square"));
    if (squareAspects.some((aspect) => !aspect)) continue;
    const oppositionAspects = oppositions.map(([a, b]) => getAspect(graph, a, b, "opposition"));
    const aspects = squareAspects.concat(oppositionAspects);
    const axes = oppositions
      .map(([a, b]) => canonicalPair(a, b))
      .sort((a, b) => a.join("-").localeCompare(b.join("-")));
    const roles = {
      type: "grand_square",
      planets: quad,
      oppositionAxes: axes
    };
    patterns.push(makePattern("grand_square", quad, aspects, roles, [], geometryFor(aspects, graph.orbPolicy)));
  }
  return patterns;
}

function detectGrandTrines(graph) {
  const patterns = [];
  const planets = canonicalPlanets([...graph.planetById.keys()]);
  for (const trio of combinations(planets, 3)) {
    const aspects = aspectsForPairs(graph, [
      [trio[0], trio[1], "trine"],
      [trio[0], trio[2], "trine"],
      [trio[1], trio[2], "trine"]
    ]);
    if (!aspects) continue;
    const roles = {
      type: "grand_trine",
      planets: trio,
      elementConsistency: elementConsistency(trio, graph.planetById, aspects)
    };
    patterns.push(makePattern("grand_trine", trio, aspects, roles, [], geometryFor(aspects, graph.orbPolicy)));
  }
  return patterns;
}

function elementConsistency(planets, planetById, aspects) {
  if (aspects.some((aspect) => aspect.outOfSign)) return "out_of_sign";
  const elements = planets.map((planet) => ELEMENT_BY_SIGN[planetById.get(planet) && planetById.get(planet).sign]).filter(Boolean);
  if (elements.length !== planets.length) return "mixed_element";
  return new Set(elements).size === 1 ? "same_element" : "mixed_element";
}

function detectKites(graph) {
  const patterns = [];
  const grandTrines = detectGrandTrines(graph);
  const planets = canonicalPlanets([...graph.planetById.keys()]);
  for (const trine of grandTrines) {
    const trinePlanets = trine.roles.planets;
    const outsidePlanets = planets.filter((planet) => !trinePlanets.includes(planet));
    for (const focalPlanet of outsidePlanets) {
      for (const opposedTrinePlanet of trinePlanets) {
        const resourcePlanets = trinePlanets.filter((planet) => planet !== opposedTrinePlanet);
        const aspects = aspectsForPairs(graph, [
          [focalPlanet, opposedTrinePlanet, "opposition"],
          [focalPlanet, resourcePlanets[0], "sextile"],
          [focalPlanet, resourcePlanets[1], "sextile"],
          [trinePlanets[0], trinePlanets[1], "trine"],
          [trinePlanets[0], trinePlanets[2], "trine"],
          [trinePlanets[1], trinePlanets[2], "trine"]
        ]);
        if (!aspects) continue;
        const roles = {
          type: "kite",
          grandTrinePlanets: trinePlanets,
          focalPlanet,
          opposedTrinePlanet,
          spine: canonicalPair(focalPlanet, opposedTrinePlanet),
          resourcePlanets: canonicalPlanets(resourcePlanets)
        };
        patterns.push(makePattern("kite", trinePlanets.concat(focalPlanet), aspects, roles, [], geometryFor(aspects, graph.orbPolicy)));
      }
    }
  }
  return patterns;
}

function detectYods(graph) {
  const patterns = [];
  const planets = canonicalPlanets([...graph.planetById.keys()]);
  for (const trio of combinations(planets, 3)) {
    for (const basePlanets of combinations(trio, 2)) {
      const apex = trio.find((planet) => !basePlanets.includes(planet));
      const aspects = aspectsForPairs(graph, [
        [basePlanets[0], basePlanets[1], "sextile"],
        [apex, basePlanets[0], "quincunx"],
        [apex, basePlanets[1], "quincunx"]
      ]);
      if (!aspects) continue;
      const base = canonicalPlanets(basePlanets);
      const falloutPoint = oppositePoint(apex, graph.planetById);
      const roles = {
        type: "yod",
        basePlanets: base,
        apex,
        falloutPoint
      };
      patterns.push(makePattern(
        "yod",
        trio,
        aspects,
        roles,
        [{ type: "fallout_point", ...falloutPoint }, { type: "opposite_apex", ...falloutPoint }],
        geometryFor(aspects, graph.orbPolicy)
      ));
    }
  }
  return patterns;
}

function detectMysticRectangles(graph) {
  const patterns = [];
  const planets = canonicalPlanets([...graph.planetById.keys()]);
  for (const quad of combinations(planets, 4)) {
    const oppositions = combinations(quad, 2).filter(([a, b]) => getAspect(graph, a, b, "opposition"));
    if (oppositions.length !== 2) continue;
    const used = new Set(oppositions.flat());
    if (used.size !== 4) continue;

    const sidePairs = combinations(quad, 2).filter(([a, b]) => !oppositions.some((axis) => axis.includes(a) && axis.includes(b)));
    const sideAspects = sidePairs.map(([a, b]) => getAspect(graph, a, b, "trine") || getAspect(graph, a, b, "sextile"));
    if (sideAspects.some((aspect) => !aspect)) continue;
    const sideTypes = sideAspects.map((aspect) => aspect.type).sort();
    if (sideTypes.join(",") !== "sextile,sextile,trine,trine") continue;

    const aspects = oppositions.map(([a, b]) => getAspect(graph, a, b, "opposition")).concat(sideAspects);
    const axes = oppositions
      .map(([a, b]) => canonicalPair(a, b))
      .sort((a, b) => a.join("-").localeCompare(b.join("-")));
    const roles = {
      type: "mystic_rectangle",
      oppositionAxes: axes,
      supportiveAspects: sideAspects
        .slice()
        .sort((a, b) => a.id.localeCompare(b.id))
        .map(copyAspect),
      variant: "trine_sextile"
    };
    patterns.push(makePattern("mystic_rectangle", quad, aspects, roles, [], geometryFor(aspects, graph.orbPolicy)));
  }
  return patterns;
}

function copyAspect(aspect) {
  return {
    id: aspect.id,
    pointA: aspect.pointA,
    pointB: aspect.pointB,
    type: aspect.type,
    exactAngle: aspect.exactAngle,
    orb: aspect.orb,
    applying: aspect.applying,
    outOfSign: aspect.outOfSign
  };
}

function detectPatterns(input = {}, policy = DEFAULT_ORB_POLICY) {
  const graph = buildAspectGraph(input, policy);
  const patterns = dedupePatterns([
    ...detectGrandSquares(graph),
    ...detectTSquares(graph),
    ...detectGrandTrines(graph),
    ...detectKites(graph),
    ...detectYods(graph),
    ...detectMysticRectangles(graph)
  ]);
  const relationships = buildRelationships(patterns);
  return sortDetectionResult({
    orbPolicyId: graph.orbPolicy.id,
    patterns,
    relationships,
    diagnostics: {
      inputPlanetCount: graph.inputPlanetCount,
      inputAspectCount: graph.inputAspectCount,
      eligibleAspectCount: graph.aspectByKey.size,
      skippedAspects: graph.skippedAspects.sort((a, b) => a.aspectId.localeCompare(b.aspectId)),
      warnings: collectWarnings(patterns, graph.skippedAspects)
    }
  });
}

function collectWarnings(patterns, skippedAspects) {
  return unique(patterns.flatMap((pattern) => pattern.geometry.warnings)
    .concat(skippedAspects.length ? ["some_aspects_skipped"] : []))
    .sort();
}

function buildRelationships(patterns) {
  const relationships = [];
  const byType = new Map();
  for (const pattern of patterns) {
    if (!byType.has(pattern.type)) byType.set(pattern.type, []);
    byType.get(pattern.type).push(pattern);
  }

  for (const grandSquare of byType.get("grand_square") || []) {
    for (const tSquare of byType.get("t_square") || []) {
      if (isSubset(tSquare.planets, grandSquare.planets)) {
        relationships.push({
          parentPatternId: grandSquare.id,
          childPatternId: tSquare.id,
          relationship: "contains"
        });
      }
    }
  }

  for (const kite of byType.get("kite") || []) {
    for (const grandTrine of byType.get("grand_trine") || []) {
      if (sameSet(kite.roles.grandTrinePlanets, grandTrine.planets)) {
        relationships.push({
          parentPatternId: kite.id,
          childPatternId: grandTrine.id,
          relationship: "contains"
        });
        relationships.push({
          parentPatternId: kite.id,
          childPatternId: grandTrine.id,
          relationship: "completes"
        });
      }
    }
  }

  for (const [first, second] of combinations(patterns, 2)) {
    const sharedPlanets = intersection(first.planets, second.planets);
    if (sharedPlanets.length > 0) {
      relationships.push(orderedRelationship(first.id, second.id, "shares_planet"));
    }
    const sharedAspects = intersection(first.sourceAspectIds, second.sourceAspectIds);
    if (sharedAspects.length > 0) {
      relationships.push(orderedRelationship(first.id, second.id, "shares_aspect"));
    }
  }

  return dedupeRelationships(relationships);
}

function orderedRelationship(firstId, secondId, relationship) {
  return firstId <= secondId
    ? { parentPatternId: firstId, childPatternId: secondId, relationship }
    : { parentPatternId: secondId, childPatternId: firstId, relationship };
}

function dedupeRelationships(relationships) {
  const byKey = new Map();
  for (const relationship of relationships) {
    const key = `${relationship.parentPatternId}|${relationship.childPatternId}|${relationship.relationship}`;
    byKey.set(key, relationship);
  }
  return [...byKey.values()].sort((a, b) => {
    return a.parentPatternId.localeCompare(b.parentPatternId)
      || a.childPatternId.localeCompare(b.childPatternId)
      || a.relationship.localeCompare(b.relationship);
  });
}

function intersection(first, second) {
  const secondSet = new Set(second);
  return first.filter((value) => secondSet.has(value));
}

function isSubset(first, second) {
  const secondSet = new Set(second);
  return first.every((value) => secondSet.has(value));
}

function sameSet(first, second) {
  return first.length === second.length && isSubset(first, second);
}

function sortDetectionResult(result) {
  return {
    ...result,
    patterns: result.patterns.slice().sort(comparePattern),
    relationships: result.relationships.slice(),
    diagnostics: {
      ...result.diagnostics,
      skippedAspects: result.diagnostics.skippedAspects.slice().sort((a, b) => a.aspectId.localeCompare(b.aspectId)),
      warnings: result.diagnostics.warnings.slice().sort()
    }
  };
}

function normalizeRankingPolicy(policy) {
  const merged = {
    ...DEFAULT_RANKING_POLICY,
    ...(policy || {}),
    weights: {
      ...DEFAULT_RANKING_POLICY.weights,
      ...((policy && policy.weights) || {})
    }
  };
  return Object.freeze({
    id: merged.id,
    version: merged.version,
    weights: Object.freeze({ ...merged.weights })
  });
}

function confidenceValue(confidence) {
  return {
    exact: 30,
    strong: 22,
    wide: 12,
    partial: 4
  }[confidence] || 0;
}

function scoreGeometry(pattern, weights) {
  const reasons = [];
  const confidenceScore = confidenceValue(pattern.geometry.confidence) * weights.geometryConfidence;
  const tightnessScore = Math.max(0, 10 - pattern.geometry.maximumOrb) * weights.tightness;
  const value = roundNumber(confidenceScore + tightnessScore);
  if (value !== 0) {
    reasons.push({
      code: "tight_geometry",
      value
    });
  }
  return { value, reasons };
}

function normalizeRankingContext(context = {}) {
  const planetById = new Map();
  const planets = Array.isArray(context.planets) ? context.planets : [];
  for (const input of planets) {
    const planet = normalizePlanet(input);
    if (planet) planetById.set(planet.id, planet);
  }

  const ascendantSign = normalizeToken(context.ascendantSign || context.ascendant);
  const chartRuler = normalizeToken(context.chartRuler || context.ascendantRuler || (ascendantSign && TRADITIONAL_RULERS[ascendantSign]));
  const angles = normalizeAngles(context);

  return {
    planetById,
    chartRuler: PLANET_SET.has(chartRuler) ? chartRuler : null,
    angles
  };
}

function normalizeAngles(context) {
  const angles = [];
  const pushAngle = (angle, longitude) => {
    if (typeof longitude === "number" && Number.isFinite(longitude)) {
      angles.push({ angle, longitude: normalizeDegrees(longitude) });
    }
  };
  pushAngle("asc", context.ascendantLongitude);
  pushAngle("mc", context.midheavenLongitude);
  pushAngle("dsc", context.descendantLongitude);
  pushAngle("ic", context.imumCoeliLongitude || context.icLongitude);

  if (typeof context.ascendantLongitude === "number" && !angles.some((angle) => angle.angle === "dsc")) {
    pushAngle("dsc", context.ascendantLongitude + 180);
  }
  if (typeof context.midheavenLongitude === "number" && !angles.some((angle) => angle.angle === "ic")) {
    pushAngle("ic", context.midheavenLongitude + 180);
  }

  return angles;
}

function repeatedPlanetCounts(patterns) {
  const counts = new Map();
  for (const pattern of patterns) {
    for (const planet of pattern.planets) {
      counts.set(planet, (counts.get(planet) || 0) + 1);
    }
  }
  return counts;
}

function scoreNatalProminence(pattern, patterns, rankingContext, weights) {
  const reasons = [];
  let value = 0;
  const repeatedCounts = repeatedPlanetCounts(patterns);

  for (const planet of pattern.planets) {
    if (planet === "sun") {
      value += weights.luminary;
      reasons.push({ code: "contains_sun", planet, value: weights.luminary });
    } else if (planet === "moon") {
      value += weights.luminary;
      reasons.push({ code: "contains_moon", planet, value: weights.luminary });
    } else if (PERSONAL_PLANETS.has(planet)) {
      value += weights.personalPlanet;
      reasons.push({ code: "contains_personal_planet", planet, value: weights.personalPlanet });
    }

    if (rankingContext.chartRuler && planet === rankingContext.chartRuler) {
      value += weights.chartRuler;
      reasons.push({ code: "contains_chart_ruler", planet, value: weights.chartRuler });
    }

    const repeatedCount = repeatedCounts.get(planet) || 0;
    if (repeatedCount > 1) {
      const repeatedValue = weights.repeatedPlanet * (repeatedCount - 1);
      value += repeatedValue;
      reasons.push({ code: "repeated_planet", planet, value: repeatedValue });
    }

    const angularValue = angularityValue(planet, rankingContext, weights);
    if (angularValue > 0) {
      value += angularValue;
      reasons.push({ code: "planet_near_angle", planet, value: angularValue });
    }
  }

  reasons.sort(compareReasons);
  return { value: roundNumber(value), reasons };
}

function angularityValue(planet, rankingContext, weights) {
  const position = rankingContext.planetById.get(planet);
  if (!position || typeof position.longitude !== "number" || rankingContext.angles.length === 0) return 0;
  const nearest = Math.min(...rankingContext.angles.map((angle) => shortestArc(position.longitude, angle.longitude)));
  if (nearest > ANGULAR_ORB_DEGREES) return 0;
  return roundNumber(weights.angularity * ((ANGULAR_ORB_DEGREES - nearest) / ANGULAR_ORB_DEGREES));
}

function scoreStructuralContext(pattern, relationships, weights) {
  const reasons = [];
  let value = 0;
  const isParent = relationships.some((relationship) => relationship.parentPatternId === pattern.id && relationship.relationship === "contains");
  const isContained = relationships.some((relationship) => relationship.childPatternId === pattern.id && relationship.relationship === "contains");

  if (isParent) {
    value += weights.parentPattern;
    reasons.push({ code: "parent_pattern", value: weights.parentPattern });
  }

  if (isContained) {
    value += weights.containedPattern;
    reasons.push({ code: "contained_pattern", value: weights.containedPattern });
  }

  return { value: roundNumber(value), reasons };
}

function compareReasons(first, second) {
  return first.code.localeCompare(second.code)
    || String(first.planet || "").localeCompare(String(second.planet || ""))
    || first.value - second.value;
}

function rankAspectPatterns(detectionResult, context = {}, policy = DEFAULT_RANKING_POLICY) {
  const rankingPolicy = normalizeRankingPolicy(policy);
  const patterns = Array.isArray(detectionResult && detectionResult.patterns) ? detectionResult.patterns : [];
  const relationships = Array.isArray(detectionResult && detectionResult.relationships) ? detectionResult.relationships : [];
  const rankingContext = normalizeRankingContext(context);

  const rankings = patterns.map((pattern) => {
    const geometry = scoreGeometry(pattern, rankingPolicy.weights);
    const natalProminence = scoreNatalProminence(pattern, patterns, rankingContext, rankingPolicy.weights);
    const structuralContext = scoreStructuralContext(pattern, relationships, rankingPolicy.weights);
    const baseDisplayPriority = roundNumber(geometry.value + natalProminence.value + structuralContext.value);

    return {
      patternId: pattern.id,
      score: {
        geometry: geometry.value,
        natalProminence: natalProminence.value,
        structuralContext: structuralContext.value,
        baseDisplayPriority
      },
      reasons: geometry.reasons
        .concat(natalProminence.reasons)
        .concat(structuralContext.reasons)
        .sort(compareReasons)
    };
  }).sort((first, second) => {
    return second.score.baseDisplayPriority - first.score.baseDisplayPriority
      || second.score.geometry - first.score.geometry
      || first.patternId.localeCompare(second.patternId);
  });

  return {
    policyId: rankingPolicy.id,
    rankings,
    displayOrder: rankings.map((ranking) => ranking.patternId)
  };
}

function buildAspectPatternInterpretationContexts(detectionResult, context = {}) {
  const patterns = Array.isArray(detectionResult && detectionResult.patterns) ? detectionResult.patterns : [];
  const relationships = Array.isArray(detectionResult && detectionResult.relationships) ? detectionResult.relationships : [];
  const ranking = context.ranking || (detectionResult && detectionResult.ranking);
  const rankingContext = normalizeRankingContext(context);
  const patternById = new Map(patterns.map((pattern) => [pattern.id, pattern]));
  const rankingById = new Map((ranking && Array.isArray(ranking.rankings) ? ranking.rankings : []).map((item) => [item.patternId, item]));
  const displayOrder = ranking && Array.isArray(ranking.displayOrder)
    ? ranking.displayOrder.filter((patternId) => patternById.has(patternId))
    : patterns.map((pattern) => pattern.id);
  const orderedPatternIds = displayOrder.concat(patterns.map((pattern) => pattern.id).filter((patternId) => !displayOrder.includes(patternId)));

  return orderedPatternIds.map((patternId, index) => {
    const pattern = patternById.get(patternId);
    const patternRanking = rankingById.get(patternId) || emptyPatternRanking(patternId);
    const parentPatternIds = relationshipPatternIds(relationships, pattern.id, "parent");
    const childPatternIds = relationshipPatternIds(relationships, pattern.id, "child");
    const copyJob = PATTERN_COPY_JOBS[pattern.type] || {
      primaryJob: "Use only the supplied structured aspect-pattern facts.",
      supportingJobs: [],
      avoidClaims: ["Do not add claims that are not present in the structured facts."]
    };

    return {
      version: "1.0.0",
      patternId: pattern.id,
      patternType: pattern.type,
      display: {
        rank: index + 1,
        isPrimary: index === 0,
        isContained: relationships.some((relationship) => relationship.relationship === "contains" && relationship.childPatternId === pattern.id),
        parentPatternIds,
        childPatternIds
      },
      members: buildContextMembers(pattern, rankingContext),
      geometry: {
        confidence: pattern.geometry.confidence,
        maximumOrb: pattern.geometry.maximumOrb,
        averageOrb: pattern.geometry.averageOrb,
        warnings: pattern.geometry.warnings.slice(),
        sourceAspectIds: pattern.sourceAspectIds.slice()
      },
      roles: copyValue(pattern.roles),
      derivedPoints: pattern.derivedPoints
        .filter((point) => COPY_CONTEXT_DERIVED_POINT_TYPES.has(point.type))
        .map((point) => copyValue(point)),
      ranking: {
        geometry: patternRanking.score.geometry,
        natalProminence: patternRanking.score.natalProminence,
        structuralContext: patternRanking.score.structuralContext,
        baseDisplayPriority: patternRanking.score.baseDisplayPriority,
        reasons: copyValue(patternRanking.reasons)
      },
      copyInstructions: {
        primaryJob: copyJob.primaryJob,
        supportingJobs: copyJob.supportingJobs.slice(),
        avoidClaims: copyJob.avoidClaims.slice(),
        allowedCertainty: allowedCertaintyFor(pattern)
      },
      provenance: {
        detectorVersion: ASPECT_PATTERN_DETECTOR_VERSION,
        orbPolicyId: pattern.geometry.orbPolicyId || detectionResult.orbPolicyId,
        rankingPolicyId: ranking && ranking.policyId ? ranking.policyId : DEFAULT_RANKING_POLICY.id,
        contextBuilderVersion: ASPECT_PATTERN_CONTEXT_BUILDER_VERSION
      }
    };
  });
}

function emptyPatternRanking(patternId) {
  return {
    patternId,
    score: {
      geometry: 0,
      natalProminence: 0,
      structuralContext: 0,
      baseDisplayPriority: 0
    },
    reasons: []
  };
}

function relationshipPatternIds(relationships, patternId, direction) {
  const ids = relationships.flatMap((relationship) => {
    if (!["contains", "completes"].includes(relationship.relationship)) return [];
    if (direction === "parent" && relationship.childPatternId === patternId) return [relationship.parentPatternId];
    if (direction === "child" && relationship.parentPatternId === patternId) return [relationship.childPatternId];
    return [];
  });
  return unique(ids).sort();
}

function buildContextMembers(pattern, rankingContext) {
  return pattern.planets.map((planet) => {
    const source = rankingContext.planetById.get(planet) || { id: planet };
    const member = {
      planet,
      sign: source.sign || "unknown",
      longitude: typeof source.longitude === "number" ? roundNumber(source.longitude) : 0,
      roles: memberRolesFor(pattern, planet),
      isLuminary: LUMINARIES.has(planet),
      isPersonalPlanet: PERSONAL_PLANETS.has(planet)
    };
    if (typeof source.house === "number") member.house = source.house;
    if (rankingContext.chartRuler === planet) member.isChartRuler = true;
    const angularProximity = nearestAngularProximity(source, rankingContext);
    if (angularProximity) member.angularProximity = angularProximity;
    return member;
  });
}

function memberRolesFor(pattern, planet) {
  const roles = [];
  const push = (role) => {
    if (!roles.includes(role)) roles.push(role);
  };

  if (pattern.type === "t_square") {
    if (pattern.roles.apex === planet) push("apex");
    if (pattern.roles.oppositionAxis.includes(planet)) push("opposition_axis");
  } else if (pattern.type === "grand_square") {
    if (pattern.roles.oppositionAxes.some((axis) => axis.includes(planet))) push("opposition_axis");
  } else if (pattern.type === "kite") {
    if (pattern.roles.focalPlanet === planet) push("focal_planet");
    if (pattern.roles.spine.includes(planet)) push("spine");
    if (pattern.roles.resourcePlanets.includes(planet)) push("resource_planet");
  } else if (pattern.type === "yod") {
    if (pattern.roles.apex === planet) push("apex");
    if (pattern.roles.basePlanets.includes(planet)) push("base");
  } else if (pattern.type === "mystic_rectangle") {
    if (pattern.roles.oppositionAxes.some((axis) => axis.includes(planet))) push("opposition_axis");
  }

  return roles;
}

function nearestAngularProximity(position, rankingContext) {
  if (!position || typeof position.longitude !== "number" || rankingContext.angles.length === 0) return null;
  const nearest = rankingContext.angles
    .map((angle) => ({
      angle: angle.angle,
      orb: roundNumber(shortestArc(position.longitude, angle.longitude))
    }))
    .sort((a, b) => a.orb - b.orb || a.angle.localeCompare(b.angle))[0];
  return nearest && nearest.orb <= ANGULAR_ORB_DEGREES ? nearest : null;
}

function allowedCertaintyFor(pattern) {
  return pattern.geometry.confidence === "wide"
    || pattern.geometry.confidence === "partial"
    || pattern.geometry.warnings.length > 0
    ? "qualified"
    : "direct";
}

function copyValue(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeActivationPolicy(policy) {
  const weights = (policy && policy.weights) || {};
  return Object.freeze({
    id: (policy && policy.id) || DEFAULT_ACTIVATION_POLICY.id,
    version: (policy && policy.version) || DEFAULT_ACTIVATION_POLICY.version,
    weights: Object.freeze({
      aspects: Object.freeze({
        ...DEFAULT_ACTIVATION_POLICY.weights.aspects,
        ...(weights.aspects || {})
      }),
      maximumOrb: typeof weights.maximumOrb === "number" ? weights.maximumOrb : DEFAULT_ACTIVATION_POLICY.weights.maximumOrb,
      applying: typeof weights.applying === "number" ? weights.applying : DEFAULT_ACTIVATION_POLICY.weights.applying,
      luminary: typeof weights.luminary === "number" ? weights.luminary : DEFAULT_ACTIVATION_POLICY.weights.luminary,
      repeatedPlanet: typeof weights.repeatedPlanet === "number" ? weights.repeatedPlanet : DEFAULT_ACTIVATION_POLICY.weights.repeatedPlanet,
      parentPattern: typeof weights.parentPattern === "number" ? weights.parentPattern : DEFAULT_ACTIVATION_POLICY.weights.parentPattern,
      containedPattern: typeof weights.containedPattern === "number" ? weights.containedPattern : DEFAULT_ACTIVATION_POLICY.weights.containedPattern,
      roles: Object.freeze({
        ...DEFAULT_ACTIVATION_POLICY.weights.roles,
        ...(weights.roles || {})
      })
    })
  });
}

function normalizeActivationAspect(input, index) {
  if (!input || typeof input !== "object") return null;

  const movingBody = normalizeToken(input.movingBody || input.transitPlanet || input.transitingPlanet || input.bodyA || input.from);
  const targetNatalPlanet = normalizeToken(input.targetNatalPlanet || input.natalPoint || input.natalPlanet || input.bodyB || input.to || input.target);
  const aspectType = normalizeToken(input.aspectType || input.type || input.aspect);
  const orb = typeof input.orb === "number"
    ? input.orb
    : typeof input.orbValue === "number"
      ? input.orbValue
      : typeof input.orbDegrees === "number"
        ? input.orbDegrees
        : Number.parseFloat(String(input.orb ?? ""));

  if (!PLANET_SET.has(movingBody) || !PLANET_SET.has(targetNatalPlanet) || !aspectType || !Number.isFinite(orb)) {
    return null;
  }

  const applying = typeof input.applying === "boolean"
    ? input.applying
    : input.direction === "applying"
      ? true
      : input.direction === "separating"
        ? false
        : typeof input.conditions?.applying === "boolean"
          ? input.conditions.applying
          : false;
  const id = String(input.id || `transit.aspect.${movingBody}.${aspectType}.${targetNatalPlanet}.${index}`);

  return {
    sourceAspectId: id,
    movingBody,
    targetNatalPlanet,
    aspectType,
    orb: roundNumber(Math.max(0, orb)),
    applying,
    exactAt: typeof input.exactAt === "string" ? input.exactAt : typeof input.exact_at === "string" ? input.exact_at : undefined
  };
}

function relationshipContextFor(pattern, relationships) {
  return relationships.reduce((context, relationship) => {
    if (relationship.relationship !== "contains") return context;
    if (relationship.parentPatternId === pattern.id) context.isParent = true;
    if (relationship.childPatternId === pattern.id) context.isContained = true;
    return context;
  }, { isParent: false, isContained: false });
}

function activationLinkedPatternIds(pattern, targetNatalPlanet, patterns, relationships) {
  const ids = new Set();
  for (const candidate of patterns) {
    if (candidate.id !== pattern.id && Array.isArray(candidate.planets) && candidate.planets.includes(targetNatalPlanet)) {
      ids.add(candidate.id);
    }
  }
  for (const relationship of relationships) {
    if (!["contains", "completes"].includes(relationship.relationship)) continue;
    if (relationship.parentPatternId === pattern.id) ids.add(relationship.childPatternId);
    if (relationship.childPatternId === pattern.id) ids.add(relationship.parentPatternId);
  }
  return [...ids].sort();
}

function activationScoreFor({ aspect, pattern, targetRoles, repeatedCount, relationships }, policy) {
  const weights = policy.weights;
  const reasons = [];
  const aspectWeight = roundNumber(weights.aspects[aspect.aspectType] ?? 1);
  const exactnessWeight = roundNumber(Math.max(0, weights.maximumOrb - aspect.orb));
  const applyingWeight = aspect.applying ? weights.applying : 0;
  const roleWeight = roundNumber(targetRoles.reduce((total, role) => total + (weights.roles[role] || 0), 0));
  const sharedPlanetWeight = repeatedCount > 1 ? roundNumber(weights.repeatedPlanet * (repeatedCount - 1)) : 0;
  const structuralContext = relationshipContextFor(pattern, relationships);

  if (exactnessWeight > 0) reasons.push({ code: "exact_or_tight", value: exactnessWeight });
  if (applyingWeight > 0) reasons.push({ code: "applying", value: applyingWeight });
  if (targetRoles.includes("apex")) reasons.push({ code: "targets_apex", value: weights.roles.apex || 0 });
  if (targetRoles.includes("focal_planet")) reasons.push({ code: "targets_focal_planet", value: weights.roles.focal_planet || 0 });
  if (LUMINARIES.has(aspect.targetNatalPlanet)) reasons.push({ code: "targets_luminary", value: weights.luminary });
  if (sharedPlanetWeight > 0) reasons.push({ code: "targets_repeated_planet", value: sharedPlanetWeight });
  if (structuralContext.isParent) reasons.push({ code: "activates_parent_pattern", value: weights.parentPattern });
  if (structuralContext.isContained) reasons.push({ code: "activates_contained_pattern", value: weights.containedPattern });

  const luminaryWeight = LUMINARIES.has(aspect.targetNatalPlanet) ? weights.luminary : 0;
  const structuralWeight = (structuralContext.isParent ? weights.parentPattern : 0) + (structuralContext.isContained ? weights.containedPattern : 0);
  const total = roundNumber(aspectWeight + exactnessWeight + applyingWeight + roleWeight + sharedPlanetWeight + luminaryWeight + structuralWeight);

  return {
    score: {
      aspectWeight,
      exactnessWeight,
      applyingWeight,
      roleWeight,
      sharedPlanetWeight,
      total
    },
    reasons: reasons
      .filter((reason) => reason.value > 0)
      .sort(compareReasons)
  };
}

function activationId(policyId, calculatedFor, aspect, patternId) {
  return [
    "activation",
    policyId,
    calculatedFor,
    aspect.movingBody,
    aspect.aspectType,
    aspect.targetNatalPlanet,
    patternId
  ].map((part) => String(part).replace(/[^a-z0-9_.:-]+/gi, "_")).join(".");
}

function buildPatternActivations(detectionResult, transitAspects = [], options = {}) {
  const policy = normalizeActivationPolicy(options.policy);
  const calculatedFor = typeof options.calculatedFor === "string" && options.calculatedFor
    ? options.calculatedFor
    : new Date(0).toISOString();
  const patterns = Array.isArray(detectionResult && detectionResult.patterns) ? detectionResult.patterns : [];
  const relationships = Array.isArray(detectionResult && detectionResult.relationships) ? detectionResult.relationships : [];
  const ranking = detectionResult && detectionResult.ranking;
  const baseRankingById = new Map((ranking && Array.isArray(ranking.rankings) ? ranking.rankings : []).map((item) => [item.patternId, item]));
  const repeatedCounts = repeatedPlanetCounts(patterns);
  const normalizedAspects = (Array.isArray(transitAspects) ? transitAspects : [])
    .map(normalizeActivationAspect)
    .filter(Boolean)
    .sort((first, second) => {
      return first.movingBody.localeCompare(second.movingBody)
        || first.targetNatalPlanet.localeCompare(second.targetNatalPlanet)
        || first.aspectType.localeCompare(second.aspectType)
        || first.orb - second.orb
        || first.sourceAspectId.localeCompare(second.sourceAspectId);
    });

  const activations = [];
  for (const aspect of normalizedAspects) {
    const targetPatterns = patterns
      .filter((pattern) => Array.isArray(pattern.planets) && pattern.planets.includes(aspect.targetNatalPlanet))
      .sort((first, second) => first.id.localeCompare(second.id));

    for (const pattern of targetPatterns) {
      const targetRoles = memberRolesFor(pattern, aspect.targetNatalPlanet).sort();
      const scored = activationScoreFor({
        aspect,
        pattern,
        targetRoles,
        repeatedCount: repeatedCounts.get(aspect.targetNatalPlanet) || 0,
        relationships
      }, policy);

      activations.push({
        id: activationId(policy.id, calculatedFor, aspect, pattern.id),
        patternId: pattern.id,
        calculatedFor,
        trigger: {
          movingBody: aspect.movingBody,
          targetNatalPlanet: aspect.targetNatalPlanet,
          targetRoles,
          aspectType: aspect.aspectType,
          orb: aspect.orb,
          applying: aspect.applying,
          ...(aspect.exactAt ? { exactAt: aspect.exactAt } : {}),
          sourceAspectId: aspect.sourceAspectId
        },
        linkedPatternIds: activationLinkedPatternIds(pattern, aspect.targetNatalPlanet, patterns, relationships),
        score: scored.score,
        reasons: scored.reasons
      });
    }
  }

  activations.sort((first, second) => first.id.localeCompare(second.id));
  const activationScoreByPattern = activations.reduce((scores, activation) => {
    scores.set(activation.patternId, roundNumber((scores.get(activation.patternId) || 0) + activation.score.total));
    return scores;
  }, new Map());
  const rankedPatternIds = ranking && Array.isArray(ranking.displayOrder)
    ? ranking.displayOrder.filter((patternId) => patterns.some((pattern) => pattern.id === patternId))
    : patterns.map((pattern) => pattern.id);
  const allPatternIds = unique(rankedPatternIds.concat(patterns.map((pattern) => pattern.id)));
  const currentRankings = allPatternIds.map((patternId) => {
    const natalBasePriority = baseRankingById.get(patternId)?.score?.baseDisplayPriority ?? 0;
    const activationScore = activationScoreByPattern.get(patternId) || 0;
    return {
      patternId,
      natalBasePriority: roundNumber(natalBasePriority),
      activationScore: roundNumber(activationScore),
      currentDisplayPriority: roundNumber(natalBasePriority + activationScore)
    };
  }).sort((first, second) => {
    return second.currentDisplayPriority - first.currentDisplayPriority
      || second.activationScore - first.activationScore
      || second.natalBasePriority - first.natalBasePriority
      || first.patternId.localeCompare(second.patternId);
  });

  return {
    version: ASPECT_PATTERN_ACTIVATION_VERSION,
    policyId: policy.id,
    calculatedFor,
    activations,
    currentRankings,
    currentDisplayOrder: currentRankings.map((rankingItem) => rankingItem.patternId)
  };
}

function buildAspectPatternActivationInterpretationContexts(detectionResult, options = {}) {
  const activation = options.activation || (detectionResult && detectionResult.activation) || {};
  const activations = Array.isArray(activation.activations) ? activation.activations : [];
  const currentRankings = Array.isArray(activation.currentRankings) ? activation.currentRankings : [];
  const currentDisplayOrder = Array.isArray(activation.currentDisplayOrder) ? activation.currentDisplayOrder : [];
  const natalContexts = Array.isArray(options.natalContexts)
    ? options.natalContexts
    : Array.isArray(detectionResult && detectionResult.interpretationContexts)
      ? detectionResult.interpretationContexts
      : [];
  const patterns = Array.isArray(detectionResult && detectionResult.patterns) ? detectionResult.patterns : [];
  const relationships = Array.isArray(detectionResult && detectionResult.relationships) ? detectionResult.relationships : [];
  const ranking = (detectionResult && detectionResult.ranking) || {};
  const rankingDisplayOrder = Array.isArray(ranking.displayOrder) ? ranking.displayOrder : natalContexts.map((context) => context.patternId);
  const patternById = new Map(patterns.map((pattern) => [pattern.id, pattern]));
  const natalContextByPatternId = new Map(natalContexts.map((context) => [context.patternId, context]));
  const currentRankingByPatternId = new Map(currentRankings.map((item) => [item.patternId, item]));
  const activationsByPatternId = new Map();

  for (const item of activations) {
    if (!item || !item.patternId) continue;
    const group = activationsByPatternId.get(item.patternId) || [];
    group.push(item);
    activationsByPatternId.set(item.patternId, group);
  }

  const activatedPatternIds = unique(
    currentDisplayOrder.filter((patternId) => activationsByPatternId.has(patternId))
      .concat([...activationsByPatternId.keys()].sort())
  );

  return activatedPatternIds.map((patternId) => {
    const triggers = activationsByPatternId.get(patternId).slice().sort(compareActivationRecordsForPrimary);
    const primary = triggers[0];
    const natalContext = natalContextByPatternId.get(patternId);
    const pattern = patternById.get(patternId) || {};
    const currentRanking = currentRankingByPatternId.get(patternId) || {
      natalBasePriority: 0,
      activationScore: 0,
      currentDisplayPriority: 0
    };
    const parentPatternIds = natalContext?.display?.parentPatternIds
      ? natalContext.display.parentPatternIds.slice().sort()
      : relationshipPatternIds(relationships, patternId, "parent");
    const childPatternIds = natalContext?.display?.childPatternIds
      ? natalContext.display.childPatternIds.slice().sort()
      : relationshipPatternIds(relationships, patternId, "child");
    const linkedPatternIds = unique(triggers.flatMap((trigger) => Array.isArray(trigger.linkedPatternIds) ? trigger.linkedPatternIds : [])).sort();
    const triggerContexts = triggers.map(triggerContextFromActivation);
    const jobs = activationContextJobs(linkedPatternIds, parentPatternIds, childPatternIds);

    return {
      version: "1.0.0",
      patternId,
      patternType: natalContext?.patternType || pattern.type || "unknown",
      natalInterpretationContextId: natalContext?.patternId || patternId,
      calculatedFor: activation.calculatedFor || primary.calculatedFor,
      display: {
        natalRank: rankForPatternId(rankingDisplayOrder, patternId),
        currentRank: rankForPatternId(currentDisplayOrder, patternId),
        isCurrentlyPrimary: rankForPatternId(currentDisplayOrder, patternId) === 1,
        parentPatternIds,
        childPatternIds
      },
      natalPattern: {
        confidence: natalContext?.geometry?.confidence || pattern.geometry?.confidence || "exact"
      },
      triggers: triggerContexts,
      primaryTrigger: {
        activationId: primary.id,
        selectionReason: primaryTriggerSelectionReason(primary, triggers)
      },
      activationSummary: {
        triggerCount: triggers.length,
        movingBodies: unique(triggers.map((trigger) => trigger.trigger.movingBody)).sort(),
        targetedNatalPlanets: unique(triggers.map((trigger) => trigger.trigger.targetNatalPlanet)).sort(),
        targetedRoles: unique(triggers.flatMap((trigger) => trigger.trigger.targetRoles || [])).sort(),
        linkedPatternIds,
        timingState: activationTimingState(triggers, primary),
        sharedPlanetFanout: linkedPatternIds.length > 0 && triggers.some((trigger) => (
          Array.isArray(trigger.reasons) && trigger.reasons.some((reason) => reason.code === "targets_repeated_planet")
        ))
      },
      ranking: {
        natalBasePriority: roundNumber(currentRanking.natalBasePriority || 0),
        activationScore: roundNumber(currentRanking.activationScore || 0),
        currentDisplayPriority: roundNumber(currentRanking.currentDisplayPriority || 0)
      },
      copyInstructions: {
        jobs,
        avoidClaims: ACTIVATION_CONTEXT_AVOID_CLAIMS.slice(),
        allowedCertainty: "qualified"
      },
      provenance: {
        detectorVersion: ASPECT_PATTERN_DETECTOR_VERSION,
        rankingPolicyId: ranking.policyId || DEFAULT_RANKING_POLICY.id,
        activationPolicyId: activation.policyId || DEFAULT_ACTIVATION_POLICY.id,
        natalContextBuilderVersion: ASPECT_PATTERN_CONTEXT_BUILDER_VERSION,
        activationContextBuilderVersion: ASPECT_PATTERN_ACTIVATION_CONTEXT_BUILDER_VERSION
      }
    };
  });
}

function compareActivationRecordsForPrimary(first, second) {
  return (second.score?.total || 0) - (first.score?.total || 0)
    || (first.trigger?.orb || 0) - (second.trigger?.orb || 0)
    || Number(Boolean(second.trigger?.applying)) - Number(Boolean(first.trigger?.applying))
    || String(first.id).localeCompare(String(second.id));
}

function triggerContextFromActivation(activation) {
  return {
    activationId: activation.id,
    ...(activation.trigger.sourceAspectId ? { sourceAspectId: activation.trigger.sourceAspectId } : {}),
    movingBody: activation.trigger.movingBody,
    targetNatalPlanet: activation.trigger.targetNatalPlanet,
    targetRoles: Array.isArray(activation.trigger.targetRoles) ? activation.trigger.targetRoles.slice().sort() : [],
    aspectType: activation.trigger.aspectType,
    orb: activation.trigger.orb,
    applying: Boolean(activation.trigger.applying),
    ...(activation.trigger.exactAt ? { exactAt: activation.trigger.exactAt } : {}),
    score: activation.score?.total || 0,
    reasons: copyValue(activation.reasons || [])
  };
}

function primaryTriggerSelectionReason(primary, triggers) {
  if (triggers.length <= 1) return "highest_activation_score";
  const others = triggers.filter((trigger) => trigger.id !== primary.id);
  const primaryScore = primary.score?.total || 0;
  const maxOtherScore = Math.max(...others.map((trigger) => trigger.score?.total || 0));
  if (primaryScore > maxOtherScore) return "highest_activation_score";

  const scoreTied = triggers.filter((trigger) => (trigger.score?.total || 0) === primaryScore);
  const minOtherOrb = Math.min(...scoreTied.filter((trigger) => trigger.id !== primary.id).map((trigger) => trigger.trigger?.orb ?? Infinity));
  if ((primary.trigger?.orb ?? Infinity) < minOtherOrb) return "tightest_orb";

  const orbTied = scoreTied.filter((trigger) => (trigger.trigger?.orb ?? Infinity) === (primary.trigger?.orb ?? Infinity));
  if (primary.trigger?.applying && orbTied.some((trigger) => !trigger.trigger?.applying)) return "applying_over_separating";
  return "deterministic_tiebreak";
}

function activationTimingState(triggers, primary) {
  if (primary && (primary.trigger?.orb === 0 || primary.trigger?.orb <= 0.01)) return "exact";
  const applyingCount = triggers.filter((trigger) => trigger.trigger?.applying).length;
  if (applyingCount === triggers.length) return "applying";
  if (applyingCount === 0) return "separating";
  return "mixed";
}

function rankForPatternId(displayOrder, patternId) {
  const index = displayOrder.indexOf(patternId);
  return index === -1 ? 0 : index + 1;
}

function activationContextJobs(linkedPatternIds, parentPatternIds, childPatternIds) {
  const jobs = ACTIVATION_CONTEXT_COPY_JOBS.slice();
  if (linkedPatternIds.length > 0) jobs.push(ACTIVATION_CONTEXT_SHARED_COPY_JOB);
  if (parentPatternIds.length > 0 || childPatternIds.length > 0) jobs.push(ACTIVATION_CONTEXT_STRUCTURE_COPY_JOB);
  return jobs;
}

function resolveAspectPatternActivationCopy(context, options = {}) {
  const sourceRecords = Array.isArray(options.records) ? options.records : [];
  const authoredRecords = Array.isArray(options.authoredRecords) ? options.authoredRecords : AUTHORED_ASPECT_PATTERN_ACTIVATION_RECORDS;
  const authoredCandidates = selectEligibleAuthoredActivationRecords(authoredRecords, context);
  const records = sourceRecords.concat(authoredCandidates).concat(GOVERNED_ACTIVATION_COPY_RECORDS);
  const attemptedRecords = [];

  for (const record of records) {
    if (!record || record.patternType !== context.patternType) continue;
    attemptedRecords.push(record.id);
    const result = resolveActivationCopyRecord(context, record);
    if (result) {
      result.diagnostics.attemptedRecordIds = attemptedRecords.slice();
      return result;
    }
  }

  const emergency = emergencyActivationCopyRecord(context.patternType);
  const result = resolveActivationCopyRecord(context, emergency, { force: true });
  result.diagnostics.attemptedRecordIds = attemptedRecords.concat(emergency.id);
  return result;
}

function resolveAspectPatternActivationCopies(contexts, options = {}) {
  return (Array.isArray(contexts) ? contexts : []).map((context) => resolveAspectPatternActivationCopy(context, options));
}

function selectEligibleAuthoredActivationRecords(records, context) {
  return normalizeAuthoredActivationRecords(records)
    .filter((record) => isEligibleAuthoredActivationRecord(record, context))
    .sort((a, b) => compareAuthoredActivationRecords(a, b, context));
}

function normalizeAuthoredActivationRecords(records) {
  return (Array.isArray(records) ? records : [])
    .map(authoredActivationRecordToCopyRecord)
    .filter(Boolean);
}

function authoredActivationRecordToCopyRecord(record) {
  if (!record) return null;
  if (record.contentLevel) return record;
  return {
    ...record,
    contentLevel: "authored"
  };
}

function isEligibleAuthoredActivationRecord(record, context) {
  const primaryRole = primaryActivationRole(context);
  if (record.status !== "approved") return false;
  if (record.patternType !== context.patternType) return false;
  if (!primaryRole) return false;
  const eligibility = record.eligibility || {};
  const targetRoles = eligibility.targetRoles || eligibility.allowedTargetRoles || [];
  if (!targetRoles.includes(primaryRole)) return false;
  if (Array.isArray(eligibility.timingStates) && !eligibility.timingStates.includes(context.activationSummary.timingState)) return false;
  if (Array.isArray(eligibility.patternConfidence) && !eligibility.patternConfidence.includes(context.natalPattern?.confidence || "exact")) return false;
  if (Array.isArray(eligibility.triggerModes) && !eligibility.triggerModes.includes(activationTriggerMode(context))) return false;
  return true;
}

function compareAuthoredActivationRecords(a, b, context) {
  const role = primaryActivationRole(context);
  return exactRoleScore(b, role) - exactRoleScore(a, role)
    || eligibilityWidth(a.eligibility?.patternConfidence) - eligibilityWidth(b.eligibility?.patternConfidence)
    || eligibilityWidth(a.eligibility?.timingStates) - eligibilityWidth(b.eligibility?.timingStates)
    || (Number(b.priority || b.authoredPriority || 0) - Number(a.priority || a.authoredPriority || 0))
    || String(a.id).localeCompare(String(b.id));
}

function exactRoleScore(record, role) {
  const targetRoles = record.eligibility?.targetRoles || record.eligibility?.allowedTargetRoles || [];
  return targetRoles.length === 1 && targetRoles[0] === role ? 1 : 0;
}

function eligibilityWidth(values) {
  return Array.isArray(values) && values.length > 0 ? values.length : 999;
}

function primaryActivationRole(context) {
  const primary = primaryTriggerContext(context);
  const role = primary.targetRoles && primary.targetRoles[0] ? primary.targetRoles[0] : "";
  if (!role) return "pattern_member";
  return role === "spine" ? "resource_planet" : role;
}

function activationTriggerMode(context) {
  if (context.activationSummary?.sharedPlanetFanout) return "shared_planet";
  return (context.activationSummary?.triggerCount || context.triggers?.length || 0) > 1 ? "multiple" : "single";
}

function resolveActivationCopyRecord(context, record, options = {}) {
  if (!options.force && !activationCopyRecordEligible(context, record)) return null;
  const slots = aspectPatternActivationCopySlots(context);
  const validation = validateAspectPatternActivationCopyRecord(record, context, slots);
  if (!options.force && validation.errors.length > 0) return null;

  const missingSlots = new Set(validation.missingSlots);
  const skippedSections = [];
  const content = {};
  for (const key of ["eyebrow", "headline", "overview"]) {
    const template = record.content && record.content[key];
    if (typeof template === "string") {
      const rendered = renderActivationTemplate(template, slots, missingSlots);
      if (rendered !== null) content[key] = rendered;
    }
  }
  if (!content.headline || !content.overview) return null;

  const sections = [];
  for (const section of (record.content && record.content.sections) || []) {
    if (!activationConditionsPass(section.conditions, slots)) {
      skippedSections.push(section.id);
      continue;
    }
    const sectionValidation = validateActivationTemplate(section.template, slots);
    for (const slot of sectionValidation.missingSlots) missingSlots.add(slot);
    if (sectionValidation.unknownSlots.length > 0 || sectionValidation.missingSlots.length > 0) {
      skippedSections.push(section.id);
      if (section.required && !options.force) return null;
      continue;
    }
    const body = renderActivationTemplate(section.template, slots, missingSlots);
    if (body) {
      sections.push({ id: section.id, body });
    } else {
      skippedSections.push(section.id);
      if (section.required && !options.force) return null;
    }
  }

  const resolved = {
    patternId: context.patternId,
    patternType: context.patternType,
    calculatedFor: context.calculatedFor,
    source: {
      recordId: record.id,
      contentLevel: record.contentLevel,
      status: record.status,
      resolverVersion: ASPECT_PATTERN_ACTIVATION_COPY_RESOLVER_VERSION
    },
    triggerSummary: {
      primaryActivationId: context.primaryTrigger.activationId,
      triggerCount: context.activationSummary.triggerCount,
      movingBodies: context.activationSummary.movingBodies.slice(),
      targetedNatalPlanets: context.activationSummary.targetedNatalPlanets.slice(),
      timingState: context.activationSummary.timingState
    },
    content: {
      ...content,
      sections
    },
    diagnostics: {
      templateId: record.id,
      usedFallback: record.contentLevel !== "authored",
      missingSlots: [...missingSlots].sort(),
      skippedSections: unique(skippedSections).sort(),
      validationWarnings: validation.warnings.slice().sort()
    }
  };
  if (!resolved.content.eyebrow) delete resolved.content.eyebrow;
  return resolved;
}

function aspectPatternActivationCopySlots(context) {
  const primary = primaryTriggerContext(context);
  const role = primary.targetRoles && primary.targetRoles[0] ? primary.targetRoles[0] : "";
  const additionalMovingBodies = (context.activationSummary.movingBodies || []).filter((body) => body !== primary.movingBody);
  const linkedPatternNames = patternNameListFromIds(context.activationSummary.linkedPatternIds || []);
  const parentPatternNames = (context.display.parentPatternIds || []).map(patternNameFromId);
  const childPatternNames = (context.display.childPatternIds || []).map(patternNameFromId);
  const aspectName = lowerToken(primary.aspectType);
  const slots = {
    pattern_name: PATTERN_DISPLAY_NAMES[context.patternType] || titleToken(context.patternType),
    primary_moving_body: titleToken(primary.movingBody),
    primary_target_planet: titleToken(primary.targetNatalPlanet),
    primary_aspect_name: aspectName,
    primary_aspect_with_article: `${articleFor(aspectName)} ${aspectName}`,
    primary_orb: degreePhrase(primary.orb),
    trigger_count: context.activationSummary.triggerCount || context.triggers.length,
    targeted_planets: joinList((context.activationSummary.targetedNatalPlanets || []).map(titleToken)),
    timing_state: context.activationSummary.timingState,
    shared_planet_fanout: Boolean(context.activationSummary.sharedPlanetFanout),
    pattern_confidence: context.natalPattern?.confidence || "exact",
    is_currently_primary: Boolean(context.display.isCurrentlyPrimary)
  };
  if (role) slots.primary_target_role = activationRoleLabel(role);
  if (primary.exactAt) slots.exact_at = primary.exactAt;
  if (additionalMovingBodies.length > 0) slots.additional_moving_bodies = joinList(additionalMovingBodies.map(titleToken));
  if (linkedPatternNames.length > 0) slots.linked_pattern_names = joinList(linkedPatternNames);
  if (parentPatternNames.length > 0) slots.parent_pattern_name = joinList(parentPatternNames);
  if (childPatternNames.length > 0) slots.child_pattern_names = joinList(childPatternNames);
  return slots;
}

function primaryTriggerContext(context) {
  return (context.triggers || []).find((trigger) => trigger.activationId === context.primaryTrigger.activationId)
    || (context.triggers || [])[0]
    || {};
}

function activationRoleLabel(role) {
  if (role === "opposition_axis") return "opposition member";
  if (role === "focal_planet") return "focal planet";
  if (role === "spine") return "resource planet";
  if (role === "resource_planet") return "resource planet";
  return lowerToken(role);
}

function activationCopyRecordEligible(context, record) {
  if (!ASPECT_PATTERN_ACTIVATION_CONTENT_LEVELS.includes(record.contentLevel)) return false;
  if (!["draft", "reviewed", "approved", "deprecated"].includes(record.status)) return false;
  if (record.status === "deprecated") return false;
  if (record.contentLevel === "authored" && record.status !== "approved") return false;
  const eligibility = record.eligibility || {};
  if (Array.isArray(eligibility.timingStates) && !eligibility.timingStates.includes(context.activationSummary.timingState)) return false;
  if (Array.isArray(eligibility.patternConfidence) && !eligibility.patternConfidence.includes(context.natalPattern?.confidence || "exact")) return false;
  if (eligibility.triggerCount) {
    const count = context.activationSummary.triggerCount || context.triggers.length;
    if (typeof eligibility.triggerCount.min === "number" && count < eligibility.triggerCount.min) return false;
    if (typeof eligibility.triggerCount.max === "number" && count > eligibility.triggerCount.max) return false;
  }
  if (eligibility.requiresSharedPlanetFanout && !context.activationSummary.sharedPlanetFanout) return false;
  if (Array.isArray(eligibility.allowedTargetRoles) && eligibility.allowedTargetRoles.length > 0) {
    const roles = (context.activationSummary.targetedRoles || []).map((role) => role === "spine" ? "resource_planet" : role);
    if (!roles.some((role) => eligibility.allowedTargetRoles.includes(role))) return false;
  }
  if (Array.isArray(eligibility.targetRoles) && eligibility.targetRoles.length > 0) {
    const role = primaryActivationRole(context);
    if (!eligibility.targetRoles.includes(role)) return false;
  }
  if (Array.isArray(eligibility.triggerModes) && !eligibility.triggerModes.includes(activationTriggerMode(context))) return false;
  return true;
}

function validateAspectPatternActivationCopyRecord(record, context, slots = aspectPatternActivationCopySlots(context)) {
  const errors = [];
  const warnings = [];
  const missingSlots = [];
  const unknownSlots = [];
  const templates = [];
  for (const key of ["eyebrow", "headline", "overview"]) {
    if (typeof record.content?.[key] === "string") templates.push({ id: key, template: record.content[key], required: key !== "eyebrow" });
  }
  for (const section of record.content?.sections || []) {
    templates.push(section);
    if (!ACTIVATION_COPY_SECTION_IDS.includes(section.id)) errors.push(`unknown_section:${section.id}`);
  }
  for (const item of templates) {
    if (!activationConditionsPass(item.conditions, slots)) continue;
    const validation = validateActivationTemplate(item.template, slots);
    unknownSlots.push(...validation.unknownSlots);
    missingSlots.push(...validation.missingSlots);
    if (item.required && validation.unknownSlots.length > 0) errors.push(`unknown_required_slot:${item.id}`);
    if (item.required && validation.missingSlots.length > 0) errors.push(`missing_required_slot:${item.id}`);
  }
  if (record.languageRules?.certainty !== "qualified") errors.push("activation_copy_must_be_qualified");

  const combined = templates.map((item) => item.template).join(" ");
  for (const phrase of (record.languageRules?.prohibitedClaims || []).concat(record.languageRules?.prohibitedTerms || [])) {
    if (phrase && containsTerm(combined, phrase)) errors.push(`prohibited_language:${phrase}`);
  }
  if (/\b(will|guarantees?|causes?|forces?|must happen|will happen)\b/i.test(combined)) errors.push("event_prediction_language");
  if (/\b(permanent|changes your natal|rewrites|new geometry)\b/i.test(combined)) errors.push("changes_natal_geometry_language");
  if ((context.patternType === "grand_square" || context.patternType === "mystic_rectangle") && containsTerm(combined, "apex")) {
    errors.push("apex_language_for_non_apex_pattern");
  }
  if (context.patternType === "yod" && /\b(finger of god|fate|destiny|chosen|calling|special mission|meant to happen|unavoidable|karmic test|turning point)\b/i.test(combined)) {
    errors.push("yod_prohibited_language");
  }
  if (/\b(equally active|equally intense|same intensity)\b/i.test(combined)) errors.push("equal_linked_pattern_intensity_claim");
  if (/\b(activationId|sourceAspectId|reason code|policy|builder|score|rank|currentDisplayPriority|sharedPlanetFanout)\b/i.test(combined)) {
    errors.push("internal_activation_diagnostics_leak");
  }
  if (unknownSlots.length > 0) warnings.push("unknown_slots_present");
  if (missingSlots.length > 0) warnings.push("missing_slots_present");

  return {
    ok: errors.length === 0,
    errors: unique(errors).sort(),
    warnings: unique(warnings).sort(),
    missingSlots: unique(missingSlots).sort(),
    unknownSlots: unique(unknownSlots).sort()
  };
}

function validateAuthoredAspectPatternActivationRecord(record, context, slots) {
  const normalized = authoredActivationRecordToCopyRecord(record);
  if (!normalized) {
    return {
      ok: false,
      errors: ["missing_authored_activation_record"],
      warnings: [],
      missingSlots: [],
      unknownSlots: []
    };
  }
  const validation = validateAspectPatternActivationCopyRecord(normalized, context, slots);
  const errors = validation.errors.slice();
  const eligibility = normalized.eligibility || {};
  const targetRoles = eligibility.targetRoles || eligibility.allowedTargetRoles || [];
  if (!Array.isArray(targetRoles) || targetRoles.length === 0) errors.push("missing_target_role_eligibility");
  return {
    ...validation,
    ok: errors.length === 0,
    errors: unique(errors).sort()
  };
}

function validateActivationTemplate(template, slots) {
  const slotNames = templateSlotNames(template);
  return {
    unknownSlots: slotNames.filter((slot) => !APPROVED_ACTIVATION_COPY_SLOTS.includes(slot)),
    missingSlots: slotNames.filter((slot) => APPROVED_ACTIVATION_COPY_SLOTS.includes(slot) && (slots[slot] === undefined || slots[slot] === null || slots[slot] === ""))
  };
}

function renderActivationTemplate(template, slots, missingSlots) {
  const validation = validateActivationTemplate(template, slots);
  if (validation.unknownSlots.length > 0) return null;
  for (const slot of validation.missingSlots) missingSlots.add(slot);
  if (validation.missingSlots.length > 0) return null;
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, slotName) => String(slots[slotName]));
}

function activationConditionsPass(conditions, slots) {
  return conditionsPass(conditions, slots);
}

function buildDefaultActivationCopyRecords() {
  const records = [];
  for (const type of Object.keys(PATTERN_DISPLAY_NAMES)) {
    records.push(sourceGroundedActivationCopyRecord(type));
    records.push(madlibActivationCopyRecord(type));
    records.push(emergencyActivationCopyRecord(type));
  }
  return records;
}

function buildAuthoredAspectPatternActivationRecords() {
  return Object.freeze([
    authoredActivationRecord("t_square", "apex", {
      headline: "{{primary_moving_body}} is pressing on your T-square response point",
      overview: "{{primary_moving_body}} is contacting {{primary_target_planet}}, the apex of your T-square. That can make the place where you usually respond to pressure easier to notice for now.",
      role: "{{primary_target_planet}} is often where this T-square looks for action when the other two sides pull in different directions. This does not make it the only outlet; it names the part being contacted first.",
      watch: "Notice what asks for a response before treating it as a forced choice."
    }),
    authoredActivationRecord("t_square", "opposition_axis", {
      route: "opposition-member",
      headline: "{{primary_moving_body}} is contacting one side of your T-square",
      overview: "{{primary_moving_body}} is contacting {{primary_target_planet}}, one side of the opposition inside your T-square. That may make one half of an existing push-pull more noticeable for now.",
      role: "{{primary_target_planet}} is part of the opposition axis here, so this contact points to one side of the pattern rather than the response point.",
      watch: "Notice which side of the existing push-pull is easier to feel, without assuming the whole pattern is equally loud."
    }),
    authoredActivationRecord("grand_square", "opposition_axis", {
      route: "member",
      headline: "{{primary_moving_body}} is contacting one corner of your Grand Square",
      overview: "{{primary_moving_body}} is contacting {{primary_target_planet}} inside your Grand Square. One corner of the four-part setup may stand out without reducing the pattern to one component.",
      role: "{{primary_target_planet}} is one member of the four-planet structure. It is a doorway into the wider pattern, not a single outlet.",
      watch: "Notice which corner asks for attention first, without assuming all four sides have the same volume."
    }),
    authoredActivationRecord("grand_trine", "pattern_member", {
      route: "member",
      headline: "{{primary_moving_body}} is contacting a familiar circuit",
      overview: "{{primary_moving_body}} is contacting {{primary_target_planet}} inside your Grand Trine. A response that already comes with less friction may be easier to notice or use for now.",
      role: "{{primary_target_planet}} belongs to the lower-friction circuit, so this contact may show where the familiar response begins.",
      watch: "Notice what is easier to reach without turning that into a promise of luck, success, or opportunity."
    }),
    authoredActivationRecord("kite", "focal_planet", {
      headline: "{{primary_moving_body}} is contacting the focal planet in your Kite",
      overview: "{{primary_moving_body}} is contacting {{primary_target_planet}}, the focal planet in your Kite. The underlying Grand Trine and the opposition both remain part of what is being emphasized.",
      role: "{{primary_target_planet}} gives the Kite a point of direction through the opposition, while the Grand Trine remains the easier support structure.",
      watch: "Notice what gains direction without treating the focal planet as an apex or a fixed outcome."
    }),
    authoredActivationRecord("kite", "resource_planet", {
      headline: "{{primary_moving_body}} is contacting a resource planet in your Kite",
      overview: "{{primary_moving_body}} is contacting {{primary_target_planet}}, a resource planet in your Kite. The contact may make one supportive part of the larger figure easier to notice.",
      role: "{{primary_target_planet}} supports the Kite through the Grand Trine while the opposition still gives the pattern its direction.",
      watch: "Notice the support that is easier to reach without treating it as solving the opposition."
    }),
    authoredActivationRecord("yod", "apex", {
      headline: "{{primary_moving_body}} is contacting the adjustment point in your Yod",
      overview: "{{primary_moving_body}} is contacting {{primary_target_planet}}, the apex of your Yod. That may bring more attention to timing, coordination, and repeated adjustment.",
      role: "{{primary_target_planet}} is where the two unlike parts of the Yod have to coordinate, so the contact may make the adjustment work more noticeable.",
      watch: "Notice repeated adjustment rather than looking for one final answer."
    }),
    authoredActivationRecord("mystic_rectangle", "opposition_axis", {
      route: "member",
      headline: "{{primary_moving_body}} is contacting one side of your Mystic Rectangle",
      overview: "{{primary_moving_body}} is contacting {{primary_target_planet}} within your Mystic Rectangle. One part of the two-opposition structure may be easier to notice for now.",
      role: "{{primary_target_planet}} belongs to one of the opposition axes, while the supportive routes around the rectangle remain part of the structure.",
      watch: "Notice the contacted side without assuming automatic balance, harmony, or resolution."
    })
  ]);
}

function authoredActivationRecord(patternType, targetRole, copy) {
  const route = copy.route || targetRole;
  return {
    id: `aspect-pattern-activation-authored:${patternType}:${route}:v1`,
    version: "1.0.0",
    patternType,
    status: "approved",
    priority: 10,
    eligibility: {
      targetRoles: [targetRole],
      patternConfidence: ["exact", "strong", "wide", "partial"],
      triggerModes: ["single", "multiple", "shared_planet"]
    },
    content: {
      eyebrow: "{{pattern_name}} in motion",
      headline: copy.headline,
      overview: copy.overview,
      sections: [
        { id: "current_emphasis", template: "This is temporary contact with a natal setup you already have, so it may make something familiar easier to notice for a while.", required: true },
        { id: "transit_trigger", template: "{{primary_moving_body}} is making {{primary_aspect_with_article}} to {{primary_target_planet}}, close by {{primary_orb}}.", required: true },
        { id: "transit_trigger", template: "There is also contact from {{additional_moving_bodies}}, so read this as one combined moment rather than separate unrelated hits.", required: false, conditions: [{ slot: "additional_moving_bodies", exists: true }] },
        { id: "pattern_role", template: copy.role, required: true },
        { id: "linked_patterns", template: "{{primary_target_planet}} also belongs to {{linked_pattern_names}}, so several connected parts of the chart may feel more noticeable at the same time without being equally loud.", required: false, conditions: [{ slot: "linked_pattern_names", exists: true }] },
        { id: "timing", template: TIMING_LANGUAGE.exact, required: false, conditions: [{ slot: "timing_state", equals: "exact" }] },
        { id: "timing", template: TIMING_LANGUAGE.applying, required: false, conditions: [{ slot: "timing_state", equals: "applying" }] },
        { id: "timing", template: TIMING_LANGUAGE.separating, required: false, conditions: [{ slot: "timing_state", equals: "separating" }] },
        { id: "timing", template: TIMING_LANGUAGE.mixed, required: false, conditions: [{ slot: "timing_state", equals: "mixed" }] },
        { id: "watch_for", template: copy.watch, required: true },
        { id: "confidence_note", template: "This is a wider natal pattern, so the connection may be less consistent or less obvious.", required: false, conditions: [{ slot: "pattern_confidence", equals: "wide" }] },
        { id: "confidence_note", template: "This is a partial natal pattern, so the connection may be less consistent or less obvious.", required: false, conditions: [{ slot: "pattern_confidence", equals: "partial" }] }
      ]
    },
    languageRules: {
      certainty: "qualified",
      prohibitedClaims: ACTIVATION_CONTEXT_AVOID_CLAIMS.slice(),
      prohibitedTerms: patternType === "yod"
        ? ["Finger of God", "fate", "destiny", "chosen", "calling", "special mission", "meant to happen", "unavoidable", "karmic test", "turning point"]
        : []
    },
    provenance: {
      sourceIds: [`internal:authored-activation:${patternType}:${route}:v1`],
      editorialStatus: "editorial_synthesis",
      reviewedBy: "codex",
      reviewedAt: "2026-07-19"
    }
  };
}

function sourceGroundedActivationCopyRecord(patternType) {
  return {
    ...activationRecordBase(patternType, "source_grounded_template"),
    id: `aspect-pattern-activation-copy:source-grounded:${patternType}:v1`,
    eligibility: { patternConfidence: ["exact", "strong", "wide", "partial"] },
    content: activationTemplatesForPattern(patternType, "source_grounded_template")
  };
}

function madlibActivationCopyRecord(patternType) {
  return {
    ...activationRecordBase(patternType, "madlib_fallback"),
    id: `aspect-pattern-activation-copy:madlib:${patternType}:v1`,
    eligibility: {},
    content: activationTemplatesForPattern(patternType, "madlib_fallback")
  };
}

function emergencyActivationCopyRecord(patternType) {
  return {
    ...activationRecordBase(patternType, "emergency_fallback"),
    id: `aspect-pattern-activation-copy:emergency:${patternType}:v1`,
    eligibility: {},
    content: {
      eyebrow: "{{pattern_name}} in motion",
      headline: "{{primary_moving_body}} is contacting {{primary_target_planet}}",
      overview: "{{primary_moving_body}} is making {{primary_aspect_with_article}} to {{primary_target_planet}}, which may make your {{pattern_name}} easier to notice for now.",
      sections: [
        { id: "current_emphasis", template: "This is a temporary note about an existing natal setup.", required: true },
        { id: "timing", template: TIMING_LANGUAGE.exact, required: false, conditions: [{ slot: "timing_state", equals: "exact" }] },
        { id: "timing", template: TIMING_LANGUAGE.applying, required: false, conditions: [{ slot: "timing_state", equals: "applying" }] },
        { id: "timing", template: TIMING_LANGUAGE.separating, required: false, conditions: [{ slot: "timing_state", equals: "separating" }] },
        { id: "timing", template: TIMING_LANGUAGE.mixed, required: false, conditions: [{ slot: "timing_state", equals: "mixed" }] }
      ]
    }
  };
}

function activationRecordBase(patternType, contentLevel) {
  return {
    version: "1.0.0",
    patternType,
    contentLevel,
    status: contentLevel === "source_grounded_template" ? "reviewed" : "approved",
    languageRules: {
      certainty: "qualified",
      prohibitedClaims: ACTIVATION_CONTEXT_AVOID_CLAIMS.slice(),
      prohibitedTerms: patternType === "yod"
        ? ["Finger of God", "fate", "destiny", "chosen", "calling", "special mission", "meant to happen", "unavoidable", "karmic test", "turning point"]
        : []
    },
    provenance: {
      sourceIds: [`internal:activation-copy:${contentLevel}:${patternType}:v1`],
      editorialStatus: contentLevel === "source_grounded_template" ? "source_grounded" : "editorial_synthesis"
    }
  };
}

function activationTemplatesForPattern(patternType, level) {
  const genericOverview = "{{primary_moving_body}} is making {{primary_aspect_with_article}} to {{primary_target_planet}}, which may make your {{pattern_name}} easier to notice for now.";
  const base = {
    eyebrow: "{{pattern_name}} in motion",
    headline: "{{primary_moving_body}} is contacting {{primary_target_planet}}",
    overview: level === "madlib_fallback" ? genericOverview : activationOverview(patternType),
    sections: [
      { id: "current_emphasis", template: "This is temporary contact with a natal setup you already have, so it may make something familiar easier to notice for a while.", required: true },
      { id: "transit_trigger", template: "{{primary_moving_body}} is making {{primary_aspect_with_article}} to {{primary_target_planet}}, close by {{primary_orb}}.", required: true },
      { id: "transit_trigger", template: "There is also contact from {{additional_moving_bodies}}, so read this as one combined moment rather than separate unrelated hits.", required: false, conditions: [{ slot: "additional_moving_bodies", exists: true }] },
      { id: "pattern_role", template: activationRoleTemplate(patternType), required: true },
      { id: "linked_patterns", template: "{{primary_target_planet}} also belongs to {{linked_pattern_names}}, so several connected parts of the chart may feel more noticeable at the same time without being equally loud.", required: false, conditions: [{ slot: "linked_pattern_names", exists: true }] },
      { id: "timing", template: TIMING_LANGUAGE.exact, required: false, conditions: [{ slot: "timing_state", equals: "exact" }] },
      { id: "timing", template: TIMING_LANGUAGE.applying, required: false, conditions: [{ slot: "timing_state", equals: "applying" }] },
      { id: "timing", template: TIMING_LANGUAGE.separating, required: false, conditions: [{ slot: "timing_state", equals: "separating" }] },
      { id: "timing", template: TIMING_LANGUAGE.mixed, required: false, conditions: [{ slot: "timing_state", equals: "mixed" }] },
      { id: "watch_for", template: activationWatchForTemplate(patternType), required: true },
      { id: "confidence_note", template: "This is a wider natal pattern, so the connection may be less consistent or less obvious.", required: false, conditions: [{ slot: "pattern_confidence", equals: "wide" }] },
      { id: "confidence_note", template: "This is a partial natal pattern, so the connection may be less consistent or less obvious.", required: false, conditions: [{ slot: "pattern_confidence", equals: "partial" }] }
    ]
  };
  return base;
}

function activationOverview(patternType) {
  if (patternType === "t_square") return "{{primary_moving_body}} is contacting the {{primary_target_role}} in your T-square, so you may notice more around how this pattern handles pressure.";
  if (patternType === "grand_square") return "{{primary_moving_body}} is contacting one member of your Grand Square, so one doorway into the wider four-part setup may stand out for now.";
  if (patternType === "grand_trine") return "{{primary_moving_body}} may make an already familiar response inside your Grand Trine easier to notice or use.";
  if (patternType === "kite") return "{{primary_moving_body}} is contacting your Kite without removing either part of its structure: the underlying Grand Trine and the opposition.";
  if (patternType === "yod") return "{{primary_moving_body}} may make the timing and adjustment work in your Yod more noticeable without making it a fixed outcome.";
  if (patternType === "mystic_rectangle") return "{{primary_moving_body}} is contacting one part of the two-opposition structure in your Mystic Rectangle.";
  return "{{primary_moving_body}} is contacting {{primary_target_planet}}, which may make your {{pattern_name}} easier to notice for now.";
}

function activationRoleTemplate(patternType) {
  if (patternType === "t_square") return "{{primary_target_planet}} is the {{primary_target_role}} here. That helps show where you may notice the pressure first, and how you may start responding to it.";
  if (patternType === "grand_square") return "{{primary_target_planet}} is one member of the four-part configuration. That does not make it the single outlet or reduce the wider setup to one component.";
  if (patternType === "grand_trine") return "{{primary_target_planet}} belongs to a lower-friction natal circuit, so the contact may highlight a response that is already familiar.";
  if (patternType === "kite") return "{{primary_target_planet}} is the {{primary_target_role}} in this Kite. The Grand Trine and the opposition both remain part of what you are noticing.";
  if (patternType === "yod") return "{{primary_target_planet}} is the {{primary_target_role}} here, so the contact may bring more attention to timing, adjustment, and coordination.";
  if (patternType === "mystic_rectangle") return "{{primary_target_planet}} is part of one opposition axis in this rectangle, so the contact may bring that side of the structure into focus.";
  return "{{primary_target_planet}} is the natal target of the current contact.";
}

function activationWatchForTemplate(patternType) {
  if (patternType === "grand_square") return "Notice which part of the setup asks for attention first, without assuming every side has the same volume.";
  if (patternType === "grand_trine") return "Notice whether a familiar response is easier to reach, without turning that into a promise of luck or success.";
  if (patternType === "kite") return "Notice how the opposition gives direction to the easier Grand Trine movement.";
  if (patternType === "yod") return "Notice repeated adjustment rather than looking for one final answer.";
  if (patternType === "mystic_rectangle") return "Notice the contacted opposition without assuming automatic balance or resolution.";
  return "Notice how this contact draws attention to an existing natal setup without changing it.";
}

function resolveAspectPatternCopy(context, options = {}) {
  const sourceRecords = Array.isArray(options.records) ? options.records : [];
  const authoredRecords = Array.isArray(options.authoredRecords)
    ? options.authoredRecords
    : AUTHORED_ASPECT_PATTERN_RECORDS;
  const records = normalizeAuthoredRecords(sourceRecords.concat(authoredRecords)).concat(GOVERNED_COPY_RECORDS);
  const attemptedRecords = [];

  for (const record of records) {
    if (!record || record.patternType !== context.patternType) continue;
    attemptedRecords.push(record.id);
    const result = resolveCopyRecord(context, record);
    if (result) {
      result.diagnostics.attemptedRecordIds = attemptedRecords.slice();
      return result;
    }
  }

  const emergency = emergencyCopyRecord(context.patternType);
  const result = resolveCopyRecord(context, emergency, { force: true });
  result.diagnostics.attemptedRecordIds = attemptedRecords.concat(emergency.id);
  return result;
}

function resolveAspectPatternCopies(contexts, options = {}) {
  return contexts.map((context) => resolveAspectPatternCopy(context, options));
}

function normalizeAuthoredRecords(records) {
  return records
    .filter((record) => record && (record.contentLevel === "authored" || record.content))
    .map(authoredRecordToCopyRecord);
}

function authoredRecordToCopyRecord(record) {
  if (!record || record.contentLevel || !record.content) return record;
  return {
    id: record.id,
    version: record.version,
    patternType: record.patternType,
    contentLevel: "authored",
    status: record.status,
    eligibility: {
      confidence: record.eligibility && record.eligibility.confidence,
      houseMode: record.eligibility && record.eligibility.houseMode,
      allowedVariants: record.eligibility && record.eligibility.variants
    },
    templates: record.content,
    languageRules: {
      allowedCertainty: record.languageRules && record.languageRules.certainty,
      prohibitedClaims: record.languageRules && record.languageRules.prohibitedClaims,
      prohibitedTerms: record.languageRules && record.languageRules.prohibitedTerms
    },
    provenance: record.provenance
  };
}

function resolveCopyRecord(context, record, options = {}) {
  if (!options.force && !copyRecordEligible(context, record)) return null;
  const slots = aspectPatternCopySlots(context);
  const validation = validateAspectPatternCopyRecord(record, context, slots);
  if (!options.force && validation.errors.length > 0) return null;

  const missingSlots = new Set(validation.missingSlots);
  const skippedSections = [];
  const content = {};
  for (const key of ["eyebrow", "headline", "overview"]) {
    const template = record.templates[key];
    if (typeof template === "string") {
      const rendered = renderTemplate(template, slots, missingSlots);
      if (rendered !== null) content[key] = rendered;
    }
  }
  if (!content.headline || !content.overview) return null;

  const sections = [];
  for (const section of record.templates.sections || []) {
    const sectionValidation = validateTemplate(section.template, slots);
    for (const slot of sectionValidation.missingSlots) missingSlots.add(slot);
    if (!conditionsPass(section.conditions, slots)) {
      skippedSections.push(section.id);
      continue;
    }
    if (sectionValidation.unknownSlots.length > 0 || sectionValidation.missingSlots.length > 0) {
      skippedSections.push(section.id);
      if (section.required && !options.force) return null;
      continue;
    }
    const body = renderTemplate(section.template, slots, missingSlots);
    if (body) {
      sections.push({
        id: section.id,
        body
      });
    } else {
      skippedSections.push(section.id);
      if (section.required && !options.force) return null;
    }
  }

  const resolved = {
    patternId: context.patternId,
    patternType: context.patternType,
    source: {
      recordId: record.id,
      contentLevel: record.contentLevel,
      status: record.status,
      resolverVersion: ASPECT_PATTERN_COPY_RESOLVER_VERSION
    },
    content: {
      ...content,
      sections
    },
    diagnostics: {
      templateId: record.id,
      usedFallback: record.contentLevel !== "authored",
      missingSlots: [...missingSlots].sort(),
      skippedSections: unique(skippedSections).sort(),
      validationWarnings: validation.warnings.slice().sort()
    }
  };
  if (!resolved.content.eyebrow) delete resolved.content.eyebrow;
  return resolved;
}

function aspectPatternCopySlots(context) {
  const roles = context.roles || {};
  const derivedByType = new Map((context.derivedPoints || []).map((point) => [point.type, point]));
  const slots = {
    pattern_name: PATTERN_DISPLAY_NAMES[context.patternType] || titleToken(context.patternType),
    member_planets: joinList(context.members.map((member) => titleToken(member.planet))),
    member_count: context.members.length,
    confidence: context.geometry.confidence,
    maximum_orb: `${formatCopyNumber(context.geometry.maximumOrb)} degrees`,
    is_primary: Boolean(context.display.isPrimary)
  };

  if (context.display.parentPatternIds.length > 0) {
    slots.parent_pattern_name = context.display.parentPatternIds.map(patternNameFromId).join(", ");
  }
  if (context.display.childPatternIds.length > 0) {
    slots.child_pattern_names = context.display.childPatternIds.map(patternNameFromId).join(", ");
  }

  if (context.patternType === "t_square") {
    slots.apex_planet = titleToken(roles.apex);
    slots.opposition_axis_one = pairLabel(roles.oppositionAxis);
    addZodiacPointSlots(slots, "empty_leg", roles.emptyLeg || derivedByType.get("empty_leg"));
  } else if (context.patternType === "grand_square") {
    slots.opposition_axis_one = pairLabel(roles.oppositionAxes && roles.oppositionAxes[0]);
    slots.opposition_axis_two = pairLabel(roles.oppositionAxes && roles.oppositionAxes[1]);
  } else if (context.patternType === "grand_trine") {
    slots.element_consistency = elementConsistencyLabel(roles.elementConsistency);
  } else if (context.patternType === "kite") {
    slots.focal_planet = titleToken(roles.focalPlanet);
    slots.opposed_trine_planet = titleToken(roles.opposedTrinePlanet);
    slots.resource_planets = joinList((roles.resourcePlanets || []).map(titleToken));
    slots.opposition_axis_one = pairLabel(roles.spine);
    slots.child_pattern_names = slots.child_pattern_names || "the underlying Grand Trine";
  } else if (context.patternType === "yod") {
    slots.base_planets = pairLabel(roles.basePlanets);
    slots.apex_planet = titleToken(roles.apex);
    addZodiacPointSlots(slots, "fallout", roles.falloutPoint || derivedByType.get("fallout_point"));
  } else if (context.patternType === "mystic_rectangle") {
    slots.opposition_axis_one = pairLabel(roles.oppositionAxes && roles.oppositionAxes[0]);
    slots.opposition_axis_two = pairLabel(roles.oppositionAxes && roles.oppositionAxes[1]);
    slots.rectangle_variant = elementConsistencyLabel(roles.variant);
  }

  return slots;
}

function addZodiacPointSlots(slots, prefix, point) {
  if (!point) return;
  if (point.sign) slots[`${prefix}_sign`] = titleToken(point.sign);
  if (typeof point.house === "number") slots[`${prefix}_house`] = ordinal(point.house);
}

function copyRecordEligible(context, record) {
  if (!ASPECT_PATTERN_CONTENT_LEVELS.includes(record.contentLevel)) return false;
  if (!["draft", "reviewed", "approved", "deprecated"].includes(record.status)) return false;
  if (record.status === "deprecated") return false;
  if (record.contentLevel === "authored" && !isEligibleAuthoredRecord(record, context)) return false;
  if (record.languageRules.allowedCertainty === "direct" && certaintyForContext(context) === "qualified") return false;
  const eligibility = record.eligibility || {};
  if (Array.isArray(eligibility.confidence) && !eligibility.confidence.includes(context.geometry.confidence)) return false;
  if (eligibility.houseMode === "with_houses" && !contextHasHouseData(context)) return false;
  if (eligibility.houseMode === "without_houses" && contextHasHouseData(context)) return false;
  if (eligibility.requiresHouses && !context.members.some((member) => typeof member.house === "number")) return false;
  if (eligibility.requiresAngles && !context.members.some((member) => member.angularProximity)) return false;
  if (Array.isArray(eligibility.allowedVariants) && eligibility.allowedVariants.length > 0) {
    const variant = context.roles && (context.roles.variant || context.roles.elementConsistency);
    if (!eligibility.allowedVariants.includes(variant)) return false;
  }
  return true;
}

function isEligibleAuthoredRecord(record, context) {
  const copyRecord = authoredRecordToCopyRecord(record);
  const eligibility = copyRecord && copyRecord.eligibility ? copyRecord.eligibility : {};
  return Boolean(
    copyRecord
    && copyRecord.status === "approved"
    && copyRecord.patternType === context.patternType
    && Array.isArray(eligibility.confidence)
    && eligibility.confidence.includes(context.geometry.confidence)
  );
}

function contextHasHouseData(context) {
  const slots = aspectPatternCopySlots(context);
  return Boolean(
    context.members.some((member) => typeof member.house === "number")
    || slots.empty_leg_house
    || slots.fallout_house
  );
}

function certaintyForContext(context) {
  if (context.patternType === "yod") return "qualified";
  if (context.geometry.confidence === "wide" || context.geometry.confidence === "partial") return "qualified";
  return context.copyInstructions.allowedCertainty;
}

function validateAspectPatternCopyRecord(record, context, slots = aspectPatternCopySlots(context)) {
  const copyRecord = authoredRecordToCopyRecord(record);
  const errors = [];
  const warnings = [];
  const missingSlots = [];
  const unknownSlots = [];
  const templates = [];
  for (const key of ["eyebrow", "headline", "overview"]) {
    if (typeof copyRecord.templates[key] === "string") templates.push({ id: key, template: copyRecord.templates[key], required: key !== "eyebrow" });
  }
  for (const section of copyRecord.templates.sections || []) {
    templates.push(section);
    if (!COPY_SECTION_IDS.includes(section.id)) errors.push(`unknown_section:${section.id}`);
  }
  for (const item of templates) {
    if (item.conditions && !conditionsPass(item.conditions, slots)) continue;
    const validation = validateTemplate(item.template, slots);
    unknownSlots.push(...validation.unknownSlots);
    missingSlots.push(...validation.missingSlots);
    if (item.required && validation.unknownSlots.length > 0) errors.push(`unknown_required_slot:${item.id}`);
    if (item.required && validation.missingSlots.length > 0) errors.push(`missing_required_slot:${item.id}`);
  }
  if (copyRecord.languageRules.allowedCertainty === "direct" && certaintyForContext(context) === "qualified") {
    errors.push("direct_certainty_for_qualified_context");
  }

  const combined = templates.map((item) => item.template).join(" ");
  const prohibited = (copyRecord.languageRules.prohibitedClaims || []).concat(copyRecord.languageRules.prohibitedTerms || []);
  for (const phrase of prohibited) {
    if (phrase && containsTerm(combined, phrase)) errors.push(`prohibited_language:${phrase}`);
  }
  if ((context.patternType === "grand_square" || context.patternType === "mystic_rectangle") && containsTerm(combined, "apex")) {
    errors.push("apex_language_for_non_apex_pattern");
  }
  if (context.patternType === "yod" && /\b(finger of god|fate|destiny|chosen|special mission)\b/i.test(combined)) {
    errors.push("yod_fate_language");
  }
  if (/\b(structuralContext|baseDisplayPriority|sourceAspectIds|ranking reasons?|warning codes?|derived point|resource planet|element consistency|geometry confidence|source aspect|display priority)\b/i.test(combined)) {
    errors.push("internal_diagnostics_leak");
  }
  if (unknownSlots.length > 0) warnings.push("unknown_slots_present");
  if (missingSlots.length > 0) warnings.push("missing_slots_present");

  return {
    ok: errors.length === 0,
    errors: unique(errors).sort(),
    warnings: unique(warnings).sort(),
    missingSlots: unique(missingSlots).sort(),
    unknownSlots: unique(unknownSlots).sort()
  };
}

function validateAuthoredAspectPatternRecord(record, context, slots = aspectPatternCopySlots(context)) {
  return validateAspectPatternCopyRecord(authoredRecordToCopyRecord(record), context, slots);
}

function validateTemplate(template, slots) {
  const slotNames = templateSlotNames(template);
  return {
    unknownSlots: slotNames.filter((slot) => !APPROVED_COPY_SLOTS.includes(slot)),
    missingSlots: slotNames.filter((slot) => APPROVED_COPY_SLOTS.includes(slot) && (slots[slot] === undefined || slots[slot] === null || slots[slot] === ""))
  };
}

function renderTemplate(template, slots, missingSlots) {
  const validation = validateTemplate(template, slots);
  if (validation.unknownSlots.length > 0) return null;
  for (const slot of validation.missingSlots) missingSlots.add(slot);
  if (validation.missingSlots.length > 0) return null;
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, slotName) => String(slots[slotName]));
}

function conditionsPass(conditions, slots) {
  if (!Array.isArray(conditions) || conditions.length === 0) return true;
  return conditions.every((condition) => {
    if (!condition || !condition.slot) return true;
    if (condition.exists === true) return slots[condition.slot] !== undefined && slots[condition.slot] !== "";
    if (condition.exists === false) return slots[condition.slot] === undefined || slots[condition.slot] === "";
    if (Object.prototype.hasOwnProperty.call(condition, "equals")) return slots[condition.slot] === condition.equals;
    return true;
  });
}

function templateSlotNames(template) {
  const slots = [];
  String(template || "").replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, slotName) => {
    slots.push(slotName);
    return "";
  });
  return unique(slots);
}

function containsTerm(text, term) {
  const escaped = String(term).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b${escaped}\\b`, "i").test(text);
}

function buildAuthoredAspectPatternRecords() {
  return Object.freeze(Object.keys(PATTERN_DISPLAY_NAMES).map(authoredRecordForPattern));
}

function authoredRecordForPattern(patternType) {
  const templates = authoredTemplatesForPattern(patternType);
  const prohibitedClaims = (PATTERN_COPY_JOBS[patternType] && PATTERN_COPY_JOBS[patternType].avoidClaims.slice()) || [];
  const prohibitedTerms = patternType === "yod"
    ? ["Finger of God", "fate", "destiny", "chosen", "calling", "special mission", "unavoidable calling"]
    : [];
  return Object.freeze({
    id: `aspect-pattern-authored:${patternType}:pattern:v1`,
    version: "1.0.0",
    patternType,
    status: "approved",
    eligibility: {
      confidence: ["exact", "strong", "wide", "partial"],
      houseMode: "any",
      variants: []
    },
    content: templates,
    languageRules: {
      certainty: "qualified",
      prohibitedClaims,
      prohibitedTerms
    },
    provenance: {
      sourceIds: [`internal:authored-aspect-pattern:${patternType}:v1`],
      editorialStatus: "editorial_synthesis",
      reviewedBy: "tldr-astro-editorial",
      reviewedAt: "2026-07-19"
    }
  });
}

function authoredTemplatesForPattern(patternType) {
  if (patternType === "t_square") {
    return {
      eyebrow: "{{pattern_name}}",
      headline: "{{pattern_name}} with {{apex_planet}} at the action point",
      overview: "{{member_planets}} form a pressure pattern that asks for a response through {{apex_planet}}, while the opposite side of the pattern points toward {{empty_leg_sign}}.",
      sections: [
        { id: "how_it_works", template: "{{opposition_axis_one}} can describe a repeating pull in two directions. {{apex_planet}} is where the chart tends to act first when that pull needs somewhere to go.", required: true },
        { id: "planet_roles", template: "The empty leg points toward {{empty_leg_house}} in {{empty_leg_sign}}. The empty leg is a reference point for another response, not a missing planet or a guaranteed solution.", required: false, conditions: [{ slot: "empty_leg_house", exists: true }] },
        { id: "planet_roles", template: "The empty leg points toward {{empty_leg_sign}}. The empty leg is a reference point for another response, not a missing planet or a guaranteed solution.", required: true, conditions: [{ slot: "empty_leg_house", exists: false }] },
        { id: "watch_for", template: "The useful question is how {{apex_planet}} reacts under pressure, and whether the chart can make room for the quieter response named by the empty leg.", required: true },
        { id: "confidence_note", template: "Read this with {{confidence}} confidence; the widest link is {{maximum_orb}}.", required: true }
      ]
    };
  }
  if (patternType === "grand_square") {
    return {
      eyebrow: "{{pattern_name}}",
      headline: "{{pattern_name}} across {{member_planets}}",
      overview: "{{member_planets}} are tied into a four-part pattern where pressure can move around the whole square instead of staying in one simple conflict.",
      sections: [
        { id: "how_it_works", template: "The two major pairs are {{opposition_axis_one}}, plus {{opposition_axis_two}}. Each pair matters, and no single planet should be treated as the whole story.", required: true },
        { id: "pressure_or_support", template: "When one side asks for attention, another side may answer back. The pattern is easier to read as a system than as four separate problems.", required: true },
        { id: "watch_for", template: "Do not reduce this to one outlet or one crisis story. The work is noticing how the four planets keep handing the pressure to one another.", required: true },
        { id: "confidence_note", template: "Read this with {{confidence}} confidence; the widest link is {{maximum_orb}}.", required: true }
      ]
    };
  }
  if (patternType === "grand_trine") {
    return {
      eyebrow: "{{pattern_name}}",
      headline: "{{pattern_name}} linking {{member_planets}}",
      overview: "{{member_planets}} can move together with less friction, which may feel familiar before it feels impressive.",
      sections: [
        { id: "how_it_works", template: "The signs are {{element_consistency}}, so these planets tend to share a style of response. That can make the pattern easy to lean on.", required: true },
        { id: "pressure_or_support", template: "Ease does not automatically mean talent or success. It means these parts of the chart may cooperate before the person has to explain why.", required: true },
        { id: "watch_for", template: "The soft spot is passivity: because the pattern can feel natural, it may not create much urgency on its own.", required: true },
        { id: "confidence_note", template: "Read this with {{confidence}} confidence; the widest link is {{maximum_orb}}.", required: true }
      ]
    };
  }
  if (patternType === "kite") {
    return {
      eyebrow: "{{pattern_name}}",
      headline: "{{pattern_name}} with {{focal_planet}} drawing the pattern forward",
      overview: "This Kite keeps {{child_pattern_names}} in place, while the opposition between {{opposition_axis_one}} gives the easier flow a direction to answer.",
      sections: [
        { id: "how_it_works", template: "{{focal_planet}} stands across from {{opposed_trine_planet}}, so the pattern is not only ease. The opposition gives the trines something to organize around.", required: true },
        { id: "planet_roles", template: "{{resource_planets}} help support the shape, while {{focal_planet}} becomes the point that draws attention. This is not the same role as a T-square apex.", required: true },
        { id: "watch_for", template: "The helpful move is to preserve both parts: the underlying Grand Trine and the opposition that keeps asking for direction.", required: true },
        { id: "confidence_note", template: "Read this with {{confidence}} confidence; the widest link is {{maximum_orb}}.", required: true }
      ]
    };
  }
  if (patternType === "yod") {
    return {
      eyebrow: "{{pattern_name}}",
      headline: "{{pattern_name}} with {{apex_planet}} requiring adjustment",
      overview: "{{base_planets}} can work together, but {{apex_planet}} keeps asking the pattern to recalibrate instead of settling into one fixed answer.",
      sections: [
        { id: "how_it_works", template: "The base between {{base_planets}} gives the pattern something to work with. The quincunx links to {{apex_planet}} make the response less straightforward and more timing-sensitive.", required: true },
        { id: "derived_point", template: "The fallout point is opposite {{apex_planet}}, in {{fallout_house}} in {{fallout_sign}}. It is a reference point for release and perspective, not another natal placement.", required: false, conditions: [{ slot: "fallout_house", exists: true }] },
        { id: "derived_point", template: "The fallout point is opposite {{apex_planet}}, in {{fallout_sign}}. It is a reference point for release and perspective, not another natal placement.", required: true, conditions: [{ slot: "fallout_house", exists: false }] },
        { id: "watch_for", template: "Keep the reading practical: repeated adjustment, awkward timing, and learning what response is actually being asked for.", required: true },
        { id: "confidence_note", template: "Read this with {{confidence}} confidence; the widest link is {{maximum_orb}}.", required: true }
      ]
    };
  }
  if (patternType === "mystic_rectangle") {
    return {
      eyebrow: "{{pattern_name}}",
      headline: "{{pattern_name}} holding two linked pairs",
      overview: "This Mystic Rectangle connects {{member_planets}} through two oppositions and supportive routes, so the pattern has movement without becoming automatic balance.",
      sections: [
        { id: "how_it_works", template: "The two major pairs are {{opposition_axis_one}}, plus {{opposition_axis_two}}. The side links help the pairs speak to each other without erasing their tension.", required: true },
        { id: "pressure_or_support", template: "The supportive routes are {{rectangle_variant}}, which can make the pattern more workable when both sides of each opposition stay included.", required: true },
        { id: "watch_for", template: "The risk is smoothing over the tension too quickly. The oppositions still need to be named and worked with directly.", required: true },
        { id: "confidence_note", template: "Read this with {{confidence}} confidence; the widest link is {{maximum_orb}}.", required: true }
      ]
    };
  }
  return {
    eyebrow: "{{pattern_name}}",
    headline: "{{pattern_name}} involving {{member_planets}}",
    overview: "{{member_planets}} form a confirmed aspect pattern.",
    sections: [{ id: "how_it_works", template: "Read this through the confirmed pattern roles.", required: true }]
  };
}

function buildDefaultCopyRecords() {
  const records = [];
  for (const type of Object.keys(PATTERN_DISPLAY_NAMES)) {
    records.push(sourceGroundedRecord(type, "direct"));
    records.push(sourceGroundedRecord(type, "qualified"));
    records.push(madlibCopyRecord(type));
    records.push(emergencyCopyRecord(type));
  }
  return records;
}

function sourceGroundedRecord(patternType, certainty) {
  const qualified = certainty === "qualified";
  const level = "source_grounded_template";
  const base = recordBase(patternType, level, certainty);
  const templates = templatesForPattern(patternType, qualified, level);
  return {
    ...base,
    id: `aspect-pattern-copy:${level}:${patternType}:${certainty}:v1`,
    eligibility: {
      confidence: qualified && patternType === "yod" ? ["exact", "strong", "wide", "partial"] : qualified ? ["wide", "partial"] : ["exact", "strong"]
    },
    templates
  };
}

function madlibCopyRecord(patternType) {
  const level = "madlib_fallback";
  return {
    ...recordBase(patternType, level, "qualified"),
    id: `aspect-pattern-copy:${level}:${patternType}:v1`,
    eligibility: {},
    templates: templatesForPattern(patternType, true, level)
  };
}

function emergencyCopyRecord(patternType) {
  const level = "emergency_fallback";
  return {
    ...recordBase(patternType, level, "qualified"),
    id: `aspect-pattern-copy:${level}:${patternType}:v1`,
    eligibility: {},
    templates: {
      eyebrow: "{{pattern_name}}",
      headline: "{{pattern_name}} involving {{member_planets}}",
      overview: "This temporary note is for a {{pattern_name}} involving {{member_planets}}.",
      sections: [
        {
          id: "how_it_works",
          template: "This fallback names the pattern and keeps the explanation limited to the confirmed planets.",
          required: true
        },
        {
          id: "watch_for",
          template: "Use this as temporary copy until a reviewed pattern note is available.",
          required: true
        }
      ]
    }
  };
}

function recordBase(patternType, contentLevel, certainty) {
  const prohibitedClaims = (PATTERN_COPY_JOBS[patternType] && PATTERN_COPY_JOBS[patternType].avoidClaims.slice()) || [];
  const prohibitedTerms = patternType === "yod"
    ? ["Finger of God", "fate", "destiny", "chosen", "special mission", "unavoidable calling"]
    : [];
  return {
    version: "1.0.0",
    patternType,
    contentLevel,
    status: contentLevel === "source_grounded_template" ? "reviewed" : "approved",
    languageRules: {
      allowedCertainty: certainty,
      prohibitedClaims,
      prohibitedTerms
    },
    provenance: {
      sourceIds: [`internal:${contentLevel}:${patternType}:v1`]
    }
  };
}

function templatesForPattern(patternType, qualified, level) {
  const intro = qualified ? qualifiedIntro(patternType) : directIntro(patternType);
  const confidenceNote = qualified
    ? confidenceTemplate(patternType)
    : "The links are tight enough to read this pattern directly; the widest one is {{maximum_orb}}.";
  const common = {
    eyebrow: "{{pattern_name}}",
    headline: headlineTemplate(patternType, qualified),
    overview: intro,
    sections: []
  };

  if (patternType === "t_square") {
    common.sections = [
      { id: "how_it_works", template: "{{opposition_axis_one}} can pull in different directions, and {{apex_planet}} is where the chart most often tries to do something with that pressure.", required: true },
      { id: "planet_roles", template: "{{apex_planet}} is the action point. The empty leg points toward {{empty_leg_house}} in {{empty_leg_sign}}.", required: false, conditions: [{ slot: "empty_leg_house", exists: true }] },
      { id: "planet_roles", template: "{{apex_planet}} is the action point. The empty leg points toward {{empty_leg_sign}}.", required: true, conditions: [{ slot: "empty_leg_house", exists: false }] },
      { id: "derived_point", template: "The empty leg is a reference point, not another natal planet. It names a response that may be less familiar.", required: true },
      { id: "watch_for", template: "This does not mean life is always in crisis, and it does not make one response the guaranteed answer.", required: true },
      { id: "confidence_note", template: confidenceNote, required: qualified }
    ];
  } else if (patternType === "grand_square") {
    common.sections = [
      { id: "how_it_works", template: "{{member_planets}} are tied together through two major pairs: {{opposition_axis_one}}, plus {{opposition_axis_two}}.", required: true },
      { id: "pressure_or_support", template: "When one pair gets activated, another part of the pattern may ask for attention too.", required: true },
      { id: "watch_for", template: "This pattern should not be reduced to one problem, one outlet, or one permanent way of handling pressure.", required: true },
      { id: "confidence_note", template: confidenceNote, required: qualified }
    ];
  } else if (patternType === "grand_trine") {
    common.sections = [
      { id: "how_it_works", template: "{{member_planets}} can work together more easily than they would in a harder pattern.", required: true },
      { id: "pressure_or_support", template: "The signs are {{element_consistency}}, which means the pattern has a consistent style.", required: true },
      { id: "watch_for", template: "Ease here is not a promise of talent, success, or an easy life; it only describes the way these planets connect.", required: true },
      { id: "confidence_note", template: confidenceNote, required: qualified }
    ];
  } else if (patternType === "kite") {
    common.sections = [
      { id: "how_it_works", template: "This Kite includes {{child_pattern_names}}, but the opposition between {{opposition_axis_one}} keeps it from being only easy flow.", required: true },
      { id: "planet_roles", template: "{{focal_planet}} draws the pattern forward, {{opposed_trine_planet}} stands across from it, and {{resource_planets}} help support the shape.", required: true },
      { id: "watch_for", template: "Do not treat this as a Grand Trine with an extra planet. The opposition is part of the pattern.", required: true },
      { id: "confidence_note", template: confidenceNote, required: qualified }
    ];
  } else if (patternType === "yod") {
    common.sections = [
      { id: "how_it_works", template: "{{base_planets}} can cooperate, but {{apex_planet}} asks the pattern to keep adjusting rather than settling once and for all.", required: true },
      { id: "derived_point", template: "The fallout point is opposite {{apex_planet}}, in {{fallout_house}} in {{fallout_sign}}. It is a reference point, not another natal planet.", required: false, conditions: [{ slot: "fallout_house", exists: true }] },
      { id: "derived_point", template: "The fallout point is opposite {{apex_planet}}, in {{fallout_sign}}. It is a reference point, not another natal planet.", required: true, conditions: [{ slot: "fallout_house", exists: false }] },
      { id: "watch_for", template: "Keep this language about repeated timing and adjustment, not one final answer.", required: true },
      { id: "confidence_note", template: confidenceNote, required: true }
    ];
  } else if (patternType === "mystic_rectangle") {
    common.sections = [
      { id: "how_it_works", template: "The Mystic Rectangle holds two pairs at once: {{opposition_axis_one}}, plus {{opposition_axis_two}}.", required: true },
      { id: "pressure_or_support", template: "The side links can help the two pairs speak to each other; this version is {{rectangle_variant}}.", required: true },
      { id: "watch_for", template: "Do not describe this as automatic balance. The oppositions still matter.", required: true },
      { id: "confidence_note", template: confidenceNote, required: qualified }
    ];
  }

  if (level === "madlib_fallback") {
    common.overview = "{{pattern_name}} with {{member_planets}} is present at {{confidence}} confidence.";
  }
  return common;
}

function headlineTemplate(patternType, qualified) {
  const prefix = qualified ? qualifiedHeadlinePrefix(patternType) : PATTERN_DISPLAY_NAMES[patternType];
  return `${prefix}: {{member_planets}}`;
}

function qualifiedHeadlinePrefix(patternType) {
  return patternType === "yod"
    ? "A Yod asking for adjustment"
    : patternType === "t_square"
      ? "A possible T-square"
      : `A possible ${PATTERN_DISPLAY_NAMES[patternType]}`;
}

function qualifiedIntro(patternType) {
  if (patternType === "yod") return "This {{confidence}} Yod may connect {{member_planets}} through repeated adjustment.";
  if (patternType === "t_square") return "This {{confidence}} T-square may show {{member_planets}} working through pressure and response.";
  if (patternType === "grand_trine") return "This {{confidence}} Grand Trine may show {{member_planets}} working together with less friction.";
  return "This {{confidence}} {{pattern_name}} may connect {{member_planets}}.";
}

function directIntro(patternType) {
  if (patternType === "t_square") return "This T-square shows {{member_planets}} working through pressure and response.";
  if (patternType === "grand_square") return "This Grand Square ties {{member_planets}} into one connected pressure pattern.";
  if (patternType === "grand_trine") return "This Grand Trine shows {{member_planets}} working together with less friction.";
  if (patternType === "kite") return "This Kite connects {{member_planets}} through ease and an important opposition.";
  if (patternType === "yod") return "This Yod may connect {{member_planets}} through repeated adjustment.";
  if (patternType === "mystic_rectangle") return "This Mystic Rectangle connects {{member_planets}} through two oppositions and supporting links.";
  return "This {{pattern_name}} connects {{member_planets}}.";
}

function confidenceTemplate() {
  return "Because this pattern is {{confidence}}, keep the wording flexible; the widest link is {{maximum_orb}}.";
}

function patternNameFromId(patternId) {
  const match = String(patternId).match(/^aspect-pattern:([^:]+)/);
  return match ? PATTERN_DISPLAY_NAMES[match[1]] || titleToken(match[1]) : "related pattern";
}

function patternNameListFromIds(patternIds) {
  const counts = new Map();
  for (const patternId of patternIds) {
    const name = patternNameFromId(patternId);
    counts.set(name, (counts.get(name) || 0) + 1);
  }
  return [...counts.entries()].map(([name, count]) => count > 1 ? `${numberWord(count)} ${pluralizePatternName(name)}` : name);
}

function pluralizePatternName(name) {
  if (name.endsWith("s")) return name;
  return `${name}s`;
}

function numberWord(value) {
  return {
    2: "two",
    3: "three",
    4: "four",
    5: "five",
    6: "six"
  }[value] || String(value);
}

function degreePhrase(value) {
  const formatted = formatCopyNumber(value);
  return `${formatted} ${Number(formatted) === 1 ? "degree" : "degrees"}`;
}

function articleFor(value) {
  return /^[aeiou]/i.test(String(value)) ? "an" : "a";
}

function titleToken(value) {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function lowerToken(value) {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/-/g, " ")
    .toLowerCase();
}

function pairLabel(value) {
  return Array.isArray(value) ? value.map(titleToken).join(" and ") : undefined;
}

function joinList(items) {
  const values = items.filter(Boolean);
  if (values.length <= 2) return values.join(" and ");
  return `${values.slice(0, -1).join(", ")}, and ${values[values.length - 1]}`;
}

function elementConsistencyLabel(value) {
  if (value === "same_element") return "the same element";
  if (value === "out_of_sign") return "out of sign";
  if (value === "mixed_element") return "mixed";
  if (value === "trine_sextile") return "trines and sextiles";
  if (value === "other_harmonic") return "mixed supportive links";
  return undefined;
}

function ordinal(number) {
  const suffix = number % 10 === 1 && number % 100 !== 11
    ? "st"
    : number % 10 === 2 && number % 100 !== 12
      ? "nd"
      : number % 10 === 3 && number % 100 !== 13
        ? "rd"
        : "th";
  return `${number}${suffix} house`;
}

function formatCopyNumber(value) {
  return typeof value === "number" ? value.toFixed(value % 1 === 0 ? 0 : 1) : "unknown";
}

module.exports = {
  ASPECT_PATTERN_ACTIVATION_VERSION,
  ASPECT_PATTERN_ACTIVATION_CONTEXT_BUILDER_VERSION,
  ASPECT_PATTERN_ACTIVATION_CONTENT_LEVELS,
  ASPECT_PATTERN_ACTIVATION_COPY_RESOLVER_VERSION,
  ASPECT_PATTERN_CONTEXT_BUILDER_VERSION,
  ASPECT_PATTERN_CONTENT_LEVELS,
  ASPECT_PATTERN_COPY_RESOLVER_VERSION,
  ASPECT_PATTERN_DETECTOR_VERSION,
  APPROVED_COPY_SLOTS,
  APPROVED_ACTIVATION_COPY_SLOTS,
  AUTHORED_ASPECT_PATTERN_RECORDS,
  AUTHORED_ASPECT_PATTERN_ACTIVATION_RECORDS,
  DEFAULT_ACTIVATION_POLICY,
  DEFAULT_ORB_POLICY,
  DEFAULT_RANKING_POLICY,
  GOVERNED_COPY_RECORDS,
  GOVERNED_ACTIVATION_COPY_RECORDS,
  PATTERN_COPY_JOBS,
  PLANET_IDS,
  SUPPORTED_ASPECTS,
  buildAspectGraph,
  buildAspectPatternActivationInterpretationContexts,
  buildAspectPatternInterpretationContexts,
  buildPatternActivations,
  buildRelationships,
  detectGrandSquares,
  detectGrandTrines,
  detectKites,
  detectMysticRectangles,
  detectPatterns,
  detectTSquares,
  detectYods,
  normalizeOrbPolicy,
  normalizeActivationPolicy,
  normalizeRankingPolicy,
  rankAspectPatterns,
  resolveAspectPatternCopies,
  resolveAspectPatternCopy,
  resolveAspectPatternActivationCopies,
  resolveAspectPatternActivationCopy,
  validateAuthoredAspectPatternActivationRecord,
  validateAspectPatternActivationCopyRecord,
  validateAuthoredAspectPatternRecord,
  validateAspectPatternCopyRecord
};
