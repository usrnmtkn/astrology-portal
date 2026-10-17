import { createHash } from 'node:crypto';

function canonical(value: any): any {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
  return value;
}
function copyHash(row: Record<string, any>) {
  return createHash('sha256').update(JSON.stringify(canonical([row.content_key, row.headline ?? '', row.summary ?? '', row.body ?? '', row.sections ?? {}]))).digest('hex');
}
export function studioOwnerApproval(row: Record<string, any>, approvedAt: string) {
  return { action: 'publish-owner-content', contentKey: row.content_key, approvedAt,
    savedVersion: row.updated_at, bodyHash: createHash('sha256').update(row.body ?? '').digest('hex'), copyHash: copyHash(row) };
}
export function hasExactStudioOwnerApproval(row: Record<string, any>) {
  const approval = row.source_snapshot?.studioOwnerApproval;
  return approval?.action === 'publish-owner-content' && approval.contentKey === row.content_key
    && approval.copyHash === copyHash(row)
    && approval.bodyHash === createHash('sha256').update(row.body ?? '').digest('hex');
}

/** Called only after the authenticated owner's final publication state is built. */
export function stampDailyOwnerApproval(row: Record<string, any>, ownerPublication: boolean, approvedAt: string) {
  if (!ownerPublication || !/^fallback-hook\/daily-(?:headline|body)\//u.test(row.content_key ?? '')
    || row.status !== 'LIVE' || row.lane !== 'serving' || row.review_state
    || row.sections?.packageRecord?.review_status !== 'approved') return false;
  row.source_snapshot = { ...row.source_snapshot, studioOwnerApproval: studioOwnerApproval(row, approvedAt) };
  return true;
}
