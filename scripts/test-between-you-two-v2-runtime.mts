import assert from "node:assert/strict";

import {
  loadRelationshipFallbackArchitectureV3Bundle
} from "../apps/web/src/content/fallbackArchitectureV3Runtime";
import {
  betweenYouTwoV2BondReading,
  betweenYouTwoV2SharedMoonReading
} from "../apps/web/src/services/betweenYouTwoV2";

await loadRelationshipFallbackArchitectureV3Bundle();

const saturn = betweenYouTwoV2BondReading({
  dateLabel: "Sat., September 5",
  family: "hard",
  transiting: "Saturn",
  direction: "you",
  friendName: "Chris",
  primaryBondTransitId: "saturn-test",
  readerContext: "deciding what deserves your energy before you react",
  friendContext: "leaving the reply in drafts until the missing context shows up"
});
assert.ok(saturn);
assert.equal(saturn.headline, "The plan is becoming your job.");
assert.equal(
  saturn.body,
  "You and Chris make plans, but you are the one checking the time, making the reservation, and remembering what needs to happen next. The relationship starts taking more work from you than you expected."
);
assert.equal(saturn.move, "Decide who is actually handling the next step before you make another plan.");
assert.equal(saturn.evidenceTier, "bond");
assert.equal(saturn.primaryBondTransitId, "saturn-test");
assert.ok(saturn.sourceKeys.includes("fallback-hook/bond-effect-hard/saturn"));

const mars = betweenYouTwoV2BondReading({
  dateLabel: "Sat., September 5",
  family: "hard",
  transiting: "Mars",
  direction: "you",
  friendName: "Chris",
  primaryBondTransitId: "mars-test"
});
assert.ok(mars);
assert.equal(mars.headline, "Being kept waiting is starting to feel like disrespect.");
assert.equal(
  mars.move,
  "Acknowledge that you were left waiting before the argument becomes about everything the delay supposedly means."
);

const softSaturn = betweenYouTwoV2BondReading({
  dateLabel: "Sat., September 5",
  family: "soft",
  transiting: "Saturn",
  direction: "you",
  friendName: "Chris",
  primaryBondTransitId: "soft-saturn-test"
});
assert.ok(softSaturn);
assert.equal(softSaturn.headline, "You have evidence that they will follow through.");
assert.equal(softSaturn.move, "Let the follow-through count instead of checking one more time.");

assert.equal(
  betweenYouTwoV2BondReading({
    dateLabel: "Sat., September 5",
    family: "hard",
    transiting: "Saturn",
    direction: "they",
    friendName: "Chris",
    primaryBondTransitId: "reverse-held"
  }),
  null,
  "Unreviewed reverse-direction headline/move copy must fail closed."
);

assert.equal(
  betweenYouTwoV2BondReading({
    dateLabel: "Sat., September 5",
    family: "soft",
    transiting: "Mercury",
    direction: "you",
    friendName: "Chris",
    primaryBondTransitId: "held-family"
  }),
  null,
  "A held reader-direction family must fail closed even though its canonical bond body exists."
);

const fireMoon = betweenYouTwoV2SharedMoonReading({
  dateLabel: "Sat., September 5",
  element: "fire",
  readerContext: "telling them when you can do it instead of letting their urgency set your schedule",
  friendContext: "helping without rearranging their day around someone else"
});
assert.ok(fireMoon);
assert.equal(fireMoon.headline, "You may both have less patience for delays today.");
assert.match(fireMoon.body, /^The Moon is in a fire sign and aspecting both charts today,/u);
assert.equal(fireMoon.move, null);
assert.equal(fireMoon.evidenceTier, "shared-moon");

assert.equal(
  betweenYouTwoV2SharedMoonReading({
    dateLabel: "Sat., September 5",
    element: "earth"
  }),
  null,
  "Held Moon elements must fail closed."
);

console.log("Between You Two V2 runtime contract passed: approved reader direction + Moon Fire serve; reverse direction and held families fail closed.");
