import { readFileSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { prepareBatch, saveState, sha256 } from './ownerTransitBatch.mjs';
import { parsePersonalTransitSources } from './personalTransitWriterContext.mjs';
import { READER_RULES_JSON, READER_RULES_SHA256 } from './personalTransitReaderRules.mjs';
import { loadInputPlan, loadCurrentFeedback, registerFeedbackBatch } from './personalTransitInputControls.mjs';

const repo = fileURLToPath(new URL('../../',import.meta.url));
const read = path => JSON.parse(readFileSync(path,'utf8'));
const write = (path,value) => writeFileSync(path,typeof value === 'string' ? value : JSON.stringify(value,null,2)+'\n',{flag:'wx',mode:0o600});

// Both CLI entry points resolve the same records, select evidence through the
// Studio core, and persist the same manifest and append-only review state.
export function resolveBatchInputs({catalogPath,voiceGoldPath,readerMeaningsPath,sourcesPath,inputPlanPath,outputDirectory}) {
  const plan = loadInputPlan(inputPlanPath), batchDirectory = resolve(outputDirectory,'batch');
  const feedback = loadCurrentFeedback(plan.feedbackFile,{excludeBatchDirectory:batchDirectory});
  const catalog = read(catalogPath);
  let sources, examples, meanings, voiceSetStatus='current';
  if (sourcesPath) {
    sources = parsePersonalTransitSources(readFileSync(sourcesPath,'utf8'));
    examples = sources.passages; meanings = sources.meanings;
  } else {
    const gold = read(voiceGoldPath), meaningDocument = read(readerMeaningsPath);
    if (gold.id !== 'CURRENT_TRANSIT_VOICE_GOLD' || gold.role !== 'voice-only' || !['proposed-owner-review','owner-approved-current-voice'].includes(gold.status)) throw Error('CURRENT_VOICE_GOLD_REQUIRED');
    if (meaningDocument.id !== 'PERSONAL_TRANSIT_READER_MEANINGS' || !Array.isArray(meaningDocument.records)) throw Error('READER_MEANINGS_DOCUMENT_REQUIRED');
    examples=gold.passages;meanings=meaningDocument.records;voiceSetStatus=gold.status==='proposed-owner-review'?'proposed':'current';
    for (const e of examples) if (!e.sourceFileSha256 || sha256(readFileSync(e.source)) !== e.sourceFileSha256 || sha256(e.text) !== e.sha256) throw Error('VOICE_SOURCE_DRIFT');
  }
  if (new Set(meanings.map(m=>m.contentKey)).size !== meanings.length) throw Error('DUPLICATE_READER_MEANINGS');
  if (sources?.calibration && JSON.stringify(sources.calibration) !== JSON.stringify(plan.calibration)) throw Error('PROTECTED_CALIBRATION_SCOPE_CHANGED');
  const records = plan.selectedContacts.map(key=>{const record=catalog.find(r=>r.contentKey===key);if(!record)throw Error('CONTACT_MISSING');return record;});
  const provenance = {repositoryRevision:execFileSync('git',['rev-parse','HEAD'],{cwd:repo,encoding:'utf8'}).trim(),localBatchDirectory:batchDirectory,
    catalogPath:resolve(catalogPath),...(sourcesPath?{sourcesPath:resolve(sourcesPath)}:{voiceGoldPath:resolve(voiceGoldPath),readerMeaningsPath:resolve(readerMeaningsPath),readerMeaningsFileSha256:sha256(readFileSync(readerMeaningsPath))}),
    inputPlanPath:plan.path,feedbackRegistryPath:plan.feedbackFile,feedbackSha256:feedback.sha256,
    ownerDirection:plan.source ?? 'private input plan',liveFeedback:'Current private local registry; live Studio database is separate.'};
  const state = prepareBatch({id:plan.id,records,examples,readerMeanings:plan.selectedContacts.map(k=>meanings.find(m=>m.contentKey===k)),
    feedback,calibration:plan.calibration,calibrationMeanings:meanings,evaluationPermission:plan.evaluationPermission,
    sources,responseFormat:sourcesPath?'slot-values':'passage',friendEvidencePolicy:plan.friendEvidencePolicy ?? 'blocked',voiceSetStatus,provenance});
  return {plan,feedback,state};
}

export function prepareBatchFiles(options) {
  if (existsSync(options.outputDirectory)) throw Error('NEW_OUTPUT_DIRECTORY_REQUIRED');
  const {plan,feedback,state} = resolveBatchInputs(options), directory=resolve(options.outputDirectory);
  mkdirSync(directory,{recursive:true,mode:0o700});saveState(join(directory,'batch'),state);
  for (const [i,c] of state.contacts.entries()) for (const p of c.passages) {
    write(join(directory,`${i+1}-${p.perspective}.request.json`),JSON.stringify(p.request));
    write(join(directory,`${i+1}-${p.perspective}.input.json`),p.input);
  }
  for (const role of ['writer','validator']) write(join(directory,`${role}-effective-rule-bundle.json`),READER_RULES_JSON);
  const sourcePaths=['src/astro-writing/ownerTransitBatch.mjs','src/astro-writing/personalTransitApprovedWriting.mjs','src/astro-writing/personalTransitMeaningRecords.mjs','src/astro-writing/personalTransitMeaningProjection.mjs',
    'src/astro-writing/personalTransitInputControls.mjs','src/astro-writing/personalTransitWriterContext.mjs','src/astro-writing/personalTransitPassageValidation.mjs',
    'src/astro-writing/personalTransitPreparation.mjs','src/astro-writing/personalTransitDispatch.mjs','src/astro-writing/personalTransitReaderRules.mjs',
    'src/astro-writing/transitNatalContract.cjs','src/astro-writing/transitNatalSemantics.cjs','apps/web/src/content/editorialCopyBoundary.mjs',
    'scripts/transit-owner-batch/prepare.mjs','scripts/transit-owner-batch/dispatch.mjs','scripts/evaluate-personal-transit-writer.mts'];
  const inputPaths=[options.catalogPath,options.inputPlanPath,...(options.sourcesPath?[options.sourcesPath]:[options.voiceGoldPath,options.readerMeaningsPath])];
  const manifest={schema:'personal-transit-dispatch-manifest-v1',batchId:state.id,batchDirectory:join(directory,'batch'),preparationSha256:state.preparationSha256,
    model:state.model,ruleBundleSha256:READER_RULES_SHA256,inputFiles:inputPaths.map(path=>({path:resolve(path),sha256:sha256(readFileSync(path))})),
    sourceFiles:sourcePaths.map(path=>({path:join(repo,path),sha256:sha256(readFileSync(join(repo,path)))})),
    inputPlanPath:plan.path,feedbackRegistryPath:plan.feedbackFile,feedbackSha256:feedback.sha256,
    requests:state.contacts.flatMap((c,i)=>c.passages.map(p=>({contentKey:c.contentKey,transit:c.title,field:p.field,perspective:p.perspective,
      requestFile:`${i+1}-${p.perspective}.request.json`,requestSha256:p.requestSha256}))),publication:false,deployment:false};
  write(join(directory,'manifest.json'),manifest);write(join(directory,'feedback-receipt.json'),feedback);
  const receipt={preparationSha256:state.preparationSha256,contacts:4,passages:8,model:state.model,inputReview:state.inputReview,
    requests:manifest.requests,privateMeaningReceipts:state.contacts.map(c=>({contentKey:c.contentKey,...c.privateMeaningReceipt})),
    providerCalls:0,contentWrites:0,ownerApproved:false,publication:false,deployment:false,dispatchAuthorized:false};
  write(join(directory,'preparation-receipt.json'),receipt);
  registerFeedbackBatch(plan.feedbackFile,join(directory,'batch'),state.provenance.ownerDirection);
  return receipt;
}
