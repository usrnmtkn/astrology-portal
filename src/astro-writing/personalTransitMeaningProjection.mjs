import { createHash } from 'node:crypto';
import { assertPersonalTransitMeaningRecord } from './personalTransitMeaningRecords.mjs';
import { readerMeaningBasis } from './personalTransitInputControls.mjs';

const hash = text => createHash('sha256').update(text).digest('hex');

// A transport boundary for supplied meaning and its review provenance. This does
// not generate meaning, choose a scenario, or fall back to astrology mechanics.
export function personalTransitMeaningProjection(contentKey, packet, meaning, { allowProposed = false, ...options } = {}) {
  const key = contentKey.replace(/^authored\/transit-aspect\//u, '');
  if (`${packet.identity.transiting}/${packet.identity.natal}/${packet.identity.aspect}` !== key) throw Error('SEMANTIC_IDENTITY_MISMATCH');
  if (!meaning) throw Error('READER_MEANING_REQUIRED');
  if (meaning.contentKey !== contentKey) throw Error('READER_MEANING_IDENTITY_MISMATCH');
  if (meaning.status === 'rejected') throw Error('READER_MEANING_REJECTED');
  if (!['proposed-owner-review', 'owner-accepted'].includes(meaning.status)) throw Error('READER_MEANING_STATUS_INVALID');
  if (typeof meaning.text !== 'string' || !meaning.text.trim() || meaning.sha256 !== hash(meaning.text)) throw Error('READER_MEANING_INTEGRITY');
  if (meaning.semanticPacketSha256 !== packet.packetSha256) throw Error('READER_MEANING_SEMANTIC_SOURCE_DRIFT');
  if (typeof meaning.source !== 'string' || !meaning.source.trim()) throw Error('READER_MEANING_SOURCE_REQUIRED');
  if (meaning.status === 'owner-accepted' &&
      (meaning.review?.textSha256 !== meaning.sha256 || typeof meaning.review?.source !== 'string' || !meaning.review.source.trim())) {
    throw Error('EXACT_READER_MEANING_REVIEW_REQUIRED');
  }
  const retrieval = assertPersonalTransitMeaningRecord(meaning, packet, { ...options, allowProposed });
  return {
    readerMeaning: meaning.text,
    privateReceipt: {
      projectionVersion: 'personal-transit-reader-meaning-v3',
      meaningRecordId: meaning.id,
      meaningRecordRevision: meaning.revision,
      meaningRecordSha256: meaning.recordSha256,
      derivationMode: retrieval.mode,
      sourceBasis: readerMeaningBasis(packet),
      meaningSources: retrieval,
      approvedWritingComparison: meaning.derivation.approvedWritingComparison,
      sourceBasisAcknowledged: true,
      retrievalSha256: retrieval.retrievalSha256,
      sourcePacketSha256: packet.packetSha256,
      readerMeaningSha256: meaning.sha256,
      readerMeaningSource: meaning.source,
      interpretationStatus: meaning.status,
      review: meaning.status === 'owner-accepted' ? { textSha256: meaning.review.textSha256, source: meaning.review.source } : null,
      withheldFields: ['transitingBody', 'natalTarget', 'aspect', 'constraints', 'sourcePacket', 'evidence', 'review'],
      constraint: 'Only the supplied readerMeaning text enters the writer. Raw mechanics, old semantic facets and review notes remain private. No text is rewritten.'
    }
  };
}
