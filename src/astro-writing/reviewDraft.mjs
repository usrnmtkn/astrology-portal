import {
  canonicalAstrologyReviewInstructions,
  HARD_REVISE_FIELDS,
  REVIEW_FIELDS
} from "./canonicalInstructions.mjs";
import { validateCopy } from "./validateCopy.mjs";

const CHECK_RESULT_SCHEMA = Object.freeze({
  type: "object",
  additionalProperties: false,
  required: ["status", "reason"],
  properties: {
    status: { type: "string", enum: ["PASS", "FAIL"] },
    reason: { type: "string" }
  }
});

const VIOLATION_SCHEMA = Object.freeze({
  type: "object",
  additionalProperties: false,
  required: ["category", "severity", "location", "text", "reason", "revision_instruction"],
  properties: {
    category: { type: "string" },
    severity: { type: "string", enum: ["blocking", "nonblocking"] },
    location: { type: "string" },
    text: { type: "string" },
    reason: { type: "string" },
    revision_instruction: { type: "string" }
  }
});

export const REVIEW_SCHEMA = Object.freeze({
  type: "object",
  additionalProperties: false,
  required: [...REVIEW_FIELDS, "decision", "violations"],
  properties: Object.fromEntries([
    ...REVIEW_FIELDS.map((field) => [field, CHECK_RESULT_SCHEMA]),
    ["decision", { type: "string", enum: ["PASS", "REVISE"] }],
    ["violations", { type: "array", items: VIOLATION_SCHEMA }]
  ])
});

function copyText(copy) {
  if (typeof copy === "string") return copy;
  return Object.entries(copy ?? {})
    .filter(([, value]) => typeof value === "string")
    .map(([field, value]) => `${field}: ${value}`)
    .join("\n");
}

function locationFor(copy, category) {
  if (category === "tagline_stands_alone" && typeof copy?.tagline === "string") return "tagline";
  if (typeof copy === "string") return "body";
  return Object.keys(copy ?? {}).find((field) => typeof copy[field] === "string") ?? "body";
}

function valueAt(copy, location) {
  return typeof copy === "string" ? copy : String(copy?.[location] ?? "");
}

function semanticPatternFailures(copy) {
  const text = copyText(copy);
  const normalized = text.toLowerCase();
  const failures = [];
  const add = (category, reason, instruction, location = locationFor(copy, category)) => {
    failures.push({ category, reason, instruction, location, text: valueAt(copy, location) || text });
  };

  if (/\bdrain a well dry\b/iu.test(text)) {
    add("metaphor_requires_translation", "The well must be translated into a person being depleted.", "Name who keeps taking support and what happens when it runs out.");
  }
  if (/\b(?:worth stops negotiating|the bargain ends)\b/iu.test(text)) {
    add("tagline_stands_alone", "The compressed tagline does not identify the actual issue.", "State what treatment or condition stops being acceptable.", "tagline");
  }
  if (/\b(?:authentic self is your superpower|the universe rewards|embrace your uniqueness)\b/iu.test(text)) {
    add("generic_self_help", "The copy uses generic empowerment language instead of the placement mechanism.", "Replace the affirmation with a recognizable action and consequence.");
    add("observable_behavior", "No observable behavior demonstrates the placement.", "Name what someone does and what changes because of it.");
  }
  if (/\b(?:silenced voices|speak their power|collective liberation)\b/iu.test(text)) {
    add("advocacy_register_drift", "The line defaults to advocacy-register abstraction.", "Name the words that were withheld and what happens when they are said.");
    add("observable_behavior", "The sentence names a category rather than an observable event.", "Show who says what and what response follows.");
  }
  if (/\b(?:perfection wound|reparent the inner critic|outsider wound)\b/iu.test(text)) {
    add("clinical_shorthand", "Therapy shorthand replaces the lived behavior.", "Name the actual standard, correction, exclusion, or consequence.");
    add("observable_behavior", "The line labels an inner condition without showing what happens.", "Name the action and consequence.");
  }
  if (normalized.includes("the dishes")) {
    add("example_proves_astrology", "The domestic prop does not demonstrate the astrological mechanism.", "Replace the prop with the delayed refusal and its accumulated consequence.");
  }
  return failures;
}

function violationRecord(copy, category, reason, instruction, location = locationFor(copy, category)) {
  const reviewField = canonicalCategory(category);
  return {
    category,
    severity: HARD_REVISE_FIELDS.includes(reviewField) ? "blocking" : "nonblocking",
    location,
    text: valueAt(copy, location),
    reason,
    revision_instruction: instruction
  };
}

function canonicalCategory(category) {
  if (["required_fields", "placeholder_integrity", "owner_line_integrity", "compressed_prose", "vagueness", "natural_language"].includes(category)) {
    return "literal_first_read_clarity";
  }
  if (category === "banned_language" || category === "em_dash") return "register_consistency";
  return REVIEW_FIELDS.includes(category) ? category : "literal_first_read_clarity";
}

export function deterministicEditorialReview({
  draft,
  plan,
  context,
  family,
  register,
  expectedPlaceholders,
  requiredFields,
  protectedOwnerLines
}) {
  const lint = validateCopy(draft, {
    family,
    register,
    plan,
    expectedPlaceholders,
    requiredFields,
    protectedOwnerLines,
    ownerCorrections: context?.corrections ?? []
  });
  const violations = lint.violations.map((item) => {
    return violationRecord(draft, item.category, item.detail, `Correct only the failed ${locationFor(draft, item.category)} material.`);
  });
  for (const failure of semanticPatternFailures(draft)) {
    violations.push(violationRecord(draft, failure.category, failure.reason, failure.instruction, failure.location));
  }
  const deduped = [...new Map(violations.map((item) => [
    `${item.category}|${item.location}|${item.reason}`,
    item
  ])).values()];
  const failed = new Set(deduped.map((item) => canonicalCategory(item.category)));
  const checks = Object.fromEntries(REVIEW_FIELDS.map((field) => [field, {
    status: failed.has(field) ? "FAIL" : "PASS",
    reason: failed.has(field)
      ? deduped.filter((item) => canonicalCategory(item.category) === field).map((item) => item.reason).join(" ")
      : "No defect found for this check."
  }]));
  const blocking = deduped.some((item) => item.severity === "blocking");
  return {
    ...checks,
    decision: blocking || deduped.length > 0 ? "REVISE" : "PASS",
    violations: deduped,
    required_revisions: deduped.map((item) => ({ field: item.location, instruction: item.revision_instruction }))
  };
}

function validateModelReview(modelReview) {
  for (const field of REVIEW_FIELDS) {
    if (!modelReview?.[field] || !new Set(["PASS", "FAIL"]).has(modelReview[field].status) || typeof modelReview[field].reason !== "string") {
      throw new Error(`Reviewer omitted strict result for ${field}.`);
    }
  }
  if (!new Set(["PASS", "REVISE"]).has(modelReview?.decision)) throw new Error("Reviewer omitted a valid PASS-or-REVISE decision.");
  if (!Array.isArray(modelReview?.violations)) throw new Error("Reviewer omitted violations.");
  for (const violation of modelReview.violations) {
    for (const field of ["category", "severity", "location", "text", "reason", "revision_instruction"]) {
      if (typeof violation?.[field] !== "string") throw new Error(`Reviewer violation omitted ${field}.`);
    }
    if (!new Set(["blocking", "nonblocking"]).has(violation.severity)) throw new Error("Reviewer violation omitted valid severity.");
  }
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
  const mechanical = deterministicEditorialReview({
    draft, plan, context, family, register, expectedPlaceholders, requiredFields, protectedOwnerLines
  });
  if (!modelClient) return mechanical;

  const modelReview = await modelClient({
    stage: "review",
    role: "REVIEWER",
    instructions: canonicalAstrologyReviewInstructions,
    input: JSON.stringify({ plan, family, register, draft }, null, 2),
    schema: REVIEW_SCHEMA
  });
  validateModelReview(modelReview);
  const mergedViolations = [...new Map([
    ...mechanical.violations,
    ...modelReview.violations
  ].map((item) => [`${item.category}|${item.location}|${item.reason}`, item])).values()];
  const failed = new Set(mergedViolations.map((item) => canonicalCategory(item.category)));
  const checks = Object.fromEntries(REVIEW_FIELDS.map((field) => [field, {
    status: failed.has(field) || modelReview[field].status === "FAIL" || mechanical[field].status === "FAIL" ? "FAIL" : "PASS",
    reason: [mechanical[field].reason, modelReview[field].reason].filter(Boolean).join(" ")
  }]));
  const blocking = mergedViolations.some((item) => item.severity === "blocking")
    || HARD_REVISE_FIELDS.some((field) => checks[field].status === "FAIL");
  const anyFailedCheck = REVIEW_FIELDS.some((field) => checks[field].status === "FAIL");
  return {
    ...checks,
    decision: blocking || anyFailedCheck || mergedViolations.length > 0 || modelReview.decision !== "PASS" ? "REVISE" : "PASS",
    violations: mergedViolations,
    required_revisions: mergedViolations.map((item) => ({ field: item.location, instruction: item.revision_instruction }))
  };
}
