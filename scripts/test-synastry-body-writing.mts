import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { prepareSynastryBodyWriting, generateSynastryBody, validateSynastryBody, RejectedSynastryBodyError } from '../api/_lib/synastry-body-writing.js';
import { GHOSTWRITING_SKILL_INSTRUCTIONS } from '../src/astro-writing/ghostwritingSkill.mjs';
import { syntheticLatestTen, syntheticApprovedTen, syntheticSynastryVoice, encodedSynastryVoice, installSyntheticSynastryApproval } from '../tests/fixtures/synastry-approved-voice.cjs';
const restoreApprovalFixture = installSyntheticSynastryApproval();

Object.assign(process.env, { OPENAI_API_KEY: 'synthetic', OPENAI_GENERATION_MODEL: 'gpt-4.1-mini',
  SUPABASE_URL: 'https://synthetic-body.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'synthetic',
  STUDIO_MEMORY_FEEDBACK_ENABLED: 'true', WRITING_KERNEL_GOVERNED_SURFACES: '',
  WRITING_KERNEL_SHADOW_SURFACES: '', WRITING_KERNEL_SKY_CANARY_PERCENT: '0', WRITING_KERNEL_SKY_GLOBAL_ENABLE: '0' });
const hash = (text: string) => createHash('sha256').update(text).digest('hex');
const sourcePath = 'packages/astro-knowledge/data/synastry/aspects/A-mercury_B-mars_square.json';
const source = fs.readFileSync(sourcePath, 'utf8');
const text = 'Complete synthetic approved voice fixture. Its final sentence remains present.';
const input: any = { contentKey: 'fallback-hook/synastry-pair/mercury/mars/square', surface: 'synastry', mode: 'in_depth', knowledgeIds: ['synastry-mercury-square-mars'],
  eventType: 'synastry-aspect', facts: { planetA: 'Mercury', planetB: 'Mars', aspect: 'square', personA: '{{holder2}}', personB: 'you', readerPerson: 'B' },
  sourceSnapshot: { knowledgeSources: [{ path: sourcePath, sha256: hash(source), record: JSON.parse(source) }],
    positiveVoiceReferences: [{ path: 'synthetic-owner-approved-reference', text, sha256: hash(text), role: 'owner_approved_voice_only_not_astrology_for_target' }] } };
const selection = { ownerSourceIds: ['owner-article:venus-in-cancer:p001'], reason: 'Synthetic selection tests complete source delivery, not prose quality.' };
let rows: any[] = [];
let providerCalls = 0;
let next: any = { body: 'You compare what you understood with {{holder2}}. The synthetic fixture ends here.' };
let failProvider = false;
let dispatched: any;
const originalFetch = globalThis.fetch;
globalThis.fetch = async (url, init: RequestInit = {}) => {
  if (String(url) === 'https://synthetic-body.supabase.co/rest/v1/rpc/studio_memory_active_snapshot') {
    assert.equal(init.method, 'POST');
    return Response.json([{ snapshot: { writingFeedback: rows } }]);
  }
  assert.equal(String(url), 'https://api.openai.com/v1/responses', 'No save or unexpected network call is allowed.');
  providerCalls++;
  dispatched = JSON.parse(String(init.body));
  if (failProvider) return Response.json({ error: { message: 'Synthetic failure' } }, { status: 429 });
  return Response.json({ id: 'resp_synthetic', status: 'completed', output_text: JSON.stringify(next) });
};
try {
  const prepared = await prepareSynastryBodyWriting(input, selection);
  assert.equal(providerCalls, 0);
  assert.deepEqual(prepared.request.text.format.schema.required, ['body']);
  assert.deepEqual(Object.keys(prepared.request.text.format.schema.properties), ['body']);
  assert(prepared.instructions.includes(GHOSTWRITING_SKILL_INSTRUCTIONS));
  assert(prepared.instructions.includes('Use familiar language for affection and enjoyment'));
  assert(prepared.instructions.includes('without making every observation about affection explain an answering reaction from both people'));
  assert(prepared.instructions.includes('rather than classifying their responses or explaining an abstract exchange of feelings'));
  assert(prepared.instructions.includes('do not use "pleasure", "whether", "out loud" or "aloud"'));
  assert(prepared.instructions.includes('Preserve complete historical source passages unchanged'));
  assert(prepared.request.input.includes(text));
  const primaryStyle = JSON.parse(fs.readFileSync('data/writing/synastry-primary-style-20261024.json', 'utf8')).references;
  for (const reference of primaryStyle) assert.equal(prepared.request.input.split(reference.text).length - 1, 1);
  assert.equal(prepared.receipt.primaryStyleReferences.length, 4);
  assert(prepared.instructions.includes('natal style benchmarks are primary for ordinary language'));
  const alreadySelected = structuredClone(input);
  alreadySelected.sourceSnapshot.positiveVoiceReferences = primaryStyle;
  const withoutDuplicates = await prepareSynastryBodyWriting(alreadySelected, selection);
  for (const reference of primaryStyle) assert.equal(withoutDuplicates.request.input.split(reference.text).length - 1, 1);
  assert(prepared.request.input.includes(JSON.parse(source).plainTranslation));
  assert(!prepared.request.input.includes('GOVERNED MEANING PLAN'));
  assert(!prepared.request.input.includes('sceneLock'));
  const oldDraft = 'Complete synthetic old prose with an unwanted recommendation. This wording remains preserved privately.';
  const freshInput = structuredClone(input);
  freshInput.sourceSnapshot.existingDraft = { path: 'synthetic-old-draft', text: oldDraft, sha256: hash(oldDraft) };
  const fresh = await prepareSynastryBodyWriting(freshInput, selection);
  assert.equal(fresh.input.sourceSnapshot!.existingDraft.text, oldDraft);
  assert(!fresh.request.input.includes(oldDraft), 'A fresh body does not imitate the old wording.');
  assert.equal(fresh.receipt.existingDraft?.sha256, hash(oldDraft));
  assert.equal(fresh.receipt.existingDraft?.sentToWriter, false);
  process.env.PRIVATE_REPORT_DOCUMENTS = encodedSynastryVoice();
  const defaultInput = structuredClone(input);
  delete defaultInput.sourceSnapshot.positiveVoiceReferences;
  const defaultPrepared = await prepareSynastryBodyWriting(defaultInput, selection);
  for (const reference of [...syntheticSynastryVoice().entries, ...syntheticApprovedTen().entries, ...syntheticLatestTen().entries]) assert.equal(defaultPrepared.request.input.split(reference.text).length - 1, 1);
  assert.equal(defaultPrepared.receipt.protectedVoice.referenceCount, 28);
  assert.equal(defaultPrepared.receipt.protectedVoice.sources.length, 3);
  assert(defaultPrepared.receipt.protectedVoice.sources[2].voiceDesignationStatementSha256);
  assert.equal(defaultPrepared.input, defaultInput, 'Revalidation must reload protected sources from the original request.');
  const changedLatest = syntheticLatestTen();
  changedLatest.entries[0].text += ' Unapproved change.';
  changedLatest.entries[0].sha256 = hash(changedLatest.entries[0].text);
  const undesignatedLatest = syntheticLatestTen();
  delete undesignatedLatest.approval.voiceDesignationStatement;
  for (const latest of [null, changedLatest, undesignatedLatest]) {
    process.env.PRIVATE_REPORT_DOCUMENTS = encodedSynastryVoice(syntheticSynastryVoice(), syntheticApprovedTen(), latest);
    await assert.rejects(() => prepareSynastryBodyWriting(defaultInput, selection), /SYNASTRY_APPROVED_VOICE_UNAVAILABLE/u);
    assert.equal(providerCalls, 0, 'Missing, rehashed or undesignated latest sources stop before provider dispatch.');
  }
  process.env.PRIVATE_REPORT_DOCUMENTS = encodedSynastryVoice();
  const revisedBundle = syntheticSynastryVoice();
  revisedBundle.entries.reverse();
  process.env.PRIVATE_REPORT_DOCUMENTS = encodedSynastryVoice(revisedBundle);
  await assert.rejects(() => generateSynastryBody(defaultPrepared), /Prepared sources/u);
  assert.equal(providerCalls, 0, 'Changed protected source stops before a paid call.');
  process.env.PRIVATE_REPORT_DOCUMENTS = encodedSynastryVoice();
  for (const aspect of ['trine', 'sextile']) {
    const relative = `packages/astro-knowledge/data/synastry/aspects/A-moon_B-sun_${aspect}.json`;
    const bytes = fs.readFileSync(relative, 'utf8'); const record = JSON.parse(bytes);
    const support = structuredClone(defaultInput);
    support.contentKey = `fallback-hook/synastry-pair/sun/moon/${aspect}`;
    support.knowledgeIds = [`synastry-moon-${aspect}-sun`];
    support.facts = { planetA: 'Moon', planetB: 'Sun', aspect, personA: '{{holder2}}', personB: 'you', readerPerson: 'B' };
    support.sourceSnapshot.knowledgeSources = [{ path: relative, sha256: hash(bytes), record }];
    const request = await prepareSynastryBodyWriting(support, selection);
    assert(request.request.input.includes(record.plainTranslation));
    assert(!request.request.input.includes(record.advice));
    for (const leak of ['Keep it active so comfort does not turn into autopilot', 'The problem is that easy can become lazy', 'The problem is leaving it half-open']) assert(!request.request.input.includes(leak));
  }
  const meaningRepair = JSON.parse(fs.readFileSync('packages/astro-knowledge/review/synastry-meaning-repair-20261024.json', 'utf8'));
  for (const change of meaningRepair.changes) {
    const bytes = fs.readFileSync(change.sourcePath, 'utf8'); const record = JSON.parse(bytes);
    const contact = structuredClone(defaultInput);
    contact.contentKey = `fallback-hook/synastry-pair/${record.planetA}/${record.planetB}/${record.aspect}`;
    contact.facts = { planetA: record.planetA, planetB: record.planetB, aspect: record.aspect,
      personA: '{{holder2}}', personB: 'you', readerPerson: 'B' };
    contact.sourceSnapshot.knowledgeSources = [{ path: change.sourcePath, sha256: hash(bytes), record }];
    const ready = await prepareSynastryBodyWriting(contact, selection);
    assert.equal(ready.request.input.split(record.plainTranslation).length - 1, 1);
    for (const facet of record.interpretiveDetail.facets) assert(ready.request.input.includes(facet.meaning));
    for (const example of record.interpretiveDetail.examples) {
      assert(ready.request.input.includes(example.setting));
      assert(ready.request.input.includes(example.illustrates));
      for (const response of Object.values(example.planetResponses)) assert(ready.request.input.includes(response as string));
    }
    assert(ready.instructions.includes('Hypothetical examples are optional teaching illustrations'));
    assert(ready.instructions.includes('not a checklist or prose order'));
    assert(!ready.request.input.includes(record.advice));
    assert(ready.request.input.includes(`Address the ${record.planetB} person as you. The other person owns ${record.planetA}.`));
    for (const reference of [...syntheticSynastryVoice().entries, ...syntheticApprovedTen().entries, ...syntheticLatestTen().entries]) {
      assert.equal(ready.request.input.split(reference.text).length - 1, 1);
    }
  }
  const placeholder = structuredClone(defaultInput);
  const placeholderPath = 'packages/astro-knowledge/data/synastry/aspects/A-jupiter_B-venus_conjunction.json';
  const placeholderBytes = fs.readFileSync(placeholderPath, 'utf8');
  placeholder.facts = { planetA: 'jupiter', planetB: 'venus', aspect: 'conjunction', personA: '{{holder2}}', personB: 'you', readerPerson: 'B' };
  placeholder.sourceSnapshot.knowledgeSources = [{ path: placeholderPath, sha256: hash(placeholderBytes), record: JSON.parse(placeholderBytes) }];
  await assert.rejects(() => prepareSynastryBodyWriting(placeholder, selection), /SYNASTRY_KNOWLEDGE_INCOMPLETE/);
  assert.equal(providerCalls, 0, 'An unrepaired keyword scaffold cannot reach a paid body call.');
  const oppositeReader = structuredClone(input);
  Object.assign(oppositeReader.facts, { readerPerson: 'A', personA: 'you', personB: '{{holder2}}' });
  const opposite = await prepareSynastryBodyWriting(oppositeReader, selection);
  assert(opposite.request.input.includes('Address the Mercury person as you. The other person owns Mars.'));
  const index = JSON.parse(fs.readFileSync('packages/astro-knowledge/voice/tldr-astro/satori-writer/voice-index.json', 'utf8'));
  const complete = index.entries.find((item: any) => item.sourceId === selection.ownerSourceIds[0]);
  assert(prepared.request.input.includes(complete.text));
  const result = await generateSynastryBody(prepared);
  assert.equal(providerCalls, 1);
  assert.equal(result.ownerApproved, false);
  assert.equal(result.promotionAuthorized, false);
  assert.equal(result.needs_review, true);
  assert.equal(result.body, next.body);
  assert.deepEqual(dispatched, { ...prepared.request, instructions: prepared.instructions });
  await assert.rejects(() => generateSynastryBody({ ...prepared, instructions: prepared.instructions + 'changed' }), /instructions or current feedback changed/u);
  assert.equal(providerCalls, 1, 'A changed reviewed request stops before OpenAI.');
  for (const raw of [{ body: 'Synthetic', summary: 'Unexpected' }, { body: '' }, { body: 'Person A tells Person B.' },
    { body: 'You notice this.\n## Status\nneeds_review' }, { body: 'A third-person-only fixture.' },
    { body: 'You notice — a synthetic em dash.' }, { body: 'You tell {{holder9}}.' }, { body: 'You see {internal note}.' }]) {
    assert.throws(() => validateSynastryBody(raw, input), /SYNASTRY_BODY_HELD/u);
  }
  validateSynastryBody({ body: 'You see {{holder2}}. You hear {{holder2}}.' }, input);
  const clone = () => structuredClone(input);
  const badSource = clone(); badSource.sourceSnapshot.knowledgeSources[0].record.plainTranslation += 'changed';
  const badVoice = clone(); badVoice.sourceSnapshot.positiveVoiceReferences[0].text += 'changed';
  const wrongDirection = clone(); wrongDirection.facts.planetA = 'Mars'; wrongDirection.facts.planetB = 'Mercury';
  const noReader = clone(); delete noReader.facts.readerPerson; noReader.facts.personB = 'Rowan';
  const conflictingReader = clone(); conflictingReader.facts.readerPerson = 'A';
  const badFamily = clone(); badFamily.facts.aspect = 'soft'; badFamily.facts.aspectFamilyMembers = ['square'];
  for (const value of [badSource, badVoice, wrongDirection, noReader, conflictingReader, badFamily, { ...input, surface: 'sky' }]) {
    await assert.rejects(() => prepareSynastryBodyWriting(value, selection));
  }
  rows = [{ id: 'synthetic-rejection', kind: 'rejection', status: 'active', version: 1,
    target_keys: [input.contentKey], rejected_text: 'Complete synthetic rejected passage, including the last sentence.',
    owner_reason: 'Synthetic exact correction.', source_uri: 'thread:synthetic-test', source_date: '2026-10-22' }];
  await assert.rejects(() => generateSynastryBody(prepared), /current feedback changed/u);
  assert.equal(providerCalls, 1, 'Changed feedback stops before OpenAI.');
  const current = await prepareSynastryBodyWriting(input, selection);
  assert(current.request.input.includes(rows[0].rejected_text));
  assert(current.request.input.includes(rows[0].owner_reason));
  next = { body: 'You notice — rejected synthetic punctuation.' };
  await assert.rejects(() => generateSynastryBody(current), (error: unknown) => {
    assert(error instanceof RejectedSynastryBodyError);
    assert.deepEqual(error.candidate.raw, next, 'A held candidate remains available intact for private review.');
    assert.equal(error.candidate.responseId, 'resp_synthetic');
    return /Deterministic copy checks failed/u.test(error.message);
  });
  assert.equal(providerCalls, 2, 'Invalid output receives no retry or model judge.');
  failProvider = true;
  await assert.rejects(() => generateSynastryBody(current), /429/u);
  assert.equal(providerCalls, 3, 'Provider errors receive no retry.');
  process.env.STUDIO_MEMORY_FEEDBACK_ENABLED = 'false';
  await assert.rejects(() => prepareSynastryBodyWriting(input, selection), /feedback must be enabled/u);
  assert.equal(providerCalls, 3);
  console.log('Synastry body writing: request delivery, complete sources, feedback freshness, strict body output, failure isolation and no writes passed. Synthetic transport only; voice unverified.');
} finally { globalThis.fetch = originalFetch; restoreApprovalFixture(); }
