import {nextHoroscopeRefresh} from '../apps/web/src/features/horoscopes/horoscopeRefresh';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {readFileSync,globSync} from 'node:fs';
import {store} from '../tests/helpers/sky-article-save-api.mts';
import {readerRouteResponse} from '../tests/helpers/content-reader-route.mjs';
import {horoscopeCivilWindow,prepareHoroscopeBrief} from '../api/_lib/horoscope-editions';
import {emptyHoroscopeEdition,horoscopeEditionBody,horoscopeEditionKey,horoscopeEditionAt,validateHoroscopeEdition,HOROSCOPE_SIGNS} from '../apps/web/src/content/horoscopeEditions.mjs';
import {prepareHoroscopeWriting,writeHoroscopeSign} from '../src/astro-writing/horoscopeWriting.mjs';

const briefUrl='/api/admin/generated-content?horoscopeBrief=true&period=weekly&date=2026-09-24&timeZone=America/New_York';
const deployment=JSON.parse(readFileSync(new URL('../vercel.json',import.meta.url),'utf8'));
assert(deployment.functions['api/admin/generated-content.ts'].includeFiles.includes('node_modules/swisseph-wasm/wasm/*'));
const functionFiles=new Set(globSync(deployment.functions['api/admin/generated-content.ts'].includeFiles));
assert(globSync(deployment.functions['api/**/*.ts'].includeFiles).every(file=>functionFiles.has(file)), 'Horoscope calculation packaging must preserve every existing admin runtime source');
assert(Object.keys(deployment.functions).indexOf('api/admin/generated-content.ts')<Object.keys(deployment.functions).indexOf('api/**/*.ts'));
assert.equal((await store.invoke('GET',undefined,briefUrl,'wrong')).status,401);
assert.equal((await store.invoke('GET',undefined,briefUrl.replace('2026-09-24','2026-02-30'))).status,400);
const result=await store.invoke('GET',undefined,briefUrl);
assert.equal(result.status,200,JSON.stringify(result.payload));
const {brief,signature}=result.payload;
assert.equal(brief.provenance.actualEphemeris,'swiss');
assert.equal(brief.window.startsAt,'2026-09-21T04:00:00.000Z');
assert.equal(brief.window.endsAt,'2026-09-28T04:00:00.000Z');
assert.equal(brief.signs.length,12);
// Two seasons and both sides of the date line use the same calculation functions
// as Calendar. Check direct Swiss positions on either side of each ingress.
const ephemeris=await import('../apps/web/src/services/ephemeris');
// Weekly must receive the same calculated major planetary aspects as the
// longer periods. Check the authenticated handler, direct Swiss geometry and
// final writer input, without dispatching a paid request.
for(const [date,timeZone] of [['2026-10-05','America/New_York'],['2026-12-21','Pacific/Kiritimati']]){
 const response=await store.invoke('GET',undefined,`/api/admin/generated-content?horoscopeBrief=true&period=weekly&date=${date}&timeZone=${timeZone}`);
 assert.equal(response.status,200,JSON.stringify(response.payload));
 const packet=response.payload,aspects=packet.brief.events.filter((e:any)=>e.type==='aspect');
 assert(aspects.length,'Weekly is not limited to Moon movements and lunations');
 assert(packet.brief.coverage.includes('Exact major aspects between the Sun and planets are included.'));
 for(const event of aspects){
  assert(!event.planets.includes('Moon'),'This change does not add routine lunar aspects');
  assert(event.startsAt>=packet.brief.window.startsAt&&event.startsAt<packet.brief.window.endsAt);
  const sky=await ephemeris.getAstrodienstSky({label:'Fixture',latitude:0,longitude:0,timeZone},new Date(event.startsAt),{includeTransitWindows:false});
  assert.equal(sky.calculationProvenance?.actualEphemeris,'swiss');
  const longitude=(planet:string)=>{const p=sky.positions.find(p=>p.planet===planet)!;return HOROSCOPE_SIGNS.indexOf(p.sign.toLowerCase())*30+p.degree;};
  const delta=Math.abs(longitude(event.planets[0])-longitude(event.planets[1]));
  const expected=({conjunction:0,sextile:60,square:90,trine:120,opposition:180} as any)[event.aspect];
  assert(Math.abs(Math.min(delta,360-delta)-expected)<0.05,`${event.title} must be exact at the supplied instant`);
 }
 const edition=emptyHoroscopeEdition(packet.brief.window);
 const prepared=prepareHoroscopeWriting({sections:{horoscopeEdition:edition},facts:{horoscopeBrief:packet},source_snapshot:{}});
 const stop=new Error('Unbilled writer boundary');let request:any;
 await assert.rejects(writeHoroscopeSign(prepared,'aries',{approvedPlanHash:prepared.planHash,approvalReference:'fixture:weekly-major-aspects',writerClient:async(value:any)=>{request=value;throw stop;}}),error=>error===stop);
 assert(request);
 for(const event of aspects)assert(request.input.includes(event.id),`Writer must receive ${event.title}, not merely the brief API`);
 assert.deepEqual(request.schema.required,['headline','body'],'Weekly does not acquire a Monthly TLDR or synthesis step');
 const daily=await prepareHoroscopeBrief(new URL(`http://localhost/?period=daily&date=${date}&timeZone=${timeZone}`));
 assert(daily.brief.events.every((e:any)=>e.type!=='aspect'),'Daily coverage is unchanged');
}
for(const [date,timeZone] of [['2026-09-24','America/New_York'],['2026-12-25','Pacific/Kiritimati']]){
 const packet=await prepareHoroscopeBrief(new URL(`http://localhost/?period=weekly&date=${date}&timeZone=${timeZone}`));
 const location={label:'Test geocentric',latitude:0,longitude:0,timeZone};
 const direct=await ephemeris.getHoroscopeCalendarRangeEvents(location,new Date(packet.brief.window.startsAt),new Date(packet.brief.window.endsAt));
 const legacy=await ephemeris.getLunarCalendarRangeEvents(location,new Date(packet.brief.window.startsAt),new Date(packet.brief.window.endsAt));
 assert(legacy.every((e:any)=>e.type!=='ingress'),'The opt-in cannot alter Calendar/You lunar-only coverage');
 const ingress=packet.brief.events.find((e:any)=>e.type==='ingress'&&e.planet==='Sun');assert(ingress);
 assert.equal(ingress.startsAt,direct.find((e:any)=>e.id===ingress.id)?.startsAt);
 for(const [offset,sign] of [[-60000,ingress.fromSign],[60000,ingress.sign]] as const){
  const sky=await ephemeris.getAstrodienstSky(location,new Date(Date.parse(ingress.startsAt)+offset),{includeTransitWindows:false});
  assert.equal(sky.calculationProvenance?.actualEphemeris,'swiss');
  assert.equal(sky.positions.find((p:any)=>p.planet==='Sun')?.sign,sign);
 }
}
const sameWeek=await prepareHoroscopeBrief(new URL('http://localhost'+briefUrl.replace('2026-09-24','2026-09-27')));
assert.deepEqual(sameWeek.brief,brief,'Choosing another day within the same week cannot change the writing facts');

assert.deepEqual(horoscopeCivilWindow('weekly','2027-01-01','America/New_York'),{start:'2026-12-28',end:'2027-01-04'});
for(const [date,hours] of [['2026-03-08',23],['2026-11-01',25]] as const){
  const value=await prepareHoroscopeBrief(new URL(`http://localhost/?period=daily&date=${date}&timeZone=America/New_York`));
  assert.equal((Date.parse(value.brief.window.endsAt)-Date.parse(value.brief.window.startsAt))/3600000,hours);
}
for(const date of ['2026-09-24','2026-12-25']){
  const value=await prepareHoroscopeBrief(new URL(`http://localhost/?period=seasonal&date=${date}&timeZone=America/New_York`));
  const {getSkyPlacementTransitFacts}=await import('../apps/web/src/services/ephemeris');
  const direct=await getSkyPlacementTransitFacts({planet:'Sun',sign:value.brief.window.seasonSign!,referenceDate:new Date(value.brief.calculatedAt),timeZone:'America/New_York'});
  assert.equal(value.brief.window.startsAt,new Date(direct.transitStart).toISOString());
  assert.equal(value.brief.window.endsAt,new Date(direct.transitEnd).toISOString());
}
let edition=emptyHoroscopeEdition(brief.window);
const packet={brief,signature};
// Actual jsonb storage changes key order; the saved facts must still verify.
const db = new PGlite();
try {
  const stored = await db.query<{packet: typeof packet}>('select $1::jsonb as packet', [JSON.stringify(packet)]);
  Object.assign(packet, stored.rows[0].packet);
} finally { await db.close(); }
const payload=()=>({contentKey:horoscopeEditionKey(edition.window),surface:'sky',mode:'article',eventType:'horoscope-edition',provider:'manual-admin',model:'manual',targetDate:null,
  status:'DRAFT',lane:'serving',reviewState:null,headline:'Fixture weekly horoscopes',body:horoscopeEditionBody(edition),summary:'',sections:{horoscopeEdition:edition},facts:{horoscopeBrief:packet},sourceSnapshot:{horoscopeOutlines:{aries:'PRIVATE OUTLINE'},studioWritingProfile:{prompt:'PRIVATE PROMPT'}}});
let saved=await store.invoke('POST',payload());
assert.equal(saved.status,200,JSON.stringify(saved.payload));
let row=saved.payload.rows[0];
const versionUrl=`/api/admin/generated-content?horoscopeEditions=true&editionVersion=true&id=${row.id}`;
assert.equal((await store.invoke('GET',undefined,versionUrl,'wrong')).status,401);
assert.equal((await store.invoke('GET',undefined,'/api/admin/generated-content?horoscopeEditions=true&editionVersion=true')).status,400);
const beforeVersionRead=structuredClone(row);
const version=await store.invoke('GET',undefined,versionUrl);
assert.equal(version.status,200);
assert.deepEqual(version.payload.rows,[{id:row.id,updated_at:row.updated_at}],'Idle checks exclude all saved prose, facts and provider history');
assert.deepEqual(store.rows.get(row.id),beforeVersionRead,'Version check is read-only');
assert.equal((await store.invoke('PATCH',{id:row.id,status:'LIVE',expectedUpdatedAt:row.updated_at})).status,422,'Incomplete editions cannot publish');
edition={...edition,passages:HOROSCOPE_SIGNS.map(sign=>({sign,headline:`Fixture ${sign} headline`,body:`Fixture ${sign} opening.\n\nFixture ${sign} final sentence.  `}))};
assert.throws(()=>validateHoroscopeEdition({...edition,passages:edition.passages.map(()=>edition.passages[0])}),/one headline/);
const edited=await store.invoke('PATCH',{id:row.id,expectedUpdatedAt:row.updated_at,sections:{horoscopeEdition:edition},body:horoscopeEditionBody(edition),status:'DRAFT'});
assert.equal(edited.status,200,JSON.stringify(edited.payload));
const oldVersion=row.updated_at;row=edited.payload.rows[0];
assert.equal((await store.invoke('PATCH',{id:row.id,status:'LIVE',expectedUpdatedAt:oldVersion})).status,409);
const read=async(at='2026-09-24T16:00:00.000Z')=>{
  const response=await readerRouteResponse('/api/content-reader',{method:'POST',body:JSON.stringify({horoscope:{period:'weekly',at}})});
  assert.equal(response.status,200);return response.json();
};
assert.equal((await read()).rows.length,0,'Drafts stay private');
const tampered=structuredClone(packet);tampered.brief.positions[0].sign='Aries';
assert.equal((await store.invoke('PATCH',{id:row.id,expectedUpdatedAt:row.updated_at,facts:{horoscopeBrief:tampered}})).status,422);
const live=await store.invoke('PATCH',{id:row.id,expectedUpdatedAt:row.updated_at,status:'LIVE'});
assert.equal(live.status,200,JSON.stringify(live.payload));row=live.payload.rows[0];
const publicData=await read();
assert.equal(publicData.rows.length,1);
assert.deepEqual(publicData.rows[0].sections.horoscopeEdition,edition);
assert(!JSON.stringify(publicData).includes('PRIVATE'));
assert(!JSON.stringify(publicData).includes('signature'));
assert(!JSON.stringify(publicData).includes('horoscopeBrief'));
assert.deepEqual(horoscopeEditionAt(publicData.rows,'weekly','2026-09-24T16:00:00.000Z'),edition);
assert.equal((await read(brief.window.endsAt)).rows.length,0,'End is exclusive; old weeks cannot serve');
assert.equal((await read('2026-09-20T16:00:00.000Z')).rows.length,0);
const change={...edition,passages:edition.passages.map(p=>({...p,body:p.body+'Fixture revised.'}))};
const revised=await store.invoke('PATCH',{id:row.id,expectedUpdatedAt:row.updated_at,status:'LIVE',sections:{horoscopeEdition:change},body:horoscopeEditionBody(change)});
assert.equal(revised.status,200,JSON.stringify(revised.payload));
assert.equal(revised.payload.rows[0].status,'DRAFT','Editing cannot approve new wording in the same save');
assert.equal((await read()).rows.length,0,'Editing removes the previous publication');
console.log('PASS horoscope editions: calculated periods/DST/year boundary/solar ingress, actual-handler saves, exact text, complete publication, stale conflicts, signed facts and private-to-reader boundary');

// Civil-day refresh is independent of whether an edition has been published.
for(const [zone,now,next] of [
 ['America/New_York','2026-03-08T05:00:00Z','2026-03-09T04:00:00.000Z'],
 ['America/New_York','2026-11-01T04:00:00Z','2026-11-02T05:00:00.000Z'],
 ['Asia/Kathmandu','2026-09-27T10:00:00Z','2026-09-27T18:15:00.000Z'],
 ['Pacific/Kiritimati','2026-12-31T09:59:00Z','2026-12-31T10:00:00.000Z'],
 ['Pacific/Honolulu','2027-01-01T09:59:00Z','2027-01-01T10:00:00.000Z'],
 ['America/Santiago','2026-09-05T16:00:00Z','2026-09-06T04:00:00.000Z'],
]) {
 assert.equal(new Date(nextHoroscopeRefresh(zone,undefined,Date.parse(now))).toISOString(),next);
 assert.equal(new Date(nextHoroscopeRefresh(zone,now,Date.parse(now))).toISOString(),next,'An expired edition does not spin in a refresh loop');
}
assert.equal(new Date(nextHoroscopeRefresh('America/New_York','2026-09-27T17:00:00Z',Date.parse('2026-09-27T16:00:00Z'))).toISOString(),'2026-09-27T17:00:00.000Z','Seasonal ingress boundaries refresh before midnight');
