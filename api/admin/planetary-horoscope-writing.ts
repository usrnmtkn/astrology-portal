import type {IncomingMessage,ServerResponse} from 'node:http';
import {randomUUID} from 'node:crypto';
import {requireContentAdmin} from '../_lib/admin-auth.js';
import {AdminHttpError,adminErrorStatus,adminFetchJson,adminStorageRows,readAdminJsonBody,sendAdminJson,sendAdminMethodNotAllowed} from '../_lib/admin-http.js';
import {studioStorage} from '../_lib/sky-studio-sources.js';
import {loadLocalWebEnv} from '../_lib/local-env.js';
import {calculatePlanetaryEvent,planetaryReferenceInstant,signedPlanetaryEvent,assertSignedPlanetaryEvent} from '../_lib/planetary-horoscope-facts.js';
import {loadExplicitWritingFeedback} from '../_lib/studio-explicit-writing-feedback.js';
import {preparePlanetaryHoroscopeWriting,planetaryWritingHash,PLANETARY_WRITING_VERSION} from '../../src/astro-writing/planetaryHoroscopeWriting.mjs';
import responses from '../../src/astro-writing/openAIResponses.cjs';
import {PLANETARY_HOROSCOPE_PREFIX,PLANETARY_DISPATCH_RECOVERY_DELAY_MS,planetaryEventKey,planetaryEventTitle,emptyPlanetaryReadings,planetaryReadingsBody,validatePlanetaryReadings,assertPlanetaryHoroscopeRow,horoscopeCanonicalJson} from '../../src/shared/planetaryHoroscopes.js';
import {horoscopeProviderDiagnostic} from '../_lib/horoscope-provider-result.js';
import {validatePlanetaryReading} from '../../src/astro-writing/planetaryHoroscopeValidation.mjs';
import {inspectPlanetaryWriting} from '../_lib/planetary-horoscope-private-record.js';

loadLocalWebEnv();
export const maxDuration=300;
const version=(previous:string)=>new Date(Math.max(Date.now(),Date.parse(previous)+1)).toISOString();
const generation=(row:any)=>row.source_snapshot?.planetaryGeneration??{};
export function planetaryEditorRow(row:any) {
  const g=generation(row),{voiceSources:_,...preview}=g.plan?.preview??{};
  return {...row,source_snapshot:{targetRowId:row.source_snapshot?.targetRowId,targetRowUpdatedAt:row.source_snapshot?.targetRowUpdatedAt,
    targetContentKey:row.source_snapshot?.targetContentKey,planetaryGeneration:{direction:g.direction,plan:g.plan?{planHash:g.plan.planHash,preview}:null,
      active:g.active?{id:g.active.id,state:g.active.state,startedAt:g.active.startedAt,responseId:g.active.responseId}:null,
      lastError:g.lastError,completed:g.completed,historyCount:g.history?.length??0}}};
}
export default async function handler(req:IncomingMessage,res:ServerResponse) {
  if(!['GET','POST'].includes(req.method??''))return sendAdminMethodNotAllowed(res,['GET','POST']);
  if(!await requireContentAdmin(req,res))return;
  try{
    const {url,headers}=studioStorage();
    const read=async(params:Record<string,string>)=>{
      const result=await adminFetchJson(`${url}?${new URLSearchParams({select:'*',...params})}`,{headers},30000);
      if(!result.ok)throw new AdminHttpError(502,'Saved planetary horoscopes could not load.');
      return adminStorageRows<any>(result.payload);
    };
    if(req.method==='GET'){
      const query=new URL(req.url??'/','http://studio.invalid').searchParams;
      if(query.has('planet')){
        const timeZone=query.get('timeZone')??'America/New_York';
        const event=await calculatePlanetaryEvent(query.get('planet')!,planetaryReferenceInstant(query.get('date')??'',timeZone),timeZone);
        return sendAdminJson(res,200,{ok:true,event});
      }
      const id=query.get('id');
      const rows=await read({content_key:`like.${PLANETARY_HOROSCOPE_PREFIX}*`,...(id?{id:`eq.${id}`}:{status:'neq.ARCHIVED',select:'id,content_key,headline,status,mode,event_type,facts,updated_at'}),order:'updated_at.desc',limit:id?'1':'60'});
      return sendAdminJson(res,200,{ok:true,rows:rows.map(row=>id?planetaryEditorRow(row):{...row,inventory_only:true})});
    }
    const input=await readAdminJsonBody<Record<string,any>>(req,32000);
    const action=input.action;
    if(!['open','prepare','generate','poll','release','inspect'].includes(action)||Object.keys(input).some(k=>!['action','planet','date','timeZone','id','expectedUpdatedAt','direction','approvedPlanHash','acknowledgeUnknownOutcome'].includes(k)))throw new AdminHttpError(400,'Choose a planetary horoscope writing action.');
    if(input.direction!==undefined&&(typeof input.direction!=='string'||input.direction.length>10000))throw new AdminHttpError(400,'Keep writing direction under 10,000 characters.');
    if(action==='open'){
      const event=await calculatePlanetaryEvent(input.planet,planetaryReferenceInstant(input.date,input.timeZone),input.timeZone);
      const key=planetaryEventKey(event),existing=(await read({content_key:`eq.${key}`,order:'updated_at.desc',limit:'10'})).filter(row=>row.status!=='ARCHIVED');
      const saved=existing.find(row=>row.event_type==='horoscope-edition-revision')??existing.find(row=>row.mode==='article');
      if(saved)return sendAdminJson(res,200,{ok:true,rows:[planetaryEditorRow(saved)],existing:true});
      const readings=emptyPlanetaryReadings(event),now=new Date().toISOString();
      const row={content_key:key,surface:'sky',mode:'article',event_type:'planetary-horoscopes',target_date:null,status:'DRAFT',lane:'reference',review_state:'owner-review-required',
        headline:`${planetaryEventTitle(event)} horoscopes`,summary:'',body:planetaryReadingsBody(readings),sections:{planetaryHoroscopes:readings},facts:{planetaryEvent:signedPlanetaryEvent(event)},
        source_snapshot:{content_role:'authored_card',review_status:'needs_review',planetaryGeneration:{direction:'',history:[]}},provider:'content-studio',model:null,prompt_version:PLANETARY_WRITING_VERSION,updated_at:now};
      const result=await adminFetchJson(url,{method:'POST',headers:{...headers,prefer:'return=representation'},body:JSON.stringify(row)},30000);
      if(!result.ok)throw new AdminHttpError(result.status===409?409:502,'This event could not be opened. Reload saved sets before trying again.');
      const rows=adminStorageRows<any>(result.payload);
      if(rows.length!==1||rows[0].content_key!==key)throw new AdminHttpError(502,'Storage did not confirm the new event. Reload before trying again.');
      return sendAdminJson(res,200,{ok:true,rows:rows.map(planetaryEditorRow)});
    }
    if(typeof input.id!=='string'||typeof input.expectedUpdatedAt!=='string')throw new AdminHttpError(400,'Open the saved event before continuing.');
    let row=(await read({id:`eq.${input.id}`,limit:'1'}))[0];
    if(!row?.content_key?.startsWith(PLANETARY_HOROSCOPE_PREFIX))throw new AdminHttpError(404,'Planetary horoscope set not found.');
    if(row.updated_at!==input.expectedUpdatedAt)throw new AdminHttpError(409,'This set changed. Reload the saved version; newer edits were preserved.');
    assertPlanetaryHoroscopeRow(row);
    assertSignedPlanetaryEvent(row.facts.planetaryEvent);
    if(action==='inspect')return sendAdminJson(res,200,{ok:true,receipt:{contentKey:row.content_key,updatedAt:row.updated_at,...(await inspectPlanetaryWriting(row)).planetaryGeneration}});
    if(row.status!=='DRAFT')throw new AdminHttpError(409,'Open an editable draft before generating.');
    const persist=async(patch:Record<string,unknown>)=>{
      const result=await adminFetchJson(`${url}?${new URLSearchParams({id:`eq.${row.id}`,updated_at:`eq.${row.updated_at}`})}`,{method:'PATCH',headers:{...headers,prefer:'return=representation'},body:JSON.stringify({...patch,updated_at:version(row.updated_at)})},30000);
      if(!result.ok)throw new AdminHttpError(502,'The save could not be confirmed. Reload before continuing.');
      const saved=adminStorageRows<any>(result.payload);
      if(saved.length!==1||saved[0].id!==row.id||saved[0].updated_at===row.updated_at)throw new AdminHttpError(409,'This set changed. Reload it; newer edits were preserved.');
      row=saved[0];
    };
    const saveGeneration=(g:any,patch:Record<string,unknown>={})=>persist({...patch,source_snapshot:{...row.source_snapshot,planetaryGeneration:g}});
    const finish=(status=200)=>sendAdminJson(res,status,{ok:true,rows:[planetaryEditorRow(row)]});
    let g=generation(row),active=g.active;
    if(action==='release'){
      if(!active||input.acknowledgeUnknownOutcome!==true||active.responseId||Date.now()-Date.parse(active.startedAt)<PLANETARY_DISPATCH_RECOVERY_DELAY_MS)throw new AdminHttpError(409,'Only an unconfirmed request can be released after its confirmation window ends and you acknowledge it may have been billed.');
      await saveGeneration({...g,active:null,plan:null,history:[...(g.history??[]),{...active,state:'released-unknown-outcome',releasedAt:new Date().toISOString()}],lastError:'The unconfirmed request was released. It may have been billed. Review a new plan before generating again.'});
      return finish();
    }
    if(action==='prepare'){
      if(active)throw new AdminHttpError(409,'Retrieve the existing writing request before preparing another.');
      const event=row.facts.planetaryEvent.event,direction=input.direction??g.direction??'';
      const verified=await calculatePlanetaryEvent(event.planet,event.referenceInstant,event.timeZone);
      if(horoscopeCanonicalJson(verified)!==horoscopeCanonicalJson(event))throw new AdminHttpError(409,'The calculated event changed. Open it again before writing.');
      const feedback=await loadExplicitWritingFeedback({contentKey:row.content_key,surface:'sky',eventType:'planetary-horoscopes'});
      const plan=preparePlanetaryHoroscopeWriting(event,direction,feedback);
      await saveGeneration({...g,direction,plan,lastError:null});return finish();
    }
    if(action==='generate'){
      if(active)throw new AdminHttpError(409,'A writing request is already saved. Retrieve it instead of starting another.');
      if(row.sections.planetaryHoroscopes.passages.some((p:any)=>p.headline.trim()||p.body.trim()))throw new AdminHttpError(409,'This set already has writing. Edit the saved readings; generation cannot replace them.');
      if(!process.env.OPENAI_API_KEY)throw new AdminHttpError(503,'The planetary writer is not connected. No generation was sent.');
      const event=row.facts.planetaryEvent.event;
      const feedback=await loadExplicitWritingFeedback({contentKey:row.content_key,surface:'sky',eventType:'planetary-horoscopes'});
      const plan=preparePlanetaryHoroscopeWriting(event,g.direction??'',feedback);
      if(!g.plan||input.approvedPlanHash!==g.plan.planHash||plan.planHash!==g.plan.planHash)throw new AdminHttpError(409,'The writing plan or its sources changed. Review the current plan before generating.');
      active={id:randomUUID(),state:'starting',startedAt:new Date().toISOString(),planHash:plan.planHash,requestHash:planetaryWritingHash({request:plan.request,instructions:plan.instructions}),request:plan.request,instructions:plan.instructions,receipt:plan.receipt};
      // Reserve first. An uncertain dispatch is never automatically repeated.
      await saveGeneration({...g,active,lastError:null});g=generation(row);
      try{
        const result=await responses.startStoredWritingResponse({apiKey:process.env.OPENAI_API_KEY,role:'WRITER',request:active.request,governedInstructions:active.instructions,
          surface:'horoscopes',family:'horoscope',fetchImpl:(url:any,options:any)=>fetch(url,{...options,signal:AbortSignal.timeout(25000)})});
        if(result.response.ok&&!/^resp_[A-Za-z0-9_-]+$/u.test(result.payload?.id??'')){
          await saveGeneration({...g,active:{...active,state:'outcome-unknown',providerResult:result.payload},lastError:'The provider accepted a request without a recoverable response ID. It may have been billed. Reload this set before releasing the unconfirmed request.'});
          return finish(202);
        }
        if(!result.response.ok){
          await saveGeneration({...g,active:null,plan:null,lastError:'The provider did not confirm a stored writing response. Review the saved request before trying again.',history:[...(g.history??[]),{...active,state:'provider-error',providerResult:result.payload}]});
          return finish();
        }
        active={...active,state:'running',responseId:result.payload.id,...(typeof result.payload.status==='string'&&['completed','failed','cancelled','incomplete'].includes(result.payload.status)?{providerResult:result.payload}:{})};
        await saveGeneration({...g,active});return finish(202);
      }catch{
        // The reserved row remains recoverable even if dispatch or confirmation times out.
        throw new AdminHttpError(502,'The request outcome could not be confirmed. Reload this set and retrieve its saved request. It may have been billed; no second request was sent.');
      }
    }
    if(!active)throw new AdminHttpError(409,'No saved writing request is waiting.');
    if(!active.responseId)return finish(202);
    let payload=active.providerResult;
    if(!payload){
      const response=await responses.storedWritingResponse({apiKey:process.env.OPENAI_API_KEY,responseId:active.responseId});
      if(!response.ok)throw new AdminHttpError(502,'The saved writer response is unavailable. Retrieve again; generation will not restart.');
      payload=await response.json();
      if(payload.id!==active.responseId)throw new AdminHttpError(502,'The returned response does not match this saved request.');
      if(['queued','in_progress'].includes(payload.status))return finish(202);
      // Keep the complete original response before parsing or validating any reader fields.
      active={...active,providerResult:payload};await saveGeneration({...g,active});g=generation(row);
    }
    let readings,error:string|null=null;
    try{
      if(payload.status!=='completed'||payload.output?.some((o:any)=>o.content?.some((c:any)=>c.type==='refusal')))throw new Error('The writer did not complete all twelve readings.');
      const text=payload.output.filter((o:any)=>o.type==='message').flatMap((o:any)=>o.content??[]).filter((c:any)=>c.type==='output_text').map((c:any)=>c.text).join('');
      const parsed=JSON.parse(text);
      if(!parsed||Object.keys(parsed).length!==1||!Array.isArray(parsed.readings))throw new Error('The writer returned an invalid reading set.');
      readings=validatePlanetaryReadings({schema:'planetary-horoscopes/v1',passages:parsed.readings},row.facts.planetaryEvent.event,true);
    }catch(reason){error=reason instanceof Error?reason.message:'The returned readings could not be validated.';}
    const completedAt=new Date().toISOString();
    const lint=readings?readings.passages.map((p:any)=>({sign:p.sign,...validatePlanetaryReading(p,row.facts.planetaryEvent.event)})):null;
    await saveGeneration({...g,active:null,plan:null,lastError:error?`${error} The original response is retained. No automatic regeneration was sent.`:lint?.some((l:any)=>!l.passed)?'The twelve drafts were saved with findings. Review and edit them before publishing.':null,
      completed:error?null:{completedAt,readingsHash:planetaryWritingHash(readings),needs_review:true,ownerApproved:false,promotionAuthorized:false},
      history:[...(g.history??[]),{...active,state:error?'needs-correction':'completed',completedAt,lint,diagnostic:horoscopeProviderDiagnostic(payload)}]},
      readings&&!error?{sections:{...row.sections,planetaryHoroscopes:readings},body:planetaryReadingsBody(readings)}:{});
    return finish();
  }catch(error){return sendAdminJson(res,adminErrorStatus(error),{ok:false,error:error instanceof AdminHttpError?error.message:'The planetary horoscope request could not be completed. Saved readings are preserved.'});}
}
