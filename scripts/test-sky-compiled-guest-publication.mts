import assert from 'node:assert/strict';
import { skyIngressEssayReaderSection } from '../apps/web/src/content/skyIngressEssayReader';
import { syntheticLibrarySkyArticle } from '../tests/helpers/article-library-fixture';
const raw = await syntheticLibrarySkyArticle();
const stamp = '2026-10-09T00:00:00.123456Z';
const row: any = { contentKey: raw.content_key, id: raw.id, updatedAt: stamp, status: raw.status,
  lane: raw.lane, reviewState: raw.review_state, sections: raw.sections, sourceSnapshot: raw.source_snapshot };
const publication: any = { content_key: row.contentKey, state: 'live', revision: 1, row_id: row.id,
  row_updated_at: stamp, updated_at: stamp };
const context = { activeInstant: '2026-10-12T16:00:00Z', planet: 'sun', sign: 'libra' };
const accepts = (candidate: any, published: any = publication, selection = context) =>
  Boolean(skyIngressEssayReaderSection([candidate], selection, () => published));
assert.equal(accepts(row), true, 'Exact current cached or fetched compiled row is enough; optional early transport is not admission.');
for (const changed of [undefined, { ...publication, state: 'retired' }, { ...publication, row_id: null },
  { ...publication, row_updated_at: null }, { ...publication, row_id: 'different-row' },
  { ...publication, row_updated_at: '2026-10-09T00:00:00.123457Z' }]) {
  const lookup = () => changed;
  assert.equal(Boolean(skyIngressEssayReaderSection([{ ...row, targetDate: '2026-10-12' }], context, lookup)), false,
    'Dated rows do not bypass the optimization exact publication identity.');
}
assert.equal(accepts({ ...row, id: ' ' }, { ...publication, row_id: ' ' }), false);
assert.equal(accepts({ ...row, updatedAt: 'invalid' }), false);
assert.equal(accepts(row, publication, { ...context, activeInstant: '2026-11-12T16:00:00Z' }), false);
assert.equal(accepts({ ...row, status: 'DRAFT' }), false);
assert.equal(accepts({ ...row, sourceSnapshot: {} }), false);
console.log('PASS: exact compiled guest identity, microsecond revision, missing metadata, dated bypass, draft, approval and date-window negatives.');

const normal = skyIngressEssayReaderSection([row], context);
const strict = skyIngressEssayReaderSection([row], context, () => publication);
assert.deepEqual(strict, normal, 'Strict admission cannot alter normal compiled output.');
const wrongFirst = { ...row, id: 'synthetic-old-row', updatedAt: '2026-10-08T00:00:00Z', sourceSnapshot: {} };
for (const candidates of [[wrongFirst, row], [row, wrongFirst]]) {
  assert.deepEqual(skyIngressEssayReaderSection(candidates, context, () => publication), normal,
    'Exact identity binds the actual approved selection, not first matching contentKey.');
}
const oldApproved = { ...row, id: 'synthetic-old-row', updatedAt: '2026-10-08T00:00:00Z' };
assert.equal(skyIngressEssayReaderSection([oldApproved, row], context, () => publication), null,
  'An old approved candidate chosen by normal stable ordering cannot prove a different current row.');
assert.deepEqual(skyIngressEssayReaderSection([row, oldApproved], context, () => publication), normal);
console.log('PASS: default/strict output parity and same-key candidate identity/order controls.');
