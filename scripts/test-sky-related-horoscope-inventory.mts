import assert from 'node:assert/strict';
import { createApiStore } from '../tests/helpers/calendar-review-api.mjs';
import { emptyHoroscopeEdition, horoscopeEditionKey } from '../apps/web/src/content/horoscopeEditions.mjs';

const articleStartsAt = '2026-10-24T00:00:00.000Z', articleEndsAt = '2026-11-13T00:00:00.000Z';
function row(index: number, startsAt: string, updatedAt = '2026-01-01T00:00:00.000Z') {
  const edition = emptyHoroscopeEdition({ period: 'weekly', audience: 'rising', timeZone: 'America/New_York',
    startsAt, endsAt: new Date(Date.parse(startsAt) + 7 * 86400000).toISOString() });
  return { id: `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`, content_key: horoscopeEditionKey(edition.window),
    headline: `Synthetic edition ${index}`, body: 'Synthetic inventory text.', summary: '',
    sections: { horoscopeEdition: edition }, facts: {}, source_snapshot: {}, surface: 'sky', mode: 'article',
    event_type: 'horoscope-edition', status: 'DRAFT', lane: 'reference', review_state: null, updated_at: updatedAt };
}
const matching = Array.from({ length: 61 }, (_, index) => row(index + 1,
  new Date(Date.parse('2026-10-25T00:00:00.000Z') + index * 3600000).toISOString(),
  index < 31 ? '2026-01-01T00:00:00.000Z' : '2026-01-02T00:00:00.000Z'));
matching.push(row(100, '2026-10-20T00:00:00.000Z'));
const recentOutside = Array.from({ length: 40 }, (_, index) => row(200 + index,
  new Date(Date.parse('2027-01-01T00:00:00.000Z') + index * 3600000).toISOString(), '2026-11-03T00:00:00.000Z'));
const touchesStart = row(300, '2026-10-17T00:00:00.000Z'), touchesEnd = row(301, articleEndsAt);
const wrongMode = { ...row(302, '2026-10-30T12:00:00.000Z'), mode: 'in_depth' };
const completedRevision = { ...row(303, '2026-10-30T13:00:00.000Z'), mode: 'studio-draft', event_type: 'horoscope-edition-revision', status: 'ARCHIVED' };
const originalFetch = globalThis.fetch;
const store = await createApiStore([...matching, ...recentOutside, touchesStart, touchesEnd, wrongMode, completedRevision], { projectSelect: true });
const storageFetch = globalThis.fetch;
let storageReads = 0;
globalThis.fetch = async (input, options = {}) => {
  assert.equal(options.method ?? 'GET', 'GET', 'Inventory browsing never writes storage');
  assert.equal(new URL(String(input)).origin, 'https://calendar-api.invalid', 'No real network is permitted');
  storageReads++;
  return storageFetch(input, options);
};
const inventory = { horoscopeEditions: 'true', editionInventory: 'true' };
const paged = { ...inventory, editionInventoryPage: 'true' };
const period = { ...paged, articleStartsAt, articleEndsAt };
const get = (params: Record<string, string>, secret?: string) => store.invoke('GET', undefined,
  '/api/admin/generated-content?' + new URLSearchParams(params), secret);
try {
  const before = JSON.stringify([...store.rows.values()]);
  const legacy = await get(inventory);
  assert.equal(legacy.status, 200);
  assert.equal(legacy.payload.rows.length, 30, 'Existing callers retain their bounded list');
  assert.ok(legacy.payload.rows.every((value: any) => value.sections.horoscopeEdition.window.startsAt.startsWith('2027-')),
    'The recent-only control omits the older matching article period');
  assert.equal(Object.hasOwn(legacy.payload, 'nextCursor'), false);

  const found: any[] = []; const cursors = new Set<string>(); let cursor = '', pages = 0;
  do {
    const response = await get({ ...period, ...(cursor ? { cursor } : {}) });
    assert.equal(response.status, 200, JSON.stringify(response.payload));
    assert.ok(response.payload.rows.length <= 30);
    assert.ok(response.payload.rows.every((value: any) => value.inventory_only));
    assert.ok(response.payload.rows.every((value: any) => value.horoscope_window && !('sections' in value) && !('body' in value)), 'Paged metadata never transfers complete horoscope passages');
    found.push(...response.payload.rows); pages++;
    cursor = response.payload.nextCursor;
    if (cursor) { assert.equal(cursors.has(cursor), false, 'Cursor must advance'); cursors.add(cursor); }
  } while (cursor);
  const expected = [...matching].sort((a, b) => b.updated_at.localeCompare(a.updated_at) || b.id.localeCompare(a.id));
  assert.equal(pages, 3);
  assert.deepEqual(found.map(value => value.id), expected.map(value => value.id), 'Older matches, timestamp ties and partial overlaps are complete and ordered');
  assert.equal(new Set(found.map(value => value.id)).size, found.length, 'No duplicate or skipped edition at a page boundary');
  assert.equal(found.some(value => [touchesStart.id, touchesEnd.id, wrongMode.id, completedRevision.id].includes(value.id)), false,
    'Half-open boundaries and lifecycle/mode filters survive cursor composition');

  const none = await get({ ...paged, articleStartsAt: '2028-01-01T00:00:00.000Z', articleEndsAt: '2028-02-01T00:00:00.000Z' });
  assert.equal(none.status, 200); assert.deepEqual(none.payload.rows, []); assert.equal(none.payload.nextCursor, null);
  const unscoped = await get(paged);
  assert.equal(unscoped.status, 200); assert.equal(unscoped.payload.rows.length, 30); assert.equal(typeof unscoped.payload.nextCursor, 'string');
  const next = await get({ ...paged, cursor: unscoped.payload.nextCursor });
  assert.equal(next.status, 200);
  assert.equal(next.payload.rows.some((value: any) => unscoped.payload.rows.some((previous: any) => previous.id === value.id)), false);

  const invalidCursors = ['invalid', Buffer.from(JSON.stringify({ id: 'bad,or(id.gt.0)', updatedAt: '2026-01-01T00:00:00.000Z' })).toString('base64url'),
    Buffer.from(JSON.stringify({ id: matching[0].id, updatedAt: 'Jan 1, 2026' })).toString('base64url')];
  const invalid: Record<string, string>[] = [
    { ...paged, articleStartsAt }, { ...period, articleEndsAt: articleStartsAt },
    { ...period, articleStartsAt: '2026-10-24T00:00:00Z' },
    { ...period, id: matching[0].id }, { ...inventory, cursor: 'invalid' },
    ...invalidCursors.map(value => ({ ...period, cursor: value }))
  ];
  for (const params of invalid) assert.equal((await get(params)).status, 400, 'Malformed or incompatible paging request must fail');
  assert.equal((await get(period, 'not-an-owner')).status, 401);
  assert.equal(JSON.stringify([...store.rows.values()]), before, 'Every stored document remains exact');
  console.log(JSON.stringify({ passed: true, matches: found.length, pages, storageReads, realNetwork: 0, writes: 0,
    legacyDefaultUnchanged: true, boundariesAndCursorTies: true, sourceRowsUnchanged: true }));
} finally { await store.close(); globalThis.fetch = originalFetch; }
