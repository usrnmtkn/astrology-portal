#!/usr/bin/env node

import assert from "node:assert/strict";
import { classifyNatalDeterministicFindings } from "../src/astro-writing/natalWritingGatePolicy.mjs";
import {
  BANNED_FRIEND_SENTENCES,
  assessCrossRowReuse,
  assessPassageShape,
  validateBatchCadence,
  validateFriendAuthoringMethod,
  validateFriendPair
} from "../src/astro-writing/natalBatchGuards.mjs";

const cadence = validateBatchCadence([
  { copy: "You can call the manager. The meeting ends." },
  { copy: "You can write the email. The meeting ends." }
]);
assert.equal(cadence.passed, true, "cadence must not block a batch");
assert.equal(cadence.advisoryPassed, false, "cadence remains visible as advisory evidence");

const shape = assessPassageShape("Name calls the manager.");
assert.equal(shape.passed, true, "length and observability floors must not block");
assert.equal(shape.advisoryPassed, false);

const reuse = assessCrossRowReuse([
  { rowKey: "one", copy: "Name sends the report before lunch." },
  { rowKey: "two", copy: "Name sends the report before lunch." }
]);
assert.equal(reuse.passed, true, "cross-row uniqueness is advisory");
assert.equal(reuse.uniqueSentenceRatio, 0.5);

const lexical = classifyNatalDeterministicFindings([
  { category: "abstract_subject_grammar", detail: "Warmth appears." },
  { category: "zero_concrete_nouns", detail: "No observable noun." }
]);
assert.equal(lexical.passed, true, "lexical writing-quality heuristics are advisory");
assert.equal(lexical.advisory.length, 2);

const validFriend = "People start looking at Name when the meeting reaches the decision nobody wants to make. Name states the tradeoff, and the group chooses a direction.";
assert.equal(validateFriendPair({
  selfCopy: "You can step into a complicated situation and see the larger move quickly.",
  friendCopy: validFriend
}).passed, true);

const secondPerson = validateFriendPair({
  selfCopy: "You finish the report.",
  friendCopy: "People see Name finish your report."
});
assert.ok(secondPerson.violations.some((item) => item.category === "friend_second_person_leakage"));

const pronounSwap = validateFriendPair({
  selfCopy: "You finish the report before lunch and send it to the manager.",
  friendCopy: "Name finishes the report before lunch and sends it to the manager."
});
assert.ok(pronounSwap.violations.some((item) => item.category === "pronoun_swap_derivation"));

assert.equal(validateFriendAuthoringMethod({
  friendCopy: validFriend,
  sharedParagraphSkeletonAvailable: true
}).passed, false, "shared Friend skeletons remain blocking");

const banned = validateFriendAuthoringMethod({ friendCopy: BANNED_FRIEND_SENTENCES[0] });
assert.ok(banned.violations.some((item) => item.category === "owner_banned_string"));

console.log("Natal writing governance passed: proxy metrics advisory; provenance-independent Friend safety rules blocking.");
