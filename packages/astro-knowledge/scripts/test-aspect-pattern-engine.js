"use strict";

const assert = require("node:assert/strict");
const {
  AspectPatternV3SourceGapError,
  ASPECT_PATTERN_CONTEXT_BUILDER_VERSION,
  ASPECT_PATTERN_DETECTOR_VERSION,
  buildAspectPatternInterpretationContexts,
  detectPatterns,
  rankAspectPatterns,
  resolveAspectPatternCopies,
  resolveAspectPatternCopy,
  validateAspectPatternCopyRecord
} = require("../engine/aspect-patterns");
const { fixtures } = require("../engine/aspect-patterns/fixtures");

function patternsOf(result, type) {
  return result.patterns.filter((pattern) => pattern.type === type);
}

function findPattern(result, type) {
  const matches = patternsOf(result, type);
  assert.equal(matches.length, 1, `Expected exactly one ${type}`);
  return matches[0];
}

function stableJson(value) {
  return JSON.stringify(value);
}

function reverseFixture(fixture) {
  return {
    planets: fixture.planets.slice().reverse(),
    aspects: fixture.aspects.slice().reverse().map((aspect) => ({
      ...aspect,
      pointA: aspect.pointB,
      pointB: aspect.pointA
    }))
  };
}

function relationshipExists(result, parentPatternId, childPatternId, relationship) {
  return result.relationships.some((item) => {
    return item.parentPatternId === parentPatternId
      && item.childPatternId === childPatternId
      && item.relationship === relationship;
  });
}

function rankingFor(ranking, patternId) {
  const found = ranking.rankings.find((item) => item.patternId === patternId);
  assert.ok(found, `Missing ranking for ${patternId}`);
  return found;
}

function hasReason(ranking, code, planet) {
  return ranking.reasons.some((reason) => {
    return reason.code === code && (planet === undefined || reason.planet === planet);
  });
}

function rankedDetection(fixture, context = {}) {
  const detection = detectPatterns(fixture);
  const ranking = rankAspectPatterns(detection, {
    planets: fixture.planets,
    ascendantSign: "aries",
    ascendantLongitude: 0,
    midheavenLongitude: 270,
    ...context
  });
  return {
    ...detection,
    ranking
  };
}

function interpretationContextsFor(fixture, context = {}) {
  const detection = rankedDetection(fixture, context);
  return buildAspectPatternInterpretationContexts(detection, {
    planets: fixture.planets,
    ascendantSign: "aries",
    ascendantLongitude: 0,
    midheavenLongitude: 270,
    ...context
  });
}

function contextFor(contexts, type) {
  const matches = contexts.filter((context) => context.patternType === type);
  assert.equal(matches.length, 1, `Expected one ${type} interpretation context`);
  return matches[0];
}

function copyText(copy) {
  return [
    copy.content.eyebrow,
    copy.content.headline,
    copy.content.overview,
    ...copy.content.sections.map((section) => section.body)
  ].filter(Boolean).join(" ");
}

function authoredRecordFor(context, overrides = {}) {
  return {
    id: `authored-test:${context.patternType}`,
    version: "1.0.0",
    patternType: context.patternType,
    contentLevel: "authored",
    status: "approved",
    eligibility: { confidence: ["exact", "strong", "wide", "partial"], houseMode: "any" },
    templates: {
      eyebrow: "{{pattern_name}}",
      headline: "Authored {{pattern_name}} for {{member_planets}}",
      overview: "Authored governed overview for {{member_planets}}.",
      sections: [
        {
          id: "how_it_works",
          template: "Authored governed section for {{pattern_name}}.",
          required: true
        }
      ]
    },
    languageRules: {
      allowedCertainty: context.copyInstructions.allowedCertainty,
      prohibitedClaims: [],
      prohibitedTerms: []
    },
    provenance: {
      sourceIds: ["test:authored"]
    },
    ...overrides
  };
}

{
  const result = detectPatterns(fixtures.grand_square);
  const grandSquare = findPattern(result, "grand_square");
  const tSquares = patternsOf(result, "t_square");

  assert.equal(tSquares.length, 4, "Grand Square must retain four component T-squares");
  assert.equal(grandSquare.roles.oppositionAxes.length, 2);
  assert.equal(grandSquare.roles.apex, undefined);
  assert.equal(grandSquare.sourceAspectIds.length, 6);

  for (const tSquare of tSquares) {
    assert.ok(
      relationshipExists(result, grandSquare.id, tSquare.id, "contains"),
      `Missing Grand Square containment relationship for ${tSquare.id}`
    );
  }
}

{
  const result = detectPatterns(fixtures.t_square);
  const tSquare = findPattern(result, "t_square");
  assert.deepEqual(tSquare.roles.oppositionAxis, ["sun", "moon"]);
  assert.equal(tSquare.roles.apex, "mars");
  assert.equal(tSquare.roles.emptyLeg.longitude, 280);
  assert.equal(tSquare.derivedPoints.find((point) => point.type === "empty_leg").longitude, 280);
}

{
  const result = detectPatterns(fixtures.grand_trine);
  const grandTrine = findPattern(result, "grand_trine");
  assert.equal(grandTrine.roles.elementConsistency, "same_element");
  assert.equal(grandTrine.geometry.confidence, "exact");
}

{
  const result = detectPatterns(fixtures.kite);
  const kite = findPattern(result, "kite");
  const grandTrine = findPattern(result, "grand_trine");
  assert.deepEqual(kite.roles.grandTrinePlanets, grandTrine.planets);
  assert.equal(kite.roles.focalPlanet, "saturn");
  assert.equal(kite.roles.opposedTrinePlanet, "mars");
  assert.deepEqual(kite.roles.spine, ["mars", "saturn"]);
  assert.ok(relationshipExists(result, kite.id, grandTrine.id, "contains"));
  assert.ok(relationshipExists(result, kite.id, grandTrine.id, "completes"));
}

{
  const result = detectPatterns(fixtures.yod);
  const yod = findPattern(result, "yod");
  assert.deepEqual(yod.roles.basePlanets, ["moon", "venus"]);
  assert.equal(yod.roles.apex, "saturn");
  assert.equal(yod.roles.falloutPoint.longitude, 30);
  assert.equal(yod.derivedPoints.find((point) => point.type === "fallout_point").longitude, 30);
}

{
  const result = detectPatterns(fixtures.mystic_rectangle);
  const rectangle = findPattern(result, "mystic_rectangle");
  assert.equal(rectangle.roles.oppositionAxes.length, 2);
  assert.equal(rectangle.roles.supportiveAspects.length, 4);
  assert.equal(rectangle.roles.variant, "trine_sextile");
  assert.equal(rectangle.roles.apex, undefined);
  assert.equal(rectangle.roles.focalPlanet, undefined);
}

{
  const result = detectPatterns(fixtures.angle_node_ignored);
  assert.equal(result.patterns.length, 0);
  assert.equal(result.diagnostics.skippedAspects.length, 4);
  assert.ok(result.diagnostics.skippedAspects.every((item) => item.reason === "non_planet_pattern_member"));
}

{
  const result = detectPatterns(fixtures.wide_grand_trine);
  const grandTrine = findPattern(result, "grand_trine");
  assert.equal(grandTrine.geometry.confidence, "wide");
  assert.ok(grandTrine.geometry.warnings.includes("wide_orb_pattern"));
}

{
  const result = detectPatterns(fixtures.partial_t_square);
  const tSquare = findPattern(result, "t_square");
  assert.equal(tSquare.geometry.confidence, "partial");
  assert.ok(tSquare.geometry.warnings.includes("partial_pattern_from_policy_tolerance"));
}

{
  const result = detectPatterns(fixtures.invalid_near_pattern);
  assert.equal(result.patterns.length, 0);
}

{
  const result = detectPatterns(fixtures.out_of_sign_grand_trine);
  const grandTrine = findPattern(result, "grand_trine");
  assert.equal(grandTrine.roles.elementConsistency, "out_of_sign");
  assert.equal(grandTrine.geometry.isOutOfSign, true);
  assert.ok(grandTrine.geometry.warnings.includes("out_of_sign_pattern"));
}

{
  const forward = detectPatterns(fixtures.grand_square);
  const reversed = detectPatterns(reverseFixture(fixtures.grand_square));
  assert.equal(stableJson(reversed), stableJson(forward));
}

{
  const result = detectPatterns(fixtures.grand_square);
  const ids = result.patterns.map((pattern) => pattern.id);
  assert.equal(ids.length, new Set(ids).size, "Duplicate pattern ID emitted");
}

{
  const result = detectPatterns(fixtures.kite);
  const patternIds = new Set(result.patterns.map((pattern) => pattern.id));
  for (const relationship of result.relationships) {
    assert.ok(patternIds.has(relationship.parentPatternId), `Invalid relationship parent ${relationship.parentPatternId}`);
    assert.ok(patternIds.has(relationship.childPatternId), `Invalid relationship child ${relationship.childPatternId}`);
  }
  for (const pattern of result.patterns) {
    assert.equal(pattern.geometry.orbPolicyId, result.orbPolicyId);
    assert.ok(pattern.sourceAspectIds.length > 0, `${pattern.id} missing source aspect IDs`);
  }
}

{
  const result = detectPatterns(fixtures.grand_square);
  const ranking = rankAspectPatterns(result, {
    planets: fixtures.grand_square.planets,
    ascendantSign: "aries",
    ascendantLongitude: 0,
    midheavenLongitude: 270
  });
  const grandSquare = findPattern(result, "grand_square");
  const tSquares = patternsOf(result, "t_square");
  const grandSquareRanking = rankingFor(ranking, grandSquare.id);

  assert.equal(ranking.policyId, "natal_pattern_ranking_v1");
  assert.equal(ranking.rankings.length, result.patterns.length);
  assert.equal(new Set(ranking.displayOrder).size, result.patterns.length);
  assert.deepEqual(new Set(ranking.displayOrder), new Set(result.patterns.map((pattern) => pattern.id)));
  assert.equal(ranking.displayOrder[0], grandSquare.id);
  assert.ok(hasReason(grandSquareRanking, "parent_pattern"));
  assert.ok(hasReason(grandSquareRanking, "contains_sun", "sun"));
  assert.ok(hasReason(grandSquareRanking, "contains_moon", "moon"));
  assert.ok(hasReason(grandSquareRanking, "contains_personal_planet", "mars"));
  assert.ok(hasReason(grandSquareRanking, "contains_chart_ruler", "mars"));
  assert.ok(hasReason(grandSquareRanking, "planet_near_angle", "sun"));
  assert.ok(hasReason(grandSquareRanking, "repeated_planet", "sun"));

  for (const tSquare of tSquares) {
    const tSquareRanking = rankingFor(ranking, tSquare.id);
    assert.ok(grandSquareRanking.score.baseDisplayPriority > tSquareRanking.score.baseDisplayPriority);
    assert.ok(hasReason(tSquareRanking, "contained_pattern"));
  }
}

{
  const result = detectPatterns(fixtures.kite);
  const ranking = rankAspectPatterns(result, {
    planets: fixtures.kite.planets,
    ascendantSign: "aries"
  });
  const kite = findPattern(result, "kite");
  const grandTrine = findPattern(result, "grand_trine");
  assert.ok(ranking.displayOrder.indexOf(kite.id) < ranking.displayOrder.indexOf(grandTrine.id));
  assert.ok(hasReason(rankingFor(ranking, kite.id), "parent_pattern"));
  assert.ok(hasReason(rankingFor(ranking, grandTrine.id), "contained_pattern"));
}

{
  const tight = rankAspectPatterns(detectPatterns(fixtures.grand_trine), {
    planets: fixtures.grand_trine.planets
  }).rankings[0];
  const wide = rankAspectPatterns(detectPatterns(fixtures.wide_grand_trine), {
    planets: fixtures.wide_grand_trine.planets
  }).rankings[0];
  assert.ok(tight.score.baseDisplayPriority > wide.score.baseDisplayPriority);
}

{
  const withAngles = rankAspectPatterns(detectPatterns(fixtures.t_square), {
    planets: fixtures.t_square.planets,
    ascendantSign: "aries",
    ascendantLongitude: 100
  });
  const withoutBirthTime = rankAspectPatterns(detectPatterns(fixtures.t_square), {
    planets: fixtures.t_square.planets
  });
  const pattern = findPattern(detectPatterns(fixtures.t_square), "t_square");
  assert.ok(rankingFor(withAngles, pattern.id).score.natalProminence > rankingFor(withoutBirthTime, pattern.id).score.natalProminence);
  assert.equal(rankingFor(withoutBirthTime, pattern.id).score.geometry, rankingFor(withAngles, pattern.id).score.geometry);
  assert.equal(JSON.stringify(withoutBirthTime), JSON.stringify(rankAspectPatterns(detectPatterns(fixtures.t_square), {
    planets: fixtures.t_square.planets.slice().reverse()
  })));
}

{
  const result = detectPatterns({
    planets: fixtures.t_square.planets.concat([{ id: "ceres", longitude: 10, sign: "aries" }]),
    aspects: fixtures.t_square.aspects
  });
  const ranking = rankAspectPatterns(result, {
    planets: fixtures.t_square.planets.concat([{ id: "ceres", longitude: 10, sign: "aries" }]),
    ascendantSign: "unknown"
  });
  assert.equal(ranking.rankings.length, result.patterns.length);
}

{
  const detection = rankedDetection(fixtures.grand_square);
  const before = JSON.stringify(detection);
  const contexts = buildAspectPatternInterpretationContexts(detection, {
    planets: fixtures.grand_square.planets,
    ascendantSign: "aries",
    ascendantLongitude: 0,
    midheavenLongitude: 270
  });

  assert.equal(JSON.stringify(detection), before, "Context builder must not mutate detector or ranking output");
  assert.equal(contexts.length, detection.ranking.rankings.length, "Every ranking record needs one interpretation context");
  assert.deepEqual(contexts.map((context) => context.patternId), detection.ranking.displayOrder);
  assert.ok(contexts[0].display.isPrimary);

  for (const context of contexts) {
    const pattern = detection.patterns.find((item) => item.id === context.patternId);
    assert.ok(pattern, `Missing pattern for context ${context.patternId}`);
    assert.deepEqual(context.geometry.sourceAspectIds, pattern.sourceAspectIds);
    assert.equal(context.provenance.detectorVersion, ASPECT_PATTERN_DETECTOR_VERSION);
    assert.equal(context.provenance.contextBuilderVersion, ASPECT_PATTERN_CONTEXT_BUILDER_VERSION);
    assert.equal(context.provenance.orbPolicyId, pattern.geometry.orbPolicyId);
    assert.equal(context.provenance.rankingPolicyId, detection.ranking.policyId);
    assert.ok(context.copyInstructions.primaryJob);
    assert.ok(!JSON.stringify(context).match(/\bYou\b|\byour\b/i), "Context must not contain finished second-person interpretation copy");
  }

  const grandSquare = contexts.find((context) => context.patternType === "grand_square");
  assert.ok(grandSquare);
  assert.equal(grandSquare.roles.apex, undefined);
  assert.ok(grandSquare.display.childPatternIds.some((patternId) => patternId.includes("t_square")));
  assert.ok(grandSquare.members.every((member) => member.roles.includes("opposition_axis")));
}

{
  const contexts = interpretationContextsFor(fixtures.t_square);
  const tSquare = contextFor(contexts, "t_square");
  assert.equal(tSquare.roles.apex, "mars");
  assert.ok(tSquare.members.find((member) => member.planet === "mars").roles.includes("apex"));
  assert.ok(tSquare.derivedPoints.some((point) => point.type === "empty_leg"));
}

{
  const contexts = interpretationContextsFor(fixtures.yod);
  const yod = contextFor(contexts, "yod");
  assert.deepEqual(yod.roles.basePlanets, ["moon", "venus"]);
  assert.equal(yod.roles.apex, "saturn");
  assert.ok(yod.derivedPoints.some((point) => point.type === "fallout_point"));
  assert.ok(yod.members.find((member) => member.planet === "saturn").roles.includes("apex"));
  assert.ok(yod.members.find((member) => member.planet === "moon").roles.includes("base"));
}

{
  const contexts = interpretationContextsFor(fixtures.kite);
  const kite = contextFor(contexts, "kite");
  const grandTrine = contextFor(contexts, "grand_trine");
  assert.ok(kite.display.childPatternIds.includes(grandTrine.patternId));
  assert.ok(grandTrine.display.parentPatternIds.includes(kite.patternId));
  assert.ok(kite.members.find((member) => member.planet === "saturn").roles.includes("focal_planet"));
}

{
  const contexts = interpretationContextsFor(fixtures.mystic_rectangle);
  const rectangle = contextFor(contexts, "mystic_rectangle");
  assert.equal(rectangle.roles.apex, undefined);
  assert.ok(rectangle.members.every((member) => member.roles.includes("opposition_axis")));
}

{
  const detection = rankedDetection(fixtures.wide_grand_trine);
  const contexts = buildAspectPatternInterpretationContexts(detection, {
    planets: fixtures.wide_grand_trine.planets
  });
  assert.equal(contexts[0].geometry.confidence, "wide");
  assert.ok(contexts[0].geometry.warnings.includes("wide_orb_pattern"));
  assert.equal(contexts[0].copyInstructions.allowedCertainty, "qualified");
}

{
  const detection = rankedDetection(fixtures.t_square);
  detection.patterns[0].geometry.warnings.push("new_warning_code_from_future");
  detection.ranking.rankings[0].reasons.push({ code: "new_ranking_code_from_future", planet: "mars", value: 1 });
  const contexts = buildAspectPatternInterpretationContexts(detection, {
    planets: fixtures.t_square.planets
  });
  assert.ok(contexts[0].geometry.warnings.includes("new_warning_code_from_future"));
  assert.ok(contexts[0].ranking.reasons.some((reason) => reason.code === "new_ranking_code_from_future"));
}

{
  const forward = interpretationContextsFor(fixtures.grand_square);
  const reversed = interpretationContextsFor(reverseFixture(fixtures.grand_square));
  assert.equal(JSON.stringify(reversed), JSON.stringify(forward));
}

{
  const examples = [
    ["t_square", interpretationContextsFor(fixtures.t_square)],
    ["grand_square", interpretationContextsFor(fixtures.grand_square)],
    ["grand_trine", interpretationContextsFor(fixtures.grand_trine)],
    ["kite", interpretationContextsFor(fixtures.kite)],
    ["yod", interpretationContextsFor(fixtures.yod)],
    ["mystic_rectangle", interpretationContextsFor(fixtures.mystic_rectangle)]
  ];
  for (const [type, contexts] of examples) {
    const context = contextFor(contexts, type);
    const resolved = resolveAspectPatternCopy(context);
    assert.equal(resolved.patternId, context.patternId);
    assert.equal(resolved.patternType, context.patternType);
    assert.ok(resolved.content.headline);
    assert.ok(resolved.content.overview);
    assert.ok(resolved.content.sections.length > 0);
    assert.ok(resolved.source.recordId);
    assert.ok(resolved.source.contentLevel);
    assert.equal(JSON.stringify(resolveAspectPatternCopy(context)), JSON.stringify(resolved), "Copy resolution must be deterministic");
  }
}

{
  const context = contextFor(interpretationContextsFor(fixtures.t_square), "t_square");
  const authored = authoredRecordFor(context);
  const resolved = resolveAspectPatternCopy(context, { authoredRecords: [authored] });
  assert.equal(resolved.source.contentLevel, "source_grounded_template");
  assert.equal(resolved.source.resolverVersion, "v3");
  assert.notEqual(resolved.source.recordId, authored.id, "Locked v3.7 copy must not be overridden by stale authored v1 records.");
}

{
  const context = contextFor(interpretationContextsFor(fixtures.t_square), "t_square");
  const authored = authoredRecordFor(context, {
    id: "authored-test:invalid-slot",
    templates: {
      eyebrow: "{{pattern_name}}",
      headline: "Broken {{unknown_slot}}",
      overview: "Broken {{member_planets}}.",
      sections: [{ id: "how_it_works", template: "Broken.", required: true }]
    }
  });
  const resolved = resolveAspectPatternCopy(context, { authoredRecords: [authored] });
  assert.equal(resolved.source.contentLevel, "source_grounded_template");
  assert.notEqual(resolved.source.recordId, authored.id);
  const validation = validateAspectPatternCopyRecord(authored, context);
  assert.ok(validation.errors.includes("unknown_required_slot:headline"));
  assert.ok(validation.unknownSlots.includes("unknown_slot"));
}

{
  const tSquare = contextFor(interpretationContextsFor(fixtures.t_square), "t_square");
  const tSquareCopy = resolveAspectPatternCopy(tSquare);
  const text = copyText(tSquareCopy);
  assert.match(text, /Mars/);
  assert.match(text, /balancing response/i);
  assert.match(text, /bold|relational|protective|structured|fairness|belonging/i);
}

{
  const grandSquare = contextFor(interpretationContextsFor(fixtures.grand_square), "grand_square");
  const mysticRectangle = contextFor(interpretationContextsFor(fixtures.mystic_rectangle), "mystic_rectangle");
  assert.doesNotMatch(copyText(resolveAspectPatternCopy(grandSquare)), /\bapex\b/i);
  assert.doesNotMatch(copyText(resolveAspectPatternCopy(mysticRectangle)), /\bapex\b/i);
}

{
  const kiteContexts = interpretationContextsFor(fixtures.kite);
  const kite = contextFor(kiteContexts, "kite");
  const grandTrine = contextFor(kiteContexts, "grand_trine");
  const text = copyText(resolveAspectPatternCopy(kite));
  assert.match(text, /Grand Trine/i);
  assert.match(text, /opposite/i);
  assert.ok(kite.display.childPatternIds.includes(grandTrine.patternId));
  const copies = resolveAspectPatternCopies(kiteContexts);
  assert.equal(copies.length, 1, "An exact Kite must suppress its contained Grand Trine from reader copy.");
  assert.equal(copies[0].patternId, kite.patternId);
}

{
  const yod = contextFor(interpretationContextsFor(fixtures.yod), "yod");
  const yodCopy = resolveAspectPatternCopy(yod);
  const text = copyText(yodCopy);
  assert.match(yodCopy.content.headline, /more than you can carry|possible/i);
  assert.equal(yodCopy.source.contentLevel, "source_grounded_template");
  assert.match(text, /Opposite .+reference point/i);
  assert.match(text, /An agreement can look reasonable and still place too much weight on you over time/i);
  assert.doesNotMatch(text, /\b(Finger of God|fate|destiny|chosen|special mission|unavoidable calling)\b/i);
}

{
  const wide = buildAspectPatternInterpretationContexts(rankedDetection(fixtures.wide_grand_trine), {
    planets: fixtures.wide_grand_trine.planets
  })[0];
  const copy = resolveAspectPatternCopy(wide);
  assert.equal(copy.source.contentLevel, "source_grounded_template");
  assert.equal(copy.source.status, "approved");
  assert.match(copyText(copy), /\bwider?\b/i);
}

{
  const partial = contextFor(interpretationContextsFor(fixtures.partial_t_square), "t_square");
  const copy = resolveAspectPatternCopy(partial);
  assert.match(copyText(copy), /\bpartial\b/i);
}

{
  const noHouse = contextFor(interpretationContextsFor(fixtures.t_square, { planets: fixtures.t_square.planets.map(({ house, ...planet }) => planet) }), "t_square");
  const copy = resolveAspectPatternCopy(noHouse);
  assert.match(copyText(copy), /balancing response/i);
  assert.doesNotMatch(copyText(copy), /\bhouse undefined\b|undefined/i);
}

{
  const context = contextFor(interpretationContextsFor(fixtures.t_square), "t_square");
  const malformed = { ...context, roles: { type: "t_square" }, derivedPoints: [] };
  assert.throws(
    () => resolveAspectPatternCopy(malformed),
    AspectPatternV3SourceGapError,
    "Missing required v3.7 clauses must fail closed instead of emitting emergency boilerplate."
  );
}

{
  const context = contextFor(interpretationContextsFor(fixtures.t_square), "t_square");
  const before = JSON.stringify(context);
  const copy = resolveAspectPatternCopy(context);
  assert.equal(JSON.stringify(context), before, "Copy resolver must not mutate context input");
  assert.doesNotMatch(copyText(copy), /baseDisplayPriority|structuralContext|sourceAspectIds|tight_geometry|contains_sun/);
}

console.log("Aspect pattern engine tests passed.");
