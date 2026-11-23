import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,rmSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import archive from '../src/astro-writing/writingRunArchive.cjs';
import responses from '../src/astro-writing/openAIResponses.cjs';
import gemini from '../src/astro-writing/geminiInteractions.cjs';
import {writingRunArchiveFixture} from '../tests/helpers/writing-run-archive.mjs';
import {exportWritingRuns,zipWritingRuns} from './export-writing-runs.mjs';
const fixture=writingRunArchiveFixture(),hash=x=>createHash('sha256').update(x).digest('hex');
const prose='  Complete synthetic source — café 🌒.\nSecond paragraph.  ';
let calls=0;
const send=async(url,init)=>{calls++;const saved=[...fixture.rows.values()].findLast(r=>r.request_body===init.body);assert(saved);assert.equal(saved.state,'dispatch_reserved');return Response.json({id:`resp_${calls}`,status:'completed',output_text:'Synthetic output.'});};
await archive.withWritingRunStore(fixture.store,async()=>{
 await responses.callOpenAIResponses({apiKey:'secret-never-archived',role:'WRITER',surface:'sky',family:'slot',archiveContext:{contentKey:'fixture/sky'},governedInstructions:' Exact frozen instructions. ',request:{model:'fixture-openai',input:prose},fetchImpl:send});
 const first=[...fixture.rows.values()][0];assert.equal(first.request_sha256,hash(first.request_body));assert.equal(JSON.parse(first.request_body).instructions,'Exact frozen instructions.');assert.equal(first.evidence.fields.find(f=>f.pointer==='/input').value,prose);assert(!JSON.stringify(first).includes('secret-never-archived'));
 const after=structuredClone(first);after.context.contentKey='changed';assert.throws(()=>archive.verifyArchivedRun(after),/integrity/);
 const changed=structuredClone(first);changed.request_body+=' ';assert.throws(()=>archive.verifyArchivedRun(changed),/integrity/);
 await Promise.all(['weekly','monthly'].map(period=>archive.withWritingRunContext({period,editionId:'fixture-'+period},async()=>{
  await new Promise(resolve=>setTimeout(resolve,period==='weekly'?8:1));
  await responses.callOpenAIResponses({apiKey:'fixture',role:'RHETORICAL_REVIEWER',surface:'horoscopes',family:'horoscope',governedInstructions:'Review supplied evidence only.',request:{model:'fixture-judge',input:JSON.stringify({period,selectedEvidence:[prose]})},fetchImpl:send});
 })));
 for(const r of [...fixture.rows.values()].slice(1)){assert.equal(JSON.parse(JSON.parse(r.request_body).input).period,r.context.period);assert.equal(r.role,'RHETORICAL_REVIEWER');}
 await responses.startStoredNativeWritingResponse({provider:'anthropic',apiKey:'fixture',role:'WRITER',surface:'horoscopes',family:'horoscope',governedInstructions:'Frozen native instructions',request:{model:'fixture-native',system:'Frozen native instructions',messages:[{role:'user',content:prose}],stream:true},fetchImpl:async(url,init)=>{await send(url,init);const r=new Response('event: message_start\ndata: {}\n\n',{headers:{'content-type':'text/event-stream'}});r.clone=()=>{throw Error('Stream must not be cloned');};return r;}}).then(async r=>assert.match(await r.text(),/message_start/));
 await gemini.callGeminiInteractions({apiKey:'fixture',role:'REVIEWER',surface:'calendar',family:'lunar',systemInstruction:'Frozen Gemini instructions',input:prose,fetchImpl:async(url,init)=>{await send(url,init);return Response.json({id:'gemini_fixture',steps:[{type:'text',text:'result'}]});}});
 const latest=[...fixture.rows.values()].at(-1);assert.equal(latest.provider,'gemini');assert.equal(latest.role,'REVIEWER');assert.equal(JSON.parse(latest.request_body).system_instruction,'Frozen Gemini instructions');
 await archive.archivedWritingFetch('https://api.openai.com/v1/responses',{method:'POST',body:JSON.stringify({model:'fixture',input:prose})},{provider:'openai',fetchImpl:async()=>Response.json({error:{message:'private diagnostic not copied'}},{status:429})});assert.equal([...fixture.rows.values()].at(-1).state,'provider_rejected');assert(!JSON.stringify([...fixture.rows.values()].at(-1)).includes('private diagnostic'));
 await assert.rejects(archive.archivedWritingFetch('https://api.openai.com/v1/responses',{method:'POST',body:'{"model":"fixture","input":"evidence"}'},{provider:'openai',fetchImpl:async()=>{throw Error('network fixture');}}),/network fixture/);assert.equal([...fixture.rows.values()].at(-1).state,'outcome_unknown');
});
let dispatches=0;
const init={method:'POST',body:'{"model":"fixture","input":"unchanged"}'};
await assert.rejects(archive.withWritingRunStore({create:async()=>{throw Error('storage down');}},()=>archive.archivedWritingFetch('https://api.openai.com/v1/responses',init,{provider:'openai',fetchImpl:async()=>{dispatches++;return Response.json({});}})),e=>e instanceof archive.WritingRunArchiveError&&e.phase==='before_dispatch');assert.equal(dispatches,0);
await assert.rejects(archive.withWritingRunStore({...fixture.store,finish:async()=>{throw Error('post-call storage down');}},()=>archive.archivedWritingFetch('https://api.openai.com/v1/responses',init,{provider:'openai',fetchImpl:async()=>{dispatches++;return Response.json({id:'resp_unknown'});}})),e=>e instanceof archive.WritingRunArchiveError&&e.phase==='after_dispatch');assert.equal(dispatches,1);
await archive.withWritingRunStore({...fixture.store,create:async row=>{await fixture.store.create(row);init.body='{"model":"changed"}';}},()=>archive.archivedWritingFetch('https://api.openai.com/v1/responses',init,{provider:'openai',fetchImpl:async(_,options)=>{assert.equal(JSON.parse(options.body).input,'unchanged');return Response.json({id:'resp_frozen'});}}));
// Same-time cursor pages and identical requests retain every physical call.
await archive.withWritingRunStore(fixture.store,()=>Promise.all(Array.from({length:52},()=>archive.archivedWritingFetch('https://api.openai.com/v1/responses',{method:'POST',body:'{"model":"fixture","input":"same"}'},{provider:'openai',surface:'paging',fetchImpl:async()=>Response.json({id:'response_fixture'})}))));
const temporary=mkdtempSync(path.join(tmpdir(),'writing-run-export-test-'));
try{
 const out=path.join(temporary,'runs'),zip=path.join(temporary,'runs.zip');
 const result=await exportWritingRuns({out,store:fixture.store,through:'2026-11-19T00:00:00Z'});assert.equal(result.runs,fixture.rows.size);
 const index=JSON.parse(readFileSync(path.join(out,'INDEX.json'),'utf8'));assert.equal(new Set(index.runs.map(r=>r.id)).size,fixture.rows.size);
 for(const row of fixture.rows.values())assert.equal(readFileSync(path.join(out,row.id,'request-body.txt'),'utf8'),row.request_body);
 assert.throws(()=>zipWritingRuns(out,path.resolve('private-test-export.zip')),/outside a Git checkout/);
 await assert.rejects(exportWritingRuns({out:path.resolve('private-test-export'),store:fixture.store}),/outside a Git checkout/);
 zipWritingRuns(out,zip);assert(existsSync(zip));execFileSync('python3',['-c',"import sys,zipfile; z=zipfile.ZipFile(sys.argv[1]); assert z.testzip() is None",zip]);
 await assert.rejects(exportWritingRuns({out,store:fixture.store}),/new absolute/);
}finally{rmSync(temporary,{recursive:true,force:true});}
console.log('PASS final request bytes, selected evidence, exact instructions, provider parity, concurrent scope, streaming preservation, fail-closed dispatch, ambiguous outcomes, immutable hashes, pagination and ZIP round-trip; synthetic calls only.');
