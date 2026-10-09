import {useEffect,useState} from 'react';
import {StudioButton,StudioInput,StudioTabs,StudioTextarea} from './StudioControls';
import {AdminDisclosureSummary} from './AdminNativeControls';
import {adminCredentialHeaders} from './adminSecret';
import {PageLoading} from '../../web/src/components/PageLoading';
const labels:Record<string,string>={instructions:'Writer instructions',calendarExamples:'Calendar references',bookExamples:'Book references',rejectedExamples:'Rejected writing and owner corrections',outputGuidance:'Length and output'};
async function request(secret:string,body:any,signal?:AbortSignal){
  const response=await fetch('/api/admin/calendar-daily-writing',{method:'POST',headers:{...adminCredentialHeaders(secret),'content-type':'application/json'},body:JSON.stringify(body),signal:signal?AbortSignal.any([signal,AbortSignal.timeout(90000)]):AbortSignal.timeout(90000)});
  const data=await response.json();
  if(!response.ok||data.ok!==true)throw new Error(data.error??'Daily writing could not be loaded.');
  return data;
}
export default function CalendarDailyWritingStudio({secret,dirtyRef}:{secret:string;dirtyRef:{current:boolean}}){
  const params=new URLSearchParams(window.location.hash.split('?')[1]??'');
  const [date,setDate]=useState(params.get('date')??new Intl.DateTimeFormat('en-CA').format(new Date()));
  const [timeZone,setTimeZone]=useState(params.get('timeZone')??Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [selected,setSelected]=useState({date,timeZone});
  const [loaded,setLoaded]=useState<any>(null),[profile,setProfile]=useState<any>(null),[workspace,setWorkspace]=useState<any>(null);
  const [section,setSection]=useState('references'),[prepared,setPrepared]=useState<any>(null),[authorized,setAuthorized]=useState(false);
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState(''),[reload,setReload]=useState(0);
  const profileDirty=Boolean(loaded&&JSON.stringify(profile)!==JSON.stringify(loaded.profileRow?.sections.profile??loaded.emptyProfile));
  const workspaceDirty=Boolean(loaded&&JSON.stringify(workspace)!==JSON.stringify(loaded.workspace));
  const dirty=profileDirty||workspaceDirty;
  const selectionChanged=date!==selected.date||timeZone!==selected.timeZone;
  const active=loaded?.row?.sections.run?.active;
  const results=loaded?.row?.sections.run?.results??[];
  useEffect(()=>{dirtyRef.current=dirty;return()=>{dirtyRef.current=false;};},[dirty,dirtyRef]);
  useEffect(()=>{if(!dirty)return;const warn=(e:BeforeUnloadEvent)=>e.preventDefault();window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[dirty]);
  useEffect(()=>{const controller=new AbortController();setLoaded(null);setBusy(true);setError('');setPrepared(null);setAuthorized(false);
    void request(secret,{action:'load',...selected},controller.signal).then(data=>{if(!controller.signal.aborted){setLoaded(data);setProfile(data.profileRow?.sections.profile??data.emptyProfile);setWorkspace(data.workspace);}}).catch(e=>{if(!controller.signal.aborted)setError(e.message);}).finally(()=>{if(!controller.signal.aborted)setBusy(false);});return()=>controller.abort();
  },[secret,selected,reload]);
  function invalidate(){setPrepared(null);setAuthorized(false);setMessage('');}
  async function action(name:string){
    setBusy(true);setError('');setMessage('');
    try{
      const data=await request(secret,{action:name,...selected,expectedUpdatedAt:name==='save-profile'?loaded.profileRow?.updated_at??null:loaded.row?.updated_at??null,
        ...(name==='save-profile'?{profile}:name==='save'?{workspace}:name==='generate'?{requestHash:prepared.requestHash,authorizeWriterCall:authorized}:{})});
      if(name==='save-profile'){setLoaded((v:any)=>({...v,profileRow:data.profileRow}));invalidate();setMessage('Daily writing references saved.');}
      else if(name==='prepare'){setPrepared(data.prepared);setAuthorized(false);setMessage('Review the complete input below. Preparing it makes no paid call.');}
      else{setLoaded((v:any)=>({...v,row:data.row,workspace:data.row.sections.workspace}));setWorkspace(data.row.sections.workspace);invalidate();setMessage(data.pending?'Request saved. Retrieve its result to check the same call.':data.invalid?'The writer did not return a complete passage. Its exact response is saved; no retry was made.':name==='save'?'Thought saved.':'Writer result saved for your review.');if(name!=='save')setSection('draft');}
    }catch(e){setError((e as Error).message);if(name==='generate'){setPrepared(null);setAuthorized(false);}}
    finally{setBusy(false);}
  }
  function openDate(){if(dirty&&!window.confirm('Discard unsaved edits and open another date?'))return;setSelected({date,timeZone});invalidate();const q=new URLSearchParams({view:'daily-writing',date,timeZone});window.history.replaceState(null,'',`${window.location.pathname}#calendar-writeups?${q}`);}
  return <section className="admin-writing-workspace" aria-label="Daily Calendar writing">
    <div className="admin-writing-period-bar"><span>Daily Calendar writing</span><div className="admin-toolbar-actions">
      <label>Date<StudioInput aria-label="Writing date" type="date" value={date} disabled={busy} onChange={e=>{setDate(e.target.value);invalidate();}}/></label>
      <label>Time zone<StudioInput aria-label="Writing time zone" value={timeZone} disabled={busy} onChange={e=>{setTimeZone(e.target.value);invalidate();}}/></label>
      <StudioButton disabled={busy||!date||!timeZone} onClick={openDate}>Open date</StudioButton>
    </div></div>
    {error&&<p role="alert">{error}</p>}{message&&<p role="status">{message}</p>}
    {!loaded?busy?<PageLoading message="Loading daily writing…"/>:<StudioButton onClick={()=>setReload(v=>v+1)}>Reload daily writing</StudioButton>:<div className="admin-writing-profile">
      <header className="admin-writing-profile-header"><h2>Daily Moon passage</h2><span className="admin-pill status-draft">Owner review</span>
        <p className="admin-field-hint">{selected.date} · {selected.timeZone} · {loaded.configured?'Writer connected':'Writer unavailable'}</p>
        <p>These private references and instructions guide daily drafting. Each generated passage stays here for your review.</p>
      </header>
      {selectionChanged&&<p role="status">Choose Open date to load the selected date before editing.</p>}
      <StudioTabs label="Daily writing sections" tabs={[{value:'references',label:'Instructions & references'},{value:'input',label:'Writer input'},{value:'draft',label:'Saved drafts'}]} value={section} onValueChange={setSection}>
        {section==='references'&&<div className="admin-writing-field">
          {Object.entries(labels).map(([field,label])=><label key={field}>{label}<StudioTextarea formatting={false} aria-label={label} rows={8} maxLength={30000} value={profile[field]} disabled={busy||selectionChanged} onChange={e=>{setProfile({...profile,[field]:e.target.value});invalidate();}}/></label>)}
          <StudioButton disabled={busy||!profileDirty&&Boolean(loaded.profileRow)||selectionChanged} onClick={()=>void action('save-profile')}>Save instructions and references</StudioButton>
          {loaded.profileRow?.sections.sourceReceipt&&<details className="admin-workspace-details"><AdminDisclosureSummary>Reference provenance</AdminDisclosureSummary><StudioTextarea formatting={false} readOnly aria-label="Reference provenance" rows={8} value={JSON.stringify(loaded.profileRow.sections.sourceReceipt,null,2)}/></details>}
          {loaded.profileRow?.sections.editorialRule&&<details className="admin-workspace-details"><AdminDisclosureSummary>Reviewed editorial rule</AdminDisclosureSummary><StudioTextarea formatting={false} readOnly aria-label="Reviewed editorial rule" rows={12} value={loaded.profileRow.sections.editorialRule}/><p>The writer uses the instructions shown above. This complete editorial reference is retained for your review.</p></details>}
        </div>}
        {section==='input'&&<div className="admin-writing-field">
          <label>Thought for this date<StudioTextarea formatting={false} aria-label="Thought for this date" rows={6} maxLength={12000} value={workspace.thought} disabled={busy||Boolean(active)||selectionChanged} onChange={e=>{setWorkspace({...workspace,thought:e.target.value});invalidate();}}/></label>
          <label>Exclusions for this date<StudioTextarea formatting={false} aria-label="Exclusions for this date" rows={5} maxLength={12000} value={workspace.exclusions} disabled={busy||Boolean(active)||selectionChanged} onChange={e=>{setWorkspace({...workspace,exclusions:e.target.value});invalidate();}}/></label>
          <div className="admin-toolbar-actions"><StudioButton disabled={busy||Boolean(active)||selectionChanged||!workspaceDirty&&Boolean(loaded.row)} onClick={()=>void action('save')}>Save thought</StudioButton><StudioButton disabled={busy||dirty||Boolean(active)||selectionChanged||!loaded.row||!loaded.profileRow} onClick={()=>void action('prepare')}>Preview writer input</StudioButton></div>
          {prepared&&<section className="admin-writing-preview" aria-label="Complete daily writer input">
            <h3>Input ready for review</h3><StudioTextarea formatting={false} readOnly aria-label="Complete writer input" rows={20} value={`${prepared.instructions}\n\n${prepared.request.input}`}/>
            <p>Request: <code>{prepared.requestHash}</code></p>
            <label><StudioInput type="checkbox" checked={authorized} onChange={e=>setAuthorized(e.target.checked)}/> I approve this thought and complete input, and authorize one writer call ({prepared.config.model}, {prepared.config.reasoningEffort}, up to {prepared.config.maxOutputTokens.toLocaleString()} output tokens).</label>
            <StudioButton disabled={busy||dirty||selectionChanged||!authorized||!loaded.configured} onClick={()=>void action('generate')}>Generate one draft</StudioButton>
          </section>}
        </div>}
        {section==='draft'&&<div className="admin-writing-field">
          {active&&<><p>A writer request is saved. Retrieval checks that same request without generating again.</p><StudioButton disabled={busy||selectionChanged} onClick={()=>void action('poll')}>Retrieve saved result</StudioButton></>}
          {!results.length&&<p>No writer results for this date yet.</p>}
          {[...results].reverse().map((result:any)=><section key={result.id} className="admin-writing-preview" aria-label="Saved first-pass result"><p>{result.completedAt} · {result.status==='invalid'?'Incomplete or invalid result':'Needs owner review'}</p><StudioTextarea formatting={false} readOnly aria-label="Untouched writer passage" value={result.candidate} rows={8}/><details className="admin-workspace-details"><AdminDisclosureSummary>Exact request, response and usage</AdminDisclosureSummary><StudioTextarea formatting={false} readOnly aria-label="Generation receipt" value={JSON.stringify(result,null,2)} rows={12}/></details></section>)}
        </div>}
      </StudioTabs>
      <footer className="admin-writing-savebar"><div className="admin-writing-savebar-row"><span>{dirty?'Unsaved changes':'Saved'}</span><StudioButton disabled={busy} onClick={()=>{if(!dirty||window.confirm('Discard unsaved edits and reload?'))setReload(v=>v+1);}}>Reload saved writing</StudioButton></div></footer>
    </div>}
  </section>;
}
