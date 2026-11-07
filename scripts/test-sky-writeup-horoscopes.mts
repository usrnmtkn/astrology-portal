import assert from 'node:assert/strict';
import { createApiStore } from '../tests/helpers/calendar-review-api.mjs';
import { skyPlacementSourceFixture } from '../tests/helpers/sky-placement-source-fixture.mts';
import { reviseSkyArticleEdition, skyArticleEditableFields, skyArticleReaderCopyIsConsistent } from '../apps/web/src/content/skyArticleTemplateCompiler';
import { skyArticleCompiledHashMatches } from '../api/_lib/sky-article-reader-integrity';
import { WRITEUP_HOROSCOPE_SIGNS, writeupHoroscopesReady } from '../src/shared/skyWriteupHoroscopes';
import { workspaceVisitFacts } from '../tests/helpers/sky-placement-workspace-fixtures';
import { placementVisitDraft } from '../apps/admin/src/skyPlacementWorkspaceModel';
import { skyIngressEssayReaderSection } from '../apps/web/src/content/skyIngressEssayReader';

const { active, edition } = await skyPlacementSourceFixture('mercury', 'scorpio');
const readings = WRITEUP_HOROSCOPE_SIGNS.map(sign => ({ sign, body: `Synthetic ${sign} opening.\n\nSynthetic ${sign} complete final sentence.` }));
const partial = await reviseSkyArticleEdition(edition, { ...skyArticleEditableFields(edition), writeupHoroscopes: readings.map((p, i) => ({ ...p, body: i ? '' : p.body })) });
assert.equal(writeupHoroscopesReady(partial.writeupHoroscopes), false);
assert.equal(skyArticleReaderCopyIsConsistent(partial), true);
const draft = { ...structuredClone(active), status: 'DRAFT', lane: 'reference', review_state: 'owner-review-required', source_snapshot: {} };
const store = await createApiStore([draft], { uuidIds: true });
const patch = async (row: any, ownerAction: string, extra = {}, expected = 200) => {
  const result = await store.invoke('PATCH', { id: row.id, expectedUpdatedAt: row.updated_at, ownerAction, ...extra });
  assert.equal(result.status, expected, JSON.stringify(result.payload)); return result.payload.rows?.[0];
};
const read = async () => (await store.invoke('POST', { keys: [active.content_key] }, '/api/content-reader')).payload.rows;
try {
  const createdDraft = await placementVisitDraft(workspaceVisitFacts('venus', 'scorpio', '2026-10-24', '2026-11-13'), {
    headline: 'Synthetic new write-up', summary: 'Synthetic new summary.', body: 'Synthetic new complete article.', writeupHoroscopes: partial.writeupHoroscopes
  });
  const created = await store.invoke('POST', { rows: [createdDraft] });
  assert.equal(created.status, 200, JSON.stringify(created.payload));
  assert.deepEqual(created.payload.rows[0].sections.skyArticleEdition.writeupHoroscopes, partial.writeupHoroscopes);
  let saved = await patch(draft, 'save-sky-article-edition-revision', { sections: { skyArticleEdition: partial } });
  assert.deepEqual(saved.sections.skyArticleEdition.writeupHoroscopes, partial.writeupHoroscopes);
  assert.equal(saved.body, edition.body);
  assert.deepEqual(await read(), []);
  const before = JSON.stringify([...store.rows]);
  await patch(saved, 'approve-sky-article-edition', {}, 409);
  assert.equal(JSON.stringify([...store.rows]), before, 'An incomplete set cannot write or publish.');
  const complete = await reviseSkyArticleEdition(saved.sections.skyArticleEdition, { ...skyArticleEditableFields(saved.sections.skyArticleEdition), writeupHoroscopes: readings });
  saved = await patch(saved, 'save-sky-article-edition-revision', { sections: { skyArticleEdition: complete } });
  await patch(draft, 'save-sky-article-edition-revision', { sections: { skyArticleEdition: complete } }, 409);
  assert.deepEqual(await read(), []);
  const past = '2026-10-24T08:00:00.000Z';
  saved = await patch(saved, 'set-sky-article-publication-date', { skyPublicationAt: past });
  saved = await patch(saved, 'approve-sky-article-edition');
  assert.equal(saved.published_at, past);
  assert.equal(saved.sections.skyArticleEdition.transitStartInstant, edition.transitStartInstant);
  assert.equal(saved.sections.skyArticleEdition.transitEndInstant, edition.transitEndInstant);
  const publicRows = await read();
  assert.equal(publicRows.length, 1);
  assert.deepEqual(publicRows[0].sections.skyArticleEdition.writeupHoroscopes, readings);
  const row = { ...saved, contentKey: saved.content_key, reviewState: saved.review_state, sourceSnapshot: saved.source_snapshot, updatedAt: saved.updated_at };
  const selected = skyIngressEssayReaderSection([row], { activeInstant: edition.transitStartInstant, planet: edition.planet, sign: edition.sign });
  assert.deepEqual(selected?.risingHoroscopes.map(p => p.body), readings.map(p => p.body));
  assert.deepEqual(selected?.risingHoroscopes.map(p => p.risingSign), WRITEUP_HOROSCOPE_SIGNS);
  assert.equal(selected?.body, edition.body);
  const sorted = JSON.parse(JSON.stringify(complete, (_key, value) => value && typeof value === 'object' && !Array.isArray(value)
    ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b))) : value));
  assert(skyArticleCompiledHashMatches(sorted), 'JSONB order preserves the complete sign copy hash.');
  sorted.writeupHoroscopes[0].body += ' Tampered.';
  assert.equal(skyArticleCompiledHashMatches(sorted), false);
  const duplicate = readings.map(p => ({ ...p })); duplicate[1].sign = 'aries';
  await assert.rejects(reviseSkyArticleEdition(edition, { ...skyArticleEditableFields(edition), writeupHoroscopes: duplicate }), /distinct signs/u);
} finally { store.close(); }
console.log('PASS: article-owned sign drafts round-trip through the actual handler; incomplete sets stay private; stale saves fail; complete approved copy reaches all twelve reader passages with unchanged dates and body, backdating and tamper/JSONB checks.');
