import { createHash } from 'node:crypto';
import knowledge from '../../packages/astro-knowledge/scripts/knowledge-resolver.js';
import semantics from './transitNatalSemantics.cjs';

export const meaningHash = value => createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(value)).digest('hex');
const identity = contentKey => {
  const match = /^authored\/transit-aspect\/([^/]+)\/([^/]+)\/(conjunction|sextile|square|trine|opposition)$/u.exec(contentKey);
  if (!match) throw Error('READER_MEANING_EXACT_CONTACT_REQUIRED');
  return { transiting: match[1], natal: match[2], aspect: match[3] };
};

/** Retrieve meaning evidence, never voice. A source's existence or prose
 * approval does not grant factual authority. Policy/notes are not meanings. */
export function retrievePersonalTransitMeaningSources(contentKey, packet) {
  const facts = identity(contentKey);
  semantics.assertTransitNatalSemantics(packet, facts);
  const canonicalId = contentKey.slice('authored/'.length);
  const resolved = knowledge.resolve(canonicalId, { surface: 'you-transit', usage: 'mechanism-reference' });
  const exact = resolved.records.filter(record => record.authorityClass === 'factual-evidence'
    && ['plainTranslation', 'overview', 'definition'].includes(record.field));
  const source = (record, role) => ({ id: `${role}:${record.evidenceSha256}`, role,
    path: record.path, field: record.field, text: record.text, sourceSha256: record.sourceSha256,
    evidenceSha256: record.evidenceSha256, authorityClass: record.authorityClass });
  const sources = [
    ...exact.map(record => source(record, 'exact-contact')),
    ...packet.transitingBody.evidence.filter(record => record.field !== 'policy').map(record => source(record, 'transiting-body')),
    ...packet.natalTarget.evidence.filter(record => record.field !== 'policy').map(record => source(record, 'natal-target')),
    { id: `aspect:${packet.aspect.sha256}`, role: 'aspect', path: packet.aspect.source.path,
      field: `ASPECT_MECHANISMS.${facts.aspect}`, text: packet.aspect.mechanism,
      evidenceSha256: packet.aspect.sha256, authorityClass: 'owner-directed-semantic-mechanics' }
  ];
  const body = { version: 'personal-transit-meaning-retrieval-v1', contentKey,
    mode: exact.length ? 'exact-contact' : 'component-derived', semanticPacketSha256: packet.packetSha256,
    sources, excluded: resolved.records.filter(record => !exact.includes(record)).map(record => ({
      path: record.path, field: record.field, evidenceSha256: record.evidenceSha256,
      reason: record.authorityClass !== 'factual-evidence' ? 'not-factual-authority' : 'not-interpretation-text'
    })), constraints: packet.constraints };
  return { ...body, retrievalSha256: meaningHash(body) };
}

function recordPayload(record) {
  const { recordSha256, status, review, ...payload } = record;
  return payload;
}

/** Preparation creates an unapproved reusable record. It never composes text,
 * calls a model, grants source authority, or marks an interpretation accepted. */
export function preparePersonalTransitMeaningRecord({ contentKey, revision, claims, source, history = [] }, packet) {
  const retrieval = retrievePersonalTransitMeaningSources(contentKey, packet);
  const text = claims.map(claim => claim.text).join(' ');
  const payload = { schema: 'personal-transit-reader-meaning/v1', id: `meaning:${contentKey}`, revision,
    contentKey, text, sha256: meaningHash(text), semanticPacketSha256: packet.packetSha256,
    source, authorship: 'assistant-proposed-editorial-meaning', history,
    derivation: { mode: retrieval.mode, retrievalSha256: retrieval.retrievalSha256, claims } };
  const record = { ...payload, recordSha256: meaningHash(payload), status: 'proposed-owner-review', review: null };
  assertPersonalTransitMeaningRecord(record, packet, { allowProposed: true });
  return record;
}

/** Verifies provenance and owner review, not the truth or quality of a sentence.
 * Recompute retrieval so a caller cannot claim that an exact source is absent. */
export function assertPersonalTransitMeaningRecord(record, packet, { allowProposed = false } = {}) {
  if (!record || record.schema !== 'personal-transit-reader-meaning/v1') throw Error('PERSISTED_READER_MEANING_RECORD_REQUIRED');
  const retrieval = retrievePersonalTransitMeaningSources(record.contentKey, packet);
  if (record.id !== `meaning:${record.contentKey}` || !Number.isInteger(record.revision) || record.revision < 1
    || typeof record.text !== 'string' || !record.text.trim() || record.text.length > 6000
    || record.sha256 !== meaningHash(record.text) || record.semanticPacketSha256 !== packet.packetSha256
    || record.recordSha256 !== meaningHash(recordPayload(record))
    || typeof record.source !== 'string' || !record.source.trim() || !Array.isArray(record.history)
    || record.derivation?.mode !== retrieval.mode || record.derivation?.retrievalSha256 !== retrieval.retrievalSha256) {
    throw Error('READER_MEANING_RECORD_DRIFT');
  }
  const claims = record.derivation.claims;
  const available = new Map(retrieval.sources.map(source => [source.id, source]));
  if (!Array.isArray(claims) || !claims.length || claims.map(claim => claim.text).join(' ') !== record.text
    || claims.some(claim => typeof claim.text !== 'string' || !claim.text.trim()
      || typeof claim.rationale !== 'string' || !claim.rationale.trim()
      || !Array.isArray(claim.sourceIds) || !claim.sourceIds.length || claim.sourceIds.some(id => !available.has(id)))) {
    throw Error('READER_MEANING_CLAIM_SOURCES_REQUIRED');
  }
  const roles = new Set(claims.flatMap(claim => claim.sourceIds.map(id => available.get(id).role)));
  if (retrieval.mode === 'exact-contact' ? !roles.has('exact-contact')
    : ['transiting-body', 'natal-target', 'aspect'].some(role => !roles.has(role))) {
    throw Error('READER_MEANING_SOURCE_PRECEDENCE');
  }
  for (const previous of record.history) {
    if (typeof previous.text !== 'string' || previous.sha256 !== meaningHash(previous.text)
      || typeof previous.reason !== 'string' || !previous.reason.trim()
      || typeof previous.source !== 'string' || !previous.source.trim()) throw Error('READER_MEANING_HISTORY_INVALID');
  }
  if (record.status === 'rejected' || record.status === 'superseded') throw Error('READER_MEANING_REJECTED');
  if (record.status === 'owner-accepted') {
    if (record.review?.textSha256 !== record.sha256 || record.review?.recordSha256 !== record.recordSha256
      || typeof record.review?.source !== 'string' || !record.review.source.trim()) throw Error('EXACT_READER_MEANING_REVIEW_REQUIRED');
  } else if (record.status !== 'proposed-owner-review' || !allowProposed) throw Error('READER_MEANING_REVIEW_REQUIRED');
  return retrieval;
}
