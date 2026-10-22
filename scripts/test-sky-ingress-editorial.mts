import { ingressWriterFixture } from './fixtures/ingress-writer-context.mts';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import responses from '../src/astro-writing/openAIResponses.cjs';
import effectiveRules from '../src/astro-writing/effectiveRules.cjs';
import { canonicalAstrologyWritingInstructions } from '../src/astro-writing/canonicalInstructions.mjs';
import { buildSkyIngressWritingContext, ingressDignityEvidence, validateSkyIngressWriting, ingressProviderSlots, assembleIngressFields, buildIngressTemplateReference, validateIngressTemplateReference } from '../api/_lib/sky-ingress-writing.ts';
import { generateSkyArticleTemplateSlots } from '../api/_lib/content-generation.ts';
import { calculateSkyArticleEditionFacts } from '../api/_lib/sky-article-facts.ts';
import { sharedGenerationOwnerExamples } from '../api/_lib/shared-generation-owner-examples.ts';
import { ingressArticleFields } from '../api/_lib/transit-ingress-editorial-authority.ts';
const skyIngressEssayFields = ingressArticleFields();
import { ingressFixtureValues } from './fixtures/sky-ingress-writing.mjs';

assert.match(responses.instructionsForRole('WRITER', '', { surface: 'sky', family: 'sky-ingress-essay' }),
  /DATED INGRESS EDITORIAL AUTHORITY/, 'A dated ingress must not inherit the natal/placement article spine.');
const connectedIngress = responses.instructionsForRole('WRITER', '', { surface: 'sky', family: 'sky-ingress-essay' });
assert.match(connectedIngress, /Use Ghostwriter to write one connected article/);
assert.match(connectedIngress, /do not assemble a report from definitions followed by examples/iu);
assert.match(connectedIngress, /without a detachable aspect maxim or opportunity-and-response formula/);
assert.doesNotMatch(responses.instructionsForRole('WRITER', '', { surface: 'you', family: 'transit-aspect' }),
  /Use Ghostwriter to write one connected article/, 'The full-article method is scoped to dated ingress.');
assert.equal(responses.instructionsForRole('WRITER'), canonicalAstrologyWritingInstructions, 'Other writing routes retain their canonical prefix.');
assert.equal(responses.instructionsForRole('WRITER', '', { surface: 'you', family: 'sky-ingress-essay' }), canonicalAstrologyWritingInstructions);
const datedRuleContext = { surface: 'sky', family: 'sky-ingress-essay' };
const defaultRules = effectiveRules.renderEffectiveRulesForPrompt();
assert.match(defaultRules, /a useful next move/);
assert.match(effectiveRules.renderEffectiveRulesForPrompt(datedRuleContext), /not a default paragraph ending/);
for (const otherContext of [{ surface: 'you', family: 'transit-aspect' }, { surface: 'sky', family: 'sky-article-template-slots' }]) {
  assert.doesNotMatch(effectiveRules.renderEffectiveRulesForPrompt(otherContext), /not a default paragraph ending/);
}
assert.deepEqual(effectiveRules.effectiveRulesForSurface(datedRuleContext), effectiveRules.effectiveRulesForSurface(),
  'The scoped prose clarification changes no rule selection, enforcement tier or approval boundary.');
assert.doesNotMatch(responses.instructionsForRole('WRITER', '', { surface: 'sky', family: 'sky-ingress-essay' }),
  /SKY PLACEMENT ARTICLE SPINE|cultural rule and beneficiary|Maintain register consistently\. These sign cores/);

const sourceFetch = globalThis.fetch;
globalThis.fetch = async target => {
  assert(['science.nasa.gov', 'ssd.jpl.nasa.gov'].includes(new URL(String(target)).hostname), 'Only independent NASA reads are intercepted. No provider or storage calls.');
  return new Response('Synthetic independent comparison outage.', { status: 503 });
};
let libra: any, taurus: any;
try {
  libra = await calculateSkyArticleEditionFacts(new Date('2026-10-21T12:00:00Z'), 'sun', 'ingress-essay-v3');
  taurus = await calculateSkyArticleEditionFacts(new Date('2027-05-10T12:00:00Z'), 'sun', 'ingress-essay-v3');
} finally { globalThis.fetch = sourceFetch; }
const context = buildSkyIngressWritingContext(libra);
assert.deepEqual(context.plan.developed.map(event => event.title), ['Sun opposition Neptune', 'Sun opposition Saturn', 'Sun sextile Jupiter']);
assert.equal(context.plan.developed[1].event.dateLabel, 'October 4, 2026');
assert.equal(context.plan.developed[1].event.timeLabel, '8:29 AM ET');
assert.match(context.plan.developed[1].positionsLine, /Sun at 11°18′ Libra, direct, in fall\. Saturn at 11°18′ Aries, retrograde, in fall\./);
const required = context.plan.requiredDates;
assert(!required.some(event => event.title === 'Sun enters Libra'), 'The calculated summary already covers the ingress, including subsecond root differences.');
for (const [title, timing] of [
  ['Full Moon in Aries', 'September 26, 2026 at 12:49 PM ET'],
  ['New Moon in Libra', 'October 10, 2026 at 11:50 AM ET'],
  ['Venus stations retrograde', 'October 3, 2026 at 3:15 AM ET'],
  ['Pluto stations direct', 'October 15, 2026 at 10:40 PM ET'],
  ['Venus enters Libra', 'October 25, 2026 at 5:09 AM ET'],
  ['Venus stations direct', 'November 13, 2026 at 7:27 PM ET'],
]) assert(required.some(event => event.title === title && event.prefix.includes(timing)), `Required complete event: ${title}.`);
assert(required.filter(event => event.event.period === 'after-ingress-window').every(event => event.prefix.startsWith('- Follow through: ')));
assert(context.plan.meaningSources.some(source => source.sourceId === 'cc/moon-phase/full-moon'));
assert(context.plan.meaningSources.some(source => source.sourceId === 'cc/moon-phase/new-moon'));
assert(context.plan.meaningSources.some(source => source.sourceId === 'cc/planet-in-sign/saturn-in-aries'));
assert(context.plan.meaningSources.some(source => source.sourceId === 'cc/planet-in-sign/jupiter-in-leo'));
const placements = JSON.parse(readFileSync('tldr-astro-phrasebank/phrasebank/cc-planet-in-sign-reviewed.json', 'utf8')).reviewed;
for (const source of context.plan.meaningSources.filter(source => source.sourcePath.endsWith('cc-planet-in-sign-reviewed.json'))) {
  assert.equal(source.body, placements.find((row: any) => row.id === source.sourceId).collective_shift, 'Preserve each selected collective meaning passage in full.');
  assert.equal(source.bodySha256, createHash('sha256').update(source.body).digest('hex'));
  assert.equal(source.positiveVoiceEvidence, false);
}
assert(!JSON.stringify(context.receipt).includes('collective_shift'));
assert(context.receipt.meaningSources.every(source => !Object.hasOwn(source, 'body')));
const names = skyIngressEssayFields.map(field => field.name).filter(name => !['articleTitle', 'when', 'priorOccurrenceSection'].includes(name));
const values = ingressFixtureValues(context.prompt, names);
const providerSlots = ingressProviderSlots(names.map(name => ({ name })), context);
assert(!providerSlots.some(slot => ['majorTransitSections', 'otherDatesSection'].includes(slot.name)));
assert.deepEqual(providerSlots.map(slot => slot.name), ['what', 'takeaway', 'articleBody']);
const prose = ingressFixtureValues(context.prompt, providerSlots.map(slot => slot.name));
const assembled = assembleIngressFields(prose, names.map(name => ({ name })), context);
Object.assign(values, assembled);
assert.deepEqual(Object.keys(assembled), names);
assert.match(assembled.otherDatesSection, /Sun opposition Saturn: October 4, 2026 at 8:29 AM ET/);
assert.throws(() => assembleIngressFields({ ...prose, otherDatesSection: 'A replacement event list.' }, names.map(name => ({ name })), context), /exactly the requested prose fields/);
assert.throws(() => ingressProviderSlots([{ name: 'ingressTransitBody1' }], context), /writer contract/);
assert.equal(validateSkyIngressWriting(values, context).passed, true);
assert(validateSkyIngressWriting(values, context).advisories.length, 'Structural fixtures cannot establish developed prose.');
const invalid = (key: string, edit: (text: string) => string, expected: RegExp) => {
  const result = validateSkyIngressWriting({ ...values, [key]: edit(values[key]) }, context);
  assert.equal(result.passed, false);
  assert.match(result.issues.join(' '), expected);
};
invalid('otherDatesSection', text => text.split('\n').filter(line => !line.includes('Full Moon in Aries')).join('\n'), /required event|Other dates/);
invalid('otherDatesSection', text => text.replace('Pluto stations direct: October 15, 2026', 'Pluto stations direct: October 15-16, 2026'), /Pluto|Date outside/);
invalid('otherDatesSection', text => text.replace('- Follow through: Venus enters Libra', '- Venus enters Libra'), /Venus enters Libra/);
invalid('articleBody', () => 'Synthetic time: October 4, 2026 at 9:29 AM ET.', /date and time/);
invalid('articleBody', () => 'Synthetic position: 99 degrees.', /numeric participant positions/);
invalid('articleBody', () => 'Synthetic claim: the Sun is in fall due to the rulership of Venus.', /Sign rulership/);
invalid('articleBody', () => 'Synthetic claim: your natal Sun determines this event.', /natal biography/);
invalid('articleBody', () => 'Synthetic claim: Libra’s whole-sign house of partnership describes your life.', /No rising sign/);
invalid('articleBody', () => 'Synthetic claim: this is your seventh house.', /No rising sign/);
for (const edit of [{ degree: 99 }, { motion: 'unknown' }]) {
  const corrupt = { ...libra, events: libra.events.map((event: any) => event.id === context.plan.developed[1].id
    ? { ...event, participants: event.participants.map((point: any, index: number) => index === 0 ? { ...point, ...edit } : point) } : event) };
  assert.throws(() => buildSkyIngressWritingContext(corrupt), /Incomplete ingress event positions/);
}
assert.deepEqual(ingressDignityEvidence('Sun', 'Libra').exaltationSigns, ['Aries']);
assert.deepEqual(ingressDignityEvidence('Venus', 'Scorpio').domicileSigns, ['Taurus', 'Libra']);
assert.equal(ingressDignityEvidence('Pluto', 'Aquarius').status, 'not_applicable');
assert.deepEqual(ingressDignityEvidence('Jupiter', 'Leo').dignities, [], 'No inferred peregrine or debility.');
assert.throws(() => buildSkyIngressWritingContext({ ...libra, events: [libra.events[0], libra.events[0]] }), /duplicate/);
assert.throws(() => buildSkyIngressWritingContext({}), /Complete calculated/);
const second = buildSkyIngressWritingContext(taurus);
assert.equal(second.plan.selectedSign, 'taurus');
assert(second.plan.developed.every(event => event.event.dateLabel.includes('2027')));
assert(!second.prompt.includes('September 26, 2026'));
assert.doesNotMatch(second.prompt, /self\/other learning axis|Give cooperation and the ability to consider another view/,
  'A different season must not inherit a hardcoded Libra lesson.');

const index = JSON.parse(readFileSync('packages/astro-knowledge/voice/tldr-astro/satori-writer/voice-index.json', 'utf8'));
const target = { surface: 'sky', mode: 'article', eventType: 'sky-article-template-slots', contentKey: 'sky/article-template/sun/libra', facts: libra };
const examples = sharedGenerationOwnerExamples(index, target);
assert(examples.length > 0);
assert.equal(examples.length, 14, 'Deliver the full eligible original Libra overview, not four disconnected excerpts.');
assert.deepEqual(sharedGenerationOwnerExamples(index, { ...target, facts: { ...taurus, planet: 'venus' } }), examples,
  'Other dated ingresses use the designated Libra article for voice without changing their own meaning or facts.');
assert(examples.every(example => example.surface === 'sky-season' && example.evidence.sourcePath.endsWith('/libra-season-autumn-equinox.md')));
for (const example of examples) assert.equal(example.body, index.entries.find((entry: any) => entry.sourceId === example.contentKey).text);
const eligible = index.entries.find((entry: any) => entry.sourceId === examples[0].contentKey);
assert.equal(sharedGenerationOwnerExamples({ entries: [eligible] }, target).length, 1, 'Do not pad a strong ingress passage to meet a historical count floor.');
assert.throws(() => sharedGenerationOwnerExamples({ entries: [] }, target), /no provider call/);
Object.assign(process.env, { STUDIO_MEMORY_FEEDBACK_ENABLED: 'false' });
globalThis.fetch = async () => { throw new Error('Calculated-only fields must not dispatch a provider or storage request.'); };
try {
  const datesOnly = await generateSkyArticleTemplateSlots({ templateKey: target.contentKey, templateBody: '{{otherDatesSection}}',
    planet: 'sun', sign: 'libra', facts: libra, writingMemory: null, ingressWriting: context,
    requestedSlots: [{ name: 'otherDatesSection' }] });
  assert.equal(datesOnly.providerCalls, 0);
  assert.equal(datesOnly.slotValues.otherDatesSection, values.otherDatesSection);
} finally { globalThis.fetch = sourceFetch; }
const baselineModel = process.env.OPENAI_MODEL;
let modelCalls = 0;
const completeIngress = await ingressWriterFixture();
const writerInput = { seasonMeaning: completeIngress.seasonMeaning, templateKey: target.contentKey, templateBody: '{{articleBody}}', planet: 'sun', sign: 'libra',
  facts: libra, writingMemory: null, requestedSlots: [{ name: 'articleBody' }] };
const templateReference = buildIngressTemplateReference(target.contentKey, 'Synthetic complete saved event-led guide. {{entryDate}} stays reference data.');
assert.equal(templateReference.reference.bodySha256, createHash('sha256').update(templateReference.reference.body).digest('hex'));
assert.equal(templateReference.receipt.factUseAuthorized, false);
assert.equal(templateReference.receipt.positiveVoiceEvidence, false);
validateIngressTemplateReference(templateReference);
assert.throws(() => validateIngressTemplateReference(undefined), /missing or changed/);
assert.throws(() => validateIngressTemplateReference({ ...templateReference,
  reference: { ...templateReference.reference, body: 'Changed saved source.' } }), /missing or changed/);
assert.throws(() => validateIngressTemplateReference({ ...templateReference,
  receipt: { ...templateReference.receipt, factUseAuthorized: true } }), /missing or changed/,
  'The structural template cannot become factual authority through an altered receipt.');
globalThis.fetch = async (_url, init) => {
  modelCalls++;
  const request = JSON.parse(String(init?.body));
  const isDated = request.instructions.includes('DATED INGRESS EDITORIAL AUTHORITY');
  assert.equal(request.input.includes('GOVERNED KNOWLEDGE EVIDENCE'), !isDated,
    'Exclude the natal packet only when the dated writer has its own complete ingress context.');
  const expected = process.env.OPENAI_INGRESS_MODEL ?? (request.instructions.includes('DATED INGRESS EDITORIAL AUTHORITY') ? 'gpt-5.6-sol' : 'synthetic-other-writer');
  assert.equal(request.model, expected);
  return Response.json({ id: 'synthetic', output_text: JSON.stringify({ slotValues: { articleBody: 'Synthetic complete interpretation.' } }) });
};
try {
  process.env.OPENAI_MODEL = 'synthetic-other-writer';
  process.env.OPENAI_API_KEY = 'synthetic';
  await generateSkyArticleTemplateSlots({ ...writerInput, facts: { planet: 'sun', sign: 'libra' }, provider: 'openai' });
  process.env.OPENAI_INGRESS_MODEL = 'gpt-4.1-mini';
  await assert.rejects(generateSkyArticleTemplateSlots({ ...writerInput, ingressWriting: context, provider: 'openai' }), /template reference is missing/);
  assert.equal(modelCalls, 1, 'Missing guide reference stops before the paid provider boundary.');
  await generateSkyArticleTemplateSlots({ ...writerInput, ingressWriting: context, ingressTemplateReference: templateReference, provider: 'openai' });
  process.env.OPENAI_INGRESS_REASONING_EFFORT = 'invalid';
  await assert.rejects(generateSkyArticleTemplateSlots({ ...writerInput, ingressWriting: context, ingressTemplateReference: templateReference, provider: 'openai' }), /reasoning effort/);
  assert.equal(modelCalls, 2, 'Invalid scoped model settings stop before dispatch.');
} finally {
  globalThis.fetch = sourceFetch;
  if (baselineModel === undefined) delete process.env.OPENAI_MODEL; else process.env.OPENAI_MODEL = baselineModel;
  delete process.env.OPENAI_INGRESS_MODEL;
  delete process.env.OPENAI_INGRESS_REASONING_EFFORT;
}
console.log('PASS dated ingress: scoped provider authority, real 2026/2027 events, required lunar/ruler/aspect coverage, exact ET facts, dignity basis, complete event meaning and matching owner season voice. Negative date, degree, motion, omission and natal cases rejected; prose depth remains advisory.');
