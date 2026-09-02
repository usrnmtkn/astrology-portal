#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  createFallbackRenderer,
  natalPlacementMotionExactKey
} from "../apps/web/src/content/fallbackArchitectureV3/dist/tldr-content.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readJson = (relativePath) => JSON.parse(fs.readFileSync(path.join(repoRoot, relativePath), "utf8"));
const sourceRows = readJson("apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json");
const templateRows = readJson("apps/web/src/content/fallbackArchitectureV3/templates/fallback-templates-v3.json");
const interim = readJson("apps/web/src/content/fallbackArchitectureV3/source-rows/placement-interim-fixes-v1.json");

const templates = { templates: [...templateRows.templates, ...interim.templates] };
const baseRows = {
  hookRows: [...sourceRows.hookRows],
  vocabularyRows: [...sourceRows.vocabularyRows, ...interim.vocabularyRows]
};

const facts = { planet: "mercury", sign: "virgo", house: 6 };
const directKey = "fallback-hook/natal-you-placement-complete-final/mercury/virgo/6";
const retrogradeKey = `${directKey}/retrograde`;
assert.equal(natalPlacementMotionExactKey({ ...facts, voice: "you" }), directKey);
assert.equal(natalPlacementMotionExactKey({ ...facts, voice: "you", isRetrograde: true }), retrogradeKey);

const exactRow = (contentKey, body, bodyThey) => ({
  contentKey,
  content_role: "full_copy",
  grammar_frame: "complete_sentence",
  body,
  body_they: bodyThey,
  body_they_review_status: "approved",
  body_they_approval: { approvalLevel: "exact_owner_approved" },
  reader_only: true,
  render_policy: "reader-only-exact-lived-v1",
  review_status: "approved"
});

const directSentinel = exactRow(
  directKey,
  "DIRECT EXACT SENTINEL.",
  "DIRECT FRIEND EXACT SENTINEL."
);
const directOnlyRenderer = createFallbackRenderer(templates, {
  ...baseRows,
  hookRows: [...baseRows.hookRows, directSentinel]
});

const direct = directOnlyRenderer.renderNatalPlacement({ ...facts, voice: "you" });
assert.equal(direct.templateKey, directKey);
assert.equal(direct.body, "DIRECT EXACT SENTINEL.");

const retrogradeFallback = directOnlyRenderer.renderNatalPlacement({
  ...facts,
  voice: "you",
  isRetrograde: true
});
assert.notEqual(
  retrogradeFallback.templateKey,
  directKey,
  "A retrograde placement without its own exact row must never inherit the Direct exact row."
);
assert.notEqual(retrogradeFallback.body, "DIRECT EXACT SENTINEL.");
assert.match(
  retrogradeFallback.body,
  /retrograde in the birth chart/u,
  "Without an approved retrograde exact row, the reader must receive composed copy plus the shared retrograde modifier."
);

const retrogradeSentinel = exactRow(
  retrogradeKey,
  "RETROGRADE EXACT SENTINEL.",
  "RETROGRADE FRIEND EXACT SENTINEL."
);
const bothMotionsRenderer = createFallbackRenderer(templates, {
  ...baseRows,
  hookRows: [...baseRows.hookRows, directSentinel, retrogradeSentinel]
});

const exactRetrograde = bothMotionsRenderer.renderNatalPlacement({
  ...facts,
  voice: "you",
  isRetrograde: true
});
assert.equal(exactRetrograde.templateKey, retrogradeKey);
assert.deepEqual(exactRetrograde.partKeys, [retrogradeKey]);
assert.equal(exactRetrograde.body, "RETROGRADE EXACT SENTINEL.");
assert.doesNotMatch(
  exactRetrograde.body,
  /retrograde in the birth chart/u,
  "An exact retrograde full write-up is verbatim and must not receive the generic modifier as an extra sentence."
);

const directAfterRetrograde = bothMotionsRenderer.renderNatalPlacement({ ...facts, voice: "you" });
assert.equal(directAfterRetrograde.templateKey, directKey);
assert.equal(directAfterRetrograde.body, "DIRECT EXACT SENTINEL.");

const friendRetrograde = bothMotionsRenderer.renderNatalPlacement({
  ...facts,
  voice: "Maya",
  isRetrograde: true
});
assert.equal(friendRetrograde.templateKey, retrogradeKey);
assert.deepEqual(friendRetrograde.partKeys, [retrogradeKey]);
assert.equal(friendRetrograde.body, "RETROGRADE FRIEND EXACT SENTINEL.");
assert.notEqual(friendRetrograde.body, "DIRECT FRIEND EXACT SENTINEL.");

console.log("Natal motion routing passed: Direct and Retrograde exact copy are isolated, Rx falls back safely, and Friend follows the same motion-specific key.");
