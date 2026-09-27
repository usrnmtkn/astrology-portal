import {lazy,Suspense,useEffect,useRef,useState} from 'react';
import {AdminSelect,AdminDisclosureSummary} from './AdminNativeControls';
import {StudioButton,StudioInput,StudioTextarea,StudioTabs} from './StudioControls';
import {adminCredentialHeaders} from './adminSecret';
import {horoscopeEditionReaderHref} from './adminReaderDestinations';
import {PageLoading} from '../../web/src/components/PageLoading';
import {FormattedProse} from '../../web/src/components/FormattedProse';
import {announceContentUpdate} from '../../web/src/services/contentUpdateSignal';
import {HOROSCOPE_SIGNS,HOROSCOPE_PERIODS,emptyHoroscopeEdition,validateHoroscopeEdition,horoscopeEditionKey,isHoroscopeEditionKey,horoscopeEditionBody,horoscopeWindowLabel,horoscopeSignLabel,horoscopeCanonicalJson,type HoroscopeEdition,type HoroscopePeriod} from '../../web/src/content/horoscopeEditions.mjs';

import {HoroscopeLocation} from '../../web/src/features/horoscopes/HoroscopeLocation';
import {browserTimeZone} from '../../web/src/services/timezones';
import type {LocationInput} from '../../web/src/types';
const WritingProfiles=lazy(()=>import('./HoroscopeWritingStudio'));
const endpoint = '/api/admin/generated-content';
async function request(secret:string,url:string,body?:unknown,method='POST') {
  const response = await fetch(url,{method:body ? method:'GET',headers:{...adminCredentialHeaders(secret),'content-type':'application/json'},cache:'no-store',signal:AbortSignal.timeout(60000),...(body ? {body:JSON.stringify(body)}:{})});
  const data = await response.json();
  if (!response.ok || data.ok !== true) throw Object.assign(new Error(data.error ?? 'The edition could not be loaded.'),{rows:data.rows});
  return data;
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
  const [step,setStep]=useState<'generate'|'edit'|'publish'>('generate'),[instructions,setInstructions]=useState(false);
  const stop=useRef(false),running=useRef(false);
  const mounted=useRef(true);
  function retain(row:any){validateHoroscopeEdition(row.sections?.horoscopeEdition);setSaved(row);setDraft(row.sections.horoscopeEdition);setRows(current=>[row,...current.filter(r=>r.id!==row.id)]);setApproved(false);}
  useEffect(()=>{setPlan(null);setPlanApproved(false);},[draft?.window.startsAt,draft?.window.endsAt,draft?.window.timeZone,outlines,profile]);
  const dirty=Boolean(draft && (!saved || horoscopeCanonicalJson(draft)!==horoscopeCanonicalJson(saved.sections.horoscopeEdition) || horoscopeCanonicalJson(outlines)!==horoscopeCanonicalJson(saved.source_snapshot?.horoscopeOutlines ?? {}) || horoscopeCanonicalJson(profile)!==horoscopeCanonicalJson(saved.source_snapshot?.studioWritingProfile ?? null) || horoscopeCanonicalJson(editorialImport)!==horoscopeCanonicalJson(saved.source_snapshot?.editorialImport ?? null)));
  async function load() {setLoading(true);try {const data=await request(secret,endpoint+'?horoscopeEditions=true');if(!Array.isArray(data.rows))throw new Error('The edition list could not be read.');for(const row of data.rows)validateHoroscopeEdition(row.sections?.horoscopeEdition);if(mounted.current)setRows(data.rows);}catch(reason){if(mounted.current)setError((reason as Error).message);}finally{if(mounted.current)setLoading(false);}}
  useEffect(()=>{mounted.current=true;void load();return()=>{mounted.current=false;stop.current=true;};},[secret]);
  useEffect(()=>{if(!dirty)return;const warn=(event:BeforeUnloadEvent)=>event.preventDefault();window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[dirty]);
  const mayReplace=()=>!dirty || window.confirm('Discard the unsaved changes to this edition?');
  function open(row:any) {if(!mayReplace())return;try{setDraft(validateHoroscopeEdition(row.sections?.horoscopeEdition));setSaved(row);setPacket(row.facts?.horoscopeBrief);setProfile(row.source_snapshot?.studioWritingProfile ?? null);setEditorialImport(row.source_snapshot?.editorialImport ?? null);setOutlines(row.source_snapshot?.horoscopeOutlines ?? {});setApproved(false);setError('');setMessage('');setPlan(null);setPlanApproved(false);setStep(row.sections.horoscopeEdition.passages.some((p:any)=>p.body)?'edit':'generate');}catch(reason){setError((reason as Error).message);}}
  async function prepare() {
    if(!mayReplace())return;setBusy(true);setError('');setMessage('');
    try {
      const params=new URLSearchParams({horoscopeBrief:'true',period,date,timeZone:zone});
      const [facts,profiles]=await Promise.all([request(secret,endpoint+'?'+params),request(secret,endpoint+'?writingProfiles=true')]);
      const edition=emptyHoroscopeEdition(facts.brief.window);
      const matching=await request(secret,endpoint+'?'+new URLSearchParams({contentKey:horoscopeEditionKey(edition.window),mode:'article'}));
      const existing=matching.rows?.[0]??rows.find(row=>isHoroscopeEditionKey(row.content_key,edition.window)&&horoscopeCanonicalJson(row.sections?.horoscopeEdition?.window)===horoscopeCanonicalJson(edition.window));
      if(existing){setDraft(validateHoroscopeEdition(existing.sections.horoscopeEdition));setSaved(existing);setPacket(existing.facts.horoscopeBrief);setOutlines(existing.source_snapshot?.horoscopeOutlines ?? {});setProfile(existing.source_snapshot?.studioWritingProfile ?? null);setMessage('Opened the existing edition for these dates.');}
      else{setDraft(edition);setSaved(null);setPacket({brief:facts.brief,signature:facts.signature});setOutlines({});setProfile(profiles.profiles.find((p:any)=>p.profile.period===period));setMessage('Calculated dates and writing brief are ready. No reading has been generated.');}
      setApproved(false);setPlan(null);setStep('generate');
      setEditorialImport(existing?.source_snapshot?.editorialImport ?? null);
    }catch(reason){setError((reason as Error).message);}finally{setBusy(false);}
  }
  async function save(publish=false) {
    if(!draft)return;setBusy(true);setError('');setMessage('');
    try {
      const edition=validateHoroscopeEdition(draft,publish);
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
      setMessage(publish ? 'Published all twelve readings. Open Horoscopes to read this edition during its date range.' : 'Saved edition draft.');
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
      setDraft(imported);setApproved(false);setMessage('Imported twelve readings as an unsaved draft. Review the complete edition before publishing.');
    }catch(reason){setError((reason as Error).message);}
  }
  async function refreshProfile() {
    if(!draft)return;setBusy(true);setError('');
    try{const data=await request(secret,endpoint+'?writingProfiles=true');const latest=data.profiles.find((entry:any)=>entry.profile.period===draft.window.period);if(!latest)throw new Error('Writing instructions are unavailable.');setProfile(latest);setApproved(false);setMessage('Loaded the latest writing instructions. Save the edition to retain this version.');}
    catch(reason){setError((reason as Error).message);}finally{setBusy(false);}
  }
  async function reviewPlan(){
    if(!draft||running.current)return;setBusy(true);setError('');
    try {const row=dirty?await save():saved;if(!row)return;setBusy(true);const data=await request(secret,'/api/admin/horoscope-writing',{action:'prepare',id:row.id,expectedUpdatedAt:row.updated_at});setPlan(data.plan);setConfigured(data.configured);setPlanApproved(false);setMessage('Review the plan for all twelve signs, then generate the missing readings.');}
    catch(reason){setError((reason as Error).message);}finally{setBusy(false);}
  }
  async function generate(){
    if(!saved||running.current||(!saved.source_snapshot?.horoscopeGeneration?.active&&(!plan||!planApproved)))return;
    running.current=true;stop.current=false;setBusy(true);setError('');setMessage('');let row=saved;
    try {
      let calls=0;
      while(!stop.current&&mounted.current){
        const active=row.source_snapshot?.horoscopeGeneration?.active;
        const missing=row.sections.horoscopeEdition.passages.find((p:any)=>!p.headline.trim()&&!p.body.trim());
        if(!active&&!missing)break;
        if(!active&&(!planApproved||!plan)){setMessage('Recovered the reading. Review the writing plan to continue the remaining signs.');break;}
        const next=active?.sign??missing.sign;
        setProgress(`Writing ${horoscopeSignLabel(next)} · ${row.sections.horoscopeEdition.passages.filter((p:any)=>p.body.trim()&&p.headline.trim()).length}/12 saved`);
        const data=await request(secret,'/api/admin/horoscope-writing',{action:active?'poll':'generate',id:row.id,expectedUpdatedAt:row.updated_at,...(!active?{sign:next,approvedPlanHash:plan.planHash}:{})});
        const updated=data.rows?.[0];if(!updated||updated.id!==row.id)throw new Error('The generation result could not be confirmed. Reopen the saved edition.');
        row=updated;retain(row);
        if(data.pending){if(++calls>120){setMessage('This reading is still running. Resume generation to retrieve it.');break;}await new Promise(resolve=>setTimeout(resolve,3000));}
        else{calls=0;setSign(next);}
      }
      if(!row.source_snapshot?.horoscopeGeneration?.active){setStep('edit');setMessage(stop.current?'Paused. Completed readings are saved.':'Drafts are saved. Read and edit each sign, then publish when you are ready.');}
    }catch(reason){
      let changed=(reason as any).rows?.[0];
      // Recover saved request state after an uncertain response without replaying it.
      if(!changed){try{changed=(await request(secret,endpoint+'?'+new URLSearchParams({id:row.id}))).rows?.[0];}catch{/* Preserve the displayed draft until the owner reopens it. */}}
      if(changed?.id===row.id)retain(changed);setError((reason as Error).message);
    }
    finally{running.current=false;setBusy(false);setProgress('');}
  }
  async function release(){
    if(!saved||!window.confirm('The previous request may have been billed. Release it so you can start a new request?'))return;
    setBusy(true);setError('');try{const data=await request(secret,'/api/admin/horoscope-writing',{action:'release',id:saved.id,expectedUpdatedAt:saved.updated_at,acknowledgeUnknownOutcome:true});retain(data.rows[0]);setMessage('Interrupted request released. Review the plan before starting another request.');setPlanApproved(false);}catch(reason){setError((reason as Error).message);}finally{setBusy(false);}
  }
  const passage=draft?.passages.find(p=>p.sign===sign);
  const complete=draft?.passages.filter(p=>p.headline.trim()&&p.body.trim()).length ?? 0;
  const empty=draft?.passages.filter(p=>!p.headline.trim()&&!p.body.trim()).length ?? 0;
  const active=saved?.source_snapshot?.horoscopeGeneration?.active;
  const locked=busy||Boolean(active);
  return <section className="admin-panel" aria-label="Horoscope editions">
    <p>Choose dates → Generate drafts → Edit readings → Publish. Each edition contains all twelve rising signs.</p>
    <details className="admin-workspace-details" open={!draft}><AdminDisclosureSummary>1 · Choose your edition</AdminDisclosureSummary>
      <div className="admin-toolbar">
        <label><span>Period</span><AdminSelect aria-label="Edition period" value={period} disabled={busy} onChange={e=>setPeriod(e.target.value as HoroscopePeriod)}>{HOROSCOPE_PERIODS.map(p=><option key={p} value={p}>{horoscopeSignLabel(p)}</option>)}</AdminSelect></label>
        <label><span>Reference date</span><StudioInput aria-label="Reference date" type="date" value={date} disabled={busy} onChange={e=>setDate(e.target.value)}/></label>
      </div>
      <HoroscopeLocation value={{...place,timeZone:zone}} disabled={busy} onChange={next=>{setPlace(next);setZone(next.timeZone!);}}/>
      <div className="admin-toolbar-actions"><StudioButton className="admin-primary-button" disabled={busy} onClick={()=>void prepare()}>{busy?'Working…':'Create or open edition'}</StudioButton></div>
    </details>
    {error&&<p role="alert">{error}</p>}{message&&<p role="status">{message}</p>}
    <details className="admin-workspace-details" open={!draft}><AdminDisclosureSummary>Saved editions</AdminDisclosureSummary>
      {loading?<PageLoading message="Loading horoscope editions…"/>:rows.length?<div className="admin-toolbar-actions">{rows.map(row=><StudioButton key={row.id} disabled={busy} onClick={()=>open(row)}>{row.headline} · {horoscopeWindowLabel(row.sections.horoscopeEdition.window)} · {row.sections.horoscopeEdition.window.timeZone} · {row.status}</StudioButton>)}</div>:<p>No editions saved yet. Choose your dates above to begin.</p>}
      <StudioButton disabled={busy||loading} onClick={()=>void load()}>Refresh editions</StudioButton>
    </details>
    {draft&&passage&&<>
      <div className="admin-writing-period-bar"><p>{horoscopeWindowLabel(draft.window)} · {draft.window.timeZone}</p><span>{complete}/12 readings ready{dirty?' · Unsaved changes':''}</span></div>
      <StudioTabs label="Horoscope workflow" tabs={[{value:'generate',label:'2 · Generate'},{value:'edit',label:'3 · Read & edit'},{value:'publish',label:'4 · Publish'}]} value={step} onValueChange={setStep}>
        {step==='generate'?<div className="admin-panel">
          <p>AI drafts use your writing instructions, your source examples and the calculated astrology for this edition. Each completed sign is saved automatically.</p>
          <div className="admin-toolbar-actions"><StudioButton disabled={busy} onClick={()=>setInstructions(!instructions)}>{instructions?'Close writing instructions':'Writing instructions'}</StudioButton><StudioButton disabled={locked} onClick={()=>void refreshProfile()}>Use latest saved instructions</StudioButton></div>
          <p>Using {profile?.id?`saved ${draft.window.period} profile, revision ${profile.revision}`:`the ${draft.window.period} starter profile`}.</p>
          {instructions&&<Suspense fallback={<PageLoading message="Loading writing instructions…"/>}><WritingProfiles key={draft.window.period} secret={secret} initialPeriod={draft.window.period}/></Suspense>}
          {!active&&<StudioButton disabled={locked||saved?.status==='LIVE'} onClick={()=>void reviewPlan()}>{plan?'Refresh writing plan':'Review writing plan'}</StudioButton>}
          {plan&&<>
            <p>{plan.writerCalls} missing readings. Review the plan below before starting. Generation uses one AI request per missing sign.</p>
            <div className="admin-horoscope-plan">{plan.readings.map((entry:any)=><details className="admin-workspace-details" key={entry.sign}><AdminDisclosureSummary>{horoscopeSignLabel(entry.sign)} · {horoscopeSignLabel(entry.anchor.planet)} in {horoscopeSignLabel(entry.anchor.sign)} · House {entry.house}</AdminDisclosureSummary><p>{entry.outline}</p><p>{entry.domain}</p><dl>{Object.entries(entry.argument).filter(([key,value])=>['thesis','transit_job','recognition','complication','response','scope_guard'].includes(key)&&typeof value==='string').map(([key,value])=><div key={key}><dt>{key.replaceAll('_',' ')}</dt><dd>{String(value)}</dd></div>)}</dl></details>)}</div>
            <label><input type="checkbox" checked={planApproved} disabled={locked} onChange={e=>setPlanApproved(e.target.checked)}/> I approve this writing plan for generation.</label>
            {!configured&&<p role="alert">The AI writer needs its server API key before generation can start.</p>}
          </>}
          {active&&<p>A request for {horoscopeSignLabel(active.sign)} is saved. Resume to retrieve it.</p>}
          {complete+empty<12&&<p>{12-complete-empty} partially written readings need your edits in Read &amp; edit. Generation preserves their existing text.</p>}
          <div className="admin-toolbar-actions"><StudioButton className="admin-primary-button" disabled={busy||dirty||!saved||saved.status==='LIVE'||(!active&&(!planApproved||!configured||empty===0))} onClick={()=>void generate()}>{active?'Resume generation':empty===12?'Generate 12 drafts':'Generate missing readings'}</StudioButton>{busy&&running.current&&<StudioButton onClick={()=>{stop.current=true;setMessage('Pausing after the current request. Its progress remains saved.');}}>Pause generation</StudioButton>}</div>
          {progress&&<p role="status">{progress}</p>}
          {active&&Date.now()-Date.parse(active.startedAt)>=310000&&<StudioButton disabled={busy} onClick={()=>void release()}>Release interrupted request</StudioButton>}
        </div>:step==='edit'?<div className="admin-panel">
          <div className="admin-writing-periods" role="group" aria-label="Readings by sign">{draft.passages.map(p=><StudioButton key={p.sign} aria-pressed={sign===p.sign} onClick={()=>setSign(p.sign)}>{horoscopeSignLabel(p.sign)}{p.body.trim()&&p.headline.trim()?' ✓':''}</StudioButton>)}</div>
          {!passage.body&&<p>No reading for {horoscopeSignLabel(sign)} yet. Use Generate to draft missing signs, or write it here.</p>}
          {(saved?.source_snapshot?.horoscopeGeneration?.readings?.[sign]?.lint?.violations??[]).map((issue:any,index:number)=><p role="note" key={index}>Original AI draft check: {issue.detail}</p>)}
          <label className="admin-review-copy-editor"><span>Reading headline</span><StudioInput aria-label="Reading headline" value={passage.headline} maxLength={200} disabled={locked} onChange={e=>{setDraft({...draft,passages:draft.passages.map(p=>p.sign===sign?{...p,headline:e.target.value}:p)});setApproved(false);}}/></label>
          <label className="admin-review-copy-editor"><span>Complete reading</span><StudioTextarea aria-label="Complete reading" rows={12} value={passage.body} maxLength={20000} disabled={locked} onChange={e=>{setDraft({...draft,passages:draft.passages.map(p=>p.sign===sign?{...p,body:e.target.value}:p)});setApproved(false);}}/></label>
          <details className="admin-workspace-details"><AdminDisclosureSummary>Writing outline · editor only</AdminDisclosureSummary><StudioTextarea aria-label="Writing outline" rows={5} value={outlines[sign]??''} disabled={locked} onChange={e=>{setOutlines(current=>({...current,[sign]:e.target.value}));setApproved(false);}}/></details>
          <footer className="admin-writing-savebar"><div className="admin-writing-savebar-row"><span>{dirty?'Unsaved changes':'Saved draft'}</span><div className="admin-toolbar-actions"><StudioButton className="admin-primary-button" disabled={locked||!dirty} onClick={()=>void save()}>Save edition draft</StudioButton><StudioButton disabled={busy} onClick={()=>setStep('publish')}>Review for publication</StudioButton></div></div></footer>
        </div>:<div className="admin-panel">
          <p>{complete===12?'Read the complete edition below, then publish it.':`${12-complete} readings still need a headline and complete body. Return to Generate or Read & edit to finish.`}</p>
          {draft.passages.map(p=><section className="admin-hook-detail-section" key={p.sign} aria-label={`${horoscopeSignLabel(p.sign)} reading preview`}><h2>{horoscopeSignLabel(p.sign)}</h2><p>{p.headline}</p>{p.body?<div className="admin-copy-preview"><FormattedProse text={p.body}/></div>:<p>No reading written yet.</p>}</section>)}
          <footer className="admin-writing-savebar"><label><input type="checkbox" checked={approved} disabled={locked||dirty||complete!==12||!saved} onChange={e=>setApproved(e.target.checked)}/> I have reviewed and approve the exact wording of all twelve saved readings.</label><div className="admin-toolbar-actions"><StudioButton className="admin-primary-button" disabled={locked||dirty||!approved||!saved||saved.status==='LIVE'} onClick={()=>void save(true)}>{saved?.status==='LIVE'?'Published':'Publish edition'}</StudioButton>{saved?.status==='LIVE'&&<a href={horoscopeEditionReaderHref(saved.id,draft.window.period,sign)} target="_blank" rel="noreferrer">Read published edition</a>}</div></footer>
        </div>}
      </StudioTabs>
      <details className="admin-workspace-details"><AdminDisclosureSummary>Advanced · import, export and calculations</AdminDisclosureSummary>
        <div className="admin-toolbar-actions"><StudioButton disabled={busy} onClick={()=>download('horoscope-writing-brief.json',{schema:'horoscope-writing-request/v1',edition:draft,calculatedFacts:packet,writingProfile:profile,outlines,ownerApproved:false})}>Export writing brief</StudioButton><label>Import draft<StudioInput aria-label="Import horoscope draft" type="file" accept="application/json,.json" disabled={locked} onChange={e=>{void importDraft(e.target.files?.[0]);e.target.value='';}}/></label></div>
        <StudioTextarea aria-label="Calculated horoscope facts" readOnly rows={12} value={JSON.stringify(packet?.brief,null,2)}/>
      </details>
    </>}
  </section>;
}
