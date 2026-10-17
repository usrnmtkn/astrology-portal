import assert from 'node:assert/strict';
import { moonRoutingPreviewApi } from '../tests/helpers/moon-routing-preview-api.ts';
import { moonRoutingExactRecords } from '../tests/helpers/moon-routing-fixtures.ts';
import { prioritizeExactTransitSources } from '../apps/web/src/content/fallbackArchitectureV3/resolver/transitAspectSourcePriority.mjs';
import fs from 'node:fs';
import { renderTransitAspect as nodeRender } from '../apps/web/src/content/fallbackArchitectureV3/resolver/renderTransitSynastry.mjs';
import { createTransitSynastryRenderer as browserFactory } from '../apps/web/src/content/fallbackArchitectureV3/resolver/renderTransitSynastry.browser.ts';
import { createTransitSynastryRenderer as shippedFactory } from '../apps/web/src/content/fallbackArchitectureV3/dist/tldr-content.js';
import { moonTransitVariantKeys, selectMoonTransitVariant } from '../apps/web/src/content/fallbackArchitectureV3/resolver/moonTransitVariants.mjs';
import { retainPersonalTransitAlternate } from '../apps/web/src/content/fallbackArchitectureV3/resolver/personalTransitCopyVersions.mjs';
import { normalizeTransitNatalPreviewInput, transitNatalPreviewScope } from '../api/admin/transit-natal-preview.ts';
import { personalTransitCopySeed, personalTransitId, shiftPersonalDateKey } from '../apps/web/src/services/personalDailyTransits.ts';

const read = (path: string) => JSON.parse(fs.readFileSync(path, 'utf8'));
const root = 'apps/web/src/content/fallbackArchitectureV3/';
const identities = read('tests/fixtures/moon-transit-legacy-identities.json') as { contentKey: string; natal: string }[];
assert.equal(identities.length, 60);
assert.equal(identities.filter(row => row.contentKey.split('/')[3] !== row.natal).length, 15);
const lib = read(`${root}source-rows/transit-synastry-rows-v1.json`);
const templates = read(`${root}templates/fallback-templates-v3.json`);
const sourceRows = read(`${root}source-rows/fallback-source-rows-v3.json`);
const keys = lib.authoredCards.map((row: any) => row.contentKey);
const renderers = [nodeRender, browserFactory(lib, templates, sourceRows).renderTransitAspect,
  shippedFactory(lib, templates, sourceRows).renderTransitAspect];
const aspects = ['conjunction', 'square', 'opposition', 'trine', 'sextile'];

// Exercise the actual reader adapter inputs, not arbitrary qa seeds that the
// normal You reader could never supply. This is source reachability coverage;
// calculated contact/ranking and native reader journeys are separate checks.
const legacyYouChoices = new Set<string>();
for (const natal of new Set(identities.map(row => row.natal))) for (const aspect of aspects) {
  const id = personalTransitId('Moon', aspect, natal);
  const selected = selectMoonTransitVariant(keys, 'moon', natal, aspect, undefined, `you:${id}`);
  if (selected) legacyYouChoices.add(selected);
}
assert.ok(identities.some(row => !legacyYouChoices.has(row.contentKey)), 'The old permanent-contact seed must reproduce unreachable You sources.');
for (const voice of ['you', 'Fixture Friend']) {
  const reachable = new Set<string>();
  for (let offset = 0; offset < 366; offset++) {
    const date = shiftPersonalDateKey('2026-01-01', offset);
    for (const natal of new Set(identities.map(row => row.natal))) for (const aspect of aspects) {
      const id = personalTransitId('Moon', aspect, natal);
      const seed = personalTransitCopySeed('Moon', id, voice, date, 'America/New_York');
      const selected = selectMoonTransitVariant(keys, 'moon', natal, aspect, undefined, seed);
      if (selected) reachable.add(selected);
      assert.equal(seed, personalTransitCopySeed('Moon', id, voice, date, 'America/New_York'), 'Reopening a reading cannot rotate its source.');
    }
  }
  assert.deepEqual(identities.filter(row => !reachable.has(row.contentKey)), [], `${voice}: every canonical and alias source must be reachable through dated reader inputs.`);
}
const seedFor = (reference: string, zone = 'America/New_York') => personalTransitCopySeed('Moon', 'moon-trine-mercury', 'you', reference, zone);
assert.equal(seedFor('2026-10-16'), seedFor('2026-10-17T02:00:00Z'));
assert.equal(seedFor('2026-11-01T05:30:00Z'), seedFor('2026-11-01T06:30:00Z'), 'Repeated DST hour is one reading date.');
assert.equal(seedFor('2026-10-16', 'Pacific/Honolulu'), seedFor('2026-10-17T02:00:00Z', 'Pacific/Honolulu'));
assert.notEqual(seedFor('2026-10-16'), seedFor('2026-10-17'));
assert.equal(personalTransitCopySeed('Saturn', 'saturn-trine-mercury', 'you', '2026-10-16'), undefined, 'Other planets retain their selection policy.');
for (const aspect of aspects) {
  const exact = `authored/transit-aspect/moon/chiron/${aspect}`;
  const selected = 'authored/transit-aspect/moon/c/any/variant-C';
  const context = [`${exact}/aries/1/2`, `${exact}/pass-2`];
  const candidates = [...context, selected, exact];
  assert.deepEqual(prioritizeExactTransitSources(candidates, 'moon', 'chiron', aspect, selected), candidates);
  assert.deepEqual(prioritizeExactTransitSources([selected, exact], 'moon', 'chiron', aspect), [exact, selected]);
  assert.deepEqual(prioritizeExactTransitSources([selected, exact], 'moon', 'chiron', aspect, 'absent'), [exact, selected]);
  const other = [selected, exact].map(key => key.replace('/moon/', '/sun/'));
  assert.deepEqual(prioritizeExactTransitSources(other, 'sun', 'chiron', aspect, other[0]), [other[1], other[0]]);
}
const routes = new Map<string, any>();
for (const natal of new Set(identities.map(row => row.natal))) for (const aspect of aspects) {
  const choices = moonTransitVariantKeys(keys, 'moon', natal, aspect);
  for (let index = 0; index < choices.length; index++) {
    const key = choices[index];
    if (!identities.some(row => row.contentKey === key)) continue;
    const facts = { transiting: 'moon', natal, aspect, variant: index + 1, window: 'Until October 31, 2026', voice: 'you' };
    normalizeTransitNatalPreviewInput({ planet: 'moon', natalPoint: natal, aspect, variant: index + 1, window: facts.window });
    const results = renderers.map(render => render(facts));
    assert.deepEqual(results.map(result => result.contentKey), results.map(() => results[0].contentKey));
    assert.deepEqual(results.map(result => result.body), results.map(() => results[0].body));
    if (results[0].contentKey === key) routes.set(key, facts);
  }
}
assert.deepEqual(identities.filter(row => !routes.has(row.contentKey)), [], 'Every legacy identity must have a normal route with the full library present.');

// Synthetic complete passages exercise both versions without copying owner prose.
const fixtures = identities.map(({ contentKey }) => {
  const row = { contentKey, content_role: 'full_copy', surface: 'transit-aspect', review_status: 'approved',
    headline: 'Synthetic Moon source', body_you: `Retained You opening ${contentKey}.\n\nRetained You final sentence.`,
    body_they: `Retained Friend opening ${contentKey}.\n\nRetained Friend final sentence.` };
  return { ...row, ...retainPersonalTransitAlternate(row, 'synthetic-original-version'),
    body_you: `Primary You opening ${contentKey}.\n\nPrimary You final sentence.`,
    body_they: `Primary Friend opening ${contentKey}.\n\nPrimary Friend final sentence.` };
});
const snapshot = JSON.stringify([fixtures, moonRoutingExactRecords]);
for (const factory of [browserFactory, shippedFactory]) {
  const render = factory({ authoredCards: [...fixtures, ...moonRoutingExactRecords] }, { templates: [] }, { hookRows: [], vocabularyRows: [] }).renderTransitAspect;
  for (const { contentKey, natal } of identities) {
    const aspect = routes.get(contentKey).aspect;
    const choices = moonTransitVariantKeys(fixtures.map(row => row.contentKey), 'moon', natal, aspect);
    const variant = choices.indexOf(contentKey) + 1;
    for (const voice of ['you', 'Example Friend']) for (const copyVersion of ['primary', 'alternate'] as const) {
      const row = fixtures.find(item => item.contentKey === contentKey)!;
      const field = `body_${voice === 'you' ? 'you' : 'they'}${copyVersion === 'alternate' ? '_alternate' : ''}`;
      const result = render({ transiting: 'moon', natal, aspect, variant, voice, copyVersion, window: 'Until October 31, 2026' });
      assert.equal(result.contentKey, contentKey);
      assert.equal(result.body, (row as any)[field]);
    }
    let seed: string | undefined;
    for (let day = 0; day < 1000 && !seed; day++) {
      const candidate = `reader:calculated-contact:${day}`;
      if (selectMoonTransitVariant(fixtures.map(row => row.contentKey), 'moon', natal, aspect, undefined, candidate) === contentKey) seed = candidate;
    }
    assert.ok(seed, `${contentKey} must occur in automatic rotation`);
    assert.equal(render({ transiting: 'moon', natal, aspect, variantSeed: seed, window: 'Until October 31, 2026' }).contentKey, contentKey);
  }
}
for (const factory of [browserFactory, shippedFactory]) {
  const key = 'authored/transit-aspect/moon/m/soft/variant-A';
  const variantRow = fixtures.find(row => row.contentKey === key)!;
  const baseFacts = { transiting: 'moon', natal: 'mercury', aspect: 'trine', variant: 1, window: 'Until October 31, 2026' };
  const record = (contentKey: string) => ({ ...variantRow, contentKey, body_you: `Exact complete source ${contentKey}.` });
  const exact = record('authored/transit-aspect/moon/mercury/trine');
  const pass = record(`${exact.contentKey}/pass-2`);
  const situation = record(`${exact.contentKey}/aries/1/2`);
  const render = factory({ authoredCards: [variantRow, exact, pass, situation] }, { templates: [] }, { hookRows: [], vocabularyRows: [] }).renderTransitAspect;
  assert.equal(render(baseFacts).contentKey, key, 'A selected Moon variant must not be replaced by its exact unvaried base.');
  assert.equal(render({ ...baseFacts, variant: undefined }).contentKey, exact.contentKey, 'The default slot retains exact contact precedence.');
  const defaultSeed = Array.from({ length: 100 }, (_, index) => `default-slot:${index}`).find(seed =>
    selectMoonTransitVariant([key], 'moon', 'mercury', 'trine', undefined, seed) === null);
  assert.ok(defaultSeed);
  assert.equal(render({ ...baseFacts, variant: undefined, variantSeed: defaultSeed }).contentKey, exact.contentKey);
  assert.equal(render({ ...baseFacts, pass: 2 }).contentKey, pass.contentKey, 'Exact pass precedes a variant.');
  assert.equal(render({ ...baseFacts, pass: 2, sign: 'aries', transitHouse: 1, natalHouse: 2 }).contentKey, situation.contentKey);
  const familyPass = record('authored/transit-aspect/moon/mercury/soft/pass-2');
  const familyRender = factory({ authoredCards: [variantRow, exact, familyPass] }, { templates: [] }, { hookRows: [], vocabularyRows: [] }).renderTransitAspect;
  assert.equal(familyRender({ ...baseFacts, pass: 2 }).contentKey, familyPass.contentKey, 'A requested repeat pass remains ahead of its variant.');
  const emptyHistory = { ...variantRow, body_they_alternate: undefined };
  Object.assign(emptyHistory, retainPersonalTransitAlternate({ ...variantRow, alternate_copy_sha256: undefined, body_they: undefined }, 'synthetic-missing-friend'));
  const missingRender = factory({ authoredCards: [emptyHistory, exact] }, { templates: [] }, { hookRows: [], vocabularyRows: [] }).renderTransitAspect;
  assert.throws(() => missingRender({ ...baseFacts, voice: 'Example Friend', copyVersion: 'alternate' }), /No verified alternate/);
  const blocked = factory({ authoredCards: [variantRow, exact] }, { templates: [] }, { hookRows: [], vocabularyRows: [] }, { blockedContentKeys: [key] }).renderTransitAspect;
  assert.throws(() => blocked(baseFacts), /Publication unavailable/);
  const otherVariant = record('authored/transit-aspect/moon/m/soft/variant-B');
  const removed = factory({ authoredCards: [otherVariant, exact] }, { templates: [] }, { hookRows: [], vocabularyRows: [] }, { blockedContentKeys: [key] }).renderTransitAspect;
  assert.throws(() => removed(baseFacts), /Publication unavailable/, 'Removing retired data must not shift its numeric choice to a different source.');
  assert.equal(removed({ ...baseFacts, variant: 2 }).contentKey, otherVariant.contentKey);

  const draft = factory({ authoredCards: [{ ...variantRow, review_status: 'needs_review' }] }, { templates: [] }, { hookRows: [], vocabularyRows: [] }).renderTransitAspect;
  assert.throws(() => draft(baseFacts));
}
for (const row of identities.filter(row => row.contentKey.split('/')[3] !== row.natal)) {
  const scope = transitNatalPreviewScope(normalizeTransitNatalPreviewInput({ planet: 'moon', natalPoint: row.natal, aspect: 'trine' }));
  assert.ok(scope.prefixes.some(prefix => row.contentKey.startsWith(prefix)), `Preview must load live alias ${row.contentKey}`);
}
assert.ok(!transitNatalPreviewScope(normalizeTransitNatalPreviewInput({ planet: 'sun', natalPoint: 'mercury', aspect: 'trine' })).prefixes.includes('authored/transit-aspect/sun/m/'));
assert.equal(JSON.stringify([fixtures, moonRoutingExactRecords]), snapshot, 'Rendering cannot mutate saved passages or alternate metadata.');
assert.deepEqual(moonTransitVariantKeys(keys, 'sun', 'mercury', 'trine'), []);
const api = moonRoutingPreviewApi();
try {
  for (const { contentKey, natal } of identities) for (const voice of ['you', '{{Name}}']) for (const copyVersion of ['primary', 'alternate']) {
    const route = routes.get(contentKey);
    const result = await api.invoke({ planet: 'moon', natalPoint: natal, aspect: route.aspect, variant: route.variant, window: 'until October 27', voice, copyVersion }, { 'x-content-generation-secret': 'qa-secret' });
    assert.equal(result.status, 200);
    assert.ok(result.payload.rendered.variantCount >= route.variant);
    const source = result.payload.rendered.paragraphs[0].sources[0];
    assert.equal(source.contentKey, contentKey);
    assert.equal(source.field, `body_${voice === 'you' ? 'you' : 'they'}${copyVersion === 'alternate' ? '_alternate' : ''}`);
    assert.equal(source.publication.origin, 'published');
  }
  assert.equal((await api.invoke({ planet: 'moon', natalPoint: 'mercury', aspect: 'trine' }, {})).status, 401);
} finally { api.close(); }
console.log('Moon routing passed: all 60 identities/15 aliases reachable; Node/browser/shipped parity; 240 audience/version cases per renderer; stable automatic rotation; saved fields unchanged.');
