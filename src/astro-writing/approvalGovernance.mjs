export const APPROVAL_STATUSES = Object.freeze([
  "generated",
  "pipeline-review-passed",
  "owner-review-pending",
  "owner-approved",
  "owner-locked"
]);

export const RENDERED_SAMPLE_STATUSES = Object.freeze([
  "not-rendered",
  "owner-review-pending",
  "owner-approved"
]);

export function generatedApprovalState() {
  return {
    approvalStatus: "generated",
    approvalHistory: ["generated"],
    ownerApproved: false,
    ownerLocked: false,
    renderedSampleStatus: "not-rendered",
    renderedSampleOwnerApproved: false,
    batchGenerationAuthorized: false,
    servingAuthorized: false
  };
}

export function markPipelineReady(state) {
  if (state?.approvalStatus !== "generated") throw new Error("Only generated copy can enter pipeline review.");
  return {
    ...state,
    approvalStatus: "owner-review-pending",
    approvalHistory: [...state.approvalHistory, "pipeline-review-passed", "owner-review-pending"],
    ownerApproved: false,
    ownerLocked: false,
    renderedSampleStatus: state.renderedSampleStatus ?? "not-rendered",
    renderedSampleOwnerApproved: false,
    batchGenerationAuthorized: false,
    servingAuthorized: false
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
    exactOwnerRuling: exactOwnerRuling.trim(),
    renderedSampleStatus: state?.renderedSampleStatus ?? "not-rendered",
    renderedSampleOwnerApproved: false,
    batchGenerationAuthorized: false,
    servingAuthorized: false
  };
}

export function stageRenderedSample(state, { sampleId, surface }) {
  if (!state?.ownerApproved || !new Set(["owner-approved", "owner-locked"]).has(state.approvalStatus)) {
    throw new Error("A rendered sample may be staged only after explicit document-level owner approval.");
  }
  if (typeof sampleId !== "string" || !sampleId.trim() || typeof surface !== "string" || !surface.trim()) {
    throw new Error("A rendered sample requires a stable sampleId and product surface.");
  }
  return {
    ...state,
    renderedSampleStatus: "owner-review-pending",
    renderedSampleOwnerApproved: false,
    renderedSampleId: sampleId.trim(),
    renderedSampleSurface: surface.trim(),
    batchGenerationAuthorized: false,
    servingAuthorized: false
  };
}

export function applyRenderedSampleApproval(state, { sampleId, exactOwnerRuling }) {
  if (state?.renderedSampleStatus !== "owner-review-pending") {
    throw new Error("Only a staged rendered sample can receive owner approval.");
  }
  if (sampleId !== state.renderedSampleId) throw new Error("Rendered-sample approval must match the staged sample ID.");
  if (typeof exactOwnerRuling !== "string" || !exactOwnerRuling.trim()) {
    throw new Error("Rendered-sample approval requires an explicit owner ruling.");
  }
  return {
    ...state,
    renderedSampleStatus: "owner-approved",
    renderedSampleOwnerApproved: true,
    renderedSampleExactOwnerRuling: exactOwnerRuling.trim(),
    batchGenerationAuthorized: true,
    servingAuthorized: true
  };
}

export function assertBatchGenerationAuthorized(state) {
  if (!state?.ownerApproved || state?.renderedSampleStatus !== "owner-approved" || !state?.batchGenerationAuthorized) {
    throw new Error("RENDERED_SAMPLE_OWNER_APPROVAL_REQUIRED_FOR_BATCH_GENERATION");
  }
  return true;
}

export function assertServingAuthorized(state) {
  if (!state?.ownerApproved || state?.renderedSampleStatus !== "owner-approved" || !state?.servingAuthorized) {
    throw new Error("RENDERED_SAMPLE_OWNER_APPROVAL_REQUIRED_FOR_SERVING");
  }
  return true;
}
