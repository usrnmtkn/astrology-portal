#!/usr/bin/env node

import assert from "node:assert/strict";
import {
  assertSurfaceStrategy,
  resolveSurfaceStrategy,
  SURFACE_STRATEGIES,
  validateCopy
} from "../../src/astro-writing/index.mjs";
import { resolveVoiceEvidence } from "../../src/astro-writing/voiceEvidence.mjs";

for (const strategy of Object.values(SURFACE_STRATEGIES)) {
  assert.equal(assertSurfaceStrategy(strategy), strategy);
  assert.equal(strategy.readerJudge.authority, "advisory-only");
  assert.equal(strategy.readerJudge.mayBlock, false);
  assert.equal(strategy.readerJudge.mayRewrite, false);
}

const friends = resolveSurfaceStrategy({ family: "friends-transit", surface: "card" });
const daily = resolveSurfaceStrategy({ family: "daily", surface: "daily" });
assert.deepEqual(friends.voiceEvidenceRoles, ["owner-approved-example", "available-line", "available-component"]);
assert.deepEqual(daily.voiceEvidenceRoles, ["owner-approved-example"]);

const plan = {
  object: "saturn",
  sign: null,
  eventType: "transit-aspect",
  coreTension: "a thought slows under pressure",
  likelyObservableBehaviors: ["rewrites the message"],
  risks: []
};
const examples = [{
  id: "owner-friends-example",
  ownerApproved: true,
  family: "friends-transit",
  register: "card",
  body: "A message gets rewritten before it is sent."
}];
assert.throws(() => resolveVoiceEvidence({
  canonicalId: "transit-aspect/saturn/mercury/conjunction",
  plan,
  examples,
  corrections: [],
  family: "friends-transit",
  register: "card",
  strategy: friends
}), /OWNER_EVIDENCE_FAMILY_MAPPING_REQUIRED/u,
"Friends voice evidence must fail closed until its owner-evidence family is explicitly mapped.");

assert.throws(() => resolveVoiceEvidence({
  canonicalId: "transit-aspect/saturn/mercury/conjunction",
  plan,
  examples: [],
  corrections: [],
  family: "daily",
  register: "collective",
  strategy: daily
}), /OWNER_EVIDENCE_FAMILY_MAPPING_REQUIRED/u,
"Daily voice evidence must fail closed rather than inherit Friends permissions.");

assert.throws(() => validateCopy("Unknown profile supplied.", { validationProfile: "unknown-profile" }), /WRITING_VALIDATION_PROFILE_UNKNOWN/u);
const grammarFailure = validateCopy("The choice sits between they and the deadline.", { validationProfile: "shared-only" });
assert.ok(grammarFailure.violations.some((entry) => entry.category === "grammar_pronoun-object-case"));
assert.ok(validateCopy("A transit squares the natal Moon.", { validationProfile: "daily" })
  .violations.some((entry) => entry.category === "daily_engine_hidden"));
assert.ok(validateCopy("This article will explain the transit.", { validationProfile: "article" })
  .violations.some((entry) => entry.category === "article_meta_scaffolding"));
assert.ok(validateCopy("They are soulmates.", { validationProfile: "synastry" })
  .violations.some((entry) => entry.category === "synastry_fate_ban"));

console.log(JSON.stringify({
  status: "PASS",
  governedKernel: "one evidence and governance contract",
  strategies: Object.keys(SURFACE_STRATEGIES),
  friendsPhraseEvidence: "BLOCKED_PENDING_OWNER_EVIDENCE_FAMILY_MAPPING",
  dailyPhraseIsolation: "FAIL_CLOSED",
  readerJudgeAuthority: "advisory-only",
  sharedGrammarGate: "PASS",
  billedCalls: 0
}, null, 2));
