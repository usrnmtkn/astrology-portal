import assert from 'node:assert/strict';
import { SKY_PLACEMENT_PLANET_SIGN_INGRESS_TEMPLATE, SKY_PLACEMENT_PLANET_SIGN_NATAL_TEMPLATE } from '../apps/web/src/content/fallbackArchitectureV3/resolver/skyPlacementPlanetSignTemplate.mjs';
import { fillSkyPlacementArticleVariables, skyPlacementArticleVariableIssues } from '../apps/web/src/content/fallbackArchitectureV3/resolver/skyPlacementArticleVariables.mjs';
import { makeSkyIngressComposition } from '../apps/web/src/content/fallbackArchitectureV3/resolver/skyIngressComposition.mjs';
import { skyPlacementVariableFacts } from '../apps/web/src/content/fallbackArchitectureV3/resolver/skyPlacementVariables.mjs';
import { preferSkyWritingLibrary } from '../apps/admin/src/skyWritingLibrary.ts';

assert.equal(skyPlacementArticleVariableIssues(SKY_PLACEMENT_PLANET_SIGN_INGRESS_TEMPLATE).length, 0);
assert.equal(skyPlacementArticleVariableIssues(SKY_PLACEMENT_PLANET_SIGN_NATAL_TEMPLATE).length, 0);
assert.match(SKY_PLACEMENT_PLANET_SIGN_INGRESS_TEMPLATE, /From \{\{entryDate\}\} to \{\{exitDate\}\}/);
assert.match(SKY_PLACEMENT_PLANET_SIGN_NATAL_TEMPLATE, /was in \{\{signTitle\}\} when you were born/);
assert(!SKY_PLACEMENT_PLANET_SIGN_INGRESS_TEMPLATE.includes('when you were born'));
assert.match(SKY_PLACEMENT_PLANET_SIGN_INGRESS_TEMPLATE, /^The challenge$/m);
assert(!SKY_PLACEMENT_PLANET_SIGN_INGRESS_TEMPLATE.includes('{{#if'));
assert(!SKY_PLACEMENT_PLANET_SIGN_INGRESS_TEMPLATE.includes('experienceWork'));

const owner = {
  contentKey: 'sky-placement/article/saturn/aries',
  planet: 'saturn',
  sign: 'aries',
  ingress: makeSkyIngressComposition(),
  placementArticle: SKY_PLACEMENT_PLANET_SIGN_INGRESS_TEMPLATE
};
owner.ingress.sources.planetFunction.text = 'limits, time, and the work of keeping a structure usable';
owner.ingress.sources.signCoreDrive.text = 'a clean start';
owner.ingress.sources.signMethod.text = 'acting first and sorting the details later';
owner.ingress.sources.placementThesis.text = 'Fixture thesis that is specific to Saturn in Aries.';
owner.ingress.sources.placementDignityMechanism.text = 'the fixture mechanism is specific to Saturn in Aries';
owner.ingress.sources.placementDignityExpression.text = 'hold a long plan in a situation that wants an immediate answer';
owner.ingress.sources.experienceGeneral.text = 'Fixture lived situation with a consequence.';
owner.ingress.sources.placementOpportunity.text = 'Fixture opportunity through that situation.';
owner.ingress.sources.placementPressure.text = 'Fixture challenge that names a cost.';
owner.ingress.sources.responseSentence.text = 'Fixture response to that difficulty.';
owner.ingress.sources.practiceClosingLine.text = 'Fixture closing perspective.';

const facts = skyPlacementVariableFacts({
  planet: 'saturn',
  sign: 'aries',
  facts: { entryDate: 'March 1, 2026', exitDate: 'May 1, 2026' }
});
const rendered = fillSkyPlacementArticleVariables(SKY_PLACEMENT_PLANET_SIGN_INGRESS_TEMPLATE, facts, owner);
assert.match(rendered, /From March 1, 2026 to May 1, 2026, Saturn moves through Aries/);
assert.match(rendered, /Saturn describes limits, time, and the work of keeping a structure usable, while Aries pursues a clean start through acting first and sorting the details later/);
assert.match(rendered, /Aries is the sign of Saturn’s fall/);
assert.match(rendered, /The challenge\n\nFixture challenge that names a cost/);
assert(!rendered.includes('{{'));
assert(!rendered.includes('when you were born'));

const preferred = preferSkyWritingLibrary(makeSkyIngressComposition());
assert.equal(preferred.enabled, false);
assert(preferred.modules.some(module => module.id === 'library-opening' && module.required && module.template.includes('moves through')));
assert(preferred.modules.some(module => module.id === 'library-dignity' && module.template === '{{placementDignityMeaning}}'));
assert(!preferred.modules.find(module => module.id === 'practice')?.required);

const existing = makeSkyIngressComposition();
existing.sources.planetFunctionSentence.text = 'Existing V5 planet sentence.';
const preferredExisting = preferSkyWritingLibrary(existing);
assert.equal(preferredExisting.sources.planetFunctionSentence.text, 'Existing V5 planet sentence.');
assert(preferredExisting.modules.some(module => module.id === 'library-opening' && module.enabled && module.required));
assert.equal(preferredExisting.modules.find(module => module.id === 'practice')?.enabled, false);
assert.equal(preferredExisting.modules.find(module => module.id === 'practice')?.required, false);
assert.equal(preferredExisting.enabled, false);

console.log('PASS: planet-in-sign Sky template is ingress-only, dignity is selected before render, and natal wording stays out of Sky.');
