import { candidateCardAstrologyWritingInstructions, canonicalAstrologyWritingInstructions } from "./canonicalInstructions.mjs";
import {
  buildCardWriterChain,
  cardCritiqueChecklist,
  isCardWritingSurface
} from "./cardWritingStandard.mjs";
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

export function buildDraftInput({
  plan,
  context,
  task,
  family = "sky-placement",
  register = "collective",
  surface = "card",
  familyContext = null
}) {
  const sections = [
    `TASK\n${String(task ?? "Write one TLDR Astro passage.").trim()}`,
    `SURFACE\n${surface}`,
    `CONTENT FAMILY\n${family}`,
    `REGISTER\n${register}`,
    `SOURCE ROW KEY\n${plan.source_row_key}`,
    `ASTROLOGY SUPPORT SOURCE\n${plan.astrology_support}`,
    `SOURCE CONSTRAINTS\n${JSON.stringify(plan.source_constraints, null, 2)}`,
    "PRIOR CANDIDATE PROSE\nWITHHELD FROM WRITER. The existing prose is not the draft and must not supply sentence structure.",
    `ASTROLOGY MEANING PLAN\n${JSON.stringify(plan, null, 2)}`,
    `OWNER-APPROVED EXAMPLES\n${JSON.stringify(context.examples, null, 2)}`,
    `OWNER CORRECTIONS\n${JSON.stringify(context.corrections, null, 2)}`,
    "Author fresh from the AstrologySupport mechanism. Enter through an observable human situation, show its consequence, and add perspective only afterward. Owner material establishes voice and judgment; do not cosmetically paraphrase its narrative."
  ];
  if (isCardWritingSurface({ surface, family })) {
    sections.push(
      `CARD WRITER SEVEN-PASS CHAIN\n${JSON.stringify(buildCardWriterChain({ familyContext }), null, 2)}`,
      `CARD CRITIQUE CHECKLIST\n${cardCritiqueChecklist}`,
      "The meaning plan's DO_NOT_ASSUME and do_not_assume values are internal generation constraints. Never echo the label, guard text, or a reader-facing disclaimer derived from them.",
      `PLANETARY FAMILY CONTEXT\n${familyContext == null ? "NOT_SUPPLIED: passes 6 and 7 remain owner-review checks; do not claim family-level completion." : JSON.stringify(familyContext, null, 2)}`
    );
  }
  sections.push("Return only the requested JSON.");
  return sections.join("\n\n");
}

function unapprovedDraft(value) {
  return {
    ...value,
    ...generatedApprovalState(),
    editorialStatus: "generated_candidate",
    reviewStatus: "needs_review",
    ownerStatus: "PENDING OWNER",
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
  surface = "card",
  familyContext = null,
  modelClient,
  schema = PLACEMENT_DRAFT_SCHEMA
}) {
  if (typeof modelClient !== "function") throw new Error("generateDraft requires an injected modelClient; no implicit billed call is allowed.");
  const role = isCardWritingSurface({ surface, family }) ? "CARD_WRITER_V3" : "WRITER";
  const value = await modelClient({
    stage: "draft",
    role,
    instructions: isCardWritingSurface({ surface, family })
      ? candidateCardAstrologyWritingInstructions
      : canonicalAstrologyWritingInstructions,
    input: buildDraftInput({ plan, context, task, family, register, surface, familyContext }),
    schema
  });
  if (!value || typeof value !== "object") throw new Error("Writer returned no structured draft.");
  return attachGenerationMetadata(unapprovedDraft(value), writeGenerationMetadata({
    role,
    provider: modelClient.provider ?? null,
    model: modelClient.model ?? null,
    reasoningEffort: modelClient.reasoningEffort ?? null,
    thinkingLevel: modelClient.thinkingLevel ?? null,
    sourceIds: [
      ...(context.examples ?? []).map((entry) => entry.id ?? entry.fixture_id).filter(Boolean),
      ...(context.corrections ?? []).map((entry) => entry.fixture_id ?? entry.id).filter(Boolean)
    ]
  }));
}

export { unapprovedDraft };
