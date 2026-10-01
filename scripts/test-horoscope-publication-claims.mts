import assert from 'node:assert/strict';
import {store} from '../tests/helpers/sky-article-save-api.mts';
import {readerRouteResponse} from '../tests/helpers/content-reader-route.mjs';
import {createSeasonalPublicationFixture,seasonalClaimBodies} from '../tests/helpers/horoscope-publication-fixture.mts';
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
