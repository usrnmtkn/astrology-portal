import assert from 'node:assert/strict';
import { placementSourcesReaderHref, selectPlacementSources, sharedSkyPlacementKeys } from '../apps/admin/src/skyPlacementSourceSelection';
import { skyPlacementSourceFixture } from '../tests/helpers/sky-placement-source-fixture.mts';

const { active, pending, fallback } = await skyPlacementSourceFixture();
const rows = [active, pending, fallback];
const instant = '2026-10-21T12:00:00Z';
const select = (candidates = rows, liveIds = new Set([active.id, fallback.id]), at = instant) =>
  selectPlacementSources(candidates, 'saturn', 'aries', at, liveIds);
assert.equal(select().active?.id, active.id);
assert.deepEqual(select().pending.map(row => row.id), [pending.id]);
assert.deepEqual(select().fallback.map(row => row.id), [fallback.id]);
assert.equal(select(rows, new Set()).active, null, 'A saved LIVE badge cannot replace verified publication.');
assert.equal(select(rows, undefined, '2026-10-23T00:00:00Z').active, null, 'The reader window excludes its end instant.');
assert.equal(select(rows, undefined, '2026-09-22T00:00:00Z').active?.id, active.id);
assert.equal(select(rows, undefined, '2026-09-21T23:59:59Z').active, null);
assert.equal(select([{ ...active, source_snapshot: {} }, pending, fallback]).active, null, 'Exact copy approval is required.');
assert.equal(select([{ ...active, review_state: 'owner-review-required' }, pending, fallback]).active, null);
assert.equal(select([{ ...active, status: 'DRAFT' }, pending, fallback]).active, null);
assert.equal(select([{ ...active, id: 'same-key-draft', status: 'DRAFT' }, active, pending, fallback]).active?.id, active.id);
assert.equal(select([active, { ...pending, status: 'ARCHIVED', review_state: 'published-revision' }, fallback]).pending.length, 0);
assert.equal(selectPlacementSources(rows, 'saturn', 'pisces', instant, new Set([active.id])).pending.length, 0);
assert.deepEqual(sharedSkyPlacementKeys('moon', 'aries'), [
  'fallback-hook/sky-placement-hook/moon/aries', 'fallback-hook/sky-placement-lived/moon/aries', 'fallback-hook/sky-placement-turn/moon/aries'
]);
assert.deepEqual(sharedSkyPlacementKeys('north-node', 'aquarius'), ['sky-nodes/north-node/aquarius']);
assert.deepEqual(sharedSkyPlacementKeys('lilith', 'sagittarius'), ['sky-lilith/article/sagittarius']);
assert.match(placementSourcesReaderHref('saturn', 'aries', instant), /^\/\?date=2026-10-21#\/sky\/placement\/saturn\/aries$/);
assert.equal(select([active, pending, { ...fallback, id: 'newer-fallback-draft', status: 'DRAFT', updated_at: '2026-10-22T00:00:00Z' }, fallback]).fallback[0].id, fallback.id);
const seasonalKey = 'sky-season-fallback/libra-2026/moon/aries/2026-10-20';
const seasonal = { ...fallback, id: 'seasonal-moon', content_key: seasonalKey,
  sections: { seasonFallback: { schema: 'libra-season-2026-placement-fallback/v1', body: 'moon', sign: 'aries',
    entry: '2026-10-20T00:00:00Z', exit: '2026-10-23T00:00:00Z', seasonStart: '2026-10-20T00:00:00Z', seasonEnd: '2026-10-23T00:00:00Z' } },
  source_snapshot: { ownerApproval: { approved: true, action: 'approve-sky-season-fallback', contentKey: seasonalKey,
    activeStart: '2026-10-20T00:00:00Z', activeEnd: '2026-10-23T00:00:00Z' } } };
assert.equal(selectPlacementSources([seasonal], 'moon', 'aries', instant, new Set([seasonal.id])).active?.id, seasonal.id);
console.log('Sky placement source selection passed: publication, exact approval, date boundaries, pending revisions and specialized fallback sources.');
