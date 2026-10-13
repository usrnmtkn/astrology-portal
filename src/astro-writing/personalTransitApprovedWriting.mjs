import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import knowledge from '../../packages/astro-knowledge/scripts/knowledge-resolver.js';
import verification from '../../packages/astro-knowledge/scripts/source-verification.js';

const digest = value => createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(value)).digest('hex');
const hashPattern = /^[a-f0-9]{64}$/u;
const keyPattern = /^authored\/transit-aspect\/[a-z-]+\/[a-z-]+\/(conjunction|sextile|square|trine|opposition|soft|hard)$/u;
const groups = { square: 'hard', opposition: 'hard', trine: 'soft', sextile: 'soft', conjunction: 'conjunction' };
const root = new URL('../../', import.meta.url);

// A protected catalog can supply newer exact owner approvals than the deployed
// package. These complete passages are comparison evidence, never voice inputs.
export function assertApprovedPersonalWritings(records = []) {
  if (!Array.isArray(records)) throw Error('APPROVED_PERSONAL_WRITING_CATALOG_INVALID');
  const ids = new Set();
  for (const r of records) {
    if (!r || typeof r.id !== 'string' || !r.id || ids.has(r.id) || !keyPattern.test(r.contentKey)
      || !['body_you', 'body_they'].includes(r.field) || r.ownerApproved !== true
      || !['current', 'retired', 'rejected'].includes(r.status)
      || typeof r.text !== 'string' || !r.text.trim() || digest(r.text) !== r.textSha256
      || typeof r.source !== 'string' || !r.source || !hashPattern.test(r.sourceSha256)
      || typeof r.approval?.source !== 'string' || !r.approval.source
      || !hashPattern.test(r.approval.sourceSha256) || r.approval.textSha256 !== r.textSha256)
      throw Error('APPROVED_PERSONAL_WRITING_CATALOG_INVALID');
    ids.add(r.id);
  }
  return records;
}

export function retrieveApprovedPersonalWriting(contentKey, { approvedPersonalWritings = [] } = {}) {
  if (!keyPattern.test(contentKey)) throw Error('APPROVED_PERSONAL_WRITING_CONTACT_INVALID');
  const parts = contentKey.split('/'), aspect = parts.at(-1);
  const familyKey = [...parts.slice(0, -1), groups[aspect] ?? aspect].join('/');
  const keys = [...new Set([contentKey, familyKey])];
  const sources = [], excluded = [];
  const add = (record, match) => {
    const body = { ...record, role: 'approved-personal-writing', match,
      authorityClass: 'owner-approved-prose', use: 'private-meaning-comparison-only' };
    sources.push({ ...body, id: `approved-personal-writing:${digest(body)}` });
  };
  for (const r of assertApprovedPersonalWritings(approvedPersonalWritings)) {
    if (!keys.includes(r.contentKey)) continue;
    if (r.status !== 'current') { excluded.push({ contentKey: r.contentKey, field: r.field, source: r.source, reason: r.status }); continue; }
    add(r, r.contentKey === contentKey ? 'exact-contact' : 'aspect-family');
  }
  const index = knowledge.loadIndex();
  for (const key of keys) {
    const entry = index.byId.get(`serving/${key.replace(/[^a-z0-9]+/gu, '_')}`);
    for (const source of entry?.sources ?? []) {
      if (source.store !== 'serving' || source.authorityClass !== 'owner-approved-prose' || source.nativeKey !== key) continue;
      const path = fileURLToPath(new URL(source.path, root));
      if (verification.sourceSha256(path) !== source.sourceSha256) throw Error('APPROVED_PERSONAL_WRITING_SOURCE_DRIFT');
      const document = JSON.parse(readFileSync(path, 'utf8'));
      const row = document[source.locator.collection]?.[source.locator.index];
      if (row?.contentKey !== key) throw Error('APPROVED_PERSONAL_WRITING_SOURCE_DRIFT');
      for (const field of ['body_you', 'body_they']) {
        if (!row[field]) continue;
        const approval = row[`${field}_revision`] ?? row[`${field}_approval`];
        const status = row[`${field}_review_status`] ?? row.review_status;
        if (status !== 'approved' || !approval?.recordPath || !approval.payloadSha256
          || approval.approvalLevel === 'owner_signoff_untraced') {
          excluded.push({ contentKey: key, field, source: source.path, reason: 'exact-approval-unverified' }); continue;
        }
        const textSha256 = digest(row[field]);
        if (approval.payloadSha256 !== textSha256) throw Error('APPROVED_PERSONAL_WRITING_APPROVAL_DRIFT');
        add({ contentKey: key, field, text: row[field], textSha256, source: source.path,
          sourceSha256: source.sourceSha256, approval: { ...approval, textSha256 },
          ownerApproved: true, status: 'current' }, key === contentKey ? 'exact-contact' : 'aspect-family');
      }
    }
  }
  sources.sort((a, b) => Number(a.match !== 'exact-contact') - Number(b.match !== 'exact-contact') || a.id.localeCompare(b.id));
  const body = { version: 'personal-transit-approved-writing-v1', contentKey, searchedKeys: keys, sources, excluded };
  return { ...body, sha256: digest(body) };
}

export function assertApprovedWritingComparison(comparison, packet) {
  if (!comparison || comparison.sourcePacketSha256 !== packet.sha256 || !Array.isArray(comparison.entries)
    || comparison.entries.length !== packet.sources.length || new Set(comparison.entries.map(e => e.sourceId)).size !== packet.sources.length
    || comparison.entries.some(e => !packet.sources.some(s => s.id === e.sourceId)
      || !['consistent', 'different-supported-focus', 'qualified-by-current-correction'].includes(e.relationship)
      || typeof e.rationale !== 'string' || !e.rationale.trim()
      || (e.relationship === 'qualified-by-current-correction' && (!Array.isArray(e.correctionSources)
        || !e.correctionSources.length || e.correctionSources.some(s => typeof s !== 'string' || !s.trim())))))
    throw Error('APPROVED_PERSONAL_WRITING_COMPARISON_REQUIRED');
}
