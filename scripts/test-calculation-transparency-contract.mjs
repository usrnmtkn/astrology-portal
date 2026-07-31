import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const app = await readFile(path.join(root, "apps/web/src/App.tsx"), "utf8");
const readme = await readFile(path.join(root, "README.md"), "utf8");
const releaseNotes = await readFile(path.join(root, "docs/release-notes.md"), "utf8");

const methodology = "Planetary positions are calculated with Swiss Ephemeris and independently verified against NASA/JPL.";

assert.match(app, new RegExp(methodology.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
assert.match(readme, /Swiss Ephemeris for real-time astrology calculations and\s+NASA\/JPL Horizons as an independent verification layer/);
assert.match(releaseNotes, /True Lunar Node Parity and Calculation Transparency/);

const settingsGroupUses = app.match(/<CalculationMethodSettingsGroup \/>/g) ?? [];
assert.equal(settingsGroupUses.length, 2, "Member and guest Settings must both show the calculation method.");

for (const label of [
  "Calculation engine",
  "Calculation timestamp",
  "Calculation timezone",
  "Zodiac and frame",
  "House system",
  "Lunar node model",
  "Calculation version",
  "Cache age",
  "Snapshot verification"
]) {
  assert.match(app, new RegExp(`<dt>${label}</dt>`), `Missing calculation diagnostic: ${label}`);
}

assert.match(app, /import\.meta\.env\.DEV[\s\S]*VITE_ASTRO_DIAGNOSTICS/);
assert.match(app, /nodeType === "true" \? "True Node"/);
assert.doesNotMatch(app, /Horizons where supported/);

console.log("Calculation transparency contract passed.");
