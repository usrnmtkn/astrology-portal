"use strict";

// Semantic authority, not a prose profile. Owner direction: 2026-10-06,
// thread:01a11216-18b5-7f83-af91-fa040ad41096. No reader copy lives here.
const crypto = require('node:crypto');
const { buildPacket, assertPacket } = require('../../packages/astro-knowledge/scripts/knowledge-resolver.js');
const VERSION = 'transit-natal-semantics-v1';
const SOURCE = Object.freeze({ path: 'src/astro-writing/transitNatalSemantics.cjs',
  ruling: 'thread:01a11216-18b5-7f83-af91-fa040ad41096', date: '2026-10-06',
  role: 'owner-directed-semantic-mechanics', readerCopy: false });
const digest = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const freeze = value => { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } return value; };

const ASPECT_MECHANISMS = freeze({
  conjunction: { operation: 'direct concentration',
    mechanism: 'The transiting process and natal domain occupy the same territory; the issue becomes central rather than peripheral.',
    constraints: ['No automatic positive or negative valuation.'] },
  sextile: { operation: 'usable opening',
    mechanism: 'Room to handle the transiting process differently within the natal domain; participation is required to use that room.',
    constraints: ['An opening does not itself produce a result.', 'Do not substitute a generic opportunity claim for the mechanism.'] },
  trine: { operation: 'lower resistance',
    mechanism: 'The transiting process moves through the natal domain with less friction; a change, decision, or pattern can be established or recognized with less resistance.',
    constraints: ['Do not infer luck, absence of effort, or automatic benefit.'] },
  square: { operation: 'pressure requiring adjustment',
    mechanism: 'The transiting process makes the existing approach within the natal domain harder to continue; behavior, expectations, timing, limits, or strategy require concrete adjustment.',
    constraints: ['Conflict alone does not explain the mechanism.'] },
  opposition: { operation: 'external encounter and differentiation',
    mechanism: 'The issue becomes visible through another person, a circumstance, a competing demand, or external reality; response, negotiation, or clearer differentiation is required.',
    constraints: ['Do not assume relationship conflict when the natal domain does not concern relationships.'] }
});
// These refinements constrain only temporary transit interpretation. They do
// not replace body or natal doctrine elsewhere in the product.
const BODY_REFINEMENTS = freeze({
  saturn: ['define', 'limit', 'formalize', 'require follow-through', 'expose what is unsustainable', 'make consequences and realistic capacity concrete'],
  chiron: ['a sensitive place becomes more workable through awareness and experience']
});
const DOMAIN_REFINEMENTS = freeze({
  descendant: ['one-to-one relationships', 'agreements', 'expectations', 'reciprocity', 'terms negotiated with another person'],
  ascendant: ['entering situations', 'acting', 'responding', 'presenting oneself', 'handling immediate demands'],
  sun: ['visibility', 'authorship', 'recognition', 'confidence in acting as oneself', 'taking up a role', 'claiming what belongs to the person']
});
const CONSTRAINTS = freeze([
  'The body supplies the process; the natal target supplies its domain; the aspect supplies how the process reaches that domain.',
  'No permanent personality claim, specific biography, childhood event, rejection, motive, or origin of a sensitivity is licensed by this packet.',
  'A deadline, refusal, new setting, or practical constraint requires independent source evidence; do not infer an event from a mechanism.',
  'No sign, house, timing, or guaranteed event may be inferred. Additional calculated facts must supply those details.',
  'The semantic layers do not supply vocabulary, voice, or finished sentences.'
]);

class TransitNatalRetrievalError extends Error {
  constructor(code, detail = {}) { super(`${code}:${JSON.stringify(detail)}`); this.code = code; this.detail = detail; this.classification = 'failed-retrieval'; }
}
function aspectMechanism(aspect) {
  if (!Object.hasOwn(ASPECT_MECHANISMS, aspect)) throw new TransitNatalRetrievalError('TRANSIT_NATAL_ASPECT_UNSUPPORTED', { aspect });
  const record = { aspect, ...ASPECT_MECHANISMS[aspect], source: SOURCE };
  return freeze({ ...record, sha256: digest(record) });
}
function subjectLayer(subject, role) {
  const canonicalId = `body/${String(subject).replaceAll('-', '_')}`;
  const evidencePacket = buildPacket(canonicalId, { surface: 'you-transit', register: 'card',
    targetUsage: 'mechanism-reference', includeRelated: false,
    recordFilter: entry => entry.authorityClass === 'factual-evidence' && ['overview', 'plainTranslation', 'policy'].includes(entry.field),
    filterId: 'transit-natal-subject-mechanism-v1' });
  const evidence = evidencePacket.evidence.filter(entry => entry.authorityClass === 'factual-evidence'
    && ['overview', 'plainTranslation', 'policy'].includes(entry.field));
  if (!evidence.length) throw new TransitNatalRetrievalError('TRANSIT_NATAL_SUBJECT_MEANING_MISSING', { subject, role });
  const refinement = (role === 'transiting-body' ? BODY_REFINEMENTS : DOMAIN_REFINEMENTS)[subject];
  return { role, subject, canonicalId, mechanics: refinement ?? evidence.map(entry => entry.text),
    ...(refinement ? { refinementSource: SOURCE } : {}),
    evidence, sourcePacket: evidencePacket, sourcePacketSha256: evidencePacket.packetSha256 };
}
function resolveTransitNatalSemantics({ transiting, natal, aspect }) {
  // Check the aspect before any broader knowledge lookup. Never map soft/hard
  // or an unsupported minor aspect to a major aspect to obtain a passage.
  const aspectLayer = aspectMechanism(aspect);
  try {
    const packet = { version: VERSION, identity: { transiting, natal, aspect },
      transitingBody: subjectLayer(transiting, 'transiting-body'),
      natalTarget: subjectLayer(natal, 'natal-target'), aspect: aspectLayer,
      constraints: CONSTRAINTS, readerCopy: false };
    return freeze({ ...packet, packetSha256: digest(packet) });
  } catch (error) {
    if (error.classification === 'failed-retrieval') throw error;
    throw new TransitNatalRetrievalError('TRANSIT_NATAL_SEMANTIC_SOURCE_UNAVAILABLE', { cause: error.message });
  }
}
function assertTransitNatalSemantics(packet, facts) {
  if (!packet) throw new TransitNatalRetrievalError('TRANSIT_NATAL_SEMANTIC_PACKET_REQUIRED');
  const { packetSha256, ...payload } = packet;
  if (packetSha256 !== digest(payload) || packet.version !== VERSION
    || digest(packet.identity) !== digest({ transiting: facts?.transiting, natal: facts?.natal, aspect: facts?.aspect })
    || digest(packet.aspect) !== digest(aspectMechanism(facts?.aspect)) || digest(packet.constraints) !== digest(CONSTRAINTS)) {
    throw new TransitNatalRetrievalError('TRANSIT_NATAL_SEMANTIC_PACKET_DRIFT');
  }
  for (const [layer, subject, role, refinements] of [
    [packet.transitingBody, facts.transiting, 'transiting-body', BODY_REFINEMENTS],
    [packet.natalTarget, facts.natal, 'natal-target', DOMAIN_REFINEMENTS]
  ]) {
    const canonicalId = `body/${subject.replaceAll('-', '_')}`;
    if (!layer?.sourcePacket || layer.subject !== subject || layer.role !== role || layer.canonicalId !== canonicalId
      || layer.sourcePacketSha256 !== layer.sourcePacket.packetSha256
      || digest(layer.evidence) !== digest(layer.sourcePacket.evidence)
      || !layer.evidence.length || layer.evidence.some(entry => entry.authorityClass !== 'factual-evidence')
      || digest(layer.mechanics) !== digest(refinements[subject] ?? layer.evidence.map(entry => entry.text))) {
      throw new TransitNatalRetrievalError('TRANSIT_NATAL_SEMANTIC_PACKET_DRIFT');
    }
    assertPacket(layer.sourcePacket, { canonicalId, surface: 'you-transit', register: 'card' });
  }
  return packet;
}

module.exports = { VERSION, ASPECT_MECHANISMS, aspectMechanism, resolveTransitNatalSemantics,
  assertTransitNatalSemantics, TransitNatalRetrievalError };
