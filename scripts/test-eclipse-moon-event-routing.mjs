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
