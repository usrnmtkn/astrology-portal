#!/usr/bin/env node

import assert from "node:assert/strict";
import { validateCopy } from "../src/astro-writing/validateCopy.mjs";
import { BANNED_FRIEND_SENTENCES, validateBatchCadence, validateCrossRowUniqueness, validateFriendPair, validatePassageShape } from "../src/astro-writing/natalBatchGuards.mjs";

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

const newlyCaught = [
  "Desire makes it easy to count the goal and ignore the spending.",
  "Curiosity keeps supplying better material for the next plan.",
  "Trust can speed up learning without making every idea the teacher offers correct.",
  "Feeling and reason cooperate well enough that you can stay useful under pressure."
];
for (const copy of newlyCaught) {
  const result = validateCopy(copy, { family: "natal-aspect-exact", register: "collective", plan: { astrologySupport: "present" } });
  assert.ok(result.violations.some((item) => item.category === "abstract_subject_grammar"), copy);
}

const v5MissedAbstractSubjects = [
  "Hope becomes expensive when the bill arrives.",
  "Ambition loses ground when the workplace remembers the conversation.",
  "Pride can protect a vulnerable feeling during the argument.",
  "Confidence returns from inside the response after the meeting.",
  "Feeling and reason remain available together during the appointment.",
  "Warmth appears in the exchange while the coffee gets cold.",
  "Ambition returns when the project serves an ideal."
];
for (const copy of v5MissedAbstractSubjects) {
  const result = validateCopy(copy, { family: "natal-aspect-exact", register: "collective", plan: { astrologySupport: "present" } });
  assert.ok(result.violations.some((item) => item.category === "abstract_subject_grammar"), copy);
}

const shortAbstractFriend = "Friends experience Name as generous. Warmth appears in the exchange.";
const shortShape = validatePassageShape(shortAbstractFriend);
assert.equal(shortShape.passed, false);
assert.ok(shortShape.violations.some((item) => item.category === "passage_shape"));
assert.ok(shortShape.violations.some((item) => item.category === "passage_length"));
assert.ok(shortShape.violations.some((item) => item.category === "observable_noun_floor"));
const fullShape = validatePassageShape("A coworker sees Name rewrite the message before lunch, after the first version brings a manager to the desk. The document loses its sharpest accusation and keeps the useful fact everyone needs for the afternoon decision. A manager can act on the corrected version without reopening yesterday's argument or asking the whole office to choose sides. Name still has to say the difficult part, but the meeting no longer begins with damage that a careful email could have prevented.");
assert.equal(fullShape.passed, true);

const exactFailure = validateCrossRowUniqueness([
  { rowKey: "one", copy: "People see Name finish the report." },
  { rowKey: "two", copy: "People see Name finish the report." }
]);
assert.equal(exactFailure.passed, false);
assert.equal(exactFailure.exactDuplicateGroups.length, 1);
const nearFailure = validateCrossRowUniqueness([
  { rowKey: "one", copy: "People see Name finish the difficult report before lunch." },
  { rowKey: "two", copy: "People watch Name finish the difficult report before lunch." }
]);
assert.equal(nearFailure.passed, false);
assert.ok(nearFailure.nearDuplicates[0].score > 0.85);
const seriesFailure = validateCrossRowUniqueness([
  { rowKey: "one", copy: "People see the pattern in a call, a bill, or a deadline." },
  { rowKey: "two", copy: "Friends notice the evidence in a call, a bill, or a deadline." }
]);
assert.equal(seriesFailure.passed, false);
assert.equal(seriesFailure.sharedThreeItemSeries.length, 1);
const bannedFailure = validateCrossRowUniqueness([
  { rowKey: "one", copy: BANNED_FRIEND_SENTENCES[0] }
], { bannedSentences: BANNED_FRIEND_SENTENCES });
assert.equal(bannedFailure.passed, false);
assert.equal(bannedFailure.bannedFindings.length, 1);

console.log("Natal batch guards passed: parse-based grammatical subjects, chart deixis, passage shape, distinct observable nouns, cadence, independent Friend entry, exact/near uniqueness, shared-series, and banned fixtures.");
