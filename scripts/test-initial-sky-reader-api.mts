import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {createServer} from 'vite';
import {resolve} from 'node:path';
import {readFile} from 'node:fs/promises';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {getSkyFromApi} from '../apps/web/src/services/skyApi';
import { createInitialSkyReaderHandler } from '../api/sky-reader';
import { acceptInitialSkyReader, initialSkyReaderAvailable, initialSkyReaderKey, initialSkyReaderPreview, initialSkyReaderRows } from '../apps/web/src/services/initialSkyReader';
import { installContentPublications, publicationLedgerReady } from '../apps/web/src/content/contentPublicationState';
import { skyNodeDisplayPositions } from '../apps/web/src/features/sky/skyHelpers';
import { canonicalPublicationLedger, publicationLedgerTag } from '../apps/web/src/services/publicationLedgerTransport';
const query = new URLSearchParams({ at: '2026-10-23T16:00:00.000Z', lat: '40.7128', lon: '-74.006', timeZone: 'America/New_York', version: 'tldrastro-calculation-v3', detail: 'placements' });
const envKeys = ['SUPABASE_URL','SUPABASE_PUBLISHABLE_KEY','SUPABASE_ANON_KEY','VITE_SUPABASE_URL','VITE_SUPABASE_PUBLISHABLE_KEY','VITE_SUPABASE_ANON_KEY'];
const saved = envKeys.map(key => process.env[key]);
const originalFetch = globalThis.fetch;
const stamp = '2026-10-23T15:00:00.000000Z';
const marker = { content_key: '__content-publication-ledger/v1', state: 'live', revision: 1, row_id: null, row_updated_at: null, updated_at: stamp };
const publication = { ...marker, content_key: 'fallback-vocab/planet-topic/sun', row_id: 'synthetic-source', row_updated_at: stamp };
let ledger: any[] = [marker], failLedger = false, failRows = false, rowVersion = stamp, held: Promise<void> | null = null;
const calls: any[] = [];
const handler = createInitialSkyReaderHandler(async query => {
  calls.push(query); await held;
  return { status: failRows ? 503 : 200, headers: {}, value: { schema: 'content-reader-row-v1', nextCursor: null,
    rows: query.keys.includes(publication.content_key) ? [{ id: publication.row_id, content_key: publication.content_key, updated_at: rowVersion, target_date: null,
      provider: 'synthetic-test', body: 'Complete synthetic vocabulary unit.', title: null, surface: 'modifier', review_status: 'approved' }] : [] } };
});
async function invoke(url = `/api/sky-reader?${query}`, method = 'GET', use = handler) {
  let body: any; const headers: Record<string,string> = {};
  const response = { statusCode: 200, setHeader(k:string,v:string){headers[k]=v;},end(value:string){body=JSON.parse(value);} };
  await use({url,method,headers:{authorization:'Bearer synthetic-owner-token',cookie:'private=never-forward'}} as any,response as any);
  return {status:response.statusCode,headers,body};
}
const sign = async (sky:any,value:any) => {
  value.publications = canonicalPublicationLedger(value.publications);
  value.publicationTag = await publicationLedgerTag(value.publications);
  value.digest = createHash('sha256').update(JSON.stringify([sky,value.previews,value.publications,value.sources])).digest('hex');
  return value;
};
try {
  for (const key of envKeys) delete process.env[key];
  process.env.SUPABASE_URL = 'https://initial-reader-fixture.supabase.test';
  process.env.SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_synthetic_initial_reader';
  globalThis.fetch = async (input:any,options:any) => {
    const url = new URL(String(input));
    assert.equal(url.origin,process.env.SUPABASE_URL);
    assert.equal(url.pathname,'/rest/v1/content_publications');
    assert.equal(options.headers.authorization,undefined,'Owner bearer never reaches public publication reads.');
    assert.equal(options.headers.cookie,undefined);
    if(failLedger)return Response.json({}, {status:503});
    const filters=url.searchParams.getAll('content_key');
    return Response.json(ledger.filter(row=>filters.every(filter=>{
      const [op,...rest]=filter.split('.'),key=rest.join('.');
      return op==='gte'?row.content_key>=key:op==='lt'?row.content_key<key:row.content_key>key;
    })));
  };
  assert.equal((await invoke(undefined,'POST')).status,405);
  for(const url of ['/api/sky-reader',`/api/sky-reader?${query.toString().replace('lat=40.7128','lat=91')}`,`/api/sky-reader?${query.toString().replace('placements','full')}`])assert.equal((await invoke(url)).status,400);
  const first=await invoke(); assert.equal(first.status,200);
  const {sky,initialReader}=first.body;
  assert(initialReader,'Actual shared server renderer must produce all complete placement previews.');
  assert.equal(initialReader.previews.length,14);assert(initialReader.previews.every((row:any)=>row.body.trim()));
  assert.equal(first.headers['cache-control'],'private, no-store');
  assert(first.headers['server-timing'].includes('render;dur='));
  assert.equal(first.headers['x-sky-calculation-mode'],'worker');
  assert.equal(sky.calculationDetail,'placements');assert.equal(sky.positions.length,14);
  assert.equal(await acceptInitialSkyReader(sky,initialReader),true);
  installContentPublications(initialReader.publications,'complete-sky-list');
  assert.equal(initialSkyReaderAvailable(initialSkyReaderKey(sky)),true);
  assert.equal(publicationLedgerReady(),false,'Prepared list does not establish full publication readiness.');
  const context={displayPositions:skyNodeDisplayPositions(sky.positions),aspects:sky.aspects,generatedAt:sky.generatedAt,locationLatitude:sky.location.latitude,moonEvent:sky.moonEvent};
  const sun=initialReader.previews.find((row:any)=>row.planet==='Sun').body;
  assert.equal(initialSkyReaderPreview('Sun',context),sun);
  const oldWindow=(globalThis as any).window,ledgerFetch=globalThis.fetch;
  try{
    let network=0;globalThis.fetch=async()=>{network++;return Response.json({sky});};
    const location={...sky.location,label:'Synthetic selection'},date=new Date(sky.generatedAt);
    const key=new URLSearchParams({at:date.toISOString(),lat:String(location.latitude),lon:String(location.longitude),timeZone:location.timeZone,version:'tldrastro-calculation-v3',detail:'placements'}).toString();
    const prime=(request:Promise<unknown>,startedAt=performance.now())=>(globalThis as any).window={__tldrInitialSkyTransport:{key,request,startedAt}};
    prime(Promise.resolve({sky}));
    assert.deepEqual((await getSkyFromApi(location,date,'placements')).positions,sky.positions);assert.equal(network,0,'The real client adopts the exact inline request without a duplicate fetch.');
    assert.equal((globalThis as any).window.__tldrInitialSkyTransport,undefined);
    const wrong=structuredClone(sky);wrong.location.longitude=0;prime(Promise.resolve({sky:wrong}));
    await assert.rejects(getSkyFromApi(location,date,'placements'),/incomplete or mismatched/,'Primed payloads still undergo the full real-client fact validation.');
    prime(new Promise(()=>{}),performance.now()-7900);const before=performance.now();
    await assert.rejects(getSkyFromApi(location,date,'placements'));
    assert(performance.now()-before<1000,'Inline elapsed time is deducted from the unchanged eight-second total deadline.');assert.equal(network,0);
  }finally{globalThis.fetch=ledgerFetch;if(oldWindow===undefined)delete (globalThis as any).window;else (globalThis as any).window=oldWindow;}
  const vite=await createServer({root:resolve('apps/web'),appType:'custom',logLevel:'silent',server:{middlewareMode:true}});
  try{
    const widget=await vite.ssrLoadModule('/src/features/sky/PublishedSkySummary.tsx');
    const cache=await vite.ssrLoadModule('/src/services/initialSkyReader.ts');
    const proof=await vite.ssrLoadModule('/src/services/contentPublications.ts');
    const state=await vite.ssrLoadModule('/src/content/contentPublicationState.ts');
    const sunPosition=sky.positions.find((p:any)=>p.planet==='Sun'),moonPosition=sky.positions.find((p:any)=>p.planet==='Moon');
    const render=(factsReady=true)=>renderToStaticMarkup(createElement(widget.PublishedSkySummary,{facts:{sun:sunPosition,moon:moonPosition},events:[],factsReady,factsError:false,onRetryFacts(){},children:(parts:any[])=>createElement('p',null,parts.map(part=>part.text).join(''))}));
    assert.match(render(),/aria-busy="true"/,'No prepared proof means normal source loading remains required.');
    assert.equal(await cache.acceptInitialSkyReader(sky,initialReader),true);proof.admitInitialSkyReaderPublications();
    const markup=render();assert.match(markup,/aria-busy="false"/,'The real component renders complete prepared sources without waiting for an effect.');
    assert(markup.includes('Sun in Scorpio'));assert(markup.includes('Moon in Pisces'));assert(markup.length>200);assert(!markup.includes('Loading the daily sky summary'));
    assert.match(render(false),/aria-busy="true"/,'Prepared prose cannot replace unavailable current facts.');
    state.installContentPublications([publication],'complete-sky-list');
    assert.match(render(),/aria-busy="true"/,'Changed publication proof invalidates the synchronous prepared source path.');
  }finally{await vite.close();}
  assert.equal(initialSkyReaderPreview('Sun',{...context,generatedAt:'2026-10-24T16:00:00.000Z'}),null);
  assert.equal(initialSkyReaderPreview('Sun',{...context,locationLatitude:35}),null);
  assert.equal(initialSkyReaderAvailable(initialSkyReaderKey({...sky,location:{...sky.location,longitude:0}})),false);
  const tampered=structuredClone(initialReader);tampered.previews[0].body+=' altered';
  assert.equal(await acceptInitialSkyReader(sky,tampered),false,'Every displayed character is bound to exact facts and proof.');
  const duplicate=structuredClone(initialReader);duplicate.previews[1]=duplicate.previews[0];
  assert.equal(await acceptInitialSkyReader(sky,await sign(sky,duplicate)),false);
  const anotherSky=structuredClone(sky);anotherSky.generatedAt='2026-10-24T16:00:00.000Z';
  assert.equal(await acceptInitialSkyReader(anotherSky,initialReader),false);
  ledger=[marker,publication];
  const current=await invoke(); assert(current.body.initialReader);
  assert(current.headers['server-timing'].indexOf('shared_rows;')<current.headers['server-timing'].indexOf('sky;'),'Placement-independent source reads overlap the exact calculation worker.');
  assert.deepEqual(calls.at(-1),{ids:[publication.row_id],keys:[publication.content_key]});
  assert.equal(await acceptInitialSkyReader(current.body.sky,current.body.initialReader),true);
  installContentPublications(current.body.initialReader.publications,'complete-sky-list');
  assert.equal(initialSkyReaderRows({keys:[publication.content_key]})?.[0].body,'Complete synthetic vocabulary unit.');
  for(const q of [{ids:[publication.row_id]},{prefix:'fallback-vocab/'},{latestVersion:true},{surfaces:['sky']},{keys:['authored/private/synthetic']},{keys:[publication.content_key],targetDate:'2026-10-23'}])assert.equal(initialSkyReaderRows(q),undefined);
  installContentPublications([{...publication,state:'retired',row_id:null,revision:2}],'complete-sky-list');
  assert.equal(initialSkyReaderAvailable(),false,'Retirement invalidates every cached preview and projected source.');
  assert.equal(initialSkyReaderPreview('Sun',context),null);assert.equal(initialSkyReaderRows({keys:[publication.content_key]}),undefined);
  const selectedPublication={...publication,content_key:'fallback-hook/sky-placement-hook/sun/scorpio',row_id:'synthetic-selected'};
  const source=JSON.parse(await readFile('apps/web/src/content/fallbackArchitectureV3/bundled-sky-placement-rows-v3.json','utf8')).hookRows.find((row:any)=>row.contentKey===selectedPublication.content_key);
  assert(source);
  ledger=[marker,selectedPublication];
  let selectedReads=0;
  const prefetched=await invoke(undefined,'GET',createInitialSkyReaderHandler(async query=>{
    assert.deepEqual(query,{ids:[selectedPublication.row_id],keys:[selectedPublication.content_key]});selectedReads++;
    return {status:200,headers:{},value:{schema:'content-reader-row-v1',nextCursor:null,rows:[{id:selectedPublication.row_id,content_key:selectedPublication.content_key,updated_at:stamp,target_date:null,provider:'tldrastro-fallback-architecture-v3',body:source.body_you,sections:{packageRecord:source},review_status:'approved',surface:'sky'}]}};
  }));
  assert(prefetched.body.initialReader);assert.equal(selectedReads,1,'Selected public rows are fetched once, then reused after complete fact validation.');
  assert.deepEqual(prefetched.body.sky,sky,'Prefetch never substitutes preliminary positions for complete verified facts.');
  const timing=prefetched.headers['server-timing'];
  assert(timing.indexOf('selected_rows;')<timing.indexOf('sky;'),'The actual selected source read overlaps the unchanged complete calculation.');
  ledger=[marker,publication];
  rowVersion='2026-10-23T15:01:00.000000Z';assert.equal((await invoke()).body.initialReader,null,'A source race cannot serve stale prepared prose.');rowVersion=stamp;
  failRows=true;const rowFailure=await invoke();assert.equal(rowFailure.body.initialReader,null);assert.deepEqual(rowFailure.body.sky,sky);failRows=false;
  failLedger=true;assert.equal((await invoke()).body.initialReader,null);failLedger=false;
  let release!:()=>void;held=new Promise(resolve=>{release=resolve;});
  const start=performance.now();const timeout=await invoke(undefined,'GET',createInitialSkyReaderHandler(async()=>{await held;return {status:503,headers:{},value:{}};},50));
  assert.equal(timeout.body.initialReader,null);assert.deepEqual(timeout.body.sky,sky);assert(performance.now()-start<2000,'Optional stalled assembly returns facts promptly.');release();held=null;
} finally {
  globalThis.fetch=originalFetch;
  envKeys.forEach((key,index)=>saved[index]===undefined?delete process.env[key]:process.env[key]=saved[index]);
}
console.log('PASS: actual initial-reader API/renderer, complete 14 previews, exact facts/digest binding, strict inputs, public credential boundary, projected row reuse, date/location isolation, retirement/race rejection, no full readiness and bounded failure recovery.');
