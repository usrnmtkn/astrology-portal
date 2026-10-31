export const LUNATION_STUDIO_REVISION_SCHEMA = 'content-studio-lunation-revision/v1';
const signs = ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'];
const sha256 = value => typeof value === 'string' && /^[a-f0-9]{64}$/u.test(value);

/** These are the 42 released component identities, never the held whole-card drafts. */
export function isLunationEclipseSectionKey(key) {
  if (/^authored\/lunation-eclipse-house-layer\/solar\/house-(?:[1-9]|1[0-2])$/u.test(key)) return true;
  if (/^authored\/lunation-eclipse-section\/shared\/lunar\/(?:nature|mechanics|recommendation|close|recommendation-endings|close-endings)$/u.test(key)) return true;
  const match = key.match(/^authored\/lunation-eclipse-section\/pisces\/rising-([a-z]+)\/house-([1-9]|1[0-2])\/(?:opening|evergreen-body)$/u);
  const rising = match ? signs.indexOf(match[1]) : -1;
  return rising >= 0 && Number(match[2]) === ((11 - rising + 12) % 12) + 1;
}

/** Receipts are issued only by the authenticated, version-checked owner publication action. */
export function isStudioLunationRevision(record) {
  const receipt = record?.studio_lunation_revision;
  const approval = record?.approval;
  return record?.content_role === 'full_copy'
    && record.studio_version_status === 'approved-serving-revision'
    && record.review_status === 'approved' && record.promotion_authorized === true
    && receipt?.schema === LUNATION_STUDIO_REVISION_SCHEMA
    && receipt.contentKey === record.contentKey
    && typeof receipt.approvedAt === 'string' && Number.isFinite(Date.parse(receipt.approvedAt))
    && sha256(receipt.baselineBodySha256) && sha256(receipt.previousBodySha256)
    && sha256(receipt.bodySha256) && receipt.bodySha256 === record.protected_content?.body_sha256
    && approval?.approvalLevel === 'exact_owner_approved'
    && approval.action === 'content-studio-publish'
    && approval.payloadSha256 === receipt.bodySha256
    && approval.approvedAt === receipt.approvedAt
    && approval.recordPath === `studio:lunation/${encodeURIComponent(record.contentKey)}#${receipt.bodySha256}`;
}

/** A separately approved eclipse unit stays pinned to its original book version. */
export function isPinnedLunationBookRevision(section, book, bookHash, sectionHash) {
  return isStudioLunationRevision(book)
    && bookHash === book.studio_lunation_revision.bodySha256
    && section.protected_content?.source_body_sha256 === book.studio_lunation_revision.baselineBodySha256
    && section.protected_content?.preservedBookRemainderSha256 === sectionHash;
}
