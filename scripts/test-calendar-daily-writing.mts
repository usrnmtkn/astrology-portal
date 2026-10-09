import assert from 'node:assert/strict';
import {Readable} from 'node:stream';
import {store} from '../tests/helpers/sky-article-save-api.mts';
import handler from '../api/admin/calendar-daily-writing';
import publication from '../api/admin/content-publication';
import {dailyFacts,digest,PROFILE_FIELDS} from '../api/_lib/calendar-daily-writing';
import responses from '../src/astro-writing/openAIResponses.cjs';
const storageFetch=globalThis.fetch;
let calls=0,polls=0,unknown=false,failed=false,request:any;
const candidate='  Synthetic untouched first-pass paragraph.\n';
globalThis.fetch=async(input:any,options:any={})=>{
  const url=new URL(String(input));
  if(url.origin==='https://api.openai.com'){
    if(options.method==='POST'){calls++;request=JSON.parse(options.body);if(unknown)throw new Error('Synthetic unknown outcome');return Response.json({id:`resp_daily_${calls}`,status:'queued'});}
    polls++;return Response.json({id:url.pathname.split('/').at(-1),status:failed?'incomplete':'completed',usage:{input_tokens:10,output_tokens:20},output:[{type:'message',content:[{type:'output_text',text:candidate}]}]});
  }
  return storageFetch(input,options);
};
process.env.OPENAI_API_KEY='synthetic-only';
async function invoke(body:any,secret='calendar-api-fixture',endpoint=handler){
  const req:any=Readable.from([JSON.stringify(body)]);req.method='POST';req.url='/api/admin/calendar-daily-writing';req.headers={'x-content-generation-secret':secret};
  const res:any={statusCode:200,setHeader(){},end(raw:string){this.payload=JSON.parse(raw);}};await endpoint(req,res);return{status:res.statusCode,...res.payload};
}
const selection={date:'2026-10-07',timeZone:'America/New_York'};
assert.equal((await invoke({action:'load',...selection},'wrong')).status,401);
const initial=await invoke({action:'load',...selection});assert.equal(initial.status,200);assert.equal(initial.row,null);
const profile=Object.fromEntries(PROFILE_FIELDS.map(k=>[k,`Synthetic ${k} full reference marker.`]));
let profileRow=(await invoke({action:'save-profile',profile,expectedUpdatedAt:null})).profileRow;
assert.equal((await invoke({action:'save-profile',profile,expectedUpdatedAt:null})).status,409);
const workspace={thought:'Synthetic limited concern and mechanism.',exclusions:'Synthetic excluded framing.'};
let row=(await invoke({action:'save',...selection,workspace,expectedUpdatedAt:null})).row;
assert(row);assert.equal(row.body,'');assert.equal(row.status,'DRAFT');assert.equal(row.lane,'reference');
assert.equal((await invoke({action:'save',...selection,workspace,expectedUpdatedAt:null})).status,409);
for(const date of ['2026-02-30','2026-13-01'])assert.equal((await invoke({action:'load',...selection,date})).status,400);
assert.equal((await invoke({action:'load',...selection,timeZone:'invalid'})).status,400);
for(const action of ['publish','retire'])assert.equal((await invoke({action,id:row.id,contentKey:row.content_key,expectedUpdatedAt:row.updated_at},'calendar-api-fixture',publication)).status,400);
assert.equal((await store.invoke('PATCH',{id:row.id,status:'LIVE'})).status,400);
const call=(action:string,extra:any={})=>invoke({action,...selection,expectedUpdatedAt:row.updated_at,...extra});
let prep=(await call('prepare')).prepared;
assert.equal(prep.facts.mainSign,'Virgo');assert.equal(prep.facts.transition,null);assert.equal(prep.facts.signs[0].hours,24);
assert.equal(calls,0);
assert.equal((await call('generate',{requestHash:prep.requestHash})).status,409);
assert.equal((await call('generate',{requestHash:'stale',authorizeWriterCall:true})).status,409);
profileRow=(await invoke({action:'save-profile',profile:{...profile,instructions:profile.instructions+' Latest edit.'},expectedUpdatedAt:profileRow.updated_at})).profileRow;
assert.equal((await call('generate',{requestHash:prep.requestHash,authorizeWriterCall:true})).status,409);assert.equal(calls,0);
prep=(await call('prepare')).prepared;
const race=await Promise.all([call('generate',{requestHash:prep.requestHash,authorizeWriterCall:true}),call('generate',{requestHash:prep.requestHash,authorizeWriterCall:true})]);
assert.deepEqual(race.map(v=>v.status).sort(),[202,409]);row=race.find(v=>v.status===202).row;assert.equal(calls,1);
assert.deepEqual(request,{...prep.request,instructions:prep.instructions});assert(request.input.includes('Latest edit.'));assert(!request.instructions.includes('SPINE'));
assert.equal((await call('save',{workspace})).status,409);assert.equal((await call('generate',{requestHash:prep.requestHash,authorizeWriterCall:true})).status,409);
row=(await call('poll')).row;assert.equal(polls,1);assert.equal(calls,1);
const result=row.sections.run.results[0];assert.equal(result.candidate,candidate);assert.equal(result.outputHash,digest(candidate));assert.equal(result.ownerApproved,false);assert.equal(result.promotionAuthorized,false);assert.equal(result.status,'needs_review');
assert.deepEqual(result.response.usage,{input_tokens:10,output_tokens:20});assert.equal((await invoke({action:'load',...selection})).row.sections.run.results[0].candidate,candidate);
assert.equal((await call('generate',{requestHash:prep.requestHash,authorizeWriterCall:true})).status,409);assert.equal(calls,1);
// Invalid output is preserved, with no hidden evaluator or retry.
row=(await call('save',{workspace:{...workspace,thought:'Synthetic second distinct owner-approved concern.'}})).row;prep=(await call('prepare')).prepared;
row=(await call('generate',{requestHash:prep.requestHash,authorizeWriterCall:true})).row;failed=true;row=(await call('poll')).row;assert.equal(row.sections.run.results[1].status,'invalid');assert.equal(row.sections.run.results[0].candidate,candidate);assert.equal(calls,2);
// Uncertain dispatch remains reserved; a new click cannot bill again.
row=(await call('save',{workspace:{...workspace,thought:'Synthetic uncertain transport case.'}})).row;prep=(await call('prepare')).prepared;unknown=true;
assert.equal((await call('generate',{requestHash:prep.requestHash,authorizeWriterCall:true})).ok,false);row=(await invoke({action:'load',...selection})).row;assert(row.sections.run.active);assert.equal((await call('poll')).status,409);assert.equal((await call('generate',{requestHash:prep.requestHash,authorizeWriterCall:true})).status,409);assert.equal(calls,3);
const late=await dailyFacts('2026-10-06','America/New_York');assert.equal(late.mainSign,'Leo');assert.equal(late.transition?.to,'Virgo');assert.match(late.transition!.localTime,/10:52 PM/);assert(late.signs[1].hours<2);
for(const [date,zone,hours] of [['2026-11-01','America/New_York',25],['2026-03-08','America/New_York',23],['2026-10-07','Pacific/Kiritimati',24]] as const){const facts=await dailyFacts(date,zone);assert.equal(facts.signs.reduce((sum,v)=>sum+v.hours,0),hours);assert.equal(facts.date,date);}
assert.notEqual(responses.instructionsForRole('WRITER','',{surface:'calendar-lunation',family:'lunations'}),prep.instructions);
console.log('PASS daily Calendar: owner auth, private CRUD, stale writes, dynamic Swiss facts and DST, exact latest references, explicit one-call approval, race prevention, untouched durable output, invalid preservation, uncertain hold, no publication; mock provider only.');
