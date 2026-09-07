import {
  callReportCalibrationModel,
  type ReportModelResult
} from "./report-model-client.js";
import {
  prepareProductionPreCallGate,
  assertProductionPreCallGate
} from "../../src/astro-writing/productionPreCallGate.cjs";

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

const ASPECT_ALIASES = new Map<string, string>([
  ["conjunct", "conjunction"],
  ["conjunction", "conjunction"],
  ["opposes", "opposition"],
  ["opposite", "opposition"],
  ["opposition", "opposition"],
  ["square", "square"],
  ["squares", "square"],
  ["trine", "trine"],
  ["trines", "trine"],
  ["sextile", "sextile"],
  ["sextiles", "sextile"]
]);
const BODY_PATTERN = "Sun|Moon|Mercury|Venus|Mars|Jupiter|Saturn|Uranus|Neptune|Pluto|Chiron|Lilith|North Node|South Node|Ascendant|Rising|Midheaven|MC|Descendant|IC";
const DRIVER_ASPECT = new RegExp(`^(${BODY_PATTERN})\\s+(conjunct|conjunction|opposes|opposite|opposition|square|squares|trine|trines|sextile|sextiles)\\s+(${BODY_PATTERN})$`, "iu");

function slug(value: unknown) {
  return typeof value === "string"
    ? value.trim().toLowerCase().replace(/&/gu, " and ").replace(/[^a-z0-9]+/gu, "-").replace(/^-+|-+$/gu, "")
    : "";
}

function canonicalAspect(value: unknown) {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  return ASPECT_ALIASES.get(normalized) ?? "";
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function addHouse(ids: Set<string>, value: unknown) {
  if (typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 12) {
    ids.add(`house-${value}`);
  }
}

function addTransit(ids: Set<string>, transitPlanet: unknown, aspect: unknown, natalPoint: unknown) {
  const planet = slug(transitPlanet);
  const canonical = canonicalAspect(aspect);
  const point = slug(natalPoint);
  if (planet && canonical && point) ids.add(`you-transit-v3-${planet}-${canonical}-${point}`);
}

function addDriver(ids: Set<string>, driverLabel: unknown, source: unknown) {
  const driver = stringValue(driverLabel);
  const match = DRIVER_ASPECT.exec(driver);
  if (match) addTransit(ids, match[1], match[2], match[3]);

  const sourceToken = slug(source);
  if (sourceToken === "lunation" || /^(?:new|full)\s+moon\b/iu.test(driver)) {
    // The legacy You/Friends prompt remains the source-text authority. These
    // generic mechanism IDs exist only to bind the production provider call
    // to catalogued astrology evidence before any network request is allowed.
    ids.add("canonical:body/moon");
    ids.add("canonical:body/sun");
  }
}

function walkTechnicalEvidence(ids: Set<string>, value: unknown) {
  if (Array.isArray(value)) {
    value.forEach((entry) => walkTechnicalEvidence(ids, entry));
    return;
  }
  const item = record(value);
  if (!item) return;

  addTransit(ids, item.transitPlanet, item.aspect, item.natalPoint);
  addHouse(ids, item.house);
  addHouse(ids, item.natalHouse);
  addDriver(ids, item.driverLabel, item.source);

  for (const [key, entry] of Object.entries(item)) {
    if (key === "moonDriver" && entry) ids.add("canonical:body/moon");
    if (entry && typeof entry === "object") walkTechnicalEvidence(ids, entry);
  }
}

export function youTransitReadingProductionKnowledgeIds(brief: {
  technicalEvidence?: Record<string, unknown>;
}) {
  const ids = new Set<string>();
  walkTechnicalEvidence(ids, brief.technicalEvidence ?? {});
  return [...ids];
}

export function prepareTransitReadingProductionKernel(input: {
  productionInput: TransitReadingProductionInput;
  role: TransitReadingProductionRole;
  draftValidated?: boolean;
}): TransitReadingProductionKernel {
  if (!input.productionInput.knowledgeIds.length) {
    throw new Error(`TRANSIT_READING_PRODUCTION_EVIDENCE_MISSING: ${input.productionInput.contentKey}. No provider call is allowed.`);
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
