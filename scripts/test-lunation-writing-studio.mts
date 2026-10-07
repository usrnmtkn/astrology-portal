import assert from 'node:assert/strict';
import {rows,invoke,providerFixture,feedbackFixture} from '../tests/helpers/lunation-writing-api.mts';
import {calculateLunationArticleFacts,lunationArticleEvents,verifiedLunationEclipse} from '../api/_lib/lunation-article-facts';
import {prepareLunationArticle,writeLunationArticle,lunationArticleHash} from '../src/astro-writing/lunationArticleWriting.mjs';

assert.equal(lunationArticleHash({z:[{b:2,a:1}],a:null}),lunationArticleHash({a:null,z:[{a:1,b:2}]}));
assert.notEqual(lunationArticleHash([1,2]),lunationArticleHash([2,1]));
assert.notEqual(lunationArticleHash({a:1}),lunationArticleHash({a:2}));
assert.equal((await invoke('GET',undefined,undefined,'wrong')).status,401);
assert.equal((await invoke('DELETE')).status,405);
assert.equal((await invoke('POST',{action:'prepare',month:'2026-09',timeZone:'UTC',eventId:'invented',direction:''})).status,422);
assert.equal((await invoke('GET',undefined,'/api/admin/lunation-writing?month=2026-13&timeZone=UTC')).status,400);
assert.equal(providerFixture.calls,0);
const types=new Set();
for(const month of ['2026-08','2026-09']){
  const events=await lunationArticleEvents(month,'America/New_York');
  assert.equal(events.length,2,'Quarter Moons must never become Full Moon articles.');
  for(const event of events){
    types.add(event.eclipseType??event.phase);
    const facts=await calculateLunationArticleFacts(month,'America/New_York',event.id);
    assert.equal(facts.provenance.actualEphemeris,'swiss');
    assert.equal(facts.event.eclipseType,await verifiedLunationEclipse(event.startsAt,event.phase));
    if(event.startsAt.startsWith('2026-09-26')){
      assert.deepEqual(facts.rulers.map(r=>[r.planet,r.sign]),[['Venus','Scorpio'],['Mars','Cancer']]);
      assert(facts.contacts.some(a=>a.from==='Moon'&&a.to==='Neptune'&&a.type==='conjunction'&&a.orb<1));
    }
    const prepared=prepareLunationArticle(facts);
    assert.equal(prepared.context.sameFamilyExamples.length,6);
    assert(prepared.context.sameFamilyExamples.every((e:any)=>e.ownerAuthored&&e.ownerApproved&&e.family==='sky-lunation'));
    let calls=0;
    await assert.rejects(()=>writeLunationArticle(prepared,{approvedPlanHash:'stale',approvalReference:'test',writerClient:()=>{calls++;}}),/Review/);
    assert.equal(calls,0);
    const changed=prepareLunationArticle({...facts,positions:facts.positions.map(p=>({...p,degree:p.degree+0.01}))});
    assert.notEqual(prepared.planHash,changed.planHash,'Fact changes invalidate plan approval.');
    const created=await invoke('POST',{action:'prepare',month,timeZone:'America/New_York',eventId:event.id,direction:'Develop the human consequence without inventing private motives.'});
    assert.equal(created.status,200,JSON.stringify(created.payload));let row=created.payload.rows[0];
    const action=(action:string,extra:any={})=>invoke('POST',{action,id:row.id,expectedUpdatedAt:row.updated_at,...extra});
    assert.equal((await action('generate',{approvedPlanHash:'wrong'})).status,409);
    const priorCalls=providerFixture.calls;
    const generated=await action('generate',{approvedPlanHash:row.source_snapshot.lunationWriting.planHash});
    assert.equal(generated.status,202,JSON.stringify(generated.payload));row=generated.payload.rows[0];
    assert.equal(providerFixture.calls,priorCalls+1);
    assert.equal((await action('generate',{approvedPlanHash:row.source_snapshot.lunationWriting.planHash})).status,409);
    assert.equal((await action('save',{headline:'Race',body:'Must not replace in-flight copy'})).status,409);
    const prompt=providerFixture.requests.at(-1).input;
    const instructions=providerFixture.requests.at(-1).instructions;
    assert(instructions.includes('LUNAR EDITORIAL AUTHORITY'));
    assert(instructions.includes('REQUIRED LUNAR WORDING'));
    assert(instructions.includes('CORRECTIO'));
    assert(!instructions.includes('SPINE QUALITY GATES'));
    assert(!instructions.includes('LONG-FORM SENTENCE ARCHITECTURE'));
    assert(prompt.includes('A sequence of ordinary actions is not an insight.'));
    assert(prompt.includes('Do not add astrology to a prewritten piece of advice.'));
    assert(prompt.includes('Replace abstract conclusions with the thought they skip.'));
    assert(prompt.includes('Solar eclipses use New Moon logic; lunar eclipses use Full Moon logic.'));
    assert(prompt.includes('OWNER CORRECTIONS'));
    assert(prompt.includes('Synthetic shared guidance marker.'));
    const expectedDates:Record<string,string>={
      '2026-08-12':'August 12th, 2026','2026-08-28':'August 28th, 2026',
      '2026-09-11':'September 10th, 2026','2026-09-26':'September 26th, 2026'
    };
    const openingDate=expectedDates[event.startsAt.slice(0,10)];
    assert(openingDate,`Missing test expectation for ${event.startsAt}`);
    assert(prompt.includes(`Begin the first body sentence with "On **${openingDate}**, "`));
    assert(prompt.includes(`and name ${event.title} in that sentence.`));
    assert(!prompt.includes('The separate editor header owns exact dates and times.'));
    assert(row.source_snapshot.lunationWriting.active.writingProfile.id);
    providerFixture.pending=true;
    const waiting=await action('poll');assert.equal(waiting.status,202);assert.equal(waiting.payload.pending,true);
    const reopened=(await invoke('GET')).payload.rows.find((r:any)=>r.id===row.id);
    assert.equal(reopened.source_snapshot.lunationWriting.active.responseId,row.source_snapshot.lunationWriting.active.responseId);
    assert.equal(providerFixture.calls,priorCalls+1,'Reopening and polling reuse the same paid request.');
    providerFixture.pending=false;
    const completed=await action('poll');assert.equal(completed.status,200);row=completed.payload.rows[0];
    assert.equal(row.status,'DRAFT');assert.equal(row.lane,'reference');assert.equal(row.source_snapshot.lunationWriting.active,null);
    assert.equal(row.source_snapshot.lunationWriting.receipt.ownerApproved,false);
    const before=row.updated_at,body=row.body+'\n\nExact owner edit preserved.';
    const saved=await action('save',{headline:row.headline,body});assert.equal(saved.status,200);row=saved.payload.rows[0];assert.equal(row.body,body);
    assert.equal((await invoke('POST',{action:'save',id:row.id,expectedUpdatedAt:before,headline:'Old tab',body:'Stale'})).status,409);
    assert.equal((await action('generate',{approvedPlanHash:row.source_snapshot.lunationWriting.planHash})).status,409);
    assert.equal(rows.get(row.id).body,body);assert.equal(providerFixture.calls,priorCalls+1);
  }
}
assert.deepEqual([...types].sort(),['full-moon','lunar','new-moon','solar']);
const saved=await invoke('GET');assert.equal(saved.payload.rows.length,4);
assert(saved.payload.rows.every((r:any)=>r.status==='DRAFT'&&r.lane==='reference'));
// The reader handoff copies only the saved text, never instructions, and never overwrites reader edits.
const selected=[...rows.values()].find(row=>row.content_key.startsWith('studio-lunation/'));
const exact=await invoke('GET',undefined,`/api/admin/lunation-writing?id=${selected.id}`);
assert.equal(exact.status,200);assert.deepEqual(exact.payload.rows,[selected]);
assert.equal((await invoke('GET',undefined,'/api/admin/lunation-writing?id=invalid')).status,400);
assert.equal((await invoke('GET',undefined,'/api/admin/lunation-writing?id=00000000-0000-0000-0000-000000000000')).status,404);
const foreignId='11111111-1111-1111-1111-111111111111';
rows.set(foreignId,{...selected,id:foreignId,content_key:'cms/lunation-article/unrelated'});
assert.equal((await invoke('GET',undefined,`/api/admin/lunation-writing?id=${foreignId}`)).status,404,'An ID lookup must stay inside the lunar workspace.');
rows.delete(foreignId);
const stage=(version=selected.updated_at)=>invoke('POST',{action:'stage',id:selected.id,expectedUpdatedAt:version});
assert.equal((await stage('2000-01-01T00:00:00Z')).status,409);
const staged=await stage();assert.equal(staged.status,200,JSON.stringify(staged));
const readerDraft=[...rows.values()].find(row=>row.content_key===staged.payload.contentKey);
assert.equal(readerDraft.status,'DRAFT');assert.equal(readerDraft.body,selected.body);
assert.equal(readerDraft.source_snapshot.lunationWorkspace.updatedAt,selected.updated_at);
readerDraft.body='Synthetic newer reader-editor revision.';
assert.equal((await stage()).payload.existing,true);
assert.equal(readerDraft.body,'Synthetic newer reader-editor revision.');
// A plan is tied to the shared guidance and exact-key private feedback, even between visits.
const october=(await lunationArticleEvents('2026-10','UTC'))[0];
let fresh=(await invoke('POST',{action:'prepare',month:'2026-10',timeZone:'UTC',eventId:october.id,direction:''})).payload.rows[0];
const call=(action:string,extra:any={})=>invoke('POST',{action,id:fresh.id,expectedUpdatedAt:fresh.updated_at,...extra});
const baselineCalls=providerFixture.calls;
const guidance=rows.get('shared-guidance-fixture');
guidance.sections.writingProfile.voiceGuidance+=' Synthetic changed guidance.';
assert.equal((await call('generate',{approvedPlanHash:fresh.source_snapshot.lunationWriting.planHash})).status,409);
fresh=(await call('review',{direction:''})).payload.rows[0];
const {datedLunationContentKey}=await import('../apps/web/src/content/lunationArticleIdentity');
feedbackFixture.rows=[{id:'exact-lunar-correction',status:'active',kind:'rejection',version:1,owner_reason:'Synthetic correction: develop the missing consequence.',rejected_text:'Synthetic rejected lunar construction.',target_keys:[datedLunationContentKey(fresh.facts.lunationArticle.event)],source_uri:'fixture:owner-feedback'}];
assert.equal((await call('generate',{approvedPlanHash:fresh.source_snapshot.lunationWriting.planHash})).status,409);
fresh=(await call('review',{direction:''})).payload.rows[0];
assert.equal(fresh.source_snapshot.lunationWriting.preview.corrections[0].owner_reason,feedbackFixture.rows[0].owner_reason);
feedbackFixture.fail=true;
assert.equal((await call('generate',{approvedPlanHash:fresh.source_snapshot.lunationWriting.planHash})).status,503);
assert.equal(providerFixture.calls,baselineCalls);
feedbackFixture.fail=false;
const corrected=await call('generate',{approvedPlanHash:fresh.source_snapshot.lunationWriting.planHash});
assert.equal(corrected.status,202,JSON.stringify(corrected));
assert(providerFixture.requests.at(-1).input.includes(feedbackFixture.rows[0].owner_reason));
fresh=corrected.payload.rows[0];
providerFixture.draft={headline:'Synthetic lunar article',body:'Synthetic whether output.'};
const callsBeforePoll=providerFixture.calls;
const vocabularyPoll=await call('poll');
assert.equal(vocabularyPoll.status,200);
fresh=vocabularyPoll.payload.rows[0];
assert.equal(fresh.body,providerFixture.draft.body);
assert.equal(fresh.source_snapshot.lunationWriting.lint.passed,false);
assert(fresh.source_snapshot.lunationWriting.lint.violations.some((f:any)=>f.category==='lunation_required_vocabulary'));
assert.equal(providerFixture.calls,callsBeforePoll,'A prohibited word does not trigger a paid rewrite.');
assert.equal(fresh.source_snapshot.lunationWriting.receipt.ownerApproved,false);
const vocabularySave=await call('save',{headline:fresh.headline,body:'Synthetic corrected output.'});
assert.equal(vocabularySave.status,200);
fresh=vocabularySave.payload.rows[0];
assert(!fresh.source_snapshot.lunationWriting.lint.violations.some((f:any)=>f.category==='lunation_required_vocabulary'));
providerFixture.draft=null;
// Factual findings must survive the handoff and be rechecked after reader-editor changes.
let invalid=[...rows.values()].find(row=>row.facts?.lunationArticle?.event.startsAt.startsWith('2026-09-26'));
const wrongCopy={headline:'Aries Full Moon',body:'With the Sun in Aries, you may want more room for a personal ambition. You can ask how a change in your availability would affect a shared plan.'};
invalid=(await invoke('POST',{action:'save',id:invalid.id,expectedUpdatedAt:invalid.updated_at,...wrongCopy})).payload.rows[0];
assert(invalid.source_snapshot.lunationWriting.lint.violations.some((finding:any)=>finding.category==='lunation_fact_boundary'));
const invalidStage=await invoke('POST',{action:'stage',id:invalid.id,expectedUpdatedAt:invalid.updated_at});
assert.equal(invalidStage.status,200);
const invalidReader=[...rows.values()].find(row=>row.content_key===invalidStage.payload.contentKey);
assert(invalidReader.source_snapshot.lunationWorkspace.lint.violations.some((finding:any)=>finding.category==='lunation_fact_boundary'));
const {createApiStore}=await import('../tests/helpers/calendar-review-api.mjs');
const datedRows=[...rows.values()].filter(row=>row.content_key.startsWith('studio-lunation/'));
const generalStore=await createApiStore([...datedRows,invalidReader]);
try{
  const refused=await generalStore.invoke('PATCH',{id:invalidReader.id,status:'LIVE'});
  assert.equal(refused.status,422,JSON.stringify(refused));
  assert.match(refused.payload.error,/Sun in Aries/);
  assert.equal(generalStore.rows.get(invalidReader.id).status,'DRAFT');
  // Removing the recorded finding or forging facts cannot bypass event-time validation.
  const forged=await generalStore.invoke('PATCH',{id:invalidReader.id,status:'LIVE',sourceSnapshot:{contentSystem:'cms-surface-override',allowedSlots:[]},facts:{lunationArticle:{positions:[{planet:'Sun',sign:'Aries'}]}}});
  assert.equal(forged.status,422,JSON.stringify(forged));
  const correctedBody=wrongCopy.body.replace('Sun in Aries','Sun in Libra');
  for(const field of ['headline','summary','body']){
    const prohibited=await generalStore.invoke('PATCH',{id:invalidReader.id,headline:'Synthetic title',summary:'',body:correctedBody,[field]:'Synthetic WHETHER fixture.',status:'LIVE'});
    assert.equal(prohibited.status,422,JSON.stringify(prohibited));
    assert.match(prohibited.payload.error,/Remove “whether”/);
  }
  const fixed=await generalStore.invoke('PATCH',{id:invalidReader.id,body:correctedBody,status:'LIVE'});
  assert.equal(fixed.status,200,JSON.stringify(fixed));
  assert.equal(fixed.payload.rows[0].body,correctedBody);
  assert.equal(fixed.payload.rows[0].source_snapshot.lunationPublicationCheck.lint.passed,true);
  const changedAgain=await generalStore.invoke('PATCH',{id:invalidReader.id,body:wrongCopy.body,status:'LIVE'});
  assert.equal(changedAgain.status,422,JSON.stringify(changedAgain));
  assert.equal(generalStore.rows.get(invalidReader.id).body,correctedBody);
  for(const bulk of [false,true]){
    const direct={contentKey:invalidReader.content_key,surface:'sky',mode:'article',eventType:'lunation-article',status:'LIVE',lane:'serving',...wrongCopy,sections:{},sourceSnapshot:{contentSystem:'cms-surface-override',allowedSlots:[]},blockType:'sky_article'};
    const result=await generalStore.invoke('POST',bulk?{rows:[direct]}:direct);
    assert.equal(result.status,422,JSON.stringify(result));
  }
  const example=datedRows[0];
  for(const [method,input] of [
    ['POST',{contentKey:'studio-lunation/forged',mode:'article',status:'LIVE',headline:'Forged',body:'Synthetic'}],
    ['PATCH',{id:example.id,status:'LIVE'}],
    ['DELETE',{id:example.id}]
  ] as const){
    const blocked=await generalStore.invoke(method,input,method==='DELETE'?`/api/admin/generated-content?${new URLSearchParams({id:example.id,expectedUpdatedAt:example.updated_at})}`:undefined);
    assert.equal(blocked.status,400,JSON.stringify(blocked));
    assert.match(blocked.payload.error,/Calendar Write-ups.*New & Full Moons & Eclipses/);
  }
  assert.equal(generalStore.rows.get(example.id).body,example.body);
  const target=await generalStore.invoke('POST',{contentKey:staged.payload.contentKey,surface:'sky',mode:'article',eventType:'lunation-article',status:'DRAFT',lane:'serving',headline:selected.headline,body:selected.body,sections:{},sourceSnapshot:{contentSystem:'cms-surface-override',allowedSlots:[]},blockType:'sky_article'});
  assert.equal(target.status,200,JSON.stringify(target));
  const draft=target.payload.rows[0];
  const published=await generalStore.invoke('PATCH',{id:draft.id,expectedUpdatedAt:draft.updated_at,status:'LIVE'});
  assert.equal(published.status,200,JSON.stringify(published));
  assert.equal(published.payload.rows[0].body,selected.body);
  assert.equal(published.payload.rows[0].status,'LIVE');

}finally{generalStore.close();}
console.log('Lunation Studio: four calculated event types, exact provider prompt, single durable request, draft persistence, stale writes and access checks passed. No model charges.');
