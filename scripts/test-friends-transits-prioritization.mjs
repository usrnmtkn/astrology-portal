import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), "utf8");

const app = read("apps/web/src/App.tsx");
const panel = read("apps/web/src/features/friends/ManualChartsPanel.tsx");
const tab = read("apps/web/src/features/friends/FriendTransitsTab.tsx");
const housePriority = read("apps/web/src/features/friends/friendHouseTransitPriority.ts");
const brief = read("apps/web/src/features/friends/friendTransitsBrief.ts");

assert.match(app, /planet: "Midheaven"[\s\S]*longitude: natalSky\.midheavenLongitude/);
assert.match(app, /planet: "Imum Coeli"[\s\S]*longitude: natalSky\.midheavenLongitude \+ 180/);
assert.match(app, /point === "Imum Coeli" \|\| point === "IC"[\s\S]*return "ic"/);
assert.match(panel, /rankFriendHouseTransitActivations\([\s\S]*currentSkyHouseActivations\(currentSky, selectedFriendReadyNatalChart\)[\s\S]*\.slice\(0, 4\)/);
assert.match(housePriority, /pluto: 0/);
assert.match(housePriority, /saturn: 0/);
assert.match(housePriority, /jupiter: 1/);
assert.match(housePriority, /moon: 4/);
assert.match(brief, /detailAvailable/);
assert.match(brief, /hasDailyGuidance: dailyDoCount === 3 && dailyDontCount === 3/);

const shortIndex = tab.indexOf('{shortTermTransits.length > 0');
const bondIndex = tab.indexOf('{bondTransits.length > 0');
const houseIndex = tab.indexOf('{visibleHouseTransits.length > 0');
const dailyIndex = tab.indexOf('{dailyForecast ?');
const longIndex = tab.indexOf('{longTermTransits.length > 0');
assert.ok(shortIndex >= 0 && bondIndex > shortIndex, "Active-for transits should lead relationship context");
assert.ok(houseIndex > bondIndex, "House context should follow relationship context");
assert.ok(dailyIndex > houseIndex, "Daily guidance should support, not outrank, prioritized transits");
assert.ok(longIndex > dailyIndex, "Longer cycles should remain after daily context");

console.log("Friends transits prioritization contract passed.");
