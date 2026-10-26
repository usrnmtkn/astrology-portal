import type { AdminDraft, AdminGeneratedContentRow } from './GeneratedContentAdminDashboard';
import { contentStudioCopyChanges } from './contentStudioCopyRecovery';
export { recoverContentStudioCopy } from './contentStudioCopyRecovery';

/** A publication acknowledges its submitted row, not text entered while it was pending. */
export function retainPendingPublicationCopy(submitted: AdminDraft, current: AdminDraft | null, published: AdminDraft, directCopy = false) {
  if (!current || current.contentKey !== published.contentKey) return current;
  const result = { ...published };
  for (const field of ['headline', 'summary', 'body', 'reviewerNotes'] as const) {
    if (current[field] !== submitted[field]) result[field] = current[field];
  }
  const sections = contentStudioCopyChanges(submitted.sections ?? {}, current.sections ?? {});
  delete sections.packageRecord;
  delete sections.packageDraft;
  if (published.sections?.packageRecord) {
    const before = (submitted.sections?.packageDraft ?? submitted.sections?.packageRecord ?? {}) as Record<string, unknown>;
    const after = (current.sections?.packageDraft ?? current.sections?.packageRecord ?? {}) as Record<string, unknown>;
    const changes = contentStudioCopyChanges(before, after);
    if (Object.keys(changes).length) {
      const record = { ...published.sections.packageRecord as object, ...changes };
      sections[directCopy ? 'packageRecord' : 'packageDraft'] = record;
      if (directCopy) Object.assign(sections, { body_you: record.body_you ?? null, body_they: record.body_they ?? null });
    }
  }
  if (Object.keys(sections).length) result.sections = { ...published.sections, ...sections };
  return result;
}

/** Validate the published edition before replacing the editor's saved source. */
export function assertPublishedRevision(
  saved: AdminGeneratedContentRow,
  published: AdminGeneratedContentRow,
  action: 'approve-package-revision' | 'publish-standalone-article-revision',
  hasPackageProposal: boolean
) {
  if (action === 'publish-standalone-article-revision') {
    if (published.id !== saved.source_snapshot?.targetRowId || published.content_key !== saved.content_key
      || published.status !== 'LIVE'
      || (['headline', 'summary', 'body'] as const).some(field => published[field] !== saved[field])) {
      throw new Error('Article publication was not confirmed. Check its current status.');
    }
  } else {
    if (published.content_key !== saved.content_key) throw new Error('The saved publication identity did not match this source. Reload its status.');
    if (hasPackageProposal) throw new Error('The API returned an unpublished revision. Your revision is saved; check publication status before publishing again.');
  }
}
