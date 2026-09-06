#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const transitDirectory = path.join(repoRoot, "packages/astro-knowledge/data/transits");
const projectionRelative = process.env.SKY_CALENDAR_OWNER_PAYLOADS_PATH
  ?? "packages/astro-knowledge/review/sky-calendar-exact-approved-2026-09-06-final-83/current-owner-payloads.json";
const projectionPath = path.resolve(repoRoot, projectionRelative);
const ownerProjection = JSON.parse(fs.readFileSync(projectionPath, "utf8"));
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");

assert.equal(ownerProjection.rowCount, 379, "Major exact-aspect launch projection must contain 379 canonical event rows.");
assert.equal(Object.keys(ownerProjection.payloads ?? {}).length, 379, "Major exact-aspect launch payload map must contain 379 canonical event rows.");
const setHashInput = Object.entries(ownerProjection.payloads)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([contentKey, entry]) => ({ contentKey, payloadSha256: entry.sha256 }));
assert.equal(
  sha256(JSON.stringify(setHashInput)),
  ownerProjection.payloadSetSha256,
  "Major exact-aspect launch projection hash drifted.",
);

const allExactRecords = fs.readdirSync(transitDirectory)
  .filter((name) => name.endsWith(".json"))
  .map((name) => JSON.parse(fs.readFileSync(path.join(transitDirectory, name), "utf8")))
  .filter((record) => (
    ["APPROVED", "LIVE"].includes(record.status)
    && typeof record.readerCopy?.body === "string"
    && record.readerCopy.body.trim()
  ));
const southNodePoleRecords = allExactRecords.filter((record) => record.other === "south-node");
const exactRecords = allExactRecords.filter((record) => record.other !== "south-node");
assert.equal(exactRecords.length, 379, "Reader-eligible canonical major exact Sky event corpus must contain 379 rows.");
if (southNodePoleRecords.length > 0) {
  assert.equal(southNodePoleRecords.length, 60, "Pole-specific South Node content must contain 60 rows.");
}

for (const [key, entry] of Object.entries(ownerProjection.payloads)) {
  assert.equal(
    sha256(JSON.stringify(entry.payload)),
    entry.sha256,
    `${key}: approved payload hash drifted.`,
  );
}

const calendarBundle = path.join(os.tmpdir(), "tldrastro-calendar-major-exact-routing.bundle.mjs");
const registryBundle = path.join(os.tmpdir(), "tldrastro-major-exact-registry.bundle.mjs");
await build({
  bundle: true,
  define: { "import.meta.env": "{}" },
  entryPoints: [path.join(repoRoot, "apps/web/src/features/calendar/LunarCalendar.tsx")],
  format: "esm",
  loader: { ".css": "empty" },
  logLevel: "silent",
  outfile: calendarBundle,
  platform: "node",
});
await build({
  bundle: true,
  define: { "import.meta.env": "{}" },
  entryPoints: [path.join(repoRoot, "apps/web/src/content/skyRegistry.ts")],
  format: "esm",
  logLevel: "silent",
  outfile: registryBundle,
  platform: "node",
});

const { normalizeCalendarEventSurface } = await import(`${pathToFileURL(calendarBundle).href}?t=${Date.now()}`);
const { approvedExactSkyAspectCopy: exactLookup } = await import(`${pathToFileURL(registryBundle).href}?t=${Date.now()}`);

const eventFor = (first, aspect, second, needsFactSlots) => ({
  id: `${first}-${aspect}-${second}`.toLowerCase(),
  type: "aspect",
  title: `${first} ${aspect} ${second}`,
  startsAt: "2026-08-11T12:00:00.000Z",
  dateKey: "2026-08-11",
  planets: [first, second],
  aspect,
  fromSign: needsFactSlots ? "Aries" : undefined,
  toSign: needsFactSlots ? "Taurus" : undefined,
});

let routedDirections = 0;
for (const record of exactRecords) {
  const ownerKey = `sky.${record.transiting}.${record.aspect}.${record.other}`;
  const expected = ownerProjection.payloads[ownerKey]?.payload;
  assert.ok(expected, `${ownerKey}: missing from complete owner projection.`);
  assert.deepEqual(
    { summary: record.readerCopy.summary, body: record.readerCopy.body },
    expected,
    `${ownerKey}: stored reader copy drifted from complete owner projection.`,
  );

  for (const [first, second] of [
    [record.transiting, record.other],
    [record.other, record.transiting],
  ]) {
    const needsFactSlots = record.readerCopy.body.includes("{{")
      || record.readerCopy.calendarLeadIn === "date-placements-collective-level";
    const registryCopy = exactLookup(first, record.aspect, second);
    assert.equal(registryCopy?.sourceId, record.id, `${record.id} (${first} first) missing from shared registry.`);
    assert.equal(registryCopy?.body, record.readerCopy.body, `${record.id} (${first} first) registry body drifted.`);

    const normalized = normalizeCalendarEventSurface(
      eventFor(first, record.aspect, second, needsFactSlots),
      null,
      "On Tuesday, August 11",
      null,
      exactLookup,
    );
    const selected = normalized.sections[0];
    assert.ok(selected, `${record.id} (${first} first) returned no Calendar copy.`);
    assert.equal(selected.tier, "approved-exact-sky-aspect-v1", `${record.id} (${first} first) bypassed exact owner copy.`);
    if (record.other === "north-node" && southNodePoleRecords.length === 60) {
      assert.ok(selected.body.includes(record.readerCopy.body), `${record.id}: North Node exact owner body disappeared.`);
      assert.match(selected.body, /South Node \([a-z]+\):/u, `${record.id}: South Node interpretation is missing from the canonical event.`);
      assert.ok(selected.sourceKeys.some((key) => key.endsWith("-south-node.json")), `${record.id}: South Node provenance missing.`);
    } else {
      assert.equal(selected.body, record.readerCopy.body, `${record.id} (${first} first) Calendar body drifted.`);
    }
    assert.ok(
      selected.sourceKeys.includes(`packages/astro-knowledge/data/transits/${record.id}.json`),
      `${record.id} (${first} first) lost exact-source provenance.`,
    );
    routedDirections += 1;
  }
}

assert.equal(routedDirections, 758, "All 379 canonical major exact-aspect event rows must route in both body orders.");
assert.equal(exactLookup("Chiron", "quincunx", "Lilith"), null, "Excluded quincunx must remain outside the major-aspect launch corpus.");

console.log("Complete major exact Sky-aspect routing passed.", {
  canonicalReaderEligibleRecords: exactRecords.length,
  poleSpecificSouthNodeContentRecords: southNodePoleRecords.length,
  routedDirections,
  launchMajorExactRows: 379,
});
