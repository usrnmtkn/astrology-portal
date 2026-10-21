"use strict";

// Adapted from cdeistopened/skill-stack at 6b2dfeb94b719bc458ec4a4487dea1d5ff76d841.
// The upstream MIT notice is preserved in ghostwritingSkill.LICENSE.txt.
const GHOSTWRITING_SKILL_VERSION = "ghostwriter/v1-2026-10-20";
const GHOSTWRITING_SKILL_SOURCES = Object.freeze({
  repository: "https://github.com/cdeistopened/skill-stack",
  revision: "6b2dfeb94b719bc458ec4a4487dea1d5ff76d841",
  ghostwriterSha256: "39ce0c299ddfbdab239666fc325370e8e53b543409c36810e6e7d9bcfe112436",
  antiAiWritingSha256: "2e82093f8693cc0d44734d4056b3a28aec2dce20161ee0a6a1f12e1ec059b8a9"
});

const GHOSTWRITING_SKILL_INSTRUCTIONS = `GHOSTWRITER CRAFT GUIDANCE ${GHOSTWRITING_SKILL_VERSION}
Apply the Ghostwriter skill and its anti-ai-writing foundation within this writing task. The current owner corrections, complete eligible author passages, saved Content Studio profile, surface-specific format, audience, length, factual boundaries and output schema take precedence over generic craft suggestions. This is editorial guidance, not positive voice evidence or a new approval gate.

SOURCE AND VOICE: Understand the complete supplied material before drafting. Identify its actual insight and intended reader. Preserve the author's meaning and emotional range. Learn cadence, directness and paragraph development from the selected complete author passages, not from a generic description of the voice. Examples supply prose behavior, not new facts, biography or scenarios. Keep protected wording and unrequested fields unchanged.

ASTROLOGICAL DEPTH: Let the licensed astrology explain the human experience. Where relevant to the surface, develop how the planet's function interacts with the sign, element, modality, ruler, house or aspect, and why that changes a feeling, motive, response or consequence. Naming a placement before generic advice is insufficient. Preserve the declared register: a brief nontechnical card need not become an astrology lesson. Do not force a hidden wound, conflict or psychological explanation where the source meaning supports a simpler observation.

DEVELOP THE THOUGHT: Carry one connected idea far enough for the reader to understand the relationship between its parts. Each sentence adds meaning, a necessary distinction or a consequence. Keep the reason a response can feel compelling when that reason is supported. Advice, examples and endings follow from the interpretation and the saved brief; none is a compulsory slot. Remove repetition and filler without compressing away the insight or flattening it into an administrative instruction.

EDIT IN THE SAME WRITING CALL: Read the complete candidate as ordinary prose before returning it. Rework generic coaching, corporate jargon, unexplained emotional abstraction, manufactured reversals, decorative triples and faux-dramatic fragments in context. Preserve useful imagery, rhythm and warranted uncertainty. Never invent numbers, evidence, personal history or certainty to make a sentence sound specific. Hooks, persuasion frameworks, human-desire categories and quotable lines are optional craft tools, never required structures. Do not force fear, status, belonging, a crisis or a slogan onto unrelated astrology. Finish only the requested draft or revision; this guidance adds no model call, automatic rewrite, publication authority or claim of owner approval.`;

function withGhostwritingSkill(instructions) {
  const base = String(instructions ?? "").trim();
  return base.includes(GHOSTWRITING_SKILL_INSTRUCTIONS)
    ? base
    : [base, GHOSTWRITING_SKILL_INSTRUCTIONS].filter(Boolean).join("\n\n");
}

module.exports = { GHOSTWRITING_SKILL_VERSION, GHOSTWRITING_SKILL_SOURCES,
  GHOSTWRITING_SKILL_INSTRUCTIONS, withGhostwritingSkill };
