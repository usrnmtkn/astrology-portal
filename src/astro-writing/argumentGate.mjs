import crypto from "node:crypto";

export const ARGUMENT_OUTLINE_VERSION = "argument-outline-v3-sky-placement-spine-2026-08-14";

export const ARGUMENT_OUTLINE_CORE_FIELDS = Object.freeze([
  "thesis",
  "cultural_rule",
  "transit_job",
  "failure_mechanism",
  "lived_scene_1",
  "lived_scene_2",
  "lived_scene_3",
  "strategy",
  "intended_close",
  "scope_guard"
]);

export const ARGUMENT_OUTLINE_SPINE_QUALITY_FIELDS = Object.freeze([
  "planet_quality_intent",
  "condition_quality_intent",
  "handoff_quality_intent",
  "thesis_quality_intent",
  "lived_evidence_quality_intent",
  "failure_mechanism_quality_intent",
  "strategy_quality_intent",
  "close_quality_intent"
]);

export const ARGUMENT_OUTLINE_SLOW_MOVER_QUALITY_FIELDS = Object.freeze([
  "era_frame_quality_intent",
  "recurrence_quality_intent",
  "older_analogs_quality_intent",
  "collective_lesson_quality_intent"
]);

export const ARGUMENT_OUTLINE_FIELDS = Object.freeze([
  ...ARGUMENT_OUTLINE_CORE_FIELDS,
  ...ARGUMENT_OUTLINE_SPINE_QUALITY_FIELDS
]);

export function argumentOutlineFieldsForFamily(family) {
  return Object.freeze([
    ...ARGUMENT_OUTLINE_CORE_FIELDS,
    ...ARGUMENT_OUTLINE_SPINE_QUALITY_FIELDS,
    ...(family === "slow-mover-article" ? ARGUMENT_OUTLINE_SLOW_MOVER_QUALITY_FIELDS : [])
  ]);
}

function requiredLine(value, field) {
  const line = String(value ?? "").trim();
  if (!line) throw new Error(`Argument outline requires ${field}.`);
  if (/\n/u.test(line)) throw new Error(`Argument outline ${field} must be one line.`);
  return line;
}

function stablePayload(outline) {
  const fields = argumentOutlineFieldsForFamily(outline.family);
  return JSON.stringify({
    version: outline.version,
    family: outline.family,
    surface: outline.surface,
    meaningPlanHash: outline.meaningPlanHash,
    ...Object.fromEntries(fields.map((field) => [field, outline[field]]))
  });
}

function meaningPlanHash(plan) {
  return crypto.createHash("sha256").update(JSON.stringify(plan)).digest("hex");
}

export function argumentOutlineHash(outline) {
  return crypto.createHash("sha256").update(stablePayload(outline)).digest("hex");
}

export function buildArgumentOutline(input, { plan, family, surface } = {}) {
  if (!plan) throw new Error("Argument outline requires a governed meaning plan.");
  const fields = argumentOutlineFieldsForFamily(family);
  const outline = Object.fromEntries(fields.map((field) => [field, requiredLine(input?.[field], field)]));
  const value = {
    version: ARGUMENT_OUTLINE_VERSION,
    status: "owner-review-pending",
    ownerApproved: false,
    family: String(family ?? "").trim(),
    surface: String(surface ?? "").trim(),
    meaningPlanObject: plan.object,
    meaningPlanSign: plan.sign,
    meaningPlanHash: meaningPlanHash(plan),
    ...outline
  };
  return Object.freeze({ ...value, outlineHash: argumentOutlineHash(value) });
}

export function approveArgumentOutline(outline, { exactOwnerRuling } = {}) {
  if (outline?.status !== "owner-review-pending" || outline?.ownerApproved !== false) {
    throw new Error("Only an owner-review-pending argument outline may be approved.");
  }
  const ruling = String(exactOwnerRuling ?? "").trim();
  if (!ruling) throw new Error("Argument approval requires the owner's exact ruling.");
  const expectedHash = argumentOutlineHash(outline);
  if (outline.outlineHash !== expectedHash) throw new Error("ARGUMENT_OUTLINE_DRIFT");
  return Object.freeze({
    ...outline,
    status: "owner-approved",
    ownerApproved: true,
    exactOwnerRuling: ruling,
    approvedOutlineHash: expectedHash
  });
}

export function assertArgumentOutlineApproved(outline, { plan, family, surface } = {}) {
  if (outline?.status !== "owner-approved" || outline?.ownerApproved !== true) {
    throw new Error("OWNER_APPROVED_ARGUMENT_OUTLINE_REQUIRED");
  }
  if (outline.approvedOutlineHash !== argumentOutlineHash(outline)) throw new Error("ARGUMENT_OUTLINE_DRIFT");
  if (plan && (outline.meaningPlanObject !== plan.object || outline.meaningPlanSign !== plan.sign)) {
    throw new Error("ARGUMENT_OUTLINE_MEANING_PLAN_MISMATCH");
  }
  if (plan && outline.meaningPlanHash !== meaningPlanHash(plan)) throw new Error("ARGUMENT_OUTLINE_MEANING_PLAN_DRIFT");
  if (family && outline.family !== family) throw new Error("ARGUMENT_OUTLINE_FAMILY_MISMATCH");
  if (surface && outline.surface !== surface) throw new Error("ARGUMENT_OUTLINE_SURFACE_MISMATCH");
  return true;
}
