import assert from 'node:assert/strict';
import { articleAspectHref, articleFactsReferenceDate, articlePeriodAspects, horoscopeOverlapsArticle } from '../apps/admin/src/skyArticleRelatedContent';
import { skyIngressEssayReaderSection } from '../apps/web/src/content/skyIngressEssayReader';
import { syntheticLibrarySkyArticle } from '../tests/helpers/article-library-fixture';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { buildSync } from 'esbuild';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const window = { planet: 'mercury', sign: 'scorpio', transitStartInstant: '2026-10-24T07:12:42.999Z', transitEndInstant: '2026-11-13T15:53:52.999Z' };
const event = (id: string, startsAt: string, planets = ['Mercury', 'Mars']) => ({ id, startsAt, planets, type: 'aspect', aspect: 'square', title: 'Synthetic exact aspect' });
const facts = { ...window, eventCoverage: { start: window.transitStartInstant, end: window.transitEndInstant, complete: true }, events: [
  event('after-reader-date', '2026-11-10T14:00:00Z'), event('before-reader-date', '2026-10-26T14:00:00Z'),
  event('at-entry', window.transitStartInstant), event('at-exit', window.transitEndInstant),
  event('follow-through', '2026-11-16T14:00:00Z'), event('other-planets', '2026-11-02T14:00:00Z', ['Sun', 'Mars']),
  event('before-reader-date', '2026-10-26T14:00:00Z')
] };
assert.deepEqual(articlePeriodAspects(window, facts)?.events.map(event => event.id), ['at-entry', 'before-reader-date', 'after-reader-date'],
  'The full saved period includes aspects before and after the reader date; exit, follow-through, unrelated pairs and duplicates stay out.');
assert.equal(articlePeriodAspects(window, { ...facts, transitStartInstant: '2026-09-30T12:00:00Z' }), null, 'A full-sign visit cannot impersonate the saved retrograde chapter.');
assert.equal(articlePeriodAspects(window, { ...facts, sign: 'libra' }), null);
assert.equal(articlePeriodAspects(window, { ...facts, events: undefined }), null, 'Missing calculation evidence is not an empty-aspect claim.');
assert.equal(articlePeriodAspects(window, { ...facts, eventCoverage: { ...facts.eventCoverage, complete: false } }), null);
const partial = articlePeriodAspects(window, { ...facts, eventCoverage: { ...facts.eventCoverage, end: '2026-11-01T12:00:00Z', complete: false } });
assert.equal(partial?.complete, false);
assert.deepEqual(partial?.events.map(event => event.id), ['at-entry', 'before-reader-date']);
assert.match(articleAspectHref(facts.events[0])!, /^\/#\/sky\/aspect\/mercury\/square\/mars\/at\/2026-11-10T14%3A00%3A00Z$/u);
assert.equal(articleFactsReferenceDate(window), '2026-11-03');
assert.equal(articleFactsReferenceDate({ ...window, transitStartInstant: '2026-10-24T23:00:00Z', transitEndInstant: '2026-10-25T13:00:00Z' }), '2026-10-25', 'A late ingress must not sample noon before ingress.');
assert.equal(articleFactsReferenceDate({ ...window, transitStartInstant: '2026-10-24T23:00:00Z', transitEndInstant: '2026-10-25T11:00:00Z' }), null, 'Unsupported short periods fail explicitly.');

for (const edition of [
  { startsAt: '2026-10-26T04:00:00.000Z', endsAt: '2026-11-02T05:00:00.000Z' }, // DST week
  { startsAt: '2026-11-01T04:00:00.000Z', endsAt: '2026-12-01T05:00:00.000Z' },
  { startsAt: '2026-11-13T05:00:00.000Z', endsAt: '2026-11-14T05:00:00.000Z' }
]) assert(horoscopeOverlapsArticle(window, edition));
for (const edition of [
  { startsAt: '2026-10-23T07:12:42.999Z', endsAt: window.transitStartInstant },
  { startsAt: window.transitEndInstant, endsAt: '2026-11-14T15:53:52.999Z' },
  { startsAt: 'invalid', endsAt: 'invalid' },
  { startsAt: '2026-11-02T05:00:00.000Z', endsAt: '2026-11-01T04:00:00.000Z' }
]) assert.equal(horoscopeOverlapsArticle(window, edition), false);

const raw = await syntheticLibrarySkyArticle();
const row = { ...raw, contentKey: raw.content_key, sourceSnapshot: raw.source_snapshot, updatedAt: raw.updated_at, reviewState: raw.review_state };
for (const activeInstant of ['2026-09-25T12:00:00Z', '2026-10-12T12:00:00Z']) {
  const section = skyIngressEssayReaderSection([row], { activeInstant, planet: 'sun', sign: 'libra' });
  assert.deepEqual(section?.articlePeriod, { startsAt: '2026-09-23T00:05:14Z', endsAt: '2026-10-23T09:37:57Z' }, 'Reader timing retains the saved article period as the visit date changes.');
  assert.equal(section?.body, raw.body, 'Adding related navigation must preserve the whole selected authored body.');
}
assert.equal(skyIngressEssayReaderSection([{ ...row, status: 'DRAFT' }], { activeInstant: '2026-10-12T12:00:00Z', planet: 'sun', sign: 'libra' }), null);

// Archived article metadata carries a selected zone without a current reference.
// Compile the actual component with the app's automatic JSX runtime, sharing
// React with the renderer, as in the existing Sky debility component checks.
const component = buildSync({
  entryPoints: [fileURLToPath(new URL('../apps/web/src/features/sky/SkyPlacementKeyDates.tsx', import.meta.url))],
  bundle: true, write: false, platform: 'node', format: 'cjs', packages: 'external', jsx: 'automatic',
  define: { 'import.meta.env': '{}' }, loader: { '.css': 'empty' }, logLevel: 'error'
}).outputFiles[0].text;
const compiled = { exports: {} as { SkyPlacementKeyDates: typeof import('../apps/web/src/features/sky/SkyPlacementKeyDates').SkyPlacementKeyDates } };
new Function('require', 'module', 'exports', component)(createRequire(import.meta.url), compiled, compiled.exports);
const { SkyPlacementKeyDates } = compiled.exports;
const archivedPeriod = { startsAt: '2026-09-10T00:00:00Z', endsAt: '2027-01-07T00:00:00Z' };
const renderDates = (timeZone: string) => renderToStaticMarkup(createElement(SkyPlacementKeyDates, {
  dates: [{ occursAt: archivedPeriod.startsAt, date: 'Synthetic archived date', label: 'Mercury square Mars' }],
  articlePeriod: archivedPeriod, timeZone
})).replace(/<!--[\s\S]*?-->/gu, '');
const archivedNewYork = renderDates('America/New_York');
assert(archivedNewYork.includes('Article coverage: September 9, 2026 to January 6, 2027.'));
assert(archivedNewYork.includes('/?date=2026-09-09#calendar?view=day&amp;date=2026-09-09'));
assert(!archivedNewYork.includes('sky-placement-key-dates__next'), 'A selected archive zone does not enable current-only Next markers.');
const archivedUtc = renderDates('UTC');
assert(archivedUtc.includes('Article coverage: September 10, 2026 to January 7, 2027.'));
assert(archivedUtc.includes('/?date=2026-09-10#calendar?view=day&amp;date=2026-09-10'));
console.log('PASS: full-period aspect bounds, calculation coverage, exact aspect links, reference sampling, DST horoscope overlap, unchanged reader copy/eligibility, and archive coverage/calendar dates without current-reference behavior.');
