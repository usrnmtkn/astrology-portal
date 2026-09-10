#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createTransitSynastryRenderer } from "../apps/web/src/content/fallbackArchitectureV3/dist/tldr-content.js";
import {
  classifySynastryDirectionality,
  DIRECTIONALITY_ACTION
} from "./synastry-directionality-human-review.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readJson = (relative) => JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));

const overrides = readJson("apps/web/src/content/fallbackArchitectureV3/source-rows/synastry-directional-overrides-v1.json");
const baseHooks = readJson("apps/web/src/content/fallbackArchitectureV3/bundled-relationship-hook-rows-v3.json");
const sharedRows = readJson("apps/web/src/content/fallbackArchitectureV3/bundled-shared-placement-rows-v3.json");
const transitLib = readJson("apps/web/src/content/fallbackArchitectureV3/bundled-relationship-authored-cards-v3.json");
const templates = readJson("apps/web/src/content/fallbackArchitectureV3/templates/fallback-templates-v3.json");

assert.equal(overrides.schema, "synastry-directional-overrides/v1");
assert.equal(overrides.rows.length, 24, "Batch 4 must contain exactly 24 canonical directional overrides.");
assert.equal(new Set(overrides.rows.map((row) => row.contentKey)).size, 24, "Directional override keys must be unique.");

const baseByKey = new Map(baseHooks.hookRows.map((row) => [row.contentKey, row]));
const runtimeOverrides = overrides.rows.map((row) => ({
  ...row,
  body_you: row.body_you.replaceAll("{{Name}}", "{{holder2}}")
}));
const source = {
  hookRows: [...baseHooks.hookRows, ...sharedRows.hookRows, ...runtimeOverrides],
  vocabularyRows: []
};
const renderer = createTransitSynastryRenderer(transitLib, templates, source);
const unresolved = /\{\{[^}]+\}\}/u;
const familyAspects = {
  conjunction: ["conjunction"],
  hard: ["square", "opposition"],
  soft: ["trine", "sextile"]
};

for (const row of overrides.rows) {
  const parts = row.contentKey.split("/");
  assert.equal(parts.length, 5);
  const [, family, first, second, aspectFamily] = parts;
  assert.equal(family, "synastry-pair");
  assert.equal(first, "sun", `${row.contentKey} must keep Sun as canonical first body in Batch 4.`);
  assert.ok(familyAspects[aspectFamily], `Unsupported aspect family ${aspectFamily}`);
  assert.equal(row.review_status, "approved");
  assert.equal(row.directionality_mode, "viewer-centered-synastry-v1");
  assert.equal(row.body_you_semantic_direction, `${second}_to_sun`);
  assert.equal(row.body_they_semantic_direction, `sun_to_${second}`);
  assert.equal(row.approval?.approvalLevel, "exact_owner_approved");

  const decision = classifySynastryDirectionality(row.contentKey);
  assert.equal(decision.action, DIRECTIONALITY_ACTION.AUTHOR_REVERSE, `${row.contentKey} may not be released from a reciprocal or held classification.`);
  assert.equal(decision.missingSemanticDirection, row.body_you_semantic_direction, `${row.contentKey} reverse semantic arrow must match the human review.`);

  const base = baseByKey.get(row.contentKey);
  assert.ok(base, `Missing pre-release canonical row for ${row.contentKey}`);
  assert.equal(row.body_they, base.body_they, `${row.contentKey} must preserve the previously approved opposite-direction body_they byte-for-byte.`);

  for (const aspect of familyAspects[aspectFamily]) {
    const friendName = "Sofia";
    const forward = renderer.renderSynastryAspect({ planetA: first, planetB: second, aspect, otherName: friendName });
    assert.equal(forward.contentKey, row.contentKey);
    assert.equal(forward.synastryTier, "exact-owner-approved", `${row.contentKey} must retain exact owner-approved tier.`);
    assert.ok(forward.body.includes(friendName), `${row.contentKey} forward rendering must resolve the Friends name.`);
    assert.ok(!unresolved.test(forward.body), `${row.contentKey} forward rendering leaked a template variable: ${forward.body}`);
    assert.equal(forward.body, row.body_you.replaceAll("{{Name}}", friendName), `${row.contentKey} forward rendering must serve the owner-approved viewer-centered passage verbatim after name substitution.`);

    const reverse = renderer.renderSynastryAspect({ planetA: second, planetB: first, aspect, otherName: friendName });
    assert.equal(reverse.contentKey, row.contentKey);
    assert.ok(!unresolved.test(reverse.body), `${row.contentKey} reverse rendering leaked a holder variable: ${reverse.body}`);
    assert.notEqual(reverse.body, forward.body, `${row.contentKey} must keep the two semantic directions distinct.`);
  }
}

console.log("Synastry directional overrides v1: 24/24 canonical rows preserve opposite copy and render both semantic directions without unresolved variables.");
