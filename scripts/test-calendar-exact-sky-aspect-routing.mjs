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
const bundleFile = path.join(os.tmpdir(), "tldrastro-calendar-exact-sky-aspect-routing.bundle.mjs");
const registryBundleFile = path.join(os.tmpdir(), "tldrastro-approved-exact-sky-aspect-registry.bundle.mjs");
const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, "utf8"));
const canonicalPayloadRelative = process.env.SKY_CALENDAR_OWNER_PAYLOADS_PATH
  ?? "packages/astro-knowledge/review/sky-calendar-exact-approved-2026-09-04-held-trines-33/current-owner-payloads.json";
const canonicalPayloadPath = path.resolve(repoRoot, canonicalPayloadRelative);
if (!canonicalPayloadPath.startsWith(`${repoRoot}${path.sep}`)) {
  throw new Error("SKY_CALENDAR_OWNER_PAYLOADS_PATH must resolve inside the repository.");
}
const ownerRewrites = readJson(canonicalPayloadPath);
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const expectedExactCount = ownerRewrites.rowCount;
const documentedExactUniverse = 454;

assert.ok(Number.isInteger(expectedExactCount) && expectedExactCount > 0, "The current exact owner payload projection must declare a positive row count.");
assert.equal(Object.keys(ownerRewrites.payloads ?? {}).length, expectedExactCount, "The current exact owner payload map changed.");
const currentSetHashInput = Object.entries(ownerRewrites.payloads)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([contentKey, entry]) => ({ contentKey, payloadSha256: entry.sha256 }));
assert.equal(
  sha256(JSON.stringify(currentSetHashInput)),
  ownerRewrites.payloadSetSha256,
  "The current exact owner payload-set hash drifted."
);

const allExactRecords = fs.readdirSync(transitDirectory)
  .filter((name) => name.endsWith(".json"))
  .map((name) => readJson(path.join(transitDirectory, name)))
  .filter((record) => (
    ["APPROVED", "LIVE"].includes(record.status)
    && typeof record.readerCopy?.body === "string"
    && record.readerCopy.body.trim()
  ));
const southNodePoleRecords = allExactRecords.filter((record) => record.other === "south-node");
const exactRecords = allExactRecords.filter((record) => record.other !== "south-node");

assert.equal(exactRecords.length, expectedExactCount, "The pinned canonical-event exact Sky corpus changed.");
if (southNodePoleRecords.length > 0) {
  assert.equal(
    southNodePoleRecords.length,
    60,
    "South Node pole-specific content must add exactly 60 interpretations without changing the canonical event denominator."
  );
}

for (const [key, entry] of Object.entries(ownerRewrites.payloads)) {
  const payloadHash = sha256(JSON.stringify(entry.payload));
  assert.equal(payloadHash, entry.sha256, `${key}: approved payload hash drifted.`);
}

await build({
  bundle: true,
  define: { "import.meta.env": "{}" },
  entryPoints: [path.join(repoRoot, "apps/web/src/features/calendar/LunarCalendar.tsx")],
  format: "esm",
  loader: { ".css": "empty" },
  logLevel: "silent",
  outfile: bundleFile,
  platform: "node"
});

await build({
  bundle: true,
  define: { "import.meta.env": "{}" },
  entryPoints: [path.join(repoRoot, "apps/web/src/content/skyRegistry.ts")],
  format: "esm",
  logLevel: "silent",
  outfile: registryBundleFile,
  platform: "node"
});

const { normalizeCalendarEventSurface } = await import(
  `${pathToFileURL(bundleFile).href}?t=${Date.now()}`
);
const { approvedExactSkyAspectCopy: exactLookup } = await import(
  `${pathToFileURL(registryBundleFile).href}?t=${Date.now()}`
);

function aspectEvent({ first, second, aspect, fromSign, toSign, id }) {
  return {
    id: id ?? `${first}-${aspect}-${second}`.toLowerCase(),
    type: "aspect",
    title: `${first} ${aspect} ${second}`,
    startsAt: "2026-08-11T12:00:00.000Z",
    dateKey: "2026-08-11",
    planets: [first, second],
    aspect,
    fromSign,
    toSign
  };
}

let routedDirections = 0;

for (const record of exactRecords) {
  const contentKey = `sky.${record.transiting}.${record.aspect}.${record.other}`;
  const approvedPayload = ownerRewrites.payloads[contentKey]?.payload;
  assert.ok(approvedPayload, `${contentKey}: missing current owner-approved payload.`);
  assert.deepEqual(
    { summary: record.readerCopy.summary, body: record.readerCopy.body },
    approvedPayload,
    `${contentKey}: stored copy drifted from the current owner-approved payload.`,
  );
  for (const [first, second] of [
    [record.transiting, record.other],
    [record.other, record.transiting]
  ]) {
    const needsFactSlots = record.readerCopy.body.includes("{{")
      || record.readerCopy.calendarLeadIn === "date-placements-collective-level";
    const normalized = normalizeCalendarEventSurface(
      aspectEvent({
        first,
        second,
        aspect: record.aspect,
        fromSign: needsFactSlots ? "Aries" : undefined,
        toSign: needsFactSlots ? "Taurus" : undefined
      }),
      null,
      "On Tuesday, August 11",
      null,
      exactLookup
    );
    const selected = normalized.sections[0];
    const registryCopy = exactLookup(first, record.aspect, second);

    assert.equal(registryCopy?.sourceId, record.id, `${record.id} (${first} first) was absent from the shared registry.`);
    assert.equal(registryCopy?.body, record.readerCopy.body, `${record.id} (${first} first) registry body drifted.`);
    assert.ok(selected, `${record.id} (${first} first) returned no Calendar copy.`);
    assert.equal(
      selected.tier,
      "approved-exact-sky-aspect-v1",
      `${record.id} (${first} first) bypassed approved exact copy for ${selected.tier}.`
    );
    assert.ok(
      selected.sourceKeys.includes(`packages/astro-knowledge/data/transits/${record.id}.json`),
      `${record.id} (${first} first) lost exact-source provenance.`
    );
    if (record.other === "north-node" && southNodePoleRecords.length === 60) {
      assert.match(selected.body, /North Node \([a-z]+\):/u, `${record.id}: North Node label missing from dual-pole Calendar copy.`);
      assert.match(selected.body, /South Node \([a-z]+\):/u, `${record.id}: South Node counterpoint missing from dual-pole Calendar copy.`);
      assert.ok(
        selected.sourceKeys.some((key) => key.endsWith("-south-node.json")),
        `${record.id}: South Node exact-source provenance missing from dual-pole Calendar copy.`
      );
    }
    routedDirections += 1;
  }
}

assert.equal(routedDirections, expectedExactCount * 2, "Every canonical reader-eligible exact record must route in both planet orders.");

const screenshotCases = [
  {
    event: aspectEvent({
      first: "Venus",
      second: "Uranus",
      aspect: "trine",
      fromSign: "Libra",
      toSign: "Gemini",
      id: "screenshot-venus-trine-uranus"
    }),
    ownerKey: "sky.venus.trine.uranus",
    sourceId: "venus-trine-uranus"
  },
  {
    event: aspectEvent({
      first: "Mercury",
      second: "Neptune",
      aspect: "trine",
      fromSign: "Leo",
      toSign: "Aries",
      id: "screenshot-mercury-trine-neptune"
    }),
    ownerKey: "sky.mercury.trine.neptune",
    sourceId: "mercury-trine-neptune"
  },
  {
    event: aspectEvent({
      first: "Saturn",
      second: "Lilith",
      aspect: "square",
      fromSign: "Aries",
      toSign: "Capricorn",
      id: "owner-saturn-square-lilith"
    }),
    ownerKey: "sky.saturn.square.lilith",
    sourceId: "saturn-square-lilith"
  },
  ...(ownerRewrites.payloads["sky.sun.trine.lilith"] ? [{
    event: aspectEvent({
      first: "Sun",
      second: "Lilith",
      aspect: "trine",
      fromSign: "Virgo",
      toSign: "Capricorn",
      id: "owner-sun-trine-lilith"
    }),
    ownerKey: "sky.sun.trine.lilith",
    sourceId: "sun-trine-lilith"
  }] : []),
  ...(ownerRewrites.payloads["sky.sun.trine.north-node"] ? [{
    event: aspectEvent({
      first: "Sun",
      second: "North Node",
      aspect: "trine",
      fromSign: "Virgo",
      toSign: "Capricorn",
      id: "owner-sun-trine-north-node"
    }),
    ownerKey: "sky.sun.trine.north-node",
    sourceId: "sun-trine-north-node"
  }] : [])
];

for (const { event, ownerKey, sourceId } of screenshotCases) {
  const record = exactRecords.find(({ id }) => id === sourceId);
  const ownerText = ownerRewrites.payloads[ownerKey].payload.body;
  const normalized = normalizeCalendarEventSurface(
    event,
    null,
    "On Tuesday, August 11",
    null,
    exactLookup
  );
  const selected = normalized.sections[0];

  assert.equal(selected?.tier, "approved-exact-sky-aspect-v1");
  if (sourceId.endsWith("-north-node") && southNodePoleRecords.length === 60) {
    assert.ok(selected?.body.includes(ownerText), `${ownerKey}: North Node owner text disappeared from dual-pole Calendar output.`);
    assert.match(selected?.body ?? "", /South Node \([a-z]+\):/u, `${ownerKey}: South Node interpretation is missing.`);
  } else {
    assert.equal(selected?.body, ownerText, `${ownerKey}: Calendar Exact today output drifted from owner text.`);
  }
  assert.doesNotMatch(selected?.body ?? "", /untamed side|soften at the edges/iu);

  assert.equal(record.readerCopy.body, ownerText, `${ownerKey}: stored body must be byte-identical to owner text.`);
  assert.equal(Object.hasOwn(record.readerCopy, "calendarLeadIn"), false, `${ownerKey}: obsolete lead-in metadata remains.`);
}

const exactBeforeSignSpecific = normalizeCalendarEventSurface(
  aspectEvent({
    first: "Venus",
    second: "Saturn",
    aspect: "square",
    fromSign: "Aries",
    toSign: "Cancer",
    id: "precedence-exact-over-sign-specific"
  }),
  {
    body: "Generated copy must not outrank exact owner-approved copy.",
    contentKey: "generated/precedence-test",
    headline: "Generated precedence test"
  },
  "On Tuesday, August 11",
  null,
  exactLookup
);

assert.equal(exactBeforeSignSpecific.sections[0]?.tier, "approved-exact-sky-aspect-v1");
assert.equal(
  exactBeforeSignSpecific.sections[0]?.body,
  exactLookup("Venus", "square", "Saturn")?.body,
  "Legacy sign-specific copy must not replace an available owner-approved exact aspect body."
);

const phrasebookBeforeGenerated = normalizeCalendarEventSurface(
  aspectEvent({ first: "Sun", second: "Moon", aspect: "trine", id: "precedence-phrasebook-over-generated" }),
  {
    body: "Generated copy must not outrank reviewed pair copy.",
    contentKey: "generated/precedence-test",
    headline: "Generated precedence test"
  },
  "On Tuesday, August 11",
  null,
  null
);

assert.equal(phrasebookBeforeGenerated.sections[0]?.tier, "reviewed-sky-aspect-phrasebook-v1");

const generatedBeforeGeneric = normalizeCalendarEventSurface(
  aspectEvent({ first: "Chiron", second: "Lilith", aspect: "square", id: "precedence-generated-over-generic" }),
  {
    body: "Approved generated copy remains ahead of the general compositor.",
    contentKey: "generated/precedence-test",
    headline: "Generated precedence test"
  },
  "Today",
  null,
  exactLookup
);

assert.equal(generatedBeforeGeneric.sections[0]?.tier, "generated-sky-aspect-lint-v1");
assert.equal(exactLookup("Chiron", "square", "Lilith"), null, "Remaining exact gaps must still fail closed.");
assert.equal(exactLookup("Saturn", "square", "Lilith")?.sourceId, "saturn-square-lilith");

const sourceGapWithoutGenericProse = normalizeCalendarEventSurface(
  aspectEvent({
    first: "Moon",
    second: "Chiron",
    aspect: "sextile",
    fromSign: "Pisces",
    toSign: "Taurus",
    id: "source-gap-with-factual-shell"
  }),
  null,
  "On Tuesday, August 11",
  null,
  exactLookup
);

assert.equal(sourceGapWithoutGenericProse.status, "not-servable");
assert.deepEqual(sourceGapWithoutGenericProse.sections, []);

console.log("Calendar exact Sky-aspect routing parity passed", {
  canonicalReaderEligibleRecords: exactRecords.length,
  poleSpecificSouthNodeContentRecords: southNodePoleRecords.length,
  routedDirections,
  screenshotRegressions: screenshotCases.length,
  remainingDocumentedExactGaps: documentedExactUniverse - exactRecords.length
});
