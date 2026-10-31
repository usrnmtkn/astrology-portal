import assert from 'node:assert/strict';
import { servingPackageRecords } from '../api/_lib/serving-package-records';
import { fallbackHoroscopeIdentity, fallbackHoroscopeSources } from '../apps/admin/src/fallbackHoroscopeSources';
import { relatedHousePassages, relatedLunationHoroscopes, skyPlacementBodies, skyPlacementSigns } from '../apps/admin/src/skyWriteupRelations';
import { createApiStore } from '../tests/helpers/calendar-review-api.mjs';

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
  'authored/book-ritual-and-the-moon/lunation-horoscope/full-moon/taurus/rising-taurus/house-1',
  'authored/lunation-eclipse-house-layer/solar/house-1'
];
const store = await createApiStore([]);
try {
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
    store.rows.set(row.id, { ...row, status: 'LIVE', lane: 'serving', sections: { ...row.sections, packageRecord: { ...record, [field]: tarot } } });
    const restoreRejected = await store.invoke('POST', { action: 'publish', contentKey: key, id: row.id, expectedUpdatedAt: row.updated_at }, '/api/admin/content-publication');
    assert.equal(restoreRejected.status, 422);
    assert.match(restoreRejected.payload.error, /tarot references/iu);
    store.rows.set(row.id, row);
    const draftResult = await store.invoke('PATCH', { id: row.id, expectedUpdatedAt: row.updated_at,
      sections: { ...row.sections, packageDraft: { ...record, [field]: tarot } } });
    assert.equal(draftResult.status, 200, JSON.stringify(draftResult.payload));
    const draft = draftResult.payload.rows[0];
    const before = JSON.stringify(store.rows.get(row.id));
    const rejected = await store.invoke('PATCH', { id: row.id, expectedUpdatedAt: draft.updated_at, ownerAction: 'approve-package-revision' });
    assert.equal(rejected.status, 409, JSON.stringify(rejected.payload));
    assert.match(rejected.payload.error, /tarot references/iu);
    assert.equal(JSON.stringify(store.rows.get(row.id)), before, 'Rejected publication preserves the draft and original.');
    assert.equal((await store.publication.publications()).find(item => item.content_key === key)?.state, 'retired');
    const reopened = await store.invoke('GET', undefined, `/api/admin/generated-content?id=${row.id}`);
    assert.equal(reopened.payload.rows[0].sections.packageDraft[field], tarot);
    const clean = '\nSynthetic complete owner rewrite opening.\n\nThe complete owner rewrite ending.\n';
    const saved = await store.invoke('PATCH', { id: row.id, expectedUpdatedAt: draft.updated_at,
      sections: { ...draft.sections, packageDraft: { ...record, [field]: clean } } });
    assert.equal(saved.status, 200, JSON.stringify(saved.payload));
    const published = await store.invoke('PATCH', { id: row.id, expectedUpdatedAt: saved.payload.rows[0].updated_at, ownerAction: 'approve-package-revision' });
    assert.equal(published.status, 200, JSON.stringify(published.payload));
    const response = await store.invoke('POST', { keys: [key] }, '/api/content-reader');
    assert.equal(response.status, 200);
    assert.equal(response.payload.rows[0].sections.packageRecord[field], clean);
    assert.deepEqual(published.payload.rows[0].sections.packageOriginalRecord, record);
    assert.equal((await store.publication.publications()).find(item => item.content_key === key)?.state, 'live');
  }
  assert.equal(JSON.stringify([...servingPackageRecords]), originals);
  console.log('PASS: 1,314 canonical fallback sources across all 14 supported bodies, 288 lunations and 42 eclipse units; same Sky source selection; actual-handler draft retention, tarot publication rejection, retirement restoration and exact reader revision.');
} finally { await store.close(); }
