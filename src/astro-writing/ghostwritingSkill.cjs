"use strict";

const { INGRESS_WRITER_CONTRACT } = require('./transitIngressEditorialAuthority.cjs');

// Adapted from cdeistopened/skill-stack at 6b2dfeb94b719bc458ec4a4487dea1d5ff76d841.
// The upstream MIT notice is preserved in ghostwritingSkill.LICENSE.txt.
const GHOSTWRITING_SKILL_VERSION = "ghostwriter/v3-2026-10-21";
const GHOSTWRITING_SKILL_SOURCES = Object.freeze({
  repository: "https://github.com/cdeistopened/skill-stack",
  revision: "6b2dfeb94b719bc458ec4a4487dea1d5ff76d841",
  ghostwriterSha256: "39ce0c299ddfbdab239666fc325370e8e53b543409c36810e6e7d9bcfe112436",
  antiAiWritingSha256: "2e82093f8693cc0d44734d4056b3a28aec2dce20161ee0a6a1f12e1ec059b8a9"
});

const GHOSTWRITING_SKILL_INSTRUCTIONS = `GHOSTWRITER CRAFT GUIDANCE ${GHOSTWRITING_SKILL_VERSION}
Apply the Ghostwriter skill and its anti-ai-writing foundation within this writing task. The current owner corrections, complete eligible author passages, saved Content Studio profile, surface-specific format, audience, length, factual boundaries and output schema take precedence over generic craft suggestions. This is editorial guidance, not positive voice evidence or a new approval gate.

SOURCE AND VOICE: Understand the complete supplied material before drafting. Identify its actual insight and intended reader. Preserve the author's meaning and emotional range. Learn how the selected complete author passages notice people, follow a feeling or develop an observation, as well as their cadence and vocabulary. Let curiosity, affection, enthusiasm, humor or seriousness belong when the supported thought calls for them. Warmth does not require an extra reassurance line or an invented problem. Examples supply prose behavior, not new facts, biography or scenarios. Editorial reports and revision notes remain separate from reader copy and do not establish wording approval. Keep protected wording and unrequested fields unchanged.

ASTROLOGICAL DEPTH: Let the licensed astrology explain the human experience. Where relevant to the surface, develop how the planet's function interacts with the sign, element, modality, ruler, house or aspect, and why that changes a feeling, motive, response or consequence. Choose technical explanation for the work it does within that thought; naming every property does not establish depth. Keep planetary topics, sign meaning and calculated houses distinct. A natural-zodiac association cannot establish a house topic for a sign; practical consequences need support from the participating astrology and supplied context. Preserve the declared register: a brief nontechnical card need not become an astrology lesson. Do not force a hidden wound, conflict or psychological explanation where the source meaning supports a simpler observation.

DEVELOP THE THOUGHT: Carry one connected idea far enough for the reader to understand the relationship between its parts. Each sentence adds meaning, a necessary distinction or a consequence. Keep the reason a response can feel compelling when that reason is supported. Explain feelings and behavior in ordinary English that a person could naturally use. Advice and suggestions are not added by default. Supply them only when requested for this field or necessary to its explicitly declared format. Stop once the thought is complete; do not add a closing line that merely restates or decorates the insight. Preserve required output fields and complete owner source passages. Remove repetition and filler without compressing away the insight or flattening it into an administrative instruction.

EDITORIAL PATTERN REVIEW: Apply the shared context-sensitive AI-writing-pattern policy to the complete paragraph. A hard flag needs a material failure: stock advice contributes no specific meaning, planetary personification replaces interpretation, decorative triples contain dispensable items, a rhetorical reversal manufactures emphasis, or ornate abstraction obscures the subject. A review flag examines atmospheric adjectives, abstract words, imagery and emotional descriptions in context. Words such as quiet, soft, deeper, space or weight are not automatic failures. Literal information, necessary distinctions and useful imagery can remain. Ask what is happening, what someone does or expects, what it changes, and what the reader can understand; these are diagnostic questions, not a sentence formula. Preserve natural rhythm and emotional complexity. Clinical explanation and vague reassurance do not repair a rejected thought.

EDIT IN THE SAME WRITING CALL: Read the complete candidate as ordinary prose beside the selected author passages before returning it. Resolve generic coaching, corporate jargon and the contextual pattern findings by rewriting the thought, not swapping synonyms. Preserve useful imagery, rhythm and warranted uncertainty. Never invent numbers, evidence, personal history or certainty to make a sentence sound specific. Hooks, persuasion frameworks, human-desire categories and quotable lines are optional craft tools, never required structures. Do not force fear, status, belonging, a crisis or a slogan onto unrelated astrology. Finish only the requested draft or revision; this guidance adds no model call, automatic rewrite, publication authority or claim of owner approval.`;

function ghostwritingInstructionsForContext({surface = '', family = ''} = {}) {
  return surface === 'sky' && family === 'sky-ingress-essay'
    ? INGRESS_WRITER_CONTRACT.ghostwriter : GHOSTWRITING_SKILL_INSTRUCTIONS;
}

function withGhostwritingSkill(instructions, context = {}) {
  const base = String(instructions ?? "").trim();
  const guidance = ghostwritingInstructionsForContext(context);
  return base.includes(guidance)
    ? base
    : [base, guidance].filter(Boolean).join("\n\n");
}

module.exports = { GHOSTWRITING_SKILL_VERSION, GHOSTWRITING_SKILL_SOURCES,
  GHOSTWRITING_SKILL_INSTRUCTIONS, ghostwritingInstructionsForContext, withGhostwritingSkill };
