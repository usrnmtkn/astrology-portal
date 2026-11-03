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

/** Exact publication proof for every Studio-authored package revision. */
export function stampStudioPackageOwnerApproval(row: Record<string, any>, ownerPublication: boolean, approvedAt: string) {
  if (!ownerPublication || row.status !== 'LIVE' || row.lane !== 'serving' || row.review_state
    || row.sections?.packageRecord?.review_status !== 'approved') return false;
  // Match content_studio_sync_package_copy_mirrors before signing the row.
  // PostgreSQL's declared editable field wins over legacy casing aliases.
  const record = row.sections.packageRecord;
  if (!row.sections.packageDraft || typeof row.sections.packageDraft !== 'object' || Array.isArray(row.sections.packageDraft)) {
    const definitions = {
      headline: { tails: ['headline', 'title'], aliases: ['headline', 'Headline', 'title', 'Title'] },
      summary: { tails: ['summary', 'tldr'], aliases: ['summary', 'Summary', 'tldr', 'TLDR'] },
      body: { tails: ['bodyyou', 'body', 'text'], aliases: ['body_you', 'body', 'Body', 'text'] }
    };
    for (const [field, definition] of Object.entries(definitions)) {
      let value: unknown;
      for (const editable of Array.isArray(record.studio_editable_fields) ? record.studio_editable_fields : []) {
        const path = typeof editable?.path === 'string' ? editable.path.trim() : '';
        if (!definition.tails.includes(path.split('.').at(-1)?.toLowerCase().replace(/[_-]/gu, '') ?? '')) continue;
        const candidate = path.split('.').reduce((parent: any, key: string) => parent?.[key], record);
        if (typeof candidate === 'string') { value = candidate; break; }
      }
      if (value === undefined) value = definition.aliases.map(alias => record[alias]).find(candidate => typeof candidate === 'string');
      if (typeof value === 'string') row[field] = value;
    }
  }
  row.source_snapshot = { ...row.source_snapshot, studioOwnerApproval: studioOwnerApproval(row, approvedAt) };
  return true;
}
