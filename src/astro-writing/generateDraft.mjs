import { effectiveAstrologyWritingInstructions } from "./canonicalInstructions.mjs";
import {
  isCardWritingSurface
} from "./cardWritingStandard.mjs";
import { generatedApprovalState } from "./approvalGovernance.mjs";
import { attachGenerationMetadata, writeGenerationMetadata } from "./generationMetadata.mjs";
import { assertArgumentOutlineApproved } from "./argumentGate.mjs";
import { assertSurfaceRegisterContract } from "./surfaceRegisterContract.mjs";

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

const BASE_SPINE_QUALITY_EVIDENCE_PROPERTIES = Object.freeze({
  planet: { type: "string" },
  condition: { type: "string" },
  handoff: { type: "string" },
  thesis: { type: "string" },
  lived_evidence: { type: "string" },
  failure_mechanism: { type: "string" },
  strategy: { type: "string" },
  close: { type: "string" }
});

const FAST_MOVER_SPINE_QUALITY_EVIDENCE_SCHEMA = Object.freeze({
  type: "object",
  additionalProperties: false,
  required: ["planet", "condition", "handoff", "thesis", "lived_evidence", "failure_mechanism", "strategy", "close"],
  properties: BASE_SPINE_QUALITY_EVIDENCE_PROPERTIES
});

const SLOW_MOVER_SPINE_QUALITY_EVIDENCE_SCHEMA = Object.freeze({
  type: "object",
  additionalProperties: false,
  required: [
    "planet", "condition", "handoff", "thesis", "lived_evidence", "failure_mechanism",
    "strategy", "era_frame", "recurrence", "older_analogs", "collective_lesson", "close"
  ],
  properties: Object.freeze({
    ...BASE_SPINE_QUALITY_EVIDENCE_PROPERTIES,
    era_frame: { type: "string" },
    recurrence: { type: "string" },
    older_analogs: { type: "string" },
    collective_lesson: { type: "string" }
  })
});

function articleDraftSchema(spineQualityEvidenceSchema) {
  return Object.freeze({
    type: "object",
    additionalProperties: false,
    required: ["opening", "tension", "development", "close", "spine_quality_evidence"],
    properties: {
      opening: { type: "string" },
      tension: { type: "string" },
      development: { type: "string" },
      close: { type: "string" },
      spine_quality_evidence: spineQualityEvidenceSchema
    }
  });
}

export const FAST_MOVER_ARTICLE_DRAFT_SCHEMA = articleDraftSchema(FAST_MOVER_SPINE_QUALITY_EVIDENCE_SCHEMA);
export const SLOW_MOVER_ARTICLE_DRAFT_SCHEMA = articleDraftSchema(SLOW_MOVER_SPINE_QUALITY_EVIDENCE_SCHEMA);

export const ARTICLE_DRAFT_SCHEMA = Object.freeze({
  type: "object",
  additionalProperties: false,
  required: ["opening", "tension", "development", "close", "spine_quality_evidence"],
  properties: {
    opening: { type: "string" },
    tension: { type: "string" },
    development: { type: "string" },
    close: { type: "string" },
    spine_quality_evidence: FAST_MOVER_SPINE_QUALITY_EVIDENCE_SCHEMA
  }
});

export const ARTICLE_LIVED_SECTION_DRAFT_SCHEMA = Object.freeze({
  type: "object",
  additionalProperties: false,
  required: ["development"],
  properties: {
    development: { type: "string" }
  }
});

function registerContract({ register, surface }) {
  if (surface === "sky-placement-page") {
    return "HARD REQUIREMENT: Sky Placement articles speak directly to the reader using you/your. Third-person lived observation may mix with direct address, but the page must address the reader's life. Never break the fourth wall or comment on writing the page.";
  }
  if (register === "collective") return "Collective register: do not use you, your, yours, yourself, or yourselves.";
  if (register === "friend") return "Friend register: speak about the named friend; do not address the reader as the subject.";
  if (register === "second_person") return "Second-person register: speak directly to the reader.";
  return `Use the supplied ${register} register consistently.`;
}

export function buildDraftInput({
  plan,
  context,
  task,
  target,
  family = "sky-placement",
  register = "collective",
  surface = "card",
  familyContext = null,
  engineFacts = null,
  argumentSource = null,
  argumentOutline,
  spine
}) {
  const sections = [
    `TASK\n${String(task ?? "Write one TLDR Astro passage.").trim()}`,
    `RESOLVED RENDER TARGET\n${JSON.stringify(target, null, 2)}`,
    `SURFACE\n${surface}`,
    `CONTENT FAMILY\n${family}`,
    `REGISTER\n${register}`,
    `REGISTER CONTRACT\n${registerContract({ register, surface })}`,
    `ASTROLOGY MEANING PLAN\n${JSON.stringify(plan, null, 2)}`,
    `ENGINE-OWNED DATES AND FACTS\n${engineFacts == null ? "NOT_SUPPLIED" : JSON.stringify(engineFacts, null, 2)}`,
    `OWNER-APPROVED ARGUMENT OUTLINE\n${JSON.stringify(argumentOutline, null, 2)}`,
    "ARGUMENT BREADTH IS A SCOPE CHECK, NOT A PROSE TEMPLATE. Keep the broad planet-sign mechanism larger than the chosen expression. The other valid expressions prove scope and do not all need to appear in the page. Do not turn them into a list or make every paragraph prove the chosen expression.",
    `RECORDED STRUCTURAL SPINE\n${JSON.stringify(spine, null, 2)}`,
    "SPINE SLOTS ARE CHECKS, NOT TEMPLATES. Satisfy each required element through the meaning already present in natural prose. Never announce a slot or turn its label into reader copy. Do not default to structural phrases such as 'the job of,' 'this is a period for,' or 'the collective lesson is.' A construction that worked once is not reusable batch machinery.",
    "SPINE QUALITY GATES. Structural presence is not enough. Meet every quality requirement attached to the recorded spine. Return spine_quality_evidence as internal metadata: quote the exact contiguous reader-copy sentence or sentences that satisfy each required element. Fast movers report eight elements; slow movers report those eight plus era frame, recurrence, conditional older analogs, and collective lesson. Do not write new prose inside the evidence map. The evidence map is not rendered.",
    "NEGATION-PIVOT CAP. The 'X is not Y. It is Z.' family remains available, including 'the problem is not,' 'X is not the problem,' and 'not X but Y,' but use no more than one such pivot on this page. Once used, state later consequences directly, ask the question, or name what happens next.",
    `OWNER-APPROVED ARGUMENT AND CLOSE SOURCE — NOT VOICE EVIDENCE\n${argumentSource == null ? "NOT_SUPPLIED" : JSON.stringify(argumentSource, null, 2)}`,
    "Use the preceding source only to preserve the approved argument and close. Do not imitate its wording, cadence, paragraph movement, or register.",
    `SHARED FIVE-ROLE EVIDENCE PACKET\n${JSON.stringify(context.sharedEvidencePacket, null, 2)}`,
    "Use MEANING only for what the placement means; REGISTER only for how the owner writes; SCENE only for concrete lived detail; ARGUMENT only for the already-approved thesis and close; and PHRASE only as owner-authored wording that is available for use. Never let one role silently stand in for another.",
    `RELEVANT PUBLISHED OWNER PASSAGES — PRIMARY PROSE MODEL\n${JSON.stringify(context.relevantOwnerPassages, null, 2)}`,
    "These actual owner passages control prose behavior. Follow how they enter, move, emphasize, and stop. Do not translate them into a style summary, impose balanced paragraph architecture, or explain an observation after it has already made the point.",
    `EXACT PLANET-SIGN OWNER-APPROVED KNOWLEDGE MATRIX EVIDENCE\n${JSON.stringify(context.knowledgeMatrixExamples, null, 2)}`,
    "The matrix establishes the approved meaning boundary for this exact planet-sign. It is not register evidence. Preserve event-type boundaries: do not copy station or retrograde facts unless the target event and engine facts authorize them.",
    `OWNER-APPROVED MATRIX ARGUMENT CANDIDATES — SUPPORT ONLY\n${JSON.stringify(context.knowledgeMatrixArgumentCandidates, null, 2)}`,
    "These candidates may test or sharpen the approved argument, but they cannot replace the owner-approved argument outline or close.",
    `PRIMARY REGISTER AND CONCRETENESS MODEL\n${JSON.stringify(context.registerGoldExamples, null, 2)}`,
    "The register gold is an additional scene-specificity reference only. It does not control this page's argument, cultural thesis, paragraph architecture, or close. The lived paragraph must name things a reader can picture: the actual decision, the actual cost, and the actual follow-up work.",
    `OWNER-APPROVED SCENE EVIDENCE — DISTINCT FROM REGISTER EVIDENCE\n${JSON.stringify(context.sceneExamples, null, 2)}`,
    "Use scene evidence only for observable objects, actions, costs, and follow-up work. Same-planet-sign house cores are the primary scene bank when available, followed by approved serving rows, then matrix scene rows. Do not import a house claim into a houseless placement article, and do not treat scene evidence as a voice or astrology-meaning authority. Invent a scene only when the packet contains no SCENE evidence; an invented scene must be ordinary, plural, and must never carry the argument alone.",
    `OTHER SAME-FAMILY OWNER PASSAGES — SUPPLEMENTAL\n${JSON.stringify(context.supportingOwnerPassages, null, 2)}`,
    `AVAILABLE LINES — OWNER PHRASE EVIDENCE\n${JSON.stringify(context.phraseExamples, null, 2)}`,
    "These are owner-authored AVAILABLE LINES selected by subject and theme. You may use a line verbatim or adapt it. They are not register examples and they are not correction pairs. Do not force a line into the page, but do not invent a weaker machine phrase when an available owner line already says the needed thing.",
    `OWNER BEFORE/AFTER PAIRS (DIRECT EXAMPLES; KEEP THE OWNER'S STATED REASON)\n${JSON.stringify(context.corrections, null, 2)}`,
    "Write from the meaning plan. Owner material establishes voice and judgment; do not cosmetically paraphrase its narrative."
  ];
  if (isCardWritingSurface({ surface, family })) {
    sections.push(
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
  target,
  family = "sky-placement",
  register = "collective",
  surface = "card",
  familyContext = null,
  engineFacts = null,
  argumentSource = null,
  argumentOutline,
  spine,
  modelClient,
  schema = null
}) {
  if (typeof modelClient !== "function") throw new Error("generateDraft requires an injected modelClient; no implicit billed call is allowed.");
  const resolvedTarget = assertSurfaceRegisterContract(target, { surface, register });
  assertArgumentOutlineApproved(argumentOutline, { plan, family, surface });
  if (!spine || spine.status !== "recorded") throw new Error(`RECORDED_CONTENT_SPINE_REQUIRED:${family}`);
  const role = isCardWritingSurface({ surface, family }) ? "CARD_WRITER_V3" : "WRITER";
  const resolvedSchema = schema ?? (family === "fast-mover-article"
    ? FAST_MOVER_ARTICLE_DRAFT_SCHEMA
    : family === "slow-mover-article"
      ? SLOW_MOVER_ARTICLE_DRAFT_SCHEMA
      : PLACEMENT_DRAFT_SCHEMA);
  const value = await modelClient({
    stage: "draft",
    role,
    instructions: effectiveAstrologyWritingInstructions({ surface, family }),
    input: buildDraftInput({ plan, context, task, target: resolvedTarget, family, register, surface, familyContext, engineFacts, argumentSource, argumentOutline, spine }),
    schema: resolvedSchema
  });
  if (!value || typeof value !== "object") throw new Error("Writer returned no structured draft.");
  return attachGenerationMetadata({
    ...unapprovedDraft(value),
    argumentOutline,
    argumentOutlineHash: argumentOutline.approvedOutlineHash,
    contentSpineId: spine.id
  }, writeGenerationMetadata({
    role,
    provider: modelClient.provider ?? null,
    model: modelClient.model ?? null,
    reasoningEffort: modelClient.reasoningEffort ?? null,
    thinkingLevel: modelClient.thinkingLevel ?? null,
    sourceIds: [
      ...(context.examples ?? []).map((entry) => entry.id ?? entry.fixture_id).filter(Boolean),
      ...(context.phraseExamples ?? []).map((entry) => entry.id).filter(Boolean),
      ...(context.corrections ?? []).map((entry) => entry.fixture_id ?? entry.id).filter(Boolean)
    ],
    evidencePacket: {
      version: context.sharedEvidencePacket.version,
      roles: Object.fromEntries(Object.entries(context.sharedEvidencePacket.roles).map(([evidenceRole, entries]) => [
        evidenceRole,
        entries.map((entry) => entry.id)
      ]))
    }
  }));
}

export { unapprovedDraft };
