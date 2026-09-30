import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const outFile = path.join(os.tmpdir(), `personal-transit-hydration-${process.pid}.mjs`);
await build({ bundle: true, format: 'esm', platform: 'node', outfile: outFile, logLevel: 'silent',
  define: { 'import.meta.env': '{}' }, loader: { '.css': 'empty', '.svg': 'dataurl' },
  stdin: { resolveDir: process.cwd(), loader: 'tsx', contents: `
    export { personalizedSkyPlacementDetail, friendsViewModelDependencies } from './apps/web/src/App.tsx';
    export * from './apps/web/src/services/personalTransitSources.ts';
    export { refreshContentPublications } from './apps/web/src/services/contentPublications.ts';
    export { installPersonalTransitFallbackArchitectureV3Bundle, installSkyCoreFallbackArchitectureV3Bundle,
      loadDeferredFallbackArchitectureV3Bundle } from './apps/web/src/content/fallbackArchitectureV3Runtime.ts';
    export { projectReaderRow, READER_ROW_SCHEMA } from './apps/web/src/content/readerRowProjection.mjs';
  ` }
});
const originalFetch = globalThis.fetch;
try {
  const r = await import(pathToFileURL(outFile));
  const catalog = JSON.parse(fs.readFileSync('apps/web/src/content/fallbackArchitectureV3/source-rows/transit-synastry-rows-v1.json')).authoredCards;
  const keys = ['authored/transit-aspect/moon/sun/hard', 'authored/transit-aspect/moon/jupiter/soft'];
  const stamp = '2026-09-30T12:00:00.123456Z';
  let revision = 1, fail = false, omit = false, requests = 0;
  let rows = keys.map((key, i) => {
    const record = catalog.find(row => row.contentKey === key);
    assert.ok(record, key);
    return { id: `00000000-0000-4000-8000-00000000000${i}`, content_key: key,
      surface: 'you', mode: 'in_depth', status: 'LIVE', lane: 'serving', review_state: null,
      provider: 'tldrastro-fallback-architecture-v3', updated_at: stamp, body: record.body_you,
      facts: { content_role: 'full_copy', review_status: 'approved' },
      source_snapshot: { sourcePackage: 'tldrastro-fallback-architecture-v3', content_role: 'full_copy', review_status: 'approved' },
      sections: { packageRecord: record } };
  });
  const ledger = state => rows.map(row => ({ content_key: row.content_key, state, revision,
    row_id: row.id, row_updated_at: row.updated_at, updated_at: stamp }));
  let publications = ledger('live');
  globalThis.fetch = async (url, init) => {
    assert.equal(url, '/api/content-reader');
    const query = JSON.parse(init.body);
    assert.deepEqual(query.keys, keys, 'Cold article loads the published personal keys independently of Sky scope.');
    requests++;
    if (fail) return new Response('unavailable', { status: 503 });
    return Response.json({ schema: r.READER_ROW_SCHEMA, rows: (omit ? rows.slice(1) : rows).map(r.projectReaderRow), publications, nextCursor: null });
  };
  await r.loadDeferredFallbackArchitectureV3Bundle();
  const transits = ['Sun', 'Jupiter'].map((natalPoint, i) => ({ id: `moon-${natalPoint}`, transitPlanet: 'Moon',
    natalPoint, aspect: i ? 'sextile' : 'square', transitMotion: 'direct', transitSign: 'Taurus',
    natalSign: i ? 'Pisces' : 'Leo', natalHouse: i ? 10 : 3, house: 12, term: 'short', currentSpeed: 13,
    glyph: '', orb: "0 30'", arc: [], note: '', timing: { engagementStart: '2026-10-25T00:00:00Z',
      engagementEnd: '2026-10-27T00:00:00Z', exactPasses: [], passIndex: 1 } }));
  const date = '2026-10-25';
  const sky = () => r.personalizedSkyPlacementDetail({ routePath: 'sky/placement/moon/taurus',
    risingHoroscopes: [{ house: 12, risingSign: 'Gemini', body: 'Synthetic house fixture.' }] }, 'Gemini', transits, `${date}T16:00:00Z`)
    .personalizedPlacement.natalAspects.map(row => row.body);
  const personal = voice => transits.map(transit => r.friendsViewModelDependencies.normalizePersonalTransitSurface(transit, date, voice).sections[0]?.body ?? null);
  const baseline = sky(), friendBaseline = personal('QA Friend');
  assert.ok(baseline.every(body => body && body.length > 100));
  assert.ok(friendBaseline.every(body => body && body.length > 100));
  await r.refreshContentPublications(true, async () => publications);
  assert.deepEqual(sky(), [null, null], 'Reproduces the screenshot: ledger blocks unversioned bundle before its exact rows arrive.');
  assert.deepEqual(r.missingPersonalTransitPublications(null), keys);
  const [prepared, joined] = await Promise.all([r.preparePersonalTransitSources(), r.preparePersonalTransitSources()]);
  assert.equal(prepared, joined); assert.equal(requests, 1);
  r.installPersonalTransitFallbackArchitectureV3Bundle(prepared.bundle);
  assert.deepEqual(sky(), baseline, 'Full opening and final text restored without rewriting.');
  assert.deepEqual(personal('you'), baseline);
  assert.deepEqual(personal('QA Friend'), friendBaseline);
  assert.ok(sky().every(body => !body.includes('{{')));
  r.installSkyCoreFallbackArchitectureV3Bundle(null);
  assert.deepEqual(sky(), baseline, 'Sky navigation cannot erase the independent transit overlay.');
  await r.preparePersonalTransitSources(); assert.equal(requests, 1, 'Unchanged publication reuses the admitted source set.');
  revision++;
  rows = rows.map(row => ({ ...row, updated_at: '2026-09-30T12:00:00.123457Z' }));
  publications = ledger('live');
  await r.refreshContentPublications(true, async () => publications);
  assert.deepEqual(sky(), [null, null], 'Microsecond version change invalidates old source bodies.');
  fail = true; await assert.rejects(r.preparePersonalTransitSources(), /could not load/);
  fail = false; omit = true; await assert.rejects(r.preparePersonalTransitSources(), /did not load/);
  omit = false;
  r.installPersonalTransitFallbackArchitectureV3Bundle((await r.preparePersonalTransitSources()).bundle);
  assert.deepEqual(sky(), baseline, 'Retry restores both complete passages.');
  revision++; publications = ledger('retired');
  await r.refreshContentPublications(true, async () => publications);
  r.installPersonalTransitFallbackArchitectureV3Bundle((await r.preparePersonalTransitSources()).bundle);
  assert.deepEqual(sky(), [null, null]); assert.deepEqual(personal('you'), [null, null]);
  assert.deepEqual(personal('QA Friend'), [null, null]);
  for (const key of ['authored/transit-return/saturn', 'authored/transit-house-intro/moon/12',
    'authored/transit-house-sign/moon/12/taurus', 'authored/transit-aspect-insert/sun/midheaven/opposition',
    'fallback-hook/fog-note/variant-1', 'fallback-hook/natal-core/sun', 'authored/point-explainer/north-node',
    'fallback-hook/transit-pass/2', 'fallback-template/transit.aspect', 'fallback-vocab/angle-area/ascendant']) assert.ok(r.isPersonalTransitSource(key), key);
  console.log('PASS: cold publication hydration, exact text on Sky/You/Friends, independent overlays, deduplication, failure/partial-read retry, microsecond revisions and retirement.');
} finally { globalThis.fetch = originalFetch; fs.rmSync(outFile, { force: true }); }
