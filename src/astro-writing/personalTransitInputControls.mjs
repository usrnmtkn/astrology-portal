import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve, isAbsolute } from 'node:path';
import semantics from './transitNatalSemantics.cjs';
import { assertPersonalTransitMeaningRecord } from './personalTransitMeaningRecords.mjs';

const hash = value => createHash('sha256').update(typeof value === 'string' || Buffer.isBuffer(value) ? value : JSON.stringify(value)).digest('hex');
const read = path => JSON.parse(readFileSync(path, 'utf8'));
const requireText = (value, code) => { if (typeof value !== 'string' || !value.trim()) throw Error(code); };
export const PERSONAL_TRANSIT_FACTUAL_BOUNDARIES = Object.freeze([
  'Temporary experience only. No permanent trait, childhood event, psychological history, relationship status, motive or origin of a sensitivity is established.',
  'No exact incident, quoted speech, another person’s reaction, date, sign, house or guaranteed outcome is supplied.',
  'Chiron does not establish prior pain, rejection, shame, fear, suppression, avoidance, coping history or another person needing help.'
]);

// Private source inspection, never a prose generator or writer input. Component
// sources are explicitly distinguished from an authored exact-contact meaning.
export function readerMeaningBasis(packet) {
  const sources = ['transitingBody', 'natalTarget'].flatMap(layer => packet[layer].evidence.map(e => ({
    role: layer, path: e.path, field: e.field, rowKey: e.rowKey, text: e.text,
    sourceSha256: e.sourceSha256, evidenceSha256: e.evidenceSha256
  })));
  const basis = { kind: 'component-semantics-not-an-authored-contact-interpretation', identity: packet.identity,
    semanticPacketSha256: packet.packetSha256, sources,
    refinements: ['transitingBody','natalTarget'].filter(k => packet[k].refinementSource).map(k => ({ role:k, text:packet[k].mechanics, source:packet[k].refinementSource })),
    aspect: packet.aspect, boundaries: packet.constraints, surfaceBoundaries:PERSONAL_TRANSIT_FACTUAL_BOUNDARIES,
    limitation: 'Source integrity does not establish that a supplied interpretation is complete, accurate or well written.' };
  return { ...basis, sha256: hash(basis) };
}

export function inspectCalibration(calibration, meanings, evaluationPermission = null) {
  if (!calibration) return { required: false, status: 'not-required', pending: [] };
  if (calibration.required !== true || !calibration.id || !calibration.source || !Array.isArray(calibration.contentKeys)
      || !calibration.contentKeys.length || new Set(calibration.contentKeys).size !== calibration.contentKeys.length) throw Error('CALIBRATION_SCOPE_INVALID');
  const pending = [];
  const records = calibration.contentKeys.map(contentKey => {
    const meaning = meanings.find(m => m.contentKey === contentKey);
    if (!meaning || meaning.status !== 'owner-accepted') { pending.push(contentKey); return { contentKey, status: meaning?.status ?? 'missing', textSha256: meaning?.sha256 ?? null }; }
    if (meaning.sha256 !== hash(meaning.text) || meaning.review?.textSha256 !== meaning.sha256
        || meaning.review?.calibrationId !== calibration.id || !meaning.review?.source) throw Error('CALIBRATION_EXACT_REVIEW_REQUIRED');
    const [transiting,natal,aspect] = contentKey.replace(/^authored\/transit-aspect\//u,'').split('/');
    const packet = semantics.resolveTransitNatalSemantics({transiting,natal,aspect});
    const basis = readerMeaningBasis(packet);
    assertPersonalTransitMeaningRecord(meaning, packet);
    if (meaning.review.basisSha256 !== undefined && meaning.review.basisSha256 !== basis.sha256) throw Error('CALIBRATION_SOURCE_DRIFT');
    return {contentKey,status:meaning.status,textSha256:meaning.sha256,basisSha256:basis.sha256,review:meaning.review};
  });
  let permission = null;
  if (evaluationPermission) {
    const p = evaluationPermission;
    if (p.actor !== 'owner' || p.decision !== 'test-proposed-keep-unapproved' || !p.source || !p.ownerStatement
        || p.calibrationId !== calibration.id || p.ownerApproved !== false || !Array.isArray(p.records)
        || p.records.length !== calibration.contentKeys.length || new Set(p.records.map(r => r.contentKey)).size !== p.records.length) throw Error('EXACT_EVALUATION_PERMISSION_REQUIRED');
    for (const key of calibration.contentKeys) {
      const meaning = meanings.find(m => m.contentKey === key), receipt = p.records.find(r => r.contentKey === key);
      if (!meaning || !receipt || receipt.textSha256 !== meaning.sha256 || receipt.recordSha256 !== meaning.recordSha256) throw Error('EVALUATION_MEANING_CHANGED');
      const [transiting,natal,aspect] = key.slice('authored/transit-aspect/'.length).split('/');
      assertPersonalTransitMeaningRecord(meaning, semantics.resolveTransitNatalSemantics({transiting,natal,aspect}), {allowProposed:true});
    }
    permission = {sha256:hash(p),source:p.source,ownerApproved:false};
  }
  return {required:true,id:calibration.id,source:calibration.source,status:pending.length?(permission?'evaluation-authorized':'pending-owner-meaning-review'):'complete',pending,records,evaluationPermission:permission};
}

// The same current private registry feeds Studio preparation and the batch.
// Only corrections and exclusions enter selection; rejected prose stays private.
export function feedbackForWriter(feedback) {
  const payload = {source:feedback.registryPath, registrySha256:feedback.sha256,
    corrections:feedback.corrections,
    exclusions:[...feedback.exclusions,...feedback.rejections.flatMap(r => ['voice','meaning'].map(role => ({role,sha256:r.sha256,source:r.source,contentKeys:[]})))]};
  return {...payload,sha256:hash(payload)};
}

export function loadInputPlan(path) {
  const bytes = readFileSync(path), plan = JSON.parse(bytes);
  if (plan.schema !== 'personal-transit-input-plan-v1' || !/^[a-z0-9-]+$/u.test(plan.id ?? '')
      || !Array.isArray(plan.selectedContacts) || plan.selectedContacts.length !== 4 || new Set(plan.selectedContacts).size !== 4
      || !Array.isArray(plan.requiredRegressionContacts) || !plan.requiredRegressionContacts.every(k => plan.selectedContacts.includes(k))
      || !isAbsolute(plan.feedbackFile ?? '')) throw Error('INPUT_PLAN_OR_REGRESSION_COVERAGE_INVALID');
  return {...plan,path:resolve(path),sha256:hash(bytes)};
}

// The registry is local/private. Batch directories are read at their latest
// revision on every preparation; a saved old snapshot cannot claim freshness.
export function registerFeedbackBatch(registryPath, batchDirectory, source) {
  const directory=registryPath+'.batches';mkdirSync(directory,{recursive:true,mode:0o700});
  const record={type:'batch',path:resolve(batchDirectory),source};
  const file=join(directory,hash(record.path)+'.json');
  if(existsSync(file)) {if(hash(read(file))!==hash(record))throw Error('FEEDBACK_BATCH_REGISTRATION_CONFLICT');return;}
  writeFileSync(file,JSON.stringify(record,null,2)+'\n',{flag:'wx',mode:0o600});
}

export function loadCurrentFeedback(path, {excludeBatchDirectory} = {}) {
  const bytes = readFileSync(path), registry = JSON.parse(bytes);
  if (registry.schema !== 'personal-transit-feedback-v1' || !Array.isArray(registry.corrections) || !Array.isArray(registry.rejectionSources)) throw Error('CURRENT_FEEDBACK_REQUIRED');
  const sourceFiles = [{path:resolve(path),sha256:hash(bytes)}], rejections = [];
  const corrections = registry.corrections.map(c => {
    if (!c.id || !c.source || !Array.isArray(c.contentKeys) || c.sha256 !== hash(c.text) || c.role !== 'owner-correction') throw Error('OWNER_CORRECTION_INTEGRITY');
    requireText(c.text,'OWNER_CORRECTION_TEXT_REQUIRED'); return {...c};
  });
  const add = (p,reason,source) => {
    if (!p.contentKey || !p.text || p.sha256 !== hash(p.text) || !reason || !source) throw Error('REJECTION_INTEGRITY');
    rejections.push({...p,reason,source,positiveEvidenceEligible:false});
  };
  const sources=[...registry.rejectionSources], registrations=path+'.batches';
  if(existsSync(registrations)) for(const name of readdirSync(registrations).filter(n=>/^[a-f0-9]{64}\.json$/u.test(n)).sort()) {
    const file=join(registrations,name),data=readFileSync(file),entry=JSON.parse(data);
    if(entry.type!=='batch')throw Error('FEEDBACK_REGISTRATION_INVALID');
    if(excludeBatchDirectory && resolve(entry.path)===resolve(excludeBatchDirectory))continue;
    sourceFiles.push({path:file,sha256:hash(data)});
    if(!sources.some(s=>s.type==='batch'&&s.path===entry.path))sources.push(entry);
  }
  for (const item of sources) {
    if (!isAbsolute(item.path) || !item.source) throw Error('FEEDBACK_SOURCE_REQUIRED');
    if(item.type==='batch' && excludeBatchDirectory && resolve(item.path)===resolve(excludeBatchDirectory))continue;
    if (item.type === 'receipt') {
      const data = readFileSync(item.path), doc = JSON.parse(data);
      if (item.sha256 !== hash(data) || !Array.isArray(doc.passages) || !doc.ownerReasonVerbatim) throw Error('REJECTION_RECEIPT_DRIFT');
      sourceFiles.push({path:item.path,sha256:hash(data)});
      for (const p of doc.passages) add(p,doc.ownerReasonVerbatim,item.source);
    } else if (item.type === 'batch') {
      const revisions = readdirSync(item.path).filter(n => /^revision-\d{6}\.json$/u.test(n)).sort();
      if (!revisions.length) throw Error('FEEDBACK_BATCH_MISSING');
      const latestPath = join(item.path,revisions.at(-1)), latestBytes = readFileSync(latestPath), state = JSON.parse(latestBytes);
      sourceFiles.push({path:latestPath,sha256:hash(latestBytes)});
      for (const event of state.events.filter(e => ['reject','request-regeneration'].includes(e.type))) {
        if (event.actor !== 'owner') throw Error('OWNER_REJECTION_REQUIRED');
        const snapshotPath = join(item.path,`revision-${String(event.revision).padStart(6,'0')}.json`);
        const snapshotBytes = readFileSync(snapshotPath), snapshot = JSON.parse(snapshotBytes);
        sourceFiles.push({path:snapshotPath,sha256:hash(snapshotBytes)});
        const passage = snapshot.contacts.find(c => c.contentKey === event.contentKey)?.passages.find(p => p.field === event.field);
        if (!passage?.currentText) continue; // Failed attempts without prose are not voice evidence.
        if (hash(passage.currentText) !== event.expectedTextSha256) throw Error('REJECTION_TEXT_DRIFT');
        const current = state.contacts.find(c => c.contentKey === event.contentKey)?.passages.find(p => p.field === event.field);
        // A later explicit exact approval can supersede rejection of that text.
        if (current?.status === 'approved' && current.approved?.sha256 === event.expectedTextSha256 && current.approved.approvalRevision > event.revision) continue;
        add({contentKey:event.contentKey,field:event.field,text:passage.currentText,sha256:event.expectedTextSha256,requestSha256:passage.requestSha256},event.reason,`${snapshotPath}#${event.contentKey}:${event.field}`);
      }
    } else throw Error('FEEDBACK_SOURCE_TYPE_INVALID');
  }
  const exclusions = registry.exclusions ?? [];
  for (const e of exclusions) if (!e.sha256 || !e.source || !e.reason || !['voice','meaning'].includes(e.role) || !Array.isArray(e.contentKeys)) throw Error('EXCLUSION_PROVENANCE_REQUIRED');
  const receipt = {registryPath:resolve(path),sourceFiles,corrections,rejections,exclusions,storage:'local-private',liveStudioRetrieved:false};
  return {...receipt,sha256:hash(receipt)};
}

export function feedbackForContact(feedback, contentKey, meaning, evidence) {
  const corrections = feedback.corrections.filter(c => !c.contentKeys.length || c.contentKeys.includes(contentKey));
  for (const e of evidence) {
    if (feedback.rejections.some(r => r.sha256 === e.sha256)
        || feedback.exclusions.some(x => x.role === 'voice' && x.sha256 === e.sha256 && (!x.contentKeys.length || x.contentKeys.includes(contentKey)))) throw Error('REJECTED_OR_EXCLUDED_VOICE_EVIDENCE');
  }
  if (feedback.rejections.some(r => r.sha256 === meaning.sha256)
      || feedback.exclusions.some(x => x.role === 'meaning' && x.sha256 === meaning.sha256 && (!x.contentKeys.length || x.contentKeys.includes(contentKey)))) throw Error('REJECTED_OR_RETIRED_READER_MEANING');
  return {corrections:corrections.map(c=>({id:c.id,text:c.text})),privateReceipt:{feedbackSha256:feedback.sha256,
    correctionIds:corrections.map(c=>c.id),rejections:feedback.rejections.filter(r=>r.contentKey===contentKey).map(r=>({sha256:r.sha256,reason:r.reason,source:r.source})),
    limitation:'Complete rejected prose remains private. Corrections are exact owner directions, not newly invented bans.'}};
}
