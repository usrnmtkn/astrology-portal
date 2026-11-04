import type { AdminDraft, AdminGeneratedContentRow } from './GeneratedContentAdminDashboard';
import { separateArticleHoroscopeRow } from '../../web/src/content/skyArticleHoroscopes.mjs';

function ordered(_key: string, value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
  const record = value as Record<string, unknown>;
  // Distinct Unicode keys must not compare equal under locale collation.
  return Object.fromEntries(Object.keys(record).sort().map(key => [key, record[key]]));
}
function sameContent(left: unknown, right: unknown) {
  return JSON.stringify(left, ordered) === JSON.stringify(right, ordered);
}

/** Keep the submitted body for server provenance; send its complete section fields. */
export function normalizedArticleTemplateDraft(draft: AdminDraft): AdminDraft {
  const normalized = separateArticleHoroscopeRow({ content_key: draft.contentKey,
    body: draft.body, sections: draft.sections ?? {} });
  return { ...draft, body: normalized.body, sections: normalized.sections };
}

export function articleTemplateCopyMatches(expected: AdminDraft, saved: AdminGeneratedContentRow) {
  return saved.body === expected.body && sameContent(saved.sections ?? {}, expected.sections ?? {});
}

/** Acknowledged provenance advances only when no newer metadata was entered. */
export function retainArticleTemplatePendingSource(submitted: AdminDraft, current: AdminDraft, saved: AdminDraft) {
  return sameContent(current.sourceSnapshot, submitted.sourceSnapshot)
    ? { ...current, sourceSnapshot: saved.sourceSnapshot }
    : current;
}

export default {
  normalize: normalizedArticleTemplateDraft,
  matches: articleTemplateCopyMatches,
  retain: retainArticleTemplatePendingSource
};
