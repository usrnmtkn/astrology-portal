#!/usr/bin/env node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";

const registryPath = "packages/astro-knowledge/review/sky-calendar-meaning-components-v1/sky-calendar-meaning-components-v1.json";
const fallbackPath = "apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json";
const v9Path = "apps/web/public/content/knowledge-matrix-v9/v9-owner-approved-governance-labeled/knowledge-matrix-v9-owner-approved-rows.json";
const v13Path = "apps/web/public/content/knowledge-matrix-v13/v13-direct-language-owner-approved/knowledge-matrix-v13-owner-approved-locked.json";

const registry = JSON.parse(fs.readFileSync(registryPath, "utf8"));
const fallback = JSON.parse(fs.readFileSync(fallbackPath, "utf8"));
const v9 = JSON.parse(fs.readFileSync(v9Path, "utf8"));
const v13 = JSON.parse(fs.readFileSync(v13Path, "utf8"));
const fallbackRows = [...fallback.vocabularyRows, ...fallback.fallbackSourceRows, ...fallback.hookRows];

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function sourceValue(sourceId) {
  if (sourceId.startsWith(`${fallbackPath}#`)) {
    const contentKey = sourceId.slice(fallbackPath.length + 1);
    return fallbackRows.find((row) => row.contentKey === contentKey);
  }
  const v9Match = sourceId.match(/#TransitMeanings!(\d+)$/u);
  if (v9Match) return v9.transit_meanings.find((row) => row.source_row === Number(v9Match[1]));
  const v13Match = sourceId.match(/#([^!]+)!(\d+)$/u);
  if (v13Match) {
    return v13.rows.find((row) => (
      row.workbookProvenance?.sheet === v13Match[1]
      && row.workbookRow === Number(v13Match[2])
    ));
  }
  return null;
}

assert.equal(registry.schema, "tldrastro.sky-calendar-meaning-components.v1");
assert.equal(registry.status, "PENDING OWNER");
assert.deepEqual(registry.counts, {
  signUnits: 144,
  aspectMechanisms: 5,
  modalityUnits: 9,
  elementUnits: 16,
  total: 174,
});
assert.equal(registry.policy.componentsAreMeaningNotSentences, true);
assert.equal(registry.policy.emitStoredComponentVerbatim, false);
assert.equal(registry.policy.firstSentenceMustBeComposed, true);
assert.equal(registry.policy.failClosed, true);

const all = [
  ...registry.signUnits,
  ...registry.aspectMechanisms,
  ...registry.modalityUnits,
  ...registry.elementUnits,
];
assert.equal(all.length, 174);
assert.equal(new Set(all.map((row) => row.key)).size, 174);

for (const row of all) {
  assert.equal(row.owner_review_status, "PENDING OWNER", `${row.key} must remain pending`);
  assert.ok(Array.isArray(row.source_ids) && row.source_ids.length > 0, `${row.key} source_ids`);
  assert.equal(row.source_ids.length, row.source_hashes.length, `${row.key} source/hash parity`);
  row.source_ids.forEach((sourceId, index) => {
    const value = sourceValue(sourceId);
    assert.ok(value, `${row.key} missing source ${sourceId}`);
    assert.equal(row.source_hashes[index], sha256(JSON.stringify(value)), `${row.key} source hash ${sourceId}`);
  });
}

for (const row of registry.signUnits) {
  for (const field of ["planet_function", "sign_expression", "combined_position", "details_language"]) {
    assert.ok(typeof row[field] === "string" && row[field].trim(), `${row.key} ${field}`);
    assert.doesNotMatch(row[field], /[.!?]$/u, `${row.key} ${field} must remain a meaning component, not a sentence`);
  }
  assert.ok(Array.isArray(row.reader_manifestations) && row.reader_manifestations.length > 0);
  row.reader_manifestations.forEach((value) => {
    assert.doesNotMatch(value, /[.!?]$/u, `${row.key} reader manifestation must remain a component`);
  });
}

for (const row of [...registry.aspectMechanisms, ...registry.modalityUnits, ...registry.elementUnits]) {
  for (const field of ["conflict_behavior", "movement_bias"]) {
    assert.ok(typeof row[field] === "string" && row[field].trim(), `${row.key} ${field}`);
    assert.doesNotMatch(row[field], /[.!?]$/u, `${row.key} ${field} must remain a meaning component`);
  }
}

const opposition = registry.aspectMechanisms.find((row) => row.key === "sky-aspect-mechanism/opposition");
assert.equal(opposition.reader_effect, "both positions become difficult to ignore");
assert.equal(opposition.conflict_behavior, "the disagreement is more likely to become explicit");
assert.equal(opposition.movement_bias, "movement usually requires dealing with both positions rather than eliminating one");

const fixedFixed = registry.modalityUnits.find((row) => row.key === "sky-how/modality/fixed/fixed");
assert.equal(fixedFixed.conflict_behavior, "neither side gives ground easily under pressure");
assert.equal(fixedFixed.movement_bias, "change is more likely in the terms or structure than through either side backing down");

console.log("Sky Calendar meaning components: PASS (174/174 evidence hashes verified)");
