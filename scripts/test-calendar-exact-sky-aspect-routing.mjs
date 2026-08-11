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
const canonicalPayloadPath = path.join(
  repoRoot,
  "packages/astro-knowledge/review/sky-aspect-owner-refinements-2026-08-11/sky-aspect-owner-refinements-payloads.json"
);
const canonicalPayloadBytes = fs.readFileSync(canonicalPayloadPath);
const ownerRefinements = JSON.parse(canonicalPayloadBytes.toString("utf8"));

assert.equal(
  crypto.createHash("sha256").update(canonicalPayloadBytes).digest("hex"),
  "88dba60e4a198298b9aad2c5989efd08a5c47b2be5d2b7d82bc3f599e6084299",
  "The canonical owner-refinement payload file changed."
);

const exactRecords = fs.readdirSync(transitDirectory)
  .filter((name) => name.endsWith(".json"))
  .map((name) => readJson(path.join(transitDirectory, name)))
  .filter((record) => (
    ["APPROVED", "LIVE"].includes(record.status)
    && typeof record.readerCopy?.body === "string"
    && record.readerCopy.body.trim()
  ));

assert.equal(exactRecords.length, 215, "The pinned reader-eligible exact Sky corpus changed.");

for (const [key, entry] of Object.entries(ownerRefinements.payloads)) {
  const payloadHash = crypto.createHash("sha256").update(JSON.stringify(entry.payload)).digest("hex");
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
    routedDirections += 1;
  }
}

assert.equal(routedDirections, 430, "Every reader-eligible exact record must route in both planet orders.");

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
  }
];

const saturnCalendarLeadIn = "On Tuesday, August 11, Saturn in Aries squares Lilith in Capricorn, and on a collective level, ";
const saturnOwnerText = ownerRefinements.payloads["sky.saturn.square.lilith"].payload.ownerText;
assert.ok(
  saturnOwnerText.startsWith(saturnCalendarLeadIn),
  "The canonical Saturn-Lilith payload no longer matches the approved composed lead-in boundary."
);
const saturnStoredBody = saturnOwnerText.slice(saturnCalendarLeadIn.length);

for (const { event, ownerKey, sourceId } of screenshotCases) {
  const record = exactRecords.find(({ id }) => id === sourceId);
  const ownerText = ownerRefinements.payloads[ownerKey].payload.ownerText;
  const normalized = normalizeCalendarEventSurface(
    event,
    null,
    "On Tuesday, August 11",
    null,
    exactLookup
  );
  const selected = normalized.sections[0];

  assert.equal(selected?.tier, "approved-exact-sky-aspect-v1");
  assert.equal(selected?.body, ownerText, `${ownerKey}: Calendar Exact today output drifted from owner text.`);
  assert.doesNotMatch(selected?.body ?? "", /untamed side|soften at the edges/iu);

  if (ownerKey === "sky.saturn.square.lilith") {
    assert.equal(
      record.readerCopy.body,
      saturnStoredBody,
      "Saturn-Lilith stored body must be the byte-identical canonical payload remainder after the composed lead-in."
    );
    assert.equal(record.base, saturnStoredBody, "Saturn-Lilith base must not introduce prose outside the canonical payload.");
    for (const field of ["business", "shadow", "arcApplying", "arcSeparating"]) {
      assert.ok(
        saturnStoredBody.includes(record[field]),
        `Saturn-Lilith ${field} must be an exact sentence from the canonical payload.`
      );
    }
    assert.equal(record.traditional, undefined);
    assert.equal(record.modern, undefined);
    assert.equal(record.cyclic, undefined);
    assert.equal(record.readerCopy.calendarLeadIn, "date-placements-collective-level");
  } else {
    assert.equal(record.readerCopy.body, ownerText, `${ownerKey}: stored body must be byte-identical to owner text.`);
  }
}

const signSpecificOverride = normalizeCalendarEventSurface(
  aspectEvent({
    first: "Venus",
    second: "Saturn",
    aspect: "square",
    fromSign: "Aries",
    toSign: "Cancer",
    id: "precedence-sign-specific-over-exact"
  }),
  {
    body: "Generated copy must not outrank reviewed specific copy.",
    contentKey: "generated/precedence-test",
    headline: "Generated precedence test"
  },
  "On Tuesday, August 11",
  null,
  exactLookup
);

assert.equal(signSpecificOverride.sections[0]?.tier, "reviewed-sky-aspect-phrasebook-v1");
assert.equal(
  signSpecificOverride.sections[0]?.sourceKeys[0],
  "fallback-hook/sky-aspect-sign/venus/aries/square/saturn/cancer"
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

console.log("Calendar exact Sky-aspect routing parity passed", {
  readerEligibleRecords: exactRecords.length,
  routedDirections,
  screenshotRegressions: screenshotCases.length,
  remainingDocumentedExactGaps: 239
});
