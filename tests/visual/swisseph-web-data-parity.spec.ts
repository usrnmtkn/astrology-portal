import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";
import SwissEph from "swisseph-wasm";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const manifest = JSON.parse(
  fs.readFileSync(path.join(repoRoot, "apps/web/dist/.vite/manifest.json"), "utf8")
) as Record<string, { file: string }>;
const ephemerisChunk = manifest["src/services/ephemeris.ts"]?.file;
const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:4173";
const location = {
  label: "Portsmouth, NH",
  latitude: 43.0718,
  longitude: -70.7626,
  timeZone: "America/New_York"
};
const signs = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
];
const pointIds = [
  ["Sun", 0],
  ["Moon", 1],
  ["Mercury", 2],
  ["Venus", 3],
  ["Mars", 4],
  ["Jupiter", 5],
  ["Saturn", 6],
  ["Uranus", 7],
  ["Neptune", 8],
  ["Pluto", 9],
  ["Chiron", 15],
  ["Lilith", 13],
  ["North Node", 11]
] as const;

function normalizeDegrees(value: number) {
  return ((value % 360) + 360) % 360;
}

function utcHour(date: Date) {
  return date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3_600;
}

test("trimmed browser Swiss Ephemeris data matches the full package across dates", async ({ page }) => {
  test.setTimeout(45_000);
  expect(ephemerisChunk, "The production manifest must expose the deferred ephemeris chunk.").toBeTruthy();

  const fullSwiss = new SwissEph();
  await fullSwiss.initSwissEph();

  for (const isoDate of ["1979-02-18T13:24:00.000Z", "2026-08-09T16:00:00.000Z"]) {
    const date = new Date(isoDate);
    const julianDay = fullSwiss.julday(
      date.getUTCFullYear(),
      date.getUTCMonth() + 1,
      date.getUTCDate(),
      utcHour(date)
    );
    const flags = fullSwiss.SEFLG_SWIEPH | fullSwiss.SEFLG_SPEED;
    const expected = pointIds.map(([planet, id]) => {
      const result = fullSwiss.calc_ut(julianDay, id, flags);
      const longitude = normalizeDegrees(result[0]);

      return {
        planet,
        longitude,
        sign: signs[Math.floor(longitude / 30)],
        motion: result[3] < -0.0001 ? "retrograde" : "direct"
      };
    });
    const expectedAscendant = normalizeDegrees(
      fullSwiss.houses(julianDay, location.latitude, location.longitude, "W").ascmc[0]
    );

    await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
    const calculated = await page.evaluate(async ({ chunk, isoDate: requestedDate, location: requestedLocation }) => {
      const ephemeris = await import(`/${chunk}`);
      return ephemeris.getAstrodienstSky(requestedLocation, new Date(requestedDate));
    }, { chunk: ephemerisChunk, isoDate, location });

    expect(calculated.ascendantLongitude).toBeCloseTo(expectedAscendant, 3);
    for (const expectedPosition of expected) {
      const actual = calculated.positions.find(
        (position: { planet: string }) => position.planet === expectedPosition.planet
      );
      expect(actual, `${expectedPosition.planet} must be present for ${isoDate}.`).toBeTruthy();
      expect(actual.longitude).toBeCloseTo(expectedPosition.longitude, 3);
      expect(actual.sign).toBe(expectedPosition.sign);
      expect(actual.motion).toBe(expectedPosition.motion);
    }
  }
});
