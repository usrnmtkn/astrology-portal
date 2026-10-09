import assert from 'node:assert/strict';
import {Readable} from 'node:stream';
import {store} from '../tests/helpers/sky-article-save-api.mts';
import handler from '../api/admin/calendar-lunation-writing';
import publication from '../api/admin/content-publication';
import {calculateLunarWritingFacts} from '../api/_lib/calendar-lunation-studio';
import {defaultLunationProfile,emptyLunationWorkspace,LUNATION_ARGUMENT_FIELDS} from '../src/astro-writing/lunationWritingProfile.mjs';
import {lunationDigest} from '../src/astro-writing/lunationWritingFacts.mjs';
import {lunarSavedWritingFixtures} from '../tests/helpers/lunar-saved-writing-fixture.mjs';
for(const row of lunarSavedWritingFixtures())store.rows.set(row.id,row);

const storageFetch=globalThis.fetch;
let calls=0,polls=0,feedbackDown=false,unknown=false,modelInput='';
const candidate={body:'Synthetic lunar candidate for the owner to review.',journalPrompt:'Synthetic lunar journal question?'};
globalThis.fetch=async(input:any,options:any={})=>{
  const url=new URL(String(input));
  if(url.pathname==='/rest/v1/studio_writing_feedback')return feedbackDown?Response.json({error:'fixture outage'},{status:503}):Response.json([]);
  if(url.origin==='https://api.openai.com'){
    if((options.method??'GET')==='POST'){
      calls++;if(unknown)throw new Error('Synthetic unknown provider outcome');
      const request=JSON.parse(options.body);modelInput=request.input;
      assert.equal(request.background,true);assert.equal(request.model,'gpt-5.6-sol');assert.equal(request.max_output_tokens,12000);
      assert.deepEqual(request.text.format.schema.required,['body','journalPrompt']);
      return Response.json({id:`resp_fixture_${calls}`,status:'queued'});
    }
    polls++;return Response.json({id:url.pathname.split('/').at(-1),status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(candidate)}]}]});
  }
  return storageFetch(input,options);
};
process.env.OPENAI_API_KEY='synthetic-provider-only';
async function invoke(body:any,secret='calendar-api-fixture',endpoint=handler){
  const req:any=Readable.from([JSON.stringify(body)]);req.method='POST';req.url='/api/admin/calendar-lunation-writing';req.headers={'x-content-generation-secret':secret};
  const res:any={statusCode:200,setHeader(){},end(raw:string){this.payload=JSON.parse(raw);}};await endpoint(req,res);return {status:res.statusCode,...res.payload};
}
const target={phase:'new-moon',sign:'libra'};
assert.equal((await invoke({action:'load',...target},'wrong')).status,401);
const initial=await invoke({action:'load',...target});assert.equal(initial.status,200,JSON.stringify(initial));assert.equal(initial.profile.revision,0);assert.equal(initial.row,null);
const profile=defaultLunationProfile();profile.voiceGuidance+=' Synthetic Studio guidance marker.';
let savedProfile=await invoke({action:'save-profile',profile,expectedUpdatedAt:null});assert.equal(savedProfile.status,200,JSON.stringify(savedProfile));
assert.equal((await invoke({action:'save-profile',profile,expectedUpdatedAt:null})).status,409);
const workspace=emptyLunationWorkspace(target.phase,target.sign);workspace.referenceDate='2026-10-10';
for(const field of LUNATION_ARGUMENT_FIELDS)workspace.argumentInput[field]=`Synthetic ${field} editorial direction.`;
workspace.argumentInput.scope_breadth={broad_mechanism:'Synthetic wider meaning.',chosen_expression:'Synthetic specific example.',other_valid_expressions:['Fixture A','Fixture B','Fixture C']};
let saved=await invoke({action:'save',...target,workspace,expectedUpdatedAt:null});assert.equal(saved.status,200,JSON.stringify(saved));
for(const referenceDate of ['2026-99-10','2026-02-30'])assert.equal((await invoke({action:'save',...target,workspace:{...workspace,referenceDate},expectedUpdatedAt:saved.row.updated_at})).status,400);
assert.equal(saved.row.status,'DRAFT');assert.equal(saved.row.lane,'reference');assert.equal(saved.row.body,'');
assert.equal((await invoke({action:'save',...target,workspace,expectedUpdatedAt:null})).status,409);
for(const action of ['publish','retire'])assert.equal((await invoke({action,id:saved.row.id,contentKey:saved.row.content_key,expectedUpdatedAt:saved.row.updated_at},'calendar-api-fixture',publication)).status,400);
assert.equal((await store.invoke('PATCH',{id:saved.row.id,status:'LIVE'})).status,400);
assert.equal((await store.invoke('DELETE',{id:saved.row.id})).status,400);
let plan=await invoke({action:'prepare',...target,expectedUpdatedAt:saved.row.updated_at});assert.equal(plan.status,200,JSON.stringify(plan));
assert.equal(plan.plan.facts.event.sign,'libra');assert.equal(plan.plan.facts.event.kind,'new-moon');assert.equal(plan.plan.ownerPassages.length,6+plan.plan.savedWriting.references.length);assert.equal(calls,0);
store.rows.set(saved.row.id,{...saved.row,sections:{...saved.row.sections,approvedPlan:{outlineHash:plan.plan.outline.outlineHash,callAuthorization:{outlineHash:plan.plan.outline.outlineHash},sourceUri:'thread:synthetic-prior-approval',exactOwnerRuling:'Synthetic explicit approval of this exact plan and one writer call.'}}});
assert.equal((await invoke({action:'prepare',...target,expectedUpdatedAt:saved.row.updated_at})).plan.previouslyApproved,true);
const full=await calculateLunarWritingFacts({...workspace,phase:'full-moon',sign:'aries',contentKey:'authored/sky-lunation-macro/full-moon/aries',referenceDate:'2026-09-26'});
assert.equal(full.event.kind,'full-moon');assert.equal(full.event.sign,'aries');assert.equal(full.relatedEvents[0].relationship,'previous-same-sign-new-moon');
await assert.rejects(calculateLunarWritingFacts({...workspace,sign:'aries'}),/no matching Moon/);
assert.equal((await invoke({action:'generate',...target,expectedUpdatedAt:saved.row.updated_at,approvedPlanHash:plan.plan.planHash})).status,409);
feedbackDown=true;assert.equal((await invoke({action:'generate',...target,expectedUpdatedAt:saved.row.updated_at,approvedPlanHash:plan.plan.planHash,authorizeWriterCall:true})).status,503);assert.equal(calls,0);feedbackDown=false;
savedProfile=await invoke({action:'save-profile',profile:{...profile,phaseContext:profile.phaseContext+' Changed.'},expectedUpdatedAt:savedProfile.profile.updatedAt});
assert.equal((await invoke({action:'generate',...target,expectedUpdatedAt:saved.row.updated_at,approvedPlanHash:plan.plan.planHash,authorizeWriterCall:true})).status,409);assert.equal(calls,0);
plan=await invoke({action:'prepare',...target,expectedUpdatedAt:saved.row.updated_at});
const generate={action:'generate',...target,expectedUpdatedAt:saved.row.updated_at,approvedPlanHash:plan.plan.planHash,authorizeWriterCall:true};
const race=await Promise.all([invoke(generate),invoke(generate)]);assert.deepEqual(race.map(r=>r.status).sort(),[202,409]);assert.equal(calls,1);
saved=race.find(r=>r.status===202)!;assert.match(modelInput,/Synthetic Studio guidance marker/);assert(modelInput.includes(JSON.stringify(lunarSavedWritingFixtures().find(r=>r.content_key===workspace.contentKey).body)));assert.equal(saved.row.sections.lunationRun.active.savedWriting.references[0].contentKey,workspace.contentKey);assert.ok(!JSON.stringify(saved.row).includes('synthetic-provider-only'));
assert.equal((await invoke({...generate,expectedUpdatedAt:saved.row.updated_at})).status,409);
assert.equal((await invoke({action:'save',...target,workspace,expectedUpdatedAt:saved.row.updated_at})).status,409);
saved=await invoke({action:'poll',...target,expectedUpdatedAt:saved.row.updated_at});assert.equal(saved.status,200,JSON.stringify(saved));assert.equal(polls,1);assert.equal(calls,1);
assert.equal(saved.row.sections.lunationWorkspace.body,candidate.body);assert.equal(saved.row.sections.lunationWorkspace.journalPrompt,candidate.journalPrompt);
assert.equal(saved.row.sections.lunationRun.lastResult.ownerApproved,false);assert.equal(saved.row.sections.lunationRun.lastResult.promotionAuthorized,false);assert.equal(saved.row.sections.lunationRun.lastResult.validationError,null,JSON.stringify(saved.row.sections.lunationRun.lastResult));
assert.equal(saved.row.sections.lunationRun.lastResult.outputHash,lunationDigest(candidate));
const reload=await invoke({action:'load',...target});assert.equal(reload.workspace.body,candidate.body);
assert.equal((await invoke({action:'poll',...target,expectedUpdatedAt:saved.row.updated_at})).status,200);assert.equal(calls,1);
unknown=true;plan=await invoke({action:'prepare',...target,expectedUpdatedAt:saved.row.updated_at});
const uncertain=await invoke({...generate,expectedUpdatedAt:saved.row.updated_at,approvedPlanHash:plan.plan.planHash});assert.equal(uncertain.ok,false);assert.equal(calls,2);
const held=await invoke({action:'load',...target});assert.ok(held.row.sections.lunationRun.active);assert.equal(held.workspace.body,candidate.body);
assert.equal((await invoke({...generate,expectedUpdatedAt:held.row.updated_at,approvedPlanHash:plan.plan.planHash})).status,409);assert.equal(calls,2);
console.log('PASS lunar Studio: actual-handler auth, private CRUD, CAS conflicts, two ephemeris dates, saved guidance to canonical writer, approval/freshness gates, duplicate-call prevention, durable result, unknown-outcome hold and publication denial; no billed calls.');
