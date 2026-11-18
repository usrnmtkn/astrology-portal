import assert from 'node:assert/strict';
import { readFileSync, copyFileSync, mkdirSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import { createApiStore } from '../tests/helpers/calendar-review-api.mjs';
import { natalPlacementOverrideDraft } from '../apps/admin/src/natalPlacementDraft';
import { natalPlacementLabel, natalPlacementResolverDependencyKeys, natalPlacementSourceGroups } from '../apps/admin/src/natalPlacementSources';
import { natalRetrogradeBodies, natalRetrogradeModifierKey, isNatalRetrogradeModifierKey } from '../apps/web/src/content/natalRetrogradeModifier.js';
import { isFallbackDashboardRecordAllowed } from '../apps/web/src/content/fallbackArchitectureV3/dashboardExtensions';
import { createFallbackRenderer as browserRenderer } from '../apps/web/src/content/fallbackArchitectureV3/resolver/renderFallback.browser';
import { createFallbackRenderer as packagedRenderer } from '../apps/web/src/content/fallbackArchitectureV3/dist/tldr-content.js';
import { normalizeNatalPlacementPreviewInput, renderNatalPlacementPreviewState } from '../api/admin/natal-placement-preview';
import { natalPlacementReaderSectionCopy } from '../apps/web/src/content/natalPlacementReaderSections';
import { isReaderFacingCopy } from '../apps/web/src/content/readerSafety';

const root = 'apps/web/src/content/fallbackArchitectureV3';
const sources = JSON.parse(readFileSync(`${root}/source-rows/fallback-source-rows-v3.json`, 'utf8'));
const templates = JSON.parse(readFileSync(`${root}/templates/fallback-templates-v3.json`, 'utf8'));
const interim = JSON.parse(readFileSync(`${root}/source-rows/placement-interim-fixes-v1.json`, 'utf8'));
const key = natalRetrogradeModifierKey('saturn', 4)!;
const you = 'Synthetic Saturn fourth-house modifier opening.\n\nComplete synthetic modifier ending.';
const they = '{{ownerName}} synthetic Friend modifier opening.\n\nTheir complete synthetic modifier ending.';
const draft = natalPlacementOverrideDraft(key, 'Saturn retrograde in the 4th house modifier', '');
// The isolated storage fixture does not execute Postgres CHECK constraints.
// Bind both creator paths to the deployed schema instead of accepting a mock-only type.
const blockTypeMigration = readFileSync('apps/web/supabase/migrations/20261016174132_allow_calendar_event_block_type.sql', 'utf8');
const blockTypeCheck = blockTypeMigration.match(/block_type in \(([\s\S]*?)\)\)/u)?.[1];
assert.ok(blockTypeCheck, 'The generated-content block-type constraint must be available.');
const allowedBlockTypes = new Set([...blockTypeCheck.matchAll(/'([^']+)'/gu)].map(match => match[1]));
for (const created of [draft, natalPlacementOverrideDraft('fallback-hook/natal-you-placement-complete-final/saturn/virgo/4', 'Synthetic complete placement', '')]) {
  assert.ok(allowedBlockTypes.has(created.blockType), `${created.blockType}: Postgres would reject this new natal source.`);
}
assert.equal(draft.sections.packageRecord.body_they, '');
assert.equal(draft.sections.packageRecord.review_status, 'needs_review');
assert.equal(natalPlacementLabel('saturn', 'virgo', '4', 'retrograde'), 'Saturn retrograde in Virgo in the 4th house');
const identities = new Set<string>();
for (const planet of natalRetrogradeBodies) for (let house = 1; house <= 12; house++) {
  const identity = natalRetrogradeModifierKey(planet, house)!;
  assert.ok(isNatalRetrogradeModifierKey(identity));
  identities.add(identity);
  for (const sign of ['aries', 'virgo'] as const) {
    const groups = natalPlacementSourceGroups(planet as any, sign, String(house) as any, 'retrograde');
    assert.deepEqual(groups.find(group => group.key === 'motion')?.sources.map(source => source.key), [identity]);
  }
}
assert.equal(identities.size, 144);
for (const invalid of ['sun/4', 'moon/4', 'ascendant/4', 'unknown/4', 'saturn/0', 'saturn/13', 'saturn/4/extra']) {
  assert.equal(isNatalRetrogradeModifierKey(`fallback-hook/natal-retrograde-modifier/${invalid}`), false);
}
assert.equal(natalRetrogradeModifierKey('saturn', null), null);
assert.ok(!natalPlacementResolverDependencyKeys('saturn', 'virgo', '4', 'direct').includes(key));
assert.ok(natalPlacementResolverDependencyKeys('saturn', 'virgo', '4', 'retrograde').includes(key));
assert.ok(!natalPlacementResolverDependencyKeys('saturn', 'virgo', '4', 'retrograde').includes('fallback-template/natal.modifier.retrograde'));

const store = await createApiStore([], { uuidIds: true });
try {
  let result = await store.invoke('POST', { ...draft, id: undefined, eventType: 'fallback-hook', body: you,
    sections: { packageRecord: draft.sections.packageRecord, packageDraft: { ...draft.sections.packageRecord, body: you } } });
  assert.equal(result.status, 200, JSON.stringify(result));
  let saved = result.payload.rows[0];
  assert.ok(allowedBlockTypes.has(saved.block_type), 'The actual create handler must persist a supported block type.');
  const id = saved.id;
  assert.equal(saved.status, 'DRAFT');
  const reopened = await store.invoke('GET', undefined, `/api/admin/generated-content?id=${id}`);
  assert.equal(reopened.payload.rows[0].sections.packageDraft.body, you);
  result = await store.invoke('PATCH', { id, expectedUpdatedAt: saved.updated_at, ownerAction: 'approve-package-revision' });
  assert.equal(result.status, 400, `Incomplete modifiers must remain drafts: ${JSON.stringify(result)}`);
  result = await store.invoke('PATCH', { id, expectedUpdatedAt: saved.updated_at,
    sections: { ...saved.sections, packageDraft: { ...saved.sections.packageDraft, body_they: '{{unknownPerson}} invalid.' } } });
  assert.equal(result.status, 400, 'Unknown variables must be rejected.');
  result = await store.invoke('PATCH', { id, expectedUpdatedAt: saved.updated_at,
    sections: { ...saved.sections, packageDraft: { ...saved.sections.packageDraft, body_they: they } } });
  assert.equal(result.status, 200, JSON.stringify(result));
  saved = result.payload.rows[0];
  assert.equal(saved.sections.packageRecord.body_they_approval, undefined);
  result = await store.invoke('PATCH', { id: saved.id, expectedUpdatedAt: saved.updated_at, ownerAction: 'approve-package-revision' });
  assert.equal(result.status, 200, JSON.stringify(result));
  const live = result.payload.rows[0];
  const record = live.sections.packageRecord;
  assert.equal(live.status, 'LIVE');
  assert.equal(record.body, you);
  assert.equal(record.body_they, they);
  assert.equal(record.body_they_approval.approvalLevel, 'exact_owner_approved');
  assert.ok(isFallbackDashboardRecordAllowed(record, new Set()));
  assert.equal(isFallbackDashboardRecordAllowed({ ...record, content_role: 'fallback_source' }, new Set()), false);
  const publicRead = await store.invoke('POST', { keys: [key], surfaces: ['you', 'natal'] }, '/api/content-reader');
  assert.equal(publicRead.status, 200);
  assert.equal(publicRead.payload.rows[0].sections.packageRecord.body, you);
  assert.equal(publicRead.payload.rows[0].sections.packageRecord.body_they, they);
  const stale = await store.invoke('PATCH', { id: live.id, expectedUpdatedAt: '2000-01-01T00:00:00Z', sections: { packageDraft: { body: 'Stale overwrite.' } } });
  assert.equal(stale.status, 409);

  const rows = { ...sources, vocabularyRows: [...sources.vocabularyRows, ...interim.vocabularyRows], hookRows: [...sources.hookRows, record] };
  const allTemplates = { templates: [...templates.templates, ...interim.templates] };
  for (const create of [browserRenderer, packagedRenderer]) {
    const renderer = create(allTemplates, rows);
    const base = create(allTemplates, { ...rows, hookRows: sources.hookRows });
    for (const sign of ['aries', 'virgo']) for (const voice of ['you', 'Robin']) {
      const facts = { planet: 'saturn', sign, house: 4, voice, isRetrograde: true };
      const reading = renderer.renderNatalPlacement(facts);
      assert.deepEqual(reading.parts.slice(0, -1), base.renderNatalPlacement(facts).parts, 'Modifier must preserve both complete base paragraphs.');
      assert.equal(reading.parts.at(-1), voice === 'you' ? you : they.replaceAll('{{ownerName}}', voice));
      assert.equal(reading.partKeys.at(-1), key);
      assert.equal(reading.parts.length, 3);
    }
    for (const facts of [
      { planet: 'saturn', house: 3, isRetrograde: true },
      { planet: 'jupiter', house: 4, isRetrograde: true },
      { planet: 'saturn', house: 4, isRetrograde: false },
      { planet: 'saturn', house: null, isRetrograde: true }
    ]) {
      const reading = renderer.renderNatalPlacement({ ...facts, sign: 'virgo', voice: 'you' });
      assert.ok(!reading.partKeys.includes(key));
      assert.doesNotMatch(reading.body, /Synthetic|retrograde in the birth chart/u);
    }
    for (const changed of [{ review_status: 'needs_review' }, { body: '', body_they: '' }]) {
      const unpublished = create(allTemplates, { ...rows, hookRows: [...sources.hookRows, { ...record, ...changed }] });
      assert.equal(unpublished.renderNatalPlacement({ planet: 'saturn', sign: 'virgo', house: 4, voice: 'you', isRetrograde: true }).parts.length, 2);
    }
    const unapprovedFriend = create(allTemplates, { ...rows, hookRows: [...sources.hookRows, { ...record, body_they_approval: undefined }] });
    assert.equal(unapprovedFriend.renderNatalPlacement({ planet: 'saturn', sign: 'virgo', house: 4, voice: 'Robin', isRetrograde: true }).parts.length, 2);
    const exactKey = 'fallback-hook/natal-you-placement-complete-final/saturn/virgo/4/retrograde';
    const exact = create(allTemplates, { ...rows, hookRows: [...rows.hookRows, { ...record, contentKey: exactKey, body: 'Complete exact retrograde reading.' }] });
    assert.deepEqual(exact.renderNatalPlacement({ planet: 'saturn', sign: 'virgo', house: 4, voice: 'you', isRetrograde: true }).parts, ['Complete exact retrograde reading.']);
  }

  // Run the unchanged Node implementation with only its data files replaced in a temporary tree.
  const temporary = mkdtempSync(path.join(tmpdir(), 'natal-retrograde-node-'));
  try {
    const copy = (file: string) => {
      const destination = path.join(temporary, file);
      mkdirSync(path.dirname(destination), { recursive: true });
      copyFileSync(file, destination);
    };
    for (const file of ['renderFallback.mjs', 'natalPlacementVariables.mjs', 'publicationGuard.mjs', 'retiredCompositions.mjs', 'zodiacSeasonVariables.mjs', 'readerEligibility.mjs', 'readerContentBoundary.mjs']) copy(`${root}/resolver/${file}`);
    for (const file of ['studioCustomVariables.mjs', 'studioOwnerWording.mjs', 'natalRetrogradeModifier.js']) copy(`apps/web/src/content/${file}`);
    copy(`${root}/templates/fallback-templates-v3.json`);
    copy(`${root}/source-rows/placement-interim-fixes-v1.json`);
    writeFileSync(path.join(temporary, 'package.json'), '{"type":"module"}');
    writeFileSync(path.join(temporary, root, 'source-rows/fallback-source-rows-v3.json'), JSON.stringify({ ...sources, hookRows: [...sources.hookRows, record] }));
    const node = await import(pathToFileURL(path.join(temporary, root, 'resolver/renderFallback.mjs')).href);
    for (const voice of ['you', 'Robin']) {
      const reading = node.renderNatalPlacement({ planet: 'saturn', sign: 'virgo', house: 4, voice, isRetrograde: true });
      assert.equal(reading.partKeys.at(-1), key);
      assert.equal(reading.parts.at(-1), voice === 'you' ? you : they.replaceAll('{{ownerName}}', voice));
    }
  } finally { rmSync(temporary, { recursive: true, force: true }); }

  const preview = renderNatalPlacementPreviewState(normalizeNatalPlacementPreviewInput({ planet: 'saturn', sign: 'virgo', house: '4', motion: 'retrograde', audience: 'you', overrides: [{
    id: live.id, status: live.status, lane: live.lane, provider: live.provider, updatedAt: live.updated_at, packageRow: record
  }] }));
  assert.equal(preview.rendered.parts.at(-1), you);
  assert.ok(preview.appliedOverrideKeys.includes(key));
  const appSource = readFileSync('apps/web/src/App.tsx', 'utf8');
  const start = appSource.indexOf('function natalPlacementV3NormalizedSections(');
  const end = appSource.indexOf('\nfunction ', start + 1);
  assert.ok(start >= 0 && end > start);
  const executable = ts.transpile(appSource.slice(start, end), { target: ts.ScriptTarget.ES2022 });
  const reader = new Function('fallbackRendererV3', 'natalPlacementReaderSectionCopy', 'placementDignity', 'isDisplayRetrograde', 'normalizeContentIdPart', 'ordinalHouse', 'isReaderFacingCopy', 'isNatalRetrogradeModifierKey', 'FallbackV3SourceGapError',
    `${executable}; return natalPlacementV3NormalizedSections;`)(
      packagedRenderer({ templates: [...templates.templates, ...interim.templates] }, { ...sources, vocabularyRows: [...sources.vocabularyRows, ...interim.vocabularyRows], hookRows: [...sources.hookRows, record] }),
      natalPlacementReaderSectionCopy, () => null, (position: any) => position.isRetrograde, (value: string) => value.toLowerCase(), (house: number) => house === 4 ? '4th' : `${house}th`, isReaderFacingCopy, isNatalRetrogradeModifierKey, Error
    );
  for (const ownerContext of [undefined, { ownerName: 'Robin' }]) {
    const sections = reader({ planet: 'Saturn', sign: 'Virgo', house: 4, isRetrograde: true }, ownerContext);
    assert.deepEqual(sections.map((section: any) => section.slot), ['sign', 'house', 'retrograde']);
    assert.equal(sections[2].heading, 'Saturn retrograde in the 4th house');
    assert.equal(sections[2].body, ownerContext ? they.replaceAll('{{ownerName}}', 'Robin') : you);
    assert.ok(sections[2].sourceKeys.includes(key));
  }
} finally { store.close(); }
console.log('144 natal retrograde modifier identities, save/reopen/publication, stale-write protection, public transport, Node/browser/dist routing, audiences and full-copy precedence passed.');
