import crypto from "node:crypto";

export const SKY_COMPONENT_APPROVAL_STATUS = "OWNER APPROVED";
export const SKY_COMPONENT_APPROVAL_DATE = "2026-08-16";
export const SKY_COMPONENT_APPROVAL_LEVEL = "exact_owner_approved";
export const SKY_COMPONENT_APPROVAL_RECORD_PATH = "packages/astro-knowledge/review/sky-calendar-meaning-components-v1/exact-approval.json";
export const SKY_COMPONENT_APPROVAL_SOURCE = Object.freeze({
  tool: "Codex Desktop",
  threadId: "019fc997-4b31-79f2-9a53-b363197a6ee2",
  threadTitle: "WIP: Aspects",
  turnId: "01a00da7-a458-7c12-ae4b-76e0675afb0b",
  date: "2026-08-16",
  statement: "I approve the 174 Sky Calendar meaning components in PR #249. Hash-pin the approved set and stand by for merge.",
});

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function canonicalJson(value) {
  if (Array.isArray(value)) return value.map(canonicalJson);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalJson(value[key])]));
  }
  return value;
}

export function componentApprovalPayload(unit) {
  const realizations = {
    supportive_realizations: unit.supportive_realizations,
    neutral_realizations: unit.neutral_realizations,
    shadow_realizations: unit.shadow_realizations,
  };
  if (unit.key.startsWith("sky-sign/")) {
    return {
      key: unit.key,
      planet_function: unit.planet_function,
      sign_expression: unit.sign_expression,
      combined_position: unit.combined_position,
      ...realizations,
      details_language: unit.details_language,
    };
  }
  return {
    key: unit.key,
    reader_effect: unit.reader_effect,
    conflict_behavior: unit.conflict_behavior,
    movement_bias: unit.movement_bias,
    ...realizations,
  };
}

export function componentPayloadSha256(unit) {
  return sha256(JSON.stringify(canonicalJson(componentApprovalPayload(unit))));
}

export function componentSetEntries(units) {
  return [...units]
    .map((unit) => ({ key: unit.key, payloadSha256: componentPayloadSha256(unit) }))
    .sort((left, right) => left.key.localeCompare(right.key));
}

export function componentSetSha256(units) {
  return sha256(JSON.stringify(componentSetEntries(units)));
}

export function exactApprovalMetadataFor(unit) {
  return {
    approvalLevel: SKY_COMPONENT_APPROVAL_LEVEL,
    recordPath: SKY_COMPONENT_APPROVAL_RECORD_PATH,
    payloadSha256: componentPayloadSha256(unit),
    approvedAt: SKY_COMPONENT_APPROVAL_DATE,
  };
}

export function assertExactComponentApproval(unit) {
  if (unit.owner_review_status !== SKY_COMPONENT_APPROVAL_STATUS) {
    throw new Error(`${unit.key}: component approval is incomplete`);
  }
  const expected = exactApprovalMetadataFor(unit);
  if (JSON.stringify(unit.approval) !== JSON.stringify(expected)) {
    throw new Error(`${unit.key}: component approval hash or metadata is invalid`);
  }
}
