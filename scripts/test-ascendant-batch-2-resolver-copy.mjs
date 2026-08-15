import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";

import { createTransitSynastryRenderer } from "../apps/web/src/content/fallbackArchitectureV3/dist/tldr-content.js";
import { renderSynastryAspect } from "../apps/web/src/content/fallbackArchitectureV3/resolver/renderTransitSynastry.mjs";

const source = JSON.parse(fs.readFileSync("apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json", "utf8"));
const bundled = JSON.parse(fs.readFileSync("apps/web/src/content/fallbackArchitectureV3/bundled-relationship-hook-rows-v3.json", "utf8"));
const templates = JSON.parse(fs.readFileSync("apps/web/src/content/fallbackArchitectureV3/templates/fallback-templates-v3.json", "utf8"));
const transitLib = JSON.parse(fs.readFileSync("apps/web/src/content/fallbackArchitectureV3/source-rows/transit-synastry-rows-v1.json", "utf8"));
const rows = new Map(source.hookRows.map(row => [row.contentKey, row]));
const bundledRows = new Map(bundled.hookRows.map(row => [row.contentKey, row]));
const browserRenderer = createTransitSynastryRenderer(transitLib, templates, source);
const reviewRoot = "packages/astro-knowledge/review/ascendant-batch-2-card-drafts-v1";
const approvedHashes = {
  "neptune/conjunction": "8ef56d0d1b532d87dd8041dffd1bd89b74a8f5d384770327bd81440335f49e38",
  "neptune/hard": "b2c1c9702fc02a7244d0e2204f52692260359e00178bbc9ab95167c28d963ac6",
  "neptune/soft": "91f6efc2105acce579f55447477fd6912d445a9c6f566d1a7fa36644008d39fb",
  "pluto/conjunction": "bc47d7f3ab41bd529f608294f80764c4741c59ac063f5c9d5845e65d62348708",
  "pluto/hard": "893bb3b215f8859a08283211f81e280193097411fbb07a2ed6749a2464973cda",
  "pluto/soft": "43c9d014c1ba2fe06cf332ecb9c215c9721ea81ed8b18071cbc9226637efb944"
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

console.log("Ascendant batch 2: 6 exact approvals, 6 source/bundle contracts, and 24 Node/browser direction renders PASS.");
