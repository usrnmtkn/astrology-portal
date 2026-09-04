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

export const BOUNDED_OWNER_BATCH_AUTHORIZATION_TYPE = "bounded_contextual_owner_batch_authorization";

const BATCH_CAPABILITIES = new Set(["batch_generation", "serving"]);
const OWNER_EVIDENCE_PATH_PREFIXES = [
  "packages/astro-knowledge/review/",
  "data/writing/"
];
const SHA256_RE = /^[a-f0-9]{64}$/u;

function nonEmptyString(value) {
  return typeof value === "string" && Boolean(value.trim());
}

function validOwnerEvidencePath(value) {
  return nonEmptyString(value)
    && OWNER_EVIDENCE_PATH_PREFIXES.some((prefix) => value.startsWith(prefix));
}

function normalizeCapabilities(capabilities) {
  if (!Array.isArray(capabilities) || capabilities.length === 0) {
    throw new Error("Bounded owner batch authorization requires explicit capabilities.");
  }
  const normalized = [...new Set(capabilities)];
  if (normalized.some((capability) => !BATCH_CAPABILITIES.has(capability))) {
    throw new Error("Bounded owner batch authorization contains an unsupported capability.");
  }
  if (normalized.includes("serving") && !normalized.includes("batch_generation")) {
    throw new Error("Serving authorization must also explicitly authorize batch generation.");
  }
  return normalized;
}

function validatedBoundedBatchAuthorization(authorization, { contentKey, field, payloadSha256, surface }) {
  if (!authorization || authorization.type !== BOUNDED_OWNER_BATCH_AUTHORIZATION_TYPE) {
    throw new Error("Bounded owner batch authorization requires the canonical authorization type.");
  }
  if (authorization.authority !== "owner" || authorization.decision !== "approve") {
    throw new Error("Only an owner-originating approve decision may authorize a batch member.");
  }
  if (!nonEmptyString(authorization.ownerStatement)) {
    throw new Error("Bounded owner batch authorization requires the owner's exact statement.");
  }
  if (!nonEmptyString(authorization.batchId) || authorization.batchId.includes("*")) {
    throw new Error("Bounded owner batch authorization requires a stable non-wildcard batchId.");
  }
  if (!validOwnerEvidencePath(authorization.evidenceRecordPath)) {
    throw new Error("Bounded owner batch authorization requires a governed evidence record path.");
  }
  if (!nonEmptyString(surface) || authorization.surface !== surface) {
    throw new Error("Bounded owner batch authorization surface does not match the promoted member.");
  }
  if (!nonEmptyString(field) || authorization.approvedField !== field) {
    throw new Error("Bounded owner batch authorization field does not match the promoted member.");
  }
  if (!nonEmptyString(contentKey) || contentKey.includes("*")) {
    throw new Error("Bounded owner batch authorization requires an exact non-wildcard contentKey.");
  }
  if (!SHA256_RE.test(payloadSha256 ?? "")) {
    throw new Error("Bounded owner batch authorization requires the exact member payload SHA-256.");
  }
  if (!Array.isArray(authorization.members) || authorization.members.length === 0) {
    throw new Error("Bounded owner batch authorization requires explicit batch membership.");
  }

  const seen = new Set();
  for (const member of authorization.members) {
    if (!nonEmptyString(member?.contentKey) || member.contentKey.includes("*")) {
      throw new Error("Bounded owner batch authorization members must use exact non-wildcard content keys.");
    }
    if (seen.has(member.contentKey)) {
      throw new Error("Bounded owner batch authorization contains a duplicate member.");
    }
    seen.add(member.contentKey);
    if (!SHA256_RE.test(member?.payloadSha256 ?? "")) {
      throw new Error("Every bounded owner batch authorization member requires a payload SHA-256.");
    }
  }

  const member = authorization.members.find((candidate) => candidate.contentKey === contentKey);
  if (!member) throw new Error("OWNER_BATCH_MEMBER_NOT_AUTHORIZED");
  if (member.payloadSha256 !== payloadSha256) throw new Error("OWNER_BATCH_MEMBER_PAYLOAD_HASH_MISMATCH");

  return {
    type: BOUNDED_OWNER_BATCH_AUTHORIZATION_TYPE,
    authority: "owner",
    decision: "approve",
    batchId: authorization.batchId.trim(),
    evidenceRecordPath: authorization.evidenceRecordPath,
    ownerStatement: authorization.ownerStatement.trim(),
    surface,
    approvedField: field,
    contentKey,
    payloadSha256,
    capabilities: normalizeCapabilities(authorization.capabilities)
  };
}

export function generatedApprovalState() {
  return {
    approvalStatus: "generated",
    approvalHistory: ["generated"],
    ownerApproved: false,
    ownerLocked: false,
    renderedSampleStatus: "not-rendered",
    renderedSampleOwnerApproved: false,
    boundedOwnerBatchAuthorized: false,
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
    boundedOwnerBatchAuthorized: false,
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
    boundedOwnerBatchAuthorized: false,
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
    boundedOwnerBatchAuthorized: false,
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
    boundedOwnerBatchAuthorized: false,
    renderedSampleExactOwnerRuling: exactOwnerRuling.trim(),
    batchGenerationAuthorized: true,
    servingAuthorized: true
  };
}

export function applyBoundedOwnerBatchAuthorization(state, {
  authorization,
  contentKey,
  field,
  payloadSha256,
  surface
}) {
  if (state?.approvalStatus !== "owner-review-pending" || state?.ownerApproved) {
    throw new Error("Bounded owner batch authorization applies only at the owner-review-pending gate.");
  }
  const validated = validatedBoundedBatchAuthorization(authorization, {
    contentKey,
    field,
    payloadSha256,
    surface
  });
  const batchGenerationAuthorized = validated.capabilities.includes("batch_generation");
  const servingAuthorized = validated.capabilities.includes("serving");
  return {
    ...state,
    approvalStatus: "owner-approved",
    approvalHistory: [...(state.approvalHistory ?? []), "owner-approved"],
    ownerApproved: true,
    ownerLocked: false,
    boundedOwnerBatchAuthorized: true,
    boundedOwnerBatchAuthorization: validated,
    renderedSampleStatus: state.renderedSampleStatus ?? "not-rendered",
    renderedSampleOwnerApproved: false,
    batchGenerationAuthorized,
    servingAuthorized
  };
}

export function assertBatchGenerationAuthorized(state) {
  const renderedSamplePath = state?.renderedSampleStatus === "owner-approved" && state?.renderedSampleOwnerApproved;
  const boundedBatchPath = state?.boundedOwnerBatchAuthorized === true
    && state?.boundedOwnerBatchAuthorization?.capabilities?.includes("batch_generation");
  if (!state?.ownerApproved || (!renderedSamplePath && !boundedBatchPath) || !state?.batchGenerationAuthorized) {
    throw new Error("OWNER_APPROVAL_REQUIRED_FOR_BATCH_GENERATION");
  }
  return true;
}

export function assertServingAuthorized(state) {
  const renderedSamplePath = state?.renderedSampleStatus === "owner-approved" && state?.renderedSampleOwnerApproved;
  const boundedBatchPath = state?.boundedOwnerBatchAuthorized === true
    && state?.boundedOwnerBatchAuthorization?.capabilities?.includes("serving");
  if (!state?.ownerApproved || (!renderedSamplePath && !boundedBatchPath) || !state?.servingAuthorized) {
    throw new Error("OWNER_APPROVAL_REQUIRED_FOR_SERVING");
  }
  return true;
}
