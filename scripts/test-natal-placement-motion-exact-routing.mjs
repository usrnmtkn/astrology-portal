#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  renderNatalPlacement as renderNodePlacement,
  natalPlacementMotionExactKey as nodeMotionExactKey
} from "../apps/web/src/content/fallbackArchitectureV3/resolver/renderFallback.mjs";
import {
  createFallbackRenderer as createBrowserFallbackRenderer,
  natalPlacementMotionExactKey as browserMotionExactKey
} from "../apps/web/src/content/fallbackArchitectureV3/resolver/renderFallback.browser.ts";
import {
  createFallbackRenderer as createPackagedFallbackRenderer,
  natalPlacementMotionExactKey as packagedMotionExactKey
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

const nodeFacts = { planet: "chiron", sign: "aries", house: 12 };
const nodeDirectKey = "fallback-hook/natal-you-placement-complete-final/chiron/aries/12";
const nodeRetrogradeKey = `${nodeDirectKey}/retrograde`;
assert.equal(nodeMotionExactKey({ ...nodeFacts, voice: "you" }), nodeDirectKey);
assert.equal(nodeMotionExactKey({ ...nodeFacts, voice: "you", isRetrograde: true }), nodeRetrogradeKey);
const nodeDirect = renderNodePlacement({ ...nodeFacts, voice: "you" });
const nodeRetrogradeFallback = renderNodePlacement({ ...nodeFacts, voice: "you", isRetrograde: true });
assert.equal(nodeDirect.templateKey, nodeDirectKey, "Node resolver must keep the existing exact key for Direct placements.");
assert.notEqual(nodeRetrogradeFallback.templateKey, nodeDirectKey, "Node resolver must never let Direct exact copy mask Retrograde.");
assert.notEqual(nodeRetrogradeFallback.body, nodeDirect.body, "Node Direct and Retrograde output must diverge when only Direct exact copy exists.");
assert.match(nodeRetrogradeFallback.body, /retrograde in the birth chart/u, "Node Retrograde fallback must keep the shared modifier.");

const facts = { planet: "mercury", sign: "virgo", house: 6 };
const directKey = "fallback-hook/natal-you-placement-complete-final/mercury/virgo/6";
const retrogradeKey = `${directKey}/retrograde`;

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
const retrogradeSentinel = exactRow(
  retrogradeKey,
  "RETROGRADE EXACT SENTINEL.",
  "RETROGRADE FRIEND EXACT SENTINEL."
);

for (const [name, createRenderer, motionExactKey] of [
  ["browser source", createBrowserFallbackRenderer, browserMotionExactKey],
  ["packaged dist", createPackagedFallbackRenderer, packagedMotionExactKey]
]) {
  assert.equal(motionExactKey({ ...facts, voice: "you" }), directKey, `${name}: Direct exact key changed.`);
  assert.equal(motionExactKey({ ...facts, voice: "you", isRetrograde: true }), retrogradeKey, `${name}: Retrograde exact key is not motion-specific.`);

  const directOnlyRenderer = createRenderer(templates, {
    ...baseRows,
    hookRows: [...baseRows.hookRows, directSentinel]
  });
  const direct = directOnlyRenderer.renderNatalPlacement({ ...facts, voice: "you" });
  assert.equal(direct.templateKey, directKey, `${name}: Direct must select Direct exact copy.`);
  assert.equal(direct.body, "DIRECT EXACT SENTINEL.");

  const retrogradeFallback = directOnlyRenderer.renderNatalPlacement({ ...facts, voice: "you", isRetrograde: true });
  assert.notEqual(retrogradeFallback.templateKey, directKey, `${name}: Retrograde inherited Direct exact copy.`);
  assert.notEqual(retrogradeFallback.body, "DIRECT EXACT SENTINEL.");
  assert.match(retrogradeFallback.body, /retrograde in the birth chart/u, `${name}: missing Rx exact row did not compose with the shared modifier.`);

  const bothMotionsRenderer = createRenderer(templates, {
    ...baseRows,
    hookRows: [...baseRows.hookRows, directSentinel, retrogradeSentinel]
  });
  const exactRetrograde = bothMotionsRenderer.renderNatalPlacement({ ...facts, voice: "you", isRetrograde: true });
  assert.equal(exactRetrograde.templateKey, retrogradeKey, `${name}: Rx exact provenance must expose the Rx key.`);
  assert.deepEqual(exactRetrograde.partKeys, [retrogradeKey]);
  assert.equal(exactRetrograde.body, "RETROGRADE EXACT SENTINEL.");
  assert.doesNotMatch(exactRetrograde.body, /retrograde in the birth chart/u, `${name}: exact Rx copy must remain verbatim.`);

  const friendRetrograde = bothMotionsRenderer.renderNatalPlacement({ ...facts, voice: "Maya", isRetrograde: true });
  assert.equal(friendRetrograde.templateKey, retrogradeKey, `${name}: Friend Rx must use the Rx exact key.`);
  assert.deepEqual(friendRetrograde.partKeys, [retrogradeKey]);
  assert.equal(friendRetrograde.body, "RETROGRADE FRIEND EXACT SENTINEL.");
  assert.notEqual(friendRetrograde.body, "DIRECT FRIEND EXACT SENTINEL.");

  const directAfterRetrograde = bothMotionsRenderer.renderNatalPlacement({ ...facts, voice: "you" });
  assert.equal(directAfterRetrograde.templateKey, directKey, `${name}: adding Rx copy changed Direct routing.`);
  assert.equal(directAfterRetrograde.body, "DIRECT EXACT SENTINEL.");
}

console.log("Natal motion routing passed across Node source, browser source, packaged dist, You, Friend, exact Rx, and composed Rx fallback.");
