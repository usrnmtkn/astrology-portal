import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import { ownerApprovedNatalHouseMechanism } from "../api/_lib/ask-tldr-governed-authority-snapshots.ts";

const authorityPath = new URL("../config/ask-tldr/authorities/natal-ascendant-v1.json", import.meta.url);
const authority = JSON.parse(fs.readFileSync(authorityPath, "utf8"));
const expectedMeaning = "Your rising sign describes how you enter the world and how other people first experience you. It also shapes the way you instinctively approach new situations and make sense of what is happening around you.";
const expectedMeaningSha256 = "6181083942c0c2252263653561acb5397cebeaab2d118f2a94d32294b085113b";
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

assert.equal(authority.schema, "ask-tldr-internal-semantic-authority/v1");
assert.equal(authority.id, "natal-angle-ascendant-v1");
assert.equal(authority.canonicalId, "natal-angle/ascendant");
assert.equal(authority.factorKey, "natal-angle:ascendant");
assert.equal(authority.status, "owner_approved");
assert.equal(authority.ownerApproved, true);
assert.equal(authority.approvedOn, "2026-09-06");
assert.equal(authority.approvedScope, "ask-tldr-internal-semantic-authority");
assert.equal(authority.meaning, expectedMeaning);
assert.equal(authority.meaningSha256, expectedMeaningSha256);
assert.equal(sha256(authority.meaning), expectedMeaningSha256);
assert.deepEqual(authority.governance, {
  readerCopyApproved: false,
  servingChangesAuthorized: false,
  promotionAuthorized: false,
  runtimeEnabled: false,
  autoPublish: false
});

const ascendantCandidate = {
  id: "natal-angle:ascendant",
  kind: "natal_placement",
  facts: { point: "Ascendant", sign: "Gemini", house: 1 },
  points: ["Ascendant"],
  houses: [1]
};
const governed = ownerApprovedNatalHouseMechanism(ascendantCandidate, ["body/ascendant", "house/1"]);
assert.ok(governed, "The exact owner-approved generic natal Ascendant authority must resolve.");
assert.equal(governed.status, "full");
assert.equal(governed.sourceKind, "owner_approved_internal_mechanism");
assert.deepEqual(governed.canonicalIds, ["internal-mechanism:natal-angle:ascendant"]);
assert.deepEqual(governed.targetUsages, ["mechanism-reference"]);
assert.match(governed.promptEvidence, /owner-approved generic natal Ascendant meaning/u);
assert.match(governed.promptEvidence, new RegExp(expectedMeaning.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "u"));
assert.equal(governed.packet.authorization.readerCopyApproved, false);
assert.equal(governed.packet.authorization.servingChangesAuthorized, false);
assert.equal(governed.packet.authorization.promotionAuthorized, false);
assert.equal(governed.packet.authorization.runtimeEnabled, false);

assert.equal(ownerApprovedNatalHouseMechanism({ ...ascendantCandidate, facts: { ...ascendantCandidate.facts, house: 2 }, houses: [2] }, []), null, "Generic Ascendant authority must not authorize an impossible/noncanonical house substitution.");
assert.equal(ownerApprovedNatalHouseMechanism({ ...ascendantCandidate, facts: { ...ascendantCandidate.facts, point: "Midheaven", house: 10 }, points: ["Midheaven"], houses: [10] }, []), null, "Generic Ascendant authority must not authorize another angle.");

console.log("Ask TLDR natal Ascendant authority passed: exact owner-approved meaning is hash-locked for internal semantic use only; reader copy, serving, promotion, runtime, other houses, and other angles remain unauthorized.");
