import assert from 'node:assert/strict';
import {calculateInitialSky,disposeInitialSkyWorker} from '../api/_lib/sky-reader-calculation';
import handler,{createSkyHandler} from '../api/sky';
import {isVerifiedSkySnapshot} from '../apps/web/src/services/verifiedSkyCache';
// @ts-ignore The actual shared renderer is built by the performance prerequisite.
import {renderInitialSkyReader} from '../server/initial-sky-reader/dist/initial-reader.mjs';
const articleHistoryFields=['priorTransitSign','priorTransitStart','priorTransitEnd','previousSignResidencyStart','previousSignResidencyEnd'] as const;
async function direct(url:string){let value:any;const response={statusCode:200,setHeader(){},end(body:string){value=JSON.parse(body);}};await handler({method:'GET',url} as any,response as any);return {status:response.statusCode,value};}
try{
 for(const [at,lat,lon,zone]of [['2026-10-23T16:00:00.000Z',40.7128,-74.006,'America/New_York'],['2026-10-24T22:50:00.000Z',40.7128,-74.006,'America/New_York'],['2026-03-27T00:00:00.000Z',35.6762,139.6503,'Asia/Tokyo'],['2026-11-01T06:30:00.000Z',40.7128,-74.006,'America/New_York']] as const){
  const query=new URLSearchParams({at,lat:String(lat),lon:String(lon),timeZone:zone,version:'tldrastro-calculation-v3',detail:'placements'});
  const url='/api/sky-reader?'+query;
  let ticks=0;const start=performance.now(),interval=setInterval(()=>ticks++,10);
  let selection:any;let selectedAt=0;
  const worker=await calculateInitialSky(url,sky=>{selection=sky;selectedAt=performance.now();});const elapsed=performance.now()-start;clearInterval(interval);
  const expected=await direct(url);
  assert.equal(worker.status,expected.status);
  assert.equal(worker.value.sky.placementHistoryDetail,'deferred');
  assert.equal(isVerifiedSkySnapshot(worker.value.sky),true);
  assert.equal(isVerifiedSkySnapshot({...worker.value.sky,calculationDetail:'full'}),false,'Deferred article history cannot claim full readiness.');
  assert(expected.value.sky.positions.some((p:any)=>articleHistoryFields.some(key=>key in p)),'The full fixture must exercise actual calculated article history.');
  const expectedList=structuredClone(expected.value);expectedList.sky.placementHistoryDetail='deferred';
  for(const position of expectedList.sky.positions)for(const field of articleHistoryFields)delete position[field];
  assert.deepEqual(worker.value,expectedList,'Only the five declared article-history fields are deferred; every position, current/residency window, station, shadow, event, provenance and other fact remains exact.');
  const before=await renderInitialSkyReader(expected.value.sky,[],[]),after=await renderInitialSkyReader(worker.value.sky,[],[]);
  assert.equal(before.length,14);assert(before.every((row:any)=>row.body.trim()));
  assert.deepEqual(after,before,'Every complete original paragraph, including station modifiers, is preserved byte-for-byte.');
  const full=await direct(url.replace('detail=placements','detail=full'));
  assert.equal(full.value.sky.placementHistoryDetail,undefined);
  assert.equal(full.value.sky.generatedAt,worker.value.sky.generatedAt);
  assert.deepEqual(full.value.sky.positions,expected.value.sky.positions,'Opening a full article restores every original history field for the same instant.');
  assert(selection && selectedAt < start+elapsed,'Source selection arrives before the complete calculation.');
  assert.deepEqual(JSON.parse(JSON.stringify(selection.moonEvent)),worker.value.sky.moonEvent,'Early lunation selection retains the exact serialized final event, date and selected zone.');
  for(const position of selection.positions){
    const complete=worker.value.sky.positions.find((row:any)=>row.planet===position.planet);
    for(const field of ['planet','sign','longitude','retrograde'])assert.deepEqual(position[field],complete[field],`${position.planet}/${field}: preliminary selection matches complete facts.`);
  }
  assert(elapsed<100||ticks>0,'The request event loop must remain available while Swiss work executes.');
 }
 const fullUrl='/api/sky?'+new URLSearchParams({at:'2026-10-23T16:00:00.000Z',lat:'40.7128',lon:'-74.006',timeZone:'America/New_York',version:'tldrastro-calculation-v3',detail:'full'});
 let guarded:any;await createSkyHandler({deferPlacementHistory:true})({method:'GET',url:fullUrl} as any,{setHeader(){},end(body:string){guarded=JSON.parse(body);}} as any);
 assert.deepEqual(guarded,(await direct(fullUrl)).value,'Even the list-configured handler must never defer history for a full request.');
 assert.equal((await calculateInitialSky('/api/sky-reader?at=invalid')).status,400);
 disposeInitialSkyWorker();
 const url='/api/sky-reader?'+new URLSearchParams({at:'2026-10-23T16:00:00.000Z',lat:'40.7128',lon:'-74.006',timeZone:'America/New_York',version:'tldrastro-calculation-v3',detail:'placements'});
 assert.equal((await calculateInitialSky(url)).status,200,'A disposed worker can be recreated for the next request.');
}finally{disposeInitialSkyWorker();}
console.log('PASS: complete 14-paragraph parity and every list fact across four instants/two zones/DST; only declared article history is deferred, full requests restore it at the exact instant, false full readiness is rejected, and worker I/O/recovery remains intact.');
