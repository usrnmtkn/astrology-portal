export const APPROVAL_STATUSES = Object.freeze([
  "generated",
  "pipeline-review-passed",
  "owner-review-pending",
  "owner-approved",
  "owner-locked"
]);

export function generatedApprovalState() {
  return {
    approvalStatus: "generated",
    approvalHistory: ["generated"],
    ownerApproved: false,
    ownerLocked: false
  };
}

export function markPipelineReady(state) {
  if (state?.approvalStatus !== "generated") throw new Error("Only generated copy can enter pipeline review.");
  return {
    ...state,
    approvalStatus: "owner-review-pending",
    approvalHistory: [...state.approvalHistory, "pipeline-review-passed", "owner-review-pending"],
    ownerApproved: false,
    ownerLocked: false
  };
}

export function applyOwnerApproval(state, { status, exactOwnerRuling }) {
  if (!new Set(["owner-approved", "owner-locked"]).has(status)) throw new Error("Owner approval status must be owner-approved or owner-locked.");
  if (typeof exactOwnerRuling !== "string" || !exactOwnerRuling.trim()) {
    throw new Error("Only an explicit exact-wording owner ruling may grant owner approval.");
  }
  return {
    ...state,
    approvalStatus: status,
    approvalHistory: [...(state?.approvalHistory ?? []), status],
    ownerApproved: true,
    ownerLocked: status === "owner-locked",
    exactOwnerRuling: exactOwnerRuling.trim()
  };
}
