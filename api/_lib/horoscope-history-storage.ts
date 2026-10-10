import {createHash} from 'node:crypto';
import {brotliCompressSync,brotliDecompressSync,constants} from 'node:zlib';

// These records are still complete JSON, losslessly encoded at the storage
// boundary. Keeping large nested history expanded in JSONB makes every lease,
// provider checkpoint and immutable audit write expand the entire history.
const fields=['rejections','failures','interruptions','lastInterrupted','readings','batches','candidateResolutions'];
const archiveKey='historyArchive';
const limit=128*1024*1024;
const storedRows=new WeakMap<object,any>();
const object=(v:any)=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const digest=(bytes:Buffer)=>createHash('sha256').update(bytes).digest('hex');

export function encodeWeeklyHistory(snapshot:any){
  const generation=snapshot?.horoscopeGeneration;
  if(!object(generation))return snapshot;
  if(Object.hasOwn(generation,archiveKey))throw new Error('Weekly history must be decoded before saving.');
  const history=Object.fromEntries(fields.filter(key=>Object.hasOwn(generation,key)).map(key=>[key,generation[key]]));
  const bytes=Buffer.from(JSON.stringify(history));
  if(bytes.length<128*1024)return snapshot;
  if(bytes.length>limit)throw new Error('Weekly history exceeds the supported storage size. Existing history is preserved.');
  const data=brotliCompressSync(bytes,{params:{[constants.BROTLI_PARAM_QUALITY]:4,[constants.BROTLI_PARAM_LGWIN]:24}}).toString('base64');
  if(data.length>=bytes.length)return snapshot;
  return {...snapshot,horoscopeGeneration:{
    ...Object.fromEntries(Object.entries(generation).filter(([key])=>!fields.includes(key))),
    [archiveKey]:{version:1,codec:'br-json',byteLength:bytes.length,sha256:digest(bytes),data}
  }};
}

export function decodeWeeklyHistoryRow<T>(row:T):T{
  const saved:any=row,generation=saved?.source_snapshot?.horoscopeGeneration;
  if(!object(generation)||!Object.hasOwn(generation,archiveKey))return row;
  const archive=generation[archiveKey];
  if(!object(archive)||archive.version!==1||archive.codec!=='br-json'
    ||!Number.isSafeInteger(archive.byteLength)||archive.byteLength<1||archive.byteLength>limit
    ||typeof archive.sha256!=='string'||!/^[a-f0-9]{64}$/u.test(archive.sha256)
    ||typeof archive.data!=='string'||archive.data.length>limit*4/3
    ||archive.data.length%4!==0||!/^[A-Za-z0-9+/]*={0,2}$/u.test(archive.data)){
    throw new Error('Weekly history archive is invalid. Existing history is preserved.');
  }
  const bytes=brotliDecompressSync(Buffer.from(archive.data,'base64'),{maxOutputLength:archive.byteLength});
  if(bytes.length!==archive.byteLength||digest(bytes)!==archive.sha256)throw new Error('Weekly history integrity check failed.');
  const history=JSON.parse(bytes.toString('utf8'));
  if(!object(history)||Object.keys(history).some(key=>!fields.includes(key)||Object.hasOwn(generation,key)))throw new Error('Weekly history fields conflict.');
  const expanded={...generation,...history};delete expanded[archiveKey];
  const decoded={...saved,source_snapshot:{...saved.source_snapshot,horoscopeGeneration:expanded}};
  storedRows.set(decoded,saved);
  return decoded;
}

export const weeklyStoredRow=(row:any)=>storedRows.get(row)??row;
export function retainWeeklyStorageRow(row:any,stored:any){storedRows.set(row,stored);return row;}
