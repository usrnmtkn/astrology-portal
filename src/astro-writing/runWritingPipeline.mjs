import { buildMeaningPlan } from "./buildMeaningPlan.mjs";
import { retrieveOwnerContext } from "./retrieveOwnerContext.mjs";
import { generateDraft } from "./generateDraft.mjs";
import { reviewDraft } from "./reviewDraft.mjs";
import { reviseDraft } from "./reviseDraft.mjs";
import { validateCopy } from "./validateCopy.mjs";

export async function runWritingPipeline({
  meaningInput,
  examples,
  corrections,
  task,
  family = "sky-placement",
  register = "collective",
  writerClient,
  reviewerClient,
  expectedPlaceholders = [],
  requiredFields = ["tagline", "hook", "lived", "turn"],
  protectedOwnerLines = []
}) {
  const plan = buildMeaningPlan(meaningInput);
  const context = retrieveOwnerContext(plan, { examples, corrections, contentFamily: family, register });
  const firstDraft = await generateDraft({ plan, context, task, family, register, modelClient: writerClient });
  const firstReview = await reviewDraft({
    draft: firstDraft, plan, context, family, register, modelClient: reviewerClient,
    expectedPlaceholders, requiredFields, protectedOwnerLines
  });
  const revised = firstReview.decision === "REVISE"
    ? await reviseDraft({ draft: firstDraft, review: firstReview, plan, context, modelClient: writerClient })
    : firstDraft;
  const finalReview = firstReview.decision === "REVISE"
    ? await reviewDraft({
      draft: revised, plan, context, family, register, modelClient: reviewerClient,
      expectedPlaceholders, requiredFields, protectedOwnerLines
    })
    : firstReview;
  const lint = validateCopy(revised, {
    family, register, plan, expectedPlaceholders, requiredFields, protectedOwnerLines,
    ownerCorrections: context.corrections
  });
  if (finalReview.decision !== "PASS" || !lint.passed) {
    throw new Error(`Writing harness blocked the draft: review=${finalReview.decision}; lint=${lint.passed ? "PASS" : "REVISE"}.`);
  }
  return {
    draft: revised,
    plan,
    context,
    reviews: [firstReview, ...(firstReview.decision === "REVISE" ? [finalReview] : [])],
    report: {
      drafted: 1,
      passedFirstReview: firstReview.decision === "PASS" ? 1 : 0,
      automaticallyRevised: firstReview.decision === "REVISE" ? 1 : 0,
      failureCategories: [...new Set(firstReview.violations.map((item) => item.split(":", 1)[0]))],
      finalLintStatus: "PASS",
      finalEvalStatus: "PASS"
    }
  };
}
