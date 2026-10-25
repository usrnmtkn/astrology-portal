import type { AdminGeneratedContentRow } from './GeneratedContentAdminDashboard';

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
