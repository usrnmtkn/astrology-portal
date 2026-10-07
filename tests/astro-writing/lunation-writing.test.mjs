import assert from 'node:assert/strict';
import { prepareLunationWriting, lunationWritingTarget } from '../../src/astro-writing/lunationWriting.mjs';
import { lunationDigest, lunationDraftFactFindings } from '../../src/astro-writing/lunationWritingFacts.mjs';
import { approveArgumentOutline } from '../../src/astro-writing/argumentGate.mjs';
import { runWritingPipeline } from '../../src/astro-writing/runWritingPipeline.mjs';
import { assertSurfaceRegisterContract } from '../../src/astro-writing/surfaceRegisterContract.mjs';
import { lunationVocabularyFindings, LUNATION_EDITORIAL_AUTHORITY } from '../../src/astro-writing/lunationEditorialConstraints.mjs';
import responses from '../../src/astro-writing/openAIResponses.cjs';
import { canonicalAstrologyWritingInstructions, HOROSCOPE_EDITORIAL_AUTHORITY } from '../../src/astro-writing/canonicalInstructions.mjs';
import { lunationArticleOpeningDate } from '../../src/astro-writing/lunationArticleInput.mjs';

// The opening follows the selected zone, including a different day or year from UTC.
for (const [startsAt,timeZone,expected] of [
  ['2026-10-26T04:11:00Z','America/Los_Angeles','October 25th, 2026'],
  ['2026-10-26T04:11:00Z','America/New_York','October 26th, 2026'],
  ['2027-01-01T01:00:00Z','America/New_York','December 31st, 2026'],
  ['2027-01-01T01:00:00Z','Asia/Tokyo','January 1st, 2027'],
  ['2026-08-12T12:00:00Z','UTC','August 12th, 2026'],
  ['2026-08-23T12:00:00Z','UTC','August 23rd, 2026']
]) assert.equal(lunationArticleOpeningDate({startsAt,timeZone}),expected);
for (const event of [
  {startsAt:'2026-10-26T04:11:00Z'},
  {startsAt:'2026-10-26T04:11:00Z',timeZone:'invalid'},
  {startsAt:'invalid',timeZone:'UTC'}
]) assert.throws(()=>lunationArticleOpeningDate(event));

for (const [family,surface] of [['lunations','calendar-lunation'],['lunation-article','lunation-article']]) {
  assert.equal(responses.instructionsForRole('WRITER','',{family,surface}),LUNATION_EDITORIAL_AUTHORITY);
  assert.throws(()=>responses.governedInstructionsForRole('WRITER',{family,surface,governedInstructions:canonicalAstrologyWritingInstructions}),/canonical role instructions/);
}
assert.equal(responses.instructionsForRole('WRITER'),canonicalAstrologyWritingInstructions);
assert.equal(responses.instructionsForRole('WRITER','',{family:'horoscope',surface:'horoscopes'}),HOROSCOPE_EDITORIAL_AUTHORITY);

// Calculation outputs are test fixtures only. Production packets use the ephemeris.
function request(kind = 'new-moon', sign = 'libra') {
  return { engineFacts: { source: 'swiss-ephemeris', calculationSource: 'test-fixture', timeZone: 'America/New_York',
    contentKey: `authored/sky-lunation-macro/${kind}/${sign}`,
    event: { id: `test-${kind}`, kind, sign, startsAt: kind === 'new-moon' ? '2026-10-10T15:50:05.999Z' : '2026-09-26T16:49:00.000Z' } },
  argumentInput: { thesis: 'Synthetic editorial thesis.', phase_context: 'Synthetic phase context.',
    sign_meaning: 'Synthetic sign meaning.', recognition: 'Synthetic recognition.',
    intention_or_reflection: 'Synthetic intention or reflection.', journal_focus: 'Synthetic journal focus.',
    scope_guard: 'Synthetic scope guard.', scope_breadth: { broad_mechanism: 'Synthetic broad mechanism.',
      chosen_expression: 'Synthetic expression.', other_valid_expressions: ['Choice A','Choice B','Choice C'] } } };
}
function pipelineInput(input, prepared) {
  return { ...prepared.contextOptions, meaningInput: prepared.meaningInput, argumentInput: input.argumentInput,
    engineFacts: input.engineFacts, family: 'lunations', surface: 'calendar-lunation', register: 'second_person',
    target: lunationWritingTarget, task: 'Synthetic pipeline verification only.' };
}
let calls = 0;
const writer = async call => {
  calls++;
  assert.equal(call.role, 'WRITER');
  assert.deepEqual(call.schema.required, ['body','journalPrompt']);
  assert.ok(call.input.includes('OWNER LUNATION PASSAGES'));
  assert.ok(call.input.includes('CURRENT OWNER CORRECTIONS'));
  assert.ok(call.input.includes('Reusable sign readings stay date-free'));
  assert.ok(!call.input.includes('DATED ARTICLE OPENING'));
  assert.ok(!call.input.includes('SPINE QUALITY GATES'));
  assert.ok(!call.input.includes('CARD WRITER SEVEN-PASS CHAIN'));
  assert.ok(call.instructions.includes('LUNAR EDITORIAL AUTHORITY'));
  assert.ok(call.instructions.includes('REQUIRED LUNAR WORDING'));
  assert.ok(call.instructions.includes('CORRECTIO'));
  assert.ok(!call.instructions.includes('SPINE QUALITY GATES'));
  assert.ok(!call.instructions.includes('LONG-FORM SENTENCE ARCHITECTURE'));
  return { body: 'Synthetic body for pipeline verification.', journalPrompt: 'Synthetic journal question?' };
};
writer.billed = false;
writer.provider = 'test';

for (const [kind, sign] of [['new-moon','libra'], ['full-moon','aries']]) {
  const input = request(kind, sign);
  const prepared = prepareLunationWriting(input);
  assert.equal(prepared.plan.calculatedFactsHash, lunationDigest(input.engineFacts));
  assert.equal(prepared.context.reviewedMeaningExamples.length, 2);
  assert.ok(prepared.context.reviewedMeaningExamples.every(e => e.ownerApproved === false && e.ownerAuthored === false));
  assert.equal(prepared.context.sameFamilyExamples.length, 6);
  assert.ok(prepared.context.sameFamilyExamples.every(e => e.family === 'sky-lunation' && e.ownerAuthored === true));
  assert.ok(prepared.context.relevantOwnerPassages.every(e => e.sign === sign));
  for (const passage of prepared.context.sameFamilyExamples) assert.equal(lunationDigest(passage.text), passage.sourceSha256);
  assert.equal(prepared.context.registerGoldExamples[0].id, `register-gold:lunations:${kind}`);
  assert.equal(prepared.receipt.ownerApproved, false);
  const options = pipelineInput(input, prepared), before = calls;
  const pending = await runWritingPipeline({ ...options, writerClient: writer });
  assert.equal(pending.status, 'argument-review-pending');
  assert.equal(calls, before, 'An unapproved plan must never call the writer.');
  const approved = approveArgumentOutline(prepared.argumentOutline, { exactOwnerRuling: 'Synthetic approval for test only.' });
  const argumentSource = { contentKey: 'test-outline', sourcePath: 'test', ownerApproved: true,
    authority: 'owner-approved-test-plan', opening: approved.thesis, close: approved.intention_or_reflection };
  const result = await runWritingPipeline({ ...options, writerClient: writer, approvedArgumentOutline: approved, argumentSource });
  assert.equal(calls, before + 1);
  assert.equal(result.report.billedCalls, 0);
  assert.equal(result.draft.ownerApproved, false);
  assert.equal(result.draft.promotionAuthorized, false);
  assert.equal(result.draft.canonical, false);
  assert.equal(result.report.proseModelGateCalls, 0);
  const failedEvidence = await runWritingPipeline({ ...options, examples: [], writerClient: writer,
    approvedArgumentOutline: approved, argumentSource });
  assert.equal(failedEvidence.status, 'failed-retrieval');
  assert.equal(calls, before + 1);
  const changed = structuredClone(input.engineFacts);
  changed.event.startsAt = '2026-10-11T00:00:00.000Z';
  await assert.rejects(runWritingPipeline({ ...options, engineFacts: changed, approvedArgumentOutline: approved,
    argumentSource, writerClient: writer }), /LUNATION_CALCULATED_FACTS_DRIFT/u);
  const rePrepared = prepareLunationWriting({ ...input, engineFacts: changed });
  await assert.rejects(runWritingPipeline({ ...pipelineInput({ ...input, engineFacts: changed }, rePrepared),
    approvedArgumentOutline: approved, argumentSource, writerClient: writer }), /ARGUMENT_OUTLINE_MEANING_PLAN_DRIFT/u);
  assert.equal(calls, before + 1);
}

for (const change of [
  r => { r.engineFacts.source = 'owner-example'; },
  r => { r.engineFacts.event.kind = 'eclipse-solar'; },
  r => { r.engineFacts.contentKey = 'authored/sky-lunation-macro/new-moon/aries'; },
  r => { r.engineFacts.timeZone = 'invalid'; },
  r => { r.engineFacts.relatedEvents = [{ id: 'test-anchor', kind: 'new-moon', sign: 'libra',
    startsAt: '2026-11-01T00:00:00Z', relationship: 'previous-same-sign-new-moon' }]; },
  r => { r.preferredOwnerSourceIds = ['owner-article:does-not-exist:p002']; }
]) {
  const input = request(); change(input); assert.throws(() => prepareLunationWriting(input));
}
const input = request();
input.privateCorrections = [{ contentKey: input.engineFacts.contentKey, family: 'lunations', category: 'test',
  bad: 'Synthetic rejected wording.', owner_reason: 'Synthetic rejection.', originalSha256: 'incorrect', positive_evidence_revoked: true }];
assert.throws(() => prepareLunationWriting(input), /LUNATION_PRIVATE_CORRECTION_INVALID/u);
input.privateCorrections[0].originalSha256 = lunationDigest(input.privateCorrections[0].bad);
const corrected = prepareLunationWriting(input);
assert.ok(corrected.context.corrections.some(c => c.before === input.privateCorrections[0].bad && c.owner_reason === 'Synthetic rejection.'));
assert.throws(() => assertSurfaceRegisterContract({ ...lunationWritingTarget, contentKeyFamily: 'sky/aspect' }), /content_key_family_mismatch/u);
assert.throws(() => assertSurfaceRegisterContract({ ...lunationWritingTarget, surface: 'calendar', renderer: 'renderSkyAspectCard' },
  { register: 'second_person' }), /voice_mode_mismatch/u);
assert.equal(calls, 2);
// Reader fields are checked independently of historical evidence and metadata.
for (const field of ['headline','summary','body','journalPrompt']) {
  for (const word of ['whether','Whether','WHETHER','&#119;hether','wh&#x65;ther','whe\u200bther']) {
    const findings = lunationVocabularyFindings({ [field]: `Synthetic ${word} fixture.` });
    assert.equal(findings.length, 1);
    assert.equal(findings[0].field, field);
    assert.equal(findings[0].governanceTier, 'blocking');
  }
}
assert.deepEqual(lunationVocabularyFindings({body:'Synthetic whetherlike token.',source:'whether',argumentOutline:{thesis:'whether'}}),[]);
const vocabularyInput=request(),vocabularyPrepared=prepareLunationWriting(vocabularyInput);
const vocabularyOutline=approveArgumentOutline(vocabularyPrepared.argumentOutline,{exactOwnerRuling:'Synthetic test approval.'});
const vocabularyResult=await runWritingPipeline({...pipelineInput(vocabularyInput,vocabularyPrepared),approvedArgumentOutline:vocabularyOutline,
  argumentSource:{contentKey:'test-vocabulary',sourcePath:'test',ownerApproved:true,authority:'owner-approved-test-plan',opening:vocabularyOutline.thesis,close:vocabularyOutline.intention_or_reflection},
  writerClient:Object.assign(async()=>({body:'Synthetic body.',journalPrompt:'Synthetic whether question?'}),{billed:false})});
assert(vocabularyResult.report.failureCategories.includes('lunation_required_vocabulary'));
assert.equal(vocabularyResult.draft.journalPrompt,'Synthetic whether question?','A failed candidate is retained without an automatic rewrite.');
assert.equal(vocabularyResult.draft.ownerApproved,false);
const facts = request().engineFacts;
assert.equal(lunationDraftFactFindings({ body: 'New Moon in Libra', journalPrompt: 'Synthetic question?' }, facts).length, 0);
for (const body of ['New Moon in Aries', 'October 21 at 8:25', 'Your 7th house', 'The Moon at 18 degrees']) {
  assert.ok(lunationDraftFactFindings({ body }, facts).length > 0, body);
}
console.log('Lunation writer checks passed: New/Full Moon evidence, approvals, fact drift, failure isolation and unpublished candidates.');
