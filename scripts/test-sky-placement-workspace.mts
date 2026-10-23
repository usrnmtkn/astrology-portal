import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { skyPlacementBodies, skyPlacementSigns } from '../apps/admin/src/skyWriteupRelations';
import { assertPlacementVisit, placementEdition, placementTemplateKeys, placementVisitDraft, placementVisitRows, placementWorkspaceDocuments } from '../apps/admin/src/skyPlacementWorkspaceModel';
import { reviseSkyArticleEdition, skyArticleEditableFields } from '../apps/web/src/content/skyArticleTemplateCompiler';
import { workspaceFixtureRows, workspaceVisitFacts } from '../tests/helpers/sky-placement-workspace-fixtures';
import { studioApiStore } from '../tests/helpers/studio-api-store';

let combinations = 0;
for (const planet of skyPlacementBodies) for (const sign of skyPlacementSigns) {
  const facts = workspaceVisitFacts(planet, sign);
  const row = await placementVisitDraft(facts, { headline: `Synthetic ${planet}/${sign}`, summary: 'Explicit synthetic summary.', body: 'Synthetic opening.\n\nSynthetic ending.' });
  const edition = row.sections.skyArticleEdition;
  assert.equal(edition.contentKey, `sky-article/${planet}/${sign}/2026/2026-10-23`);
  assert.equal(edition.planet, planet); assert.equal(edition.sign, sign);
  assert.equal(edition.transitStartInstant, facts.transitStartInstant);
  assert.equal(edition.transitEndInstant, facts.transitEndInstant);
  assert.equal(edition.slotValues.articleBody, 'Synthetic opening.\n\nSynthetic ending.');
  assert.equal(row.status, 'DRAFT'); assert.equal(row.lane, 'reference');
  assert.deepEqual(edition.housePassages, []); assert.deepEqual(edition.aspectPassages, []);
  combinations++;
}
assert.throws(() => assertPlacementVisit(workspaceVisitFacts('sun', 'libra'), 'sun', 'scorpio'), /Choose a date/);
assert.throws(() => assertPlacementVisit({ ...workspaceVisitFacts(), transitEndInstant: 'invalid' }, 'sun', 'scorpio'), /incomplete/);
assert.ok(placementTemplateKeys('north-node', 'aquarius').includes('sky/article-template/nodes'));

const initial = await workspaceFixtureRows();
const stale = { ...initial[0], updated_at: '2026-01-01T00:00:00Z', body: 'Synthetic obsolete copy.' };
assert.equal(placementWorkspaceDocuments([initial[0]], [stale])[0].body, initial[0].body);
assert.equal(placementWorkspaceDocuments([stale], [initial[0]])[0].body, initial[0].body);
assert.equal(placementWorkspaceDocuments([initial[0]], [{ ...stale, inventory_only: true }])[0].body, initial[0].body);
const store = await studioApiStore(initial);
const protectedSources = initial.filter(row => row.id !== 'workspace-scorpio-draft');
try {
  const before = await store.call({ method: 'rows' });
  const publicationsBefore = await store.call({ method: 'publications' });
  const scorpio = before.find((row: any) => row.id === 'workspace-scorpio-draft');
  const rows = await store.call({ method: 'GET', url: '/api/admin/generated-content-inventory?contentKeyPrefix=sky-article%2Fsun%2Fscorpio%2F&status=all&visibility=all&limit=80' });
  assert.equal(rows.status, 200); assert.ok(rows.payload.rows.some((row: any) => row.id === scorpio.id));
  const edition = placementEdition(scorpio)!;
  const revised = await reviseSkyArticleEdition(edition, { ...skyArticleEditableFields(edition), headline: 'Synthetic edited title', body: `${edition.body}\n\nSynthetic new final sentence.` });
  const saved = await store.call({ method: 'PATCH', body: { id: scorpio.id, expectedUpdatedAt: scorpio.updated_at,
    ownerAction: 'save-sky-article-edition-revision', sections: { skyArticleEdition: revised } } });
  assert.equal(saved.status, 200, JSON.stringify(saved.payload));
  const actual = saved.payload.rows[0]; assert.equal(actual.status, 'DRAFT');
  assert.equal(actual.headline, 'Synthetic edited title'); assert.equal(actual.body, revised.body);
  assert.equal(actual.source_snapshot.ownerApproval, null);
  const reopened = await store.call({ method: 'GET', url: `/api/admin/generated-content-inventory?id=${actual.id}&status=all&visibility=all&limit=1` });
  assert.equal(reopened.payload.rows[0].body, revised.body);
  const stale = await store.call({ method: 'PATCH', body: { id: scorpio.id, expectedUpdatedAt: scorpio.updated_at,
    ownerAction: 'save-sky-article-edition-revision', sections: { skyArticleEdition: revised } } });
  assert.equal(stale.status, 409);
  for (const facts of [workspaceVisitFacts('venus', 'scorpio', '2026-09-10', '2026-10-25'),
    workspaceVisitFacts('venus', 'scorpio', '2026-12-04', '2027-01-07'), workspaceVisitFacts('pluto', 'aquarius', '2024-11-19', '2043-03-09'),
    workspaceVisitFacts('moon', 'taurus', '2026-10-25', '2026-10-27'), workspaceVisitFacts('north-node', 'aquarius')]) {
    const draft = await placementVisitDraft(facts, { headline: 'Synthetic dated title', summary: 'Synthetic summary.', body: 'Synthetic dated opening.\n\nSynthetic dated ending.' });
    const result = await store.call({ method: 'POST', body: { rows: [draft] } });
    assert.equal(result.status, 200, JSON.stringify(result.payload));
    assert.equal(result.payload.rows[0].status, 'DRAFT');
  }
  const after = await store.call({ method: 'rows' });
  for (const source of protectedSources) assert.deepEqual(after.find((row: any) => row.id === source.id), source, 'Default and reusable template are byte-identical.');
  assert.equal(after.find((row: any) => row.id === scorpio.id).body, revised.body, 'Other planet visits cannot overwrite Scorpio.');
  const venus = placementVisitRows(after, 'venus', 'scorpio');
  assert.equal(venus.length, 2); assert.notEqual(venus[0].content_key, venus[1].content_key);
  assert.deepEqual(await store.call({ method: 'publications' }), publicationsBefore, 'No publication was performed.');
} finally { store.close(); }

const liveInitial = await workspaceFixtureRows();
const liveEdition = placementEdition(liveInitial[0])!;
const liveRow = { ...liveInitial[0], status: 'LIVE', lane: 'serving', review_state: null,
  source_snapshot: { ...liveInitial[0].source_snapshot, review_status: 'approved', ownerApproval: {
    approved: true, action: 'approve-sky-article-edition', contentKey: liveEdition.contentKey,
    templateKey: liveEdition.templateKey, templateHash: liveEdition.templateHash,
    fixedProseHash: liveEdition.fixedProseHash, compiledHash: liveEdition.compiledHash
  } } };
const liveStore = await studioApiStore([liveRow, ...liveInitial.slice(1)]);
try {
  const before = await liveStore.call({ method: 'rows' });
  const publications = await liveStore.call({ method: 'publications' });
  const revised = await reviseSkyArticleEdition(liveEdition, { ...skyArticleEditableFields(liveEdition), headline: 'Synthetic separate revision' });
  const result = await liveStore.call({ method: 'PATCH', body: { id: liveRow.id, expectedUpdatedAt: liveRow.updated_at,
    ownerAction: 'save-sky-article-edition-revision', sections: { skyArticleEdition: revised } } });
  assert.equal(result.status, 200, JSON.stringify(result.payload));
  assert.equal(result.payload.rows[0].status, 'DRAFT');
  assert.equal(result.payload.rows[0].event_type, 'sky-article-edition-revision');
  assert.notEqual(result.payload.rows[0].id, liveRow.id);
  const after = await liveStore.call({ method: 'rows' });
  for (const row of before) assert.deepEqual(after.find((candidate: any) => candidate.id === row.id), row);
  assert.deepEqual(await liveStore.call({ method: 'publications' }), publications);
} finally { liveStore.close(); }
const ui = readFileSync('apps/admin/src/SkyPlacementWorkspace.tsx', 'utf8');
assert.doesNotMatch(ui, /sky-article-template-slots|generateUnsavedIngress|save-and-publish|approve-sky-article-edition['"]/);
assert.doesNotMatch(ui, /localStorage|sessionStorage/);
console.log(`Sky placement workspace: ${combinations} planet/sign identities; actual-handler create, exact draft reopen, stale-save protection, separate return visits, unchanged default/template/Scorpio, no generation or publication.`);
