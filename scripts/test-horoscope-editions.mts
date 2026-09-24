import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {readFileSync,globSync} from 'node:fs';
import {store} from '../tests/helpers/sky-article-save-api.mts';
import {readerRouteResponse} from '../tests/helpers/content-reader-route.mjs';
import {horoscopeCivilWindow,prepareHoroscopeBrief} from '../api/_lib/horoscope-editions';
import {emptyHoroscopeEdition,horoscopeEditionBody,horoscopeEditionKey,horoscopeEditionAt,validateHoroscopeEdition,HOROSCOPE_SIGNS} from '../apps/web/src/content/horoscopeEditions.mjs';

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
