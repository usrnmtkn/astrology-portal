import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {evidenceManifest,digest,assertManifest} from '../src/astro-writing/editorial/evidenceRegistry.mjs';
import {newEditorialRun,latest,prepareEditorialStep,reserveEditorialCall,confirmEditorialCall,completeEditorialCall,assertJournal,assertRunWrite} from '../src/astro-writing/editorial/controller.mjs';
import {checksFor,validateEvaluation,evaluationDecision} from '../src/astro-writing/editorial/evaluation.mjs';
import {editorialFileStore} from '../src/astro-writing/editorial/fileStore.mjs';
import {seasonalEditorialModels,seasonalEvidenceRegistry} from '../src/astro-writing/seasonalEditorialAdapter.mjs';

const entries=[{id:'approved',role:'approved',authority:'owner_authored_final',text:'Exact approved synthetic comparison.',source:{locator:'test:approved',version:'1'},scope:'fixture',relevance:{score:1,reason:'same synthetic function'},ownerReason:null,rejectedSpans:[]},
 {id:'rejected',role:'rejected',authority:'explicit_owner_rejection',text:'Preserved context. Rejected synthetic wording.',source:{locator:'test:rejected',version:'1'},scope:'sentence only',relevance:{score:1,reason:'same synthetic defect'},ownerReason:'Only the marked sentence is rejected.',rejectedSpans:['Rejected synthetic wording.']}];
const manifest=evidenceManifest({surface:'seasonal',target:'fixture',query:{},entries});
const rejectedRow={id:'same-audience-unknown-period',version:1,kind:'rejection',status:'active',source_uri:'test:owner',owner_reason:'Exact rejection.',rejected_text:'Another period rejected text.',target_keys:['horoscope-plan/other-edition/taurus']};
const retrieved=await seasonalEvidenceRegistry({template:{seasonalPreparation:{context:{primaryRegisterPassages:[{id:'synthetic-source',sourcePath:'test:approved',text:entries[0].text,authorityClass:'owner_authored_final',ownerAuthored:true,ownerApproved:true,seasonalArgumentPrimary:true}]}}},rejections:[rejectedRow,{...rejectedRow,id:'explicit-seasonal',target_keys:['horoscope/seasonal']}]}).retrieve('seasonal',{target:'fixture',audience:'taurus'});
assert.equal(retrieved.entries.filter(e=>e.role==='rejected').length,1);
assert.equal(retrieved.excluded[0].reason,'period_not_established_by_provenance');
const currentPreferred=await seasonalEvidenceRegistry({template:{seasonalPreparation:{context:{},writingProfile:{id:'fixture-profile',revision:2,sha256:digest('fixture-profile'),updatedAt:'2026-10-05',profile:{voiceGuidance:'BEGIN COMPLETE OWNER PREFERRED REVISION\nComplete current synthetic owner revision.\nEND COMPLETE OWNER PREFERRED REVISION'}}}},rejections:[{...rejectedRow,id:'explicit-seasonal',target_keys:['horoscope/seasonal']}]}).retrieve('seasonal',{target:'fixture',audience:'taurus'});
assert.equal(currentPreferred.entries[0].text,'Complete current synthetic owner revision.');assert.equal(currentPreferred.entries[0].authority,'exact_owner_approved');
assert.throws(()=>evidenceManifest({surface:'seasonal',target:'fixture',query:{},entries:[{...entries[0],authority:'serving-review-status-approved'},entries[1]]}));
const changed=structuredClone(manifest);changed.entries[0].text='changed';assert.throws(()=>assertManifest(changed));
const make=()=>newEditorialRun({id:'fixture',target:{sign:'taurus'},input:{},models:seasonalEditorialModels(),authorization:{reference:'synthetic-no-paid-calls'}});
assert.throws(()=>newEditorialRun({id:'bad',target:{},input:{},models:{...seasonalEditorialModels(),voice:seasonalEditorialModels().prose},authorization:{reference:'fixture'}}));
const plan={concern:'A synthetic concern.'},candidate={headline:'Synthetic',body:'First synthetic paragraph.\n\nSecond synthetic paragraph.'};
function evaluation(run,role,defect=null){
 const subject=role==='plan'?{mechanism:latest(run,'mechanism'),plan:latest(run,'plan')}:latest(run,'candidate');
 const checks=checksFor(role).map(id=>({id,outcome:'pass',explanation:'Synthetic fixture outcome.'}));
 const value={candidateHash:digest(subject),manifestHash:manifest.hash,checks,findings:[],comparisonSummary:'Synthetic same-function comparison.'};
 if(defect){checks[0].outcome='fail';value.findings.push({checkId:checks[0].id,label:defect.label,field:role==='plan'?'plan.concern':'body',quote:role==='plan'?plan.concern:'First synthetic paragraph.',paragraph:role==='plan'?plan.concern:'First synthetic paragraph.',explanation:'Synthetic specific defect.',readerConsequence:'Synthetic loss of the distinction.',comparisons:[{evidenceId:'approved',quote:entries[0].text,reason:'Synthetic common function.'}],responsibleStage:defect.stage});}
 return value;
}
const adapter={retrieve:async()=>manifest,request:run=>({role:run.stage==='prose'?'WRITER':'SEASONAL_PLAN_REVIEWER',config:run.models[run.stage],input:run.stage,schema:{},instructions:'fixture'}),validate(){},validateDraft:()=>({passed:true,violations:[]})};
async function step(run,value){const prepared=await prepareEditorialStep(run,adapter);if(!prepared.request)return;reserveEditorialCall(run,prepared.request);assert.throws(()=>reserveEditorialCall(run,prepared.request));confirmEditorialCall(run,`resp_fixture${run.counts.calls}`);await completeEditorialCall(run,{id:run.pending.responseId,status:'completed',usage:{input_tokens:10,output_tokens:5},output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(value)}]}]},adapter);assertJournal(run);}
async function planned(run){await step(run,{core:'Synthetic governed mechanism.'});await step(run,plan);await step(run,evaluation(run,'plan'));}
let run=make();await planned(run);await step(run,candidate);await step(run,evaluation(run,'voice'));await step(run,evaluation(run,'meaning'));assert.equal(run.status,'accepted');assert.equal(run.counts.calls,6);assert.equal(run.acceptedCandidate.hash,digest(candidate));assert.equal(run.ownerApproved,false);
// An invented premise returns to planning, without a single prose call.
run=make();await step(run,{core:'Synthetic mechanism.'});await step(run,plan);await step(run,evaluation(run,'plan',{label:'invented_scenario_dominates',stage:'plan'}));assert.equal(run.stage,'plan');assert.equal(run.counts.prose,0);
await step(run,plan);await step(run,evaluation(run,'plan',{label:'generic_human_thesis',stage:'plan'}));await step(run,plan);await step(run,evaluation(run,'plan',{label:'generic_human_thesis',stage:'plan'}));assert.equal(run.status,'quality_exhausted');assert.equal(run.counts.plan,3);assert.equal(run.counts.prose,0);
// Failed source support restarts its cause, never jumps directly to prose.
for(const [label,stage] of [['mechanism_supported','mechanism'],['evidence_mismatch','evidence']]){
 run=make();await step(run,{core:'Synthetic mechanism.'});await step(run,plan);await step(run,evaluation(run,'plan',{label,stage}));
 assert.equal(run.stage,stage);assert.equal(run.counts.prose,0);
 await step(run,{core:'Replacement synthetic mechanism.'});assert.equal(run.stage,'plan');
 await step(run,plan);assert.equal(run.stage,'plan_review');
 assert.equal(run.counts.evidence,stage==='evidence'?2:1);
}
// Three prose candidates, each independently evaluated; never return a failed one.
run=make();await planned(run);
for(let i=0;i<3;i++){await step(run,candidate);await step(run,evaluation(run,'voice',{label:'owner_voice_failure',stage:'prose'}));assert.equal(run.stage,'meaning');await step(run,evaluation(run,'meaning'));}
assert.equal(run.status,'quality_exhausted');assert.equal(run.counts.prose,3);assert.equal(run.acceptedCandidate,null);
const reset=structuredClone(run);reset.counts.prose=0;reset.revision=run.revision+1;assert.throws(()=>assertRunWrite(run,reset,run.revision),/budget_cannot_reset/);
const modelChange=structuredClone(run);modelChange.models.voice.model='different';modelChange.revision=run.revision+1;assert.throws(()=>assertRunWrite(run,modelChange,run.revision),/configuration_is_immutable/);
// Invalid or stale judge evidence cannot pass or cause a new prose attempt.
run=make();await planned(run);await step(run,candidate);let e=evaluation(run,'voice');e.candidateHash='wrong';await step(run,e);assert.equal(run.stage,'voice');await step(run,e);assert.equal(run.status,'quality_exhausted');assert.equal(run.counts.prose,1);
e=evaluation(run,'voice',{label:'owner_voice_failure',stage:'prose'});e.findings[0].comparisons=[{evidenceId:'rejected',quote:'Preserved context.',reason:'Synthetic'}];assert.throws(()=>validateEvaluation(e,{role:'voice',candidate,manifest}),/unrejected_surrounding_context/);
e=evaluation(run,'voice');e.checks.pop();assert.throws(()=>validateEvaluation(e,{role:'voice',candidate,manifest}),/missing_check/);
e=evaluation(run,'voice');e.checks[0].outcome='indeterminate';assert.equal(evaluationDecision([e]).action,'evaluation_unavailable');
// Fact failure is preserved and stops before either prose evaluator.
run=make();await planned(run);const factAdapter={...adapter,validateDraft:()=>({passed:false,violations:[{category:'wrong_house'}]})};let prepared=await prepareEditorialStep(run,factAdapter);reserveEditorialCall(run,prepared.request);confirmEditorialCall(run,'resp_badfact');await completeEditorialCall(run,{id:'resp_badfact',status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(candidate)}]}]},factAdapter);assert.equal(run.status,'fact_failed');assert.deepEqual(latest(run,'candidate'),candidate);assert.equal(run.counts.calls,4);
// Reload/CAS and immutable history.
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'seasonal-editorial-')),store=editorialFileStore(dir);await store.create(run);const previous=await store.read(run.id);const next=structuredClone(previous);next.status='inspected';await store.save(previous,next);await assert.rejects(()=>store.save(previous,structuredClone(previous)),/storage_conflict/);const tampered=structuredClone(next);tampered.artifacts[0].value='changed';assert.throws(()=>assertJournal(tampered));
console.log('PASS Seasonal editorial controller: plan gating, responsible routing, 3-candidate exhaustion, separate reviews, exact evidence, fact stop, immutable manifests/journal, CAS and reload. No paid calls.');
