import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeSynastryBodyWithOpenAI, type GenerateContentInput } from './content-generation.js';
import { loadExplicitWritingFeedback } from './studio-explicit-writing-feedback.js';
import { ownerPositiveEvidenceFromVoiceIndexBySourceIds } from '../../src/astro-writing/ownerPositiveEvidence.mjs';
import { assertSynastryMeaningComplete, designatedSynastryVoiceReferences, prepareSynastrySourceInput, synastryContactOwnership, synastrySourceReceipt } from '../../src/astro-writing/synastrySourceContext.cjs';
import { governedInstructionsForRole } from '../../src/astro-writing/openAIResponses.cjs';
import { prepareProductionPreCallGate, assertProductionPreCallGate } from '../../src/astro-writing/productionPreCallGate.cjs';
import { validateCopy } from '../../src/astro-writing/validateCopy.mjs';
import { governValidationResult } from '../../src/astro-writing/effectiveRuleGovernance.mjs';
import { assertCleanReaderCopy } from '../../apps/web/src/content/editorialCopyBoundary.mjs';
import { withApprovedSynastryVoice, synastryVoicePromptReferences } from './synastry-approved-voice.cjs';

export const SYNASTRY_BODY_WRITER_VERSION = 'synastry-body/v3-2026-10-25';
const context = { surface: 'synastry', family: 'synastry-aspect' };
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const hash = (value: unknown) => createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(value)).digest('hex');
const normalize = (value: unknown) => String(value ?? '').toLowerCase();
const fail = (reason: string): never => { throw new Error(`SYNASTRY_BODY_HELD: ${reason}`); };
type Reference = { path: string; text: string; sha256: string; [key: string]: unknown };
type Selection = { ownerSourceIds: string[]; reason: string };

export class RejectedSynastryBodyError extends Error {
  constructor(message: string, readonly candidate: { raw: unknown; responseId: string | null; requestSha256: string }) {
    super(message);
    this.name = 'RejectedSynastryBodyError';
  }
}

export const synastryBodySchema = {
  type: 'object', additionalProperties: false, required: ['body'],
  properties: { body: { type: 'string' } }
};

function verifiedSources(input: GenerateContentInput) {
  const snapshot = input.sourceSnapshot ?? {};
  const sources = snapshot.knowledgeSources as Array<{ path: string; sha256: string; record: Record<string, unknown> }>;
  if (!Array.isArray(sources) || !sources.length) fail('Complete directional knowledge sources are required.');
  const members = Array.isArray(input.facts.aspectFamilyMembers) ? input.facts.aspectFamilyMembers.map(normalize) : [normalize(input.facts.aspect)];
  if (!members.length || members.some(member => !['conjunction', 'square', 'opposition', 'trine', 'sextile'].includes(member))
    || new Set(members).size !== members.length) fail('Explicit supported aspect members are required.');
  const expected = input.facts.aspect === 'hard' ? ['opposition', 'square'] : input.facts.aspect === 'soft' ? ['sextile', 'trine'] : [normalize(input.facts.aspect)];
  if (JSON.stringify([...members].sort()) !== JSON.stringify(expected.sort())) fail('The aspect family and its members disagree.');
  if (sources.length !== members.length) fail('Every member needs its own directional source.');
  const seen = new Set<string>();
  for (const source of sources) {
    if (typeof source.path !== 'string' || !/^packages\/astro-knowledge\/data\/synastry\/aspects\/[a-zA-Z0-9_-]+\.json$/u.test(source.path)) fail('Unregistered knowledge source.');
    const original = fs.readFileSync(path.join(root, source.path), 'utf8');
    if (hash(original) !== source.sha256 || JSON.stringify(JSON.parse(original)) !== JSON.stringify(source.record)) fail('Directional knowledge changed.');
    const record = source.record;
    if (record.kind !== 'interaspect' || normalize(record.planetA) !== normalize(input.facts.planetA)
      || normalize(record.planetB) !== normalize(input.facts.planetB) || !members.includes(normalize(record.aspect))
      || seen.has(normalize(record.aspect)) || typeof record.plainTranslation !== 'string' || !record.plainTranslation.trim()) fail('Knowledge ownership or aspect does not match the target.');
    assertSynastryMeaningComplete(record);
    seen.add(normalize(record.aspect));
  }
  for (const reference of (snapshot.bookReferences ?? []) as Reference[]) {
    if (typeof reference.text !== 'string' || !reference.text.trim() || !reference.path || hash(reference.text) !== reference.sha256) fail('A complete book reference changed.');
  }
  const previous = snapshot.existingDraft as Reference | undefined;
  if (previous && (typeof previous.text !== 'string' || hash(previous.text) !== previous.sha256)) fail('The preserved existing draft changed.');
  designatedSynastryVoiceReferences(snapshot);
}

function selectedOwnerEvidence(selection: Selection) {
  if (!Array.isArray(selection.ownerSourceIds) || new Set(selection.ownerSourceIds).size !== selection.ownerSourceIds.length
    || !selection.reason?.trim()) fail('Record the deliberate evidence selection and its reason.');
  const index = JSON.parse(fs.readFileSync(path.join(root, 'packages/astro-knowledge/voice/tldr-astro/satori-writer/voice-index.json'), 'utf8'));
  const sources = ownerPositiveEvidenceFromVoiceIndexBySourceIds(index, selection.ownerSourceIds, 'synastry-body');
  for (const source of sources) {
    const entry = index.entries.find((candidate: { sourceId: string }) => candidate.sourceId === source.id);
    if (entry.useAsNegativeEvidence === true || hash(source.text) !== source.sourceRecordSha256) fail('An owner evidence unit is ineligible or changed.');
  }
  return sources;
}

/** Private bulk preparation only. No provider call, draft save, or publication. */
export async function prepareSynastryBodyWriting(input: GenerateContentInput, selection: Selection) {
  if (input.surface !== 'synastry' || input.eventType !== 'synastry-aspect' || input.mode !== 'in_depth'
    || input.reportPayload || input.provider && input.provider !== 'openai') fail('This path is for OpenAI directional synastry library bodies only.');
  const ownership = synastryContactOwnership(input.facts);
  if (!ownership.readerPerson) fail('An explicit reader is required.');
  verifiedSources(input);
  const evidenceInput = withApprovedSynastryVoice(input);
  const originalEvidence = selectedOwnerEvidence(selection);
  const designated = designatedSynastryVoiceReferences(evidenceInput.sourceSnapshot);
  const voiceReferences = synastryVoicePromptReferences(evidenceInput.sourceSnapshot);
  if (!originalEvidence.length && !designated.length) fail('Complete eligible prose evidence is required.');
  const feedback = await loadExplicitWritingFeedback(input);
  if (feedback.receipt.enabled !== true) fail('Current owner feedback must be enabled and available.');
  const positive = [...originalEvidence.map(source => source.text), ...voiceReferences.primaryNatalStyleBenchmarks.map((source: Reference) => source.text), ...designated.map((source: Reference) => source.text)];
  if (feedback.rows.some(row => positive.some(text => text === row.rejected_text || row.rejected_text.includes(text)))) fail('Rejected wording cannot be a positive voice reference.');
  const projected = prepareSynastrySourceInput(evidenceInput);
  const gate = prepareProductionPreCallGate(projected);
  assertProductionPreCallGate(gate, { role: 'WRITER', input: projected });
  const reader = ownership.readerPerson === 'A' ? ownership.personA : ownership.personB;
  const other = ownership.readerPerson === 'A' ? ownership.personB : ownership.personA;
  // Bulk metadata and the duplicate neutralKnowledge are retained in the input
  // receipt. Neither is a prose task or an additional source of interpretation.
  const { neutralKnowledge: _neutral, perspective: _perspective, aspectScope: _scopeNotes, ...facts } = projected.facts;
  const { bulkTarget: _target, positiveVoiceReferences: _references, primarySynastryStyleReferences: _primaryStyleReferences, synastrySourceContext: _projection,
    existingDraft: _existingDraft, protectedSynastryVoice: _protectedVoice, ...sources } = projected.sourceSnapshot ?? {};
  const prompt = [
    'TASK\nWrite only the complete directional synastry body for owner review. Return {"body":"..."}. No other fields are requested.',
    'SUPPLIED FACTS', JSON.stringify(facts, null, 2),
    'READER\n' + JSON.stringify({ readerPlanet: reader.planet, otherPlanet: other.planet, otherPerson: other.name }),
    'KNOWLEDGE\nThese sources establish supported meaning, never wording to imitate. This is a fresh draft. The previous draft is preserved in the private audit input and is not a prose model. Preserve sign independence when signs are absent. An aspect family uses only meaning supported across all supplied members.',
    JSON.stringify(sources, null, 2),
    gate.governedPromptEnabled ? `GOVERNED KNOWLEDGE\n${gate.governedPrompt}` : '',
    feedback.prompt ? `REJECTED WRITING AND CURRENT OWNER CORRECTIONS\n${feedback.prompt}\nEND REJECTED WRITING` : '',
    input.voiceNotes ? `CURRENT TASK NOTES\n${input.voiceNotes}` : '',
    'COMPLETE VOICE REFERENCES\nUse these for ordinary language, development, rhythm and emotional range only. Their facts, scenes, signs, timing and aspect mechanisms do not transfer. Current corrections override historical wording. Do not turn an opposition example into a compulsory conflict for a supportive contact.',
    JSON.stringify({ originalOwnerPassages: originalEvidence, ...voiceReferences }, null, 2),
    'WRITE THE BODY\n' + `Address the ${reader.planet} person as you. The other person owns ${other.planet}. Use only their supplied name or licensed variable when needed; they is also available. `
      + 'Develop the source-supported interpretation in connected prose. Let the astrology explain the interaction naturally. Do not produce planning fields, summaries, headings, report transitions, internal Person A/B labels or an astrology drilldown. Do not add suggestions or advice unless explicitly requested. No required problem, cycle, lesson or closing reassurance. No em dashes. Return only the body JSON.'
  ].filter(Boolean).join('\n\n');
  const model = process.env.OPENAI_GENERATION_MODEL ?? process.env.OPENAI_MODEL ?? 'gpt-4.1-mini';
  const instructions = governedInstructionsForRole('WRITER', context);
  const request = { model, max_output_tokens: 4096, input: prompt,
    text: { format: { type: 'json_schema', name: 'tldr_astro_synastry_body', strict: true, schema: synastryBodySchema } } };
  return { version: SYNASTRY_BODY_WRITER_VERSION, input, selection, request, instructions,
    receipt: { inputSha256: hash(input), requestSha256: hash({ ...request, instructions }), feedback: feedback.receipt,
      sourceContext: synastrySourceReceipt(projected), selectionReason: selection.reason,
      protectedVoice: evidenceInput.sourceSnapshot?.protectedSynastryVoice ?? null,
      primaryStyleReferences: voiceReferences.primaryNatalStyleBenchmarks.map((source: Reference) => ({ path: source.path, sha256: source.sha256 })),
      existingDraft: _existingDraft ? { sha256: (_existingDraft as Reference).sha256, sentToWriter: false } : null,
      originalOwnerPassages: originalEvidence.map(source => ({ sourceId: source.id, sourcePath: source.sourcePath,
        textSha256: hash(source.text), wordCount: source.text.trim().split(/\s+/u).length })),
      providerCalls: 0, generationAuthorized: false, ownerApproved: false, promotionAuthorized: false } };
}

export function validateSynastryBody(raw: unknown, input: GenerateContentInput) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw) || Object.keys(raw).length !== 1
    || !Object.hasOwn(raw, 'body') || typeof (raw as { body: unknown }).body !== 'string') fail('The writer must return only body.');
  const body = (raw as { body: string }).body;
  if (!body.trim() || /\bPerson [AB]\b/u.test(body) || /^\s*#/mu.test(body)) fail('The body is empty or contains drafting metadata.');
  try { assertCleanReaderCopy({ body }); } catch { fail('The body contains internal drafting notes.'); }
  if (!/\b(?:you|your|yours|yourself)\b/iu.test(body)) fail('The body must address the declared reader.');
  if (body.includes('—')) fail('Deterministic copy checks failed: em_dash');
  const ownership = synastryContactOwnership(input.facts);
  const other = ownership.readerPerson === 'A' ? ownership.personB : ownership.personA;
  const licensed = new Set(String(other.name ?? '').match(/\{\{[a-zA-Z0-9_]+\}\}/gu) ?? []);
  const placeholders = body.match(/\{\{[^{}]*\}\}/gu) ?? [];
  if (placeholders.some(token => !licensed.has(token)) || /[{}]/u.test(body.replace(/\{\{[^{}]*\}\}/gu, ''))) fail('An unlicensed variable appeared.');
  const validation = governValidationResult(validateCopy({ body }, { ...context, validationProfile: 'synastry',
    register: 'second_person', requiredFields: ['body'], expectedPlaceholders: placeholders.map(token => token.slice(2, -2)) }), context);
  if (!validation.passed) fail('Deterministic copy checks failed: ' + validation.violations.map(finding => finding.category).join(', '));
  return { body, validation };
}

/** One explicitly authorized call; the caller owns budget/resumption authority.
 * There is deliberately no HTTP route, retry, model judge, save, or promotion. */
export async function generateSynastryBody(prepared: Awaited<ReturnType<typeof prepareSynastryBodyWriting>>) {
  const current = await prepareSynastryBodyWriting(prepared.input, prepared.selection);
  if (prepared.version !== current.version || hash(prepared.request) !== hash(current.request)
    || prepared.instructions !== current.instructions || hash(prepared.receipt) !== hash(current.receipt)) fail('Prepared sources, model, instructions or current feedback changed. Prepare a new request for review.');
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) fail('A server provider credential is required.');
  const { response, payload } = await writeSynastryBodyWithOpenAI(current.input, current.request);
  if (!response.ok) fail(`Provider returned ${response.status}; no automatic retry was started.`);
  const output = payload as { status?: string; id?: string; output_text?: string;
    output?: Array<{ content?: Array<{ text?: string }> }> };
  if (output.status === 'incomplete') fail('Provider output is incomplete.');
  const text = output.output_text ?? output.output?.flatMap(item => item.content ?? []).map(item => item.text ?? '').join('');
  let raw: unknown;
  try { raw = JSON.parse(text ?? ''); } catch { fail('Provider output is not complete JSON.'); }
  let result: ReturnType<typeof validateSynastryBody>;
  try { result = validateSynastryBody(raw, current.input); }
  catch (error) { throw new RejectedSynastryBodyError(error instanceof Error ? error.message : 'Synastry body held.',
    { raw, responseId: output.id ?? null, requestSha256: current.receipt.requestSha256 }); }
  return { ...result, model: current.request.model, responseId: output.id ?? null, receipt: current.receipt,
    requestSha256: current.receipt.requestSha256, bodySha256: hash(result.body), providerCalls: 1,
    needs_review: true, ownerApproved: false, promotionAuthorized: false, canonical: false };
}
