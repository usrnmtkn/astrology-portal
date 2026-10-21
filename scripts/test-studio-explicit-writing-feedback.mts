import assert from 'node:assert/strict';
import {store,editorialFixtureRows,explicitWritingFeedbackFixture as fixture,installHoroscopeWriterFixture,invokeHoroscopeWritingWithReview as invoke,writerFixture} from '../tests/helpers/sky-article-save-api.mts';
import {prepareHoroscopeBrief} from '../api/_lib/horoscope-editions';
import {emptyHoroscopeEdition,horoscopeEditionBody,horoscopeEditionKey} from '../apps/web/src/content/horoscopeEditions.mjs';
import {defaultHoroscopeProfile} from '../src/astro-writing/horoscopeWritingProfiles.mjs';

installHoroscopeWriterFixture();process.env.STUDIO_MEMORY_FEEDBACK_ENABLED='true';
const feedback=(id:string,target:string)=>({id,version:1,status:'active',kind:'rejection',target_keys:[target],
 rejected_text:`PRIVATE synthetic rejected wording ${id}.`,owner_reason:`PRIVATE synthetic correction ${id}.`,
 source_roles:null,source_uri:'thread:aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',source_date:'2026-10-21T05:00:00Z'});
for(const period of ['daily','weekly','monthly','seasonal'] as const){
 fixture.rows=[feedback('fixture-all','writing/all'),feedback(`fixture-${period}`,`horoscope/${period}`),
  feedback('fixture-unrelated',period==='monthly'?'horoscope/weekly':'horoscope/monthly')];
 const packet=await prepareHoroscopeBrief(new URL(`http://localhost/?period=${period}&date=2026-10-01&timeZone=America/New_York`));
 const edition=emptyHoroscopeEdition(packet.brief.window),profile=defaultHoroscopeProfile(period);
 if(period==='weekly')profile.prompt='WEEKLY PROMPT V2\n'+profile.prompt;
 const savedProfile=await store.invoke('POST',{profile,expectedUpdatedAt:null},'/api/admin/generated-content?writingProfiles=true');
 assert.equal(savedProfile.status,200,JSON.stringify(savedProfile.payload));
 const created=await store.invoke('POST',{contentKey:horoscopeEditionKey(edition.window),surface:'sky',mode:'article',eventType:'horoscope-edition',provider:'manual-admin',status:'DRAFT',lane:'serving',headline:'Synthetic feedback edition',body:horoscopeEditionBody(edition),sections:{horoscopeEdition:edition},facts:{horoscopeBrief:packet},
  sourceSnapshot:{studioWritingProfile:savedProfile.payload.profile,horoscopeOutlines:{},horoscopeGeneration:{readings:{},rejections:[]}}});
 assert.equal(created.status,200,JSON.stringify(created.payload));let row=created.payload.rows[0];
 const action=(action:string,extra:any={})=>invoke({action,id:row.id,expectedUpdatedAt:row.updated_at,...extra});
 let prepared=await action('prepare');assert.equal(prepared.status,200,JSON.stringify(prepared.payload));row=prepared.payload.rows[0];
 assert.deepEqual(prepared.payload.plan.feedback.selected.map((r:any)=>r.id),['fixture-all',`fixture-${period}`]);
 const firstHash=prepared.payload.plan.planHash,calls=writerFixture.calls;
 fixture.rows[1]={...fixture.rows[1],version:2,owner_reason:`PRIVATE updated direction for ${period}.`};
 assert.equal((await action('generate',{sign:edition.passages[0].sign,approvedPlanHash:firstHash})).status,409);
 assert.equal(writerFixture.calls,calls,'A changed correction cannot dispatch under stale approval');
 prepared=await action('prepare');assert.equal(prepared.status,200,JSON.stringify(prepared.payload));row=prepared.payload.rows[0];
 fixture.unavailable=true;
 assert.equal((await action('generate',{sign:edition.passages[0].sign,approvedPlanHash:prepared.payload.plan.planHash})).status,503);
 assert.equal(writerFixture.calls,calls);fixture.unavailable=false;
 fixture.incomplete=true;assert.equal((await action('prepare')).status,503);fixture.incomplete=false;
 const started=await action('generate',{sign:edition.passages[0].sign,approvedPlanHash:prepared.payload.plan.planHash});
 assert.equal(started.status,202,JSON.stringify(started.payload));row=started.payload.rows[0];
 const reserved=structuredClone(row.source_snapshot.horoscopeGeneration.active);
 assert(!JSON.stringify(store.rows.get(row.id)).includes('PRIVATE synthetic rejected wording'),'Raw feedback stays out of saved edition rows');
 assert(!JSON.stringify(store.rows.get(row.id)).includes('PRIVATE updated direction'),'Raw reasons stay out of saved edition rows');
 if(period==='seasonal'){
  while(row.source_snapshot.horoscopeGeneration.active){const active=row.source_snapshot.horoscopeGeneration.active;
   const next=await action(active.state==='ready'?'continue':'poll');assert([200,202].includes(next.status),JSON.stringify(next.payload));row=next.payload.rows[0];}
  const run=editorialFixtureRows.get(reserved.id).state;
  assert.equal(run.status,'accepted');
  const prose=[...writerFixture.requests.values()].filter(request=>request.input?.includes('CURRENT OWNER WRITING CORRECTIONS')).at(-1);
  assert(prose.input.includes('PRIVATE updated direction for seasonal.'));
  assert(!prose.input.includes('PRIVATE synthetic correction fixture-unrelated.'));
  assert(!JSON.stringify(store.rows.get(row.id)).includes('PRIVATE updated direction'),'Seasonal feedback bodies stay in private runs');
  continue;
 }
 if(period==='monthly'){
  assert(reserved.draftRequest.input.includes('[PRIVATE_OWNER_WRITING_FEEDBACK:'));
  const synthesis=await action('poll');assert.equal(synthesis.status,202);row=synthesis.payload.rows[0];
  fixture.rows=fixture.rows.map(r=>({...r,status:'retired',version:r.version+1}));
  const continued=await action('continue');assert.equal(continued.status,202,JSON.stringify(continued.payload));row=continued.payload.rows[0];
 }
 const sent=writerFixture.requests.get(row.source_snapshot.horoscopeGeneration.active.responseId).input;
 assert(sent.includes('PRIVATE synthetic rejected wording fixture-all.'));
 assert(sent.includes(`PRIVATE updated direction for ${period}.`));
 assert(!sent.includes('PRIVATE synthetic correction fixture-unrelated.'));
 assert(!sent.includes('[PRIVATE_OWNER_WRITING_FEEDBACK:'));
 const callsAfter=writerFixture.calls;
 fixture.rows=[];const completed=await action('poll');assert.equal(completed.status,200,JSON.stringify(completed.payload));row=completed.payload.rows[0];
 assert.equal(writerFixture.calls,callsAfter,'Polling only retrieves the reserved output');
 assert.equal(row.source_snapshot.horoscopeGeneration.readings[edition.passages[0].sign].feedback.selected.length,2);
 assert(!JSON.stringify(row).includes('PRIVATE updated direction'));
}
console.log('PASS actual horoscope handlers: all four periods receive scoped private feedback; stale-plan and storage failures before dispatch; actual provider delivery; immutable monthly continuation after retirement; no feedback bodies in edition rows.');
