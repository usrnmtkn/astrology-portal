import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createLogger, createServer } from "vite";
import SwissEph from "swisseph-wasm";

// Lilith calculation migration test (owner decision 2026-08-09):
// the app must use TRUE (osculating) Black Moon Lilith, SE id 13, not the
// mean apogee, SE id 12. Anchors below are dates where the two calculations
// disagree on sign or motion, so a silent regression to mean cannot pass.

const SIGNS = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
];
const signFor = (lon) => SIGNS[Math.floor((((lon % 360) + 360) % 360) / 30)];

// 1. Raw ephemeris guard: mean and true genuinely differ at the anchor date.
const swe = new SwissEph();
await swe.initSwissEph();
const SE_MEAN_APOG = 12;
const SE_OSCU_APOG = 13;
const flags = swe.SEFLG_SWIEPH | swe.SEFLG_SPEED;

const anchorJd = swe.julday(2026, 3, 27, 0);
const meanAtAnchor = swe.calc_ut(anchorJd, SE_MEAN_APOG, flags);
const trueAtAnchor = swe.calc_ut(anchorJd, SE_OSCU_APOG, flags);
assert.equal(signFor(meanAtAnchor[0]), "Sagittarius", "Anchor check: mean Lilith should be in Sagittarius on 2026-03-27.");
assert.equal(signFor(trueAtAnchor[0]), "Scorpio", "Anchor check: true Lilith should be in Scorpio on 2026-03-27.");

const retroJd = swe.julday(2026, 8, 20, 0);
const meanAtRetro = swe.calc_ut(retroJd, SE_MEAN_APOG, flags);
const trueAtRetro = swe.calc_ut(retroJd, SE_OSCU_APOG, flags);
assert.ok(meanAtRetro[3] > 0, "Anchor check: mean Lilith never retrogrades.");
assert.ok(trueAtRetro[3] < 0, "Anchor check: true Lilith should be retrograde on 2026-08-20.");

// 2. App contract: the ephemeris service must return the TRUE values.
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// The Python API is the shared source for natal, synastry, and transit
// surfaces. Exercise each response shape at the sign-divergence anchor.
const apiSrc = path.join(repoRoot, "services/tldrastro-api/src");
const python = [process.env.PYTHON_BIN, "/Applications/Xcode.app/Contents/Developer/usr/bin/python3", "python3", "python"]
  .filter((candidate) => candidate && (!candidate.startsWith("/") || fs.existsSync(candidate)))[0];
assert.ok(python, "A Python executable is required for the all-surface Lilith regression.");
const apiProbe = `
import json
import sys
from tldrastro_api.models import ChartSubject, NatalChartRequest, SynastryRequest, TransitChartRequest
from tldrastro_api.services.natal import calculate_natal_chart
from tldrastro_api.services.synastry import calculate_synastry
from tldrastro_api.services.transits import calculate_transits

payload = json.load(sys.stdin)
subject = ChartSubject(**payload["subject"])
other = ChartSubject(**payload["other"])
natal = calculate_natal_chart(NatalChartRequest(subject=subject, includeContentFacts=False))
synastry = calculate_synastry(SynastryRequest(personA=subject, personB=other, settings=subject.settings, includeContentFacts=False))
transits = calculate_transits(TransitChartRequest(
    natalSubject=other,
    transitDatetime=subject.datetime,
    transitLocation=subject.location,
    settings=subject.settings,
    includeContentFacts=False,
))
def lilith(positions):
    return next(position for position in positions if position.point == "Lilith")
print(json.dumps({
    "natal": lilith(natal.positions).model_dump(),
    "synastry": lilith(synastry.personA.positions).model_dump(),
    "transit": lilith(transits.transitChart.positions).model_dump(),
}))
`;
const location = {
  label: "New York, NY",
  latitude: 40.7128,
  longitude: -74.006,
  timeZone: "America/New_York"
};
const settings = { houseSystem: "whole_sign", zodiac: "tropical", aspectProfile: "standard" };
const apiResult = spawnSync(python, ["-c", apiProbe], {
  input: JSON.stringify({
    subject: {
      name: "True Lilith anchor",
      datetime: { date: "2026-03-27", utc: "2026-03-27T00:00:00.000Z", timeKnown: true, timeZone: "America/New_York" },
      location,
      settings
    },
    other: {
      name: "Comparison",
      datetime: { date: "1990-04-12", utc: "1990-04-12T14:30:00.000Z", timeKnown: true, timeZone: "America/New_York" },
      location,
      settings
    }
  }),
  encoding: "utf8",
  env: { ...process.env, PYTHONPATH: process.env.PYTHONPATH ? `${apiSrc}:${process.env.PYTHONPATH}` : apiSrc },
  maxBuffer: 10 * 1024 * 1024
});
assert.equal(apiResult.status, 0, apiResult.stderr || apiResult.stdout);
const apiSurfaces = JSON.parse(apiResult.stdout);
for (const [surface, placement] of Object.entries(apiSurfaces)) {
  assert.equal(placement.sign, "Scorpio", `${surface} must render true Lilith in Scorpio at the divergence anchor.`);
}
const pythonChartSource = fs.readFileSync(path.join(apiSrc, "tldrastro_api/services/chart.py"), "utf8");
const webEphemerisSource = fs.readFileSync(path.join(repoRoot, "apps/web/src/services/ephemeris.ts"), "utf8");
assert.doesNotMatch(pythonChartSource, /swe\.MEAN_APOG/, "No Python mean-Lilith calculation path may remain reachable.");
assert.doesNotMatch(webEphemerisSource, /const\s+SE_MEAN_BLACK_MOON_LILITH/, "No web mean-Lilith calculation constant may remain reachable.");
assert.match(webEphemerisSource, /const\s+SE_TRUE_BLACK_MOON_LILITH\s*=\s*13/);

const logger = createLogger("error");
const viteError = logger.error;
logger.error = (message, options) => {
  const text = String(message);
  if (
    text.includes("WebSocket server error")
    || text.includes("Failed to run dependency scan")
    || text.includes("The server is being restarted or closed")
  ) {
    return;
  }
  viteError(message, options);
};

const vite = await createServer({
  root: path.join(repoRoot, "apps/web"),
  customLogger: logger,
  server: { middlewareMode: true, hmr: false },
  optimizeDeps: { entries: [], noDiscovery: true },
  appType: "custom",
  logLevel: "error"
});

try {
  const ephemeris = await vite.ssrLoadModule("/src/services/ephemeris.ts");

  const signBoundarySky = await ephemeris.getAstrodienstSky(
    ephemeris.defaultLocation,
    new Date("2026-03-27T00:00:00Z")
  );
  const lilithAtBoundary = signBoundarySky.positions.find((position) => position.planet === "Lilith");
  assert.ok(lilithAtBoundary, "Sky API must include Lilith.");
  assert.equal(
    lilithAtBoundary.sign,
    "Scorpio",
    "Lilith must use the TRUE apogee (Scorpio on 2026-03-27); Sagittarius means the mean apogee leaked back in."
  );

  const retroSky = await ephemeris.getAstrodienstSky(
    ephemeris.defaultLocation,
    new Date("2026-08-20T00:00:00Z")
  );
  const lilithRetro = retroSky.positions.find((position) => position.planet === "Lilith");
  assert.equal(
    lilithRetro?.motion,
    "retrograde",
    "True Lilith should report retrograde motion on 2026-08-20; mean Lilith is always direct."
  );

  const provenance = signBoundarySky.calculationProvenance;
  assert.equal(provenance?.lilithType, "true", "Provenance must disclose true Black Moon Lilith.");
  assert.equal(provenance?.actualEphemeris, "swiss", "Runtime provenance must record the ephemeris actually returned.");
  assert.deepEqual(
    provenance?.returnedEphemerisFlags,
    [swe.SEFLG_SWIEPH | swe.SEFLG_SPEED],
    "Runtime provenance must record the validated Swiss return flags."
  );
  assert.ok(provenance?.ephemerisFiles.includes("swisseph.data"), "Provenance must name the loaded Swiss data pack.");
  assert.ok(provenance?.ephemerisFiles.includes("semo_18.se1"), "Provenance must name the lunar ephemeris inside the data pack.");
  assert.equal(
    provenance?.calculationVersion,
    "tldrastro-calculation-v3",
    "Calculation contract must be v3 so cached mean-Lilith (v2) placements are never reused."
  );
  assert.doesNotThrow(() => ephemeris.validateSwissEphemerisReturnFlag(
    swe.SEFLG_SWIEPH | swe.SEFLG_SPEED,
    swe.SEFLG_SWIEPH,
    swe.SEFLG_MOSEPH
  ));
  assert.throws(
    () => ephemeris.validateSwissEphemerisReturnFlag(
      swe.SEFLG_MOSEPH | swe.SEFLG_SPEED,
      swe.SEFLG_SWIEPH,
      swe.SEFLG_MOSEPH,
      "Swiss file unavailable; Moshier fallback selected."
    ),
    /Swiss Ephemeris provenance mismatch.*Moshier fallback selected/u,
    "A Moshier return flag must fail closed instead of being labeled Swiss."
  );

  // 3. Calendar contract: true Lilith's monthly change of direction is a
  // dated station event, not an undated placement attribute.
  const stationEvents = await ephemeris.getLunarCalendarRangeEvents(
    ephemeris.defaultLocation,
    new Date("2026-08-01T00:00:00Z"),
    new Date("2026-08-10T00:00:00Z")
  );
  const lilithStation = stationEvents.find((event) => (
    event.type === "station"
    && event.planet === "Lilith"
    && event.direction === "retrograde"
  ));
  assert.ok(lilithStation, "True Lilith's August 2026 retrograde station must render as a dated event.");
  assert.match(lilithStation.startsAt, /^2026-08-06T/);
  assert.equal(lilithStation.dateKey, "2026-08-06");

  // 4. Placement contract: a residency spans its true-apogee re-entry passes,
  // and exitDate is the final exit rather than the current pass boundary.
  const capricornResidency = await ephemeris.getSkyPlacementTransitFacts({
    planet: "lilith",
    sign: "capricorn",
    referenceDate: new Date("2026-08-09T00:00:00Z"),
    timeZone: "UTC"
  });
  assert.equal(capricornResidency.lilithType, "true");
  assert.ok(capricornResidency.residencyPasses.length > 2, "True Lilith must expose its multi-pass sign residency.");
  assert.equal(
    capricornResidency.transitEnd,
    capricornResidency.residencyPasses.at(-1).exitDate,
    "Lilith placement exitDate must be the final exit of the current residency."
  );
  assert.ok(
    new Date(capricornResidency.transitEnd) > new Date(capricornResidency.residencyPasses[0].exitDate),
    "Final residency exit must extend beyond the first contiguous pass."
  );
} finally {
  await vite.close();
}

console.log("Lilith true-apogee migration contract passed (all surfaces, dated station, multi-pass residency, provenance v3)");
