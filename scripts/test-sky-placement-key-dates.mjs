#!/usr/bin/env node

import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
import {
  TRUE_LILITH_KEY_DATES_INTRO,
  skyPlacementKeyDatesIntro as nodeKeyDatesIntro,
  skyPlacementKeyDates as nodeKeyDates
} from "../apps/web/src/content/fallbackArchitectureV3/resolver/renderTransitSynastry.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const vite = await createServer({
  root: path.join(repoRoot, "apps", "web"),
  appType: "custom",
  logLevel: "silent",
  server: { middlewareMode: true }
});

try {
  const ephemeris = await vite.ssrLoadModule("/src/services/ephemeris.ts");
  const browserRenderer = await vite.ssrLoadModule("/src/content/fallbackArchitectureV3/resolver/renderTransitSynastry.browser.ts");
  const app = await vite.ssrLoadModule("/src/App.tsx");
  const fixtures = {
    lilith: await ephemeris.getSkyPlacementTransitFacts({
      planet: "lilith",
      sign: "capricorn",
      referenceDate: new Date("2026-08-09T12:00:00Z"),
      timeZone: "America/New_York"
    }),
    mercury: await ephemeris.getSkyPlacementTransitFacts({
      planet: "mercury",
      sign: "cancer",
      referenceDate: new Date("2026-06-20T12:00:00Z"),
      timeZone: "America/New_York"
    }),
    sun: await ephemeris.getSkyPlacementTransitFacts({
      planet: "sun",
      sign: "leo",
      referenceDate: new Date("2026-07-25T12:00:00Z"),
      timeZone: "America/New_York"
    }),
    venus: await ephemeris.getSkyPlacementTransitFacts({
      planet: "venus",
      sign: "virgo",
      referenceDate: new Date("2026-08-10T12:00:00Z"),
      timeZone: "America/New_York"
    }),
    uranus: await ephemeris.getSkyPlacementTransitFacts({
      planet: "uranus",
      sign: "gemini",
      referenceDate: new Date("2025-08-22T12:00:00Z"),
      timeZone: "America/New_York"
    })
  };

  assert.ok(fixtures.lilith.residencyPasses.length > 1, "Lilith in Capricorn must expose every verified pass.");
  assert.equal(fixtures.lilith.residencyPasses[0].entryDate.slice(0, 4), "2026");
  assert.equal(fixtures.lilith.transitEnd.slice(0, 4), "2027", "Lilith body exitDate must remain the final exit.");
  const currentLilithPass = fixtures.lilith.residencyPasses.find((pass) => (
    new Date("2026-08-09T12:00:00Z") >= new Date(pass.entryDate)
    && new Date("2026-08-09T12:00:00Z") <= new Date(pass.exitDate)
  ));
  assert.equal(currentLilithPass?.entryDate.slice(0, 10), "2026-07-31", "Header pass must be the pass containing the reference date.");
  assert.equal(currentLilithPass?.exitDate.slice(0, 10), "2026-08-17");
  const lilithPosition = {
    planet: "Lilith",
    glyph: "⚸",
    sign: "Capricorn",
    signGlyph: "♑",
    degree: 0,
    house: 1,
    motion: "retrograde",
    transitStart: fixtures.lilith.transitStart,
    transitEnd: fixtures.lilith.transitEnd,
    residencyPasses: fixtures.lilith.residencyPasses
  };
  const headerPass = app.placementTransitEndpoints(lilithPosition, "2026-08-09T12:00:00Z");
  assert.equal(headerPass.start.toISOString().slice(0, 10), "2026-07-31");
  assert.equal(headerPass.end.toISOString().slice(0, 10), "2026-08-17");
  assert.equal(
    app.placementFinalResidencyExit(lilithPosition, headerPass.end).toISOString().slice(0, 10),
    "2027-08-13",
    "Article exitDate must resolve to the final verified exit rather than the header pass exit."
  );

  const keyDateFacts = (facts) => ({
    planet: facts.planet.toLowerCase().replaceAll(" ", "-"),
    sign: facts.sign.toLowerCase().replaceAll(" ", "-"),
    residencyPasses: facts.residencyPasses,
    residencyStations: facts.residencyStations
  });
  for (const facts of Object.values(fixtures)) {
    assert.deepEqual(
      browserRenderer.skyPlacementKeyDates(keyDateFacts(facts)),
      nodeKeyDates(keyDateFacts(facts)),
      `${facts.planet} key-date composition must match in browser and Node renderers.`
    );
  }

  const lilithDates = nodeKeyDates(keyDateFacts(fixtures.lilith));
  assert.equal(lilithDates.filter((entry) => entry.event === "residency-pass").length, fixtures.lilith.residencyPasses.length);
  assert.equal(lilithDates.find((entry) => entry.event === "residency-pass")?.label, `Pass 1 of ${fixtures.lilith.residencyPasses.length}`);
  assert.ok(lilithDates.some((entry) => entry.label === "Lilith stations retrograde in Capricorn"));
  assert.ok(lilithDates.some((entry) => entry.label === "Lilith stations direct in Capricorn"));
  assert.equal(
    TRUE_LILITH_KEY_DATES_INTRO,
    "True Black Moon Lilith stations about once a month, so it crosses the same degrees several times before it finally moves on.",
    "The owner-approved true-Lilith Key dates introduction must remain byte-identical."
  );
  assert.equal(browserRenderer.TRUE_LILITH_KEY_DATES_INTRO, TRUE_LILITH_KEY_DATES_INTRO);
  assert.doesNotMatch(TRUE_LILITH_KEY_DATES_INTRO, /\{\{/u, "The true-Lilith introduction must contain no placeholders.");
  const lilithFacts = keyDateFacts(fixtures.lilith);
  assert.equal(nodeKeyDatesIntro(lilithFacts), TRUE_LILITH_KEY_DATES_INTRO);
  assert.equal(browserRenderer.skyPlacementKeyDatesIntro(lilithFacts), TRUE_LILITH_KEY_DATES_INTRO);

  const mercuryDates = nodeKeyDates(keyDateFacts(fixtures.mercury));
  assert.equal(mercuryDates.filter((entry) => entry.event === "residency-pass").length, 1);
  assert.equal(mercuryDates.find((entry) => entry.event === "residency-pass")?.label, "", "Single-pass ranges have no pass label.");
  assert.ok(mercuryDates.some((entry) => entry.label === "Mercury stations retrograde in Cancer"));
  assert.ok(mercuryDates.some((entry) => entry.label === "Mercury stations direct in Cancer"));
  assert.equal(nodeKeyDatesIntro(keyDateFacts(fixtures.mercury)), null, "The true-Lilith introduction must not render for Mercury.");
  assert.equal(browserRenderer.skyPlacementKeyDatesIntro(keyDateFacts(fixtures.mercury)), null);

  const sunDates = nodeKeyDates(keyDateFacts(fixtures.sun));
  assert.equal(sunDates.length, 1, "Sun placement Key dates must contain only its residency range.");
  assert.equal(sunDates[0].label, "");
  assert.equal(fixtures.sun.residencyStations.length, 0);

  const venusDates = nodeKeyDates(keyDateFacts(fixtures.venus));
  assert.equal(fixtures.venus.residencyStations.length, 0, "The no-station residency fixture must stay station-free.");
  assert.equal(venusDates.length, 1, "A verified no-station residency must not invent a station line.");

  const uranusDates = nodeKeyDates(keyDateFacts(fixtures.uranus));
  assert.ok(uranusDates.some((entry) => entry.label === "Uranus stations retrograde in Gemini"));
  assert.ok(uranusDates.some((entry) => entry.label === "Uranus stations direct in Gemini"));

  const partial = nodeKeyDates({
    planet: "mercury",
    sign: "cancer",
    residencyPasses: [fixtures.mercury.residencyPasses[0], { entryDate: "invalid", exitDate: "invalid" }],
    residencyStations: [
      ...fixtures.mercury.residencyStations,
      { occursAt: "2030-01-01T00:00:00.000Z", direction: "direct" }
    ]
  });
  assert.equal(partial.filter((entry) => entry.event === "residency-pass").length, 1, "Invalid passes must fail closed without hiding verified passes.");
  assert.ok(!partial.some((entry) => entry.date.startsWith("2030")), "Stations outside verified passes must not render.");

  const missingSign = nodeKeyDates({
    planet: "mercury",
    sign: "",
    residencyPasses: fixtures.mercury.residencyPasses,
    residencyStations: fixtures.mercury.residencyStations
  });
  assert.ok(
    !missingSign.some((entry) => entry.event?.startsWith("station-")),
    "A station without an engine-supplied placement sign must fail closed instead of rendering an incomplete label."
  );

  console.log("Sky placement Key dates regression passed: station signs, all-pass, single-pass, no-station, parity, and fail-closed fixtures are clean.");
} finally {
  await vite.close();
}
