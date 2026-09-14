import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { skyPlacementSourceCorpus as corpus } from '../api/_lib/sky-placement-sources';
import { makeSkyIngressComposition } from '../apps/web/src/content/fallbackArchitectureV3/resolver/skyIngressComposition.mjs';
import { renderSkyV4ReaderRoute, renderSkyV4StudioPreview } from '../apps/web/src/content/fallbackArchitectureV3/resolver/skyPlacementV4Canonical.mjs';
import { renderSkyV4ReaderRoute as shipped } from '../apps/web/src/content/fallbackArchitectureV3/dist/tldr-content.js';
import { sha256Text } from '../apps/web/src/content/fallbackArchitectureV3/resolver/contentIntegrity.mjs';
const outfile = join(tmpdir(), `sky-article-phrases-browser-${process.pid}.mjs`);
await build({ entryPoints: ['apps/web/src/content/fallbackArchitectureV3/resolver/index.browser.ts'], outfile, platform: 'browser', format: 'esm', bundle: true, logLevel: 'silent' });
const browser = await import(pathToFileURL(outfile).href);
const updated = structuredClone(corpus);
const key = 'sky-placement/article/saturn/aries';
const owner = updated.content.continuous.find((row: any) => row.contentKey === key)!;
owner.ingress = { ...makeSkyIngressComposition(), modules: [], enabled: false };
Object.assign(owner.ingress.sources, {
  openingHook: { kind: 'placement', text: 'Fixture first sentence.' },
  planetFunction: { kind: 'planet', text: 'fixture planet language' },
  signMethod: { kind: 'sign', text: 'fixture sign language' },
  closingLine: { kind: 'placement', text: 'Fixture final sentence.' },
  directNote: { kind: 'placement', text: 'Fixture direct note.' },
  retrogradeNote: { kind: 'placement', text: 'Fixture retrograde note.' }
});
const article = '{{openingHook}}\n\n{{planetTitle}} in {{signTitle}}: {{planetFunction}} and {{signMethod}}. {{entryDate}} to {{exitDate}}.\n\n{{closingLine}}';
owner.placementArticle = article;
const facts = { entryDate: 'Fixture entry', exitDate: 'Fixture exit' };
const expected = 'Fixture first sentence.\n\nSaturn in Aries: fixture planet language and fixture sign language. Fixture entry to Fixture exit.\n\nFixture final sentence.';
const before = JSON.stringify(updated);
for (const render of [renderSkyV4ReaderRoute, browser.renderSkyV4ReaderRoute, shipped]) {
 for (const isRetrograde of [false, true]) {
  const input = { route: 'placement', planet: 'saturn', sign: 'aries', isRetrograde, facts };
  assert.equal(render(updated, input).mainBody, expected);
  assert.equal(render(updated, input).resolution, 'canonical-article');
  assert.throws(() => render(updated, { ...input, facts: {} }), /missing calculated facts/);
 }
}
assert.equal(JSON.stringify(updated), before);
const preview = renderSkyV4StudioPreview(corpus, { contentKey: key, draftFields: { placementArticle: article, ingress: owner.ingress }, facts });
assert.equal(preview.mainBody, expected);
owner.placementArticleDirect = '{{directNote}} {{closingLine}}';
owner.placementArticleRetrograde = '{{retrogradeNote}} {{closingLine}}';
for (const render of [renderSkyV4ReaderRoute, browser.renderSkyV4ReaderRoute, shipped]) {
 for (const isRetrograde of [false, true]) {
  assert.equal(render(updated, { route: 'placement', planet: 'saturn', sign: 'aries', isRetrograde }).mainBody,
   `Fixture ${isRetrograde ? 'retrograde' : 'direct'} note. Fixture final sentence.`);
 }
}
const target = updated.content.continuous.find((row: any) => row.contentKey === 'sky-placement/article/saturn/taurus')!;
target.ingress = { ...makeSkyIngressComposition(), modules: [] };
target.ingress.sources.planetFunction = { kind: 'planet', text: 'Linked fixture planet language.' };
owner.ingress.sources.planetFunction = { kind: 'planet', reference: { contentKey: target.contentKey, field: 'ingress.sources.planetFunction', sha256: sha256Text(target.ingress.sources.planetFunction.text) } };
owner.placementArticleDirect = '{{planetFunction}} {{closingLine}}';
for (const render of [renderSkyV4ReaderRoute, browser.renderSkyV4ReaderRoute, shipped]) assert.equal(render(updated, { route: 'placement', planet: 'saturn', sign: 'aries' }).mainBody, 'Linked fixture planet language. Fixture final sentence.');
target.ingress.sources.planetFunction.text = 'Changed linked fixture.';
for (const render of [renderSkyV4ReaderRoute, browser.renderSkyV4ReaderRoute, shipped]) assert.throws(() => render(updated, { route: 'placement', planet: 'saturn', sign: 'aries' }), /changed/);
console.log('PASS: mixed article variables in Node, browser source, shipped artifact, draft preview and both motion-specific article paths; stale references fail closed.');
