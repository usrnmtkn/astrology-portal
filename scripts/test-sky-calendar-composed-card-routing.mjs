#!/usr/bin/env node
// Proves the render path for two-part composed Calendar cards:
//   1. an owner-approved, serving-authorized card outranks the existing exact body
//      and renders as two sections, description plus details;
//   2. a card that is not owner-approved or not serving-authorized never reaches
//      the runtime bundle, so the Calendar keeps serving today's exact body;
//   3. a route with no composed card is unchanged.
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cardsPath = path.join(repoRoot, "packages/astro-knowledge/data/sky-calendar/composed-cards-v1.json");
const bundleFile = path.join(os.tmpdir(), "tldrastro-sky-calendar-composed-routing.bundle.mjs");
const collection = JSON.parse(fs.readFileSync(cardsPath, "utf8"));

assert.equal(collection.schema, "tldr.sky-calendar.composed-cards.v1");
assert.ok(Array.isArray(collection.cards), "composed-cards-v1.json must carry a cards array");

for (const card of collection.cards) {
  for (const field of ["id", "planetA", "signA", "aspect", "planetB", "signB", "forecast", "details"]) {
    assert.ok(
      typeof card[field] === "string" && card[field].trim(),
      `${card.id ?? "card"}: ${field} is required`,
    );
  }
  assert.equal(typeof card.ownerApproved, "boolean", `${card.id}: ownerApproved must be explicit`);
  assert.equal(typeof card.servingAuthorized, "boolean", `${card.id}: servingAuthorized must be explicit`);
  assert.ok(
    card.forecast[0] === card.forecast[0].toLowerCase(),
    `${card.id}: the stored forecast begins lowercase; the Calendar composes the date lead-in`,
  );
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

const { normalizeCalendarEventSurface } = await import(
  `${pathToFileURL(bundleFile).href}?t=${Date.now()}`
);

const event = {
  id: "neptune-sextile-pluto",
  type: "aspect",
  title: "Neptune sextile Pluto",
  startsAt: "2026-08-18T12:00:00.000Z",
  dateKey: "2026-08-18",
  planets: ["Neptune", "Pluto"],
  aspect: "sextile",
  fromSign: "Aries",
  toSign: "Aquarius"
};

const exactLookup = () => ({
  body: "the older single-body copy for this planet pair.",
  contentId: "sky-neptune-sextile-pluto",
  sourceId: "neptune-sextile-pluto",
  summary: "older copy"
});

const composedCard = {
  contentId: "sky-card-neptune-aries-sextile-pluto-aquarius",
  forecast: "an opening appears that nobody has to take.",
  details: "Neptune in Aries sextile Pluto in Aquarius. The opening is available rather than automatic.",
  sourceId: "sky-card/neptune/aries/sextile/pluto/aquarius"
};

const withComposed = normalizeCalendarEventSurface(
  event,
  null,
  "On Tuesday, August 18",
  null,
  exactLookup,
  () => composedCard
);

assert.equal(withComposed.status, "servable");
assert.equal(withComposed.sections.length, 2, "an approved composed card renders forecast plus details");
assert.equal(withComposed.sections[0].slot, "description");
assert.equal(withComposed.sections[0].tier, "composed-sky-calendar-card-v1");
assert.equal(
  withComposed.sections[0].body,
  "On Tuesday, August 18, an opening appears that nobody has to take."
);
assert.equal(withComposed.sections[1].slot, "details");
assert.equal(withComposed.sections[1].body, composedCard.details);

const withoutComposed = normalizeCalendarEventSurface(
  event,
  null,
  "On Tuesday, August 18",
  null,
  exactLookup,
  () => null
);

assert.equal(withoutComposed.status, "servable");
assert.equal(withoutComposed.sections.length, 1, "no composed card means today's behaviour is unchanged");
assert.equal(withoutComposed.sections[0].tier, "approved-exact-sky-aspect-v1");

const missingSigns = normalizeCalendarEventSurface(
  { ...event, fromSign: "", toSign: "" },
  null,
  "On Tuesday, August 18",
  null,
  exactLookup,
  () => composedCard
);

assert.equal(
  missingSigns.sections[0].tier,
  "approved-exact-sky-aspect-v1",
  "a composed card is sign-specific; without both signs it must not be used"
);

const missingDateLine = normalizeCalendarEventSurface(
  event,
  null,
  "",
  null,
  exactLookup,
  () => composedCard
);

assert.notEqual(
  missingDateLine.sections[0]?.tier,
  "composed-sky-calendar-card-v1",
  "without a date line the stored lowercase forecast must not render as a fragment"
);

console.log(
  `Sky Calendar composed-card routing: PASS (${collection.cards.length} composed cards, serving-gated)`
);
