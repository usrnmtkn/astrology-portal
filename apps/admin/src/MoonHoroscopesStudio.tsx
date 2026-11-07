import {useEffect,useRef,useState} from 'react';
import {AdminSelect,AdminDisclosureSummary} from './AdminNativeControls';
import {StudioButton,StudioInput,StudioTextarea} from './StudioControls';
import {Stack,Grid} from './studio-ds/primitives';
import {fetchWithOwnerSession} from './ownerSessionRequest';
import {browserTimeZone} from '../../web/src/services/timezones';
import {announceContentUpdate} from '../../web/src/services/contentUpdateSignal';
import {MOON_HOROSCOPE_SIGNS,assertMoonHoroscopeRow,assertMoonHoroscopeSection,moonHoroscopeKey,moonHoroscopeBody,parseMoonHoroscopes,type MoonEvent,type MoonHoroscopeSection} from '../../../src/shared/datedLunationHoroscopes.mjs';

const endpoint='/api/admin/generated-content';
const pendingPasteMessage='Match and review the replacement paste, or clear it before saving.';
const label=(value:string)=>value[0].toUpperCase()+value.slice(1);
const eventLabel=(event:MoonEvent)=>`${event.title} · ${new Intl.DateTimeFormat('en-US',{timeZone:event.timeZone,dateStyle:'long',timeStyle:'short'}).format(new Date(event.startsAt))}`;
async function request(secret:string,url:string,body?:unknown,method='GET',signal?:AbortSignal){
  const response=await fetchWithOwnerSession(url,secret,{method,headers:{'content-type':'application/json'},cache:'no-store',signal:signal?AbortSignal.any([signal,AbortSignal.timeout(60000)]):AbortSignal.timeout(60000),...(body?{body:JSON.stringify(body)}:{})});
  const data=await response.json().catch(()=>({error:'The server response could not be read.'}));
  if(!response.ok||data.ok!==true)throw new Error(data.error??'The Moon horoscopes could not be loaded.');
  return data;
}
export default function MoonHoroscopesStudio({secret,dirtyRef,requestedDraftId}:{secret:string;dirtyRef:{current:boolean};requestedDraftId?:string|null}){
  const [zone,setZone]=useState(browserTimeZone),[month,setMonth]=useState(()=>new Intl.DateTimeFormat('en-CA',{year:'numeric',month:'2-digit'}).format(new Date()));
  const [events,setEvents]=useState<MoonEvent[]>([]),[eventId,setEventId]=useState(''),[loading,setLoading]=useState(true),[retry,setRetry]=useState(0);
  const [opened,setOpened]=useState<MoonEvent|null>(null),[saved,setSaved]=useState<any>(null),[section,setSection]=useState<MoonHoroscopeSection|null>(null);
  const [paste,setPaste]=useState(''),[originalSource,setOriginalSource]=useState<string|null>(null),[sign,setSign]=useState('aries');
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState(''),[approved,setApproved]=useState(false);
  const [opening,setOpening]=useState(Boolean(requestedDraftId));
  const editor=useRef<HTMLHeadingElement>(null);
  const pendingPaste=Boolean(paste.trim());
  const archived=saved?.status==='ARCHIVED';
  const dirty=Boolean(pendingPaste||section&&JSON.stringify(section)!==JSON.stringify(saved?.sections?.articleHoroscopes));
  useEffect(()=>{dirtyRef.current=dirty||busy;return()=>{dirtyRef.current=false;};},[dirty,busy,dirtyRef]);
  useEffect(()=>{
    if(!requestedDraftId)return;
    const abort=new AbortController();setOpening(true);
    request(secret,`${endpoint}?${new URLSearchParams({id:requestedDraftId,status:'all',visibility:'all'})}`,undefined,'GET',abort.signal)
      .then(data=>{if(!abort.signal.aborted){if(!data.rows?.[0])throw new Error('This saved Moon horoscope set could not be found.');accept(data.rows[0]);}})
      .catch(reason=>{if(!abort.signal.aborted)setError(reason.message);})
      .finally(()=>{if(!abort.signal.aborted)setOpening(false);});
    return()=>abort.abort();
  },[secret,requestedDraftId]);
  useEffect(()=>{
    if(!dirty)return;
    const warn=(event:BeforeUnloadEvent)=>event.preventDefault();
    window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);
  },[dirty]);
  useEffect(()=>{
    const abort=new AbortController();setLoading(true);setError('');setEvents([]);
    request(secret,`/api/admin/lunation-writing?${new URLSearchParams({month,timeZone:zone})}`,undefined,'GET',abort.signal)
      .then(data=>{if(!abort.signal.aborted){setEvents(data.events);setEventId(data.events[0]?.id??'');}})
      .catch(reason=>{if(!abort.signal.aborted)setError(reason.message);})
      .finally(()=>{if(!abort.signal.aborted)setLoading(false);});
    return()=>abort.abort();
  },[secret,month,zone,retry]);
  async function run(action:()=>Promise<void>){setBusy(true);setError('');setMessage('');try{await action();}catch(reason){setError((reason as Error).message);}finally{setBusy(false);}}
  function accept(row:any){
    if(!row.content_key?.startsWith('cms/lunation-horoscopes/'))throw new Error('This is not a dated Moon horoscope set.');
    assertMoonHoroscopeRow(row);setSaved(row);setOpened(row.facts.lunationHoroscopes.event);setSection(row.sections.articleHoroscopes);
    setOriginalSource(row.source_snapshot?.editorialImport?.originalSource??null);setPaste('');setApproved(false);
    window.history.replaceState(null,'',`${window.location.pathname}${window.location.search}#moon-horoscopes?${new URLSearchParams({draft:row.id})}`);
  }
  async function open(event:MoonEvent){
    const data=await request(secret,`${endpoint}?${new URLSearchParams({contentKeys:moonHoroscopeKey(event),status:'all',visibility:'all',limit:'20'})}`);
    const rows=data.rows.filter((row:any)=>row.content_key===moonHoroscopeKey(event));
    const canonical=rows.find((row:any)=>row.mode==='article');
    const row=canonical?.status==='ARCHIVED'?canonical:rows.find((row:any)=>row.mode==='studio-draft'&&row.status==='DRAFT')??canonical;
    if(row)accept(row);else{setSaved(null);setOpened(event);setSection(null);setPaste('');setOriginalSource(null);setApproved(false);}
    setSign('aries');requestAnimationFrame(()=>editor.current?.focus());
  }
  function review(){
    if(!opened)return;
    try{const parsed=parseMoonHoroscopes(paste,opened);setSection(parsed);setOriginalSource(paste);setPaste('');setSign('aries');setApproved(false);setError('');setMessage('All twelve signs are matched. Review the complete readings below before saving.');}
    catch(reason){setError((reason as Error).message);}
  }
  async function save(){
    if(pendingPaste)throw new Error(pendingPasteMessage);
    if(!section||!opened)return;
    assertMoonHoroscopeSection(section,opened);
    const sourceSnapshot={...saved?.source_snapshot,...(originalSource!==null?{editorialImport:{schema:'moon-horoscope-import/v1',originalSource,importedAt:saved?.source_snapshot?.editorialImport?.originalSource===originalSource?saved.source_snapshot.editorialImport.importedAt:new Date().toISOString(),readerFields:['sections.articleHoroscopes.passages[].heading','sections.articleHoroscopes.passages[].body']}}:{})};
    const body={...(saved?{id:saved.id,expectedUpdatedAt:saved.updated_at}:{contentKey:moonHoroscopeKey(opened),surface:'sky',mode:'article',eventType:'lunation-horoscopes',targetDate:null,provider:'manual-admin'}),
      status:'DRAFT',lane:saved?.mode==='studio-draft'?'reference':'serving',reviewState:null,headline:`${opened.title} horoscopes`,summary:'',body:moonHoroscopeBody(section),sections:{articleHoroscopes:section},facts:{lunationHoroscopes:{event:opened}},sourceSnapshot};
    const result=await request(secret,endpoint,body,saved?'PATCH':'POST');
    const row=result.rows?.[0];
    if(!row||row.content_key!==moonHoroscopeKey(opened)||JSON.stringify(row.sections?.articleHoroscopes?.passages.map((p:any)=>[p.risingSign,p.house,p.heading,p.body]))!==JSON.stringify(section.passages.map(p=>[p.risingSign,p.house,p.heading,p.body])))throw new Error('Storage did not confirm your complete readings. Reload the saved version before retrying.');
    accept(row);setMessage('All twelve readings saved as a draft.');
  }
  async function publish(){
    if(!saved||dirty||!approved)return;
    const result=await request(secret,endpoint,{id:saved.id,expectedUpdatedAt:saved.updated_at,ownerAction:saved.event_type==='horoscope-edition-revision'?'publish-horoscope-edition-revision':'publish-owner-content'},'PATCH');
    const row=result.rows?.[0];
    if(!row||row.status!=='LIVE'||row.content_key!==saved.content_key||row.body!==saved.body)throw new Error('Publication was not confirmed. Reload the saved version to check its status.');
    accept(row);announceContentUpdate({contentKey:row.content_key,published:true,updatedAt:row.updated_at});setMessage('Published. These twelve readings are connected to this Moon event in the app.');
  }
  async function archiveRevision(){
    const targetId=saved.source_snapshot.targetRowId;
    await request(secret,endpoint,{id:saved.id,expectedUpdatedAt:saved.updated_at,status:'ARCHIVED'},'PATCH');
    const data=await request(secret,`${endpoint}?${new URLSearchParams({id:targetId,status:'all',visibility:'all'})}`);
    if(!data.rows?.[0])throw new Error('The revision was archived. Reopen the Moon event to load its current readings.');
    accept(data.rows[0]);setMessage('Draft revision archived. The current published readings are open.');
  }
  async function lifecycle(){
    const previous=saved,action=archived?'restore':'archive';
    const data=await request(secret,endpoint,{id:previous.id,expectedUpdatedAt:previous.updated_at,sourceLifecycleAction:action},'PATCH');
    const row=data.rows?.[0];
    if(row?.id!==previous.id||row.status!==(action==='archive'?'ARCHIVED':'DRAFT')||row.body!==previous.body)throw new Error('The saved state was not confirmed. Reload the saved version before retrying.');
    accept(row);announceContentUpdate({contentKey:row.content_key,published:false,updatedAt:row.updated_at});
    setMessage(action==='archive'?'Moon horoscopes archived. These readings are no longer published.':'Moon horoscopes restored as a draft. Review and publish when ready.');
  }
  const selected=events.find(event=>event.id===eventId),passage=section?.passages.find(p=>p.risingSign===sign);
  return <section className="admin-template-page" aria-label="Dated Moon horoscopes">
    <header className="admin-composition-detail-header"><div><h2 ref={editor} tabIndex={-1}>{opened?'Review your Moon horoscopes':'Choose a Moon event'}</h2><p>Paste all twelve sign readings for one dated Moon event, then review and publish them.</p></div></header>
    <Stack gap="lg">
      {error&&<p role="alert">{error}</p>}{message&&<p role="status">{message}</p>}
      {opening?<p role="status">Loading saved Moon horoscopes…</p>:!opened?<section className="studio-surface studio-section" aria-label="Choose a Moon event"><Stack gap="md">
        <Grid className="admin-form-grid"><label><span>Month</span><StudioInput type="month" value={month} disabled={busy} onChange={e=>setMonth(e.target.value)}/></label>
          <label><span>Time zone</span><StudioInput value={zone} disabled={busy} onChange={e=>setZone(e.target.value)}/></label></Grid>
        {loading?<p role="status">Finding this month’s New and Full Moons…</p>:selected?<>
          <label><span>Moon event</span><AdminSelect aria-label="Moon event" value={eventId} disabled={busy} onChange={e=>setEventId(e.target.value)}>{events.map(event=><option key={event.id} value={event.id}>{eventLabel(event)}</option>)}</AdminSelect></label>
          <p>{eventLabel(selected)} · {zone}</p><StudioButton className="admin-primary-button" disabled={busy} onClick={()=>void run(()=>open(selected))}>Open Moon horoscopes</StudioButton>
        </>:<><p>No events could be loaded for this month.</p><StudioButton disabled={busy} onClick={()=>setRetry(value=>value+1)}>Reload events</StudioButton></>}
      </Stack></section>:<>
        <section className="studio-surface studio-section" aria-label="Selected Moon event"><Stack gap="sm"><p>{eventLabel(opened)} · {opened.timeZone}</p>
          <p>{archived?'Archived · Complete readings preserved':saved?.status==='LIVE'&&!dirty?'Published':saved?.mode==='studio-draft'?'Draft revision · published readings remain available':saved?'Draft':'No saved readings yet'}</p>
          <div className="admin-toolbar-actions"><StudioButton disabled={busy} onClick={()=>{if(dirty&&!window.confirm('Leave these unsaved horoscope changes?'))return;setOpened(null);setSaved(null);setSection(null);setPaste('');setApproved(false);setError('');setMessage('');window.history.replaceState(null,'',`${window.location.pathname}${window.location.search}#moon-horoscopes`);}}>Choose another Moon</StudioButton>
            <StudioButton disabled={busy} onClick={()=>{if(dirty&&!window.confirm('Replace your unsaved edits with the saved version?'))return;void run(()=>open(opened));}}>Reload saved version</StudioButton></div>
          {saved?.event_type==='horoscope-edition-revision'&&<StudioButton disabled={busy||dirty} onClick={()=>{if(window.confirm('Archive this saved draft revision and open the current published readings?'))void run(archiveRevision);}}>Archive draft revision</StudioButton>}
          {saved?.mode==='article'&&<StudioButton className={archived?undefined:'admin-danger-button'} disabled={busy||dirty} onClick={()=>{if(!archived&&!window.confirm('Archive these twelve saved Moon readings and remove them from readers? The complete writing will be preserved.'))return;void run(lifecycle);}}>{archived?'Restore as draft':'Archive Moon horoscopes'}</StudioButton>}
        </Stack></section>
        {!section?<section className="studio-surface studio-section" aria-label="Paste Moon horoscopes"><Stack gap="md">
          <label><span>All twelve horoscopes</span><StudioTextarea formatting={false} rows={16} maxLength={240000} disabled={busy} value={paste} onChange={e=>setPaste(e.target.value)} placeholder={'Aries / Aries Rising\nYour complete reading…\n\nTaurus / Taurus Rising\nYour complete reading…'}/></label>
          <p>Include one heading for each sign, Aries through Pisces. Paragraphs and wording are preserved. Keep editorial notes outside the readings.</p>
          <StudioButton className="admin-primary-button" disabled={busy||!paste.trim()} onClick={review}>Match and review 12 signs</StudioButton>
        </Stack></section>:<section className="studio-surface studio-section" aria-label="Review twelve Moon horoscopes"><Stack gap="md">
          <p>12/12 signs matched · Houses are calculated from this Moon’s sign.</p>
          <div className="admin-horoscope-signs" role="group" aria-label="Moon readings by sign">{MOON_HOROSCOPE_SIGNS.map(value=><StudioButton key={value} disabled={busy} aria-pressed={sign===value} onClick={()=>setSign(value)}>{label(value)}</StudioButton>)}</div>
          {passage&&<><h3>{label(sign)} / {label(sign)} Rising · House {passage.house}</h3>
            <label className="admin-review-copy-editor"><span>Sign heading</span><StudioInput value={passage.heading} disabled={busy||archived} maxLength={200} onChange={e=>{setSection({...section,passages:section.passages.map(p=>p.risingSign===sign?{...p,heading:e.target.value}:p)});setApproved(false);}}/></label>
            <label className="admin-review-copy-editor"><span>Complete horoscope</span><StudioTextarea rows={14} value={passage.body} disabled={busy||archived} maxLength={20000} onChange={e=>{setSection({...section,passages:section.passages.map(p=>p.risingSign===sign?{...p,body:e.target.value}:p)});setApproved(false);}}/></label></>}
          {pendingPaste&&<p id="moon-horoscope-save-guidance">{pendingPasteMessage}</p>}
          <div className="admin-toolbar-actions"><StudioButton className="admin-primary-button" aria-describedby={pendingPaste?'moon-horoscope-save-guidance':undefined} disabled={busy||archived||pendingPaste||!dirty} onClick={()=>void run(save)}>Save 12 horoscopes as draft</StudioButton></div>
          {!archived&&<details className="admin-workspace-details"><AdminDisclosureSummary>Replace from a new paste</AdminDisclosureSummary><label><span>Replacement twelve horoscopes</span><StudioTextarea formatting={false} rows={10} value={paste} disabled={busy} maxLength={240000} onChange={e=>{setPaste(e.target.value);setApproved(false);}}/></label><div className="admin-toolbar-actions"><StudioButton disabled={busy||!pendingPaste} onClick={review}>Match and review replacement</StudioButton><StudioButton disabled={busy||!pendingPaste} onClick={()=>{setPaste('');setApproved(false);setError('');setMessage('');}}>Clear replacement paste</StudioButton></div></details>}
          {saved&&saved.status!=='LIVE'&&!archived&&<><label><input type="checkbox" checked={approved} disabled={busy||dirty} onChange={e=>setApproved(e.target.checked)}/> I approve the complete wording of all twelve saved readings for this Moon event.</label>
            <StudioButton className="admin-primary-button" disabled={busy||dirty||!approved} onClick={()=>void run(publish)}>Publish Moon horoscopes</StudioButton></>}
        </Stack></section>}
      </>}
    </Stack>
  </section>;
}
