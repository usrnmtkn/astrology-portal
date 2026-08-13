import { buildMeaningPlan } from "./buildMeaningPlan.mjs";
import { prepareAuthoringSource } from "./authoringSource.mjs";
import { canonicalAstrologyWritingInstructions } from "./canonicalInstructions.mjs";

export const MEANING_PLAN_SCHEMA = Object.freeze({
  type: "object",
  additionalProperties: false,
  required: [
    "source_row_key", "astrology_support", "source_constraints",
    "content_type", "object", "sign", "house", "event_type", "object_function",
    "sign_mechanics", "actual_house_domain", "core_tension", "what_changes",
    "constructive_expression", "overcorrection", "observable_behaviors",
    "possible_consequences", "allowed_life_domain_examples", "do_not_assume",
    "house_bleed_risks", "stock_trope_risks", "unearned_motives"
  ],
  properties: {
    source_row_key: { type: "string" },
    astrology_support: { type: "string" },
    source_constraints: { type: "array", items: { type: "string" } },
    content_type: { type: "string" },
    object: { type: "string" },
    sign: { type: "string" },
    house: { type: ["integer", "null"] },
    event_type: { type: ["string", "null"] },
    object_function: { type: "array", items: { type: "string" } },
    sign_mechanics: { type: "array", items: { type: "string" } },
    actual_house_domain: { type: ["string", "null"] },
    core_tension: { type: "string" },
    what_changes: { type: "string" },
    constructive_expression: { type: "string" },
    overcorrection: { type: "string" },
    observable_behaviors: { type: "array", items: { type: "string" } },
    possible_consequences: { type: "array", items: { type: "string" } },
    allowed_life_domain_examples: { type: "array", items: { type: "string" } },
    do_not_assume: { type: "array", items: { type: "string" } },
    house_bleed_risks: { type: "array", items: { type: "string" } },
    stock_trope_risks: { type: "array", items: { type: "string" } },
    unearned_motives: { type: "array", items: { type: "string" } }
  }
});

export async function resolveAstrology(input, { plannerClient } = {}) {
  const source = prepareAuthoringSource(input);
  if (!plannerClient) return buildMeaningPlan(input);
  const plannerSourceInput = Object.freeze({
    source_row_key: source.rowKey,
    astrology_support: source.astrologySupport,
    source_constraints: source.sourceConstraints,
    content_type: String(input.contentType ?? input.content_type ?? "placement"),
    object: String(input.object ?? input.planet ?? input.point ?? "").trim().toLowerCase(),
    sign: String(input.sign ?? "").trim().toLowerCase(),
    house: input.house == null ? null : Number(input.house),
    event_type: input.eventType == null && input.event_type == null
      ? null
      : String(input.eventType ?? input.event_type).trim().toLowerCase()
  });
  const value = await plannerClient({
    stage: "meaning-plan",
    role: "MEANING_PLANNER",
    instructions: `${canonicalAstrologyWritingInstructions}\n\nAstrologySupport is the only delineation source. Reduce it to one plain internal mechanism sentence, then build the governed structured meaning plan. Existing candidate prose is forbidden and has not been supplied. Do not draft reader prose. Preserve source_row_key, astrology_support, and source_constraints exactly.`,
    input: JSON.stringify(plannerSourceInput, null, 2),
    schema: MEANING_PLAN_SCHEMA
  });
  if (value.source_row_key !== source.rowKey
    || value.astrology_support !== source.astrologySupport
    || JSON.stringify(value.source_constraints) !== JSON.stringify(source.sourceConstraints)) {
    throw new Error("Meaning planner altered the governed authoring source.");
  }
  return Object.freeze({
    ...value,
    rowKey: source.rowKey,
    astrologySupport: source.astrologySupport,
    sourceConstraints: source.sourceConstraints,
    eventType: value.event_type,
    objectFunction: value.object_function?.[0] ?? "",
    signMechanics: value.sign_mechanics?.[0] ?? "",
    actualHouseDomain: value.actual_house_domain,
    allowedLivedDomains: value.allowed_life_domain_examples ?? [],
    prohibitedDomainAssumptions: value.house_bleed_risks ?? [],
    coreTension: value.core_tension,
    likelyObservableBehaviors: value.observable_behaviors ?? [],
    likelyConsequences: value.possible_consequences ?? [],
    risks: [value.overcorrection].filter(Boolean),
    DO_NOT_ASSUME: value.do_not_assume ?? []
  });
}
