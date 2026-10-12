import assert from 'node:assert/strict';
import {store,invokeHoroscopeWriting} from '../tests/helpers/sky-article-save-api.mts';
import {readerRouteResponse} from '../tests/helpers/content-reader-route.mjs';
import {createSeasonalPublicationFixture,seasonalClaimBodies,createMonthlyAspectPublicationFixture,monthlyAspectBody,monthlyManualBody,createWeeklyAspectPublicationFixture,weeklyAspectBodies,weeklyAspectParserCases,createWeeklyContextPublicationFixture,weeklyContextBodies} from '../tests/helpers/horoscope-publication-fixture.mts';
import {horoscopeAspectFindings,horoscopeAspectPattern,horoscopeAspectClaim,supportsHoroscopeAspect} from '../src/astro-writing/horoscopeAspectClaims.mjs';
import {horoscopeEventsInWindow,horoscopeHouse} from '../src/astro-writing/horoscopeDevelopments.mjs';
import {validateHoroscopeReading} from '../src/astro-writing/horoscopeValidation.mjs';
import {horoscopeEditionBody} from '../apps/web/src/content/horoscopeEditions.mjs';

const created=await createSeasonalPublicationFixture(m=>store.invoke(m.method,m.body,m.url));
assert.equal(created.status,200,JSON.stringify(created.payload));
let row=created.payload.rows[0];
const original=structuredClone(row),brief=row.facts.horoscopeBrief.brief;
const live=await store.invoke('PATCH',{id:row.id,expectedUpdatedAt:row.updated_at,status:'LIVE'});
assert.equal(live.status,200,JSON.stringify(live.payload));
row=live.payload.rows[0];assert.deepEqual(row.sections,original.sections);assert.deepEqual(row.source_snapshot,original.source_snapshot);
const read=await readerRouteResponse('/api/content-reader',{method:'POST',body:JSON.stringify({ids:[row.id]})});
assert.equal(read.status,200);const payload=await read.json();assert.equal(payload.rows.length,1);assert.equal(payload.rows[0].body,original.body);
const issues=(sign:string,body:string,b:any=brief)=>validateHoroscopeReading({sign,headline:'Fixture',body},b).violations.filter((v:any)=>v.category==='horoscope_fact_boundary');
for(const [sign,body] of Object.entries(seasonalClaimBodies))assert.deepEqual(issues(sign,body),[],sign);
for(const [sign,body] of [
 ['cancer',seasonalClaimBodies.cancer.replace('seventh','tenth')],
 ['cancer',seasonalClaimBodies.cancer.replace('Capricorn','Aries')],
 ['cancer',seasonalClaimBodies.cancer.replace('First Quarter','Last Quarter')],
 ['capricorn',seasonalClaimBodies.capricorn.replace('October 18','October 10')],
 ['leo',seasonalClaimBodies.leo.replace('September 30','October 3')],
 ['aquarius',seasonalClaimBodies.aquarius.replace('October 3','September 30')],
 ['virgo',seasonalClaimBodies.virgo.replace('your second house counts','your fifth house counts')],
 ['virgo','You can consider your second house.'],
 ['virgo',seasonalClaimBodies.virgo.replace('Libra compares;','\n\nLibra compares;')]
])assert(issues(sign,body).length,body);
assert.deepEqual(issues('cancer','You can notice the Last Quarter Moon in Cancer on October 3 in your first house.'),[]);
assert.deepEqual(issues('leo','You can plan as Mercury enters Scorpio on September 30 and on October 3 Venus stations retrograde in Scorpio.'),[]);
assert(issues('cancer',seasonalClaimBodies.cancer,{...brief,events:brief.events.filter((e:any)=>!e.id.includes('first-quarter'))}).length);
// Invalid copy remains blocked through the actual publication handler, preserving its draft.
const draft=structuredClone(original);draft.sections.horoscopeEdition.passages.find((p:any)=>p.sign==='cancer').body=seasonalClaimBodies.cancer.replace('seventh','tenth');draft.body=horoscopeEditionBody(draft.sections.horoscopeEdition);store.rows.set(draft.id,draft);
const rejected=await store.invoke('PATCH',{id:draft.id,expectedUpdatedAt:draft.updated_at,status:'LIVE'});
assert.equal(rejected.status,422);assert.equal(store.rows.get(draft.id).status,'DRAFT');assert.equal(store.rows.get(draft.id).body,draft.body);
assert.equal((await store.invoke('PATCH',{id:draft.id,expectedUpdatedAt:'2000-01-01T00:00:00Z',status:'LIVE'})).status,409);
console.log('PASS seasonal claim publication: all quarter phases, clause dates, repeated houses, exact draft/receipt preservation, reader eligibility, wrong claims and stale writes blocked.');

const monthly=await createMonthlyAspectPublicationFixture(m=>store.invoke(m.method,m.body,m.url));
assert.equal(monthly.status,200,JSON.stringify(monthly.payload));
const monthlyRow=monthly.payload.rows[0],monthlyBrief=monthlyRow.facts.horoscopeBrief.brief;
assert.deepEqual(issues('overview',monthlyAspectBody,monthlyBrief),[]);
const mLive=await store.invoke('PATCH',{id:monthlyRow.id,expectedUpdatedAt:monthlyRow.updated_at,status:'LIVE'});
assert.equal(mLive.status,200,JSON.stringify(mLive.payload));
assert.deepEqual(mLive.payload.rows[0].sections,monthlyRow.sections);
assert.deepEqual(mLive.payload.rows[0].source_snapshot,monthlyRow.source_snapshot,'Historical receipt stays intact');
const mRead=await readerRouteResponse('/api/content-reader',{method:'POST',body:JSON.stringify({ids:[monthlyRow.id]})});
assert.equal(mRead.status,200);assert.equal((await mRead.json()).rows[0].body,monthlyRow.body);
for(const bad of [
 monthlyAspectBody.replace('now retrograde','now direct'),
 monthlyAspectBody.replace('October 30','October 2'),
 monthlyAspectBody.replace('squares Mars again','trines Mars again'),
 monthlyAspectBody.replace('This square','This opposition'),
 monthlyAspectBody.replace('This square','\n\nThis square'),
 monthlyAspectBody.replace('This square','Mercury enters Scorpio. This square'),
 monthlyAspectBody.replace('This square can','This square with Jupiter can'),
 monthlyAspectBody.replace('This square can','This exact square can'),
 monthlyAspectBody.replace('This square can','This square on October 10 can'),
 monthlyAspectBody.replace('Venus squares Pluto','Venus trines Pluto'),
 'You can review this square before Venus squares Pluto on October 20.'
]){
 assert(issues('overview',bad,monthlyBrief).length,`Invalid monthly claim accepted: ${bad}`);
 const invalid=structuredClone(monthlyRow);invalid.sections.horoscopeEdition.passages[0].body=bad;invalid.body=horoscopeEditionBody(invalid.sections.horoscopeEdition);store.rows.set(invalid.id,invalid);
 const denied=await store.invoke('PATCH',{id:invalid.id,expectedUpdatedAt:invalid.updated_at,status:'LIVE'});
 assert.equal(denied.status,422);assert.equal(store.rows.get(invalid.id).status,'DRAFT');assert.equal(store.rows.get(invalid.id).body,invalid.body);
}
assert(horoscopeAspectFindings('Venus squares Pluto. This square can help you consider it.',{...monthlyBrief,events:[],relationalContext:undefined}).length);
console.log('PASS monthly aspect publication: motion-qualified pairs and same-paragraph references, exact saved copy and receipts retained, false claims/dates/motions and unanchored references blocked.');

const weekly=await createWeeklyAspectPublicationFixture(m=>store.invoke(m.method,m.body,m.url));
assert.equal(weekly.status,200,JSON.stringify(weekly.payload));
const weeklyRow=weekly.payload.rows[0],weeklyBrief=weeklyRow.facts.horoscopeBrief.brief;
const wLive=await store.invoke('PATCH',{id:weeklyRow.id,expectedUpdatedAt:weeklyRow.updated_at,status:'LIVE'});
assert.equal(wLive.status,200,JSON.stringify(wLive.payload));
assert.equal(wLive.payload.rows[0].sections.horoscopeEdition.passages.length,12);
assert.deepEqual(wLive.payload.rows[0].sections,weeklyRow.sections);
assert.deepEqual(wLive.payload.rows[0].source_snapshot,weeklyRow.source_snapshot,'Historical receipt stays intact');
const wRead=await readerRouteResponse('/api/content-reader',{method:'POST',body:JSON.stringify({ids:[weeklyRow.id]})});
assert.equal(wRead.status,200);assert.equal((await wRead.json()).rows[0].body,weeklyRow.body);
for(const [sign,body] of Object.entries(weeklyAspectBodies))assert.deepEqual(issues(sign,body,weeklyBrief),[],sign);
for(const body of [
 'The conjunction between Mercury and retrograde Venus can inform your fixture.',
 'The Mercury–retrograde Venus conjunction can inform your fixture.',
 'Venus in your eleventh house of friends and groups, now retrograde, squares direct Mars in your eighth house of shared resources.'
])assert.deepEqual(issues('capricorn',body,weeklyBrief),[],body);
for(const [sign,bad] of [
 ['cancer',weeklyAspectBodies.cancer.replace('retrograde Venus','direct Venus')],
 ['cancer',weeklyAspectBodies.cancer.replace('Mercury forms','Retrograde Mercury forms')],
 ['cancer',weeklyAspectBodies.cancer.replace('retrograde Venus','retrograde Jupiter')],
 ['cancer',weeklyAspectBodies.cancer.replace('conjunction','opposition')],
 ['cancer',weeklyAspectBodies.cancer.replace('with retrograde Venus in Scorpio','with a colleague')],
 ['sagittarius',weeklyAspectBodies.sagittarius.replace('12th house','11th house')],
 ['sagittarius',weeklyAspectBodies.sagittarius.replace('squares Mars','trines Mars')],
 ['sagittarius',weeklyAspectBodies.sagittarius.replace('hidden things','hidden things and Mercury trines Jupiter')],
 ['capricorn',weeklyAspectBodies.capricorn.replace('Retrograde Venus','Direct Venus')],
 ['capricorn',weeklyAspectBodies.capricorn.replace('squares Mars','squares retrograde Mars')],
 ['capricorn',weeklyAspectBodies.capricorn.replace('Retrograde Venus','Retrograde Venus, now direct,')],
 ['capricorn',weeklyAspectBodies.capricorn.replace('Your weekly fixture ends here.','Mercury trines Jupiter. Your weekly fixture ends here.')]
]){
 assert(issues(sign,bad,weeklyBrief).length,`Invalid weekly claim accepted: ${bad}`);
 const invalid=structuredClone(weeklyRow);invalid.sections.horoscopeEdition.passages.find((p:any)=>p.sign===sign).body=bad;invalid.body=horoscopeEditionBody(invalid.sections.horoscopeEdition);store.rows.set(invalid.id,invalid);
 const denied=await store.invoke('PATCH',{id:invalid.id,expectedUpdatedAt:invalid.updated_at,status:'LIVE'});
 assert.equal(denied.status,422);assert.equal(store.rows.get(invalid.id).status,'DRAFT');assert.equal(store.rows.get(invalid.id).body,invalid.body);
}
console.log('PASS weekly aspect publication: all 12 readings publish unchanged, prefix motions and house context checked, invalid planets/aspects/motions/houses still blocked.');

const rulers=await createWeeklyAspectPublicationFixture(m=>store.invoke(m.method,m.body,m.url),true);
assert.equal(rulers.status,200,JSON.stringify(rulers.payload));
const rulerRow=rulers.payload.rows[0],rulerBrief=rulerRow.facts.horoscopeBrief.brief;
for(const example of weeklyAspectParserCases){
 const matches=[...example.body.matchAll(new RegExp(horoscopeAspectPattern,'giu'))];
 assert.equal(matches.length,example.aspect?1:0,example.body);
 if(example.aspect){
  const claim=horoscopeAspectClaim(matches[0][0]);
  assert.deepEqual(claim?.planets,example.planets,example.body);assert.equal(claim?.aspect,example.aspect,example.body);
  assert(horoscopeEventsInWindow(rulerBrief).some((event:any)=>supportsHoroscopeAspect(event,claim)),`No calculated event matched: ${example.body}`);
 }else assert.equal(horoscopeAspectClaim(example.body),null,example.body);
 assert.deepEqual(issues(example.sign,example.body,rulerBrief),[],example.body);
}
for(const [sign,planet] of [['aries','Saturn'],['leo','Jupiter']]){
 assert.equal(horoscopeHouse(rulerBrief.positions.find((p:any)=>p.planet===planet).sign,sign),1,'In your sign is the reader’s first house');
}
// Every requested verb form must resolve to a calculated pair, not disappear
// from the fact check. The seasonal brief supplies all five aspect types.
for(const [aspect,verbs] of Object.entries({conjunction:['meet','meets'],sextile:['sextile','sextiles'],square:['square','squares'],trine:['trine','trines'],opposition:['oppose','opposes']})){
 const event=horoscopeEventsInWindow(brief).find((e:any)=>e.type==='aspect'&&e.aspect===aspect);
 assert(event,`Missing calculated ${aspect} fixture`);
 for(const verb of verbs){
  const text=`${event.planets[0]}, your ruler, ${verb} ${event.planets[1]}.`;
  const match=text.match(new RegExp(horoscopeAspectPattern,'iu'));
  assert(match,`Unrecognized verb: ${verb}`);assert.equal(horoscopeAspectClaim(match[0])?.aspect,aspect);
  assert.deepEqual(horoscopeAspectFindings(text,brief),[],text);
 }
}
for(const text of ['You can meet your friends.','Your plan meets your needs.','The Sun in your first house can help you meet a deadline.'])assert.deepEqual(horoscopeAspectFindings(text,{...brief,events:[],relationalContext:undefined}),[],text);
assert(horoscopeAspectFindings('Mercury, your ruler, meets a colleague.',weeklyBrief).length,'An incomplete planetary pair must remain visible');
assert(horoscopeAspectFindings('Mercury meets Venus.',{...brief,events:[],relationalContext:undefined}).length,'Missing calculated aspects cannot authorize meets');
assert.deepEqual(issues('overview','You can review Mercury, your ruler, meets retrograde Venus on October 6.',monthlyBrief),[]);
assert(issues('overview','You can review Mercury, your ruler, meets retrograde Venus on October 20.',monthlyBrief).length,'Meets must retain event/date validation');
for(const passage of rulerRow.sections.horoscopeEdition.passages)assert.deepEqual(issues(passage.sign,passage.body,rulerBrief),[],passage.sign);
const rLive=await store.invoke('PATCH',{id:rulerRow.id,expectedUpdatedAt:rulerRow.updated_at,status:'LIVE'});
assert.equal(rLive.status,200,JSON.stringify(rLive.payload));
assert.deepEqual(rLive.payload.rows[0].sections,rulerRow.sections);
assert.deepEqual(rLive.payload.rows[0].source_snapshot,rulerRow.source_snapshot);
for(const [sign,bad] of [
 ['aries','You can review Mars, your ruling planet, squares Saturn in your sign.'],
 ['aries','You can review Mars in your sign trines Saturn.'],
 ['aries','You can review Mars, your ruling planet and Jupiter, trines Saturn.'],
 ['aries','You can review retrograde Mars, your ruling planet, trines Saturn.'],
 ['scorpio','You can review Mars, your traditional ruler, trines Saturn from your sixth house of daily work to your tenth house of career.'],
 ['scorpio','You can review Mars, your traditional ruler, trines Saturn from your tenth house of career to your fifth house of creativity.']
])assert(issues(sign,bad,rulerBrief).length,`False qualified claim accepted: ${bad}`);
console.log('PASS ruler-aside publication: all 12 readings preserved; personal-sign placements and both from/to houses checked independently.');

const meeting=structuredClone(weeklyRow),meetingPassage=meeting.sections.horoscopeEdition.passages.find((p:any)=>p.sign==='cancer');
for(const [body,ready] of [
 ['You can review Mercury, your ruler, meets retrograde Venus in Scorpio.',true],
 ['You can review Mercury, your ruler, meets Mars.',false],
 ['You can review Mercury, your ruler, meets direct Venus.',false]
] as const){
 meetingPassage.body=body;meeting.body=horoscopeEditionBody(meeting.sections.horoscopeEdition);store.rows.set(meeting.id,structuredClone(meeting));
 const preflight=await invokeHoroscopeWriting({action:'validate-publication',id:meeting.id,expectedUpdatedAt:meeting.updated_at});
 assert.equal(preflight.status,200);assert.equal(preflight.payload.publication.ready,ready,body);
 const published=await store.invoke('PATCH',{id:meeting.id,expectedUpdatedAt:meeting.updated_at,status:'LIVE'});
 assert.equal(published.status,ready?200:422,body);assert.equal(store.rows.get(meeting.id).body,meeting.body);
 assert.equal(store.rows.get(meeting.id).status,ready?'LIVE':'DRAFT');
}
console.log('PASS exact eight parser examples, all base/inflected verbs, calculated event matching, and meets conjunction publication/refusal.');

// Imported/manual drafts receive the same current-copy checks as AI drafts.
const manual=structuredClone(rulerRow);delete manual.source_snapshot.horoscopeGeneration;
manual.sections.horoscopeEdition.passages.find((p:any)=>p.sign==='aries').body='You can review Mars squares Saturn.';
manual.sections.horoscopeEdition.passages.find((p:any)=>p.sign==='leo').body='You can review Saturn in your first house.';
manual.body=horoscopeEditionBody(manual.sections.horoscopeEdition);store.rows.set(manual.id,manual);
const checkInput={action:'validate-publication',id:manual.id,expectedUpdatedAt:manual.updated_at};
assert.equal((await invokeHoroscopeWriting(checkInput,'wrong')).status,401);
assert.equal((await invokeHoroscopeWriting({...checkInput,expectedUpdatedAt:'2000-01-01T00:00:00Z'})).status,409);
const beforeCheck=structuredClone(store.rows.get(manual.id));
const checked=await invokeHoroscopeWriting(checkInput);
assert.equal(checked.status,200,JSON.stringify(checked.payload));
assert.equal(checked.payload.publication.ready,false);
assert.deepEqual([...new Set(checked.payload.publication.issues.map((issue:any)=>issue.sign))],['aries','leo']);
assert.deepEqual(store.rows.get(manual.id),beforeCheck,'Preflight never edits, publishes, refreshes a plan or dispatches AI');
const invalidImport=await store.invoke('PATCH',{id:manual.id,expectedUpdatedAt:manual.updated_at,status:'LIVE'});
assert.equal(invalidImport.status,422,'Missing AI metadata cannot bypass the factual check');
assert.deepEqual(store.rows.get(manual.id),beforeCheck);
store.rows.set(rulerRow.id,rulerRow);
const clear=await invokeHoroscopeWriting(checkInput);
assert.equal(clear.status,200);assert.equal(clear.payload.publication.ready,true);assert.deepEqual(clear.payload.publication.issues,[]);
console.log('PASS publication preflight: all affected signs, owner authentication, current version, no mutation, and manual/imported fact enforcement.');

const context=await createWeeklyContextPublicationFixture(m=>store.invoke(m.method,m.body,m.url));
assert.equal(context.status,200,JSON.stringify(context.payload));
const contextRow=context.payload.rows[0],contextBrief=contextRow.facts.horoscopeBrief.brief;
const contextCheck=await invokeHoroscopeWriting({action:'validate-publication',id:contextRow.id,expectedUpdatedAt:contextRow.updated_at});
assert.equal(contextCheck.status,200);assert.equal(contextCheck.payload.publication.ready,true,JSON.stringify(contextCheck.payload.publication.issues));
for(const p of contextRow.sections.horoscopeEdition.passages)assert.deepEqual(issues(p.sign,p.body,contextBrief),[],p.sign);
const contextLive=await store.invoke('PATCH',{id:contextRow.id,expectedUpdatedAt:contextRow.updated_at,status:'LIVE'});
assert.equal(contextLive.status,200,JSON.stringify(contextLive.payload));
assert.deepEqual(contextLive.payload.rows[0].sections,contextRow.sections);
assert.deepEqual(contextLive.payload.rows[0].source_snapshot,contextRow.source_snapshot);
const contextRead=await readerRouteResponse('/api/content-reader',{method:'POST',body:JSON.stringify({ids:[contextRow.id]})});
assert.equal(contextRead.status,200);assert.equal((await contextRead.json()).rows[0].body,contextRow.body);
console.log('PASS context publication: all twelve motion asides, shared subjects and ingress destinations publish unchanged.');

// Each new form must retain factual checks; it cannot merely hide warnings.
for(const [sign,bad] of [
 ['aries',weeklyContextBodies.aries.replace('squares Pluto','trines Pluto')],
 ['aries',weeklyContextBodies.aries.replace('backs into your 7th house','backs into your 8th house')],
 ['aries','Venus, retrograde in your sign, squares Pluto. You can review the fixture.'],
 ['aries',weeklyContextBodies.aries.replace('retrograde in your 8th','direct in your 8th')],
 ['aries',weeklyContextBodies.aries.replace('which is still retrograde','which is still direct')],
 ['aries',weeklyContextBodies.aries.replace('it meets Venus','it meets Mars')],
 ['taurus',weeklyContextBodies.taurus.replace('your 6th house','your 7th house')],
 ['taurus',weeklyContextBodies.taurus.replace('into Libra','into Cancer')],
 ['libra',weeklyContextBodies.libra.replace('your 1st house','your 2nd house')],
 ['scorpio',weeklyContextBodies.scorpio.replace('your 12th house','your 1st house')],
 ['scorpio',weeklyContextBodies.scorpio.replace('backs into Libra','backs into Scorpio')],
 ['sagittarius',weeklyContextBodies.sagittarius.replace('it squares Pluto','it squares Mars')],
 ['aries','The Sun enters Scorpio while Mercury stations retrograde, and it meets Venus. You can review the fixture.'],
 ['aries','The Sun enters Scorpio. It meets Venus. You can review the fixture.'],
 ['aries','The Sun enters Scorpio and Mercury enters Scorpio and meets Venus. You can review the fixture.'],
 ['aries','Venus, your ruling planet and Jupiter, squares Pluto. You can review the fixture.'],
 ['taurus','Venus moves back into Scorpio in your 7th house. You can review the fixture.'],
 ['taurus','Venus moves back into Scorpio. You can review the fixture.']
]){
 assert(issues(sign,bad,contextBrief).length,`False context claim accepted: ${bad}`);
 const invalid=structuredClone(contextRow);invalid.sections.horoscopeEdition.passages.find((p:any)=>p.sign===sign).body=bad;invalid.body=horoscopeEditionBody(invalid.sections.horoscopeEdition);store.rows.set(invalid.id,invalid);
 const preflight=await invokeHoroscopeWriting({action:'validate-publication',id:invalid.id,expectedUpdatedAt:invalid.updated_at});
 assert.equal(preflight.status,200);assert.equal(preflight.payload.publication.ready,false,bad);
 const denied=await store.invoke('PATCH',{id:invalid.id,expectedUpdatedAt:invalid.updated_at,status:'LIVE'});
 assert.equal(denied.status,422);assert.deepEqual(store.rows.get(invalid.id),invalid,'A refusal must preserve every saved byte');
}
assert.deepEqual(issues('taurus','You can review Venus in your 7th house as it moves back into Libra in your 6th house.',contextBrief),[]);
assert(issues('taurus','You can review Venus in your 6th house as it moves back into Libra in your 7th house.',contextBrief).length);
console.log('PASS context refusals: incorrect aspects, suffix motions, destinations and houses; ambiguous/missing subjects; exact unchanged draft on refusal.');

// A house-only destination is still an ingress claim, not a reference placement.
for(const [sign,n] of Object.entries({aries:7,taurus:6,gemini:5,cancer:4,leo:3,virgo:2,libra:1,scorpio:12,sagittarius:11,capricorn:10,aquarius:9,pisces:8})){
 const ordinal=n===1?'1st':n===2?'2nd':n===3?'3rd':`${n}th`;
 assert.deepEqual(issues(sign,`Venus backs into your ${ordinal} house. You can review the fixture.`,contextBrief),[],sign);
}
for(const phrasing of ['enters your 7th house','moves back into your seventh house','moves retrograde into your 7th whole-sign house','backs into your 7th house','returns to your seventh house']){
 assert.deepEqual(issues('aries',`Venus ${phrasing}. You can review the fixture.`,contextBrief),[],phrasing);
 assert(issues('aries',`Venus ${phrasing.replace(/7th|seventh/u,'8th')}. You can review the fixture.`,contextBrief).length,phrasing);
 assert(issues('aries',`Mars ${phrasing}. You can review the fixture.`,contextBrief).length,phrasing);
 assert(issues('aries',`Venus ${phrasing}. You can review the fixture.`,{...contextBrief,events:contextBrief.events.filter((e:any)=>e.type!=='ingress')}).length,phrasing);
}
assert.deepEqual(issues('aries','Venus in Scorpio in your 8th house backs into your 7th house. You can review the fixture.',contextBrief),[]);
assert(issues('aries','Venus in Scorpio in your 7th house backs into your 8th house. You can review the fixture.',contextBrief).length);
assert.deepEqual(issues('libra','Venus enters your first house. You can review the fixture.',contextBrief),[]);
assert(issues('aries','Venus enters your 13th house. You can review the fixture.',contextBrief).length);
console.log('PASS house-only ingresses: destinations require the same planet’s calculated ingress; wrong houses, missing events and earlier mismatches remain blocked.');

// A pasted external rewrite is an ordinary version-checked draft save, without
// a paid generation/review prerequisite. Preserve its exact bytes to the reader.
{
 const manual=structuredClone(monthlyRow);
 manual.source_snapshot.horoscopeGeneration.candidateHolds={overview:{candidate:{headline:'Held overview',body:'You can read the held fixture.'},operation:{id:'held-review-fixture'}}};
 store.rows.set(manual.id,manual);
 const edition=structuredClone(manual.sections.horoscopeEdition);
 edition.passages[0].body=monthlyManualBody;
 const edited=await store.invoke('PATCH',{id:manual.id,expectedUpdatedAt:manual.updated_at,status:'DRAFT',sections:{horoscopeEdition:edition},body:horoscopeEditionBody(edition)});
 assert.equal(edited.status,200,JSON.stringify(edited.payload));
 const saved=edited.payload.rows[0];
 assert.equal(saved.sections.horoscopeEdition.passages[0].body,monthlyManualBody);
 assert.deepEqual(saved.source_snapshot.horoscopeGeneration.candidateHolds,{});
 assert.equal(saved.source_snapshot.horoscopeGeneration.candidateResolutions.at(-1).resolution,'owner_edited');
 const check=await invokeHoroscopeWriting({action:'validate-publication',id:saved.id,expectedUpdatedAt:saved.updated_at});
 assert.equal(check.status,200,JSON.stringify(check.payload));
 assert.deepEqual(check.payload.publication.issues,[]);
 assert.equal(check.payload.publication.ready,true);
 const stale=await store.invoke('PATCH',{id:saved.id,expectedUpdatedAt:manual.updated_at,body:'Stale overwrite'});
 assert.equal(stale.status,409);assert.equal(store.rows.get(saved.id).body,saved.body);
 const published=await store.invoke('PATCH',{id:saved.id,expectedUpdatedAt:saved.updated_at,status:'LIVE'});
 assert.equal(published.status,200,JSON.stringify(published.payload));
 const read=await readerRouteResponse('/api/content-reader',{method:'POST',body:JSON.stringify({ids:[saved.id]})});
 assert.equal((await read.json()).rows[0].body,saved.body);
 for(const bad of [
  monthlyManualBody.replace('Venus retrograde squares Mars','Venus direct squares Mars'),
  monthlyManualBody.replace('Venus retrograde squares Pluto','Venus retrograde trines Pluto'),
  monthlyManualBody.replace('Mercury turning retrograde on October 24','Mercury turning retrograde on October 26'),
  monthlyManualBody.replace('Taurus Full Moon on October 26','Taurus Full Moon on October 24'),
  monthlyManualBody.replace('Mercury turning retrograde','Mercury turning direct'),
  monthlyManualBody.replace('Mercury turning retrograde','Venus turning retrograde'),
 ])assert(issues('overview',bad,monthlyBrief).length,`Invalid manual claim accepted: ${bad}`);
 console.log('PASS external monthly rewrite: exact save, held-review resolution, preflight, publication and reader copy; stale edits and incorrect claims refused.');
}

// Local recovery never writes. Only overlapping changes need a choice, and
// changes to facts, publication state or an active operation cannot be rebased.
{
 const {reconcileHoroscopeEdits,horoscopeEditableState}=await import('../apps/admin/src/horoscopeEditReconciliation');
 const base=structuredClone(monthlyRow),local=structuredClone(horoscopeEditableState(base));
 local.draft.passages[0].body=monthlyManualBody;
 const latest=structuredClone(base);latest.updated_at='2026-10-12T18:00:00.123456+00:00';latest.reviewer_notes='Other metadata';
 let result=reconcileHoroscopeEdits(base,latest,local)!;
 assert.equal(result.conflicts.length,0);assert.equal(result.keepLocal.draft.passages[0].body,monthlyManualBody);
 latest.sections.horoscopeEdition.passages[0].body='Your competing saved fixture.';
 local.draft.passages[0].headline='Your local headline';
 result=reconcileHoroscopeEdits(base,latest,local)!;
 assert.equal(result.conflicts.length,1);
 assert.equal(result.keepLocal.draft.passages[0].body,monthlyManualBody);
 assert.equal(result.useSaved.draft.passages[0].body,'Your competing saved fixture.');
 assert.equal(result.useSaved.draft.passages[0].headline,'Your local headline');
 for(const changed of [
  {...latest,id:'another-row'}, {...latest,status:'LIVE'}, {...latest,facts:{}},
  {...latest,source_snapshot:{horoscopeGeneration:{active:{id:'pending'}}}},
  {...latest,source_snapshot:{horoscopeGeneration:{batch:{status:'running'}}}}
 ])assert.equal(reconcileHoroscopeEdits(base,changed,local),null);
 assert.equal(base.sections.horoscopeEdition.passages[0].body,monthlyAspectBody);
 console.log('PASS save recovery: local three-way comparison preserves text and nonoverlapping edits; facts, row identity, publication and active-generation changes cannot be rebased.');
}
