import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { skyPlacementSourceCorpus as corpus } from '../api/_lib/sky-placement-sources';
import { makeSkyIngressComposition } from '../apps/web/src/content/fallbackArchitectureV3/resolver/skyIngressComposition.mjs';
import { renderSkyV4ReaderRoute, renderSkyV4StudioPreview } from '../apps/web/src/content/fallbackArchitectureV3/resolver/skyPlacementV4Canonical.mjs';
import * as shipped from '../apps/web/src/content/fallbackArchitectureV3/dist/tldr-content.js';
const temp = await mkdtemp(join(tmpdir(), 'dignity-runtime-'));
try {
  await build({ entryPoints: ['apps/web/src/content/fallbackArchitectureV3/resolver/index.browser.ts'], outfile: join(temp, 'browser.mjs'), bundle: true, platform: 'browser', format: 'esm', logLevel: 'silent' });
  const browser = await import(pathToFileURL(join(temp, 'browser.mjs')).href);
  const before = JSON.stringify(corpus);
  const cases = [
    ['sun','leo','in domicile'], ['sun','aries','exaltation'], ['venus','aries','in detriment'], ['saturn','aries','fall'],
    ['mercury','virgo','both domicile and exaltation'], ['mercury','pisces','both detriment and fall'], ['sun','virgo',''], ['uranus','gemini','']
  ];
  for (const [planet, sign, marker] of cases) {
    const fixture = structuredClone(corpus);
    const key = `sky-placement/article/${planet}/${sign}`;
    const owner = fixture.content.continuous.find((row: any) => row.contentKey === key)!;
    assert(owner, `Fixture source exists: ${key}`);
    owner.ingress = makeSkyIngressComposition();
    owner.ingress.enabled = true;
    owner.ingress.sources.placementDignityMechanism.text = 'the fixture mechanism belongs to {{planetTitle}} in {{signTitle}}';
    owner.ingress.sources.placementDignityExpression.text = 'complete the fixture activity';
    owner.ingress.sources.openingHook.text = 'Fixture identifying opening.';
    owner.ingress.sources.practiceClosingLine.text = 'Fixture identifying final sentence.';
    owner.ingress.modules = owner.ingress.modules.filter((module: any) => ['opening', 'dignity', 'close'].includes(module.id));
    owner.ingress.modules[0].required = true;
    owner.placementArticle = '{{openingHook}}\n\n{{placementDignityMeaning}}\n\n{{practiceClosingLine}}';
    owner.placementArticleDirect = '';
    owner.placementArticleRetrograde = '';
    for (const articleAvailable of [true, false]) for (const isRetrograde of [false, true]) {
      const input = { route: 'placement', planet, sign, articleAvailable, isRetrograde };
      const expected = renderSkyV4ReaderRoute(fixture, input);
      for (const render of [renderSkyV4ReaderRoute, browser.renderSkyV4ReaderRoute, shipped.renderSkyV4ReaderRoute]) {
        const result = render(fixture, input);
        assert.equal(result.mainBody, expected.mainBody);
        assert.equal(result.resolution, articleAvailable ? 'canonical-article' : 'ingress-composition');
        assert(result.mainBody.startsWith('Fixture identifying opening.'));
        assert(result.mainBody.endsWith('Fixture identifying final sentence.'));
        assert(!result.mainBody.includes('{{'));
        if (marker) assert(result.mainBody.includes(marker));
        else assert(!result.mainBody.includes('fixture mechanism'));
      }
    }
    const preview = renderSkyV4StudioPreview(corpus, { contentKey: key, draftFields: { placementArticle: owner.placementArticle, placementArticleDirect: '', placementArticleRetrograde: '', ingress: owner.ingress } });
    assert.equal(preview.mainBody, renderSkyV4ReaderRoute(fixture, { route: 'placement', planet, sign }).mainBody);
    const originalArticle = owner.placementArticle;
    owner.placementArticle = '{{placementDignity}}\n\n' + originalArticle;
    for (const render of [renderSkyV4ReaderRoute, browser.renderSkyV4ReaderRoute, shipped.renderSkyV4ReaderRoute]) {
      const result = render(fixture, { route: 'placement', planet, sign, facts: { placementDignity: 'Incorrect caller condition', placementDignityMeaning: 'Incorrect caller paragraph' } });
      assert(!result.mainBody.includes('Incorrect caller'), 'Caller facts cannot choose dignity or bypass the selected paragraph');
      if (marker) assert(result.mainBody.includes(marker));
    }
    owner.placementArticle = originalArticle;
    if (marker) {
      owner.ingress.sources.placementDignityMechanism.text = '';
      for (const render of [renderSkyV4ReaderRoute, browser.renderSkyV4ReaderRoute, shipped.renderSkyV4ReaderRoute]) assert.throws(() => render(fixture, { route: 'placement', planet, sign }), /placementDignityMechanism/);
    }
  }
  assert.equal(JSON.stringify(corpus), before, 'No authored or approved corpus row was modified');
  console.log('PASS: 8 dignity cases across Node, browser source, shipped reader payload and Studio preview; full article/composition and direct/retrograde parity; missing text refuses; original corpus unchanged.');
} finally {
  await rm(temp, { recursive: true, force: true });
}
