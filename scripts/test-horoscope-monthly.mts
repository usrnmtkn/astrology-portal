import {assertHoroscopeRequestEvidence} from './assert-horoscope-request-evidence.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {store,installHoroscopeWriterFixture,invokeHoroscopeWriting,writerFixture} from '../tests/helpers/sky-article-save-api.mts';
import {readerRouteResponse} from '../tests/helpers/content-reader-route.mjs';
import {horoscopeCivilWindow,prepareHoroscopeBrief} from '../api/_lib/horoscope-editions';
import {emptyHoroscopeEdition,validateHoroscopeEdition,horoscopeEditionBody,horoscopeEditionKey,horoscopeEditionAt,HOROSCOPE_SIGNS} from '../apps/web/src/content/horoscopeEditions.mjs';
import {defaultHoroscopeProfile,horoscopeEditorialPrompt} from '../src/astro-writing/horoscopeWritingProfiles.mjs';
import {prepareHoroscopeWriting} from '../src/astro-writing/horoscopeWriting.mjs';
import {validateHoroscopeReading} from '../src/astro-writing/horoscopeValidation.mjs';
import {MONTHLY_HOROSCOPE_FORMAT,composeMonthlyHoroscopeDraft} from '../src/astro-writing/monthlyHoroscopeFormat.mjs';
import {getAstrodienstSky} from '../apps/web/src/services/ephemeris';

const packaged=new Set(fs.globSync(JSON.parse(fs.readFileSync('vercel.json','utf8')).functions['api/admin/horoscope-writing.ts'].includeFiles));
for(const source of ['src/astro-writing/horoscopeOverviewInput.mjs','src/astro-writing/monthlyHoroscopeFormat.mjs','src/astro-writing/horoscopeAspectClaims.mjs','packages/astro-knowledge/data/primitives/aspects.json','data/writing/seasonal-horoscope-units.json'])assert(packaged.has(source),source);
installHoroscopeWriterFixture();
assert.deepEqual(horoscopeCivilWindow('monthly','2028-02-20','Australia/Sydney'),{start:'2028-02-01',end:'2028-03-01'});
assert.deepEqual(horoscopeCivilWindow('monthly','2026-12-31','UTC'),{start:'2026-12-01',end:'2027-01-01'});
const checkedAspects=new Set<string>();
for(const [date,timeZone,hours] of [['2028-02-20','UTC',696],['2026-03-10','America/New_York',743],['2026-04-10','Australia/Sydney',721]] as const){
 const packet=await prepareHoroscopeBrief(new URL(`http://localhost/?period=monthly&date=${date}&timeZone=${timeZone}`));
 assert.equal((Date.parse(packet.brief.window.endsAt)-Date.parse(packet.brief.window.startsAt))/3600000,hours);
 assert.equal(packet.brief.referenceDate,date.slice(0,7)+'-01');
 const aspects=packet.brief.events.filter((e:any)=>e.type==='aspect');assert(aspects.length,'Exact major aspects reach the monthly brief');
 for(const type of ['conjunction','sextile','square','trine','opposition']){
 const aspect=aspects.find((e:any)=>e.aspect===type) as any;if(!aspect)continue;checkedAspects.add(type);
 const sky=await getAstrodienstSky({label:'Fixture',latitude:0,longitude:0,timeZone},new Date(aspect.startsAt),{includeTransitWindows:false});
 const longitude=(planet:string)=>{const p=sky.positions.find(p=>p.planet===planet)!;return HOROSCOPE_SIGNS.indexOf(p.sign.toLowerCase())*30+p.degree;};
 const delta=Math.abs(longitude(aspect.planets[0])-longitude(aspect.planets[1]));
 const angle=Math.min(delta,360-delta),expected=({conjunction:0,sextile:60,square:90,trine:120,opposition:180} as any)[aspect.aspect];
 assert(Math.abs(angle-expected)<0.05,`${aspect.title}: ${angle} versus ${expected}`);
 }
}
assert.deepEqual([...checkedAspects].sort(),['conjunction','opposition','sextile','square','trine']);
const packet=await prepareHoroscopeBrief(new URL('http://localhost/?period=monthly&date=2026-10-16&timeZone=America/New_York'));
assert.equal(packet.brief.window.audience,'collective');
const edition=emptyHoroscopeEdition(packet.brief.window);assert.deepEqual(edition.passages.map(p=>p.sign),['overview']);
assert.throws(()=>validateHoroscopeEdition({...edition,passages:HOROSCOPE_SIGNS.map(sign=>({sign,headline:'',body:''}))}),/one shared overview/);
const profile=defaultHoroscopeProfile('monthly');profile.voiceGuidance+='\nPrivate fixture preference stays in the full prompt.';
let result=await store.invoke('POST',{profile,expectedUpdatedAt:null},'/api/admin/generated-content?writingProfiles=true');assert.equal(result.status,200,JSON.stringify(result.payload));
const savedProfile=result.payload.profile;
result=await store.invoke('POST',{contentKey:horoscopeEditionKey(edition.window),surface:'sky',mode:'article',eventType:'horoscope-edition',provider:'manual-admin',status:'DRAFT',lane:'serving',headline:'October overview fixture',body:horoscopeEditionBody(edition),sections:{horoscopeEdition:edition},facts:{horoscopeBrief:packet},sourceSnapshot:{studioWritingProfile:savedProfile}});
assert.equal(result.status,200,JSON.stringify(result.payload));let row=result.payload.rows[0];
const action=(action:string,extra:any={})=>invokeHoroscopeWriting({action,id:row.id,expectedUpdatedAt:row.updated_at,...extra});
const read=async(at='2026-10-16T12:00:00.000Z')=>{const response=await readerRouteResponse('/api/content-reader',{method:'POST',body:JSON.stringify({horoscope:{period:'monthly',at,timeZone:'America/New_York'}})});assert.equal(response.status,200);return response.json();};
assert.equal((await read()).rows.length,0);
assert.equal((await store.invoke('PATCH',{id:row.id,expectedUpdatedAt:row.updated_at,status:'LIVE'})).status,422);
const plan=await action('prepare');assert.equal(plan.status,200,JSON.stringify(plan.payload));assert.equal(plan.payload.plan.writerCalls,1);assert.equal(plan.payload.plan.readings.length,1);
assert.equal(plan.payload.plan.readings[0].house,null);
assert.equal(writerFixture.calls,0);
assert.equal((await action('generate',{sign:'aries',approvedPlanHash:plan.payload.plan.planHash})).status,400);
const initialVersion=row.updated_at;
result=await action('generate',{sign:'overview',approvedPlanHash:plan.payload.plan.planHash});assert.equal(result.status,202,JSON.stringify(result.payload));row=result.payload.rows[0];
assert.equal(writerFixture.calls,1);
assert.equal((await invokeHoroscopeWriting({action:'generate',id:row.id,expectedUpdatedAt:initialVersion,sign:'overview',approvedPlanHash:plan.payload.plan.planHash})).status,409);
assert.equal((await action('generate',{sign:'overview',approvedPlanHash:plan.payload.plan.planHash})).status,409);
const request=writerFixture.requests.get(row.source_snapshot.horoscopeGeneration.active.responseId);
assert.deepEqual(request.text.format.schema.properties.headline.enum,['October 2026 Overview']);
assert.deepEqual(request.text.format.schema.required,['headline','tldr','body']);
assert.equal(row.source_snapshot.horoscopeGeneration.active.outputFormat,MONTHLY_HOROSCOPE_FORMAT);
assert(request.input.includes('Begin with a true TLDR'));
assert(request.input.includes('The opening TLDR gives the month’s meaning without calendar dates.'));
assert(request.input.includes('The TLDR comes before the dated forecast.'));
assert(profile.structure.includes('In the dated forecast after the TLDR, include the supplied month and day'));
const expectedMonthly=composeMonthlyHoroscopeDraft({headline:'October 2026 Overview',tldr:'You can read the complete monthly summary fixture.\n\nYour summary ends here.',body:'You can read the complete overview fixture opening.\n\nYour saved fixture ends here.'});
assert(request.input.includes(horoscopeEditorialPrompt(profile)));
assert(!/450[–-]700/.test(profile.structure),'Monthly depth must not be compressed to the old word-count target');
assert(request.instructions.includes('HOROSCOPE EDITORIAL AUTHORITY'));
for(const unrelated of ['SKY PLACEMENT ARTICLE SPINE','SPINE QUALITY GATES','NEGATION-PIVOT CAP','at least two short imperatives','4-12 word sentences']) {
 assert(!request.instructions.includes(unrelated),`A horoscope must not receive the conflicting general article rule: ${unrelated}`);
}
for(const boundary of ['factual-safety-v1','grammar-v1','source-licensing-v1','register-direction-v1','unsupported-astrology-claims-v1'])assert(request.instructions.includes(boundary),boundary);
assertHoroscopeRequestEvidence(request.input);
const essays=JSON.parse(request.input.match(/COMPLETE OWNER COLLECTIVE ESSAYS — PRIMARY PROSE EVIDENCE\n([^\n]+)\n\n/)[1]);
assert.equal(essays.length,3);
for(const essay of essays){
 const source=fs.readFileSync(essay.sourcePath,'utf8');
 assert(packaged.has(essay.sourcePath),'Complete overview source is packaged');
 assert.equal(essay.text,source.slice(essay.provenance.start,essay.provenance.end));
 assert.equal(essay.sourceRecordSha256,createHash('sha256').update(essay.text).digest('hex'));
 assert.equal(essay.horoscopeAudienceSign,'overview');assert.equal(essay.factUseAuthorized,false);
 assert.equal(request.input.split(JSON.stringify(essay.text).slice(1,-1)).length-1,1,'The complete primary essay must be supplied once, without compression');
}
const supporting=JSON.parse(request.input.match(/SUPPORTING OWNER PASSAGES\n([^\n]+)\n\n/)[1]);
const completePassages=new Map([...essays,...supporting].map((p:any)=>[p.id,p]));
const shared=JSON.parse(request.input.match(/SHARED FIVE-ROLE EVIDENCE\n([^\n]+)\n\n/)[1]);
const relevant=JSON.parse(request.input.match(/RELEVANT OWNER PASSAGES\n([^\n]+)\n\n/)[1]);
assert.deepEqual(Object.keys(shared.roles).sort(),['argument','meaning','phrase','register','scene']);
for(const entry of [...shared.entries,...Object.values(shared.roles).flat(),...relevant] as any[]){
 if(entry.completePassageRef)assert(completePassages.has(entry.completePassageRef),'Every role reference resolves to a complete passage in this request');
}
for(const passage of supporting)assert.equal(request.input.split(JSON.stringify(passage.text).slice(1,-1)).length-1,1,'Supporting passage remains exact and unduplicated');
const registerEntries=shared.entries.filter((e:any)=>e.role==='register'&&e.completePassageRef);
assert(registerEntries.length>=3);assert(registerEntries.every((e:any)=>!Object.hasOwn(e,'text')));
const facts=JSON.parse(request.input.match(/CALCULATED FACTS\n([^\n]+)\n\n/)[1]);assert.equal(facts.window.audience,'collective');assert(!facts.house&&!facts.risingSign&&!facts.signs);
writerFixture.pendingPolls=1;result=await action('poll');assert.equal(result.status,202);row=result.payload.rows[0];
result=await action('poll');assert.equal(result.status,200,JSON.stringify(result.payload));row=result.payload.rows[0];
assert.equal(writerFixture.calls,1);assert.equal(row.status,'DRAFT');assert.equal(row.sections.horoscopeEdition.passages[0].headline,'October 2026 Overview');
assert.equal(row.source_snapshot.horoscopeGeneration.readings.overview.ownerApproved,false);
assert.equal(row.source_snapshot.horoscopeGeneration.readings.overview.outputFormat,MONTHLY_HOROSCOPE_FORMAT);
assert.equal(row.sections.horoscopeEdition.passages[0].body,expectedMonthly.body);
assert.equal(row.body,horoscopeEditionBody(row.sections.horoscopeEdition));
assert.equal((await read()).rows.length,0);
result=await store.invoke('PATCH',{id:row.id,expectedUpdatedAt:row.updated_at,status:'LIVE'});assert.equal(result.status,200,JSON.stringify(result.payload));row=result.payload.rows[0];
const published=await read();assert.equal(published.rows.length,1);assert(!JSON.stringify(published).includes('Private fixture preference'));assert(!JSON.stringify(published).includes('horoscopeBrief'));
assert.equal(horoscopeEditionAt(published.rows,'monthly','2026-10-16T12:00:00.000Z','America/New_York')?.passages[0].body,row.sections.horoscopeEdition.passages[0].body);
assert.equal((await read(packet.brief.window.endsAt)).rows.length,0);
// New seasons include a shared introduction; old saved seasons retain twelve units.
const seasonalPacket=await prepareHoroscopeBrief(new URL('http://localhost/?period=seasonal&date=2026-10-01&timeZone=America/New_York'));
const season=emptyHoroscopeEdition(seasonalPacket.brief.window);assert.equal(season.passages.length,13);assert.equal(season.passages[0].sign,'overview');
const seasonal=prepareHoroscopeWriting({sections:{horoscopeEdition:season},facts:{horoscopeBrief:seasonalPacket},source_snapshot:{}});
assert.equal(seasonal.entries[0].seasonalMeaning.seasonSign,'libra');assert.equal(seasonal.entries[0].seasonalMeaning.sources.length,2);assert(!seasonal.entries[0].seasonalMeaning.areas);
assert.equal(seasonal.entries[1].seasonalMeaning.risingSign,'aries');
const legacy={...season,passages:season.passages.slice(1)};assert.equal(validateHoroscopeEdition(legacy).passages.length,12);
const issues=(body:string)=>validateHoroscopeReading({sign:'overview',headline:'October 2026 Overview',body},packet.brief).violations.filter((v:any)=>v.category==='horoscope_fact_boundary');
assert(issues('You can notice the Sun in Libra in your seventh house.').length);
const aspect=packet.brief.events.find((e:any)=>e.type==='aspect'&&e.aspect==='opposition') as any;assert(aspect);
const localDate=new Intl.DateTimeFormat('en-US',{month:'long',day:'numeric',timeZone:packet.brief.window.timeZone}).format(new Date(aspect.startsAt));
assert.deepEqual(issues(`You can reconsider a commitment as ${aspect.planets[0]} opposes ${aspect.planets[1]} on ${localDate}.`),[]);
assert(issues(`You can reconsider a commitment as ${aspect.planets[0]} opposes ${aspect.planets[1]} on October 31.`).length);
for(const claim of [
 `${aspect.planets[0]} in ${aspect.fromSign} opposes ${aspect.planets[1]} in ${aspect.toSign}`,
 `the opposition between ${aspect.planets[0]} and ${aspect.planets[1]}`,
 `${aspect.planets[0]}–${aspect.planets[1]} opposition`,
 `${aspect.planets[0]} and ${aspect.planets[1]} opposition`
]){
 assert.deepEqual(issues(`You can reconsider a commitment around ${claim} on ${localDate}.`),[],claim);
 assert(issues(`You can reconsider a commitment around ${claim} on October 31.`).length,claim);
}

// Rejection preserves the exact published prose in history and clears only the draft.
result=await store.invoke('PATCH',{id:row.id,expectedUpdatedAt:row.updated_at,status:'DRAFT'});assert.equal(result.status,200);row=result.payload.rows[0];
const previous=row.sections.horoscopeEdition.passages[0].body;
result=await action('reject',{sign:'all'});assert.equal(result.status,200,JSON.stringify(result.payload));row=result.payload.rows[0];
assert.equal(row.sections.horoscopeEdition.passages[0].body,'');assert.equal(row.source_snapshot.horoscopeGeneration.rejections[0].passages[0].body,previous);assert.equal(writerFixture.calls,1);
console.log('PASS monthly overview: local month/DST/leap boundaries, Swiss aspect exactness, complete owner essays, one durable writer call, recovery, owner publication, public privacy, rejection and legacy seasons.');

const providerResult=(draft:any)=>({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(draft)}]}]});
const reset=async()=>{const r=await action('reject',{sign:'all'});assert.equal(r.status,200,JSON.stringify(r.payload));row=r.payload.rows[0];};
const start=async()=>{const p=await action('prepare');assert.equal(p.status,200);row=p.payload.rows[0];const r=await action('generate',{sign:'overview',approvedPlanHash:p.payload.plan.planHash});row=r.payload.rows[0];return r;};
const good={headline:'October 2026 Overview',tldr:'A complete summary opening.\n\nA complete summary ending.',body:'The complete dated forecast opening.\n\nThe complete dated forecast ending.'};
for(const invalid of [{headline:good.headline,body:good.body},{...good,tldr:' '},{...good,tldr:'x'.repeat(20000)}]){
 assert.equal((await start()).status,202);
 const calls=writerFixture.calls;
 writerFixture.nextResult=providerResult(invalid);
 const failure=await action('poll');assert.equal(failure.status,422,failure.payload.error);row=failure.payload.rows[0];
 assert.equal(row.source_snapshot.horoscopeGeneration.lastError.code,'invalid_reading');
 assert.equal(row.sections.horoscopeEdition.passages[0].body,'');
 assert.equal(writerFixture.calls,calls,'Malformed output never launches an automatic paid retry');
}
writerFixture.startResult=providerResult(good);
assert.equal((await start()).status,200,'A synchronous monthly completion uses the same composition as a polled response');
assert.equal(row.sections.horoscopeEdition.passages[0].body,composeMonthlyHoroscopeDraft(good).body);
assert.equal(row.source_snapshot.horoscopeGeneration.readings.overview.outputFormat,MONTHLY_HOROSCOPE_FORMAT);
await reset();
assert.equal((await start()).status,202);
// Reproduce an operation dispatched before v13. Do not demand a new field from
// a request already stored with the old two-field provider schema.
const legacyOperation=store.rows.get(row.id)!.source_snapshot.horoscopeGeneration.active;
delete legacyOperation.outputFormat;
const legacyDraft={headline:good.headline,body:'An older complete monthly opening.\n\nIts exact ending.'};
writerFixture.nextResult=providerResult(legacyDraft);
const callsBeforeRecovery=writerFixture.calls;
result=await action('poll');assert.equal(result.status,200,JSON.stringify(result.payload));row=result.payload.rows[0];
assert.equal(row.sections.horoscopeEdition.passages[0].body,legacyDraft.body);
assert.equal(writerFixture.calls,callsBeforeRecovery);
console.log('PASS monthly TLDR: required provider field, exact summary-before-forecast preservation, one-call sync/poll parity, missing-field recovery and legacy response compatibility.');
