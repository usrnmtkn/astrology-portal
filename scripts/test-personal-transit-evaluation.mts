import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import https from 'node:https';
import { Readable } from 'node:stream';
import { syntheticTransitSources, syntheticMeaningRecord, digest } from './fixtures/personal-transit-writing.mjs';
import { buildPersonalTransitWriterContext, personalTransitDestinationChecks } from '../api/_lib/personal-transit-writer-context.js';
import { MODEL, loadState } from '../src/astro-writing/ownerTransitBatch.mjs';
import { feedbackForWriter, loadCurrentFeedback } from '../src/astro-writing/personalTransitInputControls.mjs';

const directory=mkdtempSync(join(tmpdir(),'transit-evaluation-'));
const previous={argv:process.argv,key:process.env.GEMINI_API_KEY};
const originalRequest=https.request;let calls=0,failCall=0,wrongContact=false,sequence=0;
const read=(path:string)=>JSON.parse(readFileSync(path,'utf8'));
const write=(path:string,value:any)=>writeFileSync(path,JSON.stringify(value));
async function run(...args:string[]) {
  process.argv=['node','evaluate-personal-transit-writer.mts',...args];
  await import(`./evaluate-personal-transit-writer.mts?fixture=${++sequence}`);
}
try {
  process.env.GEMINI_API_KEY='synthetic-key-only';
  const keys=['venus/moon/square','neptune/jupiter/trine','mercury/venus/trine','moon/chiron/trine'].map(k=>'authored/transit-aspect/'+k);
  const sources:any=syntheticTransitSources();sources.meanings=keys.map(key=>syntheticMeaningRecord(key,'Synthetic unapproved meaning.',false));
  sources.calibration={required:true,id:'synthetic-review',source:'synthetic-owner-request',contentKeys:keys};
  const candidate={...sources.passages[0],id:'preferred-owner-authored',contentKey:'owner-voice/synthetic',preferred:true,ownerAuthored:true,ownerApproved:false,
    excludedContentKeys:[keys[3]],perspectiveUse:{audiences:['you','friend'],source:'synthetic-owner-role'}};
  sources.passages.push(candidate);
  const sourcesPath=join(directory,'sources.json');write(sourcesPath,sources);
  const catalog=keys.map(contentKey=>({contentKey,body_you:'{{untilDate}}',body_they:'{{untilDate}}'}));
  const catalogPath=join(directory,'catalog.json');write(catalogPath,catalog);
  const feedbackFile=join(directory,'feedback.json');write(feedbackFile,{schema:'personal-transit-feedback-v1',corrections:[],rejectionSources:[]});
  const evaluationPermission={actor:'owner',decision:'test-proposed-keep-unapproved',source:'synthetic-owner-request',ownerStatement:'Synthetic permission',calibrationId:'synthetic-review',ownerApproved:false,
    records:sources.meanings.map((m:any)=>({contentKey:m.contentKey,textSha256:m.sha256,recordSha256:m.recordSha256}))};
  const prepare=async(name:string)=>{
    const planPath=join(directory,name+'-plan.json'),output=join(directory,name),authPath=join(directory,name+'-auth.json');
    write(planPath,{schema:'personal-transit-input-plan-v1',id:name,source:'synthetic-test',selectedContacts:keys,requiredRegressionContacts:keys.slice(0,2),catalogPath,sourcesPath,feedbackFile,calibration:sources.calibration,evaluationPermission});
    await run('--prepare',output,planPath);
    const path=join(output,'manifest.json'),m=read(path);
    const auth={schema:'personal-transit-explicit-authorization-v1',actor:'owner',decision:'authorize-exact-batch',source:'synthetic-test-only',ownerStatement:'Synthetic intercepted transport permission',
      model:MODEL,maximumCalls:8,callsPerRequest:1,retries:0,reviewerCalls:0,automaticRewrites:0,publicationAuthorized:false,deploymentAuthorized:false,
      manifestSha256:digest(readFileSync(path)),requestHashes:m.requests.map((r:any)=>r.requestSha256)};
    write(authPath,auth);return {output,authPath,auth,manifest:m};
  };
  (https as any).request=(_url:any,_options:any,receive:any)=>{
    assert.equal(_url,MODEL.endpoint);
    const request={setTimeout(){return request;},on(){return request;},end(bytes:Buffer){
      calls++;const body=JSON.parse(bytes.toString());
      assert.deepEqual(body.generation_config,MODEL.generation_config);assert.equal(body.store,false);
      const payload=JSON.parse(body.input.slice(body.input.indexOf('{"transit":'))),d=payload.destinations[0];
      const text=wrongContact?'With transiting Mars square your natal Saturn through {{untilDate}}, you can decide where to put your effort.':`${d.perspective==='you'?'You':'They'} read this synthetic result through {{untilDate}}.`;
      const response=Object.assign(Readable.from([JSON.stringify({status:'completed',model:body.model,output_text:JSON.stringify({slotValues:{[d.field]:text}}),usage:{total_tokens:1}})]),
        {statusCode:calls===failCall?503:200,headers:{}});
      queueMicrotask(()=>receive(response));
    }};return request;
  };
  const failure=await prepare('failure');await run('--preflight',failure.output,failure.authPath);assert.equal(calls,0);
  write(failure.authPath,{...failure.auth,manifestSha256:'stale'});
  await assert.rejects(run('--dispatch-eight-once',failure.output,failure.authPath),/AUTHORIZATION_MANIFEST/);assert.equal(calls,0);write(failure.authPath,failure.auth);
  failCall=2;await run('--dispatch-eight-once',failure.output,failure.authPath);
  const failed=read(join(failure.output,'execution-receipt.json'));
  assert.equal(failed.networkAttempts,2);assert.equal(failed.completedGenerations,1);assert.equal(failed.notAttempted,6);
  assert(readFileSync(join(failure.output,'responses/attempt-2-friend/raw-response.bin')).length);
  await assert.rejects(run('--dispatch-eight-once',failure.output,failure.authPath),/ALREADY_ATTEMPTED/);assert.equal(calls,2);
  const success=await prepare('success');failCall=0;
  const state=loadState(join(success.output,'batch'));
  const feedback=feedbackForWriter(loadCurrentFeedback(feedbackFile,{excludeBatchDirectory:join(success.output,'batch')}));
  for(const c of state.contacts)for(const p of c.passages){
    const context=buildPersonalTransitWriterContext({contentKey:c.contentKey,...c.facts,requested:[p.perspective],record:catalog.find(r=>r.contentKey===c.contentKey),facts:{},instruction:'',youText:'',friendText:''},
      {...sources,feedback},{evaluationPermission});
    assert.equal(p.request.input,context.prompt,'Batch sends the actual Studio prompt byte for byte');
    const selected=p.input.destinations[0].voiceExamples;
    assert.equal(selected.some((e:any)=>e.sourceId===candidate.id),c.contentKey!==keys[3],'Owner-authored voice role and target exclusion stay independent of prose approval');
    assert(selected.every((e:any)=>sources.passages.some((source:any)=>source.id===e.sourceId && source.text===e.text)));
  }
  await run('--dispatch-eight-once',success.output,success.authPath);
  const completed=read(join(success.output,'execution-receipt.json'));
  assert.equal(completed.networkAttempts,8);assert.equal(completed.completedGenerations,8);assert.equal(completed.retries,0);
  for(const c of loadState(join(success.output,'batch')).contacts)for(const p of c.passages){assert.equal(p.status,'needs-review');assert.equal(p.approved,null);assert.equal(p.currentText,p.original.text);}
  const wrong=await prepare('wrong-contact');wrongContact=true;
  await run('--dispatch-eight-once',wrong.output,wrong.authPath);
  const held=read(join(wrong.output,'execution-receipt.json'));assert.equal(held.networkAttempts,1);assert.equal(held.results[0].status,'held-for-review');
  assert(held.results[0].validation.findings.some((f:any)=>f.code==='TRANSIT_IDENTITY_MISMATCH'));
  const context=buildPersonalTransitWriterContext({contentKey:keys[2],transiting:'mercury',natal:'venus',aspect:'trine',requested:['you'],record:catalog[2],facts:{sign:'virgo',transitHouse:'7'},instruction:'',youText:'',friendText:''},{...sources,feedback},{evaluationPermission});
  assert.deepEqual(personalTransitDestinationChecks(context,{youDraft:'You read a synthetic Virgo seventh house fixture through {{untilDate}}.'}),[]);
  assert(personalTransitDestinationChecks(context,{youDraft:'You read an Aries eighth house fixture through {{untilDate}}.'}).length>=2);
  assert(read(sourcesPath).meanings.every((m:any)=>m.status==='proposed-owner-review'));
} finally {
  https.request=originalRequest;process.argv=previous.argv;
  if(previous.key===undefined)delete process.env.GEMINI_API_KEY;else process.env.GEMINI_API_KEY=previous.key;
  rmSync(directory,{recursive:true,force:true});
}
console.log('PASS consolidated Studio/batch evaluation: identical prompts, scoped proposed meaning permission, complete role-assigned evidence, per-contact exclusion, intercepted eight-call success, HTTP failure, wrong-contact hold, raw receipts, no replay and no approval. Zero provider calls.');
