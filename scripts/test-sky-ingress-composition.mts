import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { skyPlacementSourceCorpus as corpus } from '../api/_lib/sky-placement-sources';
import * as engine from '../apps/web/src/content/fallbackArchitectureV3/resolver/skyIngressComposition.mjs';
import { renderSkyV4ReaderRoute as nodeReader } from '../apps/web/src/content/fallbackArchitectureV3/resolver/skyPlacementV4Canonical.mjs';
import * as shipped from '../apps/web/src/content/fallbackArchitectureV3/dist/tldr-content.js';
import { sha256Text } from '../apps/web/src/content/fallbackArchitectureV3/resolver/contentIntegrity.mjs';
const temp = await mkdtemp(join(tmpdir(), 'sky-ingress-'));
await build({ entryPoints: ['apps/web/src/content/fallbackArchitectureV3/resolver/index.browser.ts'], outfile: join(temp, 'browser.mjs'), bundle: true, platform: 'browser', format: 'esm', logLevel: 'silent' });
const browser = await import(pathToFileURL(join(temp, 'browser.mjs')).href);
const original = JSON.stringify(corpus);
const changed = structuredClone(corpus);
const owner = changed.content.continuous.find((row: any) => row.contentKey === 'sky-placement/article/mercury/leo');
owner.ingress = engine.makeSkyIngressComposition();
owner.ingress.enabled = true;
for (const module of owner.ingress.modules.filter((item: any) => item.required)) {
 for (const match of module.template.matchAll(/\{\{(\w+)\}\}/gu)) owner.ingress.sources[match[1]].text = `Fixture ${match[1]} for {{planetTitle}} in {{signTitle}}.`;
}
owner.ingress.sources.openingHook.text = 'Fixture opening.';
const input: any = { route: 'placement', planet: 'mercury', sign: 'leo', articleAvailable: false, isRetrograde: false,
 ingressOccurrence: { asOfDate: '2026-08-10T12:00:00Z', timeZone: 'America/New_York', passes: [{ entryDate: '2026-08-01T01:00:00Z', exitDate: '2026-08-20T00:00:00Z', entryMotion: 'direct', previousSign: 'Cancer' }] } };
assert.deepEqual(engine.skyIngressPublicationIssues(owner), []);
for (const api of [engine, browser, shipped]) {
 const result = api.renderSkyIngressComposition(owner, input);
 assert.equal(result.status, 'ready');
 assert(result.body.startsWith('Fixture opening.\n\nFixture planetFunctionSentence for Mercury in Leo.'));
 assert(result.trace.find((row: any) => row.id === 'intro').reason.startsWith('Optional module omitted'));
 assert.equal(result.timing, 'single_pass'); assert.equal(result.duration, 'short');
 assert.equal(api.skyIngressOccurrence(input).facts.passEntryDate, 'July 31, 2026');
 assert.equal(result.body, engine.renderSkyIngressComposition(owner, input).body);
}
for (const render of [nodeReader, browser.renderSkyV4ReaderRoute, shipped.renderSkyV4ReaderRoute]) {
 assert.equal(render(changed, input).resolution, 'ingress-composition');
 assert.equal(render(changed, input).mainBody, engine.renderSkyIngressComposition(owner, input).body);
 assert.equal(render(changed, { ...input, articleAvailable: true }).mainBody, owner.placementArticle);
 const saved = owner.ingress.sources.responseSentence.text;
 owner.ingress.sources.responseSentence.text = '';
 assert.equal(render(changed, input).resolution, 'exact-fallback');
 assert(!render(changed, input).mainBody.includes('{{'));
 assert(engine.skyIngressPublicationIssues(owner).some((s: string) => s.includes('responseSentence')));
 owner.ingress.sources.responseSentence.text = saved;
}
const target = { contentKey: 'sky-placement/article/mercury/aries', ingress: engine.makeSkyIngressComposition() };
target.ingress.sources.planetFunctionSentence.text = 'Fixture reused {{planetTitle}} sentence.';
owner.ingress.sources.planetFunctionSentence = { kind: 'planet', reference: { contentKey: target.contentKey, field: 'ingress.sources.planetFunctionSentence', sha256: sha256Text(target.ingress.sources.planetFunctionSentence.text) } };
assert.equal(engine.renderSkyIngressComposition(owner, input, [target]).status, 'ready');
assert.equal(engine.renderSkyIngressComposition(owner, input, []).status, 'incomplete');
target.ingress.sources.planetFunctionSentence.text += ' Changed.';
assert.equal(engine.renderSkyIngressComposition(owner, input, [target]).status, 'incomplete');
assert(engine.skyIngressPublicationIssues(owner, [target]).some((s: string) => s.includes('changed')));
for (const bad of ['{{unknown}}', '{{constructor}}', '{{planetTitle', '{{fallback.hook}}']) {
 const copy = structuredClone(owner.ingress); copy.sources.responseSentence.text = bad;
 assert.throws(() => engine.validateSkyIngressComposition(copy));
}
const passes = [
 { entryDate: '2026-01-01T00:00:00Z', exitDate: '2026-02-01T00:00:00Z', entryMotion: 'direct' },
 { entryDate: '2026-03-01T00:00:00Z', exitDate: '2026-04-01T00:00:00Z', entryMotion: 'retrograde' },
 { entryDate: '2026-06-01T00:00:00Z', exitDate: '2026-07-01T00:00:00Z', entryMotion: 'direct' }
];
for (const [date, timing, verb] of [['2026-01-10', 'first_pass', 'enters'], ['2026-03-10', 'return_pass', 'moves back into'], ['2026-06-10', 'final_pass', 're-enters']]) {
 const result = engine.skyIngressOccurrence({ ...input, ingressOccurrence: { passes, asOfDate: date } });
 assert.equal(result.timing, timing); assert.equal(result.duration, 'long'); assert.equal(result.facts.ingressVerb, verb);
}
assert.equal(engine.skyIngressOccurrence({ ...input, ingressOccurrence: { passes, asOfDate: '2026-05-10' } }).timing, 'unknown');
const aspectOwner = { contentKey: owner.contentKey, ingress: engine.makeSkyIngressComposition() };
aspectOwner.ingress.enabled = true;
aspectOwner.ingress.sources.aspectMechanismSentence.text = 'Fixture {{aspectPlanetTitle}} {{aspectType}} on {{aspectExactDate}}.';
const aspect = { id: 'aspect', label: 'Aspect', required: false, enabled: true, motion: 'all', duration: 'all', timing: 'all', template: '{{aspectMechanismSentence}}', aspect: { otherPlanet: 'venus', type: 'sextile', weight: 'defining' } };
aspectOwner.ingress.modules = [{ ...aspect, id: 'rx', motion: 'retrograde' }, aspect];
const events = [3, 1, 2].map(day => ({ id: String(day), planet: 'Mercury', otherPlanet: 'Venus', aspect: 'sextile', occursAt: `2026-08-0${day}T12:00:00Z` }));
const result = engine.renderSkyIngressComposition(aspectOwner, { ...input, aspectFacts: { planet: 'Mercury', sign: 'Leo', inSign: [...events, events[0]] } });
assert.deepEqual(result.trace.filter((row: any) => row.status === 'included').map((row: any) => row.eventId), ['1', '2']);
assert.equal(result.trace[0].reason, 'Different motion');
assert.equal(JSON.stringify(corpus), original);
await rm(temp, { recursive: true, force: true });
console.log('PASS: V5 Node/browser/shipped parity, exact references, required fallback, optional omission, article priority, timezone dates, timing priority, aspect ordering/cap, immutable corpus.');
