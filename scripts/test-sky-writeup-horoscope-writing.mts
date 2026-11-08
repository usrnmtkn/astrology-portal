import assert from 'node:assert/strict';
import {Readable} from 'node:stream';
import {createApiStore} from '../tests/helpers/calendar-review-api.mjs';
import {skyPlacementSourceFixture} from '../tests/helpers/sky-placement-source-fixture.mts';

const fixture=await skyPlacementSourceFixture('mercury','scorpio');
const row={...fixture.active,status:'DRAFT',lane:'reference',review_state:'owner-review-required',source_snapshot:{engineFacts:{articlePeriod:'current',motion:'retrograde'}}};
const store=await createApiStore([row]);const storeFetch=globalThis.fetch;let calls=0;
Object.assign(process.env,{OPENAI_API_KEY:'synthetic-writeup-key',ANTHROPIC_API_KEY:'synthetic-writeup-key'});
const text='An unfinished task catches your attention. You reopen the instructions and correct a missed detail before sending the result.';
globalThis.fetch=async(url:any,init:any={})=>{
 if(String(url).includes('/rpc/studio_memory_active_snapshot'))return Response.json([{snapshot:{rows:[],writingFeedback:[]}}]);
 if(String(url).includes('studio_writing_feedback'))return Response.json([]);
 if(String(url)==='https://api.openai.com/v1/responses'){
  calls++;const request=JSON.parse(init.body);assert(request.input.includes(fixture.edition.transitStartInstant));assert(request.input.includes('whole-sign'));assert(request.input.includes('gemini'));assert(request.input.includes('"house": "6"'));assert(request.input.includes('"motion": "retrograde"'));
  assert.deepEqual(Object.keys(request.text.format.schema.properties.slotValues.properties),['horoscopeBody']);
  return Response.json({id:'synthetic-planetary-response',output_text:JSON.stringify({slotValues:{horoscopeBody:text}})});
 }
 if(String(url)==='https://api.anthropic.com/v1/messages'){
  calls++;const request=JSON.parse(init.body);assert.deepEqual(Object.keys(request.tools[0].input_schema.properties.slotValues.properties),['horoscopeBody']);
  return Response.json({id:'synthetic-planetary-claude',content:[{type:'tool_use',name:request.tools[0].name,id:'synthetic-tool',input:{slotValues:{horoscopeBody:text}}}]});
 }
 return storeFetch(url,init);
};
const {default:handler}=await import('../api/admin/sky-article-template-slots');
async function invoke(body:any,authorized=true){const req:any=Object.assign(Readable.from([JSON.stringify(body)]),{method:'POST',url:'/api/admin/sky-article-template-slots',headers:authorized?{'x-content-generation-secret':'calendar-api-fixture'}:{}});const res:any={statusCode:0,setHeader(){},end(s:string){this.payload=JSON.parse(s)}};await handler(req,res);return {status:res.statusCode,...res.payload};}
const body={writeupHoroscope:{id:row.id,expectedUpdatedAt:row.updated_at,sign:'gemini',currentText:''},voiceNotes:'Use the supplied transit meaning.'};
const before=JSON.stringify([...store.rows]);
try{
 assert.equal((await invoke(body,false)).status,401);
 assert.equal((await invoke({...body,writeupHoroscope:{...body.writeupHoroscope,expectedUpdatedAt:'2000-01-01'}})).status,409);
 assert.equal((await invoke({...body,facts:{planet:'venus'}})).status,400);assert.equal(calls,0);
 for(const patch of [{status:'ARCHIVED'},{body:'Tampered body.'},{sections:{}},{sections:{skyArticleEdition:{...fixture.edition,compiledHash:'0'.repeat(64)}}}]){
  store.rows.set(row.id,{...row,...patch});
  assert.equal((await invoke(body)).status,409,'Invalid saved sources fail before provider dispatch.');assert.equal(calls,0);
 }
 store.rows.set(row.id,structuredClone(row));
 const preview=await invoke({...body,preview:true,provider:'openai'});assert.equal(preview.status,200,preview.error);assert.equal(calls,0);assert(preview.writingExport.text.includes(fixture.edition.transitEndInstant));
 for(const provider of ['openai','claude']){const result=await invoke({...body,provider});assert.equal(result.status,200,result.error);assert.equal(result.body,text);assert.equal(result.source.sign,'gemini');assert.equal(result.source.id,row.id);assert.equal(result.source.updatedAt,row.updated_at);assert.equal(result.source.compiledHash,fixture.edition.compiledHash);assert.equal(result.source.startsAt,fixture.edition.transitStartInstant);assert.equal(result.source.endsAt,fixture.edition.transitEndInstant);assert.equal(result.saved,false);assert.equal(result.published,false);}
 assert.equal(calls,2);assert.equal(JSON.stringify([...store.rows]),before);
 console.log('PASS: authenticated saved-version planetary horoscope generation reuses both governed provider paths; free export makes zero calls; forged facts/stale versions fail before dispatch; exact sign/window drafts never save or publish.');
}finally{globalThis.fetch=storeFetch;store.close();}
