"use strict";

const FORECAST_PROSE_DEVELOPMENT_VERSION = 'forecast-prose-development/v1-2026-11-18';
const FORECAST_PROSE_DEVELOPMENT = 'PROSE DEVELOPMENT: Develop the selected astrology in the language and movement of the complete primary owner references. Explain its meaning through the particular feelings, relationships, desires or circumstances it concerns. An astrological definition is useful only when the reader needs it to understand that thought; do not expand a phase or placement label into an abstract introductory definition. A later paragraph or transit must add a distinct implication, reason or experience, rather than deliver the same advice with different planetary names. Supported enjoyment, affection, memory, curiosity and grief deserve room alongside difficulty. Planning fields and knowledge-source commands are not reader language or a sequence to paraphrase. A source recommendation does not make advice, a correction, a boundary or a fresh start necessary. Let the developed thought determine the ending, including when it is complete without advice.';

/** Planning remains in the reviewed, hashed preparation, not the prose input. */
function forecastWriterScope(outline) {
  return { direction: outline?.thesis, boundaries: outline?.scope_guard };
}

/** Preserve complete voice/meaning units; exclude generated argument scaffolding.
 * Lunar phase/sign drafting prompts stay in retrieval/validation: the complete
 * saved lunar passage, matrix meanings and calculated chart license the writer.
 */
function forecastWriterEvidence(context, { lunar = false } = {}) {
  const packet = context.sharedEvidencePacket;
  const keep = entry => entry.role !== 'argument'
    && !(lunar && entry.sourceKind === 'reviewed-doctrine');
  const roles = Object.fromEntries(Object.entries(packet.roles).map(([role, entries]) => [role, entries.filter(keep)]));
  return { ...context, sharedEvidencePacket: { ...packet, roles,
    entries: packet.entries.filter(keep), supportingArgumentCandidates: [],
    counts: Object.fromEntries(Object.entries(roles).map(([role, entries]) => [role, entries.length])) } };
}

module.exports = { FORECAST_PROSE_DEVELOPMENT_VERSION, FORECAST_PROSE_DEVELOPMENT, forecastWriterScope, forecastWriterEvidence };
