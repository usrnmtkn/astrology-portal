#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createTransitSynastryRenderer } from "../apps/web/src/content/fallbackArchitectureV3/dist/tldr-content.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageRoot = path.join(repoRoot, "apps/web/src/content/fallbackArchitectureV3");
const readJson = (relativePath) => JSON.parse(fs.readFileSync(path.join(packageRoot, relativePath), "utf8"));
const renderer = createTransitSynastryRenderer(
  readJson("source-rows/transit-synastry-rows-v1.json"),
  readJson("templates/fallback-templates-v3.json"),
  readJson("source-rows/fallback-source-rows-v3.json")
);

const dailyGlance = renderer.renderDailyGlance({
  natal: "moon",
  aspect: "square"
});
assert.equal(dailyGlance.headline, "You can outgrow a feeling and still catch yourself reaching for it.");
const houseGlance = renderer.renderDailyGlance({
  house: 8,
});
assert.ok(houseGlance.body);
const calendarPhase = renderer.renderCalendarPhase({
  phase: "waxing-gibbous",
  sign: "scorpio"
});
assert.equal(calendarPhase.headline, "Waxing Gibbous Moon in Scorpio");
assert.equal(calendarPhase.tagline, "The Refinement");
const moonDoDont = renderer.renderDoDont({
  planet: "mars",
  sign: "aquarius",
  house: 9,
  transiting: "moon"
});
assert.equal(moonDoDont.do.length, 3);
assert.equal(moonDoDont.dont.length, 3);

const appSource = fs.readFileSync(path.join(repoRoot, "apps/web/src/App.tsx"), "utf8");
const dailyStart = appSource.indexOf("function dailyGlanceGeneratedContent(");
const dailyEnd = appSource.indexOf("\nfunction importContentRegistry(", dailyStart);
const dailyAssembly = appSource.slice(dailyStart, dailyEnd);
assert.ok(dailyStart >= 0 && dailyEnd > dailyStart, "Daily assembly function must exist.");
assert.match(dailyAssembly, /\.renderDailyGlance\(/u, "Approved Copy Batch A must fill At a Glance.");
assert.doesNotMatch(dailyAssembly, /\.renderTransitAspect\(/u, "The retired interim Moon-card path must stay removed.");
assert.doesNotMatch(dailyAssembly, /\.renderTransitHouse\(/u, "The retired interim Moon-house path must stay removed.");
assert.match(dailyAssembly, /localNoon: true/u);

const youPageSource = fs.readFileSync(path.join(repoRoot, "apps/web/src/features/you/YouPage.tsx"), "utf8");
const lunarCalendarSource = fs.readFileSync(path.join(repoRoot, "apps/web/src/features/calendar/LunarCalendar.tsx"), "utf8");
assert.match(youPageSource, />At a Glance</u);
assert.doesNotMatch(youPageSource, /aria-label="Personal timing summary"/u);
assert.doesNotMatch(youPageSource, /Daily calendar/u, "Sky-wide phase and void copy must stay off You > Transits.");
assert.match(appSource, /dailyOuterTransitPlanets[\s\S]*?gate = dailyOuterTransitPlanets\.has\(planet\) \? 3 : 5/u);
assert.match(appSource, /dailyIsHeadliner \? 3 : 4/u);
assert.match(appSource, /renderDoDont\(\{/u);
assert.match(appSource, /const moonCandidate = dailyMoonDriver/u);
assert.match(appSource, /transiting: "moon"/u);
assert.match(appSource, /renderTransitLabel\(\{/u);
assert.match(appSource, /renderLunationHoroscope\(\{/u);
assert.match(appSource, /qualifyingTransits: qualifyingDailyTransits\.map/u);
assert.match(youPageSource, />Areas of Your Life</u);
assert.match(youPageSource, />Behind this Forecast</u);
assert.match(youPageSource, /dailyHoroscopeAssembly\?\.doItems\?\.length === 3/u);
assert.match(lunarCalendarSource, /renderCalendarPhase\(\{/u);
assert.match(lunarCalendarSource, /renderVoidOfCourse\(\{/u);
assert.match(lunarCalendarSource, /selectedPackagePhase\?\.headline/u);
assert.match(lunarCalendarSource, /selectedPackagePhase\?\.tagline/u);

console.log("daily horoscope assembly selection checks passed");
