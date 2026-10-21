import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { sharedGenerationOwnerExamples } from '../api/_lib/shared-generation-owner-examples.js';
import { validateGeneratedContentQuality, sharedGenerationReviewSignals, evaluateEditorialCoherence, type GenerateContentInput } from '../api/_lib/content-generation.js';

const input: GenerateContentInput = { contentKey: 'fixture/mercury', surface: 'sky', eventType: 'current-aspect', mode: 'feed', facts: {} };
const copy = { headline: 'Synthetic fixture', summary: 'The form contains the date, time, place, and time zone.', body: 'The fixture can perform a second check—without changing the saved fields.', sections: [] };
assert.doesNotThrow(() => validateGeneratedContentQuality(copy, input), 'Lexical and list signals must reach contextual review rather than cause an automatic rejection.');
assert.ok(sharedGenerationReviewSignals(copy, input).some(signal => signal.includes('perform')));
assert.ok(sharedGenerationReviewSignals(copy, input).some(signal => signal.includes('em dash')));
assert.equal(evaluateEditorialCoherence(copy, input).passed, true, 'Advisory findings cannot accumulate into a failing score.');
const sceneReview = evaluateEditorialCoherence({ ...copy, summary: 'Synthetic.', body: 'Fixture.' }, { ...input, facts: { timeLord: 'Mars' } });
assert.equal(sceneReview.failures.find(failure => failure.code === 'TIME_LORD_NOT_USED_AS_SCENE_FILTER')?.severity, 'warning');
assert.equal(sceneReview.passed, true, 'An ordinary-scene preference is not evidence of a false astrology claim.');
assert.throws(() => validateGeneratedContentQuality({ ...copy, body: '' }, input), /body is missing/);
assert.throws(() => validateGeneratedContentQuality({ ...copy, body: 'This entry is currently in review.' }, input), /disallowed phrase/);
const natal: GenerateContentInput = { ...input, surface: 'natal', eventType: 'natal-aspect', facts: { type: 'natal-aspect' } };
assert.throws(() => validateGeneratedContentQuality({ ...copy, body: 'Today this transit changes the fixture.' }, natal), /transit\/current-weather/);

const longText = `Mercury fixture opening.\n\n${'Full synthetic evidence sentence. '.repeat(70)}\n\nFinal evidence sentence.`;
const entry = (sourceId: string, text: string, overrides = {}) => ({ sourceId, sourcePath: `fixture/${sourceId}.md`, sourceSha256: 'a'.repeat(64), surface: 'sky-article-longform', structuralFunction: 'article paragraph', text, authorityClass: 'owner_authored_final', ownerAuthored: true, ownerApproved: true, useAsPositiveVoiceEvidence: true, ...overrides });
const entries = [entry('one', longText), entry('two', 'Second whole fixture paragraph.'), entry('three', 'Third whole fixture paragraph.'),
  entry('serving', 'Mercury approved serving text.', { authorityClass: 'serving_approved', ownerAuthored: false }),
  entry('meaning', 'Mercury semantic matrix text.', { authorityClass: 'exact_owner_approved', ownerAuthored: false }),
  entry('rejected', 'Mercury rejected owner text.', { useAsNegativeEvidence: true }), entry('duplicate', longText)];
const selected = sharedGenerationOwnerExamples({ entries }, input);
assert.equal(selected.length, 3);
assert.ok(!selected.some(row => ['serving', 'meaning', 'rejected'].includes(row.contentKey)));
const complete = selected.find(row => row.body === longText)!;
assert.ok(complete, 'The full multi-paragraph passage must survive beyond 1400 characters.');
assert.equal(complete.evidence.textSha256, createHash('sha256').update(longText).digest('hex'));
assert.equal(complete.evidence.sourceSha256, 'a'.repeat(64));
assert.equal(complete.evidence.wordCount, longText.trim().split(/\s+/u).length);
assert.throws(() => sharedGenerationOwnerExamples({ entries: entries.slice(0, 2) }, input), /BELOW_FLOOR/);

const ingressInput = { ...input, eventType: 'sky-article-template-slots', contentKey: 'sky/article-template/mercury/virgo',
  facts: { articleFormat: 'ingress-essay-v2', planet: 'mercury', sign: 'virgo' } };
const ingressEntries = [
  entry('ingress-direct', 'You notice the Mercury in Virgo fixture.'),
  entry('ingress-collective', 'Mercury in Virgo describes this collective fixture.'),
  entry('ingress-direct-2', 'Your second Mercury in Virgo fixture has a complete ending.'),
  entry('unrelated', 'An unrelated Jupiter Neptune Saturn fixture.'),
  entry('unrelated-2', 'Another Jupiter Neptune Saturn fixture.')
].map(row => ({ ...row, surface: 'sky-season', structuralFunction: 'article paragraph',
  sourcePath: 'synthetic/libra-season-autumn-equinox.md' }));
const ingressSelected = sharedGenerationOwnerExamples({ entries: ingressEntries }, ingressInput);
assert.equal(ingressSelected.length, ingressEntries.length,
  'The designated complete article is retained instead of being cut to a four-passage ceiling.');
assert.throws(() => sharedGenerationOwnerExamples({ entries }, ingressInput), /no provider call/,
  'Missing designated author-article evidence stops dated writing before a paid call.');
assert(ingressSelected.some(row => row.contentKey === 'ingress-direct'), 'Ingress essays admit the owner’s direct reader address.');
assert(ingressSelected.some(row => row.contentKey === 'ingress-collective'), 'Collective observations remain eligible.');
assert.deepEqual(sharedGenerationOwnerExamples({ entries: ingressEntries }, { ...ingressInput,
  facts: { ...ingressInput.facts, requestedSlots: 'Jupiter Neptune Saturn', internalMetadata: 'Jupiter Neptune Saturn' },
  voiceNotes: 'Jupiter Neptune Saturn' } as typeof ingressInput), ingressSelected,
  'Unrelated instructions and metadata must not displace topic-matched complete ingress passages.');
assert.equal(ingressSelected.find(row => row.contentKey === 'ingress-direct')!.body, ingressEntries[0].text);

// Verify every shared-writer family against the actual packaged owner index,
// without printing passages or making a provider call.
const index = JSON.parse(readFileSync('packages/astro-knowledge/voice/tldr-astro/satori-writer/voice-index.json', 'utf8'));
assert.throws(() => sharedGenerationOwnerExamples(index, { ...input, surface: 'you', eventType: 'transit-aspect' }), /PERSONAL_TRANSIT_WRITER_CONTEXT_REQUIRED/);
for (const [surface, eventType] of [['sky','placement'],['sky','lunation'],['sky','season'],['you','daily'],['natal','placement'],['natal','aspect'],['synastry','aspect'],['composite','placement'],['friends','bond-effect']] as const) {
  const result = sharedGenerationOwnerExamples(index, { ...input, surface, eventType });
  assert.ok(result.length >= 3, `${surface}/${eventType} must have complete eligible evidence.`);
  for (const row of result) {
    const source = index.entries.find((source: any) => source.sourceId === row.contentKey);
    assert.equal(row.body, source.text);
    assert.equal(row.evidence.sourcePath, source.sourcePath);
    assert.equal(row.evidence.sourceSha256, source.sourceSha256);
    assert.equal(source.ownerAuthored, true);
    assert.notEqual(source.useAsNegativeEvidence, true);
  }
}
console.log('PASS shared writer: advisory signals, retained fact/field boundaries, complete authored evidence, source hashes, register families and fail-closed evidence floor. No provider calls.');
