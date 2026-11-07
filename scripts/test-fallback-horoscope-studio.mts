import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { lunationReaderContractPlugin } from './lunation-reader-contract-plugin.mjs';
import { servingPackageRecords } from '../api/_lib/serving-package-records';
import { fallbackHoroscopeIdentity, fallbackHoroscopeSources } from '../apps/admin/src/fallbackHoroscopeSources';
import { relatedHousePassages, relatedLunationHoroscopes, skyPlacementBodies, skyPlacementSigns } from '../apps/admin/src/skyWriteupRelations';
import { createApiStore } from '../tests/helpers/calendar-review-api.mjs';
import { isGovernedReaderEligible as nodeEligible } from '../apps/web/src/content/fallbackArchitectureV3/resolver/readerEligibility.mjs';
import { isGovernedReaderEligible as browserEligible } from '../apps/web/src/content/fallbackArchitectureV3/resolver/readerEligibility.browser';
import { createTransitSynastryRenderer as sourceFactory } from '../apps/web/src/content/fallbackArchitectureV3/resolver/renderTransitSynastry.browser';
import { createTransitSynastryRenderer as shippedFactory } from '../apps/web/src/content/fallbackArchitectureV3/dist/tldr-content.js';

const readerContract = lunationReaderContractPlugin();
for (const name of ['fallbackHoroscopeSources', 'fallbackHoroscopeKey']) {
  assert.equal(readerContract.resolveId('../../web/src/content/fallbackArchitectureV3/resolver/lunationStudioRevision.mjs',
    fileURLToPath(new URL(`../apps/admin/src/${name}.ts`, import.meta.url))), null,
  'Studio key identity must retain the small canonical predicate without importing the packaged renderer.');
}
assert.equal(readerContract.resolveId('./fallbackArchitectureV3/resolver/lunationStudioRevision.mjs',
  fileURLToPath(new URL('../apps/web/src/content/lunationArticleHoroscopes.ts', import.meta.url))),
fileURLToPath(new URL('../apps/web/src/content/lunationStudioRevision.ts', import.meta.url)),
'Reader consumers must keep sharing the shipped publication contract.');

const originals = JSON.stringify([...servingPackageRecords]);
const catalog = fallbackHoroscopeSources([...servingPackageRecords.values()].map(record => ({
  id: `package:${record.contentKey}`, content_key: record.contentKey, body: record.body_you ?? record.body,
  sections: { packageRecord: record }
})));
assert.equal(catalog.length, 1314);
assert.equal(catalog.filter(row => fallbackHoroscopeIdentity(row.content_key)?.kind === 'placement').length, 984);
assert.equal(catalog.filter(row => /-moon$/u.test(fallbackHoroscopeIdentity(row.content_key)?.kind ?? '')).length, 288);
assert.equal(catalog.filter(row => fallbackHoroscopeIdentity(row.content_key)?.kind === 'eclipse').length, 42);
assert.deepEqual(new Set(catalog.filter(row => fallbackHoroscopeIdentity(row.content_key)?.kind === 'placement').map(row => fallbackHoroscopeIdentity(row.content_key)!.planet)), new Set(skyPlacementBodies));
for (const row of catalog) {
  const identity = fallbackHoroscopeIdentity(row.content_key)!;
  if (identity.sign && identity.house && identity.risingSign) {
    const sign = skyPlacementSigns.indexOf(identity.sign as any), rising = skyPlacementSigns.indexOf(identity.risingSign as any);
    assert.equal((sign - rising + 12) % 12 + 1, identity.house);
  }
}
for (const row of catalog.filter(row => fallbackHoroscopeIdentity(row.content_key)?.kind !== 'eclipse')) {
  const identity = fallbackHoroscopeIdentity(row.content_key)!;
  const old = { ...row, id: 'old', body: 'Old saved revision.', updated_at: '2026-01-01T00:00:00Z' };
  const current = { ...row, id: 'current', body: 'Complete saved opening. Complete saved ending.', updated_at: '2026-10-31T00:00:00Z' };
  const duplicates = [row, old, current];
  assert.equal(fallbackHoroscopeSources(duplicates)[0].id, current.id);
  const sky = identity.kind === 'placement'
    ? relatedHousePassages(duplicates, { planet: identity.planet, sign: identity.sign! }).find(item => item.house === identity.house)?.row
    : relatedLunationHoroscopes(duplicates, { kind: identity.kind, sign: identity.sign!, eclipse: 'none' }).find(item => item.risingSign === identity.risingSign)?.sources[0]?.row;
  assert.equal(sky?.id, current.id, row.content_key + ': Sky and the fallback library must edit the same revision');
}
for (const key of ['house-horoscope-core/fake/aries/house-1', 'house-horoscope-core/sun/aries/house-01',
  'authored/book-ritual-and-the-moon/lunation-horoscope/full-moon/taurus/rising-aries/house-3',
  'authored/book-ritual-and-the-moon/lunation-horoscope/eclipse-lunar/pisces/rising-aries/house-12']) assert.equal(fallbackHoroscopeIdentity(key), null);

const keys = [
  'house-horoscope-core/moon/sagittarius/house-1',
  'authored/book-ritual-and-the-moon/lunation-horoscope/new-moon/aries/rising-aries/house-1',
  'authored/book-ritual-and-the-moon/lunation-horoscope/new-moon/virgo/rising-gemini/house-4',
  'authored/book-ritual-and-the-moon/lunation-horoscope/full-moon/taurus/rising-taurus/house-1',
  'authored/lunation-eclipse-house-layer/solar/house-1'
];
const store = await createApiStore([]);
try {
  // Older manual rows can use a fallback key without package metadata. Their
  // normal publication path must also permit the owner's choice of topic.
  const manual = { id: 'a0000000-0000-4000-8000-000000000777', content_key: keys[0], surface: 'sky', mode: 'in_depth',
    status: 'DRAFT', lane: 'reference', review_state: null, provider: 'manual-admin', block_type: 'fallback_hook',
    headline: 'Synthetic manual source', summary: '', body: 'Synthetic Tarot draft. Complete draft ending.',
    facts: {}, source_snapshot: {}, sections: {}, updated_at: '2026-10-31T12:00:00Z' };
  store.rows.set(manual.id, manual);
  const manualDraft = await store.invoke('PATCH', { id: manual.id, expectedUpdatedAt: manual.updated_at, body: manual.body + '\n\nComplete private addition.' });
  assert.equal(manualDraft.status, 200);
  const manualPublish = await store.invoke('PATCH', { id: manual.id, expectedUpdatedAt: manualDraft.payload.rows[0].updated_at, status: 'LIVE', lane: 'serving' });
  assert.equal(manualPublish.status, 200, JSON.stringify(manualPublish.payload));
  const manualRead = await store.invoke('POST', { keys: [manual.content_key] }, '/api/content-reader');
  assert.equal(manualRead.payload.rows[0].body, manual.body + '\n\nComplete private addition.');
  store.rows.delete(manual.id);
  const result = await store.invoke('POST', { action: 'composition-catalog' }, '/api/admin/content-live-status');
  assert.equal(result.status, 200);
  assert.equal(fallbackHoroscopeSources(result.payload.rows.map(row => ({ ...row, id: `package:${row.content_key}` }))).length, 1314);
  for (const [index, key] of keys.entries()) {
    const record = servingPackageRecords.get(key)!;
    const field = typeof record.body_you === 'string' ? 'body_you' : 'body';
    const row = { id: `a0000000-0000-4000-8000-${String(501 + index).padStart(12, '0')}`,
      content_key: key, surface: 'sky', mode: 'in_depth', status: 'DRAFT', lane: 'reference', review_state: null,
      provider: 'tldrastro-fallback-architecture-v3', block_type: 'fallback_hook', event_type: 'fallback-hook',
      headline: record.headline, summary: '', body: record[field], facts: { fallbackArchitectureV3: true },
      source_snapshot: { sourcePackage: 'tldrastro-fallback-architecture-v3' }, updated_at: '2026-10-31T12:00:00Z',
      sections: { packageRecord: structuredClone(record), packageOriginalRecord: structuredClone(record) } };
    store.rows.set(row.id, row);
    const held = await store.invoke('POST', { action: 'retire', contentKey: key, id: row.id, expectedUpdatedAt: row.updated_at }, '/api/admin/content-publication');
    assert.equal(held.status, 200, JSON.stringify(held.payload));
    assert.equal(held.payload.publication.state, 'retired');
    const tarot = 'Synthetic draft opening.\n\nThis mentions Tarot and the Major Arcana. Complete draft ending.';
    const draftResult = await store.invoke('PATCH', { id: row.id, expectedUpdatedAt: row.updated_at,
      sections: { ...row.sections, packageDraft: { ...record, [field]: tarot } } });
    assert.equal(draftResult.status, 200, JSON.stringify(draftResult.payload));
    const draft = draftResult.payload.rows[0];
    assert.equal((await store.publication.publications()).find(item => item.content_key === key)?.state, 'retired');
    const privateRead = await store.invoke('POST', { keys: [key] }, '/api/content-reader');
    assert.equal(privateRead.payload.rows.length, 0, 'Saving a draft must not undo retirement.');
    const reopened = await store.invoke('GET', undefined, `/api/admin/generated-content?id=${row.id}`);
    assert.equal(reopened.payload.rows[0].sections.packageDraft[field], tarot);
    const stale = await store.invoke('PATCH', { id: row.id, expectedUpdatedAt: row.updated_at, ownerAction: 'approve-package-revision' });
    assert.equal(stale.status, 409, 'Topic freedom must preserve version checks.');
    const published = await store.invoke('PATCH', { id: row.id, expectedUpdatedAt: draft.updated_at, ownerAction: 'approve-package-revision' });
    assert.equal(published.status, 200, JSON.stringify(published.payload));
    const response = await store.invoke('POST', { keys: [key] }, '/api/content-reader');
    assert.equal(response.status, 200);
    assert.equal(response.payload.rows[0].sections.packageRecord[field], tarot);
    const publishedRecord = response.payload.rows[0].sections.packageRecord;
    for (const reader_content_type of ['astrology', 'mixed']) {
      const typed = { ...publishedRecord, reader_content_type };
      for (const eligible of [nodeEligible, browserEligible]) {
        assert.equal(eligible(typed), true, key + ': topic cannot veto published copy');
        assert.equal(eligible({ ...typed, review_status: 'needs_review' }), false);
      }
      if (key.includes('/new-moon/')) {
        const identity = fallbackHoroscopeIdentity(key)!;
        for (const factory of [sourceFactory, shippedFactory]) {
          const renderer = factory({ authoredCards: [typed] }, { templates: [] }, { hookRows: [{
            contentKey: 'fallback-hook/lunation-cycle-anchor/new', review_status: 'approved', body_you: 'Synthetic calculated cycle context.'
          }], vocabularyRows: [] });
          const rendered = renderer.renderLunationHoroscope({ kind: 'new-moon', sign: identity.sign!,
            risingSign: identity.risingSign!, house: identity.house!, moonHouse: identity.house! });
          assert.ok(rendered.body.includes(tarot), key + ': browser source and shipped artifact preserve the complete passage');
        }
      }
    }
    assert.deepEqual(store.rows.get(row.id).sections.packageOriginalRecord, record);
    const live = published.payload.rows[0];
    const retired = await store.invoke('POST', { action: 'retire', contentKey: key, id: live.id, expectedUpdatedAt: live.updated_at }, '/api/admin/content-publication');
    assert.equal(retired.status, 200);
    const restored = await store.invoke('POST', { action: 'publish', contentKey: key, id: live.id, expectedUpdatedAt: live.updated_at }, '/api/admin/content-publication');
    assert.equal(restored.status, 200, JSON.stringify(restored.payload));
    const restoredRead = await store.invoke('POST', { keys: [key] }, '/api/content-reader');
    assert.equal(restoredRead.payload.rows[0].sections.packageRecord[field], tarot);
    assert.deepEqual(published.payload.rows[0].sections.packageOriginalRecord, record);
    assert.equal((await store.publication.publications()).find(item => item.content_key === key)?.state, 'live');
  }
  assert.equal(JSON.stringify([...servingPackageRecords]), originals);
  console.log('PASS: 1,314 canonical fallback sources; same Sky source selection; actual-handler tarot draft retention, manual and package publication, typed astrology revision, retirement restoration, stale-version rejection and exact reader copy.');
} finally { await store.close(); }
