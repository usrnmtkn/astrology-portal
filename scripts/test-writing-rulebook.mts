import assert from 'node:assert/strict';
import {test} from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {createHash} from 'node:crypto';
// @ts-ignore Shared server/CLI source.
import {buildMemoryIndex,sha256} from '../api/_lib/agent-memory.mjs';
// @ts-ignore Shared source projection.
import {buildWritingRulebook,writingReferenceContracts} from '../api/_lib/writing-rulebook.mjs';
import {readLiveWritingRulebook} from '../api/_lib/writing-rulebook-live.js';
import {createMemoryGraphHandler} from '../api/admin/memory-graph.js';
// @ts-ignore Test-only local storage, never production input.
import {startRulebookStorage} from '../tests/helpers/writing-rulebook-storage.mjs';
const root=process.cwd(),read=(name:string)=>fs.readFileSync(path.join(root,name),'utf8');
const revision='a'.repeat(40),index=buildMemoryIndex({root,revision});

test('complete registered rule inventory, canonical contracts and all three amendments preserve exact sources',()=>{
  const result=buildWritingRulebook(index,read);
  const registry=JSON.parse(read('config/writing-effective-rules-v1.json'));
  const expected=new Set([...index.sources.filter((s:any)=>(['rule','correction'].includes(s.kind)||s.kind==='note'&&s.path.startsWith('docs/'))&&s.status==='current').map((s:any)=>s.path),
    'tldr-astro-phrasebank/TLDR-WRITING-AUTHORITY-INDEX.md',...writingReferenceContracts,
    ...registry.rules.filter((r:any)=>r.tier!=='retired').map((r:any)=>r.ownerAuthority.sourcePath)]);
  assert.deepEqual(new Set(result.documents.map((d:any)=>d.path)),expected);
  assert.equal(new Set(result.documents.map((d:any)=>d.id)).size,expected.size);
  for(const doc of result.documents){assert.equal(doc.body,read(doc.path));assert.equal(doc.bodySha256,sha256(doc.body));assert.equal(doc.sourceSha256,sha256(read(doc.path)));assert.equal(doc.sourceUrl,`https://github.com/usrnmtkn/astrology-portal/blob/${revision}/${doc.path}`);}
  assert.ok(!result.documents.some((d:any)=>d.path.includes('CHECKLIST-V6')||d.kind==='example'||d.path==='data/agent-memory/decisions.jsonl'));
  assert.ok(result.superseded.some((d:any)=>d.path.includes('CHECKLIST-V6')));
  assert.deepEqual(result.registry.rules,registry.rules.filter((r:any)=>r.tier!=='retired'));
  assert.equal(result.registry.body,read('config/writing-effective-rules-v1.json'));
  const amendments=result.documents.find((d:any)=>d.id===result.amendmentsId);
  for(const phrase of ['## Aphorisms and maxims — November 6 owner amendment','## No mixed metaphors — November 6 owner amendment','## Horoscope endings — November 6 owner amendment','A horoscope has no required concluding paragraph.'])assert.ok(amendments.body.includes(phrase));
  const aspect=result.documents.find((d:any)=>d.path==='docs/writing/SKY_CALENDAR_ASPECT_STANDARD.md');
  assert.equal(aspect.bodySha256,'b44b58dcaccfd78b85d9a37109e2a974394cc006c2e66f835d24819238ff8e13');
  assert.equal(result.documents.filter((d:any)=>d.records).reduce((n:number,d:any)=>n+d.records.length,0),97);
});

test('missing, corrupted and unsafe source references fail closed instead of yielding a partial rulebook',()=>{
  assert.throws(()=>buildWritingRulebook(index,(name:string)=>name==='docs/writing/RHETORICAL_PATTERN_PROTECTIONS.md'?'Changed bytes':read(name)),/integrity/);
  assert.throws(()=>buildWritingRulebook(index,(name:string)=>{if(name==='docs/writing/VOICE_CONTRACT.md')throw Error('Missing source');return read(name);}),/Missing source/);
  const registry=JSON.parse(read('config/writing-effective-rules-v1.json'));registry.rules[0].ownerAuthority.sourcePath='../../outside.md';
  let outsideRead=false;assert.throws(()=>buildWritingRulebook(index,(name:string)=>{if(name==='../../outside.md')outsideRead=true;return name==='config/writing-effective-rules-v1.json'?JSON.stringify(registry):read(name);}),/Invalid writing reference/);assert.equal(outsideRead,false);
});

test('owner authorization precedes repository and live rule reads, and POST cannot change instructions',async()=>{
  let liveReads=0;const handler=createMemoryGraphHandler(async()=>false,()=>{throw Error('Not read');},async()=>{liveReads++;throw Error('Not read');});
  const server=http.createServer(handler);await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
  try{const base=`http://127.0.0.1:${(server.address()as any).port}`;
    for(const mode of ['rules','live-rules'])for(const headers of [{},{'x-content-admin-session':'synthetic-non-owner'}]){
      const response=await fetch(`${base}/?mode=${mode}`,{headers});assert.equal(response.status,401);const body=await response.json();assert.equal(body.rulebook,undefined);assert.equal(body.live,undefined);assert.equal(response.headers.get('cache-control'),'private, no-store');}
    assert.equal((await fetch(`${base}/?mode=live-rules`,{method:'POST'})).status,405);assert.equal(liveReads,0);
  }finally{await new Promise<void>(resolve=>server.close(()=>resolve()));}
});

test('actual live readers preserve every profile field, active reason, target and version without storage writes',async()=>{
  const fixture=await startRulebookStorage();const names=['SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','STUDIO_MEMORY_FEEDBACK_ENABLED'];const before=Object.fromEntries(names.map(n=>[n,process.env[n]]));
  process.env.SUPABASE_URL=fixture.url;process.env.SUPABASE_SERVICE_ROLE_KEY='synthetic-rulebook-service-key';process.env.STUDIO_MEMORY_FEEDBACK_ENABLED='true';
  try{
    const original=structuredClone(fixture.state);let live=await readLiveWritingRulebook();assert.equal(live.complete,true);assert.equal(live.profiles.rows!.length,4);
    for(const row of fixture.state.profiles){const actual=live.profiles.rows!.find((x:any)=>x.id===row.id)!;assert.deepEqual(actual.profile,row.sections.writingProfile);assert.equal(actual.revision,4);assert.equal(actual.sha256,createHash('sha256').update(JSON.stringify(row.sections.writingProfile)).digest('hex'));}
    assert.equal(live.profiles.rows!.find((x:any)=>x.profile.period==='seasonal')!.id,null);
    assert.deepEqual(live.feedback.writing!.map((r:any)=>[r.id,r.reason,r.scope,r.version,r.rejected]),fixture.state.writingFeedback.map((r:any)=>[r.id,r.owner_reason,r.target_keys,r.version,r.rejected_text]));
    const edit=live.feedback.edits![0],stored=fixture.state.edits[0];
    assert.deepEqual([edit.scope,edit.reason,edit.before,edit.after,edit.version],[stored.scope,stored.reason,stored.before_text,stored.after_text,stored.version]);
    const hash=(text:string)=>createHash('sha256').update(text).digest('hex');
    assert.deepEqual(edit.fieldHashes,{owner_reason:hash(stored.reason),bad:hash(stored.before_text),corrected:hash(stored.after_text)});
    for(const row of live.profiles.rows!)for(const field of ['voiceGuidance','structure','sourceGuidance','prompt'])assert.equal(row.fieldHashes[field],hash(row.profile[field]));
    assert.deepEqual(fixture.state,original);
    fixture.state.writingFeedback[0].owner_reason='Synthetic newly saved rule, exact new wording.';fixture.state.writingFeedback[0].version=2;
    live=await readLiveWritingRulebook();assert.equal(live.feedback.writing![0].reason,'Synthetic newly saved rule, exact new wording.');assert.equal(live.feedback.writing![0].version,2);
    fixture.state.writingFeedback[0].status='retired';live=await readLiveWritingRulebook();assert.equal(live.feedback.writing!.length,1);
    assert.ok(fixture.requests.every((r:any)=>r.method==='GET'&&r.path==='/rest/v1/generated_interpretations'||r.method==='POST'&&r.path==='/rest/v1/rpc/studio_memory_active_snapshot'));
    assert.ok(!JSON.stringify(live).includes('synthetic-rulebook-service-key'));
    fixture.state.failProfiles=true;live=await readLiveWritingRulebook();assert.equal(live.complete,false);assert.equal(live.profiles.status,'unavailable');assert.equal(live.profiles.rows,undefined);assert.equal(live.feedback.status,'current');
    fixture.state.failProfiles=false;fixture.state.failFeedback=true;live=await readLiveWritingRulebook();assert.equal(live.complete,false);assert.equal(live.profiles.status,'current');assert.equal(live.feedback.status,'unavailable');assert.equal(live.feedback.writing,undefined);
  }finally{for(const name of names){if(before[name]===undefined)delete process.env[name];else process.env[name]=before[name];}await fixture.close();}
});
