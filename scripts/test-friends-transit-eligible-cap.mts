#!/usr/bin/env node
import assert from "node:assert/strict";
import { selectEligibleFriendTransits } from "../apps/web/src/features/friends/friendTransitEligibility.ts";

const rankedCandidates = Array.from({ length: 10 }, (_, index) => ({
  id: `transit-${index + 1}`,
  detailAvailable: index !== 2
}));

const selected = selectEligibleFriendTransits(
  rankedCandidates,
  (candidate) => candidate.detailAvailable,
  8
);

assert.deepEqual(
  selected.map((candidate) => candidate.id),
  ["transit-1", "transit-2", "transit-4", "transit-5", "transit-6", "transit-7", "transit-8", "transit-9"],
  "An unavailable transit inside the original top eight must not consume a visible-card slot; the next eligible ranked transit must backfill it."
);
assert.equal(selected.length, 8, "The visible Friends personal-transit cap must remain eight eligible cards.");
assert.deepEqual(
  selectEligibleFriendTransits(rankedCandidates, () => false, 8),
  [],
  "The selector must fail closed when no candidate has reader-facing detail."
);
assert.deepEqual(
  selectEligibleFriendTransits(rankedCandidates, () => true, 0),
  [],
  "A non-positive cap must return no cards."
);

console.log("Friends personal-transit eligible-card cap: PASS (eligibility precedes the eight-card cap and preserves rank order)");
