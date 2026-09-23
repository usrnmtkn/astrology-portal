import { checkpointTransitReadingModel, transitReadingModelRequestHash } from "./transit-reading-checkpoints.js";
import { SCOPED_REVIEW_SCHEMAS, type TransitReadingReviewScope } from "./transit-reading-review-contract.js";
import { transitReadingReleasePolicy } from "./transit-reading-release-policy.js";
import { EVIDENCE_DELIVERY_POLICY } from "./transit-reading-delivery-evidence.js";
import { transitReadingOwnerVoice, transitReadingOwnerVoicePrompt, assertTransitReadingOwnerVoice, transitReadingVoiceContext } from "./transit-reading-owner-voice.js";
import {
  callReportCalibrationModel,
  type ReportModelResult
} from "./report-model-client.js";
import {
  prepareProductionPreCallGate,
  assertProductionPreCallGate
} from "../../src/astro-writing/productionPreCallGate.cjs";

export { youTransitReadingProductionKnowledgeIds } from "./transit-reading-production-evidence.js";

export type TransitReadingProductionRole = "WRITER" | "REVIEWER";
export type TransitReadingProductionInput = {
  contentKey: string;
  surface: "friends" | "you";
  mode: string;
  eventType: string;
  facts: Record<string, unknown>;
  knowledgeIds: string[];
  sourceSnapshot: Record<string, unknown>;
};

export type TransitReadingDraftValidation = {
  checked: true;
  passed: true;
  violations: [];
};

export type TransitReadingProductionKernel = {
  input: TransitReadingProductionInput;
  gate: ReturnType<typeof prepareProductionPreCallGate>;
  role: TransitReadingProductionRole;
  ownerVoice: ReturnType<typeof transitReadingOwnerVoice>;
  draftValidation: TransitReadingDraftValidation | null;
};

function productionGateInput(input: TransitReadingProductionInput): TransitReadingProductionInput {
  if (input.surface !== "you" || /transit/iu.test(input.eventType)) return input;
  return {
    ...input,
    // The persisted product event names are `you-day-reading` and
    // `you-week-reading`. The production writing kernel already governs this
    // content under its You-transit lane, so normalize only the pre-call event
    // identity. Reader/runtime persistence remains unchanged.
    eventType: `you-transit-${input.eventType}`
  };
}

export function prepareTransitReadingProductionKernel(input: {
  productionInput: TransitReadingProductionInput;
  role: TransitReadingProductionRole;
  draftValidated?: boolean;
}): TransitReadingProductionKernel {
  if (!input.productionInput.knowledgeIds.length) {
    throw new Error(`TRANSIT_READING_PRODUCTION_EVIDENCE_MISSING: ${input.productionInput.contentKey}. No provider call is allowed.`);
  }
  if (input.role === "REVIEWER" && input.draftValidated !== true) {
    throw new Error("TRANSIT_READING_REVIEW_VALIDATION_REQUIRED: deterministic validation must pass before the judge can run.");
  }
  const normalizedInput = productionGateInput(input.productionInput);
  const gate = prepareProductionPreCallGate(normalizedInput);
  return {
    input: normalizedInput,
    gate,
    ownerVoice: transitReadingOwnerVoice(normalizedInput.facts, normalizedInput.surface),
    role: input.role,
    draftValidation: input.role === "REVIEWER"
      ? { checked: true, passed: true, violations: [] }
      : null
  };
}

export function assertTransitReadingProductionKernel(kernel: TransitReadingProductionKernel) {
  assertTransitReadingOwnerVoice(kernel.ownerVoice);
  return assertProductionPreCallGate(kernel.gate, {
    role: kernel.role,
    input: kernel.input,
    draftValidation: kernel.draftValidation
  });
}

/**
 * Generated short reports reuse the repo's centralized OpenAI/Anthropic
 * structured transport, but every production call is wrapped in the catalog
 * pre-call gate above. The underlying calibration export is transport only;
 * this wrapper is the production boundary and never exposes an ungated call to
 * Friends/You generation code.
 */
export async function callGovernedTransitReadingModel<T>(input: {
  kernel: TransitReadingProductionKernel;
  provider: string;
  model: string;
  prompt: string;
  schemaName: string;
  schema: Record<string, unknown>;
  reviewScope?: TransitReadingReviewScope;
  validateResponse?: (value: T) => void;
}): Promise<ReportModelResult<T> & { requestSha256: string }> {
  assertTransitReadingProductionKernel(input.kernel);
  if (input.reviewScope && (input.kernel.role !== "REVIEWER" || input.schemaName !== SCOPED_REVIEW_SCHEMAS[input.reviewScope])) {
    throw new Error("Scoped review requires the corresponding reviewer schema.");
  }
  const ownerVoicePrompt = input.reviewScope === "facts" ? "" : transitReadingOwnerVoicePrompt(input.kernel.ownerVoice,
    transitReadingVoiceContext(input.kernel.input.facts, input.kernel.input.surface));
  const request = {
    provider: input.provider,
    model: input.model,
    prompt: ownerVoicePrompt ? `${input.prompt}\n\n${ownerVoicePrompt}` : input.prompt,
    schemaName: input.schemaName,
    schema: input.schema,
    validateResponse: input.validateResponse,
    ...(transitReadingReleasePolicy() === EVIDENCE_DELIVERY_POLICY ? {
      // Includes the full wire payload, not just prose. Together with an 8192
      // protocol allowance this bounds text input conservatively at 96000 tokens.
      requestLimits: { maxInputBytes: 87_808, maxOutputTokens: input.kernel.role === "REVIEWER" ? 6_000 : 12_000 },
      disableFallback: true
    } : {}),
    ...(input.reviewScope ? { disableFallback: true } : {}),
    beforeProviderCall: async () => {
      assertTransitReadingProductionKernel(input.kernel);
    }
  };
  const response = await checkpointTransitReadingModel<T>(request, callReportCalibrationModel);
  return { ...response, requestSha256: transitReadingModelRequestHash(request) };
}
