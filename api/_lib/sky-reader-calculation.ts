import { Worker } from 'node:worker_threads';
import type { SkySnapshot } from '../../apps/web/src/types.js';

type Result = { status: number; headers: Record<string,string>; value: any };
let worker: Worker | null = null;
let nextId = 0;
const pending = new Map<number,{resolve:(value:Result)=>void;reject:(error:Error)=>void;timer:ReturnType<typeof setTimeout>;onSelection?: (sky:SkySnapshot)=>void}>();
function stop(error:Error) {
  const current=worker;worker=null;
  for(const entry of pending.values()){clearTimeout(entry.timer);entry.reject(error);}pending.clear();
  void current?.terminate();
}
/** Keep Swiss CPU work off the request's I/O thread. The worker executes the
 * shared Sky handler with its declared list scope and exact inputs, carrying
 * no owner credentials. Full articles retain the original complete scope.
 */
export async function calculateInitialSky(url:string,onSelection?: (sky:SkySnapshot)=>void):Promise<Result> {
  if(!worker){
    const current=new Worker(new URL('../../server/initial-sky-reader/dist/sky-worker.mjs',import.meta.url),{env:{NODE_ENV:process.env.NODE_ENV||'production'},execArgv:[]});
    worker=current;
    current.on('message',(message:any)=>{
      const entry=pending.get(message.id);if(!entry)return;
      if(message.selection){entry.onSelection?.(message.selection);return;}
      pending.delete(message.id);clearTimeout(entry.timer);
      if(message.error)entry.reject(new Error('Sky worker unavailable.'));else entry.resolve(message.result);
    });
    current.on('error',()=>{if(worker===current)stop(new Error('Sky worker unavailable.'));});
    current.on('exit',()=>{if(worker===current)stop(new Error('Sky worker stopped.'));});
    current.unref();
  }
  const id=++nextId;
  return new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>stop(new Error('Sky worker calculation timed out.')),4000);
    pending.set(id,{resolve,reject,timer,onSelection});
    try{worker!.postMessage({id,url,prefetch:Boolean(onSelection)});}catch{stop(new Error('Sky worker unavailable.'));}
  });
}
/** Used by isolated tests; normal functions let their worker freeze with them. */
export function disposeInitialSkyWorker(){stop(new Error('Sky worker disposed.'));}
