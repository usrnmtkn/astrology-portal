import { markPipelineReady } from "./approvalGovernance.mjs";
import { resolveAstrology } from "./resolveAstrology.mjs";
import { retrieveOwnerContext } from "./retrieveOwnerContext.mjs";
import { ARTICLE_LIVED_SECTION_DRAFT_SCHEMA, generateDraft } from "./generateDraft.mjs";
import { validateCopy } from "./validateCopy.mjs";
import { buildArgumentOutline, assertArgumentOutlineApproved } from "./argumentGate.mjs";
import { getContentSpine, assertContentSpine } from "./spineRegistry.mjs";
import { assertPositiveOwnerEvidenceContext, OwnerEvidencePreconditionError } from "./ownerEvidencePolicy.mjs";

export function failedRetrievalResult({ plan, context, argumentOutline, spine, error }) {
  return {
    plan,
    context,
    argumentOutline,
    spine,
    draft: null,
    status: "failed-retrieval",
    failure: {
      code: error.code,
      detail: error.detail,
      classification: "failed-retrieval",
      voiceEvidenceEligible: false,
      draftEligible: false,
      baselineEligible: false,
      rewriteRequired: true
    },
    report: {
      drafted: 0,
      writerCalls: 0,
      billedCalls: 0,
      proseModelGateCalls: 0,
      automaticallyRevised: 0,
      finalLintStatus: "NOT_RUN",
      finalEvalStatus: "FAILED_RETRIEVAL",
      failureCode: error.code
    }
  };
}

export async function runWritingPipeline({
  meaningInput,
  examples,
  matrixExamples = [],
  matrixArgumentCandidates = [],
  matrixEvidenceAvailableCount = null,
  sceneExamples = [],
  samePlanetSignSceneAvailableCount = null,
  sceneEvidenceInventoryCounts = null,
  registerGoldExamples = [],
  corrections,
  task,
  family = "sky-placement",
  register = "collective",
  surface = "card",
  familyContext = null,
  engineFacts = null,
  argumentSource = null,
  argumentInput,
  approvedArgumentOutline = null,
  plannerClient,
  writerClient,
  expectedPlaceholders = [],
  requiredFields = null,
  protectedOwnerLines = [],
  literalEvidenceRequirements = null,
  ownerCorpusVocabulary = null,
  partialRewrite = null,
  reservedNegationPivots = 0,
  excludedEvidenceContentKeys = [],
  preferredEvidenceContentKeys = [],
  phraseEvidence = []
}) {
  const plan = await resolveAstrology(meaningInput, { plannerClient });
  const resolvedRequiredFields = requiredFields ?? (["fast-mover-article", "slow-mover-article"].includes(family)
    ? ["opening", "tension", "development", "close"]
    : ["tagline", "hook", "lived", "turn"]);
  const pendingOutline = buildArgumentOutline(argumentInput, { plan, family, surface });
  const spine = getContentSpine(family);
  if (!approvedArgumentOutline) {
    return {
      plan,
      context: null,
      argumentOutline: pendingOutline,
      spine,
      draft: null,
      status: "argument-review-pending",
      report: {
        drafted: 0,
        billedCalls: 0,
        proseModelGateCalls: 0,
        nextRequiredAction: "explicit_owner_approval_of_exact_argument_outline"
      }
    };
  }
  assertArgumentOutlineApproved(approvedArgumentOutline, { plan, family, surface });
  if (partialRewrite?.mode === "lived-section-only") {
    if (family !== "fast-mover-article") throw new Error(`PARTIAL_REWRITE_FAMILY_UNSUPPORTED:${family}`);
    for (const field of ["opening", "tension", "close"]) {
      if (typeof partialRewrite.protectedFields?.[field] !== "string" || !partialRewrite.protectedFields[field]) {
        throw new Error(`PARTIAL_REWRITE_PROTECTED_FIELD_REQUIRED:${field}`);
      }
    }
  }
  let requiredSpine = spine;
  let context = null;
  try {
    context = retrieveOwnerContext(plan, {
      examples,
      matrixExamples,
      matrixArgumentCandidates,
      matrixEvidenceAvailableCount,
      sceneExamples,
      samePlanetSignSceneAvailableCount,
      sceneEvidenceInventoryCounts,
      argumentSource,
      registerGoldExamples,
      corrections,
      contentFamily: family,
      register,
      excludedEvidenceContentKeys,
      preferredEvidenceContentKeys,
      phraseEvidence
    });
    assertPositiveOwnerEvidenceContext(context, { family });
    requiredSpine = assertContentSpine(family);
  } catch (error) {
    if (!(error instanceof OwnerEvidencePreconditionError)) throw error;
    return failedRetrievalResult({
      plan,
      context,
      argumentOutline: approvedArgumentOutline,
      spine: requiredSpine,
      error
    });
  }
  const generatedDraft = await generateDraft({
    plan,
    context,
    task,
    family,
    register,
    surface,
    familyContext,
    engineFacts,
    argumentSource,
    argumentOutline: approvedArgumentOutline,
    spine: requiredSpine,
    modelClient: writerClient,
    schema: partialRewrite?.mode === "lived-section-only" ? ARTICLE_LIVED_SECTION_DRAFT_SCHEMA : null
  });
  const draft = partialRewrite?.mode === "lived-section-only"
    ? {
        ...generatedDraft,
        opening: partialRewrite.protectedFields.opening,
        tension: partialRewrite.protectedFields.tension,
        development: generatedDraft.development,
        close: partialRewrite.protectedFields.close,
        partialRewrite: {
          mode: partialRewrite.mode,
          generatedFields: ["development"],
          protectedFields: ["opening", "tension", "close"]
        }
      }
    : generatedDraft;
  const effectiveProtectedOwnerLines = partialRewrite?.mode === "lived-section-only"
    ? [...new Set([...protectedOwnerLines, ...Object.values(partialRewrite.protectedFields)])]
    : protectedOwnerLines;
  const lint = validateCopy(draft, {
    family, register, surface, plan, expectedPlaceholders, requiredFields: resolvedRequiredFields, protectedOwnerLines: effectiveProtectedOwnerLines,
    ownerCorrections: context.corrections, ownerCorpusVocabulary, literalEvidenceRequirements,
    reservedNegationPivots,
    spineQualityConditionalLayers: {
      older_analogs: Array.isArray(engineFacts?.olderAnalogs) && engineFacts.olderAnalogs.length > 0,
      olderAnalogSourceIds: Array.isArray(engineFacts?.olderAnalogs)
        ? engineFacts.olderAnalogs.flatMap((entry) => [
            entry?.sourceId,
            entry?.source_key,
            ...(Array.isArray(entry?.sourceKeys) ? entry.sourceKeys : [])
          ]).filter(Boolean)
        : []
    },
    inheritedSpineElements: partialRewrite?.mode === "lived-section-only"
      ? ["planet", "condition", "handoff", "thesis", "failure_mechanism", "close"]
      : []
  });
  const billedCalls = writerClient?.billed === true ? 1 : writerClient?.billed === false ? 0 : null;
  const failureCategories = [...new Set(lint.violations.map((item) => item.category))];
  if (lint.completionStatus === "spine-quality-incomplete") {
    return {
      draft: {
        ...draft,
        editorialStatus: "spine-quality-incomplete",
        reviewStatus: "needs_review",
        ownerApproved: false,
        promotionAuthorized: false,
        canonical: false
      },
      plan,
      context,
      argumentOutline: approvedArgumentOutline,
      spine: requiredSpine,
      lint,
      status: "spine-quality-incomplete",
      report: {
        drafted: 1,
        writerCalls: 1,
        billedCalls,
        proseModelGateCalls: 0,
        automaticallyRevised: 0,
        failureCategories,
        spineQualityFailedElements: lint.spineQuality.failedElements,
        finalLintStatus: lint.passed ? "PASS_WITH_SPINE_QUALITY_INCOMPLETE" : "REVISE",
        finalEvalStatus: "SPINE_QUALITY_INCOMPLETE"
      }
    };
  }
  if (!lint.passed) {
    return {
      draft,
      plan,
      context,
      argumentOutline: approvedArgumentOutline,
      spine: requiredSpine,
      lint,
      status: "human-review-required",
      report: {
        drafted: 1,
        writerCalls: 1,
        billedCalls,
        proseModelGateCalls: 0,
        automaticallyRevised: 0,
        failureCategories,
        finalLintStatus: lint.passed ? "PASS" : "REVISE",
        finalEvalStatus: "OWNER_GATE_REQUIRED"
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
    argumentOutline: approvedArgumentOutline,
    spine: requiredSpine,
    lint,
    status: "owner-review-pending",
    report: {
      drafted: 1,
      writerCalls: 1,
      billedCalls,
      proseModelGateCalls: 0,
      automaticallyRevised: 0,
      failureCategories,
      finalLintStatus: "PASS",
      finalEvalStatus: "OWNER_GATE_REQUIRED"
    }
  };
}
