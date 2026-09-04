#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import {
  BOUNDED_OWNER_BATCH_AUTHORIZATION_TYPE,
  applyBoundedOwnerBatchAuthorization,
  applyOwnerApproval,
  applyRenderedSampleApproval,
  assertBatchGenerationAuthorized,
  assertServingAuthorized,
  generatedApprovalState,
  markPipelineReady,
  stageRenderedSample
} from "../src/astro-writing/approvalGovernance.mjs";

const payloadSha256 = "a".repeat(64);
const secondPayloadSha256 = "b".repeat(64);
const baseAuthorization = {
  type: BOUNDED_OWNER_BATCH_AUTHORIZATION_TYPE,
  authority: "owner",
  decision: "approve",
  batchId: "friends-transit-corpus-v1",
  evidenceRecordPath: "packages/astro-knowledge/review/friends-transit-corpus-v1-owner-authorization.json",
  ownerStatement: "I approve this named Friends transit batch.",
  surface: "personal-transits-friends",
  approvedField: "body_they",
  capabilities: ["batch_generation", "serving"],
  members: [
    { contentKey: "authored/transit-aspect/venus/moon/hard", payloadSha256 },
    { contentKey: "authored/transit-aspect/mars/moon/hard", payloadSha256: secondPayloadSha256 }
  ]
};
const pending = markPipelineReady(generatedApprovalState());
const authorized = applyBoundedOwnerBatchAuthorization(pending, {
  authorization: baseAuthorization,
  contentKey: "authored/transit-aspect/venus/moon/hard",
  field: "body_they",
  payloadSha256,
  surface: "personal-transits-friends"
});

assert.equal(authorized.approvalStatus, "owner-approved");
assert.equal(authorized.ownerApproved, true);
assert.equal(authorized.renderedSampleOwnerApproved, false);
assert.equal(authorized.boundedOwnerBatchAuthorized, true);
assert.equal(authorized.boundedOwnerBatchAuthorization.contentKey, "authored/transit-aspect/venus/moon/hard");
assert.equal(assertBatchGenerationAuthorized(authorized), true);
assert.equal(assertServingAuthorized(authorized), true);

assert.throws(
  () => applyBoundedOwnerBatchAuthorization(pending, {
    authorization: { ...baseAuthorization, authority: "model" },
    contentKey: "authored/transit-aspect/venus/moon/hard",
    field: "body_they",
    payloadSha256,
    surface: "personal-transits-friends"
  }),
  /Only an owner-originating approve decision/u,
  "A model or judge cannot manufacture owner authority."
);
assert.throws(
  () => applyBoundedOwnerBatchAuthorization(pending, {
    authorization: { ...baseAuthorization, members: [baseAuthorization.members[1]] },
    contentKey: "authored/transit-aspect/venus/moon/hard",
    field: "body_they",
    payloadSha256,
    surface: "personal-transits-friends"
  }),
  /OWNER_BATCH_MEMBER_NOT_AUTHORIZED/u,
  "A row outside the explicit member list must fail closed."
);
assert.throws(
  () => applyBoundedOwnerBatchAuthorization(pending, {
    authorization: baseAuthorization,
    contentKey: "authored/transit-aspect/venus/moon/hard",
    field: "body_they",
    payloadSha256: "c".repeat(64),
    surface: "personal-transits-friends"
  }),
  /OWNER_BATCH_MEMBER_PAYLOAD_HASH_MISMATCH/u,
  "Changed prose cannot inherit an older batch approval."
);
assert.throws(
  () => applyBoundedOwnerBatchAuthorization(pending, {
    authorization: { ...baseAuthorization, batchId: "friends-*" },
    contentKey: "authored/transit-aspect/venus/moon/hard",
    field: "body_they",
    payloadSha256,
    surface: "personal-transits-friends"
  }),
  /non-wildcard batchId/u
);
assert.throws(
  () => applyBoundedOwnerBatchAuthorization(pending, {
    authorization: baseAuthorization,
    contentKey: "authored/transit-aspect/venus/moon/hard",
    field: "body_you",
    payloadSha256,
    surface: "personal-transits-friends"
  }),
  /field does not match/u
);
assert.throws(
  () => applyBoundedOwnerBatchAuthorization(pending, {
    authorization: baseAuthorization,
    contentKey: "authored/transit-aspect/venus/moon/hard",
    field: "body_they",
    payloadSha256,
    surface: "personal-transits-you"
  }),
  /surface does not match/u
);

const generationOnly = applyBoundedOwnerBatchAuthorization(pending, {
  authorization: { ...baseAuthorization, capabilities: ["batch_generation"] },
  contentKey: "authored/transit-aspect/venus/moon/hard",
  field: "body_they",
  payloadSha256,
  surface: "personal-transits-friends"
});
assert.equal(assertBatchGenerationAuthorized(generationOnly), true);
assert.throws(
  () => assertServingAuthorized(generationOnly),
  /RENDERED_SAMPLE_OWNER_APPROVAL_REQUIRED_FOR_SERVING/u,
  "Generation authorization must not silently become serving authorization."
);
assert.throws(
  () => applyBoundedOwnerBatchAuthorization(pending, {
    authorization: { ...baseAuthorization, capabilities: ["serving"] },
    contentKey: "authored/transit-aspect/venus/moon/hard",
    field: "body_they",
    payloadSha256,
    surface: "personal-transits-friends"
  }),
  /Serving authorization must also explicitly authorize batch generation/u
);

const documentApproved = applyOwnerApproval(markPipelineReady(generatedApprovalState()), {
  status: "owner-approved",
  exactOwnerRuling: "I approve this exact wording."
});
const renderedPending = stageRenderedSample(documentApproved, {
  sampleId: "rendered-sample-governance-regression",
  surface: "sky-placement"
});
const renderedApproved = applyRenderedSampleApproval(renderedPending, {
  sampleId: "rendered-sample-governance-regression",
  exactOwnerRuling: "I approve this fully rendered product sample."
});
assert.equal(assertBatchGenerationAuthorized(renderedApproved), true);
assert.equal(assertServingAuthorized(renderedApproved), true);

const transitionContract = JSON.parse(fs.readFileSync("data/writing/approval-status-transitions.json", "utf8"));
assert.deepEqual(
  transitionContract.capabilityRequirements.batch_generation,
  ["rendered_sample_owner_approved"],
  "The existing rendered-sample path remains the default contract."
);
assert.deepEqual(
  transitionContract.capabilityRequirementAlternatives.batch_generation,
  [["rendered_sample_owner_approved"], [BOUNDED_OWNER_BATCH_AUTHORIZATION_TYPE]]
);
assert.deepEqual(
  transitionContract.capabilityRequirementAlternatives.serving,
  [["rendered_sample_owner_approved"], [BOUNDED_OWNER_BATCH_AUTHORIZATION_TYPE]]
);
assert.equal(transitionContract.boundedOwnerBatchAuthorization.modelOrJudgeMayCreateAuthority, false);
assert.equal(transitionContract.boundedOwnerBatchAuthorization.wildcardsAllowed, false);
assert.equal(transitionContract.boundedOwnerBatchAuthorization.scopeExpansionAllowed, false);

const governanceDoc = fs.readFileSync("docs/writing/OWNER_APPROVAL_GOVERNANCE.md", "utf8");
for (const required of [
  "Only an explicit owner ruling may set:",
  "A model PASS is not owner approval.",
  "bounded owner batch authorization",
  "exact SHA-256",
  "scope expansion fails",
  "AI-authored note, or assistant inference is not a bounded owner batch approval"
]) {
  assert.ok(governanceDoc.toLowerCase().includes(required.toLowerCase()), `Governance doc must preserve: ${required}`);
}

console.log("Bounded owner batch approval governance: PASS (owner-only, member/hash/surface/field/capability bounded; rendered-sample path preserved)");
