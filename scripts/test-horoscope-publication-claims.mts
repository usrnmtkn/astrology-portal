import assert from 'node:assert/strict';
import {store} from '../tests/helpers/sky-article-save-api.mts';
import {readerRouteResponse} from '../tests/helpers/content-reader-route.mjs';
import {createSeasonalPublicationFixture,seasonalClaimBodies,createMonthlyAspectPublicationFixture,monthlyAspectBody} from '../tests/helpers/horoscope-publication-fixture.mts';
import {horoscopeAspectFindings} from '../src/astro-writing/horoscopeAspectClaims.mjs';
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
