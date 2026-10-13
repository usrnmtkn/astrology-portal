import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, rmSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import semantics from '../src/astro-writing/transitNatalSemantics.cjs';
import { meaningHash, preparePersonalTransitMeaningRecord, retrievePersonalTransitMeaningSources, assertPersonalTransitMeaningRecord } from '../src/astro-writing/personalTransitMeaningRecords.mjs';
import { personalTransitMeaningProjection } from '../src/astro-writing/personalTransitMeaningProjection.mjs';
import { syntheticWritingComparison } from './fixtures/personal-transit-writing.mjs';
import { prepareMeaningReview } from './prepare-personal-transit-meanings.mjs';

const key = 'authored/transit-aspect/mercury/venus/trine';
const packet = semantics.resolveTransitNatalSemantics({ transiting: 'mercury', natal: 'venus', aspect: 'trine' });
const retrieval = retrievePersonalTransitMeaningSources(key, packet);
assert.equal(retrieval.mode, 'exact-contact');
assert(retrieval.sources.some(source => source.role === 'exact-contact' && source.field === 'plainTranslation'));
assert(!retrieval.sources.some(source => source.path.includes('phrasebank') || ['policy', 'note'].includes(source.field)));
assert(retrieval.excluded.some(source => source.reason === 'not-factual-authority'));
const chironPacket = semantics.resolveTransitNatalSemantics({ transiting: 'moon', natal: 'chiron', aspect: 'trine' });
assert.equal(retrievePersonalTransitMeaningSources('authored/transit-aspect/moon/chiron/trine', chironPacket).mode, 'component-derived');
const record = preparePersonalTransitMeaningRecord({ contentKey: key, revision: 2, source: 'synthetic-preparation', approvedWritingComparison:syntheticWritingComparison(retrieval),
  claims: [{ text: 'Synthetic prepared meaning.', rationale: 'Synthetic source mapping, not a real interpretation.', sourceIds: retrieval.sources.map(source => source.id) }],
  history: [{ text: 'Previous synthetic input.', sha256: meaningHash('Previous synthetic input.'), source: 'synthetic-before', reason: 'Synthetic correction.' }] }, packet);
assert.throws(() => personalTransitMeaningProjection(key, packet, record), /REVIEW_REQUIRED/);
const proposed = personalTransitMeaningProjection(key, packet, record, { allowProposed: true });
assert.equal(proposed.readerMeaning, record.text);
assert.equal(proposed.privateReceipt.derivationMode, 'exact-contact');
assert.throws(() => assertPersonalTransitMeaningRecord({ text: record.text, sha256: record.sha256, status: 'owner-accepted' }, packet), /PERSISTED/);
const accepted = { ...record, status: 'owner-accepted', review: { textSha256: record.sha256, recordSha256: record.recordSha256, source: 'synthetic-owner-review' } };
assertPersonalTransitMeaningRecord(accepted, packet);
for (const changed of [{ ...accepted, text: 'tampered' }, { ...accepted, revision: 3 },
  { ...accepted, derivation: { ...record.derivation, mode: 'component-derived' } }]) assert.throws(() => assertPersonalTransitMeaningRecord(changed, packet), /DRIFT/);
assert.throws(() => assertPersonalTransitMeaningRecord({ ...accepted, status: 'rejected' }, packet), /REJECTED/);
assert.throws(() => assertPersonalTransitMeaningRecord({ ...accepted, review: { ...accepted.review, recordSha256: 'old' } }, packet), /REVIEW_REQUIRED/);
assert.throws(() => preparePersonalTransitMeaningRecord({ contentKey: key, revision: 2, source: 'synthetic', approvedWritingComparison:syntheticWritingComparison(retrieval),
  claims: [{ text: 'Synthetic bypass.', rationale: 'Attempt to ignore available exact-contact source.',
    sourceIds: retrieval.sources.filter(source => source.role !== 'exact-contact').map(source => source.id) }] }, packet), /SOURCE_PRECEDENCE/);

const directory = mkdtempSync(join(tmpdir(), 'transit-meaning-record-test-'));
const originalFetch = globalThis.fetch;
globalThis.fetch = async () => { throw Error('No provider or storage calls belong in preparation'); };
try {
  const baseline = join(directory, 'baseline'); mkdirSync(baseline);
  const write = (file, value) => writeFileSync(join(baseline, file), JSON.stringify(value));
  const old = { contentKey: key, text: 'Old synthetic meaning.', sha256: meaningHash('Old synthetic meaning.'), source: 'synthetic-before', status: 'proposed-owner-review', semanticPacketSha256: packet.packetSha256 };
  write('reader-meanings.json', { records: [old] });
  const requests = ['you', 'friend'].map(perspective => {
    const requestFile = `${perspective}.json`;
    const body = { model: 'synthetic-frozen-model', system_instruction: 'Synthetic frozen rules.',
      generation_config: { test: true }, store: false, input: JSON.stringify({ transit: { contentKey: key }, perspective,
        readerMeaning: old.text, preferredVoiceExamples: [{ sourceId: 'synthetic-frozen-voice', text: 'Whole synthetic voice.' }], destination: { field: perspective } }) };
    write(requestFile, body);
    return { contentKey: key, field: perspective, requestFile, requestSha256: meaningHash(JSON.stringify(body)) };
  });
  write('manifest.json', { model: { model: 'synthetic-frozen-model' }, requests });
  const input = { source: 'synthetic-preparation', approvedWritingComparison:syntheticWritingComparison(retrieval), records: [{ contentKey: key, revision: 2, approvedWritingComparison:syntheticWritingComparison(retrievePersonalTransitMeaningSources(key,packet)), correction: 'Synthetic correction.', claims: [{ text: record.text, rationale: 'Synthetic mapping.', sourceRoles: ['exact-contact'] }] }] };
  const output = join(directory, 'review');
  assert.equal(prepareMeaningReview(input, baseline, output).providerCalls, 0);
  const manifest = JSON.parse(readFileSync(join(output, 'manifest.json')));
  assert.equal(manifest.authorization, 'not-authorized');
  assert(manifest.requests.every(request => request.onlyReaderMeaningChanged));
  for (const request of requests) {
    const before = JSON.parse(readFileSync(join(baseline, request.requestFile))), after = JSON.parse(readFileSync(join(output, request.requestFile)));
    const a = JSON.parse(before.input), b = JSON.parse(after.input);
    assert.equal(b.readerMeaning, record.text); delete a.readerMeaning; delete b.readerMeaning;
    assert.deepEqual(a, b); delete before.input; delete after.input; assert.deepEqual(before, after);
  }
  const prepared = JSON.parse(readFileSync(join(output, 'reader-meanings.json'))).records[0];
  assert.equal(prepared.history[0].semanticPacketSha256, old.semanticPacketSha256);
  assert.equal(prepared.history[0].previousStatus, old.status);
  assert.equal(prepared.status, 'proposed-owner-review');
  assert.throws(() => prepareMeaningReview(input, baseline, output), /ALREADY_EXISTS/);
  const firstKey = 'authored/transit-aspect/venus/moon/square';
  const expanded = { ...input, comparisonContentKeys: [key], records: [...input.records,
    { contentKey: firstKey, revision: 1, approvedWritingComparison:syntheticWritingComparison(retrievePersonalTransitMeaningSources(firstKey,semantics.resolveTransitNatalSemantics({transiting:'venus',natal:'moon',aspect:'square'}))), correction: 'Synthetic first proposal.',
      claims: [{ text: 'Synthetic new contact meaning.', rationale: 'Synthetic exact source.', sourceRoles: ['exact-contact'] }] }] };
  const expandedOutput = join(directory, 'expanded');
  assert.deepEqual(prepareMeaningReview(expanded, baseline, expandedOutput), { records: 2, requests: 2, providerCalls: 0, review: join(expandedOutput, 'review.html') });
  const firstRecord = JSON.parse(readFileSync(join(expandedOutput, 'reader-meanings.json'))).records[1];
  assert.equal(firstRecord.status, 'proposed-owner-review'); assert.deepEqual(firstRecord.history, []);
  const changed = JSON.parse(readFileSync(join(baseline, 'you.json'))); changed.model = 'drift'; write('you.json', changed);
  assert.throws(() => prepareMeaningReview(input, baseline, join(directory, 'bad')), /REQUEST_DRIFT/);
} finally { globalThis.fetch = originalFetch; rmSync(directory, { recursive: true, force: true }); }
console.log('PASS meaning preparation: exact-source precedence, explicit component fallback, immutable source/claim/history/review bindings, legacy and unreviewed rejection, and meaning-only request comparison. Zero provider calls.');
