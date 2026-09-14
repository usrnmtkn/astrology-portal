import assert from 'node:assert/strict';
import { sha256Text } from '../apps/web/src/content/fallbackArchitectureV3/resolver/contentIntegrity.mjs';
import { makeSkyIngressComposition, validateSkyIngressComposition } from '../apps/web/src/content/fallbackArchitectureV3/resolver/skyIngressComposition.mjs';
import { skyPlacementVariableIssues } from '../apps/web/src/content/fallbackArchitectureV3/resolver/skyPlacementVariables.mjs';
import { SKY_WRITING_LIBRARY_FIELD_IDS } from '../apps/web/src/content/fallbackArchitectureV3/resolver/skyWritingLibraryRegistry.mjs';
import {
  isSkyPlacementArticleField, skyPlacementArticleVariableIssues,
  fillSkyPlacementArticleVariables, skyPlacementArticleVariableSegments,
  skyPlacementArticlePublicationIssues, skyPlacementArticleDependencyText
} from '../apps/web/src/content/fallbackArchitectureV3/resolver/skyPlacementArticleVariables.mjs';
const key = 'sky-placement/article/saturn/aries';
const makeOwner = () => ({ contentKey: key, planet: 'saturn', sign: 'aries', ingress: { ...makeSkyIngressComposition(), modules: [] }, placementArticle: '' });
const source = (kind, text) => ({ kind, text });
const owner = makeOwner();
Object.assign(owner.ingress.sources, {
  planetDescriptor: source('planet', 'a fixture planet descriptor'),
  signMethod: source('sign', 'using a fixture sign method'),
  openingHook: source('placement', 'Fixture opening.'),
  placementPressure: source('placement', 'a fixture pressure'),
  closingLine: source('placement', 'Fixture ending with $& preserved.'),
  bodyMotionNote: source('placement', '{{planetTitle}} is {{motion}}.')
});
const raw = '{{openingHook}}\n\n{{planetTitle}}, {{planetDescriptor}}, works by {{signMethod}}.\nThe challenge is {{placementPressure}}. {{bodyMotionNote}}\n\n{{closingLine}}';
const facts = { planetTitle: 'Saturn', signTitle: 'Aries', motion: 'direct', entryDate: 'Fixture entry', exitDate: 'Fixture exit' };
owner.placementArticle = raw;
const before = JSON.stringify(owner);
assert.deepEqual(skyPlacementArticleVariableIssues(raw, owner), []);
assert.deepEqual(skyPlacementArticlePublicationIssues(owner, [owner]), []);
assert.equal(fillSkyPlacementArticleVariables(raw, facts, owner, [owner]), 'Fixture opening.\n\nSaturn, a fixture planet descriptor, works by using a fixture sign method.\nThe challenge is a fixture pressure. Saturn is direct.\n\nFixture ending with $& preserved.');
assert.equal(JSON.stringify(owner), before);
assert.equal(owner.ingress.enabled, false);
assert.equal(SKY_WRITING_LIBRARY_FIELD_IDS.length, new Set(SKY_WRITING_LIBRARY_FIELD_IDS).size);
assert(SKY_WRITING_LIBRARY_FIELD_IDS.includes('planetFunction'));
assert(skyPlacementVariableIssues('{{openingHook}}').length, 'fallback fact-only contract must not widen');
for (const path of ['placementArticle', 'placementArticleDirect', 'placementArticleRetrograde']) assert(isSkyPlacementArticleField(key, path));
for (const path of ['fallback.hook', 'Body', 'tldrWhat', 'ingress']) assert(!isSkyPlacementArticleField(key, path));
assert(!isSkyPlacementArticleField('sky-placement/retrograde/saturn', 'placementArticle'));
for (const bad of ['{{unknown}}', '{{fallback.hook}}', '{{constructor}}', '{{prototype}}', '{{__proto__}}', '{{#openingHook}}', '{{openingHook', '{{openingHook}}}}', '{{passEntryDate}}', '{{passExitDate}}']) {
  assert(skyPlacementArticleVariableIssues(bad, owner).length, bad);
  assert.throws(() => fillSkyPlacementArticleVariables(bad, facts, owner, [owner]), /SKY_V4_SOURCE_GAP/, bad);
}
const incomplete = makeOwner();
incomplete.placementArticle = 'Beginning {{placementOpportunity}} ending.';
assert.deepEqual(skyPlacementArticleVariableIssues(incomplete.placementArticle, incomplete), [], 'known empty phrases may be drafted');
assert(skyPlacementArticlePublicationIssues(incomplete).some(issue => issue.includes('placementOpportunity')));
assert.throws(() => fillSkyPlacementArticleVariables(incomplete.placementArticle, facts, incomplete), /unavailable article variables/);
const gap = skyPlacementArticleVariableSegments(incomplete.placementArticle, facts, incomplete).find(part => part.token);
assert.equal(gap.text, '{{placementOpportunity}}'); assert.equal(gap.available, false);
assert(skyPlacementArticlePublicationIssues({ contentKey: key, placementArticle: '{{openingHook}}' }).length, 'no ingress must not bypass publish check');
assert.throws(() => fillSkyPlacementArticleVariables('{{entryDate}}', {}, owner), /missing calculated facts/);
assert.equal(fillSkyPlacementArticleVariables('{{aspectsInSignCount}}', { aspectsInSignCount: '0' }, owner), '0');
owner.placementArticle = '{{openingHook}}';
owner.placementArticleRetrograde = '{{emptyRetrogradePhrase}}';
owner.ingress.sources.emptyRetrogradePhrase = source('placement', '');
assert(skyPlacementArticlePublicationIssues(owner).some(issue => issue.startsWith('placementArticleRetrograde')));
delete owner.placementArticleRetrograde;
assert.deepEqual(skyPlacementArticlePublicationIssues(owner), [], 'unreferenced empty source stays optional');
owner.ingress.sources.openingHook = source('placement', '{{planetTitle}} from {{entryDate}}.');
assert.deepEqual(skyPlacementArticlePublicationIssues(owner), [], 'calculated dates unavailable during publication are not invented');
assert.equal(fillSkyPlacementArticleVariables('{{openingHook}}', facts, owner), 'Saturn from Fixture entry.');
owner.ingress.sources.openingHook.text = '{{aspectsWhileRetrograde}}';
assert(skyPlacementArticleDependencyText(owner).includes('{{aspectsWhileRetrograde}}'));
for (const nested of ['{{closingLine}}', '{{openingHook}}', '{{#planetTitle}}', '{{planetTitle.x}}']) {
  owner.ingress.sources.openingHook.text = nested;
  assert(skyPlacementArticlePublicationIssues(owner).length, 'no nested phrase expansion');
  assert.throws(() => fillSkyPlacementArticleVariables('{{openingHook}}', facts, owner));
}
owner.ingress.sources.openingHook = source('sign', 'Wrong scope');
assert(skyPlacementArticlePublicationIssues(owner).some(issue => issue.includes('scope')));
const linkOwner = makeOwner();
const target = { ...makeOwner(), contentKey: 'sky-placement/article/saturn/taurus' };
target.ingress.sources.planetDescriptor = source('planet', 'exact shared fixture language');
const link = (kind, record, field) => ({ kind, reference: { contentKey: record.contentKey, field: `ingress.sources.${field}`, sha256: sha256Text(record.ingress.sources[field].text) } });
linkOwner.placementArticle = '{{planetDescriptor}}';
linkOwner.ingress.sources.planetDescriptor = link('planet', target, 'planetDescriptor');
validateSkyIngressComposition(linkOwner.ingress);
assert.equal(fillSkyPlacementArticleVariables(linkOwner.placementArticle, facts, linkOwner, [target]), 'exact shared fixture language');
assert.deepEqual(skyPlacementArticlePublicationIssues(linkOwner, [target]), []);
assert(skyPlacementArticlePublicationIssues(linkOwner, []).length, 'unavailable/retired reference fails');
const changed = structuredClone(target); changed.ingress.sources.planetDescriptor.text = 'a newer version';
assert(skyPlacementArticlePublicationIssues(linkOwner, [changed]).some(issue => issue.includes('changed')));
const foreignPlanet = { ...target, contentKey: 'sky-placement/article/venus/taurus' };
linkOwner.ingress.sources.planetDescriptor = link('planet', foreignPlanet, 'planetDescriptor');
assert(skyPlacementArticlePublicationIssues(linkOwner, [foreignPlanet]).some(issue => issue.includes('scope')));
const sameSign = { ...makeOwner(), contentKey: 'sky-placement/article/venus/aries' };
sameSign.ingress.sources.signMethod = source('sign', 'shared sign fixture');
linkOwner.placementArticle = '{{signMethod}}'; linkOwner.ingress.sources.signMethod = link('sign', sameSign, 'signMethod');
assert.equal(fillSkyPlacementArticleVariables('{{signMethod}}', facts, linkOwner, [sameSign]), 'shared sign fixture');
const otherSign = { ...sameSign, contentKey: 'sky-placement/article/venus/taurus' };
linkOwner.ingress.sources.signMethod = link('sign', otherSign, 'signMethod');
assert(skyPlacementArticlePublicationIssues(linkOwner, [otherSign]).some(issue => issue.includes('scope')));
linkOwner.placementArticle = '{{openingHook}}';
sameSign.ingress.sources.openingHook = source('placement', 'Foreign placement fixture');
linkOwner.ingress.sources.openingHook = link('placement', sameSign, 'openingHook');
assert(skyPlacementArticlePublicationIssues(linkOwner, [sameSign]).some(issue => issue.includes('scope')));
linkOwner.placementArticle = '{{planetDescriptor}}'; linkOwner.ingress.sources.planetDescriptor = link('planet', target, 'planetDescriptor');
const chained = structuredClone(target); chained.ingress.sources.planetDescriptor = link('planet', target, 'planetDescriptor');
assert(skyPlacementArticlePublicationIssues(linkOwner, [chained]).some(issue => issue.includes('chained')));
const factSpoof = { ...facts, planetDescriptor: 'injected phrase from facts' };
assert.throws(() => fillSkyPlacementArticleVariables('{{planetDescriptor}}', factSpoof, makeOwner()), /unavailable/);
console.log('PASS: article phrase syntax, deterministic substitution, draft gaps, publish requirements, scope, reference hashes, non-recursion and immutable inputs.');
