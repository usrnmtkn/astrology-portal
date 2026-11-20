"use strict";

const { FORECAST_PROSE_DEVELOPMENT_VERSION, FORECAST_PROSE_DEVELOPMENT } = require('./forecastProsePolicy.cjs');

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
