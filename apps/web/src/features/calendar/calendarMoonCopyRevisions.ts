import revisions from './calendarMoonCopyRevisions.json' with { type: 'json' };

/** Exact rejected bodies only: a subsequent Studio edit always takes precedence. */
export function isRejectedCalendarMoonCopy(contentKey: string, body?: string | null) {
  const revision = revisions.find(row => row.contentKey === contentKey);
  return Boolean(revision && body?.trim() === revision.originalBody.trim());
}

export function calendarMoonCopyRevision(contentKey: string) {
  return revisions.find(row => row.contentKey === contentKey);
}
