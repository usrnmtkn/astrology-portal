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

// Compare the actual App and Calendar adapters, rather than only their helpers.
const appBundle = path.join(os.tmpdir(), 'tldrastro-sky-calendar-copy-parity.bundle.mjs');
const appSource = fs.readFileSync(path.join(repoRoot, 'apps/web/src/App.tsx'), 'utf8');
await build({
  bundle: true, define: { 'import.meta.env': '{}' }, format: 'esm', platform: 'node',
  loader: { '.css': 'empty' }, logLevel: 'silent', outfile: appBundle,
  stdin: { resolveDir: path.join(repoRoot, 'apps/web/src'), loader: 'tsx', contents: `${appSource}
    export { normalizeSkyAspectSurface };
    export function parityExactLookup(lookup) { loadedContentRegistries.sky = { ...loadedContentRegistries.sky, approvedExactSkyAspectCopy: lookup }; }
    export { skyPlacementInSignAspectSections } from "./services/skyPlacementInSignAspectSections";
    export function archivePhrasebook(facts) { return skyAspectPackageCandidates(facts, transitSynastryFallbackRendererV3.renderSkyAspectCard, FallbackV3SourceGapError); }
    export { normalizeCalendarEventSurface as calendarSurface } from './features/calendar/LunarCalendar';
    export { skyAspectReadingDateLine } from './services/skyAspectRouting';
    export { installContentPublications } from './content/contentPublicationState';
    export { loadCalendarFallbackArchitectureV3Bundle } from './content/fallbackArchitectureV3Runtime';
  ` }
});
const app = await import(`${pathToFileURL(appBundle).href}?t=${Date.now()}`);
const registry = await app.loadContentRegistry('sky');
await app.loadCalendarFallbackArchitectureV3Bundle();
function compareReading(event, content = new Map(), exactLookup = registry.approvedExactSkyAspectCopy) {
  app.parityExactLookup(exactLookup);
  const day = app.skyAspectReadingDateLine(event.startsAt, 'America/New_York');
  const calendar = app.calendarSurface(event, null, day, null,
    exactLookup, registry.skyCalendarComposedCard, content);
  const sky = app.normalizeSkyAspectSurface({ from: event.planets[0], to: event.planets[1], type: event.aspect,
    fromSign: event.fromSign, toSign: event.toSign, fromMotion: event.fromMotion, toMotion: event.toMotion, orb: 0 },
    content, [], event.startsAt, 'America/New_York');
  assert.equal(sky.sections.map(section => section.body).join('\n\n'),
    calendar.sections.map(section => section.body).join('\n\n'), `${event.id}: Calendar and Sky must preserve the same complete reading`);
  assert.deepEqual(sky.sections[0]?.sourceKeys, calendar.sections[0]?.sourceKeys, `${event.id}: source identity parity`);
  const archived = app.skyPlacementInSignAspectSections([{ id: event.id, occursAt: event.startsAt,
    planet: event.planets[0], otherPlanet: event.planets[1], aspect: event.aspect,
    fromSign: event.fromSign, toSign: event.toSign, fromMotion: event.fromMotion, toMotion: event.toMotion }],
    'America/New_York', content, exactLookup,
    { composedLookup: registry.skyCalendarComposedCard, phrasebook: app.archivePhrasebook });
  const archivedBody = archived.sections[0]?.body.split('\n\n').slice(1).join('\n\n') ?? '';
  assert.equal(archivedBody, sky.sections.map(section => section.body).join('\n\n'), `${event.id}: archived placement must retain the same complete approved reading`);
  assert.deepEqual(archived.sections[0]?.sourceKeys ?? [], sky.sections[0]?.sourceKeys ?? [], `${event.id}: archived source identity parity`);
  return sky.sections[0];
}
let parityCount = 0;
for (const card of collection.cards.filter(card => card.ownerApproved && card.servingAuthorized)) {
  for (const reverse of [false, true]) {
    compareReading({ ...event, id: card.id, planets: reverse ? [card.planetB, card.planetA] : [card.planetA, card.planetB],
      aspect: card.aspect, fromSign: reverse ? card.signB : card.signA, toSign: reverse ? card.signA : card.signB });
    parityCount++;
  }
}
const transitDir = path.join(repoRoot, 'packages/astro-knowledge/data/transits');
for (const name of fs.readdirSync(transitDir).filter(name => name.endsWith('.json'))) {
  const record = JSON.parse(fs.readFileSync(path.join(transitDir, name), 'utf8'));
  if (!['APPROVED', 'LIVE'].includes(record.status) || !record.readerCopy?.body) continue;
  for (const reverse of [false, true]) {
    compareReading({ ...event, id: record.id, planets: reverse ? [record.other, record.transiting] : [record.transiting, record.other], aspect: record.aspect });
    parityCount++;
  }
}
const matrix = JSON.parse(fs.readFileSync(path.join(repoRoot, 'docs/content-review/sky-aspects/2026-07-31/canonical-noon-matrix.json'), 'utf8'));
let phrasebookRoutes = 0;
for (const row of matrix.aspects) {
  const [first, aspect, second, fromSign, toSign] = row.key.split('|');
  const selected = compareReading({ ...event, id: row.key, planets: [first, second], aspect, fromSign, toSign });
  // A deliberate missing corpus dependency exercises the admitted fallback
  // independently of the currently complete general-aspect catalog.
  const fallback = compareReading({ ...event, id: `${row.key}:without-corpus`, planets: [first, second], aspect, fromSign, toSign }, new Map(), () => null);
  if (fallback?.tier === 'reviewed-sky-aspect-phrasebook-v1') phrasebookRoutes++;
  parityCount += 2;
}
assert.ok(phrasebookRoutes > 0, 'The three-surface parity check must exercise actual approved fallbacks.');
const publicationKey = 'sky-card/mercury/scorpio/square/jupiter/leo';
const publishedBody = 'Synthetic signed publication opening.\n\nComplete final publication sentence.';
const published = { id: 'parity-publication', contentKey: publicationKey, updatedAt: '2026-11-20T12:00:00Z',
  status: 'LIVE', body: publishedBody, summary: null, eventType: 'calendar-aspect-owner-approved-revision',
  sourceSnapshot: { review_status: 'approved', owner_approved: true, serving_enabled: true,
    calendarAspectPublication: { schema: 'content-studio-calendar-publication/v1', contentKey: publicationKey } },
  sections: { RetrogradeBodyA: 'Synthetic retrograde publication opening.\n\nComplete retrograde final sentence.' } };
const publishedEvent = { ...event, id: publicationKey, planets: ['Mercury', 'Jupiter'], aspect: 'square', fromSign: 'Scorpio', toSign: 'Leo' };
const content = new Map([[publicationKey, published]]);
assert.ok(compareReading(publishedEvent, content).body.startsWith(publishedBody));
assert.equal(compareReading(publishedEvent, content).body, publishedBody, 'A complete publication cannot inherit the older bundled details.');
assert.ok(compareReading({ ...publishedEvent, fromMotion: 'retrograde', toMotion: 'direct' }, content).body.startsWith(published.sections.RetrogradeBodyA));
app.installContentPublications([{ content_key: publicationKey, state: 'live', revision: 1,
  row_id: published.id, row_updated_at: published.updatedAt, updated_at: published.updatedAt }]);
assert.equal(compareReading(publishedEvent, content).body, publishedBody);
assert.equal(compareReading(publishedEvent), undefined, 'An unavailable pinned sign publication cannot expose older prose.');
assert.equal(compareReading(publishedEvent, new Map([[publicationKey, { ...published, updatedAt: '2000-01-01T00:00:00Z' }]])), undefined, 'A stale published version cannot expose older prose.');
app.installContentPublications([{ content_key: publicationKey, state: 'retired', revision: 2,
  row_id: null, row_updated_at: null, updated_at: published.updatedAt }]);
assert.equal(compareReading(publishedEvent, content), undefined, 'retired sign publication cannot expose older prose');
console.log(`Calendar/current Sky/archived placement actual-adapter parity: PASS (${parityCount} package routes including ${phrasebookRoutes} missing-corpus fallbacks, signed publication, Rx and retirement)`);
