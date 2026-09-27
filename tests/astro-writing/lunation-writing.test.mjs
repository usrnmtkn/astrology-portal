import assert from 'node:assert/strict';
import { prepareLunationWriting, lunationWritingTarget } from '../../src/astro-writing/lunationWriting.mjs';
import { lunationDigest, lunationDraftFactFindings } from '../../src/astro-writing/lunationWritingFacts.mjs';
import { approveArgumentOutline } from '../../src/astro-writing/argumentGate.mjs';
import { runWritingPipeline } from '../../src/astro-writing/runWritingPipeline.mjs';
import { assertSurfaceRegisterContract } from '../../src/astro-writing/surfaceRegisterContract.mjs';

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
  assert.ok(!call.input.includes('SPINE QUALITY GATES'));
  assert.ok(!call.input.includes('CARD WRITER SEVEN-PASS CHAIN'));
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
const facts = request().engineFacts;
assert.equal(lunationDraftFactFindings({ body: 'New Moon in Libra', journalPrompt: 'Synthetic question?' }, facts).length, 0);
for (const body of ['New Moon in Aries', 'October 21 at 8:25', 'Your 7th house', 'The Moon at 18 degrees']) {
  assert.ok(lunationDraftFactFindings({ body }, facts).length > 0, body);
}
console.log('Lunation writer checks passed: New/Full Moon evidence, approvals, fact drift, failure isolation and unpublished candidates.');
