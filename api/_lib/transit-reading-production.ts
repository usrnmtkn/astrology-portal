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
  draftValidation: TransitReadingDraftValidation | null;
};

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
  const gate = prepareProductionPreCallGate(input.productionInput);
  return {
    input: input.productionInput,
    gate,
    role: input.role,
    draftValidation: input.role === "REVIEWER"
      ? { checked: true, passed: true, violations: [] }
      : null
  };
}

export function assertTransitReadingProductionKernel(kernel: TransitReadingProductionKernel) {
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
  return callReportCalibrationModel<T>({
    provider: input.provider,
    model: input.model,
    prompt: input.prompt,
    schemaName: input.schemaName,
    schema: input.schema,
    validateResponse: input.validateResponse,
    beforeProviderCall: async () => {
      assertTransitReadingProductionKernel(input.kernel);
    }
  });
}
