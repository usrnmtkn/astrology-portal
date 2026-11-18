import assert from 'node:assert/strict';
import handler from '../api/admin/writing-runs';
import archive from '../src/astro-writing/writingRunArchive.cjs';
import responses from '../src/astro-writing/openAIResponses.cjs';
import {callReportCalibrationModel,withReportModelResponseRetries} from '../api/_lib/report-model-client';
import {writingRunArchiveFixture} from '../tests/helpers/writing-run-archive.mjs';
process.env.CONTENT_GENERATION_SECRET='fixture-owner-secret';process.env.SUPABASE_URL='https://archive-fixture.invalid';process.env.SUPABASE_SERVICE_ROLE_KEY='fixture-service';
process.env.OPENAI_API_KEY='fixture-openai';process.env.ANTHROPIC_API_KEY='fixture-anthropic';
const fixture=writingRunArchiveFixture();let providerCalls=0,storageUnavailable=false,badOutput=false;
const bodies:string[]=[];
globalThis.fetch=async(input:any,options:any={})=>{
 const url=new URL(String(input));
 if(url.origin===process.env.SUPABASE_URL){if(storageUnavailable)return Response.json({}, {status:503});const result=await fixture.handle(url,options);if(result)return result;throw Error('Unexpected fixture storage request');}
 assert(['https://api.openai.com','https://api.anthropic.com'].includes(url.origin));
 providerCalls++;bodies.push(options.body);assert([...fixture.rows.values()].some(r=>r.request_body===options.body));
 if(url.origin.includes('anthropic'))return Response.json({id:'msg_fixture',content:[{type:'tool_use',name:'report_unit_draft',input:{body:'result'}}]});
 return Response.json({id:'resp_fixture_'+providerCalls,output_text:badOutput&&providerCalls===1?'malformed':'{"body":"result"}'});
};
async function invoke(query='',secret='fixture-owner-secret',method='GET'){
 const req:any={method,url:'/api/admin/writing-runs'+query,headers:{'x-content-generation-secret':secret}};
 const headers:any={};const res:any={statusCode:200,setHeader(k:string,v:string){headers[k]=v;},end(v:string){this.body=JSON.parse(v);}};
 await handler(req,res);return {status:res.statusCode,body:res.body,headers};
}
assert.equal((await invoke('', 'wrong')).status,401);assert.equal((await invoke('', 'fixture-owner-secret','POST')).status,405);
assert.deepEqual((await invoke()).body.runs,[]);
const schema={type:'object',properties:{body:{type:'string'}},required:['body'],additionalProperties:false};
badOutput=true;
await archive.withWritingRunContext({surface:'you-week',jobId:'fixture-job',period:'week'},()=>withReportModelResponseRetries(callReportCalibrationModel)({provider:'openai',model:'fixture',prompt:'Complete synthetic selected evidence.',schemaName:'report_unit_draft',schema}));
assert.equal(providerCalls,2);assert.notEqual(bodies[0],bodies[1]);assert.equal(fixture.rows.size,2);
assert([...fixture.rows.values()].every(r=>r.surface==='you-week'&&r.context.jobId==='fixture-job'));
await callReportCalibrationModel({provider:'claude',model:'fixture',prompt:'Full Anthropic evidence.',schemaName:'report_unit_draft',schema,archiveContext:{surface:'friends-transit',jobId:'fixture-friend'}});
const list=await invoke('?limit=1');assert.equal(list.status,200);assert.equal(list.headers['Cache-Control'],'private, no-store');assert.equal(list.body.runs.length,1);assert(list.body.next);assert(!('request_body' in list.body.runs[0]));assert(!('evidence' in list.body.runs[0]));
const id=list.body.runs[0].id,detail=await invoke('?id='+id);assert.equal(detail.status,200);archive.verifyArchivedRun(detail.body.run);
assert.equal((await invoke('?surface=friends-transit')).body.runs.length,1);
assert.equal((await invoke('?limit=1000')).status,400);assert.equal((await invoke('?id=not-a-uuid')).status,400);assert.equal((await invoke('?surface=x&surface=y')).status,400);
assert.equal((await invoke('?id=11111111-1111-1111-1111-111111111111')).status,404);
const cursor=new URLSearchParams({...list.body.next,through:list.body.through,limit:'1'});const second=await invoke('?'+cursor);assert.equal(second.body.runs.length,1);assert.notEqual(second.body.runs[0].id,id);
// An archive outage cannot trigger fallback to an unarchived second provider.
process.env.REPORT_FALLBACK_PROVIDER='claude';process.env.REPORT_FALLBACK_MODEL='fixture-fallback';storageUnavailable=true;
const before=providerCalls;await assert.rejects(callReportCalibrationModel({provider:'openai',model:'fixture',prompt:'full input',schemaName:'report_unit_draft',schema}),e=>e instanceof archive.WritingRunArchiveError);assert.equal(providerCalls,before);assert.equal((await invoke()).status,503);
storageUnavailable=false;
// Exact final instructions and every selected passage survive reload, including
// feedback materialized before this boundary and a profile edit after dispatch.
const selected={profile:{revision:2,prompt:'Saved profile'},feedback:[{id:'selected',text:'Full rejected synthetic passage.'}],examples:[{id:'positive',text:'Full synthetic example.\nSecond paragraph.'}]};
await responses.callOpenAIResponses({apiKey:'fixture',role:'REVIEWER',surface:'horoscopes',family:'horoscope',archiveContext:{period:'weekly'},governedInstructions:'Exact judge instruction.',request:{model:'fixture',input:JSON.stringify(selected)}});
const last=[...fixture.rows.values()].at(-1)!;selected.profile.prompt='Edited after dispatch';
const reloaded=await invoke('?id='+last.id);assert.equal(JSON.parse(JSON.parse(reloaded.body.run.request_body).input).profile.prompt,'Saved profile');
assert.equal(JSON.parse(reloaded.body.run.request_body).instructions,'Exact judge instruction.');
fixture.rows.get(last.id).request_body+=' ';assert.equal((await invoke('?id='+last.id)).status,503);
console.log('PASS actual archive handler: owner denial, reload, list/detail/filter/cursor, invalid input, storage outage; report OpenAI/Anthropic attempts, retry isolation and no unarchived fallback.');
