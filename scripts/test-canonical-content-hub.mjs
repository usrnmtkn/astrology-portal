#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { createCanonicalContentResolver } from "../packages/astro-knowledge/canonical-content/src/resolver.mjs";
import {
  assertCanonicalUnitId,
  canonicalNatalAngleSignId,
  canonicalNatalAspectId,
  canonicalNatalEmptyHouseId,
  canonicalNatalPlacementHouseId,
  canonicalNatalPlacementSignId,
  canonicalUnitId,
  normalizeCanonicalBody
} from "../packages/astro-knowledge/canonical-content/src/unit-id.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const indexPath = path.join(repoRoot, "packages/astro-knowledge/canonical-content/index/canonical-content-index.json");
const reportPath = path.join(repoRoot, "packages/astro-knowledge/canonical-content/review/natal-wave-1-migration-report.json");
const rowsPath = path.join(repoRoot, "apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json");
const resolverPath = path.join(repoRoot, "packages/astro-knowledge/canonical-content/src/resolver.mjs");
const index = JSON.parse(fs.readFileSync(indexPath, "utf8"));
const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
const sourceRows = JSON.parse(fs.readFileSync(rowsPath, "utf8"));
const getCanonicalUnit = createCanonicalContentResolver(index);
const contentBlobByHash = new Map(index.contentBlobs.map((blob) => [blob.contentSha256, blob.byPerspective]));

const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const stable = (value) => Array.isArray(value)
  ? value.map(stable)
  : value && typeof value === "object"
    ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]))
    : value;
const contentHash = (value) => sha256(JSON.stringify(stable(value)));

// Global grammar admits current and future surfaces without adding another authority model.
assert.equal(canonicalNatalPlacementSignId("Moon", "Taurus"), "natal/placement-sign/moon/taurus");
assert.equal(canonicalNatalPlacementHouseId("Saturn", "10th"), "natal/placement-house/saturn/10");
assert.equal(canonicalNatalAngleSignId("Ascendant", "Scorpio"), "natal/angle-sign/ascendant/scorpio");
assert.equal(canonicalNatalAspectId("Venus", "Moon", "sext"), "natal/aspect/moon/venus/sextile");
assert.equal(canonicalNatalEmptyHouseId(3, "Libra", "Venus", 7), "natal/empty-house/3/libra/venus-in-7");
assert.equal(normalizeCanonicalBody("True Node"), "north-node");
assert.equal(normalizeCanonicalBody("Mean Node"), "mean-node", "Mean Node must never alias the canonical True Node.");
for (const example of [
  canonicalUnitId("transit", "house", "saturn", "10"),
  canonicalUnitId("sky", "aspect", "mercury", "saturn", "opposition"),
  canonicalUnitId("lunation", "full-moon", "scorpio"),
  canonicalUnitId("calendar", "moon-phase", "first-quarter", "leo"),
  canonicalUnitId("synastry", "aspect", "moon", "venus", "sextile"),
  canonicalUnitId("composite", "placement-house", "saturn", "10"),
  canonicalUnitId("daily", "horoscope", "aries", "2026-08-20"),
  canonicalUnitId("weekly", "horoscope", "aries", "2026-08-17")
]) assert.equal(assertCanonicalUnitId(example), example);

// ONE_AUTHORITY_PER_UNIT and NO_NEW_READER_FACING_FAMILY.
assert.equal(index.units.length, 2906);
assert.equal(new Set(index.units.map((unit) => unit.identity.unitId)).size, index.units.length);
assert.deepEqual([...new Set(index.units.map((unit) => unit.identity.surface))], ["natal"]);
assert.deepEqual([...new Set(index.units.map((unit) => unit.identity.kind))].sort(), ["angle-sign", "aspect", "empty-house", "placement-house", "placement-sign"]);
for (const perspective of ["you", "they"]) {
  assert.equal(
    Object.values(index.counts.byPerspectiveMode[perspective]).reduce((sum, count) => sum + count, 0),
    index.counts.total
  );
}
assert.equal(index.counts.byPerspectiveMode.you.authored, 365);
assert.equal(index.counts.byPerspectiveMode.they.authored, 0);
assert.equal(index.counts.byKind["angle-sign"], 24);
assert.equal(index.counts.byKind.aspect, 938);
assert.equal(index.units.some((unit) => unit.identity.unitId === "natal/placement-sign/part-of-fortune/scorpio"), true);
assert.equal(index.units.some((unit) => unit.identity.unitId === "natal/aspect/neptune/part-of-fortune/semisextile"), true);
assert.equal(index.units.some((unit) => unit.identity.unitId === "natal/aspect/moon/sun/quincunx"), true);
assert.equal(index.units.some((unit) => unit.identity.unitId.startsWith("natal/angle-sign/descendant/")), false);
assert.equal(index.units.some((unit) => unit.identity.unitId.startsWith("natal/angle-sign/imum-coeli/")), false);

// ONE_AUTHORITY_PER_COMPOSITION_SLOT.
assert.equal(new Set(index.slots.map((slot) => slot.slotId)).size, index.slots.length);
assert.equal(index.slots.filter((slot) => !slot.authoritySourceKey).length, 0);
assert.equal(index.slots.filter((slot) => slot.reconciliationBucket === "OWNER_DECISION_REQUIRED").length, 0);
assert.equal(report.compositionSlots.authorityResolved, 7);

// NO_PENDING_RENDER: candidates never carry render eligibility and never replace canonical content.
for (const unit of index.units) {
  assert.equal(unit.candidates.some((candidate) => candidate.renderEligible !== false), false, unit.identity.unitId);
  const resolved = getCanonicalUnit(unit.identity.unitId, { surface: "natal", register: "natal", perspective: "you" });
  assert.equal(
    resolved?.result.status,
    unit.resolution.perspectiveModes.you === "gap" ? "SOURCE_GAP" : "RESOLVED",
    unit.identity.unitId
  );
}
const candidateFixture = structuredClone(index.units[0]);
candidateFixture.candidates.push({ candidateId: "fixture", state: "pending_owner_review", renderEligible: false, content: { body: "must not render" } });
assert.notEqual(createCanonicalContentResolver({ schema: index.schema, units: [candidateFixture], contentBlobs: index.contentBlobs })(candidateFixture.identity.unitId)?.content.byPerspective.you.body, "must not render");

// Unresolved unit or composition-slot authority must fail closed even when a
// legacy current-rendered result is retained for owner comparison.
const unresolvedUnit = structuredClone(index.units[0]);
unresolvedUnit.reconciliation.bucket = "OWNER_DECISION_REQUIRED";
assert.deepEqual(
  createCanonicalContentResolver({ schema: index.schema, units: [unresolvedUnit], contentBlobs: index.contentBlobs })(unresolvedUnit.identity.unitId)?.result,
  { status: "OWNER_DECISION_REQUIRED", renderEligible: false },
);
const composedFixture = structuredClone(index.units.find((unit) => unit.resolution.canonicalSlotIds.length > 0));
const conflictedSlotId = composedFixture.resolution.canonicalSlotIds[0];
assert.deepEqual(
  createCanonicalContentResolver({
    schema: index.schema,
    units: [composedFixture],
    contentBlobs: index.contentBlobs,
    slots: [{ slotId: conflictedSlotId, reconciliationBucket: "OWNER_DECISION_REQUIRED" }],
  })(composedFixture.identity.unitId)?.result,
  { status: "OWNER_DECISION_REQUIRED", renderEligible: false },
);

// NO_LEGACY_RUNTIME_PRECEDENCE: the global resolver knows no legacy store, row family, or resolver name.
const resolverSource = fs.readFileSync(resolverPath, "utf8");
for (const banned of ["fallback-hook/", "KnowledgeMatrix", "createFallbackRenderer", "placement-house-lived", "planet-intro"]) {
  assert.equal(resolverSource.includes(banned), false, `global resolver contains legacy authority token ${banned}`);
}
const builderSource = fs.readFileSync(path.join(repoRoot, "scripts/build-canonical-content-hub.mjs"), "utf8");
assert.equal(builderSource.includes(".reverse().find"), false, "The index builder must not select authority by last-row order.");

// APPROVED_COPY_BYTE_PRESERVATION for every perspective-scoped authored source.
const rowByKey = new Map(sourceRows.hookRows.map((row) => [row.contentKey, row]));
for (const unit of index.units.filter((candidate) => candidate.evidence[0]?.sourceId)) {
  const sourceId = unit.evidence[0]?.sourceId;
  const source = rowByKey.get(sourceId);
  assert.ok(source, `${unit.identity.unitId}: exact source missing`);
  assert.equal(unit.resolution.perspectiveModes.you, "authored", `${unit.identity.unitId}: owner copy must remain the You authority.`);
  assert.equal(contentBlobByHash.get(unit.content.contentRef).you.body, source.body, `${unit.identity.unitId}: exact copy changed`);
  assert.equal(unit.evidence[0].contentSha256, sha256(source.body));
}

// REGISTER_MATCH and PERSPECTIVE_MATCH are independent failures.
const sampleId = "natal/placement-sign/moon/taurus";
assert.throws(() => getCanonicalUnit(sampleId, { surface: "natal", register: "sky", perspective: "you" }), /REGISTER_MISMATCH/u);
assert.throws(() => getCanonicalUnit(sampleId, { surface: "natal", register: "natal", perspective: "collective" }), /PERSPECTIVE_MISMATCH/u);
assert.throws(() => getCanonicalUnit(sampleId, { surface: "sky", register: "natal", perspective: "you" }), /SURFACE_MISMATCH/u);

// SOURCE_GAP_EXPLICIT in the generic resolver, even though every in-scope post-fix unit resolves.
const gapUnit = structuredClone(index.units[0]);
gapUnit.identity.unitId = "natal/placement-sign/fixture/gap";
gapUnit.resolution = { mode: "gap", canonicalRevisionId: null, recipeId: null, canonicalSlotIds: [], perspectiveModes: { you: "gap", they: "gap" } };
gapUnit.content = { contentRef: null, renderEligible: false, contentSha256: null };
gapUnit.governance = { authorityClass: "source-gap", approvalState: "needs_review", approvalMetadata: {} };
gapUnit.revisions = [];
const gap = createCanonicalContentResolver({ schema: index.schema, units: [gapUnit], contentBlobs: [] })(gapUnit.identity.unitId);
assert.equal(gap?.result.status, "SOURCE_GAP");
assert.equal(gap?.result.renderEligible, false);

// REVISION_HISTORY_INTACT and deterministic content identity.
for (const unit of index.units) {
  if (unit.resolution.mode === "gap") {
    assert.equal(unit.resolution.canonicalRevisionId, null);
    assert.equal(unit.revisions.length, 0);
    assert.equal(unit.content.contentRef, null);
    continue;
  }
  const revision = unit.revisions.find((candidate) => candidate.revisionId === unit.resolution.canonicalRevisionId);
  assert.ok(revision, `${unit.identity.unitId}: current revision missing`);
  assert.equal(revision.supersedesRevisionId, null);
  const blob = contentBlobByHash.get(unit.content.contentRef);
  assert.ok(blob, `${unit.identity.unitId}: content blob missing`);
  assert.equal(revision.contentSha256, contentHash(blob));
  assert.equal(revision.contentRef, unit.content.contentRef);
}

// Provenance convention is repository-derived and all 111 claims verify.
assert.deepEqual(report.provenanceVerification, {
  convention: "sha256(JSON.stringify({ body: copy }))",
  failed: 0,
  failures: [],
  total: 111,
  unresolved: 0,
  verified: 111
});
assert.deepEqual(report.mechanisms.wave2, {
  conflicting: 0,
  expected: 120,
  mapped: 108,
  mappedBodies: ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune"],
  missing: 0,
  pendingReview: 0,
  sourceGapBody: "lilith",
  sourceGaps: 12
});

// NATAL_RENDER_PARITY and INDEX_CHECK_CLEAN are independently reconstructed by the builder.
const check = spawnSync(process.execPath, ["scripts/build-canonical-content-hub.mjs", "--check"], { cwd: repoRoot, encoding: "utf8" });
assert.equal(check.status, 0, `${check.stdout}\n${check.stderr}`);
assert.match(check.stdout, /Canonical content hub check clean: 2906 units/u);
assert.deepEqual(report.parity, { bugs: 0, exactParity: 2906, intentionalAuthorityCorrection: 0, unresolvedOwnerDecision: 0 });

console.log("Canonical content hub tests passed: 2906 natal Wave-1 units; global resolver and governance gates are deterministic.");
