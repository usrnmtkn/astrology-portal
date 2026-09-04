#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
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

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const panel = fs.readFileSync(
  path.join(root, "apps/web/src/features/friends/ManualChartsPanel.tsx"),
  "utf8"
);

assert.match(
  panel,
  /const selectedFriendEligibleTransits = useMemo\([\s\S]{0,900}selectEligibleFriendTransits\([\s\S]{0,900}acceptedOwnerApprovedTransitSections\(/u,
  "Friends must evaluate owner-approved reader-detail eligibility before applying the visible-card cap."
);
assert.match(
  panel,
  /const transits = selectedFriendEligibleTransits\.filter\(\(transit\) => transit\.term === durationClass\);/u,
  "Friends personal-transit groups must render from the eligible capped set."
);
assert.match(
  panel,
  /const transit = selectedFriendEligibleTransits\.find\(\(candidate\) => candidate\.id === transitId\);/u,
  "A backfilled visible Friends transit must open from the same eligible set that rendered it."
);
assert.match(
  panel,
  /const transit = selectedFriendEligibleTransits\.find\(\(candidate\) => \(\s*normalizeContentIdPart\(candidate\.id\) === routedTransitId\s*\)\);/u,
  "A backfilled Friends transit deep link must restore from the same eligible set that rendered it."
);
assert.match(
  panel,
  /transitWheelAspectLines\(currentSky, selectedFriendReadyNatalChart, selectedFriendEligibleTransits\)/u,
  "The Friends transit wheel must reflect the same eligible visible personal-transit set."
);

console.log("Friends personal-transit eligible-card cap: PASS (eligibility precedes the eight-card cap; backfilled cards remain visible, openable, routable, and wheel-consistent)");
