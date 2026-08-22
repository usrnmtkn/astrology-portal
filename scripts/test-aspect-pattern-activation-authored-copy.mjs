import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const {
  AUTHORED_ASPECT_PATTERN_ACTIVATION_RECORDS,
  buildAspectPatternActivationInterpretationContexts,
  buildAspectPatternInterpretationContexts,
  buildPatternActivations,
  detectPatterns,
  rankAspectPatterns,
  resolveAspectPatternActivationCopy,
  validateAuthoredAspectPatternActivationRecord
} = require("../packages/astro-knowledge/engine/aspect-patterns/index.js");
const { fixtures } = require("../packages/astro-knowledge/engine/aspect-patterns/fixtures.js");

const calculatedFor = "2026-07-19T12:00:00.000Z";
const goldenDir = path.join(repoRoot, "packages/astro-knowledge/engine/aspect-patterns/fixtures/activation/copy");

function rankedDetection(fixture) {
  const detection = detectPatterns(fixture);
  const rankingContext = {
    planets: fixture.planets,
    ascendantSign: "aries",
    ascendantLongitude: 0,
    midheavenLongitude: 270
  };
  const ranked = {
    ...detection,
    ranking: rankAspectPatterns(detection, rankingContext)
  };
  return {
    ...ranked,
    interpretationContexts: buildAspectPatternInterpretationContexts(ranked, rankingContext)
  };
}

function contextsFor(fixture, transitAspects) {
  const detection = rankedDetection(fixture);
  const activation = buildPatternActivations(detection, transitAspects, { calculatedFor });
  return buildAspectPatternActivationInterpretationContexts({ ...detection, activation }, { activation, natalContexts: detection.interpretationContexts });
}

function fixtureWithOrbs(fixture, orbForAspect) {
  return {
    planets: fixture.planets,
    aspects: fixture.aspects.map((aspect) => ({ ...aspect, orb: orbForAspect(aspect) }))
  };
}

function contextForCase(fixtureCase) {
  const context = contextsFor(fixtureCase.fixture, fixtureCase.transitAspects).find((candidate) => candidate.patternType === fixtureCase.patternType);
  assert.ok(context, `Missing context for ${fixtureCase.id}`);
  return context;
}

const wideYodFixture = fixtureWithOrbs(fixtures.yod, (aspect) => aspect.type === "sextile" ? 3.8 : 2.4);
const partialYodFixture = fixtureWithOrbs(fixtures.yod, (aspect) => aspect.type === "sextile" ? 3.8 : 3.4);

const cases = [
  { id: "t-square-apex-applying", patternType: "t_square", route: "t_square.apex", fixture: fixtures.t_square, transitAspects: [{ id: "transit.mars.square.mars", movingBody: "mars", targetNatalPlanet: "mars", aspectType: "square", orb: 0.2, applying: true }] },
  { id: "t-square-opposition-separating", patternType: "t_square", route: "t_square.opposition_member", fixture: fixtures.t_square, transitAspects: [{ id: "transit.saturn.opposition.sun", movingBody: "saturn", targetNatalPlanet: "sun", aspectType: "opposition", orb: 1.2, applying: false }] },
  { id: "grand-square-shared-planet", patternType: "grand_square", route: "grand_square.member", fixture: fixtures.grand_square, transitAspects: [{ id: "transit.saturn.square.moon", movingBody: "saturn", targetNatalPlanet: "moon", aspectType: "square", orb: 0.5, applying: true }] },
  { id: "grand-trine-separating", patternType: "grand_trine", route: "grand_trine.member", fixture: fixtures.grand_trine, transitAspects: [{ id: "transit.venus.trine.moon", movingBody: "venus", targetNatalPlanet: "moon", aspectType: "trine", orb: 1.1, applying: false }] },
  { id: "kite-focal-applying", patternType: "kite", route: "kite.focal_planet", fixture: fixtures.kite, transitAspects: [{ id: "transit.moon.opposition.saturn", movingBody: "moon", targetNatalPlanet: "saturn", aspectType: "opposition", orb: 0.4, applying: true }] },
  { id: "kite-resource-separating", patternType: "kite", route: "kite.resource_planet", fixture: fixtures.kite, transitAspects: [{ id: "transit.sun.trine.mars", movingBody: "sun", targetNatalPlanet: "mars", aspectType: "trine", orb: 1, applying: false }] },
  { id: "yod-apex-applying", patternType: "yod", route: "yod.apex", fixture: fixtures.yod, transitAspects: [{ id: "transit.sun.quincunx.saturn", movingBody: "sun", targetNatalPlanet: "saturn", aspectType: "quincunx", orb: 0.6, applying: true }] },
  { id: "mystic-rectangle-member-separating", patternType: "mystic_rectangle", route: "mystic_rectangle.member", fixture: fixtures.mystic_rectangle, transitAspects: [{ id: "transit.mercury.sextile.moon", movingBody: "mercury", targetNatalPlanet: "moon", aspectType: "sextile", orb: 2.2, applying: false }] },
  { id: "t-square-multi-trigger-mixed", patternType: "t_square", route: "t_square.apex", fixture: fixtures.t_square, transitAspects: [
    { id: "transit.mars.square.mars", movingBody: "mars", targetNatalPlanet: "mars", aspectType: "square", orb: 0.2, applying: true },
    { id: "transit.jupiter.trine.sun", movingBody: "jupiter", targetNatalPlanet: "sun", aspectType: "trine", orb: 1.5, applying: false }
  ] },
  { id: "t-square-exact", patternType: "t_square", route: "t_square.apex", fixture: fixtures.t_square, transitAspects: [{ id: "transit.exact", movingBody: "mars", targetNatalPlanet: "mars", aspectType: "square", orb: 0, applying: true }] },
  { id: "t-square-applying", patternType: "t_square", route: "t_square.apex", fixture: fixtures.t_square, transitAspects: [{ id: "transit.applying", movingBody: "mars", targetNatalPlanet: "mars", aspectType: "square", orb: 1, applying: true }] },
  { id: "t-square-separating", patternType: "t_square", route: "t_square.apex", fixture: fixtures.t_square, transitAspects: [{ id: "transit.separating", movingBody: "mars", targetNatalPlanet: "mars", aspectType: "square", orb: 1, applying: false }] },
  { id: "wide-yod-apex", patternType: "yod", route: "yod.apex", fixture: wideYodFixture, transitAspects: [{ id: "transit.sun.quincunx.saturn", movingBody: "sun", targetNatalPlanet: "saturn", aspectType: "quincunx", orb: 0.6, applying: true }] },
  { id: "partial-yod-apex", patternType: "yod", route: "yod.apex", fixture: partialYodFixture, transitAspects: [{ id: "transit.sun.quincunx.saturn", movingBody: "sun", targetNatalPlanet: "saturn", aspectType: "quincunx", orb: 0.6, applying: true }] }
];

function copyText(copy) {
  return [
    copy.content.eyebrow,
    copy.content.headline,
    copy.content.overview,
    ...copy.content.sections.map((section) => section.body)
  ].filter(Boolean).join(" ");
}

function assertNoLeakage(copy) {
  const text = copyText(copy);
  assert.doesNotMatch(text, /\b(activationId|sourceAspectId|reason code|policy|builder|score|rank|currentDisplayPriority|sharedPlanetFanout|fan-out|target role|source aspect|warning code|geometry confidence)\b/i);
  assert.doesNotMatch(text, /\b(will happen|guarantee|guaranteed|forces?|causes?|crisis|chain reaction)\b/i);
}

{
  assert.equal(AUTHORED_ASPECT_PATTERN_ACTIVATION_RECORDS.length, 8);
  const routes = new Set(AUTHORED_ASPECT_PATTERN_ACTIVATION_RECORDS.map((record) => record.id.replace(/^aspect-pattern-activation-authored:/, "").replace(/:v1$/, "").replace("opposition-member", "opposition_member")));
  assert.deepEqual([...routes].sort(), [
    "grand_square:member",
    "grand_trine:member",
    "kite:focal_planet",
    "kite:resource_planet",
    "mystic_rectangle:member",
    "t_square:apex",
    "t_square:opposition_member",
    "yod:apex"
  ].sort());
}

for (const fixtureCase of cases) {
  const context = contextForCase(fixtureCase);
  const authored = resolveAspectPatternActivationCopy(context);
  const fallback = resolveAspectPatternActivationCopy(context, { authoredRecords: [] });
  assert.equal(authored.source.contentLevel, "authored", `${fixtureCase.id} should use authored copy`);
  assert.notEqual(authored.source.recordId, fallback.source.recordId);
  assert.deepEqual(Object.keys(authored).sort(), Object.keys(fallback).sort());
  assertNoLeakage(authored);

  const golden = fs.readFileSync(path.join(goldenDir, `${fixtureCase.id}.json`), "utf8");
  const expectedFallback = JSON.parse(golden).resolvedCopy;
  assert.equal(JSON.stringify(fallback), JSON.stringify(expectedFallback), `${fixtureCase.id} fallback changed`);

  const validation = validateAuthoredAspectPatternActivationRecord(
    AUTHORED_ASPECT_PATTERN_ACTIVATION_RECORDS.find((record) => record.id === authored.source.recordId),
    context
  );
  assert.equal(validation.ok, true, `${fixtureCase.id} authored record validates`);
}

{
  const apexContext = contextForCase(cases.find((item) => item.id === "t-square-apex-applying"));
  const oppositionContext = contextForCase(cases.find((item) => item.id === "t-square-opposition-separating"));
  const apexRecord = AUTHORED_ASPECT_PATTERN_ACTIVATION_RECORDS.find((record) => record.id.includes("t_square:apex"));
  assert.equal(resolveAspectPatternActivationCopy(apexContext, { authoredRecords: [apexRecord] }).source.contentLevel, "authored");
  assert.notEqual(resolveAspectPatternActivationCopy(oppositionContext, { authoredRecords: [apexRecord] }).source.contentLevel, "authored");
}

{
  const focalContext = contextForCase(cases.find((item) => item.id === "kite-focal-applying"));
  const resourceContext = contextForCase(cases.find((item) => item.id === "kite-resource-separating"));
  const focalRecord = AUTHORED_ASPECT_PATTERN_ACTIVATION_RECORDS.find((record) => record.id.includes("kite:focal_planet"));
  assert.equal(resolveAspectPatternActivationCopy(focalContext, { authoredRecords: [focalRecord] }).source.contentLevel, "authored");
  assert.notEqual(resolveAspectPatternActivationCopy(resourceContext, { authoredRecords: [focalRecord] }).source.contentLevel, "authored");
}

{
  const context = contextForCase(cases.find((item) => item.id === "t-square-apex-applying"));
  const record = AUTHORED_ASPECT_PATTERN_ACTIVATION_RECORDS.find((item) => item.id.includes("t_square:apex"));
  for (const status of ["draft", "reviewed", "deprecated"]) {
    const copy = resolveAspectPatternActivationCopy(context, { authoredRecords: [{ ...record, status }] });
    assert.notEqual(copy.source.contentLevel, "authored", `${status} should not override fallback`);
  }
}

{
  const context = contextForCase(cases.find((item) => item.id === "t-square-applying"));
  const base = AUTHORED_ASPECT_PATTERN_ACTIVATION_RECORDS.find((item) => item.id.includes("t_square:apex"));
  const broad = { ...base, id: "aspect-pattern-activation-authored:test:z-broad:v1", eligibility: { ...base.eligibility, timingStates: undefined, patternConfidence: ["exact", "strong", "wide", "partial"] }, priority: 1 };
  const narrow = { ...base, id: "aspect-pattern-activation-authored:test:a-narrow:v1", eligibility: { ...base.eligibility, timingStates: ["applying"], patternConfidence: ["exact"] }, priority: 1 };
  const chosen = resolveAspectPatternActivationCopy(context, { authoredRecords: [broad, narrow] });
  assert.equal(chosen.source.recordId, narrow.id);
  const firstById = { ...base, id: "aspect-pattern-activation-authored:test:a-stable:v1", priority: 1 };
  const secondById = { ...base, id: "aspect-pattern-activation-authored:test:b-stable:v1", priority: 1 };
  assert.equal(resolveAspectPatternActivationCopy(context, { authoredRecords: [secondById, firstById] }).source.recordId, firstById.id);
}

{
  const tApex = copyText(resolveAspectPatternActivationCopy(contextForCase(cases.find((item) => item.id === "t-square-apex-applying"))));
  const tOpposition = copyText(resolveAspectPatternActivationCopy(contextForCase(cases.find((item) => item.id === "t-square-opposition-separating"))));
  assert.notEqual(tApex, tOpposition);
  assert.doesNotMatch(tOpposition, /\bapex\b/i);

  const kiteFocal = copyText(resolveAspectPatternActivationCopy(contextForCase(cases.find((item) => item.id === "kite-focal-applying"))));
  const kiteResource = copyText(resolveAspectPatternActivationCopy(contextForCase(cases.find((item) => item.id === "kite-resource-separating"))));
  assert.notEqual(kiteFocal, kiteResource);
  assert.match(kiteFocal, /Grand Trine/i);
  assert.match(kiteFocal, /opposition/i);
  assert.match(kiteResource, /Grand Trine/i);
  assert.match(kiteResource, /opposition/i);

  assert.doesNotMatch(copyText(resolveAspectPatternActivationCopy(contextForCase(cases.find((item) => item.id === "grand-square-shared-planet")))), /\bapex\b/i);
  assert.doesNotMatch(copyText(resolveAspectPatternActivationCopy(contextForCase(cases.find((item) => item.id === "mystic-rectangle-member-separating")))), /\bapex\b/i);
  assert.doesNotMatch(copyText(resolveAspectPatternActivationCopy(contextForCase(cases.find((item) => item.id === "yod-apex-applying")))), /\b(fate|destiny|Finger of God|chosen|calling|special mission|meant to happen|unavoidable|karmic|turning point)\b/i);
  assert.match(copyText(resolveAspectPatternActivationCopy(contextForCase(cases.find((item) => item.id === "wide-yod-apex")))), /wider natal pattern/i);
  assert.match(copyText(resolveAspectPatternActivationCopy(contextForCase(cases.find((item) => item.id === "partial-yod-apex")))), /partial natal pattern/i);
  assert.match(copyText(resolveAspectPatternActivationCopy(contextForCase(cases.find((item) => item.id === "t-square-multi-trigger-mixed")))), /also contact/i);
  assert.match(copyText(resolveAspectPatternActivationCopy(contextForCase(cases.find((item) => item.id === "grand-square-shared-planet")))), /without being equally loud/i);
}

const writeupsUi = fs.readFileSync(path.join(repoRoot, "apps/admin/src/AspectPatternWriteups.tsx"), "utf8");
assert.match(writeupsUi, /initialKind = "natal"/);
assert.match(writeupsUi, /setKind\(nextKind\)/);
assert.match(writeupsUi, /kind=\$\{nextKind\}/);

const dashboard = fs.readFileSync(path.join(repoRoot, "apps/admin/src/GeneratedContentAdminDashboard.tsx"), "utf8");
assert.match(dashboard, /AspectPatternWriteups/);

console.log("Aspect-pattern activation authored copy tests passed.");
