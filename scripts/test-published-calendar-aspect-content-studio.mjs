#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

const dashboard = fs.readFileSync("apps/admin/src/GeneratedContentAdminDashboard.tsx", "utf8");
const skyContent = fs.readFileSync("apps/web/src/services/skyAspectContent.ts", "utf8");
const app = fs.readFileSync("apps/web/src/App.tsx", "utf8");
const calendar = fs.readFileSync("apps/web/src/features/calendar/LunarCalendar.tsx", "utf8");
const seed = fs.readFileSync("scripts/seed-published-calendar-aspect-content-studio.mjs", "utf8");
const mercuryMars = JSON.parse(fs.readFileSync("packages/astro-knowledge/data/transits/mercury-sextile-mars.json", "utf8"));
const sunMercury = JSON.parse(fs.readFileSync("packages/astro-knowledge/data/transits/sun-conjunction-mercury.json", "utf8"));

assert.match(dashboard, /contentKey\.startsWith\("sky\.aspect\."\)/u, "Published exact aspect rows must appear under Calendar Aspects.");
assert.match(skyContent, /resolveSkyAspectContentStudioExact/u, "The reader needs a governed exact-aspect Content Studio resolver.");
assert.match(skyContent, /source\.contentStudioExactAspect !== true/u, "Exact Studio rows must fail closed without their provenance marker.");
assert.match(app, /const loadedExactRegistry = contentRegistryFor\("sky"\);[\s\S]*!loadedExactRegistry\.approvedExactSkyAspectCopy\(aspect\.from, aspect\.type, aspect\.to\)[\s\S]*tier: "content-studio-exact-sky-aspect-v1"/u, "Sky detail may use Studio exact copy only for a true canonical exact gap.");
assert.match(calendar, /exact: exact \?\? studioExact/u, "Calendar cards must keep canonical exact copy authoritative over the Studio mirror.");
assert.match(seed, /studio_content_type: "aspect"/u, "Published exact rows must use versioned aspect editing.");
assert.match(seed, /content_key: contentKey[\s\S]*status: "LIVE"[\s\S]*lane: "serving"/u, "The imported baseline must be visible as published.");
assert.equal(mercuryMars.status, "LIVE");
assert.equal(mercuryMars.readerCopy.body.startsWith("A direct conversation can clear a problem that has been taking far more mental energy than the actual solution requires."), true);
assert.equal(sunMercury.status, "LIVE");
assert.equal(sunMercury.readerCopy.body.startsWith("Your thoughts can feel unusually personal when saying what you mean also feels like saying who you are."), true);

console.log("Published Calendar aspect Content Studio authority contract passed.");
