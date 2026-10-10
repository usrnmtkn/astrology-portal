import {horoscopeRejectionPassage} from '../../apps/web/src/content/horoscopeEditions.mjs';

const pick=(value:any,keys:string[])=>value?Object.fromEntries(keys.filter(key=>value[key]!==undefined).map(key=>[key,value[key]])):value;
const operation=(value:any)=>pick(value,['id','sign','workflow','phase','state','startedAt','responseId','requestHash','planHash','config','writerModel','reviewVersion','startupDiagnostic']);
const receipt=(value:any)=>value?{...pick(value,['operationId','responseId','config','lint','completedAt','bodyHash','rhetoricalReview']),hasOwnerEvidence:Boolean(value.ownerEvidence)}:value;
const failure=(value:any)=>value?{...pick(value,['code','message','diagnostic','candidate','review','failedAt']),operation:operation(value.operation),receipt:receipt(value.receipt)}:value;
const map=(values:any,project:(v:any)=>any)=>Object.fromEntries(Object.entries(values??{}).map(([key,value])=>[key,project(value)]));
/** A transport view of the decoded row. Complete requests, receipts and history
 * remain in lossless server storage. Editor writes never round-trip this view. */
export function horoscopeEditorRow(row:any){
  if(row?.sections?.horoscopeEdition?.window?.period!=='weekly')return row;
  const snapshot=row.source_snapshot??{},generation=snapshot.horoscopeGeneration;
  return {...row,source_snapshot:{...pick(snapshot,['horoscopeOutlines','studioWritingProfile','editorialImport','horoscopeWriterChoice']),
    ...(generation?{horoscopeGeneration:{active:operation(generation.active),batch:generation.batch,
      lastError:failure(generation.lastError),candidateHolds:map(generation.candidateHolds,failure),
      heldRequests:map(generation.heldRequests,operation),readings:map(generation.readings,receipt),
      rejections:(generation.rejections??[]).map((entry:any)=>({...pick(entry,['id','scope','reason','rejectedAt']),
        passages:entry.passages.map((p:any)=>horoscopeRejectionPassage(entry,p.sign)??p)}))}}:{})}};
}
export function horoscopeEditorPayload(payload:any){
  return payload&&Array.isArray(payload.rows)?{...payload,rows:payload.rows.map(horoscopeEditorRow)}:payload;
}
