#!/usr/bin/env node

import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const vite = await createServer({
  root: path.join(repoRoot, "apps", "web"),
  appType: "custom",
  logLevel: "silent",
  server: { middlewareMode: true, hmr: false }
});

try {
  const ephemeris = await vite.ssrLoadModule("/src/services/ephemeris.ts");
  const location = {
    label: "New York, NY",
    latitude: 40.7128,
    longitude: -74.006,
    timeZone: "America/New_York"
  };

  const sameYear = await ephemeris.getMatchingNewMoonForFullMoon(
    location,
    "2026-07-29T12:00:00.000Z",
    "Aquarius"
  );
  assert.equal(sameYear?.sign, "Aquarius");
  assert.equal(sameYear?.exactAt.slice(0, 10), "2026-02-17");

  const crossYear = await ephemeris.getMatchingNewMoonForFullMoon(
    location,
    "2026-01-03T12:00:00.000Z",
    "Cancer"
  );
  assert.equal(crossYear?.sign, "Cancer");
  assert.equal(crossYear?.exactAt.slice(0, 10), "2025-06-25");

  const eclipseAnchor = await ephemeris.getMatchingNewMoonForFullMoon(
    location,
    "2025-09-07T18:08:54.999Z",
    "Pisces"
  );
  assert.equal(eclipseAnchor?.sign, "Pisces");
  assert.equal(eclipseAnchor?.exactAt.slice(0, 10), "2025-02-28");

  assert.equal(
    ephemeris.matchingNewMoonForFullMoon([], "2026-07-29T12:00:00.000Z", "Aquarius"),
    null
  );
} finally {
  await vite.close();
}

console.log("Full Moon cycle anchor checks passed: same-year and cross-year matching New Moons are engine-derived.");
