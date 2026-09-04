import assert from "node:assert/strict";
import fs from "node:fs";

const app = fs.readFileSync(new URL("../apps/web/src/App.tsx", import.meta.url), "utf8");

assert.match(app, /function currentSkyAspectTransitWindow\([\s\S]*?positions\?: PlanetPosition\[\][\s\S]*?timingContainsReference[\s\S]*?engagementStart <= reference[\s\S]*?reference <= engagementEnd/u, "Sky aspect timing may only reuse an engagement window that actually contains the selected sky instant.");
assert.match(app, /const displayOrb = aspect\.type === "quincunx" \? 3 : 5/u, "Fallback Sky aspect ranges must use the canonical visible aspect orb rather than the narrower narrative presentation orb.");
assert.match(app, /const relativeSpeed = Math\.max\(0\.002, Math\.abs\(firstSpeed - secondSpeed\)\)/u, "Fallback Sky aspect ranges must use relative planetary speed.");
assert.match(app, /const distanceFromEntry = applying[\s\S]*?displayOrb - currentOrb[\s\S]*?displayOrb \+ currentOrb/u, "Applying aspects must calculate the full entry-to-exit span asymmetrically around the current orb.");
assert.match(app, /const distanceToExit = applying[\s\S]*?displayOrb \+ currentOrb[\s\S]*?displayOrb - currentOrb/u, "Separating aspects must preserve the full entry-to-exit span.");
assert.match(app, /const timing = currentSkyAspectTransitRange\(aspect, generatedAt, positions\)/u, "Sky aspect detail articles must pass live planetary speeds into range calculation.");
assert.match(app, /dateLine: currentSkyAspectTransitRange\(aspect, generatedAt, positions\)/u, "Sky placement aspect beats must use the same corrected date range.");
assert.doesNotMatch(app, /const remainingOrb = Math\.max\(0\.2, aspectWindowOrb - aspect\.orb\)/u, "Out-of-presentation-orb aspects must not collapse to a fake same-day range.");

// Sept. 4 live regression: Mercury sextile Mars was visible at about 3.8° orb.
// That is outside the narrower 3° narrative timing band but inside the canonical
// 5° Sky display orb. The old 0.2° clamp reduced the detail header to “Today.”
const displayOrb = 5;
const currentOrb = 3.8;
const mercurySpeed = 1.25;
const marsSpeed = 0.52;
const relativeSpeed = Math.abs(mercurySpeed - marsSpeed);
const fullVisibleSpanDays = ((displayOrb - currentOrb) + (displayOrb + currentOrb)) / relativeSpeed;
assert.ok(fullVisibleSpanDays > 1, "Mercury sextile Mars at 3.8° orb must not collapse to Today.");

console.log("Sky aspect detail date-range contract passed.");
