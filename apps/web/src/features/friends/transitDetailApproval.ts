import { isFriendsAcceptedApprovalLevel } from "../../content/fallbackApproval";

export type TransitDetailSection = {
  sourceKeys?: string[];
};

export type ApprovalLevelLookup = (contentKey: string) => string | null;

export function isAcceptedOwnerApprovedTransitContent(
  contentKey: string | null | undefined,
  approvalLevelForContentKey: ApprovalLevelLookup
) {
  return Boolean(
    contentKey
    && isFriendsAcceptedApprovalLevel(approvalLevelForContentKey(contentKey))
  );
}

export function acceptedOwnerApprovedTransitSections<Section extends TransitDetailSection>(
  sections: Section[],
  approvalLevelForContentKey: ApprovalLevelLookup
) {
  return sections.filter((section) => {
    const approvalLevels = (section.sourceKeys ?? [])
      .map(approvalLevelForContentKey)
      .filter((level): level is string => level !== null);

    return approvalLevels.length > 0
      && approvalLevels.every(isFriendsAcceptedApprovalLevel);
  });
}

export function acceptedOwnerApprovedTransitBody(
  body: string | null | undefined,
  contentKey: string | null | undefined,
  approvalLevelForContentKey: ApprovalLevelLookup
) {
  return body && isAcceptedOwnerApprovedTransitContent(contentKey, approvalLevelForContentKey)
    ? [body]
    : [];
}
