import {adminFetchJson,adminStorageRows,AdminHttpError} from './admin-http.js';
import {studioStorage} from './sky-studio-sources.js';
import {studioFeedbackEnabled} from './studio-memory-feedback.js';
import {selectExplicitWritingFeedback,validateExplicitWritingFeedback,writingFeedbackKeys,hydrateExplicitWritingFeedback} from '../../src/astro-writing/explicitWritingFeedback.mjs';

export function ingressWritingFeedbackTarget(templateKey:string) {
  return {contentKey:templateKey,surface:'sky',eventType:'sky-ingress-essay'};
}

export async function explicitWritingFeedbackRows() {
  const {url,headers}=studioStorage();
  const response=await adminFetchJson(url.replace(/generated_interpretations$/u,'rpc/studio_memory_active_snapshot'),{method:'POST',headers,body:'{}'});
  if(!response.ok)throw new AdminHttpError(503,'Current owner writing feedback could not load. No new writer call was started.');
  const envelope=adminStorageRows<any>(response.payload);
  if(envelope.length!==1||!Array.isArray(envelope[0]?.snapshot?.writingFeedback))throw new AdminHttpError(503,'Current owner writing feedback is incomplete.');
  try{return validateExplicitWritingFeedback(envelope[0].snapshot.writingFeedback);}catch{throw new AdminHttpError(503,'Current owner writing feedback failed its integrity check.');}
}

export async function loadExplicitWritingFeedback(target:{contentKey?:string;surface?:string;period?:string;eventType?:string}) {
  const enabled=studioFeedbackEnabled();
  try{return selectExplicitWritingFeedback(enabled?await explicitWritingFeedbackRows():[],writingFeedbackKeys(target),{enabled});}
  catch(error){if(error instanceof AdminHttpError)throw error;throw new AdminHttpError(503,'Current owner writing feedback could not be prepared.');}
}

export async function hydrateWritingFeedbackRequest(request:any,receipt:any) {
  if(!receipt?.selected?.length)return request;
  const {url,headers}=studioStorage();
  const ids=receipt.selected.map((ref:any)=>ref.id);
  if(ids.some((id:any)=>typeof id!=='string'||!/^[-a-zA-Z0-9]+$/u.test(id)))throw new AdminHttpError(503,'Saved writing feedback identity is invalid.');
  const params=new URLSearchParams({id:`in.(${ids.join(',')})`,select:'*',limit:'101'});
  const response=await adminFetchJson(`${url.replace(/generated_interpretations$/u,'studio_writing_feedback')}?${params}`,{headers});
  if(!response.ok)throw new AdminHttpError(503,'Saved owner writing feedback is unavailable. No new writer call was started.');
  try{return hydrateExplicitWritingFeedback(request,receipt,adminStorageRows<any>(response.payload));}
  catch{throw new AdminHttpError(503,'Saved owner writing feedback could not be verified. No new writer call was started.');}
}
