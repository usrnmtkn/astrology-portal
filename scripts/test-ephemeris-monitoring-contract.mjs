import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fixtures = JSON.parse(await readFile(
  path.join(root, "scripts/fixtures/astrology-integrity-fixtures.json"),
  "utf8"
));
const workflow = await readFile(path.join(root, ".github/workflows/ephemeris-integrity.yml"), "utf8");
const releaseGate = await readFile(path.join(root, ".github/workflows/ephemeris-release-gate.yml"), "utf8");
const horizonsProvider = await readFile(path.join(root, "scripts/providers/nasa-horizons-provider.mjs"), "utf8");

const before = fixtures.fixtures.find((fixture) => fixture.id === "sky-mercury-before-direct-station-2026-07-23");
const after = fixtures.fixtures.find((fixture) => fixture.id === "sky-mercury-after-direct-station-2026-07-24");

assert.ok(before, "Missing the pre-station Mercury fixture.");
assert.ok(after, "Missing the post-station Mercury fixture.");
assert.equal(before.assertions.position.motion, "retrograde");
assert.equal(after.assertions.position.motion, "direct");
assert.equal(before.assertions.position.stationEndAt, "2026-07-23T22:57:52.000Z");
assert.ok(new Date(before.date) < new Date(before.assertions.position.stationEndAt));
assert.ok(new Date(after.date) > new Date(before.assertions.position.stationEndAt));
assert.ok(
  (new Date(after.date).getTime() - new Date(before.date).getTime()) / 3_600_000 <= 24,
  "Station fixtures must bracket the same boundary within 24 hours."
);

assert.match(workflow, /EPHEMERIS_ALERT_LOGINS/);
assert.match(workflow, /github\.repository_owner/);
assert.match(workflow, /Action required:/);
assert.match(workflow, /update\.assignees = alertLogins/);
assert.match(releaseGate, /node scripts\/test-ephemeris-monitoring-contract\.mjs/);
for (const aspect of ["conjunction", "sextile", "square", "trine", "quincunx", "opposition"]) {
  assert.match(horizonsProvider, new RegExp(`\\["${aspect}",\\s*\\d+\\]`), `Horizons provider must verify ${aspect} aspects.`);
}

console.log("Ephemeris station and notification monitoring contract passed.");
