#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = path.join(
  repoRoot,
  "apps/web/src/content/fallbackArchitectureV3/source-rows/station-cards-week-openers-v1.json"
);
const rows = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
const vite = await createServer({
  configFile: false,
  root: path.join(repoRoot, "apps/web"),
  appType: "custom",
  server: { middlewareMode: true, hmr: false },
  logLevel: "error"
});

try {
  const fallbackRuntime = await vite.ssrLoadModule("/src/content/fallbackArchitectureV3Runtime.ts");
  await fallbackRuntime.loadDeferredFallbackArchitectureV3Bundle();
  const weekly = await vite.ssrLoadModule("/src/services/weeklyHoroscope.ts");

  assert.deepEqual(weekly.weeklyContentImportCounts, {
    total: rows.length,
    station: rows.filter((row) => row.surface === "weekly-station").length,
    openers: rows.filter((row) => row.surface === "weekly-opener").length,
    readerEligible: rows.length,
    needsReview: 0
  });
  assert.equal(rows.length, 24);
  assert.equal(rows.filter((row) => row.surface === "weekly-station").length, 18);
  assert.equal(rows.filter((row) => row.surface === "weekly-opener").length, 6);
  assert.ok(rows.every((row) => row.review_status === "approved"));
  assert.ok(rows.every((row) => !/SOURCE_GAP/u.test(`${row.headline}\n${row.body}`)));

  const sundayBefore = weekly.weeklyWindowFor(new Date("2026-08-02T23:59:00Z"), "America/New_York");
  const sundayAfter = weekly.weeklyWindowFor(new Date("2026-08-03T00:00:00Z"), "America/New_York");
  assert.equal(sundayBefore.weekStart, "2026-07-27");
  assert.equal(sundayBefore.weekEnd, "2026-08-02");
  assert.equal(sundayAfter.weekStart, "2026-08-03");
  assert.equal(sundayAfter.weekEnd, "2026-08-09");

  const stationEvent = {
    id: "station-mercury-retrograde-test",
    type: "station",
    title: "Mercury stations retrograde",
    startsAt: "2026-08-01T12:00:00.000Z",
    dateKey: "2026-08-01",
    glyph: "☿",
    primary: true,
    planet: "Mercury",
    sign: "Leo",
    direction: "retrograde"
  };
  const gatedRows = rows.map((row) => (
    row.contentKey === "authored/station/mercury/rx"
      ? { ...row, review_status: "needs_review" }
      : row
  ));
  const gatedStation = weekly.resolveWeeklyStationCopy(stationEvent, gatedRows);
  const approvedStation = weekly.resolveWeeklyStationCopy(stationEvent, rows);
  assert.notEqual(gatedStation.body, rows[0].body, "Needs-review station copy must stay out of reader view.");
  assert.equal(approvedStation.body, rows[0].body, "Approval must switch station copy without a code change.");

  const personalizedChironStation = weekly.resolveWeeklyStationCopy({
    ...stationEvent,
    id: "station-chiron-retrograde-test",
    title: "Chiron stations retrograde",
    planet: "Chiron",
    sign: "Taurus"
  }, rows, "Gemini", {
    planet: "Chiron",
    glyph: "⚷",
    sign: "Taurus",
    signGlyph: "♉",
    degree: 0,
    house: 12,
    motion: "retrograde",
    transitStart: "2026-06-19T08:00:00.000Z",
    transitEnd: "2026-09-17T12:00:00.000Z"
  }, "America/New_York");
  assert.equal(
    personalizedChironStation.headline,
    "Chiron stations retrograde in your 12th house"
  );
  assert.equal(
    personalizedChironStation.driverLabel,
    "Chiron stations retrograde in your 12th house"
  );
  assert.match(
    personalizedChironStation.body,
    /Chiron in your 12th house brings quiet grief, old anxieties, and unspoken losses back to the surface/u
  );
  assert.equal(
    personalizedChironStation.timing,
    "June 19, 2026 – September 17, 2026"
  );

  const lunationEvent = {
    id: "new-moon-test",
    type: "lunation",
    title: "New Moon",
    startsAt: "2026-08-04T12:00:00.000Z",
    dateKey: "2026-08-04",
    glyph: "●",
    primary: true,
    sign: "Leo"
  };
  const gatedOpeners = rows.map((row) => (
    row.contentKey === "authored/week-opener/new-moon"
      ? { ...row, review_status: "needs_review" }
      : row
  ));
  assert.equal(weekly.resolveWeeklyOpener("lunation", [lunationEvent], gatedOpeners), undefined);
  const opener = weekly.resolveWeeklyOpener("lunation", [lunationEvent], rows);
  assert.ok(opener);
  assert.match(opener.body, /Leo/u);
  assert.doesNotMatch(opener.body, /\{\{/u);

  const youPage = fs.readFileSync(path.join(repoRoot, "apps/web/src/features/you/YouPage.tsx"), "utf8");
  const app = fs.readFileSync(path.join(repoRoot, "apps/web/src/App.tsx"), "utf8");
  const weeklySource = fs.readFileSync(
    path.join(repoRoot, "apps/web/src/services/weeklyHoroscope.ts"),
    "utf8"
  );
  assert.doesNotMatch(youPage, /id="you-timing-view"/u);
  assert.doesNotMatch(youPage, /ariaLabel="Transit timing"/u);
  assert.match(youPage, /weekly-horoscope--embedded/u);
  assert.match(youPage, /aria-label="This week&#39;s transits"|aria-label="This week's transits"/u);
  assert.doesNotMatch(youPage, /weeklyHoroscopeAssembly\.cards\.map/u);
  assert.doesNotMatch(youPage, /weeklyHoroscopeAssembly\.sections\.map/u);
  assert.doesNotMatch(youPage, /weekly-horoscope__background/u);
  assert.match(youPage, /weekly-horoscope__macro daily-horoscope-summary/u);
  assert.match(youPage, /weekly-horoscope__transits/u);
  assert.match(youPage, /\{weeklyTransitRows\}/u);
  assert.doesNotMatch(youPage, /weekly-horoscope__header/u);
  assert.doesNotMatch(youPage, /weekly-horoscope__chip/u);
  assert.doesNotMatch(youPage, /weekly-horoscope__reading/u);
  assert.doesNotMatch(youPage, /weekly-horoscope__aspect/u);
  assert.match(youPage, />The macro view</u);
  assert.doesNotMatch(youPage, />Aspect</u);
  assert.doesNotMatch(youPage, />Your horoscope</u);
  assert.doesNotMatch(youPage, />Current house pass</u);
  assert.match(app, /weeklyTransitRows/u);
  assert.match(app, /weeklyTransitDisplayTitle/u);
  assert.match(app, /activeTransitAspectIdentities/u);
  assert.match(app, /buildWeeklyHoroscope\(\{/u);
  assert.doesNotMatch(app, /weeklyHoroscopeRequested/u);
  assert.match(weeklySource, /getLunarCalendarRangeEvents/u);
  assert.match(weeklySource, /weeklyEphemerisCache/u);
  assert.doesNotMatch(
    weeklySource,
    /getLunarCalendarMonth/u,
    "Weekly assembly must not calculate the 42-day visual calendar."
  );
  assert.match(
    weeklySource,
    /stationEventPositions[\s\S]*includeTransitWindows/u,
    "Exact station cards need the active house-pass window for the shared transit-card timing row."
  );
  assert.match(
    weeklySource,
    /aquarius:\s*"saturn"/u,
    "Aquarius lunations must use Saturn as the default ruler."
  );
  assert.match(
    weeklySource,
    /scorpio:\s*"mars"/u,
    "Scorpio lunations must use Mars as the default ruler."
  );
  assert.match(
    weeklySource,
    /pisces:\s*"jupiter"/u,
    "Pisces lunations must use Jupiter as the default ruler."
  );
  assert.doesNotMatch(
    weeklySource,
    /(?:aquarius:\s*"uranus"|scorpio:\s*"pluto"|pisces:\s*"neptune")/u,
    "Modern planets must never enter the default lunation ruler canon."
  );

  const ephemeris = await vite.ssrLoadModule("/src/services/ephemeris.ts");
  const location = {
    label: "New York City, NY",
    latitude: 40.7128,
    longitude: -74.006,
    timeZone: "America/New_York"
  };
  const jul29Events = await ephemeris.getLunarCalendarRangeEvents(
    location,
    new Date("2026-07-29T00:00:00Z"),
    new Date("2026-07-30T00:00:00Z")
  );
  const aquariusFullMoonEvent = jul29Events.find((event) => (
    event.type === "lunation"
    && event.title.includes("Full Moon")
    && event.sign === "Aquarius"
  ));
  assert.ok(aquariusFullMoonEvent, "The Jul 29 Aquarius Full Moon event must resolve.");
  const eventSky = await ephemeris.getAstrodienstSky(
    location,
    new Date(aquariusFullMoonEvent.startsAt)
  );
  const eventPosition = (planet) => eventSky.positions.find(
    (position) => position.planet.toLowerCase() === planet
  );
  const eventSun = eventPosition("sun");
  const eventJupiter = eventPosition("jupiter");
  const eventSaturn = eventPosition("saturn");
  const eventUranus = eventPosition("uranus");
  assert.equal(eventSaturn?.sign, "Aries");
  assert.equal(eventSaturn?.motion, "retrograde");
  assert.equal(eventUranus?.sign, "Gemini");
  assert.equal(eventJupiter?.sign, "Leo");
  assert.equal(eventSun?.sign, "Leo");
  assert.ok(
    typeof eventSun?.longitude === "number"
    && typeof eventJupiter?.longitude === "number"
    && Math.min(
      Math.abs(eventSun.longitude - eventJupiter.longitude),
      360 - Math.abs(eventSun.longitude - eventJupiter.longitude)
    ) <= 3,
    "The event-time sky must preserve the Sun-Jupiter conjunction in Leo."
  );
  const geminiBlendFacts = weekly.lunationBlendFacts(
    eventSky,
    "Aquarius",
    "gemini",
    "full-moon"
  );
  assert.equal(geminiBlendFacts.ruler, "saturn");
  assert.equal(geminiBlendFacts.rulerHouse, 11);
  assert.equal(geminiBlendFacts.rulerRetrograde, true);
  assert.equal(geminiBlendFacts.uranusHouse, 1);
  assert.doesNotThrow(() => weekly.assertLunationBodyMatchesEventSky(
    "Saturn is currently retrograde in Aries, Uranus is in Gemini, and Jupiter conjunct the Sun in Leo.",
    eventSky
  ));
  assert.throws(
    () => weekly.assertLunationBodyMatchesEventSky("Saturn Rx in Pisces.", eventSky),
    /SOURCE_GAP: stale-sky lunation claim/u
  );

  const natalSky = await ephemeris.getAstrodienstSky(location, new Date("1990-01-01T12:00:00Z"));
  const realWeek = await weekly.buildWeeklyHoroscope({
    userId: "weekly-acceptance-fixture",
    natalSky,
    risingSign: "gemini",
    location,
    now: new Date("2026-07-29T12:00:00Z")
  });
  assert.equal(realWeek.weekStart, "2026-07-27");
  assert.equal(realWeek.weekEnd, "2026-08-02");
  assert.equal(realWeek.weekType, "lunation");
  assert.equal(realWeek.macro?.headline, "The Macro View: What the Aquarius Full Moon Represents");
  assert.match(realWeek.macro?.body ?? "", /^Full Moons bring what has been building/u);
  assert.ok(realWeek.horoscope.headline.trim().length > 0);
  assert.notEqual(realWeek.horoscope.headline, "Full Moon week");
  assert.match(realWeek.horoscope.driverLabel, /Full Moon in Aquarius/u);
  assert.ok(realWeek.horoscope.body.trim().length > 0);
  assert.equal(realWeek.horoscope.sourceUnits.length, 1);
  assert.match(realWeek.horoscope.body, /9th house/u);
  assert.match(realWeek.horoscope.body, /3rd house/u);
  assert.match(
    realWeek.horoscope.body,
    /Saturn rules this Full Moon from your 11th house, so friends, organizations, professional contacts, and shared commitments are part of the answer\./u
  );
  assert.match(
    realWeek.horoscope.body,
    /Because Saturn is retrograde, this is less about taking on something new and more an inspection of what already exists:/u
  );
  assert.match(
    realWeek.horoscope.body,
    /Uranus in your 1st house adds a more personal element of change/u
  );
  assert.match(
    realWeek.horoscope.body,
    /An Aquarius Full Moon shows you how the arrangement actually works/u
  );
  assert.match(
    realWeek.horoscope.body,
    /This week, the missing information arrives, someone gives their answer, or the practical cost of the plan becomes harder to ignore\./u
  );
  assert.doesNotMatch(
    realWeek.horoscope.body,
    /\b(?:It can show up|That might look|Let go of|Your higher path|Set your intention)\b/u,
    "The retired per-rising closer stack must not render in the weekly centerpiece."
  );
  assert.ok(Array.isArray(realWeek.aspects));
  const readerText = [
    realWeek.horoscope.headline,
    realWeek.horoscope.driverLabel,
    realWeek.horoscope.body
  ].join("\n");
  assert.doesNotMatch(readerText, /SOURCE_GAP/u);
  assert.doesNotMatch(readerText, /\btoday\b/iu, "Weekly copy must not read like a daily horoscope.");
  assert.ok(
    realWeek.horoscope.sourceUnits.every((unit) => !unit.startsWith("station:retrograde-")),
    "An ongoing retrograde passage must not be treated as a station-day override."
  );
  assert.doesNotMatch(readerText, /remains retrograde/u);
  assert.doesNotThrow(
    () => weekly.assertLunationBodyMatchesEventSky(realWeek.horoscope.body, eventSky),
    "Every explicit planet-sign claim in the per-rising lunation must match the event-time ephemeris."
  );
  assert.doesNotMatch(
    readerText,
    /\b(?:Saturn(?: Rx)? in Pisces|Uranus in Taurus|Jupiter in Cancer)\b/u,
    "Retired sky positions must never leak into the Jul 29 per-rising card."
  );

  const quarterMoonWeek = await weekly.buildWeeklyHoroscope({
    userId: "weekly-quarter-moon-fixture",
    natalSky,
    risingSign: "gemini",
    location,
    now: new Date("2026-08-03T16:00:00Z")
  });
  assert.equal(quarterMoonWeek.weekStart, "2026-08-03");
  assert.equal(quarterMoonWeek.weekEnd, "2026-08-09");
  assert.notEqual(
    quarterMoonWeek.weekType,
    "lunation",
    "A quarter Moon must not classify the personal write-up as a New/Full Moon week."
  );
  assert.equal(
    quarterMoonWeek.macro,
    undefined,
    "A quarter Moon must not select a Full Moon macro article."
  );
  assert.doesNotMatch(
    [
      quarterMoonWeek.horoscope.headline,
      quarterMoonWeek.horoscope.driverLabel,
      quarterMoonWeek.horoscope.body
    ].join("\n"),
    /Taurus Full Moon|Full Moon in Taurus/iu,
    "The Aug 3-9 write-up must not relabel the Last Quarter Moon in Taurus as a Full Moon."
  );
  assert.match(
    quarterMoonWeek.horoscope.headline,
    /Chiron stations retrograde in your 12th house/u,
    "The station headline must name the house calculated from the event sign and rising sign."
  );
  assert.match(
    quarterMoonWeek.horoscope.body,
    /Chiron in your 12th house brings quiet grief/u,
    "The station write-up must include the approved personalized transit-house layer."
  );
  assert.match(
    quarterMoonWeek.horoscope.timing ?? "",
    /^[A-Z][a-z]+ \d{1,2}, 2026 – [A-Z][a-z]+ \d{1,2}, 2026$/u,
    "The station write-up must expose its current computed house-pass window."
  );
  const mondaySky = await ephemeris.getAstrodienstSky(
    location,
    new Date("2026-07-27T16:00:00Z")
  );
  const mondaySaturn = mondaySky.positions.find((position) => position.planet === "Saturn");
  assert.ok(mondaySaturn && typeof mondaySaturn.longitude === "number");
  const forcedSaturnVenusNatal = {
    ...natalSky,
    positions: natalSky.positions.map((position) => (
      position.planet === "Venus"
        ? { ...position, longitude: (mondaySaturn.longitude + 90) % 360 }
        : position
    ))
  };
  const separatedAspectWeek = await weekly.buildWeeklyHoroscope({
    userId: "weekly-separated-aspect-fixture",
    natalSky: forcedSaturnVenusNatal,
    risingSign: "gemini",
    location,
    now: new Date("2026-07-29T12:00:00Z")
  });
  const saturnVenusAspect = separatedAspectWeek.aspects.find((aspect) => (
    /Saturn square your Venus/iu.test(aspect.driverLabel)
  ));
  assert.ok(saturnVenusAspect, "The supporting Saturn-Venus aspect must remain available.");
  assert.doesNotMatch(
    separatedAspectWeek.horoscope.body,
    /You may feel lonely even next to people who love you/u,
    "Aspect copy must not be appended to the lunation horoscope."
  );
  assert.match(
    saturnVenusAspect.body,
    /You may feel lonely even next to people who love you/u,
    "Aspect copy must render in its own standalone card."
  );

  console.log("weekly horoscope assembly checks passed: event-time ruler condition, stale-sky guard, macro, and standalone aspect cards");
} finally {
  await vite.close();
}
