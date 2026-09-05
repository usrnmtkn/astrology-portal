#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

const app = fs.readFileSync("apps/web/src/App.tsx", "utf8");
const routing = fs.readFileSync("apps/web/src/services/skyAspectRouting.ts", "utf8");
const calendar = fs.readFileSync("apps/web/src/features/calendar/LunarCalendar.tsx", "utf8");

const functionStart = app.indexOf("function relatedSkyAspectSectionsForPlacement({");
const functionEnd = app.indexOf("\nfunction skyPlacementAspectExactMoment(", functionStart);
assert.ok(functionStart >= 0 && functionEnd > functionStart, "Related Sky aspect section builder must exist.");
const builder = app.slice(functionStart, functionEnd);

assert.match(builder, /const resolvedSections = aspects[\s\S]*?\.sort\(\(first, second\) => first\.orb - second\.orb\)/u);
assert.match(builder, /const giftSection = resolvedSections\.find\(\(\{ section \}\) => section\.group === "gifts"\);/u);
assert.match(builder, /const lessonSection = resolvedSections\.find\(\(\{ section \}\) => section\.group === "lessons"\);/u);
assert.match(builder, /if \(giftSection && lessonSection\)[\s\S]*return \[giftSection, lessonSection\][\s\S]*\.map\(\(\{ section \}\) => section\);/u);
assert.match(routing, /return composed \?\? exact \?\? signSpecific \?\? phrasebook \?\? generated \?\? fallback \?\? null;/u);
assert.match(calendar, /exact: exact \?\? studioExact/u);
assert.match(app, /const \[contentRegistryVersion, setContentRegistryVersion\] = useState\(0\);/u);
assert.match(app, /const refreshKey = [^\n]*contentRegistryVersion[^\n]*personalizationKey/u);
assert.match(app, /\[contentRegistryVersion, fallbackArchitectureV3Version, profileNatalSky\?\.ascendant/u);
assert.match(app, /const loadedExactRegistry = contentRegistryFor\("sky"\);[\s\S]*studio[\s\S]*loadedExactRegistry[\s\S]*!loadedExactRegistry\.approvedExactSkyAspectCopy/u);

console.log("Sky placement exact-aspect authority contract passed.");
