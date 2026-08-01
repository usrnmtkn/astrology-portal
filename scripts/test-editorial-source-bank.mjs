#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const require = createRequire(import.meta.url);
const judge = require("../packages/astro-knowledge/scripts/judge-editorial-source-bank.js");
const bank = JSON.parse(fs.readFileSync(judge.bankPath, "utf8"));
const entries = judge.flattenBank(bank);
const referenceFacts = judge.flattenReferenceFacts(bank);

assert.equal(bank.authoring.origin, "owner-authored");
assert.equal(bank.authoring.review_status, "approved");
assert.equal(bank.authoring.approved_via, "owner-authored");
assert.equal(bank.authoring.preserve_exact_wording, true);
assert.equal(bank.authoring.reader_serving, false);
assert.equal(bank.facts.lane, "reference");
assert.equal(bank.facts.reader_serving, false);
assert.equal(referenceFacts.length, 13);
assert.ok(referenceFacts.every((fact) => fact.reader_serving === false));

assert.equal(bank.collections.length, 7);
assert.equal(entries.length, 102);
assert.deepEqual(
  Object.fromEntries(bank.collections.map((collection) => [collection.id, collection.entries.length])),
  {
    "sign-axis-tensions": 6,
    "six-month-lunation-arcs": 12,
    "two-week-lunation-arcs": 12,
    "sign-season-content": 12,
    "sign-specific-new-moons": 12,
    "double-new-moon-elements": 4,
    "quotable-one-liners": 44
  }
);

assert.equal(new Set(entries.map((entry) => entry.contentKey)).size, entries.length);
for (const entry of entries) {
  assert.equal(entry.content_role, "fallback_source");
  assert.equal(entry.review_status, "approved");
  assert.equal(entry.approved_via, "owner-authored");
  assert.equal(entry.owner_authored, true);
  assert.ok(entry.body.trim());
  assert.ok(entry.source_keys.length);
}

const exactBodies = new Set(entries.map((entry) => entry.body));
assert.ok(exactBodies.has("If it costs your peace, it's overpriced."));
assert.ok(exactBodies.has("Creativity needs space, not constant productivity."));
assert.ok(exactBodies.has("First: \"I'll charge forward!\" → burns out. Second: \"I'll lead with wisdom\" → sustainable fire"));
assert.ok(exactBodies.has("From laying the groundwork to standing in what you've built. Foundation to legacy."));
assert.ok(exactBodies.has("Where structure will set you free."));

const lint = judge.lintBank(bank);
assert.equal(lint.entryCount, 102);
assert.equal(lint.referenceFactCount, 13);
assert.deepEqual(lint.errors, []);

const cazimiFacts = judge.queryReferenceFacts("cazimi within one degree");
assert.equal(cazimiFacts[0].id, "solar-proximity-ladder");
assert.equal(cazimiFacts[0].values.cazimi_primary_arcminutes, 17);
const cazimiConflict = judge.checkReferenceClaim("Cazimi is within 1 degree of the Sun.");
assert.equal(cazimiConflict.length, 1);
assert.equal(cazimiConflict[0].factId, "solar-proximity-ladder");
assert.equal(cazimiConflict[0].severity, "warn");
const traditionalCazimiConflict = judge.checkReferenceClaim("The traditional cazimi orb is 1 degree.");
assert.equal(traditionalCazimiConflict[0].severity, "fail");
const barbaultConflict = judge.checkReferenceClaim("Barbault called it the most benefic configuration of the century.");
assert.equal(barbaultConflict[0].status, "blocked-unverified");

const sample = entries.find((entry) => entry.id === "boundaries-energy-protection-01");
const prompt = judge.buildJudgePrompt(sample);
assert.match(prompt, /already-approved/);
assert.match(prompt, /Do not rewrite the copy/);
assert.match(prompt, /requires no review workflow/);
assert.match(prompt, /retain-owner-approval/);

const materializer = fs.readFileSync(
  path.join(repoRoot, "scripts/materialize-fallback-architecture-v3-dashboard-rows.mjs"),
  "utf8"
);
assert.match(materializer, /editorial-source-bank-v1\.json/);
assert.match(materializer, /editorialSourceBankRecords/);
assert.match(materializer, /mapPackageRecord\(row, "editorial-source-bank"\)/);

console.log(`editorial source bank: ${entries.length} approved owner-authored entries`);
console.log(`optional QA notes: ${lint.notes.length}; blocking errors: ${lint.errors.length}`);
