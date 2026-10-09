import {useEffect,useState} from 'react';
import {StudioButton,StudioInput,StudioTabs,StudioTextarea} from './StudioControls';
import {AdminDisclosureSummary,AdminSelect} from './AdminNativeControls';
import {adminCredentialHeaders} from './adminSecret';
import {PageLoading} from '../../web/src/components/PageLoading';
import {LUNATION_SIGNS,LUNATION_PHASES,LUNATION_PROFILE_FIELDS,LUNATION_ARGUMENT_FIELDS,lunationContentKey} from '../../../src/astro-writing/lunationWritingIdentity.mjs';
import type {LunationProfile} from '../../../src/astro-writing/lunationWritingProfile.mjs';

const endpoint='/api/admin/calendar-lunation-writing';
const labels:Record<string,string>={voiceGuidance:'Voice and clarity',phaseContext:'New & Full Moon context',scopeGuidance:'Reader and intention',factsAndLinks:'Dates, variables and links',thesis:'Central thought',phase_context:'Lunar phase context',sign_meaning:'Meaning of the sign',recognition:'What the reader might recognize',intention_or_reflection:'Intention or reflection',journal_focus:'Journal focus',scope_guard:'What this reading must not assume'};
const title=(value:string)=>value.replace(/(^|-)([a-z])/gu,(_,prefix,letter)=>`${prefix?' ':''}${letter.toUpperCase()}`);
async function request(secret:string,body:any,signal?:AbortSignal) {
  const response=await fetch(endpoint,{method:'POST',headers:{...adminCredentialHeaders(secret),'content-type':'application/json'},body:JSON.stringify(body),cache:'no-store',signal:signal?AbortSignal.any([signal,AbortSignal.timeout(90000)]):AbortSignal.timeout(90000)});
  let data;try{data=await response.json();}catch{throw new Error('Studio returned an unreadable response. Reload before retrying.');}
  if(!response.ok||data.ok!==true)throw new Error(data.error??'The lunar workspace could not be loaded.');
  return data;
}
export default function LunationWritingStudio({secret,dirtyRef,onOpenContent}:{secret:string;dirtyRef:{current:boolean};onOpenContent:(key:string)=>Promise<void>}) {
  const initial=new URLSearchParams(window.location.hash.split('?')[1]??'');
  const [phase,setPhase]=useState(LUNATION_PHASES.includes(initial.get('phase')??'')?initial.get('phase')!:'new-moon');
  const [sign,setSign]=useState(LUNATION_SIGNS.includes(initial.get('sign')??'')?initial.get('sign')!:'aries');
  const [section,setSection]=useState('guidance');
  const [loaded,setLoaded]=useState<any>(null),[workspace,setWorkspace]=useState<any>(null),[profile,setProfile]=useState<LunationProfile|null>(null);
  const [plan,setPlan]=useState<any>(null),[authorized,setAuthorized]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState(''),[attempt,setAttempt]=useState(0);
  const workspaceDirty=Boolean(loaded&&JSON.stringify(workspace)!==JSON.stringify(loaded.workspace));
  const profileDirty=Boolean(loaded&&JSON.stringify(profile)!==JSON.stringify(loaded.profile.profile));
  const dirty=workspaceDirty||profileDirty;
  useEffect(()=>{dirtyRef.current=dirty;return()=>{dirtyRef.current=false;};},[dirty,dirtyRef]);
  const active=loaded?.row?.sections?.lunationRun?.active;
  useEffect(()=>{const controller=new AbortController();setBusy(true);setError('');setLoaded(null);setPlan(null);setAuthorized(false);
    void request(secret,{action:'load',phase,sign},controller.signal).then(data=>{if(!controller.signal.aborted){setLoaded(data);setWorkspace(data.workspace);setProfile(data.profile.profile);}}).catch(reason=>{if(!controller.signal.aborted)setError(reason.message);}).finally(()=>{if(!controller.signal.aborted)setBusy(false);});
    return()=>controller.abort();},[secret,phase,sign,attempt]);
  useEffect(()=>{if(!dirty)return;const warn=(event:BeforeUnloadEvent)=>event.preventDefault();window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[dirty]);
  function invalidate(){setPlan(null);setAuthorized(false);setMessage('');}
  function edit(field:string,value:any){setWorkspace((current:any)=>({...current,[field]:value}));invalidate();}
  function choose(kind:'phase'|'sign',value:string){
    if(dirty&&!window.confirm('Discard unsaved edits and open another lunar workspace?'))return;
    const params=new URLSearchParams(window.location.hash.split('?')[1]??'');
    params.set('phase',kind==='phase'?value:phase);params.set('sign',kind==='sign'?value:sign);
    window.history.replaceState(null,'',`${window.location.pathname}${window.location.search}#calendar-writeups?${params}`);
    kind==='phase'?setPhase(value):setSign(value);setMessage('');
  }
  async function action(name:string){
    setBusy(true);setError('');setMessage('');
    try{
      const data=await request(secret,{action:name,phase,sign,expectedUpdatedAt:name==='save-profile'?loaded.profile.updatedAt:loaded.row?.updated_at??null,
        ...(name==='save-profile'?{profile}:name==='save'?{workspace}:name==='generate'?{approvedPlanHash:plan.planHash,authorizeWriterCall:authorized}:{})});
      if(name==='save-profile'){setLoaded((current:any)=>({...current,profile:data.profile}));setProfile(data.profile.profile);invalidate();setMessage('Writing guidance saved.');}
      else if(name==='prepare'){setPlan(data.plan);setAuthorized(data.plan.previouslyApproved);setSection('plan');setMessage('Review the plan, calculated facts and writing evidence below.');}
      else {setLoaded((current:any)=>({...current,row:data.row,workspace:data.row.sections.lunationWorkspace}));setWorkspace(data.row.sections.lunationWorkspace);setPlan(null);setAuthorized(false);
        setMessage(data.pending?'The writer request is saved. Retrieve the draft to check the same request.':name==='save'?'Workspace saved.':'Draft saved for your review.');if(name!=='save')setSection('draft');}
    }catch(reason){setError((reason as Error).message);}finally{setBusy(false);}
  }
  const tabs=[{value:'guidance',label:'Writing guidance'},{value:'plan',label:'Plan & evidence'},{value:'draft',label:'Draft'},{value:'feedback',label:'Corrections'}];
  return <section className="admin-writing-workspace" aria-label="New and Full Moon writing">
    <div className="admin-writing-period-bar"><span>Lunar event</span><div className="admin-toolbar-actions">
      <label>Phase <AdminSelect aria-label="Phase" value={phase} disabled={busy} onChange={event=>choose('phase',event.target.value)}>{LUNATION_PHASES.map(value=><option key={value} value={value}>{title(value)}</option>)}</AdminSelect></label>
      <label>Sign <AdminSelect aria-label="Sign" value={sign} disabled={busy} onChange={event=>choose('sign',event.target.value)}>{LUNATION_SIGNS.map(value=><option key={value} value={value}>{title(value)}</option>)}</AdminSelect></label>
    </div></div>
    {error&&<p role="alert">{error}</p>}{message&&<p role="status">{message}</p>}
    {!loaded?busy?<PageLoading message="Loading lunar writing…"/>:<StudioButton onClick={()=>setAttempt(value=>value+1)}>Retry loading workspace</StudioButton>:<div className="admin-writing-profile">
      <header className="admin-writing-profile-header"><h2>{title(phase)} in {title(sign)}</h2><span className="admin-pill status-draft">{active?'Writing in progress':'Owner review'}</span>
        <p className="admin-field-hint">Content key: <code>{lunationContentKey(phase,sign)}</code></p>
        <p className="admin-field-hint">{loaded.configured?'Studio writer connected':'Writer unavailable on this server'} · Guidance revision {loaded.profile.revision}</p>
      </header>
      <StudioTabs label="Lunar writing sections" tabs={tabs} value={section} onValueChange={setSection}>
        {section==='guidance'&&<div className="admin-writing-field"><p>These shared instructions are used for reusable readings and dated New Moon, Full Moon and eclipse articles. Your saved edits are used when the plan is prepared.</p>
          {LUNATION_PROFILE_FIELDS.map(field=><label key={field}>{labels[field]}<StudioTextarea formatting={false} aria-label={labels[field]} value={profile![field]} rows={6} maxLength={12000} disabled={busy||Boolean(active)} onChange={event=>{setProfile(current=>({...current!,[field]:event.target.value}));invalidate();}}/></label>)}
          <StudioButton disabled={busy||Boolean(active)||Boolean(loaded.profile.id&&!profileDirty)} onClick={()=>void action('save-profile')}>Save writing guidance</StudioButton>
        </div>}
        {section==='plan'&&<div className="admin-writing-field"><p>Write the argument before generating prose. The reference date is checked against the ephemeris in the selected time zone.</p>
          <label>Event date <StudioInput type="date" value={workspace.referenceDate} disabled={busy||Boolean(active)} onChange={event=>edit('referenceDate',event.target.value)}/></label>
          <label>Time zone <StudioInput value={workspace.timeZone} disabled={busy||Boolean(active)} onChange={event=>edit('timeZone',event.target.value)}/></label>
          {LUNATION_ARGUMENT_FIELDS.map(field=><label key={field}>{labels[field]}<StudioTextarea formatting={false} aria-label={labels[field]} value={workspace.argumentInput[field]} rows={3} disabled={busy||Boolean(active)} onChange={event=>edit('argumentInput',{...workspace.argumentInput,[field]:event.target.value})}/></label>)}
          {(['broad_mechanism','chosen_expression'] as const).map(field=><label key={field}>{field==='broad_mechanism'?'Broader meaning':'Chosen example'}<StudioTextarea formatting={false} value={workspace.argumentInput.scope_breadth[field]} rows={2} disabled={busy||Boolean(active)} onChange={event=>edit('argumentInput',{...workspace.argumentInput,scope_breadth:{...workspace.argumentInput.scope_breadth,[field]:event.target.value}})}/></label>)}
          {workspace.argumentInput.scope_breadth.other_valid_expressions.map((value:string,index:number)=><label key={index}>Alternative example {index+1}<StudioInput value={value} disabled={busy||Boolean(active)} onChange={event=>edit('argumentInput',{...workspace.argumentInput,scope_breadth:{...workspace.argumentInput.scope_breadth,other_valid_expressions:workspace.argumentInput.scope_breadth.other_valid_expressions.map((text:string,i:number)=>i===index?event.target.value:text)}})}/></label>)}
          <div className="admin-toolbar-actions"><StudioButton disabled={busy||Boolean(active)||!workspaceDirty&&Boolean(loaded.row)} onClick={()=>void action('save')}>Save plan and draft</StudioButton><StudioButton disabled={busy||dirty||Boolean(active)||!loaded.row||!loaded.profile.id} onClick={()=>void action('prepare')}>Prepare writing plan</StudioButton></div>
          {plan&&<section className="admin-writing-preview" aria-label="Prepared lunar plan"><h3>Plan ready for review</h3>
            <p>{title(plan.facts.event.kind)} in {title(plan.facts.event.sign)} · {new Intl.DateTimeFormat('en-US',{dateStyle:'full',timeStyle:'short',timeZone:plan.facts.timeZone}).format(new Date(plan.facts.event.startsAt))} · {plan.facts.timeZone}</p>
            {plan.ownerPassages.map((passage:any)=><details key={passage.sourceId} className="admin-workspace-details"><AdminDisclosureSummary>{passage.sourceId}</AdminDisclosureSummary><p>{passage.text}</p><small>{passage.sourcePath} · {passage.sourceSha256}</small></details>)}
            <details className="admin-workspace-details"><AdminDisclosureSummary>Meaning, plan and source receipt</AdminDisclosureSummary><StudioTextarea formatting={false} readOnly aria-label="Prepared facts and plan" value={JSON.stringify({outline:plan.outline,facts:plan.facts,meaning:plan.meaning,receipt:plan.receipt},null,2)} rows={12}/></details>
            {plan.previouslyApproved?<p>Your approval of this exact plan and one writer call is saved.</p>:<label><StudioInput type="checkbox" checked={authorized} onChange={event=>setAuthorized(event.target.checked)}/> I approve this plan and one OpenAI writer call (gpt-5.6-sol, xhigh, up to 12,000 output tokens).</label>}
            <StudioButton disabled={busy||!authorized||!loaded.configured||dirty} onClick={()=>void action('generate')}>Generate one draft</StudioButton>
          </section>}
        </div>}
        {section==='draft'&&<div className="admin-writing-field"><p>Body and journal question stay here as an unpublished candidate. Open the content entry to review the reader version.</p>
          {active&&<><p>The saved request is {active.state}. Reloading does not start another call.</p><StudioButton disabled={busy} onClick={()=>void action('poll')}>Retrieve draft</StudioButton></>}
          {!workspace.body&&<p>No draft yet. Save the guidance and plan, then prepare the writing plan.</p>}
          <label>Body<StudioTextarea formatting={false} aria-label="Lunar draft body" value={workspace.body} rows={14} disabled={busy||Boolean(active)} onChange={event=>edit('body',event.target.value)}/></label>
          <label>Journal question<StudioTextarea formatting={false} aria-label="Lunar journal question" value={workspace.journalPrompt} rows={4} disabled={busy||Boolean(active)} onChange={event=>edit('journalPrompt',event.target.value)}/></label>
          <div className="admin-toolbar-actions"><StudioButton disabled={busy||Boolean(active)||!workspaceDirty} onClick={()=>void action('save')}>Save plan and draft</StudioButton><StudioButton disabled={busy||dirty} onClick={()=>void onOpenContent(workspace.contentKey).catch(reason=>setError(reason.message))}>Open content entry</StudioButton></div>
          {loaded.row?.sections?.lunationRun?.lastResult&&<details className="admin-workspace-details"><AdminDisclosureSummary>Generation receipt and checks</AdminDisclosureSummary><StudioTextarea formatting={false} readOnly aria-label="Lunar generation receipt" value={JSON.stringify(loaded.row.sections.lunationRun.lastResult,null,2)} rows={10}/></details>}
        </div>}
        {section==='feedback'&&<div className="admin-writing-field"><p>These private corrections apply to this exact content key. Rejected writing is excluded from positive voice evidence.</p>
          {!loaded.feedback.length?<p>No saved corrections for this key.</p>:loaded.feedback.map((item:any)=><details className="admin-workspace-details" key={item.id}><AdminDisclosureSummary>Correction · {item.status} · revision {item.version}</AdminDisclosureSummary><p>{item.owner_reason}</p><StudioTextarea formatting={false} readOnly aria-label="Complete rejected passage" value={item.rejected_text} rows={10}/><small>{item.source_uri}</small></details>)}
        </div>}
      </StudioTabs>
      <footer className="admin-writing-savebar"><div className="admin-writing-savebar-row"><span>{dirty?'Unsaved changes':loaded.row?'Workspace saved':'New workspace'}</span><StudioButton disabled={busy} onClick={()=>{if(!dirty||window.confirm('Discard unsaved edits and load the saved version?'))setAttempt(value=>value+1);}}>Reload saved workspace</StudioButton></div></footer>
    </div>}
  </section>;
}
