import { markPipelineReady } from "./approvalGovernance.mjs";
import {
  prepareAuthoringSource,
  priorCopyDigest,
  priorCopySegments,
  priorCopyText
} from "./authoringSource.mjs";
import { resolveAstrology } from "./resolveAstrology.mjs";
import { retrieveOwnerContext } from "./retrieveOwnerContext.mjs";
import { generateDraft } from "./generateDraft.mjs";
import {
  classifyNatalDeterministicFindings,
  isNatalAuthoringFamily
} from "./natalWritingGatePolicy.mjs";
import { reviewDraft } from "./reviewDraft.mjs";
import { reviseDraft } from "./reviseDraft.mjs";
import { validateCopy } from "./validateCopy.mjs";

export async function runWritingPipeline({
  meaningInput,
  authoringSource,
  priorCopyForReview = null,
  examples,
  corrections,
  task,
  family = "sky-placement",
  register = "collective",
  surface = "card",
  familyContext = null,
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
  const source = prepareAuthoringSource(authoringSource);
  const priorText = priorCopyText(priorCopyForReview);
  const taskText = String(task ?? "");
  const taskContainsPrior = priorCopySegments(priorCopyForReview)
    .filter((segment) => segment.length >= 20)
    .some((segment) => taskText.includes(segment));
  if (taskContainsPrior) {
    throw new Error("The drafting task contains prior copy. Existing prose must be withheld from the writer.");
  }
  const plan = await resolveAstrology({
    ...meaningInput,
    rowKey: source.rowKey,
    astrologySupport: source.astrologySupport,
    sourceConstraints: source.sourceConstraints
  }, { plannerClient });
  const context = retrieveOwnerContext(plan, { examples, corrections, contentFamily: family, register });
  const firstDraft = await generateDraft({
    plan,
    context,
    task,
    family,
    register,
    surface,
    familyContext,
    modelClient: writerClient
  });
  const reviews = [];
  let draft = firstDraft;
  let review = await reviewDraft({
    draft, plan, context, family, register, modelClient: reviewerClient,
    expectedPlaceholders, requiredFields, protectedOwnerLines, priorCopy: priorText
  });
  reviews.push(review);
  let revisionAttempts = 0;

  while (review.decision !== "PASS" && revisionAttempts < maxRevisionAttempts) {
    draft = await reviseDraft({
      draft,
      review,
      plan,
      family,
      surface,
      familyContext,
      protectedOwnerLines,
      modelClient: reviserClient
    });
    revisionAttempts += 1;
    review = await reviewDraft({
      draft, plan, context, family, register, modelClient: reviewerClient,
      expectedPlaceholders, requiredFields, protectedOwnerLines, priorCopy: priorText
    });
    reviews.push(review);
  }

  const lint = validateCopy(draft, {
    family, register, plan, expectedPlaceholders, requiredFields, protectedOwnerLines,
    ownerCorrections: context.corrections,
    priorCopy: priorText
  });
  const lintPolicy = isNatalAuthoringFamily(family)
    ? classifyNatalDeterministicFindings(lint.violations)
    : { passed: lint.passed, blocking: lint.violations, advisory: [] };
  const failureCategories = [...new Set(reviews[0].violations.map((item) => item.category))];
  if (review.decision !== "PASS" || !lintPolicy.passed) {
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
        finalLintStatus: lintPolicy.passed ? "PASS" : "REVISE",
        finalLintAdvisories: lintPolicy.advisory,
        finalEvalStatus: "HUMAN_REVIEW_REQUIRED",
        authoringSource: {
          rowKey: source.rowKey,
          astrologySupportSha256: source.astrologySupportSha256,
          priorCopySha256: priorCopyDigest(priorText)
        }
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
      finalLintAdvisories: lintPolicy.advisory,
      finalEvalStatus: "PASS",
      authoringSource: {
        rowKey: source.rowKey,
        astrologySupportSha256: source.astrologySupportSha256,
        priorCopySha256: priorCopyDigest(priorText)
      }
    }
  };
}
