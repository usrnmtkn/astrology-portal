import assert from 'node:assert/strict';
import { createApiStore } from '../tests/helpers/calendar-review-api.mjs';
import { skyPlacementAspectBridgeDraft } from '../apps/admin/src/skyPlacementAspectBridgeDraft';
import { skyPlacementAspectBridgeKey, skyPlacementAspectBridgeIdentity, skyPlacementAspectBridgeErrors,
  skyPlacementAspectParagraphs } from '../apps/web/src/content/skyPlacementAspectBridge';
import { isPersonalTransitSource } from '../apps/web/src/services/personalTransitPublication';
import { isSkyPlacementFallbackPartitionKey } from '../apps/web/src/services/skyPlacementSourceScope';
import { packageFallbackArchitectureV3CoreRows } from '../apps/web/src/services/fallbackArchitectureV3CorePackaging';
import { installContentPublications } from '../apps/web/src/content/contentPublicationState';
import { fallbackV3HookBody, installPersonalTransitFallbackArchitectureV3Bundle } from '../apps/web/src/content/fallbackArchitectureV3Runtime';
import { skyActiveChartEvents } from '../apps/web/src/utils/articleAspects';
import { fallbackHookDisplayTitle } from '../apps/admin/src/fallbackHookTitle';

const identity = { house: 8, transiting: 'venus', aspect: 'trine', natal: 'mars' };
const key = skyPlacementAspectBridgeKey(identity)!;
assert.deepEqual(skyPlacementAspectBridgeIdentity(key), identity);
assert.equal(fallbackHookDisplayTitle(key), 'House 8 bridge · Venus trine your Mars');
for (const house of [0, 13, 1.5, NaN]) assert.equal(skyPlacementAspectBridgeKey({ ...identity, house }), null);
assert.equal(skyPlacementAspectBridgeIdentity(key + '/extra'), null);
assert.equal(skyPlacementAspectBridgeIdentity(key.replace('/8/', '/08/')), null);
assert.notEqual(key, skyPlacementAspectBridgeKey({ ...identity, natal: 'venus', transiting: 'mars' }));
assert.notEqual(key, skyPlacementAspectBridgeKey({ ...identity, house: 7 }));
assert.notEqual(key, skyPlacementAspectBridgeKey({ ...identity, aspect: 'square' }));
assert(isPersonalTransitSource(key));
assert(!isSkyPlacementFallbackPartitionKey(key), 'Independent personal source hydration must not drop the bridge as a Sky-only row.');
assert(skyPlacementAspectBridgeErrors(key, '').length);
assert(skyPlacementAspectBridgeErrors(key, '{{untilDate}}').length);
assert(skyPlacementAspectBridgeErrors(key, 'Through November 15, 2026.').length);
assert(skyPlacementAspectBridgeErrors(key, 'Through Nov. 15, 2026.').length);

const bridge = 'Synthetic bridge opening. Synthetic bridge final sentence.';
const passage = 'Synthetic source opening.\n\nSynthetic source final sentence.';
const time = 'Until November 15, 2026';
const joined = skyPlacementAspectParagraphs({ body: passage, bridge, timing: time }).join('\n\n');
assert.deepEqual(skyPlacementAspectParagraphs({ body: null, bridge, timing: time }), []);
assert.equal(joined, `${time}. ${bridge} ${passage}`);
assert.equal(joined.replace(`${time}. ${bridge} `, ''), passage, 'Every byte of the source passage remains.');
for (const timed of [
  `Through November 15, 2026. ${passage}`,
  `${passage}\n\nThis contact continues until November 15, 2026.`,
  `Until November 15, 2026, the synthetic source opening stays complete.\n\nSynthetic source final sentence.`
]) {
  const result = skyPlacementAspectParagraphs({ body: timed, bridge, timing: time }).join('\n\n');
  assert.equal(result.match(/November 15, 2026/gu)?.length, 1);
  assert.equal(result.replace(`${bridge} `, '').replace(` ${bridge}`, ''), timed);
  if (timed.startsWith('Through') || timed.startsWith('Until')) assert(result.indexOf('November 15') < result.indexOf(bridge));
}
assert.equal(skyPlacementAspectParagraphs({ body: 'This lasts a week or two. ' + passage, bridge, timing: time }).join('\n\n'), `${bridge} This lasts a week or two. ${passage}`);
const abbreviated = `Through Nov. 15, 2026. ${passage}`;
assert.equal(skyPlacementAspectParagraphs({ body: abbreviated, bridge, timing: time }).join('\n\n'), `Through Nov. 15, 2026. ${bridge} ${passage}`);
const embeddedAbbreviation = `${passage}\n\nThis contact continues until Nov 15, 2026.`;
assert.equal(skyPlacementAspectParagraphs({ body: embeddedAbbreviation, bridge, timing: time }).join('\n\n'), `${bridge} ${embeddedAbbreviation}`);
const nodes = skyActiveChartEvents([
  { key: 'north', heading: 'Venus conjunction your North Node', body: passage, bridge, timing: time },
  { key: 'south', heading: 'Venus opposition your South Node', body: passage, bridge: 'Other bridge.', timing: time }
]);
assert.equal(nodes.length, 1);
assert.equal(nodes[0].members[0].bridge, bridge);
assert.equal(nodes[0].members[1].bridge, 'Other bridge.');

const store = await createApiStore([]);
try {
  const { id: _id, ...draft } = skyPlacementAspectBridgeDraft(key);
  const created = await store.invoke('POST', { ...draft, eventType: 'sky-placement-house-aspect-bridge', reviewStatus: 'needs_review' });
  assert.equal(created.status, 200, JSON.stringify(created.payload));
  let row = created.payload.rows[0];
  const read = async () => {
    const response = await fetch('/api/content-reader', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ keys: [key] }) });
    assert.equal(response.status, 200); return response.json();
  };
  assert.equal((await read()).rows.length, 0);
  const emptyPublication = await store.invoke('PATCH', { id: row.id, expectedUpdatedAt: row.updated_at, status: 'LIVE', lane: 'serving', reviewState: null });
  assert.equal(emptyPublication.status, 200, JSON.stringify(emptyPublication.payload));
  row = emptyPublication.payload.rows[0];
  assert.equal(row.status, 'DRAFT', 'A status patch cannot publish an empty bridge.');
  assert.equal((await read()).rows.length, 0);
  const saved = await store.invoke('PATCH', { id: row.id, expectedUpdatedAt: row.updated_at,
    sections: { ...row.sections, packageDraft: { body: bridge } }, reviewStatus: 'needs_review' });
  assert.equal(saved.status, 200, JSON.stringify(saved.payload));
  row = saved.payload.rows[0];
  assert.equal(row.sections.packageDraft.body, bridge);
  assert.equal((await read()).rows.length, 0, 'Saved drafts stay private.');
  const stale = await store.invoke('PATCH', { id: row.id, expectedUpdatedAt: created.payload.rows[0].updated_at,
    sections: { ...row.sections, packageDraft: { body: 'Stale replacement.' } } });
  assert.equal(stale.status, 409);
  const published = await store.invoke('PATCH', { id: row.id, expectedUpdatedAt: row.updated_at, ownerAction: 'approve-package-revision' });
  assert.equal(published.status, 200, JSON.stringify(published.payload));
  row = published.payload.rows[0];
  const liveStatus = await store.invoke('POST', { ids: [row.id] }, '/api/admin/content-live-status');
  assert.equal(liveStatus.status, 200, JSON.stringify(liveStatus.payload));
  assert.equal(liveStatus.payload.statuses[0]?.live, true, JSON.stringify(liveStatus.payload));
  const result = await read();
  assert.equal(result.rows.length, 1);
  assert.equal(result.rows[0].sections.packageRecord.body, bridge);
  installContentPublications(result.publications);
  const bundle = packageFallbackArchitectureV3CoreRows(result.rows, { keys: [] });
  assert.equal(bundle?.rowsFile.hookRows?.[0].body, bridge);
  installPersonalTransitFallbackArchitectureV3Bundle(bundle);
  assert.equal(fallbackV3HookBody(key), bridge, 'The actual reader hook lookup receives the published bridge.');
  assert.equal(fallbackV3HookBody(skyPlacementAspectBridgeKey({ ...identity, house: 7 })!), '');
  const retirement = await store.publication('https://calendar-api.invalid/rest/v1/rpc/retire_content_everywhere', {
    method: 'POST', body: JSON.stringify({ p_content_key: key, p_row_id: row.id, p_expected_updated_at: row.updated_at })
  });
  assert(retirement?.ok, await retirement?.text());
  const retired = await read();
  installContentPublications(retired.publications);
  assert.equal(retired.rows.length, 0);
  assert.equal(fallbackV3HookBody(key), '', 'Retirement removes the bridge without a bundled replacement.');
} finally { await store.close(); }
console.log('PASS: exact house/contact identity, intact source passages, single timing, grouped contacts, actual-handler draft/save/reopen/conflict/publication/reader hydration/retirement.');
