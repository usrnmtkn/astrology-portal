"use strict";

const assert = require("node:assert/strict");
const { detectPatterns } = require("../engine/aspect-patterns");
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

console.log("Aspect pattern engine tests passed.");
