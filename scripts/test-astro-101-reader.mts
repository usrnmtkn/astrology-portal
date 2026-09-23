import assert from 'node:assert/strict';
import { educationReaderResponse, lessonRows, privateCanary } from '../tests/helpers/astro101-reader-fixture.ts';
import { fixturePublications } from '../tests/helpers/content-reader-route.mjs';
import { loadLiveAstro101Pages } from '../apps/web/src/services/astro101Content.ts';
import { publicationBootstrap } from './seed-content-publications.mts';
import { createPublicationDb, seedPublicationRow } from '../tests/helpers/studio-publication-db.mjs';

const query = { prefix: 'education/astro-101/', surfaces: ['education'] };
const before = structuredClone(lessonRows);
const response = await educationReaderResponse(query);
assert.equal(response.status, 200);
const result = await response.json();
assert.equal(result.rows.length, 10, 'Published education rows must survive legacy import metadata');
for (const [index, row] of result.rows.entries()) {
  assert.equal(row.body, lessonRows[index].body);
  assert.equal(row.sections.intro, lessonRows[index].sections.intro);
  assert.deepEqual(row.sections.blocks, lessonRows[index].sections.blocks);
  assert.deepEqual(row.facts, lessonRows[index].facts);
}
assert(!JSON.stringify(result).includes(privateCanary), 'Import descriptors and drafts remain private');
assert.deepEqual(lessonRows, before);

const original = lessonRows[0];
for (const mutation of [{ status: 'DRAFT' }, { lane: 'reference' }, { review_state: 'needs-review' },
  { flags: ['BLOCKLIST_MATCH'] }, { facts: { ...original.facts, sampleOnly: true } },
  { headline: '' }, { body: '', sections: { kind: 'chapter' } },
  { body: '{{ephemeris:unknown}}' }]) {
  const rows = [{ ...original, ...mutation }];
  assert.deepEqual((await (await educationReaderResponse(query, rows)).json()).rows, [], JSON.stringify(mutation));
}
for (const state of ['missing', 'retired', 'stale']) {
  const ledger = fixturePublications([original]);
  if (state === 'missing') ledger.pop();
  if (state === 'retired') ledger[1].state = 'retired';
  if (state === 'stale') ledger[1].row_updated_at = '2026-09-19T17:04:51.356471+00:00';
  assert.deepEqual((await (await educationReaderResponse(query, [original], ledger)).json()).rows, [], state);
}

const realFetch = globalThis.fetch;
try {
  globalThis.fetch = async (_input, init) => educationReaderResponse(JSON.parse(String(init?.body)));
  const pages = await loadLiveAstro101Pages();
  assert.equal(pages.filter(page => page.kind === 'chapter').length, 9);
  assert.equal(pages.find(page => page.slug === '/learn/houses/11')?.blocks[0].body, 'QA final sentence 10.');
  globalThis.fetch = async (_input, init) => educationReaderResponse(JSON.parse(String(init?.body)), [{ ...original, facts: {} }]);
  assert.equal((await loadLiveAstro101Pages())[0].slug, '/learn/astro-101/qa-chapter-1');
  globalThis.fetch = async () => new Response('{}', { status: 503 });
  await assert.rejects(loadLiveAstro101Pages(), /Published content request failed/);
} finally { globalThis.fetch = realFetch; }

// The existing recovery mechanism fills absent ledger records only, with CAS.
const db = await createPublicationDb();
try {
  await db.exec('reset request.headers; reset request.jwt.claims');
  for (const row of lessonRows) await seedPublicationRow(db, row);
  const seed = publicationBootstrap(lessonRows);
  assert.equal(seed.selected.length, 10);
  await db.query('update generated_interpretations set updated_at=$2 where id=$1', [lessonRows[1].id, '2026-09-20T00:00:00Z']);
  await db.query('select retire_content_everywhere($1,$2,$3)', [lessonRows[2].content_key, lessonRows[2].id, lessonRows[2].updated_at]);
  await db.exec(seed.sql);
  const publications: any[] = (await db.query('select * from content_publications')).rows;
  assert.equal(publications.find(row => row.content_key === lessonRows[0].content_key)?.state, 'live');
  assert.equal(publications.find(row => row.content_key === lessonRows[1].content_key), undefined, 'Concurrent edits are not published');
  assert.equal(publications.find(row => row.content_key === lessonRows[2].content_key)?.state, 'retired', 'Retirement survives recovery');
  assert.equal((await db.query('select body from generated_interpretations where id=$1', [original.id])).rows[0].body, original.body);
} finally { await db.close(); }
console.log('PASS Astro 101 actual reader API, exact copy, private imports, lifecycle, loader failure, and version-safe publication recovery.');
