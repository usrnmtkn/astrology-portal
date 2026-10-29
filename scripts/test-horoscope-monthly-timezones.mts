import assert from 'node:assert/strict';
import {store} from '../tests/helpers/sky-article-save-api.mts';
import {readerRouteResponse} from '../tests/helpers/content-reader-route.mjs';
import {monthlyTimeZoneFixture,monthlyTimeZoneFixtures} from '../tests/helpers/monthly-timezone-fixture.mts';
import {horoscopeEditionAt,type HoroscopePeriod} from '../apps/web/src/content/horoscopeEditions.mjs';

store.rows.clear();
const rows=monthlyTimeZoneFixtures();
rows.push(
 monthlyTimeZoneFixture(4,'monthly','America/New_York','2026-03-01T05:00:00.000Z','2026-04-01T04:00:00.000Z','March DST'),
 monthlyTimeZoneFixture(5,'monthly','America/New_York','2026-12-01T05:00:00.000Z','2027-01-01T05:00:00.000Z','December year boundary'),
 monthlyTimeZoneFixture(6,'monthly','America/New_York','2027-01-01T05:00:00.000Z','2027-02-01T05:00:00.000Z','January year boundary'),
 monthlyTimeZoneFixture(7,'monthly','America/New_York','2028-02-01T05:00:00.000Z','2028-03-01T05:00:00.000Z','February leap year')
);
for(const row of rows)store.rows.set(row.id,structuredClone(row));
const before=structuredClone([...store.rows.values()]);
const read=async(timeZone:string,at='2026-10-29T16:00:00.000Z',period:HoroscopePeriod='monthly')=>{
 const response=await readerRouteResponse('/api/content-reader',{method:'POST',body:JSON.stringify({horoscope:{period,timeZone,at}})});
 assert.equal(response.status,200);return response.json();
};
const zones=[...new Set([...Intl.supportedValuesOf('timeZone'),'UTC','US/Pacific','US/Eastern','Pacific/Kiritimati','Pacific/Pago_Pago'])];
for(const zone of zones){
 const result=await read(zone);
 assert.equal(result.rows.length,1,zone);
 assert.deepEqual(result.rows[0].sections.horoscopeEdition,rows[1].sections.horoscopeEdition,zone);
 assert.deepEqual(horoscopeEditionAt(result.rows,'monthly','2026-10-29T16:00:00.000Z',zone),rows[1].sections.horoscopeEdition,zone);
 assert(!JSON.stringify(result).includes('PRIVATE MONTHLY SOURCE'));
}
for(const [at,label] of [
 ['2026-10-01T03:59:59.999Z','September New York'],['2026-10-01T04:00:00.000Z','October New York'],
 ['2026-11-01T03:59:59.999Z','October New York'],['2026-11-01T04:00:00.000Z','November New York'],
 ['2026-11-01T06:00:00.000Z','November New York'],['2026-12-01T04:59:59.999Z','November New York'],
 ['2026-12-01T05:00:00.000Z','December year boundary'],['2027-01-01T05:00:00.000Z','January year boundary'],
 ['2026-03-08T07:00:00.000Z','March DST'],['2026-04-01T03:59:59.999Z','March DST'],
 ['2028-02-29T17:00:00.000Z','February leap year']
]){
 for(const zone of ['America/Los_Angeles','Asia/Tokyo','Pacific/Kiritimati','Pacific/Pago_Pago']){
  const result=await read(zone,at);
  assert.equal(horoscopeEditionAt(result.rows,'monthly',at,zone)?.passages[0].headline,`${label} fixture`,`${zone}: ${at}`);
 }
}
assert.equal((await read('Asia/Tokyo','2028-03-01T05:00:00.000Z')).rows.length,0,'Exclusive end cannot serve an expired reading');
assert.deepEqual([...store.rows.values()],before,'Global access never rewrites or copies saved editions');

const local=monthlyTimeZoneFixture(8,'monthly','America/Los_Angeles','2026-10-01T07:00:00.000Z','2026-11-01T07:00:00.000Z','October local');
store.rows.set(local.id,local);
let result=await read('America/Los_Angeles');
assert.equal(result.rows.length,2,'The real API returns the eligible local and New York candidates');
assert.deepEqual(horoscopeEditionAt(result.rows,'monthly','2026-10-29T16:00:00.000Z','US/Pacific'),local.sections.horoscopeEdition,'Local publication retains priority');
const duplicate=monthlyTimeZoneFixture(9,'monthly','America/Los_Angeles','2026-10-01T08:00:00.000Z','2026-11-01T08:00:00.000Z','Overlapping local');
store.rows.set(duplicate.id,duplicate);
result=await read('America/Los_Angeles');
assert.throws(()=>horoscopeEditionAt(result.rows,'monthly','2026-10-29T16:00:00.000Z','America/Los_Angeles'),/More than one/);
store.rows.delete(duplicate.id);
for(const patch of [{status:'DRAFT'},{status:'ARCHIVED'},{lane:'reference'},{review_state:'owner-review-required'}]){
 store.rows.set(local.id,{...local,...patch});
 result=await read('America/Los_Angeles');
 assert.deepEqual(horoscopeEditionAt(result.rows,'monthly','2026-10-29T16:00:00.000Z','America/Los_Angeles'),rows[1].sections.horoscopeEdition,'Unpublished local copy cannot block or replace the approved New York overview');
}
store.rows.delete(local.id);
const overlappingNewYork=monthlyTimeZoneFixture(11,'monthly','America/New_York','2026-10-01T05:00:00.000Z','2026-11-01T05:00:00.000Z','Overlapping New York');
store.rows.set(overlappingNewYork.id,overlappingNewYork);
result=await read('Asia/Tokyo');
assert.throws(()=>horoscopeEditionAt(result.rows,'monthly','2026-10-29T16:00:00.000Z','Asia/Tokyo'),/More than one/);
store.rows.delete(overlappingNewYork.id);
for(const status of ['DRAFT','ARCHIVED']){
 store.rows.set(rows[1].id,{...rows[1],status});
 assert.equal((await read('Asia/Tokyo')).rows.length,0,'An unpublished New York reading stays unavailable worldwide');
}
store.rows.set(rows[1].id,rows[1]);
for(const [period,start,end] of [
 ['daily','2026-10-29T04:00:00.000Z','2026-10-30T04:00:00.000Z'],
 ['weekly','2026-10-26T04:00:00.000Z','2026-11-02T05:00:00.000Z'],
 ['seasonal','2026-10-23T04:00:00.000Z','2026-11-22T05:00:00.000Z']
] as const){
 const row=monthlyTimeZoneFixture(10,period,'America/New_York',start,end,period);
 store.rows.set(row.id,row);
 assert.equal((await read('Asia/Tokyo',undefined,period)).rows.length,0,`${period} keeps its local-only selection`);
 const exact=await read('America/New_York',undefined,period);
 assert.deepEqual(horoscopeEditionAt(exact.rows,period,'2026-10-29T16:00:00.000Z','America/New_York'),row.sections.horoscopeEdition);
 assert.equal(horoscopeEditionAt(exact.rows,period,'2026-10-29T16:00:00.000Z','Asia/Tokyo'),null);
 store.rows.delete(row.id);
}
store.rows.clear();
const tokyo=monthlyTimeZoneFixture(12,'monthly','Asia/Tokyo','2026-09-30T15:00:00.000Z','2026-10-31T15:00:00.000Z','Tokyo');
store.rows.set(tokyo.id,tokyo);
assert.equal((await read('Europe/London')).rows.length,0,'No arbitrary third-zone fallback when New York is unavailable');
const invalid=await readerRouteResponse('/api/content-reader',{method:'POST',body:JSON.stringify({horoscope:{period:'monthly',timeZone:'invalid/timezone',at:'2026-10-29T16:00:00.000Z'}})});
assert.equal(invalid.status,400);
console.log(`PASS monthly global reading: ${zones.length} time zones, actual reader API, exact saved copy, local priority, publication/privacy gates, overlap refusal, DST/leap/year boundaries and other-period isolation`);
