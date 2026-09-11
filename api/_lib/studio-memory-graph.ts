import { createHash } from 'node:crypto';
import { feedbackHash, feedbackMemoryId, type StudioFeedback } from './studio-memory-feedback.js';
const hash = (text: string) => createHash('sha256').update(text).digest('hex');

/** New immutable projection per database read; never mutate the deployment cache. */
export function withStudioFeedback(index: any, rows: StudioFeedback[]) {
  const path = 'private-studio/approved-corrections';
  const sourceId = 's-private-studio-feedback';
  const records = rows.filter(row => row.status === 'active').map(row => {
    const body = `Original wording:\n${row.before_text}\n\nApproved replacement:\n${row.after_text}\n\nReason:\n${row.reason || 'No reason recorded.'}\n\nScope: ${row.scope}`;
    return { id: feedbackMemoryId(row), kind: 'correction', status: 'current',
      role: 'Owner-reviewed Studio correction', title: `Studio correction · ${row.content_key}`,
      body, sourceId, path, line: 0, endLine: 0, bodySha256: hash(body), family: row.family,
      register: 'sky-card', contentKey: row.content_key, writerPacketEligible: false,
      metadata: { storage: 'private-studio', feedbackId: row.id, feedbackVersion: row.version,
        scope: row.scope, evidenceSha256: feedbackHash(row), sourceRowId: row.source_row_id,
        beforeVersion: row.before_version, afterVersion: row.after_version, updatedAt: row.updated_at } };
  });
  const sourceHash = hash(JSON.stringify(records.map(row => [row.id, row.metadata.evidenceSha256])));
  return { ...index, records: [...index.records, ...records],
    sources: [...index.sources, ...(records.length ? [{ id: sourceId, path, title: 'Studio corrections', kind: 'correction', status: 'current', sha256: sourceHash }] : [])],
    edges: [...index.edges, ...records.map(row => ({ source: sourceId, target: row.id, relation: 'contains' }))],
    counts: { ...index.counts, correction: index.counts.correction + records.length },
    fingerprint: hash(`${index.fingerprint}:${sourceHash}`) };
}
