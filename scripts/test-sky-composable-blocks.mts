import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { skyPlacementSourceCorpus as corpus, skyPlacementSourceRecords as records } from '../api/_lib/sky-placement-sources';
import { servingPackageRecords } from '../api/_lib/content-live-status';
import { renderSkyV4ReaderRoute as source } from '../apps/web/src/content/fallbackArchitectureV3/resolver/skyPlacementV4Canonical.mjs';
import { renderSkyV4ReaderRoute as shipped } from '../apps/web/src/content/fallbackArchitectureV3/dist/tldr-content.js';
import { skyPlacementVariableFacts, fillSkyPlacementVariables } from '../apps/web/src/content/fallbackArchitectureV3/resolver/skyPlacementVariables.mjs';
import { validateSkyEvergreenSections, skyEvergreenSectionText } from '../apps/web/src/content/fallbackArchitectureV3/resolver/skyEvergreenSections.mjs';
import { skyPlacementAssembly } from '../apps/admin/src/skyPlacementAssembly';
import { skyPlacementBodies, skyPlacementSigns } from '../apps/admin/src/skyWriteupRelations';
import { skyPlacementCompositionKeys } from '../apps/admin/src/SkyPlacementComposition';
import { makeSkyArticleOutline, SKY_ARTICLE_OUTLINES } from '../apps/admin/src/skyArticleOutlines';
await build({ entryPoints: ['apps/web/src/content/fallbackArchitectureV3/resolver/index.browser.ts'], outfile: '/private/tmp/sky-blocks-browser.mjs', bundle: true, platform: 'browser', format: 'esm', logLevel: 'silent' });
const { renderSkyV4ReaderRoute: browser } = await import('/private/tmp/sky-blocks-browser.mjs');
const before = JSON.stringify(corpus);
for (const planet of skyPlacementBodies) for (const sign of skyPlacementSigns) {
 const keys = skyPlacementCompositionKeys({ planet, sign, motion: 'direct' });
 const rows = keys.map(key => { const record = records.get(key) ?? servingPackageRecords.get(key); assert(record, key); return { content_key: key, sections: { packageRecord: record } } as any; });
 assert(skyPlacementAssembly(rows, 'article').parts.length, `${planet}/${sign}: empty map`);
}
const changed = structuredClone(corpus);
const key = 'sky-placement/article/mercury/leo';
const article = changed.content.continuous.find((row: any) => row.contentKey === key);
article.placementArticleDirect = 'Fixture direct {{planetTitle}} article.';
article.placementArticleRetrograde = 'Fixture retrograde {{planetTitle}} article.';
article.fallback.sections = [
 { id: 'shared', label: 'Shared', body: 'Fixture shared block.' },
 { id: 'rx', label: 'Rx', body: 'Fixture retrograde block.', motion: 'retrograde' },
 { id: 'direct', label: 'Direct', body: 'Fixture direct block.', motion: 'direct' },
 { id: 'aspects', label: 'Aspects', body: '{{aspectsInSign}}', motion: 'all' }
];
const event = { id: 'one', planet: 'Mercury', otherPlanet: 'Venus', aspect: 'sextile', occursAt: '2026-08-10T13:00:00Z' };
const aspectFacts = { planet: 'Mercury', sign: 'Leo', timeZone: 'America/New_York', inSign: [event, event], retrogradeStart: '2026-08-01T12:00:00Z', retrogradeEnd: '2026-08-30T12:00:00Z', retrograde: [] };
for (const render of [source, browser, shipped]) for (const isRetrograde of [false, true]) {
 assert.equal(render(changed, { route: "placement", planet: "mercury", sign: "leo", inspectVariables: true }).requiresAspectFacts, true);
 assert.equal(render(corpus, { route: "placement", planet: "mercury", sign: "leo", inspectVariables: true }).requiresAspectFacts, false);
 const input = { route: 'placement', planet: 'mercury', sign: 'leo', isRetrograde, aspectFacts };
 assert.equal(render(changed, input).mainBody, `Fixture ${isRetrograde ? 'retrograde' : 'direct'} Mercury article.`);
 const expected = `Fixture shared block.\n\nFixture ${isRetrograde ? 'retrograde' : 'direct'} block.\n\n- August 10, 2026: Mercury sextile Venus`;
 assert.equal(render(changed, { ...input, articleAvailable: false }).mainBody, expected);
 const row: any = { content_key: key, sections: { packageRecord: { ...records.get(key), ...article } } };
 const mapped = skyPlacementAssembly([row], 'fallback', isRetrograde ? 'retrograde' : 'direct').parts.filter(f => f.path.startsWith('fallback.'));
 assert.equal(mapped.map(f => fillSkyPlacementVariables(f.value, skyPlacementVariableFacts(input))).join('\n\n'), expected);
 assert.throws(() => render(changed, { ...input, aspectFacts: undefined, articleAvailable: false }), /missing calculated facts/);
}
const facts = skyPlacementVariableFacts({ planet: 'mercury', sign: 'leo', aspectFacts });
assert.equal(facts.aspectsInSignCount, '1');
assert.equal(facts.aspectsWhileRetrogradeCount, '0');
assert.equal(facts.aspectsWhileRetrograde, 'No exact major aspects in this calculated window.');
assert.equal(skyPlacementVariableFacts({ planet: 'saturn', sign: 'leo', aspectFacts }).aspectsInSign, undefined);
assert.equal(skyPlacementVariableFacts({ planet: 'mercury', sign: 'virgo', aspectFacts }).aspectsInSign, undefined);
assert.equal(skyPlacementVariableFacts({ planet: 'mercury', sign: 'leo', aspectFacts: { ...aspectFacts, retrogradeStart: undefined } }).aspectsWhileRetrograde, undefined);
assert.throws(() => validateSkyEvergreenSections([{ id: 'bad', label: 'Bad', body: '', motion: 'stationary' }]));
const phrases = [
 { id: 'first', text: 'Fixture {{planetTitle}}', joinBefore: '', source: 'owner-fixture#first' },
 { id: 'second', text: 'second phrase.', joinBefore: ', with ', source: 'owner-fixture#second' },
 { id: 'third', text: 'Third phrase.', joinBefore: '\n\n' }
];
const composed = { id: 'joined', label: 'Joined phrases', motion: 'direct', phrases };
validateSkyEvergreenSections([composed]);
assert.equal(skyEvergreenSectionText(composed), 'Fixture {{planetTitle}}, with second phrase.\n\nThird phrase.');
article.fallback.sections = [composed];
for (const render of [source, browser, shipped]) {
 assert.equal(render(changed, { route: 'placement', planet: 'mercury', sign: 'leo', articleAvailable: false }).mainBody,
  'Fixture Mercury, with second phrase.\n\nThird phrase.');
 assert.equal(render(changed, { route: 'placement', planet: 'mercury', sign: 'leo', articleAvailable: false, isRetrograde: true }).mainBody, '');
}
assert.equal(skyEvergreenSectionText({ phrases: [...phrases, { id: 'empty', text: '', joinBefore: ', ' }] }), '');
assert.throws(() => validateSkyEvergreenSections([{ ...composed, body: 'ambiguous' }]));
assert.throws(() => validateSkyEvergreenSections([{ ...composed, phrases: [...phrases, phrases[0]] }]));
assert.throws(() => validateSkyEvergreenSections([{ ...composed, phrases: [{ id: 'one', text: 'a'.repeat(20001), joinBefore: '' }] }]));
assert.throws(() => validateSkyEvergreenSections([{ ...composed, phrases: [{ id: 'one', text: 'Fixture', joinBefore: '', generated: true }] }]));
for (const outline of SKY_ARTICLE_OUTLINES) {
 const sections = makeSkyArticleOutline(outline.id, 'direct');
 validateSkyEvergreenSections(sections);
 assert(sections.every(section => skyEvergreenSectionText(section) === ''), 'outlines contain no invented prose');
 assert(sections.some(section => section.items), 'practical guide has separate item structure');
}
const packet = { id: 'packet', label: 'Editorial label only', role: 'main', depth: 'deep', paragraphs: [
 { id: 'first', job: 'Mechanism and examples', phrases: phrases.map(phrase => ({ ...phrase, role: 'example' })) },
 { id: 'planned', job: 'Empty planned paragraph', phrases: [] },
 { id: 'last', job: 'Closing perspective', phrases: [{ id: 'end', role: 'closing-point', text: 'Fixture closing paragraph.', joinBefore: '' }] }
] };
const guide = { id: 'guide', role: 'practical', label: 'Guide', items: [
 { id: 'one', action: 'Fixture action.', phrases: [{ id: 'example', role: 'example', text: 'Fixture explanation.', joinBefore: ' ' }] },
 { id: 'empty', action: '', phrases: [] }
] };
validateSkyEvergreenSections([packet, guide]);
article.fallback.sections = [packet, guide];
for (const render of [source, browser, shipped]) {
 assert.equal(render(changed, { route: 'placement', planet: 'mercury', sign: 'leo', articleAvailable: false }).mainBody,
  'Fixture Mercury, with second phrase.\n\nThird phrase.\n\nFixture closing paragraph.\n\nFixture action. Fixture explanation.');
}
assert.throws(() => validateSkyEvergreenSections([{ ...packet, role: 'generated' }]));
assert.throws(() => validateSkyEvergreenSections([{ ...packet, depth: 'compressed' }]));
assert.throws(() => validateSkyEvergreenSections([{ ...packet, role: 'practical' }]));
assert.throws(() => validateSkyEvergreenSections([{ ...guide, role: 'main' }]));
assert.throws(() => validateSkyEvergreenSections([{ ...packet, paragraphs: [...packet.paragraphs, packet.paragraphs[0]] }]));
assert.throws(() => validateSkyEvergreenSections([{ ...packet, body: 'ambiguous' }]));
assert.equal(JSON.stringify(corpus), before);
console.log('PASS: all 168 placement maps, motion-specific articles and ordered blocks, scoped aspect variables, Node/browser/shipped parity, immutable approved corpus.');
