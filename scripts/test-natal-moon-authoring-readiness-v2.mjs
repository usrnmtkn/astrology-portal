#!/usr/bin/env node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";

const artifact = JSON.parse(fs.readFileSync("packages/astro-knowledge/review/natal-moon-authoring-readiness-v2.json", "utf8"));
const fallback = JSON.parse(fs.readFileSync("apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json", "utf8"));
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");

assert.equal(artifact.schema, "tldr-natal-moon-authoring-readiness/v2");
assert.equal(artifact.governance.compatibilitySourcesReadOnly, true);
assert.equal(artifact.governance.approvedInternalMechanismsOnly, true);
assert.equal(artifact.governance.houseArgumentsRequireOwnerApprovalBeforeDrafting, true);
assert.equal(artifact.governance.readerCopyApproved, false);
assert.equal(artifact.governance.servingChanges, false);
assert.equal(artifact.governance.friendCandidates, false);
assert.equal(artifact.counts.signRows, 12);
assert.equal(artifact.counts.houseRows, 12);
assert.equal(artifact.counts.approvedHouseMechanisms, 12);
assert.equal(artifact.counts.houseArgumentVerdicts, 0);
assert.equal(artifact.counts.renderRows, 144);
assert.equal(artifact.counts.calibrationRenders, 24);
assert.equal(artifact.counts.blockedRenders, 120);
assert.equal(artifact.counts.signRowsPassingDeterministicPrecheck, 12);

for (const source of artifact.sourceFiles) {
  const bytes = fs.readFileSync(source.path);
  assert.equal(bytes.length, source.byteLength, `${source.path} byte length drift`);
  assert.equal(sha256(bytes), source.sha256, `${source.path} hash drift`);
}

for (const row of artifact.signRows) {
  assert.equal(row.ownerSignVerdict, "");
  assert.equal(row.ownerSignEdit, "");
  assert.equal(row.ownerChildhoodDecision, "");
  assert.equal(row.ownerChildhoodEdit, "");
  assert.equal(row.deterministicPrecheck.length, 0, `${row.runtimeKey} deterministic precheck`);
  assert.equal(sha256(row.youCandidate), row.youCandidateSha256);
  assert.equal(sha256(row.childhoodBlock), row.childhoodBlockSha256);
  assert.match(row.childhoodBlock, /What happened growing up/u);
}

const bridgeRows = new Map(fallback.hookRows.filter((row) => /^fallback-hook\/house-meaning\/\d+$/u.test(row.contentKey)).map((row) => [row.contentKey, row]));
for (const row of artifact.houseRows) {
  assert.equal(row.mechanismOwnerDecision, "approve_internal_mechanism", `${row.runtimeKey} mechanism decision`);
  assert.equal(row.argumentCore.length, 10, `${row.runtimeKey} argument line count`);
  assert.equal(row.qualityIntentions.length, 5, `${row.runtimeKey} intention count`);
  assert.equal(row.ownerArgumentVerdict, "");
  assert.equal(row.ownerArgumentEdit, "");
  const contextualBridge = row.bridge.replace(/^It's in your/u, "Your {{planetTitle}} is in your");
  assert.equal(
    bridgeRows.get(row.bridgeContentKey)?.body_you,
    contextualBridge,
    `${row.runtimeKey} contextual bridge drift`
  );
  assert.equal(sha256(row.bridge), row.bridgeSha256);
}

for (const row of artifact.renderRows) {
  if (row.renderStatus === "blocked_pending_house_argument_approval") {
    assert.equal(row.noChildhood, "");
    assert.equal(row.withChildhood, "");
  } else {
    assert.equal(row.renderStatus, "calibration_only_needs_review");
    assert.ok(row.noChildhood);
    assert.ok(row.withChildhood);
    assert.equal(sha256(row.noChildhood), row.noChildhoodSha256);
    assert.equal(sha256(row.withChildhood), row.withChildhoodSha256);
  }
}

assert.ok(fs.statSync("outputs/019fedfe-d553-75e3-be16-8abaa96cdf44/TLDR-NATAL-MOON-AUTHORING-READINESS-V2.xlsx").size > 10000);
console.log("Moon authoring-readiness guard passed: 12 signs, 12 approved mechanisms, 24 calibration renders, 120 blocked renders, historical review bytes unchanged and contextual serving bridges verified.");
