import { canonicalAstrologyWritingInstructions } from "./canonicalInstructions.mjs";
import { generatedApprovalState } from "./approvalGovernance.mjs";
import { attachGenerationMetadata, writeGenerationMetadata } from "./generationMetadata.mjs";

export const PLACEMENT_DRAFT_SCHEMA = Object.freeze({
  type: "object",
  additionalProperties: false,
  required: ["tagline", "hook", "lived", "turn"],
  properties: {
    tagline: { type: "string" },
    hook: { type: "string" },
    lived: { type: "string" },
    turn: { type: "string" }
  }
});

export function buildDraftInput({ plan, context, task, family = "sky-placement", register = "collective" }) {
  return [
    `TASK\n${String(task ?? "Write one TLDR Astro passage.").trim()}`,
    `CONTENT FAMILY\n${family}`,
    `REGISTER\n${register}`,
    `ASTROLOGY MEANING PLAN\n${JSON.stringify(plan, null, 2)}`,
    `OWNER-APPROVED EXAMPLES\n${JSON.stringify(context.examples, null, 2)}`,
    `OWNER CORRECTIONS\n${JSON.stringify(context.corrections, null, 2)}`,
    "Write from the meaning plan. Owner material establishes voice and judgment; do not cosmetically paraphrase its narrative.",
    "Return only the requested JSON."
  ].join("\n\n");
}

function unapprovedDraft(value) {
  return {
    ...value,
    ...generatedApprovalState(),
    editorialStatus: "generated_candidate",
    reviewStatus: "needs_review",
    ownerApproved: false,
    promotionAuthorized: false,
    canonical: false
  };
}

export async function generateDraft({
  plan,
  context,
  task,
  family = "sky-placement",
  register = "collective",
  modelClient,
  schema = PLACEMENT_DRAFT_SCHEMA
}) {
  if (typeof modelClient !== "function") throw new Error("generateDraft requires an injected modelClient; no implicit billed call is allowed.");
  const value = await modelClient({
    stage: "draft",
    role: "WRITER",
    instructions: canonicalAstrologyWritingInstructions,
    input: buildDraftInput({ plan, context, task, family, register }),
    schema
  });
  if (!value || typeof value !== "object") throw new Error("Writer returned no structured draft.");
  return attachGenerationMetadata(unapprovedDraft(value), writeGenerationMetadata({
    role: "WRITER",
    model: modelClient.model ?? null,
    reasoningEffort: modelClient.reasoningEffort ?? null,
    sourceIds: [
      ...(context.examples ?? []).map((entry) => entry.id ?? entry.fixture_id).filter(Boolean),
      ...(context.corrections ?? []).map((entry) => entry.fixture_id ?? entry.id).filter(Boolean)
    ]
  }));
}

export { unapprovedDraft };
