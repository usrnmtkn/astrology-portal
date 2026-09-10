import { checkpointTransitReadingModel } from "./transit-reading-checkpoints.js";
import { transitReadingOwnerVoice, transitReadingOwnerVoicePrompt, assertTransitReadingOwnerVoice } from "./transit-reading-owner-voice.js";
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
  validateResponse?: (value: T) => void;
}): Promise<ReportModelResult<T>> {
  assertTransitReadingProductionKernel(input.kernel);
  const ownerVoicePrompt = transitReadingOwnerVoicePrompt(input.kernel.ownerVoice);
  return checkpointTransitReadingModel<T>({
    provider: input.provider,
    model: input.model,
    prompt: `${input.prompt}\n\n${ownerVoicePrompt}`,
    schemaName: input.schemaName,
    schema: input.schema,
    validateResponse: input.validateResponse,
    beforeProviderCall: async () => {
      assertTransitReadingProductionKernel(input.kernel);
    }
  }, callReportCalibrationModel);
}
