import assert from 'node:assert/strict';
// Independent equivalent of the SQL transport, used only by isolated fixtures.
export function applyCheckpointFixture(row:any,changes:any[]){
  const next=structuredClone(row);
  for(const change of changes){
    const path=change.path;assert(['source_snapshot','sections','body','facts','review_state','reviewed_at'].includes(path[0]));
    if(['review_state','reviewed_at'].includes(path[0])){assert.equal(path.length,1);assert.equal(change.op,'set');assert.equal(change.value,null);}
    let target=next;
    for(const key of path.slice(0,-1)){assert(target[key]&&typeof target[key]==='object');target=target[key];}
    const key=path.at(-1);
    if(change.op==='delete')delete target[key];
    else if(change.op==='append'){assert(Array.isArray(target[key]));target[key].push(...structuredClone(change.value));}
    else {assert.equal(change.op,'set');Object.defineProperty(target,key,{value:structuredClone(change.value),writable:true,enumerable:true,configurable:true});}
  }
  return next;
}
