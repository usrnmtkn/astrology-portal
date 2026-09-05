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
assert.match(builder, /return resolvedSections\.map\(\(\{ section \}\) => section\);/u);
assert.doesNotMatch(builder, /\.slice\(0, 2\)|giftSection|lessonSection/u);
assert.match(routing, /return composed \?\? exact \?\? signSpecific \?\? phrasebook \?\? generated \?\? fallback \?\? null;/u);
assert.match(calendar, /exact: exact \?\? studioExact/u);
assert.match(app, /const contentRegistryVersion = useContentRegistryRevision\(\);/u);
assert.doesNotMatch(app, /setContentRegistryVersion/u);
assert.match(app, /const refreshKey = [^\n]*contentRegistryVersion[^\n]*personalizationKey/u);
assert.match(app, /\[contentRegistryVersion, fallbackArchitectureV3Version, profileNatalSky\?\.ascendant/u);
assert.match(app, /const loadedExactRegistry = contentRegistryFor\("sky"\);[\s\S]*studio[\s\S]*loadedExactRegistry[\s\S]*!loadedExactRegistry\.approvedExactSkyAspectCopy/u);
assert.doesNotMatch(app, /sourceGapAspectRows/u);

console.log("Sky placement exact-aspect authority contract passed.");
