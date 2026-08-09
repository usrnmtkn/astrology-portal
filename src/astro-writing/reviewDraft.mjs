import {
  canonicalAstrologyReviewInstructions,
  HARD_REVISE_FIELDS,
  REVIEW_FIELDS
} from "./canonicalInstructions.mjs";
import { validateCopy } from "./validateCopy.mjs";

export const REVIEW_SCHEMA = Object.freeze({
  type: "object",
  additionalProperties: false,
  required: [...REVIEW_FIELDS, "decision", "violations", "required_revisions"],
  properties: Object.fromEntries([
    ...REVIEW_FIELDS.map((field) => [field, { type: "string", enum: ["PASS", "REVISE"] }]),
    ["decision", { type: "string", enum: ["PASS", "REVISE"] }],
    ["violations", { type: "array", items: { type: "string" } }],
    ["required_revisions", {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["field", "instruction"],
        properties: { field: { type: "string" }, instruction: { type: "string" } }
      }
    }]
  ])
});

function deterministicReview({ draft, plan, context, family, register, expectedPlaceholders, requiredFields, protectedOwnerLines }) {
  const lint = validateCopy(draft, {
    family, register, plan, expectedPlaceholders, requiredFields, protectedOwnerLines,
    ownerCorrections: context?.corrections ?? []
  });
  const failed = new Set(lint.violations.map((item) => item.category));
  const result = Object.fromEntries(REVIEW_FIELDS.map((field) => [field, failed.has(field) ? "REVISE" : "PASS"]));
  for (const violation of lint.violations) {
    if (violation.category === "required_fields" || violation.category === "placeholder_integrity" || violation.category === "owner_line_integrity") {
      result.literal_first_read_clarity = "REVISE";
    }
    if (["compressed_prose", "vagueness", "natural_language"].includes(violation.category)) result.literal_first_read_clarity = "REVISE";
    if (violation.category === "voice_match") result.voice_match = "REVISE";
    if (violation.category === "metaphor_requires_translation") result.metaphor_requires_translation = "REVISE";
    if (violation.category === "invented_motive") result.invented_motive = "REVISE";
    if (violation.category === "sign_house_separation") result.sign_house_separation = "REVISE";
    if (violation.category === "register_consistency") result.register_consistency = "REVISE";
    if (violation.category === "stock_trope") result.stock_trope = "REVISE";
  }
  const decision = lint.passed && HARD_REVISE_FIELDS.every((field) => result[field] === "PASS") ? "PASS" : "REVISE";
  return {
    ...result,
    decision,
    violations: lint.violations.map((item) => `${item.category}: ${item.detail}`),
    required_revisions: lint.violations.map((item) => ({ field: "body", instruction: `${item.category}: ${item.detail}` }))
  };
}

export async function reviewDraft({
  draft,
  plan,
  context,
  family = "sky-placement",
  register = "collective",
  modelClient,
  expectedPlaceholders = [],
  requiredFields = ["tagline", "hook", "lived", "turn"],
  protectedOwnerLines = []
}) {
  const mechanical = deterministicReview({ draft, plan, context, family, register, expectedPlaceholders, requiredFields, protectedOwnerLines });
  if (!modelClient) return mechanical;
  const modelReview = await modelClient({
    stage: "review",
    instructions: canonicalAstrologyReviewInstructions,
    input: JSON.stringify({ plan, family, register, ownerContext: context, draft, mechanical }, null, 2),
    schema: REVIEW_SCHEMA
  });
  for (const field of REVIEW_FIELDS) {
    if (!new Set(["PASS", "REVISE"]).has(modelReview?.[field])) throw new Error(`Reviewer omitted ${field}.`);
  }
  const fieldFailure = REVIEW_FIELDS.some((field) => modelReview[field] === "REVISE");
  return {
    ...modelReview,
    decision: mechanical.decision === "REVISE" || fieldFailure || modelReview.decision === "REVISE" ? "REVISE" : "PASS",
    violations: [...new Set([...(mechanical.violations ?? []), ...(modelReview.violations ?? [])])],
    required_revisions: [...(mechanical.required_revisions ?? []), ...(modelReview.required_revisions ?? [])]
  };
}
