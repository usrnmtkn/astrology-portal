import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import semantics from '../src/astro-writing/transitNatalSemantics.cjs';
import { meaningHash, preparePersonalTransitMeaningRecord, retrievePersonalTransitMeaningSources } from '../src/astro-writing/personalTransitMeaningRecords.mjs';

const read = path => JSON.parse(readFileSync(path, 'utf8'));
const escape = value => String(value).replace(/[&<>"']/gu, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));

/** No interpretation strings or provider transport belong in this script.
 * Inputs are durable editorial proposals with claim-level source choices. */
export function prepareMeaningReview(input, baselineDirectory, outputDirectory) {
  if (!Array.isArray(input.records) || !input.records.length || new Set(input.records.map(r => r.contentKey)).size !== input.records.length) throw Error('UNIQUE_MEANING_RECORDS_REQUIRED');
  if (existsSync(outputDirectory)) throw Error('REVIEW_OUTPUT_ALREADY_EXISTS');
  const baseline = read(join(baselineDirectory, 'manifest.json'));
  const oldMeanings = read(join(baselineDirectory, 'reader-meanings.json')).records;
  const records = [], receipts = [];
  for (const proposal of input.records) {
    const [, , transiting, natal, aspect] = proposal.contentKey.split('/');
    const packet = semantics.resolveTransitNatalSemantics({ transiting, natal, aspect });
    const retrieval = retrievePersonalTransitMeaningSources(proposal.contentKey, packet);
    const claims = proposal.claims.map(claim => {
      if (!Array.isArray(claim.sourceRoles) || claim.sourceRoles.some(role => !retrieval.sources.some(source => source.role === role))) throw Error('UNKNOWN_MEANING_SOURCE_ROLE');
      return { text: claim.text, rationale: claim.rationale,
        sourceIds: retrieval.sources.filter(source => claim.sourceRoles.includes(source.role)).map(source => source.id) };
    });
    const prior = oldMeanings.find(record => record.contentKey === proposal.contentKey);
    if (!prior && proposal.revision !== 1) throw Error('BASELINE_MEANING_MISSING');
    const record = preparePersonalTransitMeaningRecord({ contentKey: proposal.contentKey, revision: proposal.revision,
      claims, source: input.source, history: prior ? [{ ...prior, previousStatus: prior.status,
        status: 'superseded', reason: proposal.correction }] : [] }, packet);
    records.push(record); receipts.push(retrieval);
  }
  const comparisonKeys = input.comparisonContentKeys ?? records.map(record => record.contentKey);
  if (!Array.isArray(comparisonKeys) || new Set(comparisonKeys).size !== comparisonKeys.length
    || comparisonKeys.some(key => !records.some(record => record.contentKey === key))) throw Error('COMPARISON_SCOPE_INVALID');
  const requests = baseline.requests.filter(request => comparisonKeys.includes(request.contentKey));
  if (requests.length !== comparisonKeys.length * 2 || comparisonKeys.some(key => {
    const fields = requests.filter(request => request.contentKey === key).map(request => request.field);
    return fields.length !== 2 || new Set(fields).size !== 2;
  })) throw Error('COMPLETE_BASELINE_AUDIENCES_REQUIRED');
  const prepared = requests.map(request => {
    if (basename(request.requestFile) !== request.requestFile) throw Error('BASELINE_REQUEST_PATH_INVALID');
    const bytes = readFileSync(join(baselineDirectory, request.requestFile));
    if (meaningHash(bytes.toString()) !== request.requestSha256) throw Error('BASELINE_REQUEST_DRIFT');
    const original = JSON.parse(bytes), originalInput = JSON.parse(original.input);
    const prior = oldMeanings.find(record => record.contentKey === request.contentKey);
    if (originalInput.transit.contentKey !== request.contentKey || originalInput.readerMeaning !== prior.text) throw Error('BASELINE_INPUT_MISMATCH');
    const record = records.find(record => record.contentKey === request.contentKey);
    const nextInput = { ...originalInput, readerMeaning: record.text };
    const next = { ...original, input: JSON.stringify(nextInput) };
    const restored = { ...next, input: JSON.stringify({ ...nextInput, readerMeaning: originalInput.readerMeaning }) };
    if (JSON.stringify(restored) !== JSON.stringify(original)) throw Error('NON_MEANING_INPUT_CHANGED');
    return { request, body: next, receipt: { contentKey: request.contentKey, field: request.field,
      requestFile: request.requestFile, baselineRequestSha256: request.requestSha256,
      requestSha256: meaningHash(JSON.stringify(next)), meaningRecordSha256: record.recordSha256,
      unchangedInputSha256: meaningHash({ ...originalInput, readerMeaning: null }),
      voiceSourceIds: originalInput.preferredVoiceExamples.map(example => example.sourceId),
      voiceEvidenceSha256: meaningHash(originalInput.preferredVoiceExamples),
      onlyReaderMeaningChanged: true, authorization: 'not-authorized', status: 'awaiting-owner-input-review' } };
  });
  mkdirSync(outputDirectory, { recursive: true, mode: 0o700 });
  const write = (name, value) => writeFileSync(join(outputDirectory, name), typeof value === 'string' ? value : JSON.stringify(value, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  write('reader-meanings.json', { schema: 'personal-transit-meaning-review/v1', records });
  write('source-receipts.json', receipts);
  for (const request of prepared) write(request.request.requestFile, JSON.stringify(request.body));
  write('manifest.json', { schema: 'personal-transit-meaning-comparison/v1', baselineDirectory,
    baselineManifestSha256: meaningHash(readFileSync(join(baselineDirectory, 'manifest.json')).toString()),
    model: baseline.model, requests: prepared.map(request => request.receipt),
    providerCalls: 0, authorization: 'not-authorized', ownerApproved: false, publication: false });
  const sections = records.map((record, index) => `<section><h2>${escape(record.contentKey.split('/').slice(2).join(' / '))}</h2><p class="status">Proposed meaning · ${escape(record.derivation.mode)} · revision ${record.revision}</p><h3>Proposed input</h3><p class="meaning">${escape(record.text)}</p><h3>Editorial rationale</h3><p>${escape(input.records[index].correction)}</p>${record.history.length ? `<details><summary>Previous input, preserved</summary><p>${escape(record.history[0].text)}</p></details>` : '<p>First proposed meaning record for this contact.</p>'}<h3>Source relationships</h3>${record.derivation.claims.map(claim => `<p>${escape(claim.rationale)}</p><ul>${claim.sourceIds.map(id => { const source = receipts[index].sources.find(source => source.id === id); return `<li><strong>${escape(source.role)}</strong> — ${escape(source.path)} · ${escape(source.field)}<blockquote>${escape(source.text)}</blockquote></li>`; }).join('')}</ul>`).join('')}<details><summary>Retrieval exclusions (${receipts[index].excluded.length})</summary><pre>${escape(JSON.stringify(receipts[index].excluded, null, 2))}</pre></details></section>`).join('');
  write('review.html', `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Transit meanings for review</title><style>body{font:17px/1.6 system-ui;background:#faf8f3;color:#292723;max-width:850px;margin:40px auto;padding:0 22px}h1{line-height:1.15}section{border-top:1px solid #c8c3b8;padding:24px 0}.status,summary{color:#625c52}.meaning{font-size:21px}blockquote{margin:8px 0 24px;border-left:3px solid #bcb5a7;padding-left:16px}pre{white-space:pre-wrap;overflow-wrap:anywhere;font-size:12px}li{overflow-wrap:anywhere}</style><h1>${records.length} transit meanings for review</h1><p>These are proposed editorial inputs, not finished reader passages or approved interpretations. Each has its own source record and correction history. This preparation makes no provider calls.</p><p>The ${prepared.length} prepared comparison requests keep the original model, settings, rules, destination fields and Saturn voice example unchanged. Only <code>readerMeaning</code> changes. This isolates meaning; it does not test a broader voice selection. The files carry no generation authorization.</p>${sections}</html>`);
  return { records: records.length, requests: prepared.length, providerCalls: 0, review: join(outputDirectory, 'review.html') };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [inputPath, baseline, output] = process.argv.slice(2);
  if (!output) throw Error('Usage: prepare-personal-transit-meanings.mjs private-proposals.json baseline-directory new-private-review-directory');
  console.log(JSON.stringify(prepareMeaningReview(read(inputPath), resolve(baseline), resolve(output))));
}
