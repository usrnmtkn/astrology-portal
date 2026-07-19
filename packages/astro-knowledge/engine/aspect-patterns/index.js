"use strict";

const {
  CANONICAL_PAIR_ORDER,
  normalizeDegrees
} = require("../timing/aspects");
const { SIGNS } = require("../timing/constants");

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

module.exports = {
  DEFAULT_ORB_POLICY,
  PLANET_IDS,
  SUPPORTED_ASPECTS,
  buildAspectGraph,
  buildRelationships,
  detectGrandSquares,
  detectGrandTrines,
  detectKites,
  detectMysticRectangles,
  detectPatterns,
  detectTSquares,
  detectYods,
  normalizeOrbPolicy
};
