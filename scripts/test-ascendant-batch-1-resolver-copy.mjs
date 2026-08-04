import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";

import { createTransitSynastryRenderer } from "../apps/web/src/content/fallbackArchitectureV3/dist/tldr-content.js";
import { renderSynastryAspect } from "../apps/web/src/content/fallbackArchitectureV3/resolver/renderTransitSynastry.mjs";

const source = JSON.parse(fs.readFileSync("apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json", "utf8"));
const bundled = JSON.parse(fs.readFileSync("apps/web/src/content/fallbackArchitectureV3/bundled-deferred-core-rows-v3.json", "utf8"));
const templates = JSON.parse(fs.readFileSync("apps/web/src/content/fallbackArchitectureV3/templates/fallback-templates-v3.json", "utf8"));
const transitLib = JSON.parse(fs.readFileSync("apps/web/src/content/fallbackArchitectureV3/source-rows/transit-synastry-rows-v1.json", "utf8"));
const rows = new Map(source.hookRows.map(row => [row.contentKey, row]));
const bundledRows = new Map(bundled.hookRows.map(row => [row.contentKey, row]));
const browserRenderer = createTransitSynastryRenderer(transitLib, templates, source);
const reviewRoot = "packages/astro-knowledge/review/ascendant-batch-1-card-drafts-v1";
const approvedHashes = {
  "sun/conjunction": "3311f61b851f147f4726e9406f175687c3cd94f73c161e595d41e022102151af",
  "sun/hard": "6d34067efce400fd9d22ea6000e338a2f94c9fd108ac5dcf5b15eee16cd885d0",
  "sun/soft": "8eb7ffc64ca8adef7c4362d880d2c491ebce07c3317512af66cd78d6271a1776",
  "moon/conjunction": "1d2ccbb6caac197155f9c401b1466bc876ae413c67da411165969af263ad20c9",
  "moon/hard": "bfbc1453900c1e1c39e83b9cf369084f50e99cddd0015f63af1258ecf5868dd7",
  "moon/soft": "610cfe115306dbb08984cf12df6c3f594257f19d3f5d1bb7294783ab7c458eb8",
  "mercury/conjunction": "64fab3d1533eb0e92b6d635fdaef4462a0f47b85800742741e8f798f380256fa",
  "mercury/hard": "d4f3a1cbdc4bb25759f69df3740ed3b0ff5c145651c564ede0c9b200b49db47c",
  "mercury/soft": "9d7118ea446306c664c49281deefb3a30766ada0853f740caa167f6da57dc55c",
  "venus/conjunction": "a4acdf5be0d288ecf6b114e4f8102758f320f1214ea09e4bdd9ea84d46f46475",
  "venus/hard": "f54f9519772a9ecfee46a636c883234028fd2392ac10f25ab3f2f8d026f49ffb",
  "venus/soft": "fd00adb62ad8dcb67c529b70826682ba4f2f65db97263a4f422c94d499c8122d",
  "saturn/conjunction": "5c3d02018685697ce1d6fbf6474197e9926e341a62c1dde8120cf35e93339036",
  "saturn/hard": "ec80e308338f8bbf6b57d53febd63d0839968d98211e4d64f85518f76fbb9986",
  "saturn/soft": "f7be4e2ece5bc2d5c89246a98e002e50a41bab19b79d7e8fcf6be5bd9399206f"
};
const aspects = {
  conjunction: ["conjunction", "conjunction"],
  hard: ["square", "opposition"],
  soft: ["trine", "sextile"]
};

for (const [target, expectedHash] of Object.entries(approvedHashes)) {
  const [planet, group] = target.split("/");
  const key = `fallback-hook/synastry-pair/${planet}/ascendant/${group}`;
  const approvalPath = `${reviewRoot}/${planet}-ascendant/${group}/exact-approval.json`;
  const approval = JSON.parse(fs.readFileSync(approvalPath, "utf8"));
  const row = rows.get(key);
  const calculatedHash = crypto.createHash("sha256").update(JSON.stringify(approval.payload)).digest("hex");

  assert.ok(row, `missing ${key}`);
  assert.deepEqual(bundledRows.get(key), row, `stale bundled row ${key}`);
  assert.equal(row.review_status, "approved");
  assert.equal(row.body_you, approval.payload.body_you);
  assert.equal(row.body_they, approval.payload.body_they);
  assert.equal(calculatedHash, expectedHash);
  assert.equal(approval.payloadSha256, expectedHash);
  assert.equal(approval.contentKey, key);
  assert.deepEqual(row.approval, {
    approvalLevel: "exact_owner_approved",
    recordPath: approvalPath,
    payloadSha256: expectedHash,
    approvedAt: "2026-08-04"
  });

  const [forwardAspect, reverseAspect] = aspects[group];
  const renders = [
    {
      input: { planetA: planet, planetB: "ascendant", aspect: forwardAspect, otherName: "Sofia" },
      expected: approval.payload.body_you.replaceAll("{{holder2}}", "Sofia")
    },
    {
      input: { planetA: "ascendant", planetB: planet, aspect: reverseAspect, otherName: "Sofia" },
      expected: approval.payload.body_they.replaceAll("{{holder1}}", "Sofia")
    }
  ];

  for (const render of renders) {
    const nodeResult = renderSynastryAspect(render.input);
    const browserResult = browserRenderer.renderSynastryAspect(render.input);
    assert.equal(nodeResult.body, render.expected, `${key}: Node render mismatch`);
    assert.equal(browserResult.body, render.expected, `${key}: browser render mismatch`);
    assert.doesNotMatch(`${nodeResult.body} ${browserResult.body}`, /\{\{|[—–]/u);
  }
}

console.log("Ascendant batch 1: 15 exact approvals, 15 source/bundle contracts, and 60 Node/browser direction renders PASS.");
