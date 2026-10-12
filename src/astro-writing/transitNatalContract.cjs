'use strict';
const { createHash } = require('node:crypto');
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const variables = text => [...new Set([...String(text).matchAll(/\{\{\s*([A-Za-z][A-Za-z0-9]*)\s*\}\}/gu)].map(m => m[1]))].sort();
const supported = ['Name', 'untilDate', 'aspectWord'];
const exactAspect = key => String(key).match(/^authored\/transit-aspect\/[^/]+\/[^/]+\/(conjunction|sextile|square|trine|opposition)(?:\/|$)/u)?.[1] ?? null;
const aspectVerb = aspect => ({ conjunction: 'conjunct', opposition: 'opposite' }[aspect] ?? aspect);
function names(value) {
  if (!Array.isArray(value) || value.some(v => typeof v !== 'string' || !supported.includes(v))) throw new Error('TRANSIT_PLACEHOLDER_LIST_INVALID');
  return [...new Set(value)].sort();
}

/** Row metadata establishes date/name requirements. Exact aspects are already
 * fixed by the destination key: the reader's optional String.replace does not
 * require an aspectWord token. Never inherit that legacy shared-row slot. */
function transitNatalPlaceholderContract(record, audience, contentKey) {
  if (!record || (record.contentKey ?? record.content_key) !== contentKey) throw new Error('TRANSIT_DESTINATION_RECORD_REQUIRED');
  if (!['you', 'friend'].includes(audience)) throw new Error('TRANSIT_NATAL_AUDIENCE_REQUIRED');
  const field = audience === 'you' ? 'body_you' : 'body_they';
  const body = record[field] ?? (audience === 'you' ? record.body : '') ?? '';
  if (typeof body !== 'string') throw new Error('TRANSIT_DESTINATION_BODY_INVALID');
  const explicit = record.placeholderContracts?.[field];
  if (explicit && (!Array.isArray(explicit.requiredPlaceholders) || !Array.isArray(explicit.allowedPlaceholders))) throw new Error('TRANSIT_PLACEHOLDER_LIST_INVALID');
  const aspect = exactAspect(contentKey);
  const rawRequired = names(explicit?.requiredPlaceholders ?? record.requiredSlots ?? variables(body));
  const rawAllowed = names(explicit?.allowedPlaceholders ?? [...rawRequired, ...(record.optionalSlots ?? [])]);
  const required = rawRequired.filter(name => !aspect || name !== 'aspectWord');
  const allowed = rawAllowed.filter(name => !aspect || name !== 'aspectWord');
  // You never takes the friend's name, even when a shared row permits it.
  if (audience === 'you') {
    if (required.includes('Name')) throw new Error('TRANSIT_NAME_REQUIRED_IN_YOU');
    const nameIndex = allowed.indexOf('Name');
    if (nameIndex >= 0) allowed.splice(nameIndex, 1);
  }
  if (required.some(name => !allowed.includes(name))) throw new Error('TRANSIT_REQUIRED_PLACEHOLDER_NOT_ALLOWED');
  const contract = { version: 'transit-placeholder-v2', contentKey, audience, field,
    ...(aspect ? { aspectRendering: { mode: 'literal', aspect, verb: aspectVerb(aspect) } } : {}),
    destinationRecordSha256: digest(record), requiredPlaceholders: required, allowedPlaceholders: allowed };
  return { ...contract, contractSha256: digest(contract) };
}
function assertTransitNatalPlaceholderContract(contract, { contentKey, audience } = {}) {
  if (!contract) throw new Error('TRANSIT_DESTINATION_CONTRACT_REQUIRED');
  const { contractSha256, ...body } = contract;
  if (digest(body) !== contractSha256 || contract.version !== 'transit-placeholder-v2'
    || !/^[a-f0-9]{64}$/u.test(contract.destinationRecordSha256 ?? '')
    || (contentKey && contentKey !== contract.contentKey) || (audience && audience !== contract.audience)) throw new Error('TRANSIT_DESTINATION_CONTRACT_DRIFT');
  const required = names(contract.requiredPlaceholders), allowed = names(contract.allowedPlaceholders);
  const aspect = exactAspect(contract.contentKey);
  if (aspect && (allowed.includes('aspectWord') || JSON.stringify(contract.aspectRendering) !== JSON.stringify({ mode: 'literal', aspect, verb: aspectVerb(aspect) }))) throw new Error('TRANSIT_EXACT_ASPECT_MUST_BE_LITERAL');
  if (required.some(name => !allowed.includes(name)) || (contract.audience === 'you' && allowed.includes('Name'))) throw new Error('TRANSIT_PLACEHOLDER_CONTRACT_INVALID');
  return contract;
}
function assertTransitNatalRequestContract(contract, { expectedPlaceholders, licensedVariables, instruction = '' } = {}) {
  assertTransitNatalPlaceholderContract(contract);
  for (const [value, expected] of [[expectedPlaceholders, contract.requiredPlaceholders], [licensedVariables, contract.allowedPlaceholders]]) {
    if (value !== undefined && JSON.stringify(names(value)) !== JSON.stringify(expected)) throw new Error('TRANSIT_PLACEHOLDER_INPUT_CONFLICT');
  }
  // Detect explicit legacy optional/required contradictions; not a general
  // natural-language judge. Original owner plans/examples remain intact evidence.
  for (const sentence of String(instruction).split(/(?<=[.!?])\s+|\n/u)) {
    for (const name of variables(sentence)) {
      if (contract.requiredPlaceholders.includes(name) && /\b(?:if needed|optional|if necessary|may omit)\b/iu.test(sentence)) throw new Error('TRANSIT_REQUIRED_PLACEHOLDER_CALLED_OPTIONAL');
      if (!contract.allowedPlaceholders.includes(name) && /\b(?:use|emit|include|required|allowed)\b/iu.test(sentence)
        && !/\b(?:do not|never|not allowed|not licensed)\b/iu.test(sentence)) throw new Error('TRANSIT_UNLICENSED_PLACEHOLDER_INSTRUCTION');
    }
  }
}
function transitNatalContractPrompt(contract) {
  assertTransitNatalPlaceholderContract(contract);
  return [
    'DESTINATION PLACEHOLDER CONTRACT (hard input contract)', JSON.stringify(contract, null, 2),
    'Emit every requiredPlaceholders entry at least once. Only allowedPlaceholders entries may appear, using exact double-brace names. Allowed entries that are not required are optional. Repetition does not create another requirement. Do not invent dates.',
    'This contract alone controls variable rendering. Task notes, semantic plans and previous copy do not grant placeholder permissions. Names in semantic evidence identify the subject; they are not instructions to print a variable.',
    ...(contract.aspectRendering ? [`The exact aspect is fixed. When naming it, write the literal ${contract.aspectRendering.verb} with normal sentence grammar. Do not emit {{aspectWord}}.`] : []),
    ...(contract.audience === 'friend' ? [contract.allowedPlaceholders.includes('Name')
      ? 'The destination licenses {{Name}}. Use they/them/their for the established person. Use {{Name}} only when required by this contract or to resolve genuine ambiguity.'
      : 'Do not emit a name placeholder. The person is already established; use they/them/their.'] : ['Address the reader as you. Do not emit {{Name}}.'])
  ].join('\n');
}
function transitNatalPlaceholderFindings(text, contract) {
  assertTransitNatalPlaceholderContract(contract);
  const actual = variables(text);
  const findings = [];
  for (const name of contract.requiredPlaceholders) if (!actual.includes(name)) findings.push({ category: 'placeholder_integrity', detail: `Missing required {{${name}}}.` });
  for (const name of actual) if (!contract.allowedPlaceholders.includes(name)) findings.push({ category: 'placeholder_integrity', detail: `Unlicensed {{${name}}}.` });
  const leftover = text.replace(/\{\{[A-Za-z][A-Za-z0-9]*\}\}/gu, '');
  if (leftover.includes('{{') || leftover.includes('}}')) findings.push({ category: 'placeholder_integrity', detail: 'Malformed or non-exact placeholder syntax.' });
  return findings;
}
module.exports = { transitNatalPlaceholderContract, assertTransitNatalPlaceholderContract, assertTransitNatalRequestContract, transitNatalContractPrompt, transitNatalPlaceholderFindings };
