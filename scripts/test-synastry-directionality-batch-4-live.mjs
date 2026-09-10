import assert from "node:assert/strict";
import fs from "node:fs";

import { createTransitSynastryRenderer } from "../apps/web/src/content/fallbackArchitectureV3/dist/tldr-content.js";
import {
  applySynastryDirectionalityLiveV1,
  SYNNASTRY_DIRECTIONALITY_MODE
} from "../apps/web/src/content/fallbackArchitectureV3/resolver/synastryDirectionalityLive.mjs";

const packageRoot = "apps/web/src/content/fallbackArchitectureV3";
const source = JSON.parse(fs.readFileSync(`${packageRoot}/source-rows/fallback-source-rows-v3.json`, "utf8"));
const overlay = JSON.parse(fs.readFileSync(`${packageRoot}/source-rows/synastry-directionality-live-v1.json`, "utf8"));
const templates = JSON.parse(fs.readFileSync(`${packageRoot}/templates/fallback-templates-v3.json`, "utf8"));
const transitLib = JSON.parse(fs.readFileSync(`${packageRoot}/source-rows/transit-synastry-rows-v1.json`, "utf8"));
const relationshipBundleSource = fs.readFileSync(
  "apps/web/src/content/fallbackArchitectureV3RelationshipBundle.ts",
  "utf8"
);

assert.equal(overlay.schema, "synastry-directionality-live/v1");
assert.equal(overlay.directionality_mode, SYNNASTRY_DIRECTIONALITY_MODE);
assert.equal(overlay.release_id, "synastry-directionality-batch-4-live-v1");
assert.equal(overlay.rows.length, 24, "Batch 4 must contain exactly 24 released semantic reverses");
assert.match(relationshipBundleSource, /synastry-directionality-live-v1\.json/u);
assert.match(relationshipBundleSource, /applySynastryDirectionalityLiveV1/u);

const overlayKeys = new Set(overlay.rows.map((row) => row.contentKey));
assert.equal(overlayKeys.size, 24, "Batch 4 overlay keys must be unique");

const baseSynastryRows = source.hookRows.filter((row) => row.contentKey?.startsWith("fallback-hook/synastry-pair/"));
assert.equal(baseSynastryRows.length, 483, "Canonical base must retain the 483-row synastry corpus");
assert.equal(new Set(baseSynastryRows.map((row) => row.contentKey)).size, 483, "Canonical base synastry keys must remain unique");

const patchedHookRows = applySynastryDirectionalityLiveV1(source.hookRows, overlay);
const patchedSource = { ...source, hookRows: patchedHookRows };
const patchedSynastryRows = patchedHookRows.filter((row) => row.contentKey?.startsWith("fallback-hook/synastry-pair/"));
assert.equal(patchedSynastryRows.length, 483, "Directionality release must not add duplicate canonical pair rows");
assert.equal(new Set(patchedSynastryRows.map((row) => row.contentKey)).size, 483, "Directionality release must preserve one row per canonical key");

const baseByKey = new Map(baseSynastryRows.map((row) => [row.contentKey, row]));
const patchedByKey = new Map(patchedSynastryRows.map((row) => [row.contentKey, row]));

for (const patch of overlay.rows) {
  const base = baseByKey.get(patch.contentKey);
  const live = patchedByKey.get(patch.contentKey);
  assert.ok(base, `${patch.contentKey}: missing canonical base row`);
  assert.ok(live, `${patch.contentKey}: missing released row`);
  assert.equal(live.body_you, patch.body_you, `${patch.contentKey}: released body_you drifted`);
  assert.equal(live.body_they, base.body_they, `${patch.contentKey}: historical opposite direction changed`);
  assert.equal(live.directionality_mode, SYNNASTRY_DIRECTIONALITY_MODE);
  assert.equal(live.body_you_semantic_direction, patch.missingSemanticDirection);
  assert.equal(live.body_they_semantic_direction, patch.existingSemanticDirection);
  assert.equal(live.review_status, "approved");
  assert.equal(live.approval?.approvalLevel, "owner_signoff_untraced");
  assert.equal(live.body_you_approval?.approvalLevel, "exact_owner_approved");
  assert.equal(live.body_you_approval?.recordPath, overlay.approval_record);
  assert.equal(live.body_they_review_status, base.review_status ?? null);
  assert.doesNotMatch(live.body_you, /\{\{Name\}\}/u, `${patch.contentKey}: authoring variable leaked into runtime source`);
  if (base.approval) {
    assert.deepEqual(live.body_they_prior_row_approval, base.approval, `${patch.contentKey}: prior whole-row approval provenance was not preserved`);
    assert.notDeepEqual(live.approval, base.approval, `${patch.contentKey}: stale whole-row exact approval survived a body change`);
  }
}

// Applying the overlay twice must be a no-op. This keeps the direct relationship
// runtime safe after generated relationship artifacts eventually absorb the same release.
assert.deepEqual(
  applySynastryDirectionalityLiveV1(patchedHookRows, overlay),
  patchedHookRows,
  "Directionality overlay must be idempotent"
);

const baselineRenderer = createTransitSynastryRenderer(transitLib, templates, source);
const liveRenderer = createTransitSynastryRenderer(transitLib, templates, patchedSource);

function concreteAspects(group) {
  if (group === "conjunction") return ["conjunction"];
  if (group === "hard") return ["square", "opposition"];
  if (group === "soft") return ["trine", "sextile"];
  throw new Error(`Unsupported Batch 4 aspect family: ${group}`);
}

for (const patch of overlay.rows) {
  const [, , first, second, family] = patch.contentKey.split("/");
  assert.equal(first, "sun", `${patch.contentKey}: Batch 4 canonical first body must be Sun`);

  for (const aspect of concreteAspects(family)) {
    const oldForward = baselineRenderer.renderSynastryAspect({
      planetA: "sun",
      planetB: second,
      aspect,
      otherName: "Sofia"
    });
    const newForward = liveRenderer.renderSynastryAspect({
      planetA: "sun",
      planetB: second,
      aspect,
      otherName: "Sofia"
    });
    const oldReverse = baselineRenderer.renderSynastryAspect({
      planetA: second,
      planetB: "sun",
      aspect,
      otherName: "Sofia"
    });
    const newReverse = liveRenderer.renderSynastryAspect({
      planetA: second,
      planetB: "sun",
      aspect,
      otherName: "Sofia"
    });

    assert.equal(newForward.contentKey, patch.contentKey, `${patch.contentKey}: forward resolver selected the wrong row`);
    assert.equal(newReverse.contentKey, patch.contentKey, `${patch.contentKey}: reverse resolver selected the wrong row`);
    assert.notEqual(newForward.body, oldForward.body, `${patch.contentKey}: viewer-centered direction did not change`);
    assert.equal(newReverse.body, oldReverse.body, `${patch.contentKey}: opposite reader direction changed`);
    assert.match(newForward.body, /Sofia/u, `${patch.contentKey}: friend name did not render`);
    assert.doesNotMatch(newForward.body, /\{\{(?:holder|Name)/u, `${patch.contentKey}: unresolved runtime variable leaked`);
    assert.doesNotMatch(newReverse.body, /\{\{(?:holder|Name)/u, `${patch.contentKey}: unresolved reverse variable leaked`);
  }
}

console.log("Synastry directionality Batch 4: 24 canonical viewer-centered reverses + inverse-direction preservation PASS.");
