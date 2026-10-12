import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import semantics from '../../src/astro-writing/transitNatalSemantics.cjs';
import { preparePersonalTransitMeaningRecord, retrievePersonalTransitMeaningSources } from '../../src/astro-writing/personalTransitMeaningRecords.mjs';
export const digest = text => createHash('sha256').update(text).digest('hex');
export function syntheticStylePhrase(overrides = {}) {
  const text = 'Complete synthetic style phrase. Its second sentence stays intact.';
  return { id: 'synthetic-style-phrase', text, sha256: digest(text), wordCount: text.split(/\s+/u).length,
    role: 'style-example', ownerSupplied: true, status: 'current', source: 'synthetic-phrase-bank-only',
    sourceSha256: digest('Synthetic complete document.'), roleSource: 'synthetic-explicit-style-assignment',
    roleTextSha256: digest(text), contentKeys: [], excludedContentKeys: [], audiences: ['you', 'friend'], ...overrides };
}
export function syntheticMeaningRecord(contentKey, text = 'Synthetic complete contact meaning.', reviewed = true) {
  const [, , transiting, natal, aspect] = contentKey.split('/');
  const packet = semantics.resolveTransitNatalSemantics({ transiting, natal, aspect });
  const retrieval = retrievePersonalTransitMeaningSources(contentKey, packet);
  const record = preparePersonalTransitMeaningRecord({ contentKey, revision: 1, source: 'synthetic-fixture-only',
    claims: [{ text, sourceIds: retrieval.sources.map(source => source.id), rationale: 'Synthetic transport fixture, not an interpretation.' }] }, packet);
  if (reviewed) { record.status = 'owner-accepted'; record.review = { textSha256: record.sha256,
    recordSha256: record.recordSha256, source: 'synthetic-owner-review-fixture-only' }; }
  return record;
}
export function syntheticTransitSources({ meaningText = 'Synthetic complete contact meaning.', reviewed = true } = {}) {
  return { schema: 'personal-transit-writing-sources/v1', version: 'synthetic-only', stylePhrases: [syntheticStylePhrase()], meanings:
    ['authored/transit-aspect/neptune/jupiter/trine', 'authored/transit-aspect/saturn/saturn/conjunction']
      .map(key => syntheticMeaningRecord(key, meaningText, reviewed)),
    passages: ['moon/mercury/trine', 'moon/venus/sextile'].flatMap((key, index) => ['body_you', 'body_they'].map(field => {
      const text = `${field === 'body_you' ? 'You' : 'They'} read synthetic source ${index}.\n\n${'Complete synthetic evidence. '.repeat(65)}Final synthetic source sentence.`;
      return { id: `synthetic-${index}-${field}`, contentKey: `authored/transit-aspect/${key}`, field, text,
        sha256: digest(text), source: 'synthetic-test-only', sourceSha256: digest('synthetic source document'),
        ownerApproved: true, role: 'positive-voice-evidence', status: 'current', roleSource: 'synthetic-test-only', roleTextSha256: digest(text) };
    })) };
}
export const encodeTransitSources = sources => gzipSync(JSON.stringify(sources)).toString('base64');
