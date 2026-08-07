import assert from "node:assert/strict";
import path from "node:path";
import { createServer } from "vite";
import SwissEph from "swisseph-wasm";

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;
const CAZIMI_DEGREES = 17 / 60;

function utcHour(date) {
  return date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
}

function normalizeDegrees(value) {
  return ((value % 360) + 360) % 360;
}

function signedDegrees(value) {
  const normalized = normalizeDegrees(value);
  return normalized > 180 ? normalized - 360 : normalized;
}

function longitude(swe, planetId, date) {
  const jd = swe.julday(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate(), utcHour(date));
  return normalizeDegrees(swe.calc_ut(jd, planetId, swe.SEFLG_SWIEPH)[0]);
}

function speed(swe, planetId, date) {
  const jd = swe.julday(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate(), utcHour(date));
  return swe.calc_ut(jd, planetId, swe.SEFLG_SWIEPH | swe.SEFLG_SPEED)[3];
}

function sunOrb(swe, planetId, date) {
  return Math.abs(signedDegrees(longitude(swe, planetId, date) - longitude(swe, swe.SE_SUN, date)));
}

function separation(swe, firstPlanetId, secondPlanetId, date) {
  return Math.abs(signedDegrees(longitude(swe, firstPlanetId, date) - longitude(swe, secondPlanetId, date)));
}

function refineZero(measure, lowerInput, upperInput) {
  let lower = lowerInput;
  let upper = upperInput;
  let lowerValue = measure(lower);
  for (let index = 0; index < 60; index += 1) {
    const midpoint = new Date((lower.getTime() + upper.getTime()) / 2);
    const midpointValue = measure(midpoint);
    if (lowerValue === 0 || lowerValue * midpointValue <= 0) {
      upper = midpoint;
    } else {
      lower = midpoint;
      lowerValue = midpointValue;
    }
  }
  return new Date((lower.getTime() + upper.getTime()) / 2);
}

function scanRoots(measure, start, end, stepMs) {
  const roots = [];
  let previousDate = start;
  let previousValue = measure(previousDate);
  for (let time = start.getTime() + stepMs; time <= end.getTime(); time += stepMs) {
    const currentDate = new Date(time);
    const currentValue = measure(currentDate);
    if (Math.abs(currentValue - previousValue) < 180 && (previousValue === 0 || previousValue * currentValue < 0)) {
      const root = refineZero(measure, previousDate, currentDate);
      if (!roots.some((candidate) => Math.abs(candidate.getTime() - root.getTime()) < HOUR_MS)) roots.push(root);
    }
    previousDate = currentDate;
    previousValue = currentValue;
  }
  return roots;
}

function timeAtOrbAfter(swe, planetId, conjunction, targetOrb) {
  let lower = conjunction;
  for (let hours = 1; hours <= 96; hours += 1) {
    const upper = new Date(conjunction.getTime() + hours * HOUR_MS);
    if (sunOrb(swe, planetId, upper) >= targetOrb) {
      return refineZero((date) => sunOrb(swe, planetId, date) - targetOrb, lower, upper);
    }
    lower = upper;
  }
  throw new Error(`Could not find ${targetOrb}° solar separation after ${conjunction.toISOString()}`);
}

function localDateKey(date, timeZone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

const swe = new SwissEph();
await swe.initSwissEph();
const vite = await createServer({
  root: path.join(repoRoot, "apps/web"),
  server: { middlewareMode: true },
  appType: "custom",
  logLevel: "silent"
});

try {
  const ephemeris = await vite.ssrLoadModule("/src/services/ephemeris.ts");
  const location = ephemeris.defaultLocation;

  const mercuryConjunctions = scanRoots(
    (date) => signedDegrees(longitude(swe, swe.SE_MERCURY, date) - longitude(swe, swe.SE_SUN, date)),
    new Date("2026-01-01T00:00:00Z"),
    new Date("2027-01-01T00:00:00Z"),
    6 * HOUR_MS
  );
  assert.ok(mercuryConjunctions.length >= 2, "Direct ephemeris must find multiple 2026 Mercury-Sun conjunctions");

  for (const conjunction of mercuryConjunctions.slice(0, 2)) {
    const directOrb = sunOrb(swe, swe.SE_MERCURY, conjunction);
    assert.ok(directOrb < 0.0001, `Direct conjunction should be exact at ${conjunction.toISOString()}`);
    const sky = await ephemeris.getAstrodienstSky(location, conjunction, { includeTransitWindows: true });
    const mercury = sky.positions.find((position) => position.planet === "Mercury");
    assert.ok(mercury, "Mercury position missing");
    assert.equal(mercury.cazimi, true, `17-arcminute named threshold should include ${conjunction.toISOString()}`);
    assert.equal(mercury.nearSun, true);
    assert.ok(mercury.cazimiOrb <= CAZIMI_DEGREES);
    assert.equal(
      sky.positions.find((position) => position.planet === "Moon")?.nearSun,
      undefined,
      "Near-Sun timing metadata must not leak onto the Moon placement surface"
    );

    const insideThresholdDate = timeAtOrbAfter(swe, swe.SE_MERCURY, conjunction, 16.9 / 60);
    const outsideThresholdDate = timeAtOrbAfter(swe, swe.SE_MERCURY, conjunction, 17.1 / 60);
    const insideThresholdSky = await ephemeris.getAstrodienstSky(location, insideThresholdDate, { includeTransitWindows: true });
    const outsideThresholdSky = await ephemeris.getAstrodienstSky(location, outsideThresholdDate, { includeTransitWindows: true });
    assert.equal(
      insideThresholdSky.positions.find((position) => position.planet === "Mercury")?.cazimi,
      true,
      "16.9 arcminutes must remain inside the named cazimi threshold"
    );
    assert.equal(
      outsideThresholdSky.positions.find((position) => position.planet === "Mercury")?.cazimi,
      false,
      "17.1 arcminutes must fall outside the named cazimi threshold"
    );

    const proximityOnlyDate = timeAtOrbAfter(swe, swe.SE_MERCURY, conjunction, 0.5);
    const proximitySky = await ephemeris.getAstrodienstSky(location, proximityOnlyDate, { includeTransitWindows: true });
    const proximityMercury = proximitySky.positions.find((position) => position.planet === "Mercury");
    assert.equal(proximityMercury?.nearSun, true, "A 0.5° separation should retain near-Sun metadata");
    assert.equal(proximityMercury?.cazimi, false, "A 0.5° separation must not be named cazimi");
    const week = await ephemeris.getLunarCalendarWeek(location, proximityOnlyDate, { detail: "full" });
    assert.ok(!week.events.some((event) => event.phase === "cazimi"), "Near-Sun metadata must not create a cazimi card");
  }

  const directChironStations = scanRoots(
    (date) => speed(swe, 15, date),
    new Date("2025-01-01T00:00:00Z"),
    new Date("2028-01-01T00:00:00Z"),
    12 * HOUR_MS
  );
  assert.ok(directChironStations.length >= 4, "Direct ephemeris must find multiple Chiron stations");

  const appEvents = await ephemeris.getLunarCalendarRangeEvents(
    location,
    new Date("2025-01-01T00:00:00Z"),
    new Date("2028-01-01T00:00:00Z")
  );
  const appChironStations = appEvents.filter((event) => event.planet === "Chiron" && event.type === "station");
  assert.equal(appChironStations.length, directChironStations.length, "App and direct ephemeris station counts must match");

  for (const directStation of directChironStations) {
    const appStation = appChironStations.find((event) => (
      Math.abs(new Date(event.startsAt).getTime() - directStation.getTime()) < 2 * 60_000
    ));
    assert.ok(appStation, `Missing Chiron station at ${directStation.toISOString()}`);
    const afterSpeed = speed(swe, 15, new Date(directStation.getTime() + DAY_MS));
    assert.equal(appStation.direction, afterSpeed < 0 ? "retrograde" : "direct");
  }

  const passageDates = [new Date("2025-09-15T12:00:00Z"), new Date("2026-10-01T12:00:00Z")];
  for (const passageDate of passageDates) {
    assert.ok(speed(swe, 15, passageDate) < 0, `${passageDate.toISOString()} must be Chiron retrograde by direct calculation`);
    const week = await ephemeris.getLunarCalendarWeek(location, passageDate, { detail: "full" });
    const dateKey = localDateKey(passageDate, location.timeZone);
    const passage = week.events.find((event) => (
      event.planet === "Chiron"
      && event.phase === "retrograde-passage"
      && event.dateKey === dateKey
    ));
    assert.ok(passage, `Missing Chiron active passage on ${dateKey}`);
    assert.equal(passage.direction, "retrograde");
  }

  const ingressCases = [
    { anchor: new Date("2025-03-30T12:00:00Z"), planet: "Neptune", toSign: "Aries", passType: "initial" },
    { anchor: new Date("2025-10-22T12:00:00Z"), planet: "Neptune", toSign: "Pisces", passType: "re-entry" },
    { anchor: new Date("2026-01-26T12:00:00Z"), planet: "Neptune", toSign: "Aries", passType: "final" },
    { anchor: new Date("2025-11-07T12:00:00Z"), planet: "Uranus", toSign: "Taurus", passType: "re-entry" },
    { anchor: new Date("2026-04-25T12:00:00Z"), planet: "Uranus", toSign: "Gemini", passType: "final" }
  ];
  for (const expected of ingressCases) {
    const week = await ephemeris.getLunarCalendarWeek(location, expected.anchor, { detail: "full" });
    const ingress = week.events.find((event) => (
      event.type === "ingress"
      && event.planet === expected.planet
      && event.toSign === expected.toSign
    ));
    assert.ok(ingress, `Missing ${expected.planet} ingress into ${expected.toSign}`);
    assert.equal(ingress.passType, expected.passType);
    const occursAt = new Date(ingress.startsAt);
    const planetId = expected.planet === "Neptune" ? swe.SE_NEPTUNE : swe.SE_URANUS;
    const before = longitude(swe, planetId, new Date(occursAt.getTime() - 60_000));
    const after = longitude(swe, planetId, new Date(occursAt.getTime() + 60_000));
    assert.notEqual(Math.floor(before / 30), Math.floor(after / 30), `${expected.planet} ingress must cross a direct ephemeris sign boundary`);
    assert.equal(ingress.direction, speed(swe, planetId, occursAt) < 0 ? "retrograde" : "direct");
  }

  const namedCandidates = await ephemeris.getNonServingTimingEventCandidates(
    location,
    new Date("2024-12-01T00:00:00Z"),
    new Date("2027-04-01T00:00:00Z")
  );
  const cazimis = namedCandidates.filter((event) => event.phase === "cazimi");
  assert.ok(cazimis.length >= 8, "Candidate feed should calculate multiple Mercury and Venus cazimis");
  assert.ok(cazimis.some((event) => event.direction === "retrograde"), "Candidate feed needs retrograde cazimis");
  assert.ok(cazimis.some((event) => event.direction === "direct"), "Candidate feed needs direct cazimis");
  for (const event of cazimis) {
    const occursAt = new Date(event.startsAt);
    const planetId = event.planet === "Mercury" ? swe.SE_MERCURY : swe.SE_VENUS;
    assert.ok(sunOrb(swe, planetId, occursAt) < 0.0001, `${event.title} must be an exact conjunction`);
    assert.equal(event.cazimi, true);
    assert.equal(event.nearSun, true);
    assert.equal(event.direction, speed(swe, planetId, occursAt) < 0 ? "retrograde" : "direct");
  }

  const shadows = namedCandidates.filter((event) => event.phase === "pre-shadow" || event.phase === "post-shadow");
  assert.ok(shadows.some((event) => event.planet === "Mercury" && event.phase === "pre-shadow"));
  assert.ok(shadows.some((event) => event.planet === "Mercury" && event.phase === "post-shadow"));
  assert.ok(shadows.some((event) => event.planet === "Venus"), "Candidate feed should calculate Venus shadow phases");
  assert.ok(shadows.some((event) => event.planet === "Mars"), "Candidate feed should calculate Mars shadow phases");
  for (const event of shadows.slice(0, 12)) {
    assert.ok(event.shadowStart && event.shadowEnd && event.retrogradeStart && event.retrogradeEnd);
    assert.ok(new Date(event.shadowStart) < new Date(event.retrogradeStart));
    assert.ok(new Date(event.retrogradeStart) < new Date(event.retrogradeEnd));
    assert.ok(new Date(event.retrogradeEnd) < new Date(event.shadowEnd));
  }

  const marsMidpoints = namedCandidates.filter((event) => event.phase === "sun-opposition");
  assert.ok(marsMidpoints.length >= 2, "Candidate feed should calculate more than one Mars-Sun retrograde midpoint");
  for (const event of marsMidpoints) {
    const occursAt = new Date(event.startsAt);
    assert.ok(Math.abs(separation(swe, swe.SE_MARS, swe.SE_SUN, occursAt) - 180) < 0.0001);
    assert.ok(speed(swe, swe.SE_MARS, occursAt) < 0);
  }

  const exactCazimi = cazimis[0];
  const readerWeekAtCazimi = await ephemeris.getLunarCalendarWeek(location, new Date(exactCazimi.startsAt), { detail: "full" });
  assert.ok(
    !readerWeekAtCazimi.events.some((event) => (
      event.phase === "cazimi"
      || event.phase === "sun-opposition"
      || event.phase === "pre-shadow"
      || event.phase === "post-shadow"
    )),
    "Unapproved timing candidates must remain absent from the reader calendar feed"
  );

  console.log(
    `Timing calculation tests passed: ${mercuryConjunctions.slice(0, 2).map((date) => date.toISOString()).join(", ")}; `
    + `${directChironStations.length} Chiron stations; ${passageDates.length} active-passage dates; `
    + `${ingressCases.length} ingress pass types; ${cazimis.length} cazimis; ${shadows.length} shadow days; ${marsMidpoints.length} Mars midpoints.`
  );
} finally {
  await vite.close();
}
