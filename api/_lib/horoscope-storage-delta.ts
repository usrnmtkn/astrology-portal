import {isDeepStrictEqual} from 'node:util';

export type HoroscopeStorageChange={path:string[];op:'set'|'delete'|'append';value?:unknown};
/** Transport changes, never compressed prose. Existing evidence/history stays
 * byte-for-byte in storage instead of crossing the network on every poll/save. */
export function horoscopeStorageChanges(previous:any,patch:any):HoroscopeStorageChange[]{
  const changes:HoroscopeStorageChange[]=[];
  const object=(v:any)=>v!==null&&typeof v==='object'&&!Array.isArray(v);
  const visit=(before:any,after:any,path:string[])=>{
    if(isDeepStrictEqual(before,after))return;
    if(object(before)&&object(after)){
      for(const key of Object.keys(before))if(!Object.hasOwn(after,key))changes.push({path:[...path,key],op:'delete'});
      for(const key of Object.keys(after))visit(before[key],after[key],[...path,key]);
    }else if(Array.isArray(before)&&Array.isArray(after)&&after.length>before.length&&before.every((v,i)=>isDeepStrictEqual(v,after[i]))){
      changes.push({path,op:'append',value:after.slice(before.length)});
    }else changes.push({path,op:'set',value:after});
  };
  for(const key of Object.keys(patch)){
    if(key==='status'&&patch.status==='DRAFT')continue;
    if(!['source_snapshot','sections','body'].includes(key))throw new Error('unsupported_horoscope_checkpoint_field');
    visit(previous[key],patch[key],[key]);
  }
  return changes;
}
