import { buildMeaningPlan } from "./buildMeaningPlan.mjs";
import { effectiveAstrologyWritingInstructions } from "./canonicalInstructions.mjs";

export const MEANING_PLAN_SCHEMA = Object.freeze({
  type: "object",
  additionalProperties: false,
  required: [
    "content_type", "object", "sign", "house", "event_type", "object_function",
    "sign_mechanics", "actual_house_domain", "core_tension", "what_changes",
    "constructive_expression", "overcorrection", "observable_behaviors",
    "possible_consequences", "allowed_life_domain_examples", "do_not_assume",
    "house_bleed_risks", "stock_trope_risks", "unearned_motives"
  ],
  properties: {
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

export async function resolveAstrology(input, { plannerClient, surface = "generic", family = "" } = {}) {
  if (!plannerClient) return buildMeaningPlan(input);
  const value = await plannerClient({
    stage: "meaning-plan",
    role: "MEANING_PLANNER",
    instructions: `${effectiveAstrologyWritingInstructions({ surface, family })}\n\nAstrology first. Return only the governed structured meaning plan. Do not draft prose.`,
    input: JSON.stringify(input, null, 2),
    schema: MEANING_PLAN_SCHEMA
  });
  return Object.freeze(value);
}
