import {lazy,Suspense,useEffect,useRef,useState} from 'react';
import {AdminDisclosureSummary,AdminSelect} from './AdminNativeControls';
import {StudioButton,StudioInput,StudioTextarea} from './StudioControls';
import {fetchWithOwnerSession,ownerSignInMessage} from './ownerSessionRequest';
import {ownerCredentialIdentity} from './ownerSession';
import {studioSignInHref} from '../../web/src/services/studioAuthReturn';
import {horoscopeEditionReaderHref} from './adminReaderDestinations';
import {PageLoading} from '../../web/src/components/PageLoading';
import {FormattedProse} from '../../web/src/components/FormattedProse';
import {announceContentUpdate} from '../../web/src/services/contentUpdateSignal';
import {HOROSCOPE_PERIODS,emptyHoroscopeEdition,validateHoroscopeEdition,horoscopeEditionKey,isHoroscopeEditionKey,horoscopeEditionBody,horoscopeWindowLabel,horoscopeSignLabel,horoscopeCanonicalJson,type HoroscopeEdition,type HoroscopePeriod} from '../../web/src/content/horoscopeEditions.mjs';

import {HoroscopeLocation} from '../../web/src/features/horoscopes/HoroscopeLocation';
import {browserTimeZone} from '../../web/src/services/timezones';
import type {LocationInput} from '../../web/src/types';
import {horoscopePunctuationFindings,horoscopeVocabularyFindings} from '../../../src/astro-writing/horoscopeEditorialConstraints.mjs';
import {horoscopePendingReadings} from '../../../src/astro-writing/horoscopeRecovery.mjs';
import {HOROSCOPE_WRITERS} from '../../../src/astro-writing/horoscopeWriterCatalog.mjs';
const HoroscopeGenerationDetails=lazy(()=>import('./HoroscopeWritingStudio').then(module=>({default:module.HoroscopeGenerationDetails})));
const WritingProfiles=lazy(()=>import('./HoroscopeWritingStudio'));
const endpoint = '/api/admin/generated-content';
const steps = ['setup','generate','edit','publish'] as const;
const pendingReadings=(edition:any,generation:any)=>horoscopePendingReadings(edition,generation).filter((p:any)=>edition.window.period!=='seasonal'||!generation?.editorialRuns?.[p.sign]);
type Step = typeof steps[number];
const stepLabels = ['Dates','Generate','Review','Publish'];
const stepTitles = ['Choose your horoscopes','Generate your drafts','Review each reading','Publish your horoscopes'];
async function request(secret:string,url:string,body?:unknown,method='POST',signal?:AbortSignal) {
  const timeout=AbortSignal.timeout(60000);
  if(url.startsWith(endpoint))url+=(url.includes('?')?'&':'?')+'horoscopeEditor=true';
  if(url==='/api/admin/horoscope-writing'&&body)body={...(body as object),editorView:true};
  const response = await fetchWithOwnerSession(url,secret,{method:body ? method:'GET',headers:{'content-type':'application/json'},cache:'no-store',signal:signal?AbortSignal.any([signal,timeout]):timeout,...(body ? {body:JSON.stringify(body)}:{})});
  const data = await response.json().catch(()=>({ok:false,error:'The server response could not be read.'}));
  if (!response.ok || data.ok !== true) throw Object.assign(new Error(data.error ?? 'The edition could not be loaded.'),{rows:data.rows,status:response.status,dispatchNotStarted:data.dispatchNotStarted===true});
  return data;
}
const recoverable=(reason:any)=>!reason?.status||[408,409,429].includes(reason.status)||reason.status>=500;
function waitForPoll(signal:AbortSignal,delay=3000) {
  return new Promise<void>(resolve=>{
    const done=()=>{clearTimeout(timer);signal.removeEventListener('abort',done);resolve();};
    const timer=setTimeout(done,delay);signal.addEventListener('abort',done,{once:true});if(signal.aborted)done();
  });
}
function download(name:string,value:unknown) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value,null,2)+'\n'],{type:'application/json'}));
  const link = document.createElement('a'); link.href=url; link.download=name; link.click(); setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export default function HoroscopeEditionsStudio({secret,requestedEditionId}:{secret:string;requestedEditionId?:string|null}) {
  const [rows,setRows]=useState<any[]>([]),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState<string|{previous:string}>(''),[message,setMessage]=useState('');
  const [listError,setListError]=useState('');
  const listRequest=useRef<AbortController|null>(null);
  const [period,setPeriod]=useState<HoroscopePeriod>('weekly'),[date,setDate]=useState(()=>new Intl.DateTimeFormat('en-CA',{timeZone:browserTimeZone()}).format(new Date())),[zone,setZone]=useState(browserTimeZone);
  const [draft,setDraft]=useState<HoroscopeEdition|null>(null),[saved,setSaved]=useState<any>(null),[packet,setPacket]=useState<any>(null),[profile,setProfile]=useState<any>(null);
  const [outlines,setOutlines]=useState<Record<string,string>>({}),[sign,setSign]=useState('aries'),[approved,setApproved]=useState(false);
  const [editorialImport,setEditorialImport]=useState<Record<string,unknown>|null>(null);
  const [place,setPlace]=useState<LocationInput>(()=>({label:'Device time zone',latitude:0,longitude:0,timeZone:browserTimeZone()}));
  const [plan,setPlan]=useState<any>(null),[planApproved,setPlanApproved]=useState(false),[configured,setConfigured]=useState(true),[progress,setProgress]=useState('');
  const [step,setStep]=useState<Step>('setup'),[instructions,setInstructions]=useState(false);
  const [privateRuns,setPrivateRuns]=useState<Record<string,any>>({});
  const [savedEvidence,setSavedEvidence]=useState<any>(null);
  useEffect(()=>{setSavedEvidence(null);},[saved?.id,saved?.updated_at,sign]);
  async function loadEvidence(){
    try{const data=await request(secret,'/api/admin/horoscope-writing',{action:'evidence',id:saved.id,expectedUpdatedAt:saved.updated_at,sign});setSavedEvidence(data.receipt);}
    catch(reason){setError((reason as Error).message);}
  }
  useEffect(()=>{
    const ref=saved?.sections?.horoscopeEdition?.window?.period==='seasonal'&&saved?.source_snapshot?.horoscopeGeneration?.editorialRuns?.[sign];
    if(!ref)return;
    const abort=new AbortController();
    request(secret,'/api/admin/horoscope-writing',{action:'inspect',id:saved.id,sign,expectedUpdatedAt:saved.updated_at},'POST',abort.signal)
      .then(data=>{if(!abort.signal.aborted&&data.rows?.[0]?.seasonalEditorialRun)setPrivateRuns(current=>({...current,[ref.id]:data.rows[0].seasonalEditorialRun}));})
      .catch(reason=>{if(!abort.signal.aborted)setError(reason.message);});
    return()=>abort.abort();
  },[saved?.id,saved?.updated_at,sign,secret]);
  const heading=useRef<HTMLHeadingElement>(null),previousStep=useRef(step);
  useEffect(()=>{if(previousStep.current===step)return;previousStep.current=step;heading.current?.focus({preventScroll:true});heading.current?.scrollIntoView({block:'center'});},[step]);
  const stop=useRef(false),running=useRef(false),operation=useRef<AbortController|null>(null);
  const lastSync=useRef(Date.now());
  const [checking,setChecking]=useState(false);
  const [needsSync,setNeedsSync]=useState(false);
  const mounted=useRef(true);
  function retain(row:any,refreshContext=false){validateHoroscopeEdition(row.sections?.horoscopeEdition);lastSync.current=Date.now();setNeedsSync(false);setSaved(row);setDraft(row.sections.horoscopeEdition);setRows(current=>[row,...current.filter(r=>r.id!==row.id)]);setApproved(false);if(refreshContext){setOutlines(row.source_snapshot?.horoscopeOutlines??{});setProfile(row.source_snapshot?.studioWritingProfile??null);setEditorialImport(row.source_snapshot?.editorialImport??null);setPlan(null);setPlanApproved(false);}}
  useEffect(()=>{setPlan(null);setPlanApproved(false);},[draft?.window.startsAt,draft?.window.endsAt,draft?.window.timeZone,outlines]);
  const dirty=Boolean(draft && (!saved || horoscopeCanonicalJson(draft)!==horoscopeCanonicalJson(saved.sections.horoscopeEdition) || horoscopeCanonicalJson(outlines)!==horoscopeCanonicalJson(saved.source_snapshot?.horoscopeOutlines ?? {}) || horoscopeCanonicalJson(profile)!==horoscopeCanonicalJson(saved.source_snapshot?.studioWritingProfile ?? null) || horoscopeCanonicalJson(editorialImport)!==horoscopeCanonicalJson(saved.source_snapshot?.editorialImport ?? null)));
  async function load() {
    listRequest.current?.abort();setListError('');
    // The dashboard adopts the owner session asynchronously after mounting.
    // Do not turn that initial empty credential into a sign-in failure.
    if(!secret)return;
    const signal=(listRequest.current=new AbortController()).signal;setLoading(true);
    try{
      const data=await request(secret,endpoint+'?horoscopeEditions=true&editionInventory=true',undefined,'GET',signal);
      if(!Array.isArray(data.rows))throw new Error('The edition list could not be read.');
      for(const row of data.rows)validateHoroscopeEdition(row.sections?.horoscopeEdition);
      if(!signal.aborted)setRows(data.rows);
    }catch(reason){if(!signal.aborted)setListError((reason as Error).message);}
    finally{if(!signal.aborted)setLoading(false);}
  }
  const credentialIdentity=ownerCredentialIdentity(secret);
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;stop.current=true;operation.current?.abort();};},[]);
  // Token renewal for the same owner must not cancel a running batch. A real
  // account change stops work; each request also checks its original identity.
  useEffect(()=>{void load();return()=>{listRequest.current?.abort();stop.current=true;operation.current?.abort();operation.current=null;running.current=false;setBusy(false);setChecking(false);setProgress('');};},[credentialIdentity]);
  useEffect(()=>{if(!dirty)return;const warn=(event:BeforeUnloadEvent)=>event.preventDefault();window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[dirty]);
  const mayReplace=()=>!dirty || window.confirm('Discard the unsaved changes to this edition?');
  function adopt(row:any) {
    const edition=validateHoroscopeEdition(row.sections?.horoscopeEdition);
    retain(row,true);setPacket(row.facts?.horoscopeBrief);setSign(edition.passages[0].sign);setInstructions(false);
    setPeriod(edition.window.period);setZone(edition.window.timeZone);
    setDate(row.facts?.horoscopeBrief?.brief?.referenceDate??new Intl.DateTimeFormat('en-CA',{timeZone:edition.window.timeZone}).format(new Date(edition.window.startsAt)));
    setError('');
    const next:Step=row.status==='LIVE'?'publish':row.source_snapshot?.horoscopeGeneration?.active||(edition.window.period==='seasonal'?pendingReadings(edition,row.source_snapshot?.horoscopeGeneration).length:edition.passages.some(p=>!p.headline.trim()&&!p.body.trim()))?'generate':'edit';
    setStep(next);return next;
  }
  async function loadPlan(row:any,controller?:AbortController,writerChoice?:string) {
    const data=await request(secret,'/api/admin/horoscope-writing',{action:'prepare',id:row.id,expectedUpdatedAt:row.updated_at,...(writerChoice?{writerChoice}:{})},'POST',controller?.signal);
    // Preparation may save the latest profile. Keep its confirmed row version
    // for generation and failure recovery instead of sending the old timestamp.
    const updated=data.rows?.[0];
    if(updated&&updated.id!==row.id)throw new Error('The writing plan edition could not be confirmed.');
    const failure=await savedFailureMessage(updated??row,controller?.signal);
    if(!mounted.current||controller&&!isCurrent(controller))return;
    if(updated){retain(updated);setProfile(updated.source_snapshot?.studioWritingProfile??null);}
    setPlan(data.plan);setConfigured(data.configured);setPlanApproved(false);setError(failure?{previous:failure}:'');
    return failure;
  }
  async function changeWriter(writerChoice:string) {
    if(!saved||busy||dirty||saved.source_snapshot?.horoscopeGeneration?.active)return;
    setBusy(true);setError('');setMessage('');setPlanApproved(false);
    try{await loadPlan(saved,undefined,writerChoice);setMessage('Writing model saved. Review the plan before generating.');}
    catch(reason){setPlan(null);await recoverActionConflict(reason);}
    finally{setBusy(false);}
  }
  async function savedFailureMessage(row:any,signal?:AbortSignal) {
    const generation=row.source_snapshot?.horoscopeGeneration,failed=generation?.lastError;
    if(!failed||generation.active)return '';
    const describe=(failure:any)=>{
      const message=failure.diagnostic?.errorCode==='credit_balance_exhausted'
        ?'The previous attempt stopped because the writing API had no credits. This describes the saved attempt, not your current balance.'
        :`Previous attempt: ${failure.message}`;
      const ended=Date.parse(failed.failedAt);
      const timestamp=Number.isFinite(ended)?` Attempt ended ${new Date(ended).toLocaleString('en-US',{dateStyle:'medium',timeStyle:'short',timeZone:row.sections.horoscopeEdition.window.timeZone})}.`:'';
      return message+timestamp;
    };
    if(failed.code==='required_punctuation'||failed.operation?.phase==='review'||failed.diagnostic||!failed.operation?.responseId)return describe(failed);
    // Older drafts only saved a generic error. Opening their plan retrieves the
    // existing response's cause; it never retries generation or changes the row.
    try {
      const details=await request(secret,'/api/admin/horoscope-writing',{action:'diagnose',id:row.id,expectedUpdatedAt:row.updated_at},'POST',signal);
      return describe(details.failure);
    }catch{
      return 'The previous attempt failed, but its details are unavailable. Check saved progress to try again. Saved readings are kept.';
    }
  }
  async function readSaved(id:string,signal?:AbortSignal) {
    const data=await request(secret,endpoint+'?'+new URLSearchParams({horoscopeEditions:'true',id}),undefined,'GET',signal);
    const row=data.rows?.[0];
    if(row?.id!==id)throw Object.assign(new Error('This saved edition is unavailable. Refresh the edition list.'),{status:404});
    validateHoroscopeEdition(row.sections?.horoscopeEdition);return row;
  }
  const opening=useRef<AbortController|null>(null);
  async function open(row:any,fromLink=false) {
    if(busy&&!opening.current?.signal.aborted||running.current){setError('Finish the current operation first.');return;}
    if(!mayReplace())return;
    opening.current?.abort();const controller=new AbortController();opening.current=controller;
    setBusy(true);setError('');setMessage('');
    try{
      row=await readSaved(row.id,controller.signal);if(controller.signal.aborted)return;
      const next=adopt(row);
      // Library links read only; preparing a writing plan remains explicit.
      if(!fromLink&&next==='generate'&&row.source_snapshot?.horoscopeGeneration?.batch?.status!=='running'&&(!row.source_snapshot?.horoscopeGeneration?.active||row.sections.horoscopeEdition.window.period==='weekly'))await loadPlan(row);
    }catch(reason){if(!controller.signal.aborted)setError((reason as Error).message);}
    finally{if(opening.current===controller){opening.current=null;if(!controller.signal.aborted)setBusy(false);}}
  }
  useEffect(()=>{
    if(secret&&requestedEditionId)void open({id:requestedEditionId},true);
    return()=>{if(opening.current){opening.current.abort();setBusy(false);}};
  },[credentialIdentity,requestedEditionId]);
  async function prepare() {
    if(!mayReplace())return;setBusy(true);setError('');setMessage('');
    try {
      const params=new URLSearchParams({horoscopeBrief:'true',period,date,timeZone:zone});
      const [facts,profiles]=await Promise.all([request(secret,endpoint+'?'+params),request(secret,endpoint+'?writingProfiles=true')]);
      const edition=emptyHoroscopeEdition(facts.brief.window);
      const matching=await request(secret,endpoint+'?'+new URLSearchParams({horoscopeEditions:'true',contentKey:horoscopeEditionKey(edition.window)}));
      let row=matching.rows?.[0]??rows.find(row=>isHoroscopeEditionKey(row.content_key,edition.window)&&horoscopeCanonicalJson(row.sections?.horoscopeEdition?.window)===horoscopeCanonicalJson(edition.window));
      if(row?.inventory_only)row=await readSaved(row.id);
      if(!row){
        const result=await request(secret,endpoint,{
          contentKey:horoscopeEditionKey(edition.window),surface:'sky',mode:'article',eventType:'horoscope-edition',provider:'manual-admin',model:'manual',targetDate:null,
          status:'DRAFT',lane:'serving',reviewState:null,headline:`${horoscopeSignLabel(period)} horoscopes`,body:horoscopeEditionBody(edition),summary:'',sections:{horoscopeEdition:edition},
          facts:{horoscopeBrief:{brief:facts.brief,signature:facts.signature}},sourceSnapshot:{horoscopeOutlines:{},studioWritingProfile:profiles.profiles.find((p:any)=>p.profile.period===period)??null,editorialImport:null}
        });
        row=result.rows?.[0];
        if(!row?.id||!row.updated_at||row.status!=='DRAFT'||!isHoroscopeEditionKey(row.content_key,edition.window)||horoscopeCanonicalJson(validateHoroscopeEdition(row.sections?.horoscopeEdition))!==horoscopeCanonicalJson(edition))throw new Error('The edition could not be confirmed. Choose Continue to check for the saved edition before trying again.');
      }
      const next=adopt(row);
      if(next==='generate'&&row.source_snapshot?.horoscopeGeneration?.batch?.status!=='running'&&!row.source_snapshot?.horoscopeGeneration?.active)await loadPlan(row);
    }catch(reason){setError((reason as Error).message);}finally{setBusy(false);}
  }
  async function save(publish=false) {
    if(!draft)return;setBusy(true);setError('');setMessage('');
    try {
      const edition=validateHoroscopeEdition(draft,publish);
      const changed=edition.passages.filter(p=>publish||!saved?.sections?.horoscopeEdition?.passages?.some((old:any)=>old.sign===p.sign&&old.headline===p.headline&&old.body===p.body));
      for(const p of changed){const issue=horoscopePunctuationFindings(p)[0];if(issue)throw new Error(`${horoscopeSignLabel(p.sign)}: ${issue.detail}`);}
      const body=publish ? {id:saved.id,status:'LIVE',lane:'serving',reviewState:null,expectedUpdatedAt:saved.updated_at} : {
        ...(saved ? {id:saved.id,expectedUpdatedAt:saved.updated_at}:{contentKey:horoscopeEditionKey(edition.window),surface:'sky',mode:'article',eventType:'horoscope-edition',provider:'manual-admin',model:'manual',targetDate:null}),
        status:'DRAFT',lane:'serving',reviewState:null,headline:`${horoscopeSignLabel(edition.window.period)} horoscopes`,body:horoscopeEditionBody(edition),summary:'',sections:{horoscopeEdition:edition},facts:{horoscopeBrief:packet},
        sourceSnapshot:{horoscopeOutlines:outlines,studioWritingProfile:profile,editorialImport}
      };
      const data=await request(secret,endpoint,body,saved ? 'PATCH':'POST');
      const row=data.rows?.[0];
      if(!row?.id || !row.updated_at || !isHoroscopeEditionKey(row.content_key,edition.window) || JSON.stringify(validateHoroscopeEdition(row.sections?.horoscopeEdition))!==JSON.stringify(edition)
        || row.status!==(publish ? 'LIVE':'DRAFT')) throw new Error('The exact save could not be confirmed. Your edits are preserved; reload the saved edition before retrying.');
      setSaved(row);setDraft(edition);setRows(current=>[row,...current.filter(r=>r.id!==row.id)]);setApproved(false);
      announceContentUpdate({contentKey:row.content_key,published:publish,updatedAt:row.updated_at});
      setMessage(publish ? 'Published the complete edition.' : 'Saved edition draft.');
      return row;
    }catch(reason){setError((reason as Error).message);}finally{setBusy(false);}
  }
  async function importDraft(file:File|undefined) {
    if(!file || !draft)return;setError('');
    try{
      if(file.size>500000)throw new Error('Choose a horoscope draft smaller than 500 KB.');
      const originalSource=await file.text();
      const value=JSON.parse(originalSource);
      if(!value || Array.isArray(value) || Object.keys(value).some(key=>!['schema','edition','editorialNotes'].includes(key)) || value.schema && value.schema!=='horoscope-draft/v1')throw new Error('Use a horoscope draft with edition and optional editorialNotes fields. Review mixed documents before importing.');
      const imported=validateHoroscopeEdition(value.edition,true);
      if(JSON.stringify(imported.window)!==JSON.stringify(draft.window))throw new Error('This draft belongs to a different period. Open its edition first.');
      const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(originalSource));
      setEditorialImport({schema:'horoscope-editorial-import/v1',originalSource,sha256:Array.from(new Uint8Array(hash),byte=>byte.toString(16).padStart(2,'0')).join(''),importedAt:new Date().toISOString(),readerFields:['edition.passages[].headline','edition.passages[].body']});
      setDraft(imported);setSign(current=>imported.passages.some(p=>p.sign===current)?current:imported.passages[0].sign);setApproved(false);setMessage('Imported the readings as an unsaved draft. Review the complete edition before publishing.');
    }catch(reason){setError((reason as Error).message);}
  }
  async function reviewPlan(){
    if(!draft||running.current)return;setBusy(true);setError('');
    try {const row=dirty?await save():saved;if(!row)return;setBusy(true);await loadPlan(row);setMessage('Your writing plan is ready to review.');}
    catch(reason){setError((reason as Error).message);}finally{setBusy(false);}
  }
  function isCurrent(controller:AbortController){return mounted.current&&operation.current===controller&&!controller.signal.aborted;}
  function savedStageMessage(active:any){
    if(active?.workflow==='seasonal-editorial/v2')return `Private Seasonal ${active.phase.replaceAll('_',' ')}: ${active.state}. Saved candidates remain outside the edition.`;
    if(active?.phase==='review'&&active?.workflow?.startsWith('horoscope-review/'))return active.state==='ready'
      ?running.current?'Draft saved. Starting its approved prose check…':'Draft saved. Resume generation to run its approved prose check.'
      :'The prose check is saved. Studio retrieves the same request automatically.';
    if(active?.state!=='ready')return null;
    if(active.phase==='planning')return 'Development plan saved. Resume generation to write the reading without another planning charge.';
    if(active.phase==='draft')return 'Original draft saved and checked. Resume generation for its separate advisory review.';
    if(active.phase==='synthesis')return 'Plan saved. Resume generation to write the overview without another planning charge.';
    return null;
  }
  function beginOperation(){operation.current?.abort();const controller=new AbortController();operation.current=controller;return controller;}
  function endOperation(controller:AbortController){if(!isCurrent(controller))return;operation.current=null;running.current=false;setBusy(false);setChecking(false);setProgress('');}
  function pauseGeneration(){
    if(operation.current)setNeedsSync(true);
    stop.current=true;operation.current?.abort();operation.current=null;running.current=false;
    setBusy(false);setChecking(false);setProgress('');setPlanApproved(false);setError('');
    setMessage('Paused. Completed readings are saved. Any request already sent can still finish; Studio will check for its result. You can leave this edition and return later.');
  }
  async function showRecovered(row:any,controller:AbortController) {
    if(!isCurrent(controller))return;
    retain(row,true);setPacket(row.facts?.horoscopeBrief);setError('');setProgress('');
    const edition=row.sections.horoscopeEdition,active=row.source_snapshot?.horoscopeGeneration?.active;
    if(row.source_snapshot?.horoscopeGeneration?.batch?.status==='running'){setStep('generate');setMessage('The saved batch is running. You can leave this page.');return;}
    const count=edition.passages.filter((p:any)=>p.headline.trim()&&p.body.trim()).length;
    if(row.status==='LIVE'){setStep('publish');setMessage('Loaded the published edition.');return;}
    if(active){
      setStep('generate');setSign(active.sign);
      setMessage(savedStageMessage(active)?'':(active.responseId?`${count}/${edition.passages.length} readings are saved. ${horoscopeSignLabel(active.sign)} is still processing. Studio checks automatically; you can also check now or return to your editions.`:'Waiting for request confirmation. Studio checks automatically without sending another request.'));
      if(edition.window.period==='weekly')return loadPlan(row,controller);
      return;
    }
    if(edition.window.period==='seasonal'?!pendingReadings(edition,row.source_snapshot?.horoscopeGeneration).length:!edition.passages.some((p:any)=>!p.headline.trim()&&!p.body.trim())){
      setStep('edit');setSign(edition.passages[0].sign);setMessage(count===edition.passages.length?'All readings are saved and ready to review.':`${count}/${edition.passages.length} readings are complete. Review the remaining text before publishing.`);return;
    }
    setStep('generate');setMessage(pendingReadings(edition,row.source_snapshot?.horoscopeGeneration).length===0
      ?`${count}/${edition.passages.length} readings are saved. The remaining readings are listed below for editing, rejection, or recovery.`
      :`${count}/${edition.passages.length} readings are saved. Review the current writing plan to continue the remaining readings.`);
    return loadPlan(row,controller);
  }
  async function recoverGeneration(row:any,controller:AbortController,pollExisting=false) {
    const previousFailure=row.source_snapshot?.horoscopeGeneration?.lastError?.failedAt;
    // Always reconcile from storage. Recovery retrieves an existing response only;
    // it never releases a reservation or starts another paid generation request.
    for(let attempt=0;attempt<3;attempt++){
      row=await readSaved(row.id,controller.signal);
      if(!isCurrent(controller))return;
      const active=row.source_snapshot?.horoscopeGeneration?.active;
      let failure:any;
      if(pollExisting&&row.source_snapshot?.horoscopeGeneration?.batch?.status!=='running'&&(active||row.source_snapshot?.horoscopeGeneration?.lastError?.code==='invalid_synthesis')){
        try{
          const data=await request(secret,'/api/admin/horoscope-writing',{action:'poll',id:row.id,expectedUpdatedAt:row.updated_at},'POST',controller.signal);
          if(data.rows?.[0]?.id!==row.id)throw new Error('The saved result could not be confirmed.');
          row=data.rows[0];
        }catch(reason){
          if(!isCurrent(controller))return;
          if((reason as any).status===409)continue;
          if(!recoverable(reason)&&!(reason as any).rows?.some((saved:any)=>saved.id===row.id))throw reason;
          failure=reason;
          row=await readSaved(row.id,controller.signal);
        }
      }
      let failureMessage;
      try{failureMessage=await showRecovered(row,controller);}
      catch(reason){if((reason as any).status===409)continue;throw reason;}
      if(isCurrent(controller)){
        const terminal=row.source_snapshot?.horoscopeGeneration?.lastError;
        if(terminal&&terminal.failedAt!==previousFailure)setError(failureMessage||terminal.message);
        if(!terminal&&failure&&!recoverable(failure))setError(failure.message);
      }
      return;
    }
    if(isCurrent(controller))setMessage('This edition is still updating. Check saved progress again shortly. Your saved readings are kept.');
  }
  function recoveryUnavailable(reason:any,controller:AbortController){
    if(!isCurrent(controller))return;
    setMessage('');
    if(recoverable(reason))setMessage('Studio could not check saved progress yet. Your saved readings are kept. Check saved progress again when the connection returns.');
    else setError(reason.message);
  }
  async function recoverActionConflict(reason:any){
    // Reconcile a stale operation without replaying its mutation. An owner edit
    // remains local; automatic recovery may only replace a clean document.
    if((reason?.status!==409&&!recoverable(reason))||!saved||dirty){setError(reason.message);return;}
    const controller=beginOperation();setChecking(true);setPlanApproved(false);
    setError('');setMessage('Loading the current saved edition…');
    try{await recoverGeneration(saved,controller);}
    catch(error){recoveryUnavailable(error,controller);}
    finally{endOperation(controller);}
  }
  async function checkProgress(){
    if(!saved||dirty||checking||(busy||operation.current)&&!running.current)return;
    stop.current=true;const controller=beginOperation();running.current=false;lastSync.current=Date.now();
    setBusy(true);setChecking(true);setProgress('');setError('');setMessage('Checking saved progress…');
    try{await recoverGeneration(saved,controller,true);}catch(reason){recoveryUnavailable(reason,controller);}finally{endOperation(controller);}
  }
  async function batchAction(action:string){
    if(!saved)return;setBusy(true);setError('');
    try{
      const data=await request(secret,'/api/admin/horoscope-writing',{action,id:saved.id,expectedUpdatedAt:saved.updated_at,...(action==='start-batch'?{approvedPlanHash:plan?.planHash}:{})});
      retain(data.rows[0]);setPlanApproved(false);setMessage(action==='pause-batch'?'Batch paused. A request already sent can still finish.':'The saved batch will continue through the remaining signs. You can leave this page.');
    }catch(reason){await recoverActionConflict(reason);}finally{setBusy(false);}
  }
  async function generate(){
    if(saved?.sections.horoscopeEdition.window.period==='weekly'&&(planApproved||!saved.source_snapshot?.horoscopeGeneration?.active)){
      if(saved.source_snapshot?.horoscopeGeneration?.batch?.status==='paused')return batchAction('resume-batch');
      if(plan&&planApproved&&!dirty)return batchAction('start-batch');
      return;
    }
    if(!saved||needsSync||running.current||(!saved.source_snapshot?.horoscopeGeneration?.active&&(!plan||!planApproved)))return;
    let retrying=retrySign;
    const controller=beginOperation();running.current=true;stop.current=false;setBusy(true);setError('');setMessage('');let row=saved;
    try {
      let calls=0;
      while(!stop.current&&isCurrent(controller)){
        const active=row.source_snapshot?.horoscopeGeneration?.active;
        const missing=pendingReadings(row.sections.horoscopeEdition,row.source_snapshot?.horoscopeGeneration)[0];
        if(!active&&!missing)break;
        if(!active&&(!planApproved||!plan)){setMessage('Recovered the reading. Review the writing plan to continue the remaining readings.');break;}
        const next=active?.sign??retrying??missing.sign;
        setSign(next);
        setProgress(`${['synthesis','planning'].includes(active?.phase)?'Planning':active?.phase==='review'?'Reviewing':'Writing'} ${horoscopeSignLabel(next)} · ${row.sections.horoscopeEdition.passages.filter((p:any)=>p.body.trim()&&p.headline.trim()).length}/${row.sections.horoscopeEdition.passages.length} saved`);
        let data;
        const action=active?(active.state==='ready'?'continue':'poll'):'generate';
        try{
          data=await request(secret,'/api/admin/horoscope-writing',{action,id:row.id,expectedUpdatedAt:row.updated_at,...(!active?{sign:next,approvedPlanHash:plan.planHash}:{})},'POST',controller.signal);
        }catch(reason){
          if(!isCurrent(controller))return;
          if((reason as any).status===409&&active?.state==='running'){
            const refreshed=await readSaved(row.id,controller.signal);
            if(!isCurrent(controller))return;
            const {horoscopeStreamCheckpointOnly}=await import('../../../src/astro-writing/horoscopeStreamCheckpoint.mjs');
            if(!isCurrent(controller))return;
            if(horoscopeStreamCheckpointOnly(row,refreshed)){row=refreshed;retain(row);continue;}
          }
          throw reason;
        }
        if(!isCurrent(controller))return;
        const updated=data.rows?.[0];if(!updated||updated.id!==row.id)throw new Error('The generation result could not be confirmed. Reopen the saved edition.');
        row=updated;retain(row);setMessage('');
        if(row.seasonalEditorialRun)setPrivateRuns(current=>({...current,[row.seasonalEditorialRun.id]:row.seasonalEditorialRun}));
        if(data.pending){
          if(++calls>(row.sections.horoscopeEdition.window.period==='seasonal'?1200:120)){setMessage('This reading is still processing. Check saved progress or resume generation to retrieve it.');break;}
          await waitForPoll(controller.signal);
        }
        else{calls=0;setSign(next);if(retrying)break;retrying=null;}
      }
      if(isCurrent(controller)&&!row.source_snapshot?.horoscopeGeneration?.active)await showRecovered(row,controller);
    }catch(reason){
      if(!isCurrent(controller))return;
      if((reason as any).batchStopped){setMessage('');setProgress('');setError((reason as Error).message);setNeedsSync(true);return;}
      if(!recoverable(reason)&&!(reason as any).rows){setError((reason as Error).message);return;}
      try{await recoverGeneration(row,controller);}catch(recoveryError){recoveryUnavailable(recoveryError,controller);}
    }
    finally{endOperation(controller);}
  }
  async function release(heldSign?:string){
    const isReview=saved?.source_snapshot?.horoscopeGeneration?.active?.phase==='review';
    if(!saved||!window.confirm(isReview?'Stop this prose check and keep its draft for editing? It may already have been billed. No replacement request will be started.':`The interrupted ${heldSign?horoscopeSignLabel(heldSign)+' ':''}request may have been billed. Allow a new paid request for this reading?`))return;
    setBusy(true);setError('');try{const data=await request(secret,'/api/admin/horoscope-writing',{action:'release',id:saved.id,expectedUpdatedAt:saved.updated_at,acknowledgeUnknownOutcome:true,...(heldSign?{sign:heldSign}:{})});retain(data.rows[0]);await loadPlan(data.rows[0]);setMessage('Interrupted request released. Review the plan before starting another request.');setPlanApproved(false);}catch(reason){await recoverActionConflict(reason);}finally{setBusy(false);}
  }
  async function reject(target:string){
    if(!saved||locked||saved.status!=='DRAFT')return;
    const all=target==='all',label=all?'all drafts':`${horoscopeSignLabel(target)}’s reading`;
    if(!window.confirm(`Reject ${label} and start again? Current edits will be saved and the rejected writing kept in history. ${all?'Dates stay the same; calculated facts will be refreshed. ':''}The new plan will use your latest saved writing instructions. Generating replacements is a separate step.`))return;
    setBusy(true);setError('');setMessage('');
    try {
      const current=dirty?await save():saved;if(!current)return;setBusy(true);
      const data=await request(secret,'/api/admin/horoscope-writing',{action:'reject',id:current.id,expectedUpdatedAt:current.updated_at,sign:target});
      const row=data.rows?.[0];if(!row||row.id!==current.id)throw new Error('The rejection could not be confirmed. Reopen the saved edition.');
      retain(row,true);setPacket(row.facts.horoscopeBrief);setStep('generate');if(all)setSign(row.sections.horoscopeEdition.passages[0].sign);
      setMessage(`Rejected ${label}. The previous writing is in Rejected drafts. Review the new plan, then generate replacements.`);
      await loadPlan(row);
    }catch(reason){await recoverActionConflict(reason);}finally{setBusy(false);}
  }
  const readingSigns=draft?.passages.map(p=>p.sign)??[];
  const total=readingSigns.length;
  const passage=draft?.passages.find(p=>p.sign===sign);
  const wordingIssues=draft?.passages.flatMap(p=>horoscopeVocabularyFindings(p,draft.window.period).map(issue=>({...issue,sign:p.sign})))??[];
  const complete=draft?.passages.filter(p=>p.headline.trim()&&p.body.trim()).length ?? 0;
  const empty=draft?.passages.filter(p=>!p.headline.trim()&&!p.body.trim()).length ?? 0;
  const generation=saved?.source_snapshot?.horoscopeGeneration,active=generation?.active;
  const serverBatch=generation?.batch,serverRunning=serverBatch?.status==='running';
  const heldSigns=Object.keys(generation?.heldRequests??{});
  const candidateHolds=Object.entries(generation?.candidateHolds??{}) as [string,any][];
  const available=draft?pendingReadings(draft,generation).length:0;
  const remainingAfterActive=draft&&active?pendingReadings(draft,generation).filter((p:any)=>p.sign!==active.sign).length:0;
  const weeklyResume=draft?.window.period==='weekly'&&remainingAfterActive>0;
  const resumeCalls=2*remainingAfterActive+(active?.phase==='review'?(active.state==='ready'?1:0):(active?.reviewVersion?1:0));
  // List refreshes cannot erase an operation error or pause a saved batch.
  const visibleError=error||(step==='setup'?listError:'');
  const needsSignIn=visibleError===ownerSignInMessage;
  useEffect(()=>{
    const idle=!active&&!needsSync;
    if(!secret||!saved||needsSignIn||step!=='generate'||dirty||instructions||checking||busy&&!running.current||idle&&(draft?.window.period!=='weekly'||busy))return;
    const controller=new AbortController();let inFlight=false;
    // Recover active requests as before. Idle Weeklies check only the version
    // first, preserving approval and avoiding unchanged large-history reads.
    const sync=async(returning=false)=>{
      if(inFlight||document.visibilityState==='hidden'||Date.now()-lastSync.current<(running.current?(returning?15000:60000):returning?3000:30000))return;
      if(serverRunning){
        inFlight=true;lastSync.current=Date.now();
        try{const row=await readSaved(saved.id,controller.signal);if(!controller.signal.aborted){retain(row);if(row.source_snapshot?.horoscopeGeneration?.batch?.status!=='running')await checkProgress();}}
        catch(reason){if(!controller.signal.aborted)setError((reason as Error).message);}finally{inFlight=false;}return;
      }
      if(!idle){void checkProgress();return;}
      inFlight=true;lastSync.current=Date.now();
      try{
        const data=await request(secret,endpoint+'?'+new URLSearchParams({horoscopeEditions:'true',id:saved.id,editionVersion:'true'}),undefined,'GET',controller.signal);
        if(controller.signal.aborted)return;
        const row=data.rows?.[0];
        if(row?.id!==saved.id||typeof row.updated_at!=='string')return;
        if(row.updated_at!==saved.updated_at)await checkProgress();
      }catch{/* A background read never erases saved state or replays a request. */}
      finally{inFlight=false;}
    };
    const onReturn=()=>void sync(true),timer=window.setInterval(()=>void sync(),15000);
    window.addEventListener('focus',onReturn);window.addEventListener('pageshow',onReturn);document.addEventListener('visibilitychange',onReturn);
    return()=>{controller.abort();window.clearInterval(timer);window.removeEventListener('focus',onReturn);window.removeEventListener('pageshow',onReturn);document.removeEventListener('visibilitychange',onReturn);};
  },[secret,step,draft?.window.period,saved,active,needsSync,dirty,instructions,busy,checking,needsSignIn]);
  const lastFailure=generation?.lastError,failedSign=lastFailure?.operation?.sign;
  const punctuationHold=lastFailure?.code==='required_punctuation'?lastFailure:null;
  function editPunctuation(){
    if(!draft||!punctuationHold||locked||!mayReplace())return;
    setDraft({...draft,passages:draft.passages.map(p=>p.sign===failedSign?{...p,...punctuationHold.candidate}:p)});
    setSign(failedSign);setStep('edit');setApproved(false);setError('');
    setMessage('Correct the punctuation in this unsaved response, then save the draft. No new AI request is needed.');
  }
  function editHeldCandidate(heldSign:string,held:any){
    if(!draft||locked||!mayReplace())return;
    setDraft({...draft,passages:draft.passages.map(p=>p.sign===heldSign?{...p,...held.candidate}:p)});
    setSign(heldSign);setStep('edit');setApproved(false);setError('');
    setMessage('Edit this saved response, then save the draft. Your changes still need your final approval before publication. No AI request is started.');
  }
  const retrySign=!active&&!generation?.heldRequests?.[failedSign]&&!generation?.candidateHolds?.[failedSign]&&draft?.passages.some(p=>p.sign===failedSign&&!p.headline.trim()&&!p.body.trim())?failedSign:null;
  const locked=busy||Boolean(active)||serverRunning||needsSync;
  const stepIndex=steps.indexOf(step),signIndex=readingSigns.indexOf(sign),planEntry=plan?.readings.find((entry:any)=>entry.sign===sign);
  const isPublished=saved?.status==='LIVE'&&!dirty;
  const rejectAllButton=saved?.status==='DRAFT'&&(empty<total||candidateHolds.length>0)?<StudioButton className="admin-danger-button" disabled={locked} onClick={()=>void reject('all')}>Reject all drafts</StudioButton>:null;
  async function moveTo(next:Step) {
    if(next==='setup'&&(!busy||running.current||checking)){
      pauseGeneration();setStep('setup');setMessage(dirty?'Your unsaved edits are kept in this session. Return to Review to continue editing.':'Your edition is saved. Open it under Continue a saved edition to pick up where you left off.');return;
    }
    if(busy)return;
    if(next==='publish') {if(complete!==total||active)return;if(dirty&&!await save())return;}
    setStep(next);
    if(next==='generate'&&!active&&empty>0&&(!plan||dirty))await reviewPlan();
  }
  async function nextReading() {
    if(signIndex===total-1)await moveTo('publish');
    else {if(dirty&&!await save())return;setSign(readingSigns[signIndex+1]);}
    heading.current?.scrollIntoView({block:'center'});
  }
  return <section className="admin-panel admin-horoscope-wizard" aria-label="Horoscope editions">
    <nav aria-label="Horoscope creation steps"><ol className="admin-horoscope-steps">{steps.map((value,index)=><li key={value}><StudioButton aria-current={step===value?'step':undefined} disabled={value==='setup'?busy&&!running.current&&!checking:busy||(Boolean(active)||needsSync)&&value!=='generate'||!draft||value==='publish'&&complete!==total} onClick={()=>void moveTo(value)}>{index+1} · {stepLabels[index]}</StudioButton></li>)}</ol></nav>
    <header className="admin-horoscope-step-heading">
      <p className="admin-field-hint">Step {stepIndex+1} of 4</p>
      <h2 ref={heading} tabIndex={-1}>{isPublished&&step==='publish'?'Your horoscopes are published':stepTitles[stepIndex]}</h2>
      <p>{step==='setup'?'Create daily or weekly sign readings, a monthly overview for everyone, or a zodiac-season introduction with twelve sign readings.':step==='generate'?'Check the writing plan, then let AI write the drafts using your saved instructions.':step==='edit'?'Read one passage at a time. Make any changes, then continue to the next reading.':isPublished?'This edition is ready to read in the app.':'Review the complete edition below. Publishing makes the complete edition available in the app.'}</p>
    </header>
    {step!=='setup'&&draft&&<div className="admin-horoscope-summary"><span>{horoscopeSignLabel(draft.window.period)} · {horoscopeWindowLabel(draft.window)}</span><span>{draft.window.timeZone.replaceAll('_',' ')} · {complete}/{total} readings ready{dirty?' · Unsaved changes':''}</span></div>}
    {visibleError&&(typeof visibleError==='string'?<p role="alert">{visibleError}{needsSignIn&&<> <a href={studioSignInHref('/admin/content#horoscopes'+(saved?.id?'?edition='+encodeURIComponent(saved.id):''))}>Sign in to Content Studio</a></>}</p>:step==='generate'&&<details className="admin-workspace-details"><AdminDisclosureSummary>Previous attempt</AdminDisclosureSummary><p>{visibleError.previous}</p></details>)}{message&&<p role="status">{message}</p>}
    {punctuationHold&&step==='generate'&&<StudioButton className="admin-primary-button" disabled={locked} onClick={editPunctuation}>Edit punctuation</StudioButton>}
    {candidateHolds.map(([heldSign,held])=><section key={heldSign} aria-label={`${horoscopeSignLabel(heldSign)} prose review`}>
      <h3>{horoscopeSignLabel(heldSign)} {held.code==='rhetorical_pattern'?'needs a prose edit':'prose check did not finish'}</h3><p>{held.message}</p>
      {(held.review?.rhetoric?.findings??[]).map((finding:any,index:number)=><div key={index}><strong>{finding.label}</strong><blockquote>{finding.quote}</blockquote><p>{finding.reason} {finding.readerConsequence}</p></div>)}
      <StudioButton disabled={locked} onClick={()=>editHeldCandidate(heldSign,held)}>Edit saved {horoscopeSignLabel(heldSign)} draft</StudioButton>
      <StudioButton disabled={locked} onClick={()=>void reject(heldSign)}>Reject {horoscopeSignLabel(heldSign)} draft</StudioButton>
    </section>)}
    {step==='setup'?<>
      <div className="admin-horoscope-periods" role="group" aria-label="Edition period">{HOROSCOPE_PERIODS.map(p=><StudioButton key={p} aria-pressed={period===p} disabled={busy} onClick={()=>setPeriod(p)}>{horoscopeSignLabel(p)}</StudioButton>)}</div>
      <label className="admin-review-copy-editor"><span>{period==='daily'?'Date':period==='weekly'?'Choose a date in the week':period==='monthly'?'Choose a date in the calendar month':'Choose a date in the zodiac season'}</span><StudioInput aria-label="Reference date" type="date" value={date} disabled={busy} onChange={e=>setDate(e.target.value)}/></label>
      <p className="admin-field-hint">{period==='daily'?'The reading covers this local calendar day.':period==='weekly'?'The week runs Monday through Sunday.':period==='monthly'?'One shared overview covers the first through the last day of this calendar month, for all zodiac signs.':"We’ll calculate the Sun’s zodiac season for this date. A shared introduction comes before the twelve sign readings."}</p>
      <HoroscopeLocation value={{...place,timeZone:zone}} disabled={busy} onChange={next=>{setPlace(next);setZone(next.timeZone!);}}/>
      <footer className="admin-writing-savebar admin-horoscope-actions"><p>Next: review the writing plan before generating.</p><StudioButton className="admin-primary-button" disabled={busy||!date} onClick={()=>void prepare()}>{busy?'Preparing your edition…':'Continue to writing plan'}</StudioButton></footer>
      <details className="admin-workspace-details"><AdminDisclosureSummary>Continue a saved edition{rows.length?` (${rows.length})`:''}</AdminDisclosureSummary>
        {loading?<PageLoading message="Loading horoscope editions…"/>:rows.length?<div className="admin-horoscope-saved">{rows.map(row=><StudioButton key={row.id} disabled={busy} onClick={()=>void open(row)}>{row.headline} · {horoscopeWindowLabel(row.sections.horoscopeEdition.window)} · {row.sections.horoscopeEdition.window.timeZone} · {row.status==='LIVE'?'Published':`${row.sections.horoscopeEdition.passages.filter((p:any)=>p.headline.trim()&&p.body.trim()).length}/${row.sections.horoscopeEdition.passages.length} drafted`}</StudioButton>)}</div>:<p>No saved editions yet. Start with the dates above.</p>}
        <StudioButton disabled={busy||loading} onClick={()=>void load()}>Refresh editions</StudioButton>
      </details>
    </>:draft&&passage&&<>
      {step==='generate'?<>
        <label className="admin-review-copy-editor"><span>Writing model</span>
          <AdminSelect aria-label="Writing model" aria-describedby="horoscope-writer-help" value={saved?.source_snapshot?.horoscopeWriterChoice??'current'}
            disabled={locked||Boolean(active)||!plan} onChange={event=>void changeWriter(event.target.value)}>
            {(plan?.writerModels??HOROSCOPE_WRITERS).map((writer:any)=><option key={writer.id} value={writer.id} disabled={writer.available===false}>{writer.label}{writer.available===false?' · Not connected':''}</option>)}
          </AdminSelect>
        </label>
        <p id="horoscope-writer-help" className="admin-field-hint">Used for new drafts with your saved instructions and examples. Planning and review use their existing models. Costs vary by model.</p>
        {active&&<p>Saved request: {active.writerModel??active.writerOperation?.config?.model??active.draftConfig?.model??active.config?.model??plan?.writerModel??HOROSCOPE_WRITERS.find(writer=>writer.id===(saved?.source_snapshot?.horoscopeWriterChoice??'current'))?.model}. Finish this request before changing models.</p>}
        {plan?.writerModels?.filter((writer:any)=>writer.available===false).map((writer:any)=><p key={writer.id} className="admin-field-hint">{writer.unavailableReason}</p>)}
        {heldSigns.map(heldSign=><div key={heldSign} role="note"><p>{horoscopeSignLabel(heldSign)} was interrupted before its response could be confirmed. This reading is held to prevent a duplicate charge. The other readings can continue; saved writing is kept.</p><StudioButton disabled={locked} onClick={()=>void release(heldSign)}>Allow retry for {horoscopeSignLabel(heldSign)}</StudioButton></div>)}
        <details className="admin-workspace-details"><AdminDisclosureSummary>Writing instructions · optional</AdminDisclosureSummary>
          <p>Using {profile?.id?`your saved ${draft.window.period} instructions, revision ${profile.revision}`:`the ${draft.window.period} starter instructions`}. You can use these as they are.</p>
          <StudioButton disabled={busy} onClick={()=>setInstructions(!instructions)}>{instructions?'Close writing instructions':'Edit writing instructions'}</StudioButton>
          {instructions&&<Suspense fallback={<PageLoading message="Loading writing instructions…"/>}><WritingProfiles key={draft.window.period} secret={secret} initialPeriod={draft.window.period}/></Suspense>}
          <p>Your latest saved instructions are applied automatically when the writing plan is prepared.</p>
        </details>
        {busy&&!running.current&&!plan&&!checking&&<PageLoading message="Preparing your writing plan…"/>}
        {plan&&(available>0||active)&&<>
          <p>{available} {available===1?'reading still needs a draft':'readings still need drafts'}. Existing writing is kept.</p>
          <div className="admin-horoscope-signs" role="group" aria-label="Writing plans by sign">{plan.readings.map((entry:any)=><StudioButton key={entry.sign} aria-pressed={sign===entry.sign} onClick={()=>setSign(entry.sign)}>{horoscopeSignLabel(entry.sign)}</StudioButton>)}</div>
          {planEntry&&<section className="admin-horoscope-plan" aria-label={`${horoscopeSignLabel(sign)} writing plan`}><h3>{horoscopeSignLabel(sign)} writing plan</h3><p>{planEntry.developments?.events.length??0} calculated developments · {draft.window.timeZone}</p><p className="admin-horoscope-outline">{planEntry.outline}</p><details className="admin-workspace-details"><AdminDisclosureSummary>Full plan details</AdminDisclosureSummary>{planEntry.developments?.events.length>0&&<ul>{planEntry.developments.events.map((event:any)=><li key={event.id}>{event.title} · {event.localTiming}{event.house?` · House ${event.house}: ${event.domain}`:''}</li>)}</ul>}{planEntry.seasonalMeaning&&<div aria-label="Season and learning-axis sources">
            <p>{horoscopeSignLabel(planEntry.seasonalMeaning.seasonSign)} season · {horoscopeSignLabel(planEntry.seasonalMeaning.seasonSign)} / {horoscopeSignLabel(planEntry.seasonalMeaning.oppositeSign)} learning axis</p>
            <p>{(planEntry.seasonalMeaning.areas??[]).map((area:any)=>`${horoscopeSignLabel(area.sign)} · House ${area.house}: ${area.domain}`).join(' · ')}</p>
            {planEntry.seasonalMeaning.sources.map((source:any)=><div key={source.contentKey}>
              <p>{source.role==='learning-axis'?'Learning axis':'Zodiac season'} · {source.provenance.kind==='content-studio'?'Saved Studio source':'Knowledge base'}</p>
              <FormattedProse text={source.body}/>
            </div>)}
          </div>}{Object.entries({thesis:'Main idea',transit_job:'Astrology',recognition:'What readers may notice',complication:'Possible complication',response:'Useful response',scope_guard:'Dates and limits'}).map(([key,label])=><p key={key}><strong>{label}: </strong>{planEntry.argument[key]}</p>)}</details></section>}
        </>}
        {draft.window.period==='weekly'&&planEntry?.ownerEvidence&&<Suspense fallback={<p>Loading writing evidence…</p>}><HoroscopeGenerationDetails view="evidence" receipt={planEntry.ownerEvidence}/></Suspense>}
        {!serverRunning&&active&&<p>{savedStageMessage(active)??`A request for ${horoscopeSignLabel(active.sign)} is saved. Studio checks for its result automatically. You can pause or return to your editions while it finishes.`}</p>}
        {!serverRunning&&weeklyResume&&!plan&&!busy&&<StudioButton disabled={needsSync||dirty} onClick={()=>void reviewPlan()}>Review plan for remaining readings</StudioButton>}
        {complete+empty<total&&<p>{total-complete-empty} partially written readings need your edits in Review. Your existing text will be kept.</p>}
        {!serverRunning&&weeklyResume&&plan&&!busy&&<p>{planApproved?'Finish the saved request, then continue through the remaining signs.':`Resume generation finishes only ${horoscopeSignLabel(active.sign)}. Approve the plan to continue through the other ${remainingAfterActive} readings too.`} Up to {resumeCalls} additional paid AI requests. No automatic rewrites or paid retries.</p>}
        {serverRunning&&<p role="status">{active?`${active.phase==='review'?'Reviewing':'Writing'} ${horoscopeSignLabel(active.sign)}`:'Continuing batch'} · {complete}/{total} saved</p>}{serverBatch?.error&&<p role="alert">{serverBatch.error}</p>}{progress&&<p role="status">{progress}</p>}
        <progress aria-label="Drafts saved" value={complete} max={total}/>
        <footer className={`admin-writing-savebar admin-horoscope-actions${candidateHolds.length?' admin-horoscope-held-actions':''}`}>
          {!serverRunning&&serverBatch?.status!=='paused'&&plan&&(!active||weeklyResume)&&available>0&&!dirty&&<label><input type="checkbox" checked={planApproved} disabled={busy||needsSync} onChange={e=>setPlanApproved(e.target.checked)}/> I approve this writing plan for generation.</label>}
          {!configured&&plan&&<p role="alert">AI writing is unavailable. Configure the writer before generating, or write the readings yourself.</p>}
          <p>{serverRunning?'Generating the approved batch. You can leave this page.':serverBatch?.status==='paused'?'The batch is paused. Resume to continue its saved approval.':checking?'Retrieving your saved request. This does not start another generation.':needsSync?'Paused. Check saved progress before continuing; completed readings are kept.':busy?'Each completed reading is saved automatically.':active?'Continue the saved request without starting it again.':empty===0?'Your drafts are ready to review.':available===0?'The remaining readings need attention above. Edit or reject a saved draft, or resolve an interrupted request.':dirty||!plan?'Prepare the current writing plan to continue.':!planApproved?`Check the plan approval box to ${retrySign?'retry':'continue'}.`:'Ready to generate the missing readings.'}</p>
          {!serverRunning&&serverBatch?.status!=='paused'&&plan&&!active&&available>0&&<p>{draft.window.period==='weekly'&&`This batch covers all ${available} remaining ${available===1?'reading':'readings'}. `}{draft.window.period==='seasonal'?`Up to ${(retrySign?1:available)*30} paid AI requests, bounded at 3 plans and 3 prose candidates per reading, with independent evaluations. Accepted candidates remain private for inspection.`:draft.window.period==='monthly'?'Up to 3 paid AI requests: one plan, one draft, and one prose check. Matching saved plans are reused.':`Up to ${2*(retrySign&&draft.window.period!=='weekly'?1:available)} paid AI requests: one draft and one prose check per reading.`}{draft.window.period!=='seasonal'&&' No automatic rewrites or paid retries. You approve the final wording.'}</p>}
          <div className="admin-toolbar-actions"><StudioButton disabled={busy&&!running.current&&!checking} onClick={()=>void moveTo('setup')}>Back to editions</StudioButton><div className="admin-toolbar-actions admin-horoscope-decision-actions">{rejectAllButton}
            <StudioButton disabled={!saved||dirty||checking||busy&&!running.current} onClick={()=>void checkProgress()}>{checking?'Checking saved progress…':'Check saved progress'}</StudioButton>
            {serverRunning?<StudioButton className="admin-primary-button" disabled={busy} onClick={()=>void batchAction('pause-batch')}>Pause generation</StudioButton>:serverBatch?.status==='paused'?<StudioButton className="admin-primary-button" disabled={busy} onClick={()=>void batchAction('resume-batch')}>Resume generation</StudioButton>:busy&&running.current?<StudioButton className="admin-primary-button" onClick={pauseGeneration}>Pause generation</StudioButton>:empty===0&&!active?<StudioButton className="admin-primary-button" disabled={busy||needsSync} onClick={()=>void moveTo('edit')}>Continue to review</StudioButton>:!active&&(dirty||!plan)?<StudioButton className="admin-primary-button" disabled={busy||needsSync||saved?.status==='LIVE'} onClick={()=>void reviewPlan()}>Review writing plan</StudioButton>:<StudioButton className="admin-primary-button" disabled={busy||needsSync||dirty||!saved||saved.status==='LIVE'||(!active&&(!available||!planApproved||!configured))} onClick={()=>void generate()}>{active?weeklyResume&&planApproved?'Resume remaining readings':'Resume generation':retrySign?`Retry ${horoscopeSignLabel(retrySign)}${draft.window.period==='weekly'&&available>1?' and continue':''}`:empty===total?`Generate ${total===1?'overview':`${total} drafts`}`:'Generate missing readings'}</StudioButton>}
          </div></div>
          {active&&active.workflow!=='seasonal-editorial/v2'&&Date.now()-Date.parse(active.startedAt)>=310000&&<StudioButton disabled={busy||needsSync} onClick={()=>void release()}>Release interrupted request</StudioButton>}
        </footer>
      </>:step==='edit'?<>
        <div className="admin-horoscope-signs" role="group" aria-label="Readings by sign">{draft.passages.map(p=><StudioButton key={p.sign} aria-pressed={sign===p.sign} onClick={()=>setSign(p.sign)}>{horoscopeSignLabel(p.sign)}{p.body.trim()&&p.headline.trim()?' ✓':''}</StudioButton>)}</div>
        <p>Reading {signIndex+1} of {total} · {horoscopeSignLabel(sign)}</p>
        {generation?.readings?.[sign]?.config?.model&&<p className="admin-field-hint">Original draft model: {generation.readings[sign].config.model}</p>}
        {saved?.status==='DRAFT'&&<div className="admin-toolbar-actions"><StudioButton disabled={locked||!passage.headline.trim()&&!passage.body.trim()} onClick={()=>void reject(sign)}>Reject this reading</StudioButton></div>}
        {!passage.body&&<p>{draft.window.period==='seasonal'&&generation?.editorialRuns?.[sign]?'A private Seasonal run is available below for inspection.':`No reading for ${horoscopeSignLabel(sign)} yet. Return to Generate or write it below.`}</p>}
        {(generation?.readings?.[sign]?.lint?.violations??[]).filter((issue:any)=>issue.category!=='horoscope_required_vocabulary').map((issue:any,index:number)=><p role="note" key={index}>Original AI draft check: {issue.detail}</p>)}
        {draft.window.period==='weekly'&&(savedEvidence?<Suspense fallback={<p>Loading writing evidence…</p>}><HoroscopeGenerationDetails view="evidence" saved receipt={savedEvidence}/></Suspense>:(generation?.readings?.[sign]?.hasOwnerEvidence||generation?.candidateHolds?.[sign]?.receipt?.hasOwnerEvidence)&&<StudioButton onClick={()=>void loadEvidence()}>Load saved writing evidence</StudioButton>)}
        {draft.window.period==='seasonal'&&<Suspense fallback={<p>Loading Seasonal generation record…</p>}><HoroscopeGenerationDetails view="seasonal" run={privateRuns[generation?.editorialRuns?.[sign]?.id]} receipt={generation?.readings?.[sign]??(generation?.lastError?.operation?.sign===sign?generation.lastError.operation.writerReceipt:null)}/></Suspense>}
        {wordingIssues.filter(issue=>issue.sign===sign).map(issue=><p role="note" key={issue.field}>{issue.detail} No new AI request is needed.</p>)}
        <label className="admin-review-copy-editor"><span>Reading headline</span><StudioInput aria-label="Reading headline" value={passage.headline} maxLength={200} disabled={locked} onChange={e=>{setDraft({...draft,passages:draft.passages.map(p=>p.sign===sign?{...p,headline:e.target.value}:p)});setApproved(false);}}/></label>
        <label className="admin-review-copy-editor"><span>Complete reading</span><StudioTextarea aria-label="Complete reading" rows={12} value={passage.body} maxLength={20000} disabled={locked} onChange={e=>{setDraft({...draft,passages:draft.passages.map(p=>p.sign===sign?{...p,body:e.target.value}:p)});setApproved(false);}}/></label>
        <details className="admin-workspace-details"><AdminDisclosureSummary>Writing outline · editor only</AdminDisclosureSummary><StudioTextarea aria-label="Writing outline" rows={5} value={outlines[sign]??''} disabled={locked} onChange={e=>{setOutlines(current=>({...current,[sign]:e.target.value}));setApproved(false);}}/></details>
        <footer className="admin-writing-savebar admin-horoscope-actions">
          <p>{dirty?'Your changes will be saved when you continue.':isPublished?'Published edition':'All changes saved'}{signIndex===total-1&&complete!==total?` · ${total-complete} readings still need a headline and body.`:''}</p>
          <div className="admin-toolbar-actions"><StudioButton disabled={locked} onClick={()=>signIndex?setSign(readingSigns[signIndex-1]):void moveTo('generate')}>Back</StudioButton><div className="admin-toolbar-actions admin-horoscope-decision-actions">{rejectAllButton}<StudioButton className="admin-primary-button" disabled={locked||signIndex===total-1&&complete!==total} onClick={()=>void nextReading()}>{signIndex===total-1?'Continue to publish':`${dirty?'Save & next':'Next'}: ${horoscopeSignLabel(readingSigns[signIndex+1])}`}</StudioButton></div></div>
          <StudioButton disabled={locked||!dirty} onClick={()=>void save()}>Save edition draft</StudioButton>
        </footer>
      </>:<>
        {isPublished?<div className="admin-horoscope-actions"><a className="admin-primary-button" href={horoscopeEditionReaderHref(saved.id,draft.window.period,sign)} target="_blank" rel="noreferrer">Read published edition</a><StudioButton onClick={()=>void moveTo('setup')}>Create another edition</StudioButton></div>:<>
          {draft.passages.map(p=><section className="admin-hook-detail-section" key={p.sign} aria-label={`${horoscopeSignLabel(p.sign)} reading preview`}><h3>{horoscopeSignLabel(p.sign)}</h3><p>{p.headline}</p>{p.body?<div className="admin-copy-preview"><FormattedProse text={p.body}/></div>:<p>No reading written yet.</p>}</section>)}
          <footer className="admin-writing-savebar admin-horoscope-actions"><label><input type="checkbox" checked={approved} disabled={locked||dirty||complete!==total||!saved||wordingIssues.length>0} onChange={e=>setApproved(e.target.checked)}/> I have reviewed and approve the exact wording of every saved reading in this edition.</label><p>{wordingIssues.length?`Edit prohibited wording in ${[...new Set(wordingIssues.map(issue=>horoscopeSignLabel(issue.sign)))].join(', ')} before publishing.`:approved?'Ready to publish the complete edition.':'Check the approval box when you are happy with the complete edition.'}</p><div className="admin-toolbar-actions"><StudioButton disabled={locked} onClick={()=>void moveTo('edit')}>Back to readings</StudioButton><div className="admin-toolbar-actions admin-horoscope-decision-actions">{rejectAllButton}<StudioButton className="admin-primary-button" disabled={locked||dirty||!approved||!saved||wordingIssues.length>0} onClick={()=>void save(true)}>Publish edition</StudioButton></div></div></footer>
        </>}
      </>}
      {step==='generate'&&draft.window.period==='seasonal'&&generation?.editorialRuns?.[sign]&&<Suspense fallback={<p>Loading Seasonal generation record…</p>}><HoroscopeGenerationDetails view="seasonal" run={privateRuns[generation.editorialRuns[sign].id]}/></Suspense>}
      {generation?.rejections?.length>0&&<Suspense fallback={<p>Loading rejected drafts…</p>}><HoroscopeGenerationDetails view="rejections" rejections={generation.rejections} period={draft.window.period}/></Suspense>}
      {step==='edit'&&<details className="admin-workspace-details"><AdminDisclosureSummary>Advanced · import, export and calculations</AdminDisclosureSummary>
        <div className="admin-toolbar-actions"><StudioButton disabled={busy} onClick={()=>download('horoscope-writing-brief.json',{schema:'horoscope-writing-request/v1',edition:draft,calculatedFacts:packet,writingProfile:profile,outlines,ownerApproved:false})}>Export writing brief</StudioButton><label>Import draft<StudioInput aria-label="Import horoscope draft" type="file" accept="application/json,.json" disabled={locked} onChange={e=>{void importDraft(e.target.files?.[0]);e.target.value='';}}/></label></div><StudioTextarea aria-label="Calculated horoscope facts" readOnly rows={12} value={JSON.stringify(packet?.brief,null,2)}/>
      </details>}
    </>}
  </section>;
}
