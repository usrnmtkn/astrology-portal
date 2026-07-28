import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createLogger, createServer } from "vite";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fixture = JSON.parse(
  fs.readFileSync(path.join(repoRoot, "scripts/fixtures/astrology-date-guardrails.json"), "utf8")
);
const webEphemerisSource = fs.readFileSync(path.join(repoRoot, "apps/web/src/services/ephemeris.ts"), "utf8");
const apiChartSource = fs.readFileSync(path.join(repoRoot, "services/tldrastro-api/src/tldrastro_api/services/chart.py"), "utf8");
const appSource = fs.readFileSync(path.join(repoRoot, "apps/web/src/App.tsx"), "utf8");

function isoDate(value) {
  return typeof value === "string" ? value.slice(0, 10) : "";
}

function assertTimestampWithinMinutes(actual, expected, toleranceMinutes, message) {
  const differenceMinutes = Math.abs(new Date(actual).getTime() - new Date(expected).getTime()) / 60_000;
  assert.ok(
    differenceMinutes <= toleranceMinutes,
    `${message}: expected ${expected} ± ${toleranceMinutes} minutes, received ${actual}`
  );
}

function positionFor(sky, planet) {
  const position = sky.positions.find((candidate) => candidate.planet === planet);
  assert.ok(position, `${planet} must be present in the calculated sky.`);
  return position;
}

const logger = createLogger("error");
const viteError = logger.error;
logger.error = (message, options) => {
  const output = String(message);

  if (
    output.includes("WebSocket server error")
    || output.includes("Failed to run dependency scan")
    || output.includes("The server is being restarted or closed")
  ) {
    return;
  }

  viteError(message, options);
};

const vite = await createServer({
  root: path.join(repoRoot, "apps/web"),
  customLogger: logger,
  optimizeDeps: {
    entries: [],
    noDiscovery: true
  },
  server: { middlewareMode: true, hmr: false },
  appType: "custom",
  logLevel: "error"
});

try {
  const ephemeris = await vite.ssrLoadModule("/src/services/ephemeris.ts");
  const display = await vite.ssrLoadModule("/src/services/astrologyDisplay.ts");
  const skyCache = new Map();
  const skyAt = async (isoDateTime) => {
    if (!skyCache.has(isoDateTime)) {
      skyCache.set(
        isoDateTime,
        await ephemeris.getAstrodienstSky(
          ephemeris.defaultLocation,
          new Date(isoDateTime),
          { includeTransitWindows: true }
        )
      );
    }

    return skyCache.get(isoDateTime);
  };

  const coveredFixtureIds = new Set(fixture.sources.flatMap((source) => source.covers));
  const fixtureEvents = [...fixture.nodeWindows, ...fixture.retrogradeWindows];
  const todayUtc = new Date().toISOString().slice(0, 10);
  const latestFixtureDate = fixtureEvents
    .map((event) => event.endUtcDate)
    .sort()
    .at(-1);

  assert.ok(
    todayUtc <= fixture.reviewBy,
    `Astrology date guardrails are due for source review (deadline ${fixture.reviewBy}). Extend the authoritative fixtures before release.`
  );
  assert.ok(
    fixture.coverageEndsAt >= fixture.reviewBy,
    "Guardrail coverage must extend beyond the scheduled source-review date."
  );
  assert.ok(
    fixture.coverageEndsAt >= latestFixtureDate,
    "Declared guardrail coverage must include every curated event."
  );
  assert.ok(
    fixtureEvents.every((event) => coveredFixtureIds.has(event.id)),
    "Every guarded astrology event must cite an authoritative source."
  );
  assert.equal(fixture.policy.nodeType, "true", "Guardrail policy must require the True Node.");
  assert.equal(fixture.policy.readerDateTimeZone, "chart-location", "Reader dates must use the chart location.");
  assert.match(webEphemerisSource, /swe\.SE_TRUE_NODE/u, "Web ephemeris must calculate the True Node.");
  assert.doesNotMatch(webEphemerisSource, /swe\.SE_MEAN_NODE/u, "Web ephemeris must not calculate the Mean Node.");
  assert.match(apiChartSource, /swe\.TRUE_NODE/u, "Python chart service must calculate the True Node.");
  assert.doesNotMatch(apiChartSource, /swe\.MEAN_NODE/u, "Python chart service must not calculate the Mean Node.");
  assert.match(
    appSource,
    /astrologyDateRangeLabel\([\s\S]*position\.transitTimeZone \|\| "UTC"/u,
    "Reader-facing retrograde ranges must pass the chart location timezone."
  );

  for (const expected of fixture.nodeWindows) {
    const sky = await skyAt(expected.sampleAt);
    const northNode = positionFor(sky, "North Node");
    const southNode = positionFor(sky, "South Node");

    assert.equal(sky.calculationProvenance?.nodeType, fixture.policy.nodeType, `${expected.id}: calculation provenance`);
    assert.equal(
      sky.calculationProvenance?.calculationVersion,
      fixture.policy.calculationVersion,
      `${expected.id}: calculation version`
    );
    assert.equal(northNode.sign, expected.northSign, `${expected.id}: North Node sign`);
    assert.equal(southNode.sign, expected.southSign, `${expected.id}: South Node sign`);
    assert.equal(isoDate(northNode.transitStart), expected.startUtcDate, `${expected.id}: UTC ingress start`);
    assert.equal(isoDate(northNode.transitEnd), expected.endUtcDate, `${expected.id}: UTC ingress end`);
    assert.equal(southNode.transitStart, northNode.transitStart, `${expected.id}: node axis starts together`);
    assert.equal(southNode.transitEnd, northNode.transitEnd, `${expected.id}: node axis ends together`);
    assert.notEqual(northNode.retrogradeWindowSource, "sign-transit", `${expected.id}: sign transit is not a retrograde cycle`);
    assert.equal(display.isDisplayRetrograde(northNode), false, `${expected.id}: North Node must not surface as retrograde`);
    assert.equal(display.isDisplayRetrograde(southNode), false, `${expected.id}: South Node must not surface as retrograde`);

    for (const [timeZone, expectedRange] of Object.entries(expected.civilRanges)) {
      const position = { ...northNode, transitTimeZone: timeZone };
      assert.equal(
        display.lunarNodeTransitRangeLabel(position),
        expectedRange,
        `${expected.id}: reader range in ${timeZone}`
      );
    }
  }

  for (const expected of fixture.retrogradeWindows) {
    const sky = await skyAt(expected.sampleAt);
    const position = positionFor(sky, expected.planet);

    assert.ok(position.retrogradeStart && position.retrogradeEnd, `${expected.id}: station window`);
    assert.equal(isoDate(position.retrogradeStart), expected.startUtcDate, `${expected.id}: UTC station start date`);
    assert.equal(isoDate(position.retrogradeEnd), expected.endUtcDate, `${expected.id}: UTC station end date`);
    assert.ok(
      new Date(position.retrogradeStart).getTime() < new Date(position.retrogradeEnd).getTime(),
      `${expected.id}: station window must be chronological`
    );

    if (expected.publishedStartAt) {
      assertTimestampWithinMinutes(
        position.retrogradeStart,
        expected.publishedStartAt,
        expected.toleranceMinutes,
        `${expected.id}: published retrograde station`
      );
      assertTimestampWithinMinutes(
        position.retrogradeEnd,
        expected.publishedEndAt,
        expected.toleranceMinutes,
        `${expected.id}: published direct station`
      );
    }

    for (const [timeZone, expectedRange] of Object.entries(expected.civilRanges)) {
      assert.equal(
        display.astrologyDateRangeLabel(position.retrogradeStart, position.retrogradeEnd, timeZone),
        expectedRange,
        `${expected.id}: reader range in ${timeZone}`
      );
    }
  }

  const planetaryRetrogrades = new Set([
    "Mercury",
    "Venus",
    "Mars",
    "Jupiter",
    "Saturn",
    "Uranus",
    "Neptune",
    "Pluto",
    "Chiron"
  ]);

  for (const year of fixture.monthlySweepYears) {
    for (let month = 1; month <= 12; month += 1) {
      const sampleAt = `${year}-${String(month).padStart(2, "0")}-15T12:00:00Z`;
      const sky = await skyAt(sampleAt);
      const sampleTime = new Date(sampleAt).getTime();

      for (const position of sky.positions) {
        assert.equal(
          position.transitTimeZone,
          sky.location.timeZone,
          `${sampleAt} ${position.planet}: transit timezone`
        );

        if (position.transitStart && position.transitEnd) {
          assert.ok(
            new Date(position.transitStart).getTime() <= sampleTime
            && sampleTime <= new Date(position.transitEnd).getTime(),
            `${sampleAt} ${position.planet}: sign-transit window must contain the sample`
          );
        }

        if (
          planetaryRetrogrades.has(position.planet)
          && display.isDisplayRetrograde(position)
        ) {
          assert.ok(
            position.retrogradeStart && position.retrogradeEnd,
            `${sampleAt} ${position.planet}: visible retrograde must have a station window`
          );
          assert.ok(
            new Date(position.retrogradeStart).getTime() <= sampleTime
            && sampleTime <= new Date(position.retrogradeEnd).getTime(),
            `${sampleAt} ${position.planet}: retrograde station window must contain the sample`
          );
        }
      }
    }
  }

  const representativeSky = await skyAt(fixture.nodeWindows[0].sampleAt);
  assert.ok(
    representativeSky.positions.every((position) => position.transitTimeZone === representativeSky.location.timeZone),
    "Every calculated placement with transit windows must carry the chart location timezone."
  );
  assert.equal(
    display.isDisplayRetrograde({ planet: "Mercury", motion: "retrograde" }),
    true,
    "Planetary retrogrades must remain visible."
  );
  assert.throws(
    () => display.astrologyDateRangeLabel("not-a-date", "2026-10-16T02:39:00Z", "UTC"),
    RangeError,
    "Invalid astronomy timestamps must fail closed."
  );
  assert.throws(
    () => display.astrologyDateRangeLabel("2026-05-06T15:34:00Z", "2026-10-16T02:39:00Z", "Not/A_Time_Zone"),
    RangeError,
    "Invalid IANA timezones must fail closed."
  );
  assert.throws(
    () => display.astrologyDateRangeLabel("2026-10-16T02:39:00Z", "2026-05-06T15:34:00Z", "UTC"),
    RangeError,
    "Reversed astronomy date ranges must fail closed."
  );
} finally {
  await vite.close();
}
