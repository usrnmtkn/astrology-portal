export const EXACT_OWNER_APPROVAL_LEVEL = "exact_owner_approved";
export const OWNER_SIGNOFF_UNTRACED_APPROVAL_LEVEL = "owner_signoff_untraced";
export const UNGATED_APPROVAL_LEVEL = "ungated";

export const FRIENDS_ACCEPTED_APPROVAL_LEVELS = new Set([
  EXACT_OWNER_APPROVAL_LEVEL,
  OWNER_SIGNOFF_UNTRACED_APPROVAL_LEVEL
]);

export function isFriendsAcceptedApprovalLevel(level: string | null | undefined) {
  return Boolean(level && FRIENDS_ACCEPTED_APPROVAL_LEVELS.has(level));
}
