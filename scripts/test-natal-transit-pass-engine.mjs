import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createLogger, createServer } from "vite";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const logger = createLogger("error");
const viteError = logger.error;
logger.error = (message, options) => {
  if (String(message).includes("WebSocket server error")) return;
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
  const geometry = await vite.ssrLoadModule("/src/services/natalTransitGeometry.ts");
  const ephemeris = await vite.ssrLoadModule("/src/services/ephemeris.ts");
  const contentKeys = await vite.ssrLoadModule("/src/services/generatedContentKeys.ts");
  const transitReturns = await vite.ssrLoadModule("/src/services/transitReturns.ts");
  const { rankTransits } = await import("@tldr/astro-knowledge/timing-engine");

  assert.deepEqual(
    geometry.natalTransitGeometry(12, 10, 0, -0.1),
    { direction: "applying", exactOffsetDays: 20, residualDegrees: 2 },
    "A retrograde body moving back toward the natal degree must be applying."
  );
  assert.equal(geometry.natalTransitGeometry(12, 10, 0, 0.1).direction, "separating");

  for (const body of ["sun", "mercury", "venus", "mars", "jupiter", "saturn", "chiron", "uranus", "north-node"]) {
    assert.equal(transitReturns.isEligibleTransitReturn(body, body, "conjunction"), true);
  }
  assert.equal(
    transitReturns.isEligibleTransitReturn("neptune", "neptune", "conjunction"),
    false,
    "A Neptune self-conjunction must not enter the return row or SOURCE_GAP lookup path."
  );
  assert.equal(transitReturns.isEligibleTransitReturn("pluto", "pluto", "conjunction"), false);

  const movingWindow = geometry.natalTransitWindowDays({
    planet: "Saturn",
    remainingOrb: 1,
    signedSpeed: 0.05,
    fallbackSpeed: 0.033
  });
  const stationWindow = geometry.natalTransitWindowDays({
    planet: "Saturn",
    remainingOrb: 1,
    signedSpeed: 0.001,
    fallbackSpeed: 0.033
  });
  assert.equal(stationWindow.stationary, true);
  assert.ok(stationWindow.days > movingWindow.days);
  assert.ok(stationWindow.days <= 420);
  assert.equal(
    contentKeys.transitToNatalAspectInstanceContentKey("Saturn", "conjunction", "Saturn", { pass: 2 }),
    "transit.aspect.saturn.conjunction.saturn.pass_2"
  );

  for (const resolverPath of [
    "apps/web/src/content/fallbackArchitectureV3/resolver/renderTransitSynastry.browser.ts",
    "apps/web/src/content/fallbackArchitectureV3/resolver/renderTransitSynastry.mjs"
  ]) {
    const resolver = fs.readFileSync(path.join(repoRoot, resolverPath), "utf8");
    assert.match(resolver, /authored\/transit-aspect\/\$\{a\}\/\$\{b\}\/\$\{aspect\}\/pass-\$\{pass\}/u);
    assert.match(resolver, /fallback-hook\/transit-pass\/\$\{pass\}/u);
  }

  const ranked = rankTransits([
    { index: 0, transitingPlanet: "Saturn", natalTarget: "Saturn", aspect: "conjunction", orbDegrees: 0.5 },
    { index: 1, transitingPlanet: "Saturn", natalTarget: "Saturn", aspect: "conjunction", orbDegrees: 0.5, isStationary: true }
  ]);
  assert.equal(ranked[0].index, 1, "Station-on-natal must outrank the otherwise identical transit.");

  const expectedPasses = [
    "2025-06-20",
    "2025-08-05",
    "2026-02-27"
  ];
  for (const [reference, expectedIndex] of [
    ["2025-06-18T12:00:00Z", 1],
    ["2025-07-15T12:00:00Z", 2],
    ["2026-02-20T12:00:00Z", 3]
  ]) {
    const timing = await ephemeris.natalTransitTimingFor("Saturn", 1.5, reference, {
      aspectDegrees: 0,
      presentationDegrees: 1.5,
      timeZone: "UTC"
    });
    assert.ok(timing);
    assert.equal(timing.passIndex, expectedIndex);
    assert.deepEqual(timing.exactPasses.map((pass) => pass.exactAt.slice(0, 10)), expectedPasses);
    assert.equal(timing.exactPasses[1].firstMotion, "retrograde");
    assert.equal(timing.stationNearNatal, true);
  }

  console.log("Natal transit direction, station window, and three-pass Saturn timing checks passed.");
} finally {
  await vite.close();
}
