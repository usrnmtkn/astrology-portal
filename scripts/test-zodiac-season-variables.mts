import assert from 'node:assert/strict';
import { installSkyWritingLibrary } from '../apps/admin/src/skyWritingLibrary';
import { SKY_WRITING_LIBRARY_GROUPS } from '../apps/web/src/content/fallbackArchitectureV3/resolver/skyWritingLibraryRegistry.mjs';
import { makeSkyIngressComposition, validateSkyIngressComposition, renderSkyIngressComposition } from '../apps/web/src/content/fallbackArchitectureV3/resolver/skyIngressComposition.mjs';
import { fillSkyPlacementArticleVariables, skyPlacementArticlePublicationIssues } from '../apps/web/src/content/fallbackArchitectureV3/resolver/skyPlacementArticleVariables.mjs';
import { sha256Text } from '../apps/web/src/content/fallbackArchitectureV3/resolver/contentIntegrity.mjs';

const fields = ['zodiacSeason', 'zodiacSeasonPolarAxis'];
const signGroup = SKY_WRITING_LIBRARY_GROUPS.find(group => group.id === 'sign')!;
for (const name of fields) assert.equal(signGroup.fields.find(field => field.id === name)?.kind, 'sign');
const old = makeSkyIngressComposition();
old.sources.signMethod = { kind: 'sign', text: 'Existing approved fixture method.' };
const before = JSON.stringify(old);
const expanded = installSkyWritingLibrary(old);
assert.equal(JSON.stringify(old), before, 'Preparing new fields must not mutate saved writing.');
assert.equal(expanded.sources.signMethod.text, old.sources.signMethod.text);
for (const name of fields) assert.equal(expanded.sources[name], undefined, 'Shared sources must not be shadowed by empty local values');
validateSkyIngressComposition(expanded);

const signs = ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'];
for (const [index, sign] of signs.entries()) {
 const opposite = signs[(index + 6) % signs.length];
 const source = { contentKey: `sky-placement/article/sun/${sign}`, ingress: structuredClone(expanded) };
 source.ingress.sources.zodiacSeason = { kind: 'sign', text: `Fixture ${sign} season paragraph. Another complete sentence.` };
 source.ingress.sources.zodiacSeasonPolarAxis = { kind: 'sign', text: `Fixture ${sign}–${opposite} axis paragraph. Another complete sentence.` };
 const consumer = { contentKey: `sky-placement/article/venus/${sign}`, ingress: structuredClone(expanded), placementArticle: '{{zodiacSeason}}\n\n{{zodiacSeasonPolarAxis}}' };
 for (const name of fields) consumer.ingress.sources[name] = { kind: 'sign', reference: { contentKey: source.contentKey, field: `ingress.sources.${name}`, sha256: sha256Text(source.ingress.sources[name].text) } };
 const expected = fields.map(name => source.ingress.sources[name].text).join('\n\n');
 assert.deepEqual(skyPlacementArticlePublicationIssues(consumer, [source]), []);
 assert.equal(fillSkyPlacementArticleVariables(consumer.placementArticle, {}, consumer, [source]), expected);
 const otherSign = { ...source, contentKey: `sky-placement/article/sun/${opposite}` };
 const wrong = structuredClone(consumer);
 wrong.ingress.sources.zodiacSeason.reference.contentKey = otherSign.contentKey;
 assert(skyPlacementArticlePublicationIssues(wrong, [source, otherSign]).some(issue => issue.includes('scope')));
 for (const name of fields) {
  const blank = structuredClone(source); blank.ingress.sources[name].text = '';
  assert(skyPlacementArticlePublicationIssues({ ...blank, placementArticle: `{{${name}}}` }, [blank]).some(issue => issue.includes('No writing saved')));
  const changed = structuredClone(source); changed.ingress.sources[name].text += ' Edited revision.';
  assert(skyPlacementArticlePublicationIssues(consumer, [changed]).some(issue => issue.includes('changed')));
 }
}
console.log('PASS: full season and polar-axis prose for all 12 signs, same-sign reuse, opposite-sign isolation, missing-value and stale-reference publication guards, and existing-library preservation.');

const { ZODIAC_SEASON_SOURCE_STARTERS, resolveZodiacSeasonVariables, zodiacSeasonRecordDependencies, supportsZodiacSeasonVariables } = await import('../apps/web/src/content/fallbackArchitectureV3/resolver/zodiacSeasonVariables.mjs');
const shared = ZODIAC_SEASON_SOURCE_STARTERS.map(row => ({ ...row, review_status: 'approved', body: `Fixture ${row.contentKey} first sentence.\n\nFixture complete second paragraph.` }));
assert.equal(shared.length, 24);
for (const sign of signs) {
 const owner = {contentKey: `sky-placement/article/sun/${sign}`, placementArticle: '{{zodiacSeason}}\n\n{{zodiacSeasonPolarAxis}}'};
 const prose = resolveZodiacSeasonVariables(owner.placementArticle, {sign}, shared);
 assert(prose.includes(`zodiac-season/${sign}`));
 assert(prose.includes(`zodiac-season-polar-axis/${sign}`));
 assert.equal(fillSkyPlacementArticleVariables(owner.placementArticle, {}, owner, shared), prose);
 assert.deepEqual(skyPlacementArticlePublicationIssues(owner, shared), []);
 const ingress = makeSkyIngressComposition(); ingress.enabled = true; ingress.modules = [{...ingress.modules[0], required: true, template: owner.placementArticle}];
 assert.equal(renderSkyIngressComposition({...owner, ingress}, {planet: 'sun', sign}, shared).body, prose);
 assert.throws(() => resolveZodiacSeasonVariables(owner.placementArticle, {sign}, shared.map(row => ({...row, review_status: 'needs_review'}))), /Publish/);
 assert.equal(resolveZodiacSeasonVariables('{{zodiacSeason}}', {signATitle: sign, signBTitle: signs[(signs.indexOf(sign)+6)%12]}, shared), shared.find(row => row.contentKey === `fallback-hook/zodiac-season/${sign}`)!.body);
}
assert.equal(zodiacSeasonRecordDependencies({contentKey: 'fallback-template/compat.cross-sign', body: '{{zodiacSeasonPolarAxis}}'}).length, 12);
assert.deepEqual(zodiacSeasonRecordDependencies({contentKey: 'sky-lunation/new-moon/virgo', TLDR_What: '{{zodiacSeason}}'}), [{name: 'zodiacSeason', sign: 'virgo', contentKey: 'fallback-hook/zodiac-season/virgo'}]);
assert.equal(supportsZodiacSeasonVariables({contentKey: 'fallback-template/natal.aspect'}), false);
assert.equal(resolveZodiacSeasonVariables('Unchanged prose.', {}, []), 'Unchanged prose.');
assert.throws(() => resolveZodiacSeasonVariables('{{zodiacSeason}}', {}, shared), /Select a sign/);
console.log('PASS: shared sign source selection, paragraphs, Sky article and composition, primary compatibility sign, publication completeness, and no-sign fail-closed behavior.');
