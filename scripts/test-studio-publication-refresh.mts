import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createStudioPublicationRefresh, type StudioPublicationRefreshState } from '../apps/admin/src/studioPublicationRefresh.ts';
const key='education/astro-101/chapter/synthetic-status';
const notice={contentKey:key,published:true,updatedAt:'2030-01-01T00:00:00Z'};
const turn=()=>new Promise<void>(resolve=>setImmediate(resolve));
function deferred(){let resolve!:()=>void;let reject!:(error:Error)=>void;const promise=new Promise<void>((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};}
function fixture(){
 const reads:ReturnType<typeof deferred>[]=[];const states:StudioPublicationRefreshState[]=[];let online=true;
 const controller=createStudioPublicationRefresh(key,{refresh:()=>{const d=deferred();reads.push(d);return d.promise;},online:()=>online,onState:state=>states.push(state)});
 return {controller,reads,states,setOnline:(value:boolean)=>{online=value;}};
}
test('unrelated notices do not read the full ledger',async()=>{
 const f=fixture();f.controller.notice({...notice,contentKey:'unrelated-key'});assert.equal(f.reads.length,0);
 f.controller.notice(notice);assert.deepEqual(f.states,['pending']);f.reads[0].resolve();await turn();assert.equal(f.states.at(-1),'idle');f.controller.dispose();
});
test('older completion cannot clear newer pending; bursts coalesce into one follow-up',async()=>{
 const f=fixture();f.controller.refresh();f.controller.notice(notice);f.controller.notice({...notice,updatedAt:'2030-01-02T00:00:00Z'});
 assert.equal(f.reads.length,1);f.reads[0].resolve();await turn();assert.equal(f.reads.length,2);assert.ok(!f.states.includes('idle'));assert.equal(f.states.at(-1),'pending');
 f.reads[1].resolve();await turn();assert.equal(f.states.at(-1),'idle');assert.equal(f.reads.length,2);f.controller.dispose();
});
test('failed verified read stays uncertain until an explicit bounded retry',async()=>{
 const f=fixture();f.setOnline(false);f.controller.refresh();f.reads[0].resolve();await turn();assert.equal(f.states.at(-1),'error');await turn();assert.equal(f.reads.length,1);
 f.controller.notice({...notice,contentKey:'unrelated-key'});assert.equal(f.reads.length,1);
 f.controller.retry();f.controller.retry();assert.equal(f.reads.length,2);f.setOnline(true);f.reads[1].resolve();await turn();assert.equal(f.states.at(-1),'idle');f.controller.dispose();
});
test('a rejected refresh is not publication confirmation',async()=>{
 const f=fixture();f.controller.refresh();f.reads[0].reject(new Error('Synthetic unavailable ledger'));await turn();assert.equal(f.states.at(-1),'error');assert.equal(f.reads.length,1);f.controller.dispose();
});
test('disposed editor ignores late completion',async()=>{
 const f=fixture();f.controller.refresh();f.controller.dispose();f.reads[0].resolve();await turn();assert.deepEqual(f.states,['pending']);f.controller.notice(notice);f.controller.retry();assert.equal(f.reads.length,1);
});
test('verification timeout stays uncertain even when its old read completes later',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});const f=fixture();f.controller.refresh();t.mock.timers.tick(20_000);await turn();assert.equal(f.states.at(-1),'error');
 f.reads[0].resolve();await turn();assert.equal(f.states.at(-1),'error');assert.equal(f.reads.length,1);
 f.controller.retry();assert.equal(f.reads.length,2);f.reads[1].resolve();await turn();assert.equal(f.states.at(-1),'idle');f.controller.dispose();
});
