#!/usr/bin/env node

import assert from "node:assert/strict";
import { validateCopy } from "../src/astro-writing/validateCopy.mjs";
import { validateBatchCadence, validateFriendPair } from "../src/astro-writing/natalBatchGuards.mjs";

const fixtures = [
  "Meaning often arrives through tone and association before it arrives as a clean list of facts.",
  "Emotion and imagination face each other here.",
  "Confidence and feeling support each other naturally here.",
  "Sensitivity moves easily toward images, stories, and acts of service."
];
for (const copy of fixtures) {
  const result = validateCopy(copy, { family: "natal-aspect-exact", register: "collective", plan: { astrologySupport: "present" } });
  assert.equal(result.passed, false, copy);
  assert.ok(result.violations.some((item) => item.category === "abstract_subject_grammar"), copy);
}
assert.ok(validateCopy(fixtures[1], { plan: { astrologySupport: "present" } }).violations.some((item) => item.category === "chart_deixis"));

const cadenceFail = Array.from({ length: 20 }, (_, index) => ({ copy: index < 4 ? `You can see row ${index}. The result changes ${index}.` : `Row ${index} starts elsewhere. Ending ${index} stays distinct.` }));
assert.equal(validateBatchCadence(cadenceFail).passed, false);
const cadencePass = Array.from({ length: 20 }, (_, index) => ({ copy: `Person ${index} starts differently. Ending number ${index} stays distinct.` }));
assert.equal(validateBatchCadence(cadencePass).passed, true);

assert.equal(validateFriendPair({
  selfCopy: "You step into the meeting and make the decision quickly.",
  friendCopy: "Name steps into the meeting and makes the decision quickly."
}).passed, false);
assert.equal(validateFriendPair({
  selfCopy: "You step into the meeting and make the decision quickly.",
  friendCopy: "People start looking at Name when the meeting reaches the decision nobody wants to make. Name names the tradeoff on the whiteboard, and the room finally chooses a direction."
}).passed, true);

console.log("Natal V4 guards passed: abstract subjects, chart deixis, batch cadence, and independent Friend entry.");
