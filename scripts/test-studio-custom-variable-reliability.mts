import assert from 'node:assert/strict';
import {customVariableRequest} from '../apps/admin/src/studioCustomVariableClient.ts';
const originalFetch=globalThis.fetch, originalTimeout=globalThis.setTimeout, originalClear=globalThis.clearTimeout;
try {
 for (const method of ['GET','POST'] as const) {
  const caller=new AbortController(); let expire:(()=>void)|undefined; let calls=0;
  globalThis.setTimeout=((fn:()=>void,ms:number)=>{assert.equal(ms,45000);expire=fn;return 1;}) as any;
  globalThis.clearTimeout=(()=>{}) as any;
  globalThis.fetch=(async(_path,options)=>{calls++;return new Promise<Response>((_resolve,reject)=>options!.signal!.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError'))));}) as typeof fetch;
  const pending=customVariableRequest('fixture',method,undefined,caller.signal);
  const rejection=assert.rejects(pending,method==='GET'?/Loading content timed out.*no changes were submitted/:/save has not been confirmed/);
  try {assert.ok(expire,'Caller cancellation must not disable the request deadline.'); expire(); await rejection;assert.equal(calls,1,'A timed-out write must not be replayed.');}
  finally {caller.abort();await rejection.catch(()=>{});}
 }
 console.log('PASS custom-variable read/write deadlines with caller cancellation; accurate read warning and no write replay.');
} finally {globalThis.fetch=originalFetch;globalThis.setTimeout=originalTimeout;globalThis.clearTimeout=originalClear;}
