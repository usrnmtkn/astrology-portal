#!/usr/bin/env node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const reviewDir = path.join(repoRoot, "packages/astro-knowledge/review/lunation-card-assembly-v1");
const packet = JSON.parse(fs.readFileSync(path.join(reviewDir, "lunation-aspect-review-packet-v1.json"), "utf8"));
const madlib = JSON.parse(fs.readFileSync(path.join(reviewDir, "source/horoscope-madlib-v1.json"), "utf8"));
const markdown = fs.readFileSync(path.join(reviewDir, "lunation-aspect-review-packet-v1.md"), "utf8");
const chatDecisions = JSON.parse(fs.readFileSync(path.join(reviewDir, "lunation-aspect-chat-decisions-v1.json"), "utf8"));
const sha256 = (value) => crypto.createHash("sha256").update(value, "utf8").digest("hex");

assert.equal(packet.schema, "lunation-aspect-review-packet/v1");
assert.equal(packet.status, "pending-owner-review");
assert.deepEqual(packet.counts, {
  aspectStems: 5,
  bodyHouseMeanings: 108,
  houseBridges: 12,
  rulerConditionStems: 3,
});
assert.equal(packet.selectionRule.status, "pending_owner_review");
assert.equal(packet.selectionRule.decision, null);
const { decision: _decision, replacementCopy: _replacementCopy, ownerNote: _ownerNote, ...selectionRule } = packet.selectionRule;
const { ruleSha256, ...ruleWithoutHash } = selectionRule;
assert.equal(ruleSha256, sha256(JSON.stringify(ruleWithoutHash)));

const allRows = [
  ...packet.aspectStems,
  ...packet.bodyHouseMeanings,
  ...packet.houseBridges,
  ...packet.rulerConditionStems,
];
assert.equal(allRows.length, 128);
assert.equal(new Set(allRows.map((row) => row.contentKey)).size, 128);
assert.ok(allRows.every((row) => row.decision === null && row.replacementCopy === null));
assert.ok(allRows.every((row) => typeof row.copy === "string" && row.copy.trim().length > 0));
assert.ok(allRows.every((row) => !row.copy.includes("—")), "Draft copy must honor the no-em-dash rule.");

assert.deepEqual(packet.aspectStems.map((row) => row.aspect), [
  "conjunction", "opposition", "square", "trine", "sextile",
]);
for (const stem of packet.aspectStems) {
  assert.match(stem.copy, /\{\{planet\}\}/u);
  assert.doesNotMatch(stem.copy, /\{\{contactLight\}\}/u);
  assert.match(stem.copy, /\{\{lunationKind\}\}/u);
}
assert.ok(
  !markdown.includes("the Moon during this Full Moon") && !markdown.includes("the Sun during this Full Moon"),
  "Reader examples must not duplicate the contact light and lunation label.",
);

const expectedBodies = [
  "mercury", "venus", "mars", "jupiter", "saturn",
  "uranus", "neptune", "pluto", "node_axis",
];
for (const house of madlib.houses) {
  const bodyRows = packet.bodyHouseMeanings.filter((row) => row.house === house.house);
  assert.equal(bodyRows.length, 9, `House ${house.house} must have nine body meanings.`);
  assert.deepEqual(bodyRows.map((row) => row.body), expectedBodies);
  assert.ok(bodyRows.every((row) => row.domain === house.domain));
  assert.ok(bodyRows.every((row) => row.exampleAssembly.includes(row.copy)));
  const bridge = packet.houseBridges.find((row) => row.house === house.house);
  assert.equal(bridge.domain, house.domain);
}

assert.equal(
  packet.houseBridges.find((row) => row.house === 4).copy,
  "Take time to check in and feel, you cannot think your way out of emotion.",
);
assert.equal(packet.houseBridges.find((row) => row.house === 8).copy, "Don't fear what you might transform into.");
assert.equal(
  packet.houseBridges.find((row) => row.house === 12).copy,
  "Give yourself enough privacy to hear what is surfacing, but do not confuse privacy with having to carry it alone.",
);

assert.match(markdown, /Status: \*\*DRAFT FOR OWNER REVIEW\. NOTHING IN THIS PACKET SERVES\.\*\*/u);
assert.equal((markdown.match(/- \[ \] APPROVE  - \[ \] REVISE  - \[ \] OMIT/gu) ?? []).length, 129);
assert.equal(chatDecisions.servingAuthority, false);
assert.equal(chatDecisions.planetAspectOpenings.length, 40);
assert.ok(chatDecisions.planetAspectOpenings.every((row) => row.decision === "APPROVE"));
assert.ok(chatDecisions.planetAspectOpenings.every((row) => !row.copy.includes("{{contactLight}}")));
assert.equal(chatDecisions.nodeAxisArchitecture.decision, "APPROVE");
assert.equal(chatDecisions.nodeAxisArchitecture.maximumRenderedBlocks, 1);
assert.deepEqual(chatDecisions.nodeAxisArchitecture.omittedAspectOpenings, [
  "conjunction", "opposition", "square", "trine", "sextile",
]);
assert.equal(chatDecisions.nodalContactOpenings.length, 1);
assert.equal(chatDecisions.nodalContactOpenings[0].decision, "APPROVE");
assert.deepEqual(chatDecisions.nodalContactOpenings[0].nodalPositionPhrases, {
  "new-moon": "falls near the lunar nodes",
  "full-moon": "falls across the lunar nodes",
});
assert.ok(!chatDecisions.planetAspectOpenings.some((row) => row.planet === "node_axis"));

console.log(`Lunation aspect review packet passed: 128 unique pending rows, ${chatDecisions.planetAspectOpenings.length} approved planetary openings, ${chatDecisions.nodalContactOpenings.length} approved nodal opening, one hashed pending selection rule, 108 assembled previews, and exact book house domains.`);
