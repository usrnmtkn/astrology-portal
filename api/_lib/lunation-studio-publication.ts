import { createHash } from 'node:crypto';
import { isLunationHoroscopeKey } from '../../src/shared/lunationHoroscopeIdentity.js';
import { isLunationEclipseSectionKey, LUNATION_STUDIO_REVISION_SCHEMA } from '../../apps/web/src/content/fallbackArchitectureV3/resolver/lunationStudioRevision.mjs';

const hash = (text: string) => createHash('sha256').update(text).digest('hex');

export function isLunationCycleVariable(contentKey: string, slot: string) {
  const lunar = isLunationHoroscopeKey(contentKey) && contentKey.includes('/full-moon/')
    || isLunationEclipseSectionKey(contentKey) && !contentKey.includes('/solar/');
  return lunar && ['matchingNewMoonSign', 'matchingNewMoonDate'].includes(slot.replace(/[{}\s]/gu, ''));
}

/** Only the explicit owner revision-publication branch may call this function. */
export async function approveLunationStudioRevision(record: Record<string, any>, previous: Record<string, any>, approvedAt: string) {
  const key = String(record.contentKey ?? '');
  if (!isLunationHoroscopeKey(key) && !isLunationEclipseSectionKey(key)) return;
  const { servingPackageRecords } = await import('./serving-package-records.js');
  const baseline = servingPackageRecords.get(key);
  if (!baseline || record.content_role !== 'full_copy' || typeof record.body !== 'string' || !record.body.trim()) {
    throw new Error('Write the complete registered lunation passage before publishing.');
  }
  if (/\{\{(?!matchingNewMoon(?:Sign|Date)\}\})/u.test(record.body)) {
    throw new Error('Lunation passages support only the calculated matchingNewMoonSign and matchingNewMoonDate variables.');
  }
  if (/\{\{/u.test(record.body) && (key.includes('/new-moon/') || key.includes('/solar/'))) {
    throw new Error('Matching Full Moon cycle variables are unavailable in New Moon and solar eclipse passages.');
  }
  const bodySha256 = hash(record.body);
  Object.assign(record, {
    review_status: 'approved', promotion_authorized: true, studio_version_status: 'approved-serving-revision',
    studio_lunation_revision: {
      schema: LUNATION_STUDIO_REVISION_SCHEMA, contentKey: key, approvedAt,
      baselineBodySha256: hash(baseline.body), previousBodySha256: hash(String(previous.body ?? '')), bodySha256
    },
    // The new owner unit has its own integrity record. Historical book
    // transforms remain on packageOriginalRecord, not on the revised body.
    protected_content: { policy: 'byte-exact-owner-authored',
      body_sha256: bodySha256, char_count: record.body.length, word_count: record.body.trim().split(/\s+/u).length },
    approval: { approvalLevel: 'exact_owner_approved', action: 'content-studio-publish',
      recordPath: `studio:lunation/${encodeURIComponent(key)}#${bodySha256}`, approvedAt, payloadSha256: bodySha256 }
  });
}
