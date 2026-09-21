import assert from 'node:assert/strict';
import handler from '../api/sky';
import { getAstrodienstSky, getLunarCalendarWeek } from '../apps/web/src/services/ephemeris';
import { getSkyFromApi, getSkyOnlineFirst } from '../apps/web/src/services/skyApi';
import SwissEph from 'swisseph-wasm';
const json = (value: unknown) => JSON.parse(JSON.stringify(value));
const swe = new SwissEph(); await swe.initSwissEph();
const fixtures = [
  { at: '2026-09-21T16:00:00.000Z', latitude:40.7128, longitude:-74.006, timeZone:'America/New_York' },
  { at: '2026-03-27T00:00:00.000Z', latitude:35.6762, longitude:139.6503, timeZone:'Asia/Tokyo' },
  { at: '2026-11-01T06:30:00.000Z', latitude:40.7128, longitude:-74.006, timeZone:'America/New_York' }
];
async function invoke(url: string, method = 'GET') {
  const headers: Record<string,string> = {}; let payload: any;
  const res = { statusCode:0, setHeader(k:string,v:string){headers[k]=v;},end(value:string){payload=JSON.parse(value);} };
  await handler({method,url} as any,res as any);
  return { status:res.statusCode,headers,payload };
}
let first: any;
for(const fixture of fixtures) {
  const {at,...coordinates}=fixture; const location={...coordinates,label:'Synthetic location'};
  const params=new URLSearchParams({at,lat:String(location.latitude),lon:String(location.longitude),timeZone:location.timeZone,version:'tldrastro-calculation-v3'});
  const result=await invoke(`/api/sky?${params}`);assert.equal(result.status,200);
  const sky=result.payload.sky;first ??= {sky,location,date:new Date(at)};
  const direct=await getAstrodienstSky(location,new Date(at),{includeTransitWindows:true});
  assert.deepEqual(sky.positions,json(direct.positions),'All placement, motion, residency, station and shadow fields survive the API');
  assert.deepEqual(sky.aspects,json(direct.aspects));assert.deepEqual(sky.moonStatus,json(direct.moonStatus));
  assert.deepEqual(sky.solarDaylight,json(direct.solarDaylight));assert.equal(sky.generatedAt,at);
  const jd=swe.julday(new Date(at).getUTCFullYear(),new Date(at).getUTCMonth()+1,new Date(at).getUTCDate(),new Date(at).getUTCHours()+new Date(at).getUTCMinutes()/60);
  for(const [name,id] of [['Sun',swe.SE_SUN],['Moon',swe.SE_MOON],['North Node',swe.SE_TRUE_NODE],['Lilith',13]] as const) {
    const direct=swe.calc_ut(jd,id,swe.SEFLG_SWIEPH|swe.SEFLG_SPEED);
    assert(Math.abs(sky.positions.find((p:any)=>p.planet===name).longitude-direct[0])<0.00006,`${name} must match direct Swiss calculation at ${at}`);
  }
  assert(sky.facts.every((f:any)=>f.provenance.source==='server-swisseph-wasm'));
  const calendar=await getLunarCalendarWeek(location,new Date(at),{detail:'full'});
  const day=new Intl.DateTimeFormat('en-CA',{timeZone:location.timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(at));
  assert.deepEqual(sky.dailyEvents,json(calendar.days.find(d=>d.dateKey===day)?.events));
  assert.equal(result.headers['cache-control'],'private, no-store');
}
for(const query of ['','at=invalid','at=2026-09-21T16:00:00Z&lat=91&lon=0&version=tldrastro-calculation-v3',
 'at=2026-09-21T16:00:00Z&lat=0&lon=0&timeZone=invalid&version=tldrastro-calculation-v3']) {
 assert.equal((await invoke(`/api/sky?${query}`)).status,400);
}
assert.equal((await invoke('/api/sky','POST')).status,405);
const originalFetch=globalThis.fetch;let fetches=0;
try {
  globalThis.fetch=async ()=>{fetches++;await new Promise(resolve=>setTimeout(resolve,5));return new Response(JSON.stringify({sky:first.sky}));};
  const [a,b]=await Promise.all([getSkyFromApi(first.location,first.date),getSkyFromApi(first.location,first.date)]);
  assert.equal(fetches,1,'Concurrent exact inputs share one request');assert.deepEqual(a,b);assert.equal(a.location.label,'Synthetic location');
  for(const corrupt of [ (s:any)=>{s.generatedAt='2026-09-20T16:00:00.000Z';}, (s:any)=>{s.location.longitude=0;},
    (s:any)=>{s.calculationProvenance.nodeType='mean';},
    (s:any)=>{s.calculationProvenance.lilithType='mean';},(s:any)=>{s.calculationProvenance.returnedEphemerisFlags=[4];},
    (s:any)=>{s.dailyEvents=undefined;},(s:any)=>{s.positions[0].transitEnd=undefined;}]) {
    const sky=structuredClone(first.sky);corrupt(sky);globalThis.fetch=async()=>new Response(JSON.stringify({sky}));
    await assert.rejects(getSkyFromApi(first.location,first.date),/incomplete or mismatched/);
  }
  globalThis.fetch=async()=>new Response('{}',{status:503});
  const local=await getSkyOnlineFirst(first.location,first.date);
  assert.deepEqual(json(local.positions),first.sky.positions,'API failure retains the exact local ephemeris fallback');
} finally {globalThis.fetch=originalFetch;}
console.log('PASS: actual Sky handler, three dates/two zones, direct Swiss positions, complete timing parity, input validation, exact-input coalescing, corrupt-response rejection and local fallback.');
