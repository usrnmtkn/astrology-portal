import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

import { createTransitSynastryRenderer } from "../apps/web/src/content/fallbackArchitectureV3/dist/tldr-content.js";
import { renderSynastryAspect, renderSynastryPairVoice } from "../apps/web/src/content/fallbackArchitectureV3/resolver/renderTransitSynastry.mjs";

const require = createRequire(import.meta.url);
const { buildAspectWritingPacket } = require("../packages/astro-knowledge/scripts/build-aspect-writing-packet.js");

const payloadPath = "packages/astro-knowledge/review/chunk2-owner-authored-payloads.json";
const reviewRoot = "packages/astro-knowledge/review/dedupe-chunk-2-owner-authored-v1";
const source = JSON.parse(fs.readFileSync("apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json", "utf8"));
const bundled = JSON.parse(fs.readFileSync("apps/web/src/content/fallbackArchitectureV3/bundled-deferred-core-rows-v3.json", "utf8"));
const templates = JSON.parse(fs.readFileSync("apps/web/src/content/fallbackArchitectureV3/templates/fallback-templates-v3.json", "utf8"));
const transitLib = JSON.parse(fs.readFileSync("apps/web/src/content/fallbackArchitectureV3/source-rows/transit-synastry-rows-v1.json", "utf8"));
const payloads = JSON.parse(fs.readFileSync(payloadPath, "utf8"));
const readerVariantRecordPath = "packages/astro-knowledge/review/reader-variant-grammar-fix-v2/payloads-and-provenance.json";
const readerVariantRecord = JSON.parse(fs.readFileSync(readerVariantRecordPath, "utf8"));
const readerVariants = new Map(readerVariantRecord.rows.map((row) => [row.contentKey, row]));
const rows = new Map(source.hookRows.map((row) => [row.contentKey, row]));
const bundledRows = new Map(bundled.hookRows.map((row) => [row.contentKey, row]));
const browserRenderer = createTransitSynastryRenderer(transitLib, templates, source);
const pairs = [
  "mercury-mercury",
  "mercury-mars",
  "mercury-jupiter",
  "mercury-saturn",
  "venus-venus",
  "venus-mars",
  "venus-jupiter",
  "venus-saturn",
  "mars-mars",
  "mars-jupiter",
];
const groups = ["conjunction", "hard", "soft"];
const targets = pairs.flatMap((pair) => groups.map((group) => `${pair}/${group}`));
const aspects = {
  conjunction: ["conjunction", "conjunction", "conjunction"],
  hard: ["square", "opposition", "square"],
  soft: ["trine", "sextile", "trine"],
};
const pairBodies = new Map();
let renderCount = 0;

function fillHolders(body, holder1, holder2) {
  return renderSynastryPairVoice(body, { holder1, holder2 });
}

assert.deepEqual(Object.keys(payloads), targets);
for (const target of targets) {
  const [pair, group] = target.split("/");
  const [planetA, planetB] = pair.split("-");
  const payloadEntry = payloads[target];
  const key = `fallback-hook/synastry-pair/${planetA}/${planetB}/${group}`;
  const approvalPath = `${reviewRoot}/${pair}/${group}/exact-approval.json`;
  const approval = JSON.parse(fs.readFileSync(approvalPath, "utf8"));
  const row = rows.get(key);
  const readerVariant = readerVariants.get(key);
  const servingPayload = readerVariant?.payload ?? payloadEntry.payload;
  const calculatedHash = crypto.createHash("sha256").update(JSON.stringify(payloadEntry.payload)).digest("hex");
  const governedAspect = aspects[group][2];
  const governedPath = `packages/astro-knowledge/data/synastry/aspects/A-${planetA}_B-${planetB}_${governedAspect}.json`;
  const governed = JSON.parse(fs.readFileSync(governedPath, "utf8"));
  const governedPacket = buildAspectWritingPacket({
    surface: "synastry-aspect",
    format: "full-card",
    entry: governed,
  });

  assert.equal(calculatedHash, payloadEntry.sha256, `${target}: approved source hash mismatch`);
  assert.equal(approval.payloadSha256, payloadEntry.sha256, `${target}: approval hash mismatch`);
  assert.deepEqual(approval.payload, payloadEntry.payload, `${target}: approval payload drift`);
  assert.equal(approval.contentKey, key);
  assert.equal(approval.approvalLevel, "exact_owner_approved");
  assert.equal(approval.authorship, "owner_authored");
  assert.deepEqual(approval.generationEvidence, {
    writerCalls: 0,
    judgeCalls: 0,
    writerArtifactsExist: false,
    judgeArtifactsExist: false,
    reason: "The wording was authored and supplied directly by the owner. No Sol writer or Terra judge calls or artifacts exist for this payload.",
  });
  assert.deepEqual(fs.readdirSync(path.dirname(approvalPath)), ["exact-approval.json"]);
  assert.equal(Object.hasOwn(governed, "humanMoment"), false, `${target}: humanMoment must remain absent`);
  assert.equal(governedPacket.status, "editorial_required", `${target}: governed packet must fail closed`);
  assert.equal(governedPacket.generationAllowed, false, `${target}: generation must remain blocked`);
  assert.ok(governedPacket.flags.some((flag) => flag.id === "missing-human-moment-beat" && flag.blocking));
  assert.deepEqual(governedPacket.scaleRule, {
    harvest_mode: null,
    insertWarmthBeat: false,
    rule: "Packet blocked; no scale rule applies.",
  });

  assert.ok(row, `missing ${key}`);
  assert.deepEqual(bundledRows.get(key), row, `stale bundled row ${key}`);
  assert.equal(row.review_status, "approved");
  assert.equal(row.approved_via, undefined);
  assert.equal(row.body_you, servingPayload.body_you);
  assert.equal(row.body_they, servingPayload.body_they);
  assert.deepEqual(row.approval, readerVariant ? {
    approvalLevel: "exact_owner_approved",
    recordPath: readerVariantRecordPath,
    payloadSha256: readerVariant.payloadSha256,
    approvedAt: readerVariantRecord.approvedAt,
  } : {
    approvalLevel: "exact_owner_approved",
    recordPath: approvalPath,
    payloadSha256: payloadEntry.sha256,
    approvedAt: "2026-08-05",
  });

  const bodies = pairBodies.get(pair) ?? { body_you: new Set(), body_they: new Set() };
  bodies.body_you.add(row.body_you);
  bodies.body_they.add(row.body_they);
  pairBodies.set(pair, bodies);

  const [forwardAspect, reverseAspect] = aspects[group];
  const renders = [{
    input: { planetA, planetB, aspect: forwardAspect, otherName: "Sofia" },
    expected: fillHolders(servingPayload.body_you, "you", "Sofia"),
  }];
  if (planetA !== planetB) {
    renders.push({
      input: { planetA: planetB, planetB: planetA, aspect: reverseAspect, otherName: "Sofia" },
      expected: fillHolders(servingPayload.body_they, "Sofia", "you"),
    });
  }

  for (const render of renders) {
    const nodeResult = renderSynastryAspect(render.input);
    const browserResult = browserRenderer.renderSynastryAspect(render.input);
    assert.equal(nodeResult.body, render.expected, `${key}: Node render mismatch`);
    assert.equal(browserResult.body, render.expected, `${key}: browser render mismatch`);
    assert.doesNotMatch(`${nodeResult.body} ${browserResult.body}`, /\{\{|[—–]/u);
    assert.doesNotMatch(`${nodeResult.body} ${browserResult.body}`, /\byou\s+(?:is|was|has|does|feels|gives|keeps|makes|helps|responds|reaches|brings|tends|wants|pushes|needs|starts|sees|shows|thinks|notices|knows|believes|hears|takes|begins|experiences|changes|gets|ends|acts|becomes|pays|offers|names|reacts|reads|supports|turns)\b/iu);
    renderCount += 2;
  }
}

assert.equal(pairBodies.size, 10);
for (const [pair, bodies] of pairBodies) {
  assert.equal(bodies.body_you.size, 3, `${pair}: body_you must be aspect-distinct`);
  assert.equal(bodies.body_they.size, 3, `${pair}: body_they must be aspect-distinct`);
}
assert.equal(renderCount, 102);

console.log("Dedupe chunk 2: 30 owner-authored exact approvals, 30 source/bundle contracts, 30 fail-closed governed entries, 10 aspect-distinct pairs, and 102 Node/browser renders PASS.");
