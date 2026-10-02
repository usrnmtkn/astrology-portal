import {lazy,Suspense,useEffect,useRef,useState} from 'react';
import {AdminDisclosureSummary} from './AdminNativeControls';
import {StudioButton,StudioInput,StudioTextarea} from './StudioControls';
import {adminCredentialHeaders} from './adminSecret';
import {horoscopeEditionReaderHref} from './adminReaderDestinations';
import {PageLoading} from '../../web/src/components/PageLoading';
import {FormattedProse} from '../../web/src/components/FormattedProse';
import {announceContentUpdate} from '../../web/src/services/contentUpdateSignal';
import {HOROSCOPE_PERIODS,emptyHoroscopeEdition,validateHoroscopeEdition,horoscopeEditionKey,isHoroscopeEditionKey,horoscopeEditionBody,horoscopeWindowLabel,horoscopeSignLabel,horoscopeCanonicalJson,type HoroscopeEdition,type HoroscopePeriod} from '../../web/src/content/horoscopeEditions.mjs';

import {HoroscopeLocation} from '../../web/src/features/horoscopes/HoroscopeLocation';
import {browserTimeZone} from '../../web/src/services/timezones';
import type {LocationInput} from '../../web/src/types';
import {horoscopePunctuationFindings} from '../../../src/astro-writing/horoscopeEditorialConstraints.mjs';
const WritingProfiles=lazy(()=>import('./HoroscopeWritingStudio'));
const endpoint = '/api/admin/generated-content';
const steps = ['setup','generate','edit','publish'] as const;
type Step = typeof steps[number];
const stepLabels = ['Dates','Generate','Review','Publish'];
const stepTitles = ['Choose your horoscopes','Generate your drafts','Review each reading','Publish your horoscopes'];
async function request(secret:string,url:string,body?:unknown,method='POST',signal?:AbortSignal) {
  const timeout=AbortSignal.timeout(60000);
  const response = await fetch(url,{method:body ? method:'GET',headers:{...adminCredentialHeaders(secret),'content-type':'application/json'},cache:'no-store',signal:signal?AbortSignal.any([signal,timeout]):timeout,...(body ? {body:JSON.stringify(body)}:{})});
  const data = await response.json().catch(()=>({ok:false,error:'The server response could not be read.'}));
  if (!response.ok || data.ok !== true) throw Object.assign(new Error(data.error ?? 'The edition could not be loaded.'),{rows:data.rows,status:response.status});
  return data;
}
const recoverable=(reason:any)=>!reason?.status||[408,409,429].includes(reason.status)||reason.status>=500;
function waitForPoll(signal:AbortSignal) {
  return new Promise<void>(resolve=>{
    const done=()=>{clearTimeout(timer);signal.removeEventListener('abort',done);resolve();};
    const timer=setTimeout(done,3000);signal.addEventListener('abort',done,{once:true});if(signal.aborted)done();
  });
}
function download(name:string,value:unknown) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value,null,2)+'\n'],{type:'application/json'}));
  const link = document.createElement('a'); link.href=url; link.download=name; link.click(); setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export default function HoroscopeEditionsStudio({secret}:{secret:string}) {
  const [rows,setRows]=useState<any[]>([]),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
  const [period,setPeriod]=useState<HoroscopePeriod>('weekly'),[date,setDate]=useState(()=>new Intl.DateTimeFormat('en-CA',{timeZone:browserTimeZone()}).format(new Date())),[zone,setZone]=useState(browserTimeZone);
  const [draft,setDraft]=useState<HoroscopeEdition|null>(null),[saved,setSaved]=useState<any>(null),[packet,setPacket]=useState<any>(null),[profile,setProfile]=useState<any>(null);
  const [outlines,setOutlines]=useState<Record<string,string>>({}),[sign,setSign]=useState('aries'),[approved,setApproved]=useState(false);
  const [editorialImport,setEditorialImport]=useState<Record<string,unknown>|null>(null);
  const [place,setPlace]=useState<LocationInput>(()=>({label:'Device time zone',latitude:0,longitude:0,timeZone:browserTimeZone()}));
  const [plan,setPlan]=useState<any>(null),[planApproved,setPlanApproved]=useState(false),[configured,setConfigured]=useState(true),[progress,setProgress]=useState('');
  const [step,setStep]=useState<Step>('setup'),[instructions,setInstructions]=useState(false);
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
  async function load() {setLoading(true);try {const data=await request(secret,endpoint+'?horoscopeEditions=true');if(!Array.isArray(data.rows))throw new Error('The edition list could not be read.');for(const row of data.rows)validateHoroscopeEdition(row.sections?.horoscopeEdition);if(mounted.current)setRows(data.rows);}catch(reason){if(mounted.current)setError((reason as Error).message);}finally{if(mounted.current)setLoading(false);}}
  useEffect(()=>{mounted.current=true;void load();return()=>{mounted.current=false;stop.current=true;operation.current?.abort();};},[secret]);
  useEffect(()=>{if(!dirty)return;const warn=(event:BeforeUnloadEvent)=>event.preventDefault();window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[dirty]);
  const mayReplace=()=>!dirty || window.confirm('Discard the unsaved changes to this edition?');
  function adopt(row:any) {
    const edition=validateHoroscopeEdition(row.sections?.horoscopeEdition);
    retain(row,true);setPacket(row.facts?.horoscopeBrief);setSign(edition.passages[0].sign);setInstructions(false);
    setPeriod(edition.window.period);setZone(edition.window.timeZone);
    setDate(row.facts?.horoscopeBrief?.brief?.referenceDate??new Intl.DateTimeFormat('en-CA',{timeZone:edition.window.timeZone}).format(new Date(edition.window.startsAt)));
    setError(row.status==='DRAFT'?row.source_snapshot?.horoscopeGeneration?.lastError?.message??'':'');
    const next:Step=row.status==='LIVE'?'publish':row.source_snapshot?.horoscopeGeneration?.active||edition.passages.some(p=>!p.headline.trim()&&!p.body.trim())?'generate':'edit';
    setStep(next);return next;
  }
  async function loadPlan(row:any,controller?:AbortController) {
    const data=await request(secret,'/api/admin/horoscope-writing',{action:'prepare',id:row.id,expectedUpdatedAt:row.updated_at},'POST',controller?.signal);
    // Preparation may save the latest profile. Keep its confirmed row version
    // for generation and failure recovery instead of sending the old timestamp.
    const updated=data.rows?.[0];
    if(updated&&updated.id!==row.id)throw new Error('The writing plan edition could not be confirmed.');
    const failure=await savedFailureMessage(updated??row,controller?.signal);
    if(!mounted.current||controller&&!isCurrent(controller))return;
    if(updated){retain(updated);setProfile(updated.source_snapshot?.studioWritingProfile??null);}
    setPlan(data.plan);setConfigured(data.configured);setPlanApproved(false);setError(failure);
  }
  async function savedFailureMessage(row:any,signal?:AbortSignal) {
    const generation=row.source_snapshot?.horoscopeGeneration,failed=generation?.lastError;
    if(!failed||generation.active)return '';
    const describe=(failure:any)=>failure.diagnostic?.errorCode==='credit_balance_exhausted'
      ?'The previous attempt stopped because the writing API had no credits. If you have added credits, approve the writing plan below and retry this reading. This message describes the saved attempt, not your current balance.'
      :`Previous attempt: ${failure.message}`;
    if(failed.code==='required_punctuation')return describe(failed);
    if(failed.diagnostic||!failed.operation?.responseId)return describe(failed);
    // Older drafts only saved a generic error. Opening their plan retrieves the
    // existing response's cause; it never retries generation or changes the row.
    try {
      const details=await request(secret,'/api/admin/horoscope-writing',{action:'diagnose',id:row.id,expectedUpdatedAt:row.updated_at},'POST',signal);
      return describe(details.failure);
    }catch{
      return 'The previous attempt failed, but its details are temporarily unavailable. Choose Check saved progress to try again. Saved readings are kept.';
    }
  }
  async function readSaved(id:string,signal?:AbortSignal) {
    const data=await request(secret,endpoint+'?'+new URLSearchParams({id}),undefined,'GET',signal);
    const row=data.rows?.[0];
    if(row?.id!==id)throw Object.assign(new Error('This saved edition is unavailable. Refresh the edition list.'),{status:404});
    validateHoroscopeEdition(row.sections?.horoscopeEdition);return row;
  }
  async function open(row:any) {
    if(!mayReplace())return;setBusy(true);setError('');setMessage('');
    try{row=await readSaved(row.id);const next=adopt(row);if(next==='generate'&&!row.source_snapshot?.horoscopeGeneration?.active)await loadPlan(row);}
    catch(reason){setError((reason as Error).message);}finally{setBusy(false);}
  }
  async function prepare() {
    if(!mayReplace())return;setBusy(true);setError('');setMessage('');
    try {
      const params=new URLSearchParams({horoscopeBrief:'true',period,date,timeZone:zone});
      const [facts,profiles]=await Promise.all([request(secret,endpoint+'?'+params),request(secret,endpoint+'?writingProfiles=true')]);
      const edition=emptyHoroscopeEdition(facts.brief.window);
      const matching=await request(secret,endpoint+'?'+new URLSearchParams({contentKey:horoscopeEditionKey(edition.window),mode:'article'}));
      let row=matching.rows?.[0]??rows.find(row=>isHoroscopeEditionKey(row.content_key,edition.window)&&horoscopeCanonicalJson(row.sections?.horoscopeEdition?.window)===horoscopeCanonicalJson(edition.window));
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
      if(next==='generate'&&!row.source_snapshot?.horoscopeGeneration?.active)await loadPlan(row);
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
        sourceSnapshot:{...(saved?.source_snapshot ?? {}),horoscopeOutlines:outlines,studioWritingProfile:profile,editorialImport}
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
    const count=edition.passages.filter((p:any)=>p.headline.trim()&&p.body.trim()).length;
    if(row.status==='LIVE'){setStep('publish');setMessage('Loaded the published edition.');return;}
    if(active){
      setStep('generate');setSign(active.sign);
      setMessage(active.phase==='synthesis'&&active.state==='ready'?'':active.responseId?`${count}/${edition.passages.length} readings are saved. ${horoscopeSignLabel(active.sign)} is still processing. Studio checks automatically; you can also check now or return to your editions.`:'Your request is being confirmed. Studio will check again automatically; a second request will not be started.');
      return;
    }
    if(!edition.passages.some((p:any)=>!p.headline.trim()&&!p.body.trim())){
      setStep('edit');setSign(edition.passages[0].sign);setMessage(count===edition.passages.length?'All readings are saved and ready to review.':`${count}/${edition.passages.length} readings are complete. Review the remaining text before publishing.`);return;
    }
    setStep('generate');setMessage(`${count}/${edition.passages.length} readings are saved. Review the current writing plan to continue the remaining readings.`);
    await loadPlan(row,controller);
  }
  async function recoverGeneration(row:any,controller:AbortController,pollExisting=false) {
    // Always reconcile from storage. Recovery retrieves an existing response only;
    // it never releases a reservation or starts another paid generation request.
    for(let attempt=0;attempt<3;attempt++){
      row=await readSaved(row.id,controller.signal);
      if(!isCurrent(controller))return;
      const active=row.source_snapshot?.horoscopeGeneration?.active;
      let failure:any;
      if(pollExisting&&active?.responseId){
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
      await showRecovered(row,controller);
      if(isCurrent(controller)){
        const terminal=row.source_snapshot?.horoscopeGeneration?.lastError;
        if(!terminal&&failure&&!recoverable(failure))setError(failure.message);
      }
      return;
    }
    if(isCurrent(controller))setMessage('This edition is still updating. Check saved progress again shortly. Your saved readings are kept.');
  }
  function recoveryUnavailable(reason:any,controller:AbortController){
    if(!isCurrent(controller))return;
    if(recoverable(reason))setMessage('Studio could not check saved progress yet. Your saved readings are kept. Check saved progress again when the connection returns.');
    else setError(reason.message);
  }
  async function checkProgress(){
    if(!saved||dirty||checking||(busy||operation.current)&&!running.current)return;
    stop.current=true;const controller=beginOperation();running.current=false;lastSync.current=Date.now();
    setBusy(true);setChecking(true);setProgress('');setError('');setMessage('Checking saved progress…');
    try{await recoverGeneration(saved,controller,true);}catch(reason){recoveryUnavailable(reason,controller);}finally{endOperation(controller);}
  }
  async function generate(){
    if(!saved||needsSync||running.current||(!saved.source_snapshot?.horoscopeGeneration?.active&&(!plan||!planApproved)))return;
    const retrying=retrySign;
    const controller=beginOperation();running.current=true;stop.current=false;setBusy(true);setError('');setMessage('');let row=saved;
    try {
      let calls=0;
      while(!stop.current&&isCurrent(controller)){
        const active=row.source_snapshot?.horoscopeGeneration?.active;
        const missing=row.sections.horoscopeEdition.passages.find((p:any)=>!p.headline.trim()&&!p.body.trim());
        if(!active&&!missing)break;
        if(!active&&(!planApproved||!plan)){setMessage('Recovered the reading. Review the writing plan to continue the remaining readings.');break;}
        const next=active?.sign??retrying??missing.sign;
        setSign(next);
        setProgress(`${active?.phase==='synthesis'?'Planning':'Writing'} ${horoscopeSignLabel(next)} · ${row.sections.horoscopeEdition.passages.filter((p:any)=>p.body.trim()&&p.headline.trim()).length}/${row.sections.horoscopeEdition.passages.length} saved`);
        const data=await request(secret,'/api/admin/horoscope-writing',{action:active?(active.phase==='synthesis'&&active.state==='ready'?'continue':'poll'):'generate',id:row.id,expectedUpdatedAt:row.updated_at,...(!active?{sign:next,approvedPlanHash:plan.planHash}:{})},'POST',controller.signal);
        if(!isCurrent(controller))return;
        const updated=data.rows?.[0];if(!updated||updated.id!==row.id)throw new Error('The generation result could not be confirmed. Reopen the saved edition.');
        row=updated;retain(row);
        if(data.pending){if(++calls>120){setMessage('This reading is still processing. Check saved progress or resume generation to retrieve it.');break;}await waitForPoll(controller.signal);}
        else{calls=0;setSign(next);if(retrying)break;}
      }
      if(isCurrent(controller)&&!row.source_snapshot?.horoscopeGeneration?.active)await showRecovered(row,controller);
    }catch(reason){
      if(!isCurrent(controller))return;
      if(!recoverable(reason)&&!(reason as any).rows){setError((reason as Error).message);return;}
      try{await recoverGeneration(row,controller);}catch(recoveryError){recoveryUnavailable(recoveryError,controller);}
    }
    finally{endOperation(controller);}
  }
  async function release(){
    if(!saved||!window.confirm('The previous request may have been billed. Release it so you can start a new request?'))return;
    setBusy(true);setError('');try{const data=await request(secret,'/api/admin/horoscope-writing',{action:'release',id:saved.id,expectedUpdatedAt:saved.updated_at,acknowledgeUnknownOutcome:true});retain(data.rows[0]);setMessage('Interrupted request released. Review the plan before starting another request.');setPlanApproved(false);}catch(reason){setError((reason as Error).message);}finally{setBusy(false);}
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
    }catch(reason){setError((reason as Error).message);}finally{setBusy(false);}
  }
  const readingSigns=draft?.passages.map(p=>p.sign)??[];
  const total=readingSigns.length;
  const passage=draft?.passages.find(p=>p.sign===sign);
  const complete=draft?.passages.filter(p=>p.headline.trim()&&p.body.trim()).length ?? 0;
  const empty=draft?.passages.filter(p=>!p.headline.trim()&&!p.body.trim()).length ?? 0;
  const active=saved?.source_snapshot?.horoscopeGeneration?.active;
  useEffect(()=>{
    if(step!=='generate'||!active&&!needsSync||dirty||instructions||checking||busy&&!running.current)return;
    // A backgrounded tab or an interrupted poll must not leave the last known
    // request on screen forever. Only retrieve it; never start another writer.
    const sync=(returning=false)=>{
      if(document.visibilityState==='hidden')return;
      const age=Date.now()-lastSync.current;
      if(age>=(running.current?(returning?15000:60000):returning?3000:30000))void checkProgress();
    };
    const onReturn=()=>sync(true),timer=window.setInterval(()=>sync(),15000);
    window.addEventListener('focus',onReturn);window.addEventListener('pageshow',onReturn);document.addEventListener('visibilitychange',onReturn);
    return()=>{window.clearInterval(timer);window.removeEventListener('focus',onReturn);window.removeEventListener('pageshow',onReturn);document.removeEventListener('visibilitychange',onReturn);};
  },[step,active,needsSync,dirty,instructions,checking,busy,saved]);
  const failedSign=saved?.source_snapshot?.horoscopeGeneration?.lastError?.operation?.sign;
  const punctuationHold=saved?.source_snapshot?.horoscopeGeneration?.lastError?.code==='required_punctuation'?saved.source_snapshot.horoscopeGeneration.lastError:null;
  function editPunctuation(){
    if(!draft||!punctuationHold||locked||!mayReplace())return;
    setDraft({...draft,passages:draft.passages.map(p=>p.sign===failedSign?{...p,...punctuationHold.candidate}:p)});
    setSign(failedSign);setStep('edit');setApproved(false);setError('');
    setMessage('Correct the punctuation in this unsaved response, then save the draft. No new AI request is needed.');
  }
  const retrySign=!active&&draft?.passages.some(p=>p.sign===failedSign&&!p.headline.trim()&&!p.body.trim())?failedSign:null;
  const locked=busy||Boolean(active)||needsSync;
  const stepIndex=steps.indexOf(step),signIndex=readingSigns.indexOf(sign),planEntry=plan?.readings.find((entry:any)=>entry.sign===sign);
  const isPublished=saved?.status==='LIVE'&&!dirty;
  const rejectAllButton=saved?.status==='DRAFT'&&empty<total?<StudioButton className="admin-danger-button" disabled={locked} onClick={()=>void reject('all')}>Reject all drafts</StudioButton>:null;
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
    {error&&<p role="alert">{error}</p>}{message&&<p role="status">{message}</p>}
    {punctuationHold&&step==='generate'&&<StudioButton className="admin-primary-button" disabled={locked} onClick={editPunctuation}>Edit punctuation</StudioButton>}
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
        <details className="admin-workspace-details"><AdminDisclosureSummary>Writing instructions · optional</AdminDisclosureSummary>
          <p>Using {profile?.id?`your saved ${draft.window.period} instructions, revision ${profile.revision}`:`the ${draft.window.period} starter instructions`}. You can use these as they are.</p>
          <StudioButton disabled={busy} onClick={()=>setInstructions(!instructions)}>{instructions?'Close writing instructions':'Edit writing instructions'}</StudioButton>
          {instructions&&<Suspense fallback={<PageLoading message="Loading writing instructions…"/>}><WritingProfiles key={draft.window.period} secret={secret} initialPeriod={draft.window.period}/></Suspense>}
          <p>Your latest saved instructions are applied automatically when the writing plan is prepared.</p>
        </details>
        {busy&&!running.current&&!plan&&!checking&&<PageLoading message="Preparing your writing plan…"/>}
        {plan&&<>
          <p>{empty} {empty===1?'reading still needs a draft':'readings still need drafts'}. Existing writing is kept.</p>
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
        {active&&<p>{active.phase==='synthesis'&&active.state==='ready'?'Plan saved. Resume generation to write the overview without another planning charge.':`A request for ${horoscopeSignLabel(active.sign)} is saved. Studio checks for its result automatically. You can pause or return to your editions while it finishes.`}</p>}
        {complete+empty<total&&<p>{total-complete-empty} partially written readings need your edits in Review. Your existing text will be kept.</p>}
        {progress&&<p role="status">{progress}</p>}
        <progress aria-label="Drafts saved" value={complete} max={total}/>
        <footer className="admin-writing-savebar admin-horoscope-actions">
          {plan&&!active&&empty>0&&!dirty&&<label><input type="checkbox" checked={planApproved} disabled={locked} onChange={e=>setPlanApproved(e.target.checked)}/> I approve this writing plan for generation.</label>}
          {!configured&&plan&&<p role="alert">AI writing is unavailable. Configure the writer before generating, or write the readings yourself.</p>}
          <p>{checking?'Retrieving your saved request. This does not start another generation.':needsSync?'Paused. Check saved progress before continuing; completed readings are kept.':busy?'Each completed reading is saved automatically.':active?'Continue the saved request without starting it again.':empty===0?'Your drafts are ready to review.':dirty||!plan?'Prepare the current writing plan to continue.':!planApproved?'Check the plan approval box to continue.':draft.window.period==='monthly'?'Up to 2 paid AI requests: one plan, then one draft. Matching saved plans are reused.':retrySign?`Retry only ${horoscopeSignLabel(retrySign)} with one new paid AI request. Saved readings are kept.`:`Ready to write ${empty} ${empty===1?'draft':'drafts'}. This uses ${empty} paid AI ${empty===1?'request':'requests'} and saves the results for review.`}</p>
          <div className="admin-toolbar-actions"><StudioButton disabled={busy&&!running.current&&!checking} onClick={()=>void moveTo('setup')}>Back to editions</StudioButton><div className="admin-toolbar-actions admin-horoscope-decision-actions">{rejectAllButton}
            <StudioButton disabled={!saved||dirty||checking||busy&&!running.current} onClick={()=>void checkProgress()}>{checking?'Checking saved progress…':'Check saved progress'}</StudioButton>
            {busy&&running.current?<StudioButton className="admin-primary-button" onClick={pauseGeneration}>Pause generation</StudioButton>:empty===0&&!active?<StudioButton className="admin-primary-button" disabled={busy||needsSync} onClick={()=>void moveTo('edit')}>Continue to review</StudioButton>:!active&&(dirty||!plan)?<StudioButton className="admin-primary-button" disabled={busy||needsSync||saved?.status==='LIVE'} onClick={()=>void reviewPlan()}>Review writing plan</StudioButton>:<StudioButton className="admin-primary-button" disabled={busy||needsSync||dirty||!saved||saved.status==='LIVE'||(!active&&(!planApproved||!configured))} onClick={()=>void generate()}>{active?'Resume generation':retrySign?`Retry ${horoscopeSignLabel(retrySign)}`:empty===total?`Generate ${total===1?'overview':`${total} drafts`}`:'Generate missing readings'}</StudioButton>}
          </div></div>
          {active&&Date.now()-Date.parse(active.startedAt)>=310000&&<StudioButton disabled={busy||needsSync} onClick={()=>void release()}>Release interrupted request</StudioButton>}
        </footer>
      </>:step==='edit'?<>
        <div className="admin-horoscope-signs" role="group" aria-label="Readings by sign">{draft.passages.map(p=><StudioButton key={p.sign} aria-pressed={sign===p.sign} onClick={()=>setSign(p.sign)}>{horoscopeSignLabel(p.sign)}{p.body.trim()&&p.headline.trim()?' ✓':''}</StudioButton>)}</div>
        <p>Reading {signIndex+1} of {total} · {horoscopeSignLabel(sign)}</p>
        {saved?.status==='DRAFT'&&<div className="admin-toolbar-actions"><StudioButton disabled={locked||!passage.headline.trim()&&!passage.body.trim()} onClick={()=>void reject(sign)}>Reject this reading</StudioButton></div>}
        {!passage.body&&<p>No reading for {horoscopeSignLabel(sign)} yet. Return to Generate or write it below.</p>}
        {(saved?.source_snapshot?.horoscopeGeneration?.readings?.[sign]?.lint?.violations??[]).map((issue:any,index:number)=><p role="note" key={index}>Original AI draft check: {issue.detail}</p>)}
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
          <footer className="admin-writing-savebar admin-horoscope-actions"><label><input type="checkbox" checked={approved} disabled={locked||dirty||complete!==total||!saved} onChange={e=>setApproved(e.target.checked)}/> I have reviewed and approve the exact wording of every saved reading in this edition.</label><p>{approved?'Ready to publish the complete edition.':'Check the approval box when you are happy with the complete edition.'}</p><div className="admin-toolbar-actions"><StudioButton disabled={locked} onClick={()=>void moveTo('edit')}>Back to readings</StudioButton><div className="admin-toolbar-actions admin-horoscope-decision-actions">{rejectAllButton}<StudioButton className="admin-primary-button" disabled={locked||dirty||!approved||!saved} onClick={()=>void save(true)}>Publish edition</StudioButton></div></div></footer>
        </>}
      </>}
      {saved?.source_snapshot?.horoscopeGeneration?.rejections?.length>0&&<details className="admin-workspace-details"><AdminDisclosureSummary>Rejected drafts</AdminDisclosureSummary><p>Saved for reference only. Rejected writing is not used as a writing example or published.</p>{[...saved.source_snapshot.horoscopeGeneration.rejections].reverse().map((entry:any)=><details key={entry.id}><AdminDisclosureSummary>{entry.scope==='all'?'All drafts':horoscopeSignLabel(entry.scope)} · {new Date(entry.rejectedAt).toLocaleString()}</AdminDisclosureSummary>{entry.passages.map((p:any)=><label className="admin-review-copy-editor" key={p.sign}><span>{horoscopeSignLabel(p.sign)}</span><StudioTextarea aria-label={`Rejected ${horoscopeSignLabel(p.sign)} reading`} readOnly rows={6} value={`${p.headline}\n\n${p.body}`}/></label>)}</details>)}</details>}
      {step==='edit'&&<details className="admin-workspace-details"><AdminDisclosureSummary>Advanced · import, export and calculations</AdminDisclosureSummary>
        <div className="admin-toolbar-actions"><StudioButton disabled={busy} onClick={()=>download('horoscope-writing-brief.json',{schema:'horoscope-writing-request/v1',edition:draft,calculatedFacts:packet,writingProfile:profile,outlines,ownerApproved:false})}>Export writing brief</StudioButton><label>Import draft<StudioInput aria-label="Import horoscope draft" type="file" accept="application/json,.json" disabled={locked} onChange={e=>{void importDraft(e.target.files?.[0]);e.target.value='';}}/></label></div><StudioTextarea aria-label="Calculated horoscope facts" readOnly rows={12} value={JSON.stringify(packet?.brief,null,2)}/>
      </details>}
    </>}
  </section>;
}
