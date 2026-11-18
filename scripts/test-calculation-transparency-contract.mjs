import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const app = await readFile(path.join(root, "apps/web/src/App.tsx"), "utf8");
const diagnostics = await readFile(path.join(root, "apps/web/src/features/sky/CalculationDiagnosticsPanel.tsx"), "utf8");
const settingsControls = await readFile(path.join(root, "apps/web/src/components/SettingsControls.tsx"), "utf8");
const memberSettings = await readFile(path.join(root, "apps/web/src/features/settings/MemberSettingsView.tsx"), "utf8");
const guestSettings = await readFile(path.join(root, "apps/web/src/features/settings/GuestSettingsView.tsx"), "utf8");
const readme = await readFile(path.join(root, "README.md"), "utf8");
const releaseNotes = await readFile(path.join(root, "docs/release-notes.md"), "utf8");

const methodology = "Planetary positions are calculated with Swiss Ephemeris and independently verified against NASA/JPL.";

assert.match(settingsControls, new RegExp(methodology.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
assert.match(readme, /Swiss Ephemeris for real-time astrology calculations and\s+NASA\/JPL Horizons as an independent verification layer/);
assert.match(releaseNotes, /True Lunar Node Parity and Calculation Transparency/);

assert.match(memberSettings, /<CalculationMethodSettingsGroup \/>/, "Member Settings must show the calculation method.");
assert.match(guestSettings, /<CalculationMethodSettingsGroup \/>/, "Guest Settings must show the calculation method.");

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
  assert.match(diagnostics, new RegExp(`<dt>${label}</dt>`), `Missing calculation diagnostic: ${label}`);
}

assert.match(app, /import\.meta\.env\.DEV[\s\S]*VITE_ASTRO_DIAGNOSTICS/);
assert.match(diagnostics, /nodeType === "true" \? "True Node"/);
assert.match(diagnostics, /import\.meta\.env\.DEV[\s\S]*VITE_ASTRO_DIAGNOSTICS/);
assert.match(app, /const CalculationDiagnosticsPanel = lazy\(\(\) => import\("\.\/features\/sky\/CalculationDiagnosticsPanel"\)\)/);
assert.match(app, /<CalculationDiagnosticsPanel/);
assert.doesNotMatch(app, /Horizons where supported/);

console.log("Calculation transparency contract passed.");
