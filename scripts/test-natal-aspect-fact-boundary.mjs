import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { canonicalNatalAspectsForSnapshot } from "../apps/web/src/services/natalAspectFacts.ts";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
const position = (planet, longitude) => ({
  planet,
  glyph: "",
  longitude,
  sign: "Aries",
  signGlyph: "♈",
  degree: longitude % 30,
  house: 1,
  motion: "direct"
});

const snapshot = {
  positions: [
    position("Sun", 0),
    position("Moon", 90),
    position("Mercury", 20),
    position("Saturn", 200),
    position("Chiron", 43),
    position("Transit Mercury", 110)
  ],
  aspects: [
    {
      id: "leaked-sky-mercury-sextile-chiron",
      from: "Mercury",
      to: "Chiron",
      type: "sextile",
      orb: 1,
      exactAt: "2026-08-12T00:00:00.000Z",
      timing: {
        group: "this-week",
        phase: "building",
        engagementStart: "2026-08-11T00:00:00.000Z",
        engagementEnd: "2026-08-13T00:00:00.000Z",
        passIndex: 0,
        exactPasses: []
      }
    },
    {
      id: "leaked-transit-mercury-square-saturn",
      from: "Transit Mercury",
      to: "Saturn",
      type: "square",
      orb: 0
    }
  ]
};

const actual = canonicalNatalAspectsForSnapshot(snapshot);
assert.deepEqual(
  actual,
  canonicalNatalAspectsForSnapshot({ ...snapshot, aspects: [] }),
  "Every incoming aspect record must be ignored at the natal reader boundary."
);
assert.deepEqual(
  actual.map(({ from, type, to, orb }) => ({ from, type, to, orb })),
  [
    { from: "Sun", type: "square", to: "Moon", orb: 0 },
    { from: "Mercury", type: "opposition", to: "Saturn", orb: 0 }
  ],
  "Natal surfaces must derive aspects only from canonical natal point longitudes."
);
assert.equal(
  actual.some((aspect) => aspect.from === "Mercury" && aspect.type === "sextile" && aspect.to === "Chiron"),
  false,
  "A sky/transit Mercury-sextile-Chiron record must not enter a natal surface when natal geometry does not support it."
);
assert.equal(actual.some((aspect) => "exactAt" in aspect || "timing" in aspect || "series" in aspect), false);
assert.equal(actual.some((aspect) => aspect.from.startsWith("Transit ") || aspect.to.startsWith("Transit ")), false);

const app = read("apps/web/src/App.tsx");
const youPage = read("apps/web/src/features/you/YouPage.tsx");
const friendPanel = read("apps/web/src/features/friends/ManualChartsPanel.tsx");
const friendRail = read("apps/web/src/features/friends/FriendProfileChartRail.tsx");

assert.match(app, /aspects: canonicalNatalAspectsForSnapshot\(natalSky\)/u, "You placement details must use the natal-only boundary.");
assert.match(app, /uniqueNatalAspectRows\(canonicalNatalAspectsForSnapshot\(natalSky\)\)/u, "You natal aspect lists must use the natal-only boundary.");
assert.match(youPage, /aspects=\{natalOnlyAspects\}/u, "The You natal wheel must use canonical natal-only aspects.");
assert.doesNotMatch(youPage, /aspects=\{natalSky\.aspects\}/u, "The You natal wheel must not trust the snapshot aspect list.");
assert.match(friendPanel, /groupFriendNatalAspects\(canonicalNatalAspectsForSnapshot\(selectedChart\.natalChart\)\)/u, "Friend natal lists must use the natal-only boundary.");
assert.match(friendRail, /aspects=\{canonicalNatalAspectsForSnapshot\(natalSky\)\}/u, "The Friend natal wheel must use the natal-only boundary.");
assert.doesNotMatch(friendRail, /aspects=\{natalSky\.aspects\}/u, "The Friend natal wheel must not trust the snapshot aspect list.");

console.log("natal aspect fact boundary: ok (You and Friend lists, placement details, and wheels derive from natal positions)");
