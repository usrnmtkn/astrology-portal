import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const {
  AUTHORED_ASPECT_PATTERN_RECORDS,
  GOVERNED_COPY_RECORDS,
  buildAspectPatternInterpretationContexts,
  detectPatterns,
  rankAspectPatterns,
  resolveAspectPatternCopy,
  validateAuthoredAspectPatternRecord
} = require("../packages/astro-knowledge/engine/aspect-patterns/index.js");
const { fixtures } = require("../packages/astro-knowledge/engine/aspect-patterns/fixtures.js");

const patternTypes = ["t_square", "grand_square", "grand_trine", "kite", "yod", "mystic_rectangle"];

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function contextsFor(fixture, context = {}) {
  const detection = detectPatterns(fixture);
  const rankingContext = {
    planets: fixture.planets,
    ascendantSign: "aries",
    ascendantLongitude: 0,
    midheavenLongitude: 270,
    ...context
  };
  detection.ranking = rankAspectPatterns(detection, rankingContext);
  return buildAspectPatternInterpretationContexts(detection, rankingContext);
}

function oneContext(fixture, type, context = {}) {
  const found = contextsFor(fixture, context).find((item) => item.patternType === type);
  assert.ok(found, `Missing ${type} context`);
  return found;
}

function cloned(value) {
  return JSON.parse(JSON.stringify(value));
}

function copyText(copy) {
  return [
    copy.content.eyebrow,
    copy.content.headline,
    copy.content.overview,
    ...copy.content.sections.map((section) => section.body)
  ].filter(Boolean).join(" ");
}

function assertCopyShape(copy) {
  assert.equal(typeof copy.patternId, "string");
  assert.equal(typeof copy.patternType, "string");
  assert.equal(typeof copy.source.recordId, "string");
  assert.equal(typeof copy.source.contentLevel, "string");
  assert.equal(typeof copy.content.headline, "string");
  assert.equal(typeof copy.content.overview, "string");
  assert.ok(Array.isArray(copy.content.sections));
  assert.ok(Array.isArray(copy.diagnostics.missingSlots));
  assert.ok(Array.isArray(copy.diagnostics.skippedSections));
}

function resolveLegacy(context, options = {}) {
  return resolveAspectPatternCopy(context, { ...options, useLegacyResolver: true });
}

function directAuthoredFor(context) {
  return {
    id: `authored-test:direct:${context.patternType}`,
    version: "1.0.0",
    patternType: context.patternType,
    status: "approved",
    eligibility: {
      confidence: ["exact", "strong", "wide", "partial"],
      houseMode: "any"
    },
    content: {
      eyebrow: "{{pattern_name}}",
      headline: "Direct authored {{pattern_name}} for {{member_planets}}",
      overview: "Direct authored overview for {{member_planets}}.",
      sections: [{ id: "how_it_works", template: "Direct authored section.", required: true }]
    },
    languageRules: {
      certainty: "direct",
      prohibitedClaims: []
    },
    provenance: {
      sourceIds: ["test:direct-authored"],
      editorialStatus: "editorial_synthesis"
    }
  };
}

function invalidSlotAuthoredFor(context) {
  const record = cloned(AUTHORED_ASPECT_PATTERN_RECORDS.find((item) => item.patternType === context.patternType));
  record.id = `authored-test:unknown-slot:${context.patternType}`;
  record.content.headline = "Broken {{unknown_slot}}";
  return record;
}

for (const type of patternTypes) {
  const records = AUTHORED_ASPECT_PATTERN_RECORDS.filter((record) => record.patternType === type);
  assert.ok(records.length >= 1, `${type} needs an authored record`);
  assert.ok(records.some((record) => record.status === "approved"), `${type} needs approved authored record`);
  assert.ok(GOVERNED_COPY_RECORDS.some((record) => record.patternType === type && record.contentLevel === "source_grounded_template"), `${type} needs source template fallback`);
  assert.ok(GOVERNED_COPY_RECORDS.some((record) => record.patternType === type && record.contentLevel === "madlib_fallback"), `${type} needs madlib fallback`);
  assert.ok(GOVERNED_COPY_RECORDS.some((record) => record.patternType === type && record.contentLevel === "emergency_fallback"), `${type} needs emergency fallback`);
}

const examples = [
  ["t_square", oneContext(fixtures.t_square, "t_square")],
  ["grand_square", oneContext(fixtures.grand_square, "grand_square")],
  ["grand_trine", oneContext(fixtures.grand_trine, "grand_trine")],
  ["kite", oneContext(fixtures.kite, "kite")],
  ["yod", oneContext(fixtures.yod, "yod")],
  ["mystic_rectangle", oneContext(fixtures.mystic_rectangle, "mystic_rectangle")]
];

for (const [type, context] of examples) {
  const authored = resolveLegacy(context);
  const fallback = resolveLegacy(context, { authoredRecords: [] });
  assertCopyShape(authored);
  assertCopyShape(fallback);
  assert.equal(authored.source.contentLevel, "authored", `${type} should prefer approved authored copy`);
  assert.notEqual(authored.source.recordId, fallback.source.recordId, `${type} should change source when authored is available`);
  assert.equal(fallback.source.contentLevel, "source_grounded_template", `${type} should restore approved golden fallback without authored records`);
  assert.equal(JSON.stringify(resolveLegacy(context)), JSON.stringify(authored), `${type} authored resolution must be deterministic`);
  assert.equal(JSON.stringify(resolveLegacy(context, { authoredRecords: [] })), JSON.stringify(fallback), `${type} fallback resolution must be deterministic`);
  const validation = validateAuthoredAspectPatternRecord(AUTHORED_ASPECT_PATTERN_RECORDS.find((record) => record.patternType === type), context);
  assert.equal(validation.ok, true, `${type} authored record should validate`);
}

{
  const context = oneContext(fixtures.t_square, "t_square");
  for (const status of ["draft", "reviewed"]) {
    const record = cloned(AUTHORED_ASPECT_PATTERN_RECORDS.find((item) => item.patternType === "t_square"));
    record.id = `authored-test:${status}`;
    record.status = status;
    const resolved = resolveLegacy(context, { authoredRecords: [record] });
    assert.equal(resolved.source.contentLevel, "source_grounded_template", `${status} authored record must not override fallback`);
  }
}

{
  const context = oneContext(fixtures.t_square, "t_square");
  const record = invalidSlotAuthoredFor(context);
  const resolved = resolveLegacy(context, { authoredRecords: [record] });
  const validation = validateAuthoredAspectPatternRecord(record, context);
  assert.equal(resolved.source.contentLevel, "source_grounded_template", "Unknown authored slots must fail closed");
  assert.ok(validation.errors.includes("unknown_required_slot:headline"));
}

{
  const context = oneContext(fixtures.t_square, "t_square");
  const record = cloned(AUTHORED_ASPECT_PATTERN_RECORDS.find((item) => item.patternType === "t_square"));
  record.id = "authored-test:missing-required";
  record.content.headline = "Broken {{fallout_sign}}";
  const resolved = resolveLegacy(context, { authoredRecords: [record] });
  const validation = validateAuthoredAspectPatternRecord(record, context);
  assert.equal(resolved.source.contentLevel, "source_grounded_template", "Missing required authored slots must fail closed");
  assert.ok(validation.errors.includes("missing_required_slot:headline"));
}

{
  const partialContext = oneContext(fixtures.partial_t_square, "t_square");
  const resolved = resolveLegacy(partialContext, { authoredRecords: [directAuthoredFor(partialContext)] });
  const validation = validateAuthoredAspectPatternRecord(directAuthoredFor(partialContext), partialContext);
  assert.equal(resolved.source.contentLevel, "source_grounded_template", "Partial contexts cannot use direct certainty authored records");
  assert.ok(validation.errors.includes("direct_certainty_for_qualified_context"));
}

{
  const grandSquare = copyText(resolveAspectPatternCopy(oneContext(fixtures.grand_square, "grand_square")));
  const mystic = copyText(resolveAspectPatternCopy(oneContext(fixtures.mystic_rectangle, "mystic_rectangle")));
  const yod = copyText(resolveAspectPatternCopy(oneContext(fixtures.yod, "yod")));
  assert.doesNotMatch(grandSquare, /\bapex\b/i);
  assert.doesNotMatch(mystic, /\bapex\b/i);
  assert.doesNotMatch(yod, /\b(Finger of God|fate|destiny|chosen|special mission|unavoidable calling)\b/i);
}

for (const [, context] of examples) {
  const text = copyText(resolveAspectPatternCopy(context));
  assert.doesNotMatch(text, /\b(structural context|geometry confidence|warning codes?|source IDs?|source aspect|ranking reason|display priority|sourceAspectIds|baseDisplayPriority|structuralContext)\b/i);
}

const writeupsComponent = read("apps/admin/src/AspectPatternWriteups.tsx");
const dashboard = read("apps/admin/src/GeneratedContentAdminDashboard.tsx");

assert.match(writeupsComponent, /fetch\(`\/api\/admin\/aspect-pattern-writeups\?kind=\$\{nextKind\}`/);
assert.match(writeupsComponent, /Authored result/);
assert.match(writeupsComponent, /Approved fallback/);
assert.match(dashboard, /aspectPatternCoverage: "content\/aspect-patterns"/);
assert.match(dashboard, /AspectPatternWriteups/);

console.log("Aspect-pattern authored copy and admin workspace tests passed.");
