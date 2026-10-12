import { validatePassage, identity } from './personalTransitPassageValidation.mjs';
// Local owner-reviewed authoring prototype. No provider, credential or publication client.
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import contracts from './transitNatalContract.cjs';
import semantics from './transitNatalSemantics.cjs';
import { PERSONAL_TRANSIT_READER_RULES, READER_RULES_SHA256 } from './personalTransitReaderRules.mjs';
import { personalTransitMeaningProjection } from './personalTransitMeaningProjection.mjs';
import { feedbackForContact, feedbackForWriter, inspectCalibration } from './personalTransitInputControls.mjs';
import { buildPersonalTransitWriterContext } from './personalTransitWriterContext.mjs';

export const sha256 = value => createHash('sha256').update(typeof value === 'string' || Buffer.isBuffer(value) ? value : JSON.stringify(value)).digest('hex');
export const MODEL = Object.freeze({ provider: 'Google', model: 'gemini-3.8-flash', endpoint: 'https://generativelanguage.googleapis.com/v1beta/interactions', generation_config: { thinking_level: 'medium', max_output_tokens: 8192, thinking_summaries: 'none' }, store: false });
export { PERSONAL_TRANSIT_WRITER_INSTRUCTION as WRITER_INSTRUCTION } from './personalTransitWriterContext.mjs';
export { identity } from './personalTransitPassageValidation.mjs';
const verb = a => ({ conjunction: 'conjunct', opposition: 'opposite' }[a] ?? a);
const display = s => s.split('-').map(x => x[0].toUpperCase() + x.slice(1)).join(' ');
export function prepareBatch({ id, records, examples, readerMeanings, provenance, friendEvidencePolicy = 'blocked', voiceSetStatus = 'current', feedback = null, calibration = null, calibrationMeanings = readerMeanings, evaluationPermission = null, sources = null, responseFormat = 'passage' }) {
  if (!/^[a-z0-9-]+$/u.test(id) || records.length !== 4 || new Set(records.map(r => r.contentKey)).size !== 4) throw Error('EXACTLY_FOUR_UNIQUE_CONTACTS_REQUIRED');
  if (!['blocked','owner-authorized-you-voice'].includes(friendEvidencePolicy)) throw Error('FRIEND_EVIDENCE_POLICY_INVALID');
  examples ??= sources?.passages;
  if (!examples?.length || (!sources && ['body_you','body_they'].some(field => examples.filter(e => e.field === field).length > 3))) throw Error('PREFERRED_EVIDENCE_REQUIRED');
  if (new Set(examples.map(e => `${e.contentKey}:${e.field}`)).size !== examples.length) throw Error('DUPLICATE_EVIDENCE');
  for (const e of examples) {
    if ((!sources && !e.preferred) || (!e.ownerApproved && !(e.ownerAuthored && (voiceSetStatus === 'proposed' || (e.role === 'positive-voice-evidence' && e.roleSource && e.roleTextSha256 === e.sha256)))) || !['body_you','body_they'].includes(e.field) || !e.source || e.sha256 !== sha256(e.text)) throw Error('EVIDENCE_INTEGRITY');
    if (!sources && records.some(r => r.contentKey === e.contentKey || r.contentKey === e.targetContentKey)) throw Error('TARGET_EVIDENCE_LEAKAGE');
  }
  if (!Array.isArray(readerMeanings) || readerMeanings.length !== records.length) throw Error('READER_MEANING_REQUIRED_FOR_EACH_CONTACT');
  if (new Set(readerMeanings.map(m => m.contentKey)).size !== readerMeanings.length ||
      readerMeanings.some(m => !records.some(r => r.contentKey === m.contentKey))) throw Error('READER_MEANING_TARGET_SET_MISMATCH');
  const calibrationReview = inspectCalibration(calibration, calibrationMeanings, evaluationPermission);
  const contacts = records.map(record => {
    const facts = identity(record.contentKey);
    const semanticPacket = semantics.resolveTransitNatalSemantics(facts);
    semantics.assertTransitNatalSemantics(semanticPacket, facts);
    const projection = personalTransitMeaningProjection(record.contentKey, semanticPacket, readerMeanings.find(m => m.contentKey === record.contentKey), {allowProposed:true});
    const currentFeedback = feedback ? feedbackForContact(feedback,record.contentKey,readerMeanings.find(m=>m.contentKey===record.contentKey),[]) : null;
    const title = `${display(facts.transiting)} ${verb(facts.aspect)} ${display(facts.natal)}`;
    const passages = ['you','friend'].map(perspective => {
      const contract = contracts.transitNatalPlaceholderContract(record, perspective, record.contentKey);
      const passages = examples.map((e,index) => ({...e,
        id:e.id ?? e.sourceId ?? `voice-${index}`, status:e.status ?? 'current',
        sourceSha256:e.sourceSha256 ?? e.sourceFileSha256 ?? sha256(e.source),
        role:e.role ?? 'positive-voice-evidence',roleSource:e.roleSource ?? e.source,roleTextSha256:e.roleTextSha256 ?? e.sha256,
        ...(friendEvidencePolicy === 'owner-authorized-you-voice' && !e.perspectiveUse ? {perspectiveUse:{audiences:['you','friend'],source:'owner-authorized-you-voice policy in the private input plan'}} : {})
      }));
      const context = buildPersonalTransitWriterContext({contentKey:record.contentKey,...facts,requested:[perspective],
        instruction:'',record,youText:'',friendText:'',facts:{}},
        {schema:'personal-transit-writing-sources/v1',version:sources?.version ?? 'owner-batch-v2',passages,meanings:readerMeanings,
          ...(sources?.stylePhrases !== undefined ? {stylePhrases:sources.stylePhrases} : {}),
          ...(feedback ? {feedback:feedbackForWriter(feedback)} : sources?.feedback ? {feedback:sources.feedback} : {})},
        {responseFormat,permitMissingEvidenceForPreparation:true});
      const selected = context.receipt.sources.map(s => s.id);
      const evidence = passages.filter(e => selected.includes(e.id));
      if (feedback) feedbackForContact(feedback,record.contentKey,readerMeanings.find(m=>m.contentKey===record.contentKey),evidence);
      const input = context.writerInput;
      const body = { model: MODEL.model, system_instruction: responseFormat === 'slot-values'
        ? 'Return only the requested JSON object with slotValues. Do not include Markdown fences or commentary.'
        : 'Return only the requested reader passage. Do not include commentary.', input:context.prompt, generation_config: MODEL.generation_config, store: false };
      return { readerRuleBundle:PERSONAL_TRANSIT_READER_RULES, readerRuleBundleSha256:READER_RULES_SHA256, readerMeaningSha256:sha256(projection.readerMeaning), readerMeaningReviewStatus:projection.privateReceipt.interpretationStatus, perspective, field: contract.field, contract, input, writerContextReceipt:context.receipt, responseFormat, request: body, requestSha256: sha256(body), evidence: evidence.map(e => ({ ...e })),
        preparationStatus: !evidence.length ? `blocked-preferred-${perspective}-evidence` : voiceSetStatus === 'proposed' ? 'dry-run-voice-gold-proposed' : 'prepared-not-authorized', original: null, edits: [], currentText: null, approved: null, status: 'awaiting-generation', validation: null, receipts: [] };
    });
    return { contentKey: record.contentKey, title, facts, semanticPacket, privateMeaningReceipt:projection.privateReceipt, currentFeedbackReceipt:currentFeedback?.privateReceipt ?? null, sourceRecordSha256: sha256(record), passages };
  });
  const preparation = { schema: 'owner-transit-batch-v1', id, createdAt: new Date().toISOString(), model: MODEL, friendEvidencePolicy, voiceSetStatus, provenance, contacts,
    inputReview: {calibration:calibrationReview,feedbackSha256:feedback?.sha256 ?? null,sourceBasisAcknowledged:contacts.every(c=>c.privateMeaningReceipt.sourceBasisAcknowledged)},
    policy: { contactCount: 4, plannedInitialCalls: 8, callsPerPassage: 1, automaticNextBatch: false, modelReviewer: false, automaticRewrite: false, publication: false, dispatchEnabled: false } };
  return { ...preparation, preparationSha256: sha256(preparation), revision: 0, ownerCompletedReview: false, events: [] };
}

export { validatePassage } from './personalTransitPassageValidation.mjs';

export const findPassage = (state, key, field) => {
  const contact = state.contacts.find(c => c.contentKey === key);
  const passage = contact?.passages.find(p => p.field === field);
  if (!passage) throw Error('UNKNOWN_PASSAGE');
  return { contact, passage };
};
export function review(state, action) {
  if (action.expectedRevision !== state.revision) throw Error('STALE_VERSION');
  if (action.actor !== 'owner') throw Error('OWNER_ACTION_REQUIRED');
  const next = structuredClone(state);
  const at = new Date().toISOString();
  if (action.type === 'complete-review') {
    if (!next.contacts.every(c => c.passages.every(p => ['approved','rejected'].includes(p.status)))) throw Error('BATCH_REVIEW_INCOMPLETE');
    next.ownerCompletedReview = true;
  } else {
    const { contact, passage } = findPassage(next, action.contentKey, action.field);
    const failedAttemptDecision = passage.receipts.length > 0 && ['reject','request-regeneration'].includes(action.type);
    if (!passage.original && !failedAttemptDecision) throw Error('NO_GENERATED_PASSAGE');
    if (sha256(passage.currentText) !== action.expectedTextSha256) throw Error('STALE_TEXT');
    next.ownerCompletedReview = false;
    if (action.type === 'edit') {
      if (typeof action.text !== 'string' || action.text.length > 30000) throw Error('INVALID_EDIT');
      passage.edits.push({ text: action.text, sha256: sha256(action.text), at, actor: 'owner' });
      passage.currentText = action.text;
      passage.validation = validatePassage(action.text, contact, passage);
      passage.status = 'needs-review'; passage.approved = null;
    } else if (action.type === 'approve') {
      passage.validation = validatePassage(passage.currentText, contact, passage);
      if (!passage.validation.passed) throw Error('VALIDATION_FAILED');
      if (!action.confirmExactText) throw Error('EXACT_TEXT_CONFIRMATION_REQUIRED');
      passage.approved = { text: passage.currentText, sha256: sha256(passage.currentText), at, actor: 'owner', approvalRevision: state.revision + 1,
        readerRuleBundleSha256:READER_RULES_SHA256, contextualRulesReviewed:PERSONAL_TRANSIT_READER_RULES.contextual.map(rule=>rule.id), requestSha256: passage.requestSha256, evidence: passage.evidence.map(e => ({ contentKey: e.contentKey, field: e.field, sha256: e.sha256 })),
        model: state.model, preferredCurrentEvidence: true, canonical: false, publicationAuthorized: false };
      passage.approved.meaningAndVoiceReviewedByOwner = true;
      passage.status = 'approved';
    } else if (['reject','request-regeneration'].includes(action.type)) {
      if (typeof action.reason !== 'string' || !action.reason.trim()) throw Error('REASON_REQUIRED');
      passage.status = action.type === 'reject' ? 'rejected' : 'regeneration-requested'; passage.approved = null;
    } else throw Error('UNKNOWN_REVIEW_ACTION');
  }
  next.revision++;
  next.events.push({ ...action, at, revision: next.revision });
  return next;
}
export function preferredEvidence(state) {
  return state.contacts.flatMap(c => c.passages.filter(p => p.status === 'approved' && p.approved?.sha256 === sha256(p.currentText)).map(p => ({ contentKey: c.contentKey, field: p.field, ...p.approved,
    ownerApproved: true, preferred: true, wordCount: p.currentText.trim().split(/\s+/u).length,
    source: `${state.provenance.localBatchDirectory ?? state.id}/revision-${String(p.approved.approvalRevision).padStart(6,'0')}.json`,
    sourcePassage: `${c.contentKey}:${p.field}`, batchId: state.id })));
}
export function assertNextBatchAllowed(state, continuation = null, nextBatchId = null) {
  if (state.ownerCompletedReview) return;
  if (!continuation) throw Error('OWNER_BATCH_REVIEW_REQUIRED');
  // A new owner-requested test can proceed without inventing review decisions
  // for the preceding passages. Permission is bound to both exact batch states.
  if (continuation.actor !== 'owner' || continuation.decision !== 'continue-without-approving-prior'
      || !continuation.source || !continuation.ownerStatement || continuation.ownerApproved !== false
      || continuation.previousBatchId !== state.id || continuation.previousRevision !== state.revision
      || continuation.previousStateSha256 !== sha256(state) || !nextBatchId
      || continuation.nextBatchId !== nextBatchId || nextBatchId === state.id)
    throw Error('EXACT_BATCH_CONTINUATION_PERMISSION_REQUIRED');
}
export function saveState(directory, state) {
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  // Append-only revision snapshots. Exclusive creation rejects concurrent/stale writers.
  writeFileSync(join(directory, `revision-${String(state.revision).padStart(6,'0')}.json`), JSON.stringify(state, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
}
export function loadState(directory) {
  const files = readdirSync(directory).filter(f => /^revision-\d{6}\.json$/u.test(f)).sort();
  if (!files.length) throw Error('BATCH_NOT_PREPARED');
  return JSON.parse(readFileSync(join(directory, files.at(-1)), 'utf8'));
}
export function ingestRawResponse(directory, state, { contentKey, field, raw, httpStatus, requestSha256, attemptId }) {
  const { passage } = findPassage(state, contentKey, field);
  if (!/^[a-z0-9-]+$/u.test(attemptId) || requestSha256 !== passage.requestSha256 || sha256(passage.request) !== requestSha256) throw Error('REQUEST_IDENTITY_MISMATCH');
  if (passage.original) throw Error('ORIGINAL_ALREADY_PRESERVED');
  if (passage.preparationStatus.startsWith('blocked')) throw Error('EVIDENCE_BLOCKED');
  if (passage.preparationStatus === 'dry-run-voice-gold-proposed') throw Error('VOICE_GOLD_NOT_APPROVED_FOR_DISPATCH');
  const rawDirectory = join(directory, 'raw'); mkdirSync(rawDirectory, { recursive: true, mode: 0o700 });
  // Persist untouched bytes BEFORE parsing, including HTTP failure or malformed JSON.
  writeFileSync(join(rawDirectory, `${attemptId}.response`), raw, { flag: 'wx', mode: 0o600 });
  const receipt = { attemptId, contentKey, field, requestSha256, rawSha256: sha256(raw), httpStatus, receivedAt: new Date().toISOString() };
  writeFileSync(join(rawDirectory, `${attemptId}.receipt.json`), JSON.stringify(receipt,null,2), { flag: 'wx', mode: 0o600 });
  const next = structuredClone(state); const target = findPassage(next, contentKey, field);
  try {
    const response = JSON.parse(raw.toString());
    receipt.providerId = response.id ?? null; receipt.usage = response.usage ?? null; receipt.providerStatus = response.status ?? null;
    if (httpStatus !== 200 || response.status !== 'completed' || response.model !== state.model.model) throw Error('PROVIDER_FAILURE_OR_MODEL_MISMATCH');
    const groups = response.steps?.filter(s => s.type === 'model_output') ?? [];
    const providerOutput = typeof response.output_text === 'string' ? response.output_text : groups.at(-1)?.content?.filter(c => c.type === 'text').map(c => c.text).join('');
    if (typeof providerOutput !== 'string' || !providerOutput.trim()) throw Error('PROVIDER_TEXT_MISSING');
    let output = providerOutput;
    if (passage.responseFormat === 'slot-values') {
      const parsed = JSON.parse(providerOutput), slot = passage.perspective === 'you' ? 'youDraft' : 'friendDraft';
      if (!parsed || Object.keys(parsed).join() !== 'slotValues' || !parsed.slotValues || Object.keys(parsed.slotValues).join() !== slot
          || typeof parsed.slotValues[slot] !== 'string' || !parsed.slotValues[slot].trim()) throw Error('PROVIDER_SLOT_CONTRACT');
      output = parsed.slotValues[slot];
    }
    target.passage.original = { providerOutput, text: output, sha256: sha256(output), receipt };
    target.passage.currentText = output; target.passage.status = 'needs-review';
    target.passage.validation = validatePassage(output, target.contact, target.passage);
    if (!target.passage.validation.passed) target.passage.status = 'held-for-review';
  } catch (error) { target.passage.status = 'generation-failed'; receipt.failure = error.message; }
  target.passage.receipts.push(receipt); next.revision++;
  next.events.push({ type: 'raw-response-imported', revision: next.revision, ...receipt });
  saveState(directory, next);
  return next;
}
