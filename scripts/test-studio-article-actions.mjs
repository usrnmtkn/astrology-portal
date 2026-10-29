import assert from 'node:assert/strict';
import { placementTemplateKeys, skyArticleTemplateKey } from '../apps/admin/src/skyArticleTemplateKeys.ts';
import { skyArticleVisitReference } from '../api/_lib/sky-article-visit-reference.ts';
import { SKY_INGRESS_ARTICLE_FORMAT, SKY_INGRESS_ARTICLE_TEMPLATE } from '../apps/web/src/content/skyIngressEssay.mjs';
import { skyMoonDatedDayBounds } from '../src/shared/skyMoonDatedScope.ts';

const exact = 'sky/article-template/sun/libra';
const ingress = 'sky/article-template/sun/ingress';
assert.equal(skyArticleTemplateKey('sun', 'libra', [ingress, exact]), exact, 'Open the selected sign template, regardless of inventory order.');
assert.equal(skyArticleTemplateKey('sun', 'libra', ['sky/article-template/sun/virgo', ingress]), ingress, 'An existing generic ingress template takes precedence over another sign.');
assert.equal(skyArticleTemplateKey('sun', 'libra', ['sky-article-template/sun/libra', ingress]), 'sky-article-template/sun/libra', 'Saved legacy template identities remain editable.');
assert.equal(skyArticleTemplateKey('sun', 'libra', ['sky-article-template/sun/ingress']), 'sky-article-template/sun/ingress', 'Legacy ingress templates remain valid destinations.');
assert.equal(skyArticleTemplateKey('north-node', 'aries', ['sky/article-template/nodes']), 'sky/article-template/nodes', 'Nodes retain their existing shared template fallback.');
assert.equal(skyArticleTemplateKey('north-node', 'aries', ['sky/article-template/nodes', 'sky/article-template/north-node/ingress']), 'sky/article-template/north-node/ingress');
assert.equal(skyArticleTemplateKey('sun', 'libra', ['article/manual/example', 'sky-article/sun/libra/2026', 'sky/article-template/mars/libra']), undefined, 'Do not offer a generator with no matching saved template, or open unrelated writing.');
assert.equal(skyArticleTemplateKey('sun', 'libra', []), undefined);
assert.deepEqual(placementTemplateKeys('north-node', 'aries'), ['sky/article-template/north-node/aries', 'sky/article-template/north-node/ingress', 'sky/article-template/nodes']);
assert.deepEqual(placementTemplateKeys('sun', 'libra'), [exact, ingress]);
for (const planet of 'sun moon mercury venus mars jupiter saturn uranus neptune pluto chiron lilith north-node south-node'.split(' ')) {
  for (const sign of 'aries taurus gemini cancer leo virgo libra scorpio sagittarius capricorn aquarius pisces'.split(' ')) {
    const reference = skyArticleVisitReference({ planet, sign, body: 'Untrusted client template.' }, SKY_INGRESS_ARTICLE_FORMAT);
    assert.deepEqual(reference, { planet, sign, content_key: `sky/article-template/${planet}/${sign}`, body: SKY_INGRESS_ARTICLE_TEMPLATE, origin: 'standard-ingress-layout' });
    assert(!('status' in reference) && !('ownerApproved' in reference), 'The app layout never fabricates a template approval.');
  }
}
assert.equal(skyArticleVisitReference(undefined, SKY_INGRESS_ARTICLE_FORMAT), null, 'Existing saved-template requests retain their original path.');
for (const value of [null, [], 'moon/gemini', { planet: 'invalid', sign: 'gemini' }, { planet: 'moon', sign: 'invalid' }])
  assert.throws(() => skyArticleVisitReference(value, SKY_INGRESS_ARTICLE_FORMAT));
assert.throws(() => skyArticleVisitReference({ planet: 'moon', sign: 'gemini' }, 'saved-template'));
assert.deepEqual(skyMoonDatedDayBounds('2026-10-28'), { day: '2026-10-28', nextDay: '2026-10-29', start: '2026-10-28T04:00:00.000Z', end: '2026-10-29T04:00:00.000Z' });
assert.equal(skyMoonDatedDayBounds('2026-11-01').end, '2026-11-02T05:00:00.000Z', 'Existing saved day articles retain the 25-hour DST day.');
assert.equal(skyMoonDatedDayBounds('2027-03-14').start, '2027-03-14T05:00:00.000Z');
assert.equal(skyMoonDatedDayBounds('2027-03-14').end, '2027-03-15T04:00:00.000Z', 'Existing saved day articles retain the 23-hour DST day.');
assert.throws(() => skyMoonDatedDayBounds('2026-02-30'));
console.log('PASS article reconciliation: 168 full-visit layouts, saved template guards, invalid identities and existing-day DST boundaries.');
