import { markPipelineReady } from "./approvalGovernance.mjs";
import { resolveAstrology } from "./resolveAstrology.mjs";
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
  plannerClient,
  writerClient,
  reviewerClient,
  reviserClient = writerClient,
  expectedPlaceholders = [],
  requiredFields = ["tagline", "hook", "lived", "turn"],
  protectedOwnerLines = [],
  maxRevisionAttempts = 1
}) {
  if (writerClient && reviewerClient && writerClient === reviewerClient) {
    throw new Error("The WRITER cannot act as its own REVIEWER.");
  }
  const plan = await resolveAstrology(meaningInput, { plannerClient });
  const context = retrieveOwnerContext(plan, { examples, corrections, contentFamily: family, register });
  const firstDraft = await generateDraft({ plan, context, task, family, register, modelClient: writerClient });
  const reviews = [];
  let draft = firstDraft;
  let review = await reviewDraft({
    draft, plan, context, family, register, modelClient: reviewerClient,
    expectedPlaceholders, requiredFields, protectedOwnerLines
  });
  reviews.push(review);
  let revisionAttempts = 0;

  while (review.decision !== "PASS" && revisionAttempts < maxRevisionAttempts) {
    draft = await reviseDraft({
      draft,
      review,
      plan,
      protectedOwnerLines,
      modelClient: reviserClient
    });
    revisionAttempts += 1;
    review = await reviewDraft({
      draft, plan, context, family, register, modelClient: reviewerClient,
      expectedPlaceholders, requiredFields, protectedOwnerLines
    });
    reviews.push(review);
  }

  const lint = validateCopy(draft, {
    family, register, plan, expectedPlaceholders, requiredFields, protectedOwnerLines,
    ownerCorrections: context.corrections
  });
  const failureCategories = [...new Set(reviews[0].violations.map((item) => item.category))];
  if (review.decision !== "PASS" || !lint.passed) {
    return {
      draft,
      plan,
      context,
      reviews,
      status: "human-review-required",
      report: {
        drafted: 1,
        passedFirstReview: 0,
        automaticallyRevised: revisionAttempts,
        failureCategories,
        finalLintStatus: lint.passed ? "PASS" : "REVISE",
        finalEvalStatus: "HUMAN_REVIEW_REQUIRED"
      }
    };
  }

  const readyDraft = {
    ...draft,
    ...markPipelineReady(draft),
    editorialStatus: "pipeline_review_passed",
    reviewStatus: "needs_review",
    ownerApproved: false
  };
  return {
    draft: readyDraft,
    plan,
    context,
    reviews,
    status: "owner-review-pending",
    report: {
      drafted: 1,
      passedFirstReview: reviews[0].decision === "PASS" ? 1 : 0,
      automaticallyRevised: revisionAttempts,
      failureCategories,
      finalLintStatus: "PASS",
      finalEvalStatus: "PASS"
    }
  };
}
