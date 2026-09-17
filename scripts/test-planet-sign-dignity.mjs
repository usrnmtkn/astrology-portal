import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DIGNITY_SIGNS, planetSignDebilities, planetSignDignity, traditionalSkyDebilities } from '../apps/web/src/services/planetSignDignity.mjs';
import { placementDignityTemplate, placementDignityForSource, migrateLegacyDignityComposition } from '../apps/web/src/content/fallbackArchitectureV3/resolver/placementDignityMeaning.mjs';
import { makeSkyIngressComposition, resolveIngressSource, renderSkyIngressComposition, skyIngressPublicationIssues, validateSkyIngressComposition } from '../apps/web/src/content/fallbackArchitectureV3/resolver/skyIngressComposition.mjs';
import { skyPlacementVariableFacts } from '../apps/web/src/content/fallbackArchitectureV3/resolver/skyPlacementVariables.mjs';
import { fillSkyPlacementArticleVariables, skyPlacementArticlePublicationIssues } from '../apps/web/src/content/fallbackArchitectureV3/resolver/skyPlacementArticleVariables.mjs';
import { sha256Text } from '../apps/web/src/content/fallbackArchitectureV3/resolver/contentIntegrity.mjs';

// An independent fixture preserves the existing seven-planet chart contract.
const expected = {
  Sun: { Leo: ['domicile'], Aries: ['exaltation'], Aquarius: ['detriment'], Libra: ['fall'] },
  Moon: { Cancer: ['domicile'], Taurus: ['exaltation'], Capricorn: ['detriment'], Scorpio: ['fall'] },
  Mercury: { Gemini: ['domicile'], Virgo: ['domicile', 'exaltation'], Sagittarius: ['detriment'], Pisces: ['detriment', 'fall'] },
  Venus: { Taurus: ['domicile'], Libra: ['domicile'], Pisces: ['exaltation'], Aries: ['detriment'], Scorpio: ['detriment'], Virgo: ['fall'] },
  Mars: { Aries: ['domicile'], Scorpio: ['domicile'], Capricorn: ['exaltation'], Taurus: ['detriment'], Libra: ['detriment'], Cancer: ['fall'] },
  Jupiter: { Sagittarius: ['domicile'], Pisces: ['domicile'], Cancer: ['exaltation'], Gemini: ['detriment'], Virgo: ['detriment'], Capricorn: ['fall'] },
  Saturn: { Capricorn: ['domicile'], Aquarius: ['domicile'], Libra: ['exaltation'], Cancer: ['detriment'], Leo: ['detriment'], Aries: ['fall'] }
};
for (const [planet, signs] of Object.entries(expected)) for (const sign of DIGNITY_SIGNS) {
  test(`${planet} in ${sign} preserves the complete chart lookup`, () => {
    const result = planetSignDignity(planet, sign);
    const dignities = signs[sign] ?? [];
    assert.equal(result.status, 'known');
    assert.deepEqual(result.dignities, dignities);
    assert.equal(result.variant, dignities.join('_') || 'none');
    assert(!JSON.stringify(result).includes('peregrine'));
  });
}
function ownerFor(planet = 'saturn', sign = 'aries') {
  const ingress = makeSkyIngressComposition();
  ingress.enabled = true;
  ingress.sources.bodyFixture = { kind: 'placement', text: 'Fixture opening. Fixture final sentence.' };
  ingress.modules = [
    { id: 'body', label: 'Body', template: '{{bodyFixture}}', enabled: true, required: true, motion: 'all', duration: 'all', timing: 'all' },
    ingress.modules.find(module => module.id === 'dignity')
  ];
  return { contentKey: `sky-placement/article/${planet}/${sign}`, ingress };
}
function withComponents(owner) {
  owner.ingress.sources.placementDignityMechanism.text = 'the fixture mechanism is specific to {{planetTitle}} in {{signTitle}}';
  owner.ingress.sources.placementDignityExpression.text = 'complete the fixture activity';
  return owner;
}
function inputFor(owner) {
  const [planet, sign] = owner.contentKey.split('/').slice(2);
  return { planet, sign, isRetrograde: false };
}
function article(owner, copy = 'Fixture opening.\n\n{{placementDignityMeaning}}\n\nFixture final sentence.', input = inputFor(owner)) {
  return fillSkyPlacementArticleVariables(copy, skyPlacementVariableFacts(input), owner);
}
test('traditional sky debilities count unique seven-planet detriment and fall once', () => {
  assert.deepEqual(planetSignDebilities('Mercury', 'Pisces'), ['detriment', 'fall']);
  assert.deepEqual(planetSignDebilities('Sun', 'Leo'), []);
  const snapshot = traditionalSkyDebilities([
    { planet: 'Sun', sign: 'Leo' },
    { planet: 'Moon', sign: 'Scorpio' },
    { planet: 'Mercury', sign: 'Pisces' },
    { planet: 'Mercury', sign: 'Pisces' },
    { planet: 'Venus', sign: 'Aries' },
    { planet: 'Mars', sign: 'Capricorn' },
    { planet: 'Jupiter', sign: 'Capricorn' },
    { planet: 'Saturn', sign: 'Aries' },
    { planet: 'Uranus', sign: 'Taurus' },
    { planet: 'Neptune', sign: 'Aries' }
  ]);
  assert.equal(snapshot.traditionalCount, 7);
  assert.equal(snapshot.knownCount, 7);
  assert.equal(snapshot.count, 5);
  assert.deepEqual(snapshot.planets.map(row => [row.planet, row.sign, row.dignities.join('+')]), [
    ['Moon', 'Scorpio', 'fall'],
    ['Mercury', 'Pisces', 'detriment+fall'],
    ['Venus', 'Aries', 'detriment'],
    ['Jupiter', 'Capricorn', 'fall'],
    ['Saturn', 'Aries', 'fall']
  ]);
  assert.equal(traditionalSkyDebilities([]).count, 0);
  assert.equal(traditionalSkyDebilities([{ planet: 'Pluto', sign: 'Aquarius' }]).knownCount, 0);
});
test('normalization, invalid input, unsupported bodies and mutable callers are independent', () => {
  assert.equal(planetSignDignity(' MERCURY ', 'viRGo').variant, 'domicile_exaltation');
  for (const planet of ['Uranus', 'Neptune', 'Pluto', 'Chiron', 'Lilith', 'North Node', 'South Node', 'Ascendant', 'Midheaven']) assert.equal(planetSignDignity(planet, 'Aries').status, 'not_applicable');
  for (const [planet, sign] of [[null, 'Aries'], ['Saturn', undefined], ['Saturn', 'Ariesx'], ['Satun', 'Aries'], ['constructor', 'Aries'], [{}, 'Aries']]) assert.equal(planetSignDignity(planet, sign).status, 'invalid');
  const result = planetSignDignity('Mercury', 'Virgo');
  result.dignities.length = 0;
  assert.deepEqual(planetSignDignity('Mercury', 'Virgo').dignities, ['domicile', 'exaltation']);
});
test('calculated condition overrides supplied text and is independent of retrograde', () => {
  for (const isRetrograde of [false, true]) assert.equal(skyPlacementVariableFacts({ planet: 'Mercury', sign: 'Virgo', isRetrograde, facts: { placementDignity: 'fall' } }).placementDignity, 'domicile and exaltation');
  assert.equal(skyPlacementVariableFacts({ planet: 'Sun', sign: 'Virgo' }).placementDignity, 'no major sign condition');
  assert.equal(skyPlacementVariableFacts({ planet: 'Uranus', sign: 'Gemini' }).placementDignity, 'not applicable');
  assert.equal(skyPlacementVariableFacts({ planet: '', sign: 'Virgo', facts: { placementDignity: 'domicile' } }).placementDignity, undefined);
});
test('all seven templates keep natal and ingress registers explicit and distinct', () => {
  for (const variant of ['domicile', 'exaltation', 'detriment', 'fall', 'none', 'domicile_exaltation', 'detriment_fall']) {
    const natal = placementDignityTemplate(variant, 'natal'), ingress = placementDignityTemplate(variant, 'ingress');
    assert.notEqual(natal, ingress);
    assert(natal.includes('{{placementDignityMechanism}}'));
    assert(ingress.includes('{{placementDignityExpression}}'));
    assert(!natal.includes('During this period'));
    assert(!ingress.includes('your capacity'));
  }
  assert.match(placementDignityTemplate('none', 'ingress'), /^Here,/);
  assert(!placementDignityTemplate('none', 'ingress').includes('is not in domicile'));
  assert.match(placementDignityTemplate('none', 'natal'), /is not in domicile, exaltation, detriment, or fall/);
  assert.throws(() => placementDignityTemplate('fall', 'unknown'));
  assert.throws(() => placementDignityTemplate('peregrine', 'ingress'));
});
test('applicable missing writing blocks even an optional dignity module and a complete article', () => {
  const owner = ownerFor();
  const result = renderSkyIngressComposition(owner, inputFor(owner));
  assert.equal(result.status, 'incomplete'); assert.equal(result.body, '');
  assert(skyIngressPublicationIssues(owner).some(issue => issue.includes('placementDignityMechanism')));
  assert.throws(() => article(owner), /placementDignityMechanism/);
  owner.placementArticle = '{{placementDignityMeaning}}';
  assert(skyPlacementArticlePublicationIssues(owner).length);
});
test('completed component sources resolve the matching condition without a model call', () => {
  for (const [planet, sign, marker] of [['sun','leo','in domicile'], ['sun','aries','exaltation'], ['venus','aries','in detriment'], ['saturn','aries','fall'], ['mercury','virgo','both domicile and exaltation'], ['mercury','pisces','both detriment and fall'], ['sun','virgo','emphasis is on how we']]) {
    const owner = withComponents(ownerFor(planet, sign));
    const output = renderSkyIngressComposition(owner, inputFor(owner));
    assert.equal(output.status, 'ready');
    assert(output.body.includes(marker));
    assert(output.body.includes('the fixture mechanism'));
    assert(!output.body.includes('{{'));
    assert.deepEqual(skyIngressPublicationIssues(owner), []);
    owner.placementArticle = 'Fixture opening.\n\n{{placementDignityMeaning}}\n\nFixture final sentence.';
    assert.deepEqual(skyPlacementArticlePublicationIssues(owner), []);
    assert(article(owner).includes(marker));
  }
});
test('none of the four conditions still requires authored explanation and is not peregrine', () => {
  const owner = ownerFor('sun', 'virgo');
  assert(skyIngressPublicationIssues(owner).some(issue => issue.includes('placementDignityMechanism')));
  assert.throws(() => article(owner), /placementDignityMechanism/);
  assert(!JSON.stringify(planetSignDignity('sun', 'virgo')).includes('peregrine'));
});
test('outside-framework omission never creates a fragment', () => {
  const owner = ownerFor('uranus', 'gemini');
  assert.deepEqual(skyIngressPublicationIssues(owner), []);
  const rendered = renderSkyIngressComposition(owner, inputFor(owner));
  assert.equal(rendered.status, 'ready');
  assert.equal(rendered.body, owner.ingress.sources.bodyFixture.text);
  assert.match(rendered.trace.find(part => part.id === 'dignity').reason, /outside/);
  for (const newline of ['\n\n', '\r\n\r\n', '\n \n']) {
    const output = article(owner, `Fixture opening.${newline}{{ placementDignityMeaning }}${newline}Fixture final sentence.`);
    assert(!output.includes('{{'));
    assert(output.startsWith('Fixture opening.')); assert(output.endsWith('Fixture final sentence.'));
  }
  assert.throws(() => article(owner, 'A fragment: {{placementDignityMeaning}}.'), /own paragraph/);
  owner.placementArticle = 'A fragment: {{placementDignityMeaning}}.';
  assert(skyPlacementArticlePublicationIssues(owner).some(issue => issue.includes('own paragraph')));
  owner.ingress.modules[1].template = 'A fragment: {{placementDignityMeaning}}.';
  assert.equal(renderSkyIngressComposition(owner, inputFor(owner)).status, 'incomplete');
  assert(skyIngressPublicationIssues(owner).some(issue => issue.includes('standalone')));
});
test('invalid identity is not an empty/no-dignity success and owner/occurrence mismatch is rejected', () => {
  const owner = withComponents(ownerFor());
  for (const input of [{ planet:'sun', sign:'leo' }, {planet:'saturn',sign:''}]) {
    assert.equal(placementDignityForSource(owner, input).status, 'invalid');
    assert.equal(renderSkyIngressComposition(owner, input).status, 'incomplete');
    assert.throws(() => article(owner, '{{placementDignityMeaning}}', input));
  }
  const badOwner = ownerFor('saturn','ariesx');
  assert(skyIngressPublicationIssues(badOwner).length);
});
test('full authored override and legacy alias preserve exact bytes without generated suffixes', () => {
  for (const field of ['placementDignityMeaning','dignitySentence']) {
    const owner = withComponents(ownerFor());
    const text = '  Fixture full authored paragraph.\nIts final sentence stays intact.  ';
    owner.ingress.sources[field] = {kind:'placement',text};
    assert.equal(resolveIngressSource(owner,'placementDignityMeaning').text,text);
    assert.equal(article(owner,'{{placementDignityMeaning}}'),text);
    assert.equal(renderSkyIngressComposition(owner,inputFor(owner)).trace.find(part=>part.id==='dignity').text,text);
  }
});
test('explicit migration preserves originals, references and disabled/review state, and refuses conflicts', () => {
  const owner=ownerFor(); owner.ingress.enabled=false;
  const text='Fixture legacy paragraph exactly.';
  owner.ingress.sources.dignitySentence={kind:'placement',text};
  owner.ingress.modules[1].template='{{dignitySentence}}';
  const original=JSON.stringify(owner);
  const next=migrateLegacyDignityComposition(owner.ingress,owner);
  assert.equal(JSON.stringify(owner),original);
  assert.equal(next.enabled,false);
  assert.deepEqual(next.sources.placementDignityMeaning,next.sources.dignitySentence);
  assert.equal(next.modules[1].template,'{{placementDignityMeaning}}');
  assert.equal(article({...owner,ingress:next},'{{placementDignityMeaning}}'),text);
  next.sources.placementDignityMeaning.text='Different newer paragraph.';
  assert.throws(()=>migrateLegacyDignityComposition(next,owner),/neither was overwritten/);
  assert.throws(()=>migrateLegacyDignityComposition(owner.ingress,ownerFor('uranus','gemini')),/was not changed/);
  owner.ingress.sources.dignitySentence={kind:'placement',reference:{contentKey:owner.contentKey,field:'ingress.sources.oldParagraph',sha256:sha256Text(text)}};
  const linked=migrateLegacyDignityComposition(owner.ingress,owner);
  assert.deepEqual(linked.sources.placementDignityMeaning.reference,owner.ingress.sources.dignitySentence.reference);
});
test('wrong grammatical forms, nested prose, cross-placement sources and stale hashes fail closed', () => {
  for (const [field,text] of [['placementDignityMechanism','A complete sentence.'],['placementDignityExpression','to complete the fixture activity'],['placementDignityExpression','complete it!']]) {
    const owner=withComponents(ownerFor()); owner.ingress.sources[field].text=text;
    assert(resolveIngressSource(owner,'placementDignityMeaning').reason);
  }
  const owner=withComponents(ownerFor());
  owner.ingress.sources.placementDignityMechanism.text='{{placementDignityExpression}}';
  assert.throws(()=>validateSkyIngressComposition(owner.ingress),/Unknown ingress slot/);
  const target=withComponents(ownerFor('saturn','taurus'));
  owner.ingress.sources.placementDignityMechanism={kind:'placement',reference:{contentKey:target.contentKey,field:'ingress.sources.placementDignityMechanism',sha256:sha256Text(target.ingress.sources.placementDignityMechanism.text)}};
  assert.match(resolveIngressSource(owner,'placementDignityMeaning',[target]).reason,/scope/i);
  target.contentKey=owner.contentKey;
  owner.ingress.sources.placementDignityMechanism.reference.contentKey=owner.contentKey;
  target.ingress.sources.placementDignityMechanism.text+=' changed';
  assert.match(resolveIngressSource(owner,'placementDignityMeaning',[target]).reason,/changed/);
});
test('new structure is disabled and legacy manual modules are not silently migrated', () => {
  assert.equal(makeSkyIngressComposition().enabled,false);
  const owner=ownerFor();
  owner.ingress.sources.dignitySentence.text='Fixture legacy text.';
  owner.ingress.modules[1].template='{{dignitySentence}}';
  const before=JSON.stringify(owner);
  assert(renderSkyIngressComposition(owner,inputFor(owner)).body.endsWith('Fixture legacy text.'));
  assert.equal(JSON.stringify(owner),before);
});
