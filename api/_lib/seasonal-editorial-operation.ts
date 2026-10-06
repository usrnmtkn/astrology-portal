import {randomUUID} from 'node:crypto';
import responses from '../../src/astro-writing/openAIResponses.cjs';
import provider from '../../src/astro-writing/offlineProviderConfig.cjs';
import {writeHoroscopeSign} from '../../src/astro-writing/horoscopeWriting.mjs';
import {newEditorialRun,prepareEditorialStep,reserveEditorialCall,confirmEditorialCall,completeEditorialCall} from '../../src/astro-writing/editorial/controller.mjs';
import {seasonalEditorialAdapter,seasonalEditorialModels,SEASONAL_EDITORIAL_WORKFLOW} from '../../src/astro-writing/seasonalEditorialAdapter.mjs';
import {seasonalEditorialStorage,loadSeasonalRejections} from './seasonal-editorial-storage.js';
import {AdminHttpError} from './admin-http.js';

class Captured extends Error {constructor(public request:any){super('Prepared Seasonal writing request.');}}
export async function seasonalEditorialOperation({action,row:initialRow,persist,prepared,sign,apiKey,actor,storage=seasonalEditorialStorage(),rejections}:any) {
  let row=initialRow,run:any,previous:any;
  const g=()=>row.source_snapshot?.horoscopeGeneration??{};
  const save=async()=>{run=await storage.save(previous,run,row.id);previous=structuredClone(run);};
  const reflect=async()=>{
    const terminal=!['ready','starting','running'].includes(run.status);
    const ref={id:run.id,sign:run.target.sign,workflow:SEASONAL_EDITORIAL_WORKFLOW,phase:run.stage,state:run.status,
      responseId:run.pending?.responseId??null,requestHash:run.pending?.requestHash??null,startedAt:run.pending?.startedAt??new Date().toISOString()};
    row=await persist({source_snapshot:{...row.source_snapshot,horoscopeGeneration:{...g(),active:terminal?null:ref,
      editorialRuns:{...g().editorialRuns,[run.target.sign]:{id:run.id,status:run.status}},
      lastError:terminal&&run.status!=='accepted'?{code:run.status,message:`Seasonal generation stopped: ${run.status}. Private attempts are available for inspection; no draft was saved.`,failedAt:new Date().toISOString(),runId:run.id}:null}}});
  };
  const reply=()=>({status:['ready','starting','running'].includes(run.status)?202:run.status==='accepted'?200:422,
    payload:{ok:['ready','starting','running','accepted'].includes(run.status),rows:[{...row,seasonalEditorialRun:run}],pending:['ready','starting','running'].includes(run.status),
      ...(run.status==='accepted'?{privateAccepted:true}:{error:run.status})}});
  if(action==='generate'){
    if(prepared.edition.window.period!=='seasonal')throw new AdminHttpError(400,'This controller is Seasonal only.');
    if(g().editorialRuns?.[sign])throw new AdminHttpError(409,'Inspect the existing private Seasonal run before starting another paid operation.');
    const id=randomUUID();let template:any;
    try{await writeHoroscopeSign(prepared,sign,{approvedPlanHash:prepared.planHash,approvalReference:`seasonal-editorial/${row.id}/${id}`,writerClient:async(request:any)=>{throw new Captured(request);}});}
    catch(error){if(error instanceof Captured)template=error.request;else throw error;}
    if(!template?.seasonalPreparation)throw new AdminHttpError(409,'Seasonal preparation is missing.');
    const entry=prepared.entries.find((e:any)=>e.sign===sign);
    const seasonalRejectionTargetKeys=[`horoscope-plan/${row.id}/${sign}`,`horoscope-opening-plan/${row.id}/${sign}`];
    const input={template,brief:prepared.brief,validationCorrections:entry.validationCorrections,seasonalRejectionTargetKeys,rejections:rejections??await loadSeasonalRejections(seasonalRejectionTargetKeys)};
    run=newEditorialRun({id,target:{sign,window:prepared.edition.window,editionId:row.id},input,models:seasonalEditorialModels(),authorization:{reference:`authenticated-seasonal-plan/${prepared.planHash}`,actor}});
    await storage.create(run,row.id);previous=structuredClone(run);
  }else{
    const id=action==='inspect'?g().editorialRuns?.[sign]?.id:g().active?.id??g().editorialRuns?.[sign]?.id;
    if(!id)throw new AdminHttpError(404,'No private Seasonal run is available.');
    run=await storage.read(id,row.id);previous=structuredClone(run);
    if(action==='inspect')return {status:200,payload:{ok:true,rows:[{...row,seasonalEditorialRun:run}],pending:false}};
  }
  const adapter=seasonalEditorialAdapter(run.input);
  if(action==='poll'){
    if(run.status==='ready')return reply();
    if(!run.pending?.responseId){
      // A possibly billed call is never replayed, even after a browser reload.
      if(run.status==='starting'&&Date.now()-Date.parse(run.pending.startedAt)>310000){run.status='dispatch_unknown';await save();await reflect();}
      return reply();
    }
    const response=await responses.storedWritingResponse({apiKey,responseId:run.pending.responseId});
    if(!response.ok)throw new AdminHttpError(503,'The saved Seasonal response is temporarily unavailable.');
    const payload=await response.json();
    if(['queued','in_progress'].includes(payload.status))return reply();
    await completeEditorialCall(run,payload,adapter);await save();await reflect();return reply();
  }
  if(!['generate','continue'].includes(action)||run.status!=='ready')throw new AdminHttpError(409,'Retrieve the saved Seasonal stage before continuing.');
  const step=await prepareEditorialStep(run,adapter);
  if(!step.request){await save();await reflect();return reply();}
  const request=step.request;
  reserveEditorialCall(run,request);await save();await reflect();
  try{
    const result=await responses.startStoredWritingResponse({apiKey,role:request.role,
      request:{...provider.buildProviderRequest({config:request.config,role:request.role==='WRITER'?'writer':'judge',stage:request.stage,input:request.input,schema:request.schema}),background:true,store:true},
      governedInstructions:request.instructions,surface:'horoscopes',family:'horoscope',fetchImpl:(url:any,options:any)=>fetch(url,{...options,signal:AbortSignal.timeout(25000)})});
    if(!result.response.ok){
      // An explicit HTTP rejection is recorded, not retried as a fresh charge.
      await completeEditorialCall(run,{...result.payload,status:'failed'},adapter);await save();await reflect();return reply();
    }
    confirmEditorialCall(run,result.payload.id);await save();await reflect();
    if(!['queued','in_progress'].includes(result.payload.status)){await completeEditorialCall(run,result.payload,adapter);await save();await reflect();}
    return reply();
  }catch(error){
    // The durable 'starting' reservation survives transport uncertainty. No catch
    // path creates a replacement response, resets budgets or exposes candidate text.
    throw error;
  }
}
