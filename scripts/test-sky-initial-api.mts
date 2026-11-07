import assert from 'node:assert/strict';
import handler from '../api/sky';
import { getAstrodienstSky, getLunarCalendarWeek } from '../apps/web/src/services/ephemeris';
import { getSkyFromApi, getSkyOnlineFirst, startInitialSkyLoad } from '../apps/web/src/services/skyApi';
import SwissEph from 'swisseph-wasm';
import { readCachedSkySnapshot, writeCachedSkySnapshot, scopedSkySnapshotCacheKey } from '../apps/web/src/services/verifiedSkyCache';
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
  const params=new URLSearchParams({at,lat:String(location.latitude),lon:String(location.longitude),timeZone:location.timeZone,version:'tldrastro-calculation-v4'});
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
  const list=await invoke(`/api/sky?${params}&detail=placements`);
  first.placements ??= list.payload.sky;
  assert.equal(list.status,200);
  assert.equal(list.payload.sky.calculationDetail,'placements');
  assert.deepEqual(list.payload.sky.positions,sky.positions,'List mode retains every complete placement window, station, shadow and residency fact.');
  assert.deepEqual(list.payload.sky.aspects,sky.aspects.map(({timing,exactAt,series,...aspect}:any)=>aspect),'Only the undisplayed aspect timelines and their exact-pass series are deferred.');
  for(const key of ['moonStatus','moonSignTransition','moonEvent','solarDaylight','dailyEvents']) assert.deepEqual(list.payload.sky[key],sky[key],`${key} remains complete.`);
  assert.equal(list.headers['cache-control'],'private, no-store','An exact live instant is never approximated or cached under another time.');
  const items=new Map<string,string>();
  const storage={get length(){return items.size;},getItem:(key:string)=>items.get(key)??null,setItem:(key:string,value:string)=>{items.set(key,value);},removeItem:(key:string)=>{items.delete(key);},key:(index:number)=>[...items.keys()][index]??null};
  const key='synthetic-full',listKey=scopedSkySnapshotCacheKey(key,'placements');
  assert.equal(writeCachedSkySnapshot(key,list.payload.sky,{storage}),false,'A placement snapshot cannot populate a full-consumer cache.');
  assert.equal(writeCachedSkySnapshot(listKey,list.payload.sky,{storage}),true);
  assert.equal(readCachedSkySnapshot(listKey,{storage})?.calculationDetail,'placements');
  items.set(key,JSON.stringify({...JSON.parse(items.get(listKey)!),cacheKey:key}));
  assert.equal(readCachedSkySnapshot(key,{storage}),null,'Even a misplaced partial envelope cannot satisfy a full cache read.');
  assert.equal(writeCachedSkySnapshot(key,sky,{storage}),true);
  assert.equal(readCachedSkySnapshot(key,{storage})?.calculationDetail,'full');
  assert.equal(result.headers['cache-control'],'private, no-store');
}
for(const query of ['','at=invalid','at=2026-09-21T16:00:00Z&lat=91&lon=0&version=tldrastro-calculation-v4',
 'at=2026-09-21T16:00:00Z&lat=0&lon=0&timeZone=invalid&version=tldrastro-calculation-v4']) {
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
    (s:any)=>{s.dailyEvents=undefined;},(s:any)=>{s.positions[0].transitEnd=undefined;},(s:any)=>{s.calculationDetail='placements';}]) {
    const sky=structuredClone(first.sky);corrupt(sky);globalThis.fetch=async()=>new Response(JSON.stringify({sky}));
    await assert.rejects(getSkyFromApi(first.location,first.date),/incomplete or mismatched/);
  }
  globalThis.fetch=async()=>new Response('{}',{status:503});
  const local=await getSkyOnlineFirst(first.location,first.date);
  assert.deepEqual(json(local.positions),first.sky.positions,'API failure retains the exact local ephemeris fallback');
} finally {globalThis.fetch=originalFetch;}
const originalWindow=Object.getOwnPropertyDescriptor(globalThis,'window');
const originalWorker=Object.getOwnPropertyDescriptor(globalThis,'Worker');
try {
  const page=Object.assign(new EventTarget(),{location:new URL('https://fixture.test/?date=2026-09-21#sky'),
    localStorage:{getItem:(key:string)=>key==='tldrastro:selectedLocation'?JSON.stringify(first.location):null},
    sessionStorage:{getItem:()=>null,setItem(){},removeItem(){}}});
  Object.defineProperty(globalThis,'window',{configurable:true,value:page});
  let workerStarts=0;
  Object.defineProperty(globalThis,'Worker',{configurable:true,value:class {
    constructor(){workerStarts++;throw new Error('Cancelled reads must not start local calculations.');}
  }});
  const calls:string[]=[];
  let rejectTransport:(error:Error)=>void=()=>{};
  globalThis.fetch=((input:RequestInfo|URL)=>{
    calls.push(String(input));return new Promise<Response>((_resolve,reject)=>{rejectTransport=reject;});
  }) as typeof fetch;
  for(const event of ['beforeunload','pagehide']) for(const detail of ['placements',true,false] as const){
    calls.length=0;
    const request=getSkyFromApi(first.location,first.date,detail);
    const rejected=assert.rejects(request,{name:'AbortError'});
    page.dispatchEvent(new Event(event));rejectTransport(new TypeError('Synthetic native navigation rejection'));
    await rejected;await new Promise(resolve=>setImmediate(resolve));
    assert.equal(calls.length,1,'Navigation cannot start a retry after the original request rejects.');
  }
  calls.length=0;
  const online=getSkyOnlineFirst(first.location,first.date,'placements');
  const cancelled=assert.rejects(online,{name:'AbortError'});
  page.dispatchEvent(new Event('beforeunload'));rejectTransport(new TypeError('Synthetic native navigation rejection'));
  await cancelled;assert.equal(calls.length,1);assert.equal(workerStarts,0);
  calls.length=0;
  const initial=startInitialSkyLoad()!;assert(initial);
  const resolved=assert.rejects(initial.resolve(),(error: any)=>error===initial.cancelled&&error.name==='AbortError',
    'Initial selection preserves the original navigation cancellation reason.');
  page.dispatchEvent(new Event('beforeunload'));rejectTransport(new TypeError('Synthetic native navigation rejection'));
  assert.equal(await initial.result,null);await resolved;
  assert.equal(initial.matches(initial.day,initial.location,initial.detail),null);
  assert.equal(calls.length,1);assert.equal(workerStarts,0,'Cancelled initial reads cannot start a local fallback.');
  calls.length=0;
  const key=new URLSearchParams({at:first.date.toISOString(),lat:String(first.location.latitude),lon:String(first.location.longitude),
    timeZone:first.location.timeZone,version:'tldrastro-calculation-v4',detail:'placements'}).toString();
  const aborted=Promise.reject(new DOMException('Synthetic cancelled priming','AbortError'));void aborted.catch(()=>{});
  Object.assign(page,{__tldrInitialSkyTransport:{key,startedAt:performance.now(),request:aborted}});
  await assert.rejects(getSkyFromApi(first.location,first.date,'placements'),{name:'AbortError'});
  assert.equal(calls.length,0,'Adopting an already cancelled transport cannot start another fetch.');
  globalThis.fetch=(async input=>{
    calls.push(String(input));return String(input).startsWith('/api/sky-reader?')
      ?new Response('{}',{status:503}):new Response(JSON.stringify({sky:first.placements}));
  }) as typeof fetch;
  const recovered=await getSkyFromApi(first.location,first.date,'placements');
  assert.deepEqual(calls.map(url=>new URL(url,'https://fixture.test').pathname),['/api/sky-reader','/api/sky']);
  assert.equal(recovered.positions.length,14,'Active pages retain the verified transient-service fallback.');
} finally {
  globalThis.fetch=originalFetch;
  for(const [key,value] of [['window',originalWindow],['Worker',originalWorker]] as const){
    if(value)Object.defineProperty(globalThis,key,value);else Reflect.deleteProperty(globalThis,key);
  }
}
console.log('PASS: actual Sky handler, three dates/two zones, direct Swiss positions, complete timing parity, input validation, exact-input coalescing, corrupt-response rejection and local fallback.');
