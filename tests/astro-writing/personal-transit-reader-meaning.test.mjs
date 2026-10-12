import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, rmSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { prepareBatch, loadState, sha256 } from '../../src/astro-writing/ownerTransitBatch.mjs';
import { personalTransitMeaningProjection } from '../../src/astro-writing/personalTransitMeaningProjection.mjs';
import { READER_RULES_JSON, READER_RULES_SHA256 } from '../../src/astro-writing/personalTransitReaderRules.mjs';
import { syntheticReaderMeanings } from './fixtures/personal-transit-reader-meanings.mjs';

const records = ['moon/saturn/sextile', 'mercury/venus/trine', 'mars/saturn/square', 'moon/chiron/trine']
  .map(key => ({ contentKey: `authored/transit-aspect/${key}`, body_you: 'TARGET_COPY {{untilDate}}', body_they: 'TARGET_COPY {{untilDate}}' }));
const text = 'A complete synthetic voice fixture.\nNo real owner writing is used.';
const examples = [{ contentKey: 'synthetic/voice', field: 'body_you', text, sha256: sha256(text), source: 'synthetic-test-only', preferred: true, ownerApproved: true }];
const readerMeanings = syntheticReaderMeanings(records);
const options = { id: 'meaning-fixture', records, examples, readerMeanings, friendEvidencePolicy: 'owner-authorized-you-voice' };
const baseline = prepareBatch(options);
const contact = baseline.contacts[0];
const project = meaning => personalTransitMeaningProjection(contact.contentKey, contact.semanticPacket, meaning, {allowProposed:true});
const resign = record => { const {recordSha256,status,review,...payload} = record; record.recordSha256 = sha256(payload); return record; };

test('only exact meaning text crosses the input boundary; private evidence and mechanics stay private', () => {
  const text = 'Synthetic Unicode fixture: café.\nA second fixture sentence.';
  const meaning = { ...readerMeanings[0], text, sha256: sha256(text), source: 'PRIVATE_SOURCE', review: { notes: 'PRIVATE_REVIEW' }, facets: ['PRIVATE_OLD_FACET'] };
  meaning.derivation = {...meaning.derivation,claims:meaning.derivation.claims.map((claim,i) => ({...claim,text:i===0?text:claim.text}))}; resign(meaning);
  const batch = prepareBatch({ ...options, readerMeanings: [meaning, ...readerMeanings.slice(1)] });
  for (const p of batch.contacts[0].passages) {
    const input = JSON.parse(p.request.input.slice(p.request.input.indexOf('{"transit":')));
    assert.equal(input.readerMeaning, text);
    assert.equal(p.readerMeaningSha256, sha256(text));
    assert.equal(p.readerMeaningReviewStatus, 'proposed-owner-review');
    assert.equal(p.preparationStatus, 'prepared-not-authorized');
    assert.equal(p.approved, null);
    for (const forbidden of ['targetSupportedHumanMeaning', 'PRIVATE_SOURCE', 'PRIVATE_REVIEW', 'PRIVATE_OLD_FACET', 'TARGET_COPY', contact.semanticPacket.aspect.mechanism]) {
      assert(!JSON.stringify(p.request).includes(forbidden), forbidden);
    }
    assert.equal(p.input.destinations[0].voiceExamples[0].text, examples[0].text);
    assert.equal(p.input.destinations[0].voiceExamples[0].factsMayTransfer, false);
  }
  assert.equal(batch.contacts[0].privateMeaningReceipt.readerMeaningSource, 'PRIVATE_SOURCE');
});

test('missing, rejected, changed or untraceable meaning has no abstract fallback', () => {
  const cases = [
    [undefined, /READER_MEANING_REQUIRED/],
    [{ ...readerMeanings[0], status: 'rejected' }, /READER_MEANING_REJECTED/],
    [{ ...readerMeanings[0], status: 'approved-by-model' }, /READER_MEANING_STATUS_INVALID/],
    [{ ...readerMeanings[0], contentKey: records[1].contentKey }, /READER_MEANING_IDENTITY_MISMATCH/],
    [{ ...readerMeanings[0], text: 'Changed without updating the hash.' }, /READER_MEANING_INTEGRITY/],
    [{ ...readerMeanings[0], text: ' ', sha256: sha256(' ') }, /READER_MEANING_INTEGRITY/],
    [{ ...readerMeanings[0], semanticPacketSha256: 'stale' }, /READER_MEANING_SEMANTIC_SOURCE_DRIFT/],
    [{ ...readerMeanings[0], source: '' }, /READER_MEANING_SOURCE_REQUIRED/]
  ];
  for (const [meaning, error] of cases) assert.throws(() => project(meaning), error);
  assert.throws(() => prepareBatch({ ...options, readerMeanings: undefined }), /READER_MEANING_REQUIRED_FOR_EACH_CONTACT/);
  assert.throws(() => prepareBatch({ ...options, readerMeanings: readerMeanings.slice(1) }), /READER_MEANING_REQUIRED_FOR_EACH_CONTACT/);
  assert.throws(() => prepareBatch({ ...options, readerMeanings: [readerMeanings[1], ...readerMeanings.slice(1)] }), /READER_MEANING_TARGET_SET_MISMATCH/);
});

test('claimed owner acceptance must cite the exact meaning, and does not approve generated prose', () => {
  const meaning = { ...readerMeanings[0], status: 'owner-accepted' };
  assert.throws(() => project(meaning), /EXACT_READER_MEANING_REVIEW_REQUIRED/);
  assert.throws(() => project({ ...meaning, review: { textSha256: 'stale', source: 'synthetic-exact-review' } }), /EXACT_READER_MEANING_REVIEW_REQUIRED/);
  const accepted = { ...meaning, review: { textSha256: meaning.sha256, recordSha256:meaning.recordSha256, source: 'synthetic-exact-review' } };
  assert.equal(project(accepted).privateReceipt.review.textSha256, meaning.sha256);
  const batch = prepareBatch({ ...options, readerMeanings: [accepted, ...readerMeanings.slice(1)] });
  for (const p of batch.contacts[0].passages) {
    assert.equal(p.approved, null);
    assert.equal(p.currentText, null);
    assert.equal(p.status, 'awaiting-generation');
    assert(!JSON.stringify(p.request).includes('synthetic-exact-review'));
  }
  assert.equal(batch.policy.dispatchEnabled, false);
});

test('a meaning change binds both perspective hashes without altering other contacts or contracts', () => {
  const changed = readerMeanings.map(m => ({ ...m }));
  changed[3].text = 'A different synthetic meaning fixture.';
  changed[3].sha256 = sha256(changed[3].text);
  changed[3].derivation = {...changed[3].derivation,claims:changed[3].derivation.claims.map(c=>({...c,text:changed[3].text}))}; resign(changed[3]);
  const next = prepareBatch({ ...options, readerMeanings: changed });
  assert.deepEqual(next.policy, baseline.policy);
  assert.deepEqual(next.model, baseline.model);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) {
    const before = baseline.contacts[i].passages[j], after = next.contacts[i].passages[j];
    assert.equal(after.requestSha256, sha256(after.request));
    assert.equal(after.requestSha256 === before.requestSha256, i !== 3);
    assert.deepEqual(after.contract, before.contract);
    assert.deepEqual(after.input.factualBoundaries, before.input.factualBoundaries);
    assert.deepEqual(after.evidence, before.evidence);
    assert.equal(after.readerRuleBundleSha256, READER_RULES_SHA256);
  }
});

test('CLI persists all eight complete dry-run requests with network transports disabled', () => {
  const persistent = process.env.TRANSIT_REPAIR_TEST_OUTPUT;
  const root = mkdtempSync(join(persistent || tmpdir(), 'reader-meaning-cli-'));
  const write = (name, value) => { const path = join(root, name); writeFileSync(path, value, { mode: 0o600 }); return path; };
  try {
    const source = write('synthetic-voice.txt', text);
    const catalog = write('synthetic-catalog.json', JSON.stringify(records));
    const gold = write('synthetic-gold.json', JSON.stringify({ id: 'CURRENT_TRANSIT_VOICE_GOLD', role: 'voice-only', status: 'owner-approved-current-voice', passages: [{ ...examples[0], source, sourceFileSha256: sha256(text) }] }));
    const meanings = write('synthetic-meanings.json', JSON.stringify({ id: 'PERSONAL_TRANSIT_READER_MEANINGS', records: readerMeanings }));
    const feedback=write('synthetic-feedback.json',JSON.stringify({schema:'personal-transit-feedback-v1',corrections:[],rejectionSources:[]}));
    const plan=write('synthetic-plan.json',JSON.stringify({schema:'personal-transit-input-plan-v1',id:'meaning-fixture',selectedContacts:records.map(r=>r.contentKey),requiredRegressionContacts:[],friendEvidencePolicy:'owner-authorized-you-voice',feedbackFile:feedback}));
    const guard = write('deny-network.mjs', `import http from 'node:http'; import https from 'node:https'; import net from 'node:net'; import tls from 'node:tls';\nconst deny = () => { throw Error('NETWORK_FORBIDDEN_IN_DRY_RUN'); };\nglobalThis.fetch = deny; http.request = http.get = https.request = https.get = net.connect = net.createConnection = tls.connect = deny;\n`);
    const output = join(root, 'dry-run');
    const result = spawnSync(process.execPath, ['--import', guard, 'scripts/transit-owner-batch/prepare.mjs', catalog, gold, meanings, plan, output], { cwd: fileURLToPath(new URL('../../', import.meta.url)), encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    const receipt = JSON.parse(readFileSync(join(output, 'preparation-receipt.json')));
    const state = loadState(join(output, 'batch'));
    assert.equal(receipt.providerCalls, 0);
    assert.equal(receipt.dispatchAuthorized, false);
    assert.equal(receipt.contentWrites, 0);
    assert.equal(receipt.requests.length, 8);
    assert.equal(readdirSync(output).filter(name => name.endsWith('.request.json')).length, 8);
    for (const role of ['writer', 'validator']) assert.equal(readFileSync(join(output, `${role}-effective-rule-bundle.json`), 'utf8'), READER_RULES_JSON);
    for (const [i, c] of state.contacts.entries()) for (const p of c.passages) {
      const stored = JSON.parse(readFileSync(join(output, `${i + 1}-${p.perspective}.request.json`)));
      assert.deepEqual(stored, p.request);
      assert.equal(sha256(stored), p.requestSha256);
      assert.equal(JSON.parse(stored.input.slice(stored.input.indexOf('{"transit":'))).readerMeaning, readerMeanings[i].text);
      assert.equal(p.currentText, null);
    }
    assert.equal(state.provenance.readerMeaningsFileSha256, sha256(readFileSync(meanings)));
    const original = readFileSync(join(output, 'batch/revision-000000.json'));
    const repeat = spawnSync(process.execPath, ['--import', guard, 'scripts/transit-owner-batch/prepare.mjs', catalog, gold, meanings, plan, output], { cwd: fileURLToPath(new URL('../../', import.meta.url)), encoding: 'utf8' });
    assert.notEqual(repeat.status, 0);
    assert.match(repeat.stderr, /NEW_OUTPUT_DIRECTORY_REQUIRED/);
    assert.deepEqual(readFileSync(join(output, 'batch/revision-000000.json')), original);
    if (persistent) console.log(`Synthetic dry-run evidence: ${output}`);
  } finally {
    if (!persistent) rmSync(root, { recursive: true, force: true });
  }
});
