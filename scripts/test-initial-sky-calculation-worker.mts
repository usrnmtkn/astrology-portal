import assert from 'node:assert/strict';
import {calculateInitialSky,disposeInitialSkyWorker} from '../api/_lib/sky-reader-calculation';
import handler from '../api/sky';
async function direct(url:string){let value:any;const response={statusCode:200,setHeader(){},end(body:string){value=JSON.parse(body);}};await handler({method:'GET',url} as any,response as any);return {status:response.statusCode,value};}
try{
 for(const [at,lat,lon,zone]of [['2026-10-23T16:00:00.000Z',40.7128,-74.006,'America/New_York'],['2026-03-27T00:00:00.000Z',35.6762,139.6503,'Asia/Tokyo'],['2026-11-01T06:30:00.000Z',40.7128,-74.006,'America/New_York']] as const){
  const query=new URLSearchParams({at,lat:String(lat),lon:String(lon),timeZone:zone,version:'tldrastro-calculation-v3',detail:'placements'});
  const url='/api/sky-reader?'+query;
  let ticks=0;const start=performance.now(),interval=setInterval(()=>ticks++,10);
  const worker=await calculateInitialSky(url);const elapsed=performance.now()-start;clearInterval(interval);
  const expected=await direct(url);
  assert.equal(worker.status,expected.status);assert.deepEqual(worker.value,expected.value,'Every calculated position, motion/window, event, provenance and fact matches the unchanged handler.');
  assert(elapsed<100||ticks>0,'The request event loop must remain available while Swiss work executes.');
 }
 assert.equal((await calculateInitialSky('/api/sky-reader?at=invalid')).status,400);
 disposeInitialSkyWorker();
 const url='/api/sky-reader?'+new URLSearchParams({at:'2026-10-23T16:00:00.000Z',lat:'40.7128',lon:'-74.006',timeZone:'America/New_York',version:'tldrastro-calculation-v3',detail:'placements'});
 assert.equal((await calculateInitialSky(url)).status,200,'A disposed worker can be recreated for the next request.');
}finally{disposeInitialSkyWorker();}
console.log('PASS: actual bundled Node worker preserves every unchanged Sky fact across three instants/two zones/DST, releases the request I/O thread, rejects invalid inputs and recreates cleanly.');
