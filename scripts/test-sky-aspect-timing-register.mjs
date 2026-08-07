import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createLogger, createServer } from "vite";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const logger = createLogger("error");
const viteError = logger.error;
logger.error = (message, options) => {
  const text = String(message);
  if (
    text.includes("WebSocket server error")
    || text.includes("Failed to run dependency scan")
    || text.includes("The server is being restarted or closed")
  ) return;
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
  const timing = await vite.ssrLoadModule("/src/services/skyAspectTiming.ts");
  const reference = new Date("2026-07-25T16:00:00.000Z");
  const sky = await ephemeris.getAstrodienstSky(
    ephemeris.defaultLocation,
    reference,
    { includeTransitWindows: true }
  );

  const aspectNamed = (from, type, to) => sky.aspects.find((aspect) => (
    aspect.from === from && aspect.type === type && aspect.to === to
  ));

  const exactMoon = aspectNamed("Moon", "opposition", "Mars");
  assert.equal(exactMoon?.timing?.group, "this-week");
  assert.equal(exactMoon?.timing?.timeZone, ephemeris.defaultLocation.timeZone);
  assert.match(timing.skyAspectLifecycleLine(exactMoon, reference), /^Exact \p{L}+\.$/u);
  assert.doesNotMatch(timing.skyAspectDateRange(
    exactMoon,
    new Date(exactMoon.timing.engagementStart),
    new Date(exactMoon.timing.engagementEnd)
  ), /\b(?:UTC|PT|PST|PDT)\b/);

  const buildingSun = aspectNamed("Sun", "trine", "Neptune");
  assert.equal(buildingSun?.timing?.phase, "building");
  assert.match(timing.skyAspectLifecycleLine(buildingSun, reference), /^Building through \p{L}+\.$/u);

  const fadingSun = aspectNamed("Sun", "square", "Chiron");
  assert.equal(fadingSun?.timing?.phase, "fading");
  assert.match(timing.skyAspectLifecycleLine(fadingSun, reference), /^Fading through \p{L}+\.$/u);

  const undercurrent = aspectNamed("Neptune", "sextile", "Pluto");
  assert.equal(undercurrent?.timing?.group, "undercurrent");
  assert.ok((undercurrent?.timing?.exactPasses.length ?? 0) > 1);
  assert.match(timing.skyAspectMultiPassLine(undercurrent), /^First of .+ passes;/);
  const cycleLine = timing.skyAspectCycleLocationLine(undercurrent);
  assert.ok(cycleLine === null || /\b\d{4}\b/.test(cycleLine));

  assert.deepEqual(buildingSun?.timing?.relation, {
    fastPlanet: "Sun",
    undercurrentA: "Neptune",
    undercurrentB: "Pluto"
  });
  assert.equal(
    timing.skyAspectRelationLine(buildingSun),
    "Sun is also triggering the Neptune-Pluto undercurrent this week."
  );
  assert.equal(timing.skyAspectRelationLine(exactMoon), null);

  for (const aspect of sky.aspects) {
    const lines = timing.skyAspectNarrativeTimingLines(aspect, reference);
    assert.ok(lines.length <= 4);
    for (const line of lines) {
      assert.equal(timing.timingStringIsReaderSafe(line), true, `Unsafe timing string: ${line}`);
    }
  }

  const synthetic = {
    from: "Uranus",
    to: "Pluto",
    type: "conjunction",
    orb: 0.1,
    timing: {
      group: "undercurrent",
      phase: "building",
      engagementStart: "2045-01-01T00:00:00.000Z",
      engagementEnd: "2047-12-31T00:00:00.000Z",
      passIndex: 2,
      exactPasses: [
        { exactAt: "2045-04-01T00:00:00.000Z", firstMotion: "direct", secondMotion: "direct" },
        { exactAt: "2046-01-01T00:00:00.000Z", firstMotion: "retrograde", secondMotion: "direct" },
        { exactAt: "2046-11-01T00:00:00.000Z", firstMotion: "direct", secondMotion: "direct" }
      ],
      cycleLocation: { previousYear: 1965, nextYear: 2104, cycleYears: 81, ambiguous: false },
      relation: null
    }
  };
  assert.equal(timing.skyAspectMultiPassLine(synthetic), "Second pass of three; the review round.");
  assert.equal(
    timing.skyAspectCycleLocationLine(synthetic),
    "A new 81-year cycle between Uranus and Pluto begins here; the last one started in 1965."
  );

  console.log("Sky aspect timing register passed fixed-date lifecycle, multi-pass, cycle, relation, and vocabulary checks.");
} finally {
  await vite.close();
}
