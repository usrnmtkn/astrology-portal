#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import {
  defaultLocation,
  getAstrodienstSky
} from "../apps/web/src/services/ephemeris.ts";

const sky = await getAstrodienstSky(
  defaultLocation,
  new Date("2025-09-06T12:00:00.000Z")
);

assert.equal(sky.moonEvent?.name, "Full Moon");
assert.equal(sky.moonEvent?.sign, "Pisces");
assert.equal(sky.moonEvent?.eclipseType, "lunar");
assert.equal(sky.moonEvent?.occursAt, "2025-09-07T18:08:54.999Z");

const currentYearSky = await getAstrodienstSky(
  {
    label: "Portsmouth, NH",
    latitude: 43.0718,
    longitude: -70.7626,
    timeZone: "America/New_York"
  },
  new Date("2026-08-28T16:00:00.000Z")
);

assert.equal(currentYearSky.moonEvent?.name, "Full Moon");
assert.equal(currentYearSky.moonEvent?.sign, "Pisces");
assert.equal(currentYearSky.moonEvent?.eclipseType, "lunar");
assert.equal(currentYearSky.moonEvent?.occursAt, "2026-08-28T04:18:32.999Z");
assert.equal(
  currentYearSky.moonEvent?.days,
  0,
  "A lunation earlier on the reader's selected local day must remain the day's Moon event."
);

const [losAngelesSky, tokyoSky, priorNewYorkDaySky] = await Promise.all([
  getAstrodienstSky(
    {
      label: "Los Angeles, CA",
      latitude: 34.0522,
      longitude: -118.2437,
      timeZone: "America/Los_Angeles"
    },
    new Date("2026-08-27T19:00:00.000Z")
  ),
  getAstrodienstSky(
    {
      label: "Tokyo, Japan",
      latitude: 35.6762,
      longitude: 139.6503,
      timeZone: "Asia/Tokyo"
    },
    new Date("2026-08-28T03:00:00.000Z")
  ),
  getAstrodienstSky(
    {
      label: "Portsmouth, NH",
      latitude: 43.0718,
      longitude: -70.7626,
      timeZone: "America/New_York"
    },
    new Date("2026-08-27T16:00:00.000Z")
  )
]);

for (const localDaySky of [losAngelesSky, tokyoSky]) {
  assert.equal(localDaySky.moonEvent?.occursAt, "2026-08-28T04:18:32.999Z");
  assert.equal(localDaySky.moonEvent?.eclipseType, "lunar");
}
assert.ok(
  (priorNewYorkDaySky.moonEvent?.days ?? 0) > 0,
  "The day before the eclipse retains a future countdown instead of treating it as today's event."
);

const appSource = fs.readFileSync("apps/web/src/App.tsx", "utf8");
assert.match(
  appSource,
  /currentSky\.moonEvent\.eclipseType[\s\S]*`eclipse-\$\{currentSky\.moonEvent\.eclipseType\}`/u,
  "The You-page special-day route must preserve calculated eclipse identity."
);
assert.match(
  appSource,
  /contentReviewFlags: dailySpecialSections\.flatMap/u,
  "The You-page assembly must retain internal conditional-section review flags."
);
const weeklySource = fs.readFileSync("apps/web/src/services/weeklyHoroscope.ts", "utf8");
assert.match(
  weeklySource,
  /source: "lunation" as const,\s*reviewFlags: rendered\.reviewFlags/u,
  "The weekly lunation adapter must retain resolver review flags."
);
assert.match(
  weeklySource,
  /reviewFlags: dominant\.reviewFlags/u,
  "The selected weekly reading must retain conditional-section review flags."
);

console.log("Eclipse Moon-event routing passed: the ephemeris marks the Pisces lunar eclipse and the You page preserves its identity and review flags.");
