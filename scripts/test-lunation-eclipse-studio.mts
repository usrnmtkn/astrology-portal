import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { build } from 'esbuild';
import { servingPackageRecords } from '../api/_lib/serving-package-records';
import { createApiStore } from '../tests/helpers/calendar-review-api.mjs';
import { isLunationEclipseSectionKey, isStudioLunationRevision } from '../apps/web/src/content/fallbackArchitectureV3/resolver/lunationStudioRevision.mjs';
import { packagePublicationAdmissionIssue } from '../api/_lib/content-studio-package-admission';
import { projectReaderRow } from '../apps/web/src/content/readerRowProjection.mjs';

const hash = (text: string) => createHash('sha256').update(text).digest('hex');
const records = [...servingPackageRecords.values()].filter(record => isLunationEclipseSectionKey(record.contentKey));
assert.equal(records.length, 42);
assert.notEqual(packagePublicationAdmissionIssue({ content_key: records[0].contentKey, status: 'LIVE',
  provider: 'tldrastro-fallback-architecture-v3', sections: { packageRecord: records[0] } }), null,
  'A plain status change cannot impersonate the explicit owner revision action.');
for (const key of [
  'authored/lunation-eclipse-section/pisces/rising-aries/house-1/opening',
  'authored/lunation-eclipse-section/pisces/rising-pisces/house-01/opening',
  'authored/lunation-eclipse-section/gemini/rising-aries/house-3/opening',
  'authored/lunation-eclipse-section/shared/solar/nature',
  'authored/book-ritual-and-the-moon/lunation-horoscope/eclipse-lunar/pisces/rising-aries/house-12'
]) assert.equal(isLunationEclipseSectionKey(key), false, key);

const originals = JSON.stringify(records);
const rows = records.map((record, index) => ({
  id: `a0000000-0000-4000-8000-${String(index + 101).padStart(12, '0')}`,
  content_key: record.contentKey, surface: 'sky', mode: 'in_depth', event_type: 'fallback-system',
  status: 'DRAFT', lane: 'reference', review_state: null, provider: 'tldrastro-fallback-architecture-v3',
  headline: record.headline ?? record.contentKey, summary: '', body: record.body,
  block_type: 'fallback_hook', sections: { packageRecord: structuredClone(record), packageOriginalRecord: structuredClone(record) },
  facts: { fallbackArchitectureV3: true }, source_snapshot: { contentType: 'authored-content' }, updated_at: '2026-10-30T04:00:00Z'
}));
const store = await createApiStore(rows);
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'eclipse-studio-'));
try {
  const bundle = path.join(directory, 'reader.mjs');
  await build({ stdin: { resolveDir: process.cwd(), loader: 'ts', contents: `
    export { createTransitSynastryRenderer as sourceFactory } from './apps/web/src/content/fallbackArchitectureV3/resolver/renderTransitSynastry.browser';
    export { createTransitSynastryRenderer as shippedFactory, PACKAGE_VERSION } from './apps/web/src/content/fallbackArchitectureV3/dist/tldr-content.js';
    export { packageFallbackArchitectureV3CoreRows } from './apps/web/src/services/fallbackArchitectureV3CorePackaging';
    export { loadLunationBookFallbackArchitectureV3Bundle, loadDeferredFallbackArchitectureV3Bundle, installFallbackArchitectureV3Bundle,
      loadFallbackArchitectureV3BundledCoreManifest, transitSynastryFallbackRendererV3 } from './apps/web/src/content/fallbackArchitectureV3Runtime';
    export { installContentPublications } from './apps/web/src/content/contentPublicationState';
  ` }, bundle: true, outfile: bundle, platform: 'node', format: 'esm', define: { 'import.meta.env': '{}' }, logLevel: 'silent' });
  const reader = await import(pathToFileURL(bundle).href);
  assert.equal(reader.PACKAGE_VERSION, 'v3-2026-10-30-lunation');
  await reader.loadLunationBookFallbackArchitectureV3Bundle();
  await reader.loadDeferredFallbackArchitectureV3Bundle();
  const catalog = await store.invoke('POST', { action: 'composition-catalog' }, '/api/admin/content-live-status');
  for (const record of records) assert.ok(catalog.payload.rows.some(row => row.content_key === record.contentKey));
  const expected = new Map<string, string>();
  const liveRows: any[] = [];
  for (const row of rows) {
    // Boundary whitespace and paragraph breaks are part of this complete owner unit.
    const body = `\nSynthetic ${row.content_key} opening.${row.content_key.endsWith('/nature') ? ' Matching cycle: {{matchingNewMoonSign}}.' : ''}\n\nThe complete synthetic final sentence.\n`;
    const saved = await store.invoke('PATCH', { id: row.id, expectedUpdatedAt: row.updated_at,
      sections: { ...row.sections, packageDraft: { ...row.sections.packageRecord, body } } });
    assert.equal(saved.status, 200, row.content_key + ': save');
    const draft = saved.payload.rows[0];
    assert.equal(isStudioLunationRevision(draft.sections.packageRecord), false, 'Saving cannot issue an owner approval receipt.');
    const reopened = await store.invoke('GET', undefined, `/api/admin/generated-content?id=${row.id}`);
    assert.equal(reopened.payload.rows[0].sections.packageDraft.body, body);
    const published = await store.invoke('PATCH', { id: row.id, expectedUpdatedAt: draft.updated_at, ownerAction: 'approve-package-revision' });
    assert.equal(published.status, 200, JSON.stringify({ key: row.content_key, error: published.payload.error }));
    const live = published.payload.rows[0];
    assert.equal(live.status, 'LIVE'); assert.equal(live.lane, 'serving');
    assert.equal(live.body, body); assert.equal(live.sections.packageRecord.body, body);
    assert.equal(live.sections.packageRecord.protected_content.body_sha256, hash(body));
    assert.equal(live.sections.packageRecord.protected_content.char_count, body.length);
    assert.equal(live.sections.packageRecord.approval.payloadSha256, hash(body));
    assert.equal(live.sections.packageRecord.approval.recordPath, `studio:lunation/${encodeURIComponent(row.content_key)}#${hash(body)}`);
    const wrongReference = structuredClone(live.sections.packageRecord);
    wrongReference.approval.recordPath = 'studio:lunation/different-source';
    assert.equal(isStudioLunationRevision(wrongReference), false);
    assert.equal(Object.hasOwn(live.sections.packageRecord.protected_content, 'approved_omissions'), false,
      'A newly authored unit must not claim to be the unchanged historical book transform.');
    assert.equal(isStudioLunationRevision(live.sections.packageRecord), true);
    assert.deepEqual(live.sections.packageOriginalRecord, row.sections.packageOriginalRecord);
    const stale = await store.invoke('PATCH', { id: row.id, expectedUpdatedAt: row.updated_at,
      sections: { ...row.sections, packageDraft: { ...row.sections.packageRecord, body: 'Stale overwrite.' } } });
    assert.equal(stale.status, 409);
    const status = await store.invoke('POST', { ids: [row.id] }, '/api/admin/content-live-status');
    assert.equal(status.payload.statuses[0].live, true, row.content_key + ': status');
    expected.set(row.content_key, body); liveRows.push(live);
  }
  const response = await store.invoke('POST', { keys: rows.map(row => row.content_key) }, '/api/content-reader');
  assert.equal(response.status, 200); assert.equal(response.payload.rows.length, 42);
  for (const row of response.payload.rows) assert.equal(row.body, expected.get(row.content_key));
  const privateMarker = 'PRIVATE_ECLIPSE_EDITOR_NOTE_MUST_NOT_LEAK';
  const transport = projectReaderRow({ ...liveRows[0], sections: { ...liveRows[0].sections,
    packageOriginalRecord: { body: privateMarker }, packageDraft: { body: privateMarker },
    packageRecord: { ...liveRows[0].sections.packageRecord,
      studio_lunation_revision: { ...liveRows[0].sections.packageRecord.studio_lunation_revision, privateNotes: privateMarker },
      protected_content: { ...liveRows[0].sections.packageRecord.protected_content, approved_omissions: [{ text: privateMarker }] }
    } } });
  assert.ok(!JSON.stringify(transport).includes(privateMarker), 'Only neutral runtime integrity fields may cross the reader boundary.');
  reader.installContentPublications(response.payload.publications);
  const core = reader.packageFallbackArchitectureV3CoreRows(response.payload.rows, await reader.loadFallbackArchitectureV3BundledCoreManifest());
  assert.equal(core.transitLib.authoredCards.length, 42);
  reader.installFallbackArchitectureV3Bundle(core);
  const packageRoot = 'apps/web/src/content/fallbackArchitectureV3/';
  const json = (file: string) => JSON.parse(fs.readFileSync(packageRoot + file, 'utf8'));
  const data = { authoredCards: [
    ...json('source-rows/transit-synastry-rows-v1.json').authoredCards,
    ...json('source-rows/lunation-blend-units-v1.json').authoredCards,
    ...json('source-rows/lunation-book-cards-v1.json').authoredCards,
    ...records, ...core.transitLib.authoredCards
  ] };
  const templates = json('templates/fallback-templates-v3.json');
  const hooks = json('source-rows/fallback-source-rows-v3.json');
  hooks.hookRows.push(...json('source-rows/lunation-blend-units-v1.json').hookRows);
  const variants = [reader.sourceFactory(data, templates, hooks), reader.shippedFactory(data, templates, hooks), reader.transitSynastryFallbackRendererV3];
  const signs = ['aries','taurus','gemini','cancer','leo','virgo','libra','scorpio','sagittarius','capricorn','aquarius','pisces'];
  const assertRenderer = (render: (facts: any) => any) => {
    for (let house = 1; house <= 12; house++) {
      const risingSign = signs[(12 - house) % 12];
      const facts = { kind: 'eclipse-lunar', sign: 'pisces', risingSign, house, moonHouse: house,
        sunHouse: (house + 5) % 12 + 1, ruler: 'jupiter', rulerHouse: 2,
        eventDate: '2026-08-28T04:18:00Z', matchingNewMoon: { sign: 'pisces', exactAt: '2026-03-19T01:23:00Z' } };
      const result = render(facts);
      for (const key of [
        `authored/lunation-eclipse-section/pisces/rising-${risingSign}/house-${house}/opening`,
        `authored/lunation-eclipse-section/pisces/rising-${risingSign}/house-${house}/evergreen-body`,
        'authored/lunation-eclipse-section/shared/lunar/nature',
        'authored/lunation-eclipse-section/shared/lunar/mechanics',
        `authored/lunation-eclipse-section/shared/lunar/recommendation${[4,8,12].includes(house) ? '-endings' : ''}`,
        `authored/lunation-eclipse-section/shared/lunar/close${[4,8,12].includes(house) ? '-endings' : ''}`
      ]) assert.ok(result.body.includes(expected.get(key)!.replaceAll('{{matchingNewMoonSign}}', 'Pisces')), key + ': full published unit');
      const solar = render({ ...facts, kind: 'eclipse-solar', sign: 'pisces' });
      assert.ok(solar.body.includes(expected.get(`authored/lunation-eclipse-house-layer/solar/house-${house}`)));
    }
  };
  for (const renderer of variants) assertRenderer(facts => renderer.renderLunationHoroscope(facts));
  // A new ordinary book edition must not silently rewrite or invalidate an
  // independently approved eclipse section pinned to the older book version.
  const bookKey = 'authored/book-ritual-and-the-moon/lunation-horoscope/full-moon/pisces/rising-pisces/house-1';
  const book = servingPackageRecords.get(bookKey)!;
  const bookRow = { ...rows[0], id: 'a0000000-0000-4000-8000-000000000250', content_key: bookKey,
    body: book.body, sections: { packageRecord: book, packageOriginalRecord: book } };
  store.rows.set(bookRow.id, structuredClone(bookRow));
  const bookBody = 'Synthetic new book edition opening.\n\nThe complete new book edition ending.';
  const bookSave = await store.invoke('PATCH', { id: bookRow.id, expectedUpdatedAt: bookRow.updated_at,
    sections: { ...bookRow.sections, packageDraft: { ...book, body: bookBody } } });
  assert.equal(bookSave.status, 200);
  const bookPublish = await store.invoke('PATCH', { id: bookRow.id, expectedUpdatedAt: bookSave.payload.rows[0].updated_at, ownerAction: 'approve-package-revision' });
  assert.equal(bookPublish.status, 200);
  const bookRead = await store.invoke('POST', { keys: [bookKey] }, '/api/content-reader');
  const publishedBook = bookRead.payload.rows[0].sections.packageRecord;
  assert.equal(isStudioLunationRevision(publishedBook), true);
  const baselineEclipseKey = 'authored/lunation-eclipse-section/pisces/rising-pisces/house-1/evergreen-body';
  const baselineData = { authoredCards: [...data.authoredCards.filter(record => !isLunationEclipseSectionKey(record.contentKey)),
    ...records, publishedBook] };
  const assertPinned = (render: (facts: any) => any) => {
    const context = { sign: 'pisces', risingSign: 'pisces', house: 1, moonHouse: 1, sunHouse: 7,
      eventDate: '2026-08-28T04:18:00Z', ruler: 'jupiter', rulerHouse: 2,
      matchingNewMoon: { sign: 'pisces', exactAt: '2026-03-19T01:23:00Z' } };
    const lunar = render({ ...context, kind: 'eclipse-lunar' });
    assert.ok(lunar.body.includes(servingPackageRecords.get(baselineEclipseKey)!.body));
    assert.ok(!lunar.body.includes(bookBody));
    assert.ok(render({ ...context, kind: 'full-moon' }).body.includes(bookBody));
  };
  for (const factory of [reader.sourceFactory, reader.shippedFactory]) {
    const renderer = factory(baselineData, templates, hooks);
    assertPinned(facts => renderer.renderLunationHoroscope(facts));
  }
  // The Node reference loads JSON sources. Inject the same isolated published
  // rows at that read boundary, without modifying canonical files on disk.
  const readFile = fs.readFileSync;
  const overrides = new Map(core.transitLib.authoredCards.map(record => [record.contentKey, record]));
  let pinnedNode = false;
  (fs as any).readFileSync = function(file: any, ...options: any[]) {
    const original = (readFile as any)(file, ...options);
    if (pinnedNode && String(file).endsWith('/source-rows/lunation-book-cards-v1.json')) {
      const parsed = JSON.parse(String(original));
      parsed.authoredCards = parsed.authoredCards.map(record => record.contentKey === bookKey ? publishedBook : record);
      return JSON.stringify(parsed);
    }
    if (!pinnedNode && String(file).includes('/source-rows/lunation-eclipse-') && /(?:sections|house-layers)-v1[.]json$/u.test(String(file))) {
      const parsed = JSON.parse(String(original));
      parsed.authoredCards = parsed.authoredCards.map(record => overrides.get(record.contentKey) ?? record);
      return JSON.stringify(parsed);
    }
    return original;
  };
  try {
    const node = await import('../apps/web/src/content/fallbackArchitectureV3/resolver/renderTransitSynastry.mjs');
    assertRenderer(node.renderLunationHoroscope);
    pinnedNode = true;
    const pinned = await import('../apps/web/src/content/fallbackArchitectureV3/resolver/renderTransitSynastry.mjs?pinned-book');
    assertPinned(pinned.renderLunationHoroscope);
  } finally { fs.readFileSync = readFile; }
  const tampered = structuredClone(liveRows[0]); tampered.sections.packageRecord.body += ' Tampered.';
  assert.notEqual(packagePublicationAdmissionIssue(tampered), null, 'Corrupt revision metadata cannot be republished by a plain save.');
  const intact = store.rows.get(tampered.id);
  store.rows.set(tampered.id, tampered);
  const corruptRead = await store.invoke('POST', { keys: [tampered.content_key] }, '/api/content-reader');
  assert.equal(corruptRead.status, 200); assert.equal(corruptRead.payload.rows.length, 0,
    'The actual public reader must withhold a revision whose body no longer matches its receipt.');
  store.rows.set(tampered.id, intact);
  const corruptRenderer = reader.shippedFactory({ authoredCards: [...data.authoredCards, tampered.sections.packageRecord] }, templates, hooks);
  assert.throws(() => corruptRenderer.renderLunationHoroscope({ kind: 'eclipse-lunar', sign: 'pisces', risingSign: 'pisces', house: 1,
    eventDate: '2026-08-28T04:18:00Z', ruler: 'jupiter', rulerHouse: 2, matchingNewMoon: { sign: 'pisces', exactAt: '2026-03-19T01:23:00Z' } }), /ECLIPSE_SECTION_MODIFIED/);
  reader.installContentPublications(response.payload.publications.map(publication => publication.content_key === liveRows[0].content_key
    ? { ...publication, state: 'retired', row_id: null, row_updated_at: null, revision: publication.revision + 1 } : publication));
  assert.throws(() => reader.transitSynastryFallbackRendererV3.renderLunationHoroscope({ kind: 'eclipse-lunar', sign: 'pisces', risingSign: 'pisces', house: 1,
    eventDate: '2026-08-28T04:18:00Z', ruler: 'jupiter', rulerHouse: 2, matchingNewMoon: { sign: 'pisces', exactAt: '2026-03-19T01:23:00Z' } }), /PUBLICATION|SOURCE_GAP|retired|unavailable/iu);
  assert.equal(JSON.stringify(records), originals, 'All approved package originals stay unchanged.');
  console.log('PASS: all 42 eclipse sources discover, save, reopen, explicitly publish, reject stale writes, preserve exact whitespace/hashes/originals, report Live, and reach Node, browser source, shipped artifact and app renderer across 24 eclipse contexts.');
} finally { await store.close(); fs.rmSync(directory, { recursive: true, force: true }); }
