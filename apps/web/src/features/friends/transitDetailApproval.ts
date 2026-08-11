export const EXACT_OWNER_APPROVAL_LEVEL = "exact_owner_approved";

export type TransitDetailSection = {
  sourceKeys?: string[];
};

export type ApprovalLevelLookup = (contentKey: string) => string | null;

export function isExactOwnerApprovedTransitContent(
  contentKey: string | null | undefined,
  approvalLevelForContentKey: ApprovalLevelLookup
) {
  return Boolean(
    contentKey
    && approvalLevelForContentKey(contentKey) === EXACT_OWNER_APPROVAL_LEVEL
  );
}

export function exactOwnerApprovedTransitSections<Section extends TransitDetailSection>(
  sections: Section[],
  approvalLevelForContentKey: ApprovalLevelLookup
) {
  return sections.filter((section) => (
    Boolean(section.sourceKeys?.length)
    && section.sourceKeys?.every((contentKey) => (
      isExactOwnerApprovedTransitContent(contentKey, approvalLevelForContentKey)
    ))
  ));
}

export function exactOwnerApprovedTransitBody(
  body: string | null | undefined,
  contentKey: string | null | undefined,
  approvalLevelForContentKey: ApprovalLevelLookup
) {
  return body && isExactOwnerApprovedTransitContent(contentKey, approvalLevelForContentKey)
    ? [body]
    : [];
}
