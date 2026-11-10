import {useEffect,useRef,useState} from 'react';
import {AdminSelect,AdminDisclosureSummary} from './AdminNativeControls';
import {StudioButton,StudioInput,StudioTextarea} from './StudioControls';
import {Stack} from './studio-ds/primitives';
import {fetchWithOwnerSession} from './ownerSessionRequest';
import {browserTimeZone} from '../../web/src/services/timezones';
import {announceContentUpdate} from '../../web/src/services/contentUpdateSignal';
import {emptyMoonHoroscopes,moonDraftPrefix,moonWritingDraft,moonWritingDraftPayload} from './moonHoroscopeDraft';
import {MOON_HOROSCOPE_SIGNS,assertMoonHoroscopeRow,assertMoonHoroscopeSection,moonHoroscopeKey,moonHoroscopeBody,parseMoonHoroscopes,type MoonEvent,type MoonHoroscopeSection} from '../../../src/shared/datedLunationHoroscopes.mjs';

const endpoint='/api/admin/generated-content';
const pendingPasteMessage='Import or clear the pasted readings before saving.';
const label=(value:string)=>value[0].toUpperCase()+value.slice(1);
const eventLabel=(event:MoonEvent)=>`${event.title} · ${new Intl.DateTimeFormat('en-US',{timeZone:event.timeZone,dateStyle:'long',timeStyle:'short'}).format(new Date(event.startsAt))}`;
async function request(secret:string,url:string,body?:unknown,method='GET',signal?:AbortSignal){
  const timeout=AbortSignal.timeout(url==='/api/admin/sky-article-template-slots'?300000:60000);
  const response=await fetchWithOwnerSession(url,secret,{method,headers:{'content-type':'application/json'},cache:'no-store',signal:signal?AbortSignal.any([signal,timeout]):timeout,...(body?{body:JSON.stringify(body)}:{})});
  const data=await response.json().catch(()=>({error:'The server response could not be read.'}));
  if(!response.ok||data.ok!==true)throw new Error(data.error??'The Moon horoscopes could not be loaded.');
  return data;
}
export default function MoonHoroscopesStudio({secret,dirtyRef,requestedDraftId}:{secret:string;dirtyRef:{current:boolean};requestedDraftId?:string|null}){
  const [zone,setZone]=useState(browserTimeZone),[month,setMonth]=useState(()=>new Intl.DateTimeFormat('en-CA',{year:'numeric',month:'2-digit'}).format(new Date()));
  const [events,setEvents]=useState<MoonEvent[]>([]),[eventId,setEventId]=useState(''),[loading,setLoading]=useState(true),[retry,setRetry]=useState(0);
  const [working,setWorking]=useState<any>(null),[baseline,setBaseline]=useState('');
  const [opened,setOpened]=useState<MoonEvent|null>(null),[saved,setSaved]=useState<any>(null),[section,setSection]=useState<MoonHoroscopeSection|null>(null);
  const [paste,setPaste]=useState(''),[originalSource,setOriginalSource]=useState<string|null>(null),[sign,setSign]=useState('aries');
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState(''),[approved,setApproved]=useState(false);
  const [opening,setOpening]=useState(Boolean(requestedDraftId));
  const editor=useRef<HTMLHeadingElement>(null),publication=useRef<HTMLDivElement>(null);
  const running=useRef(false);
  const pendingPaste=Boolean(paste.trim());
  const archived=saved?.status==='ARCHIVED';
  const generationPending=working?.source_snapshot?.moonHoroscopeGeneration?.status==='running';
  const locked=busy||generationPending;
  const dirty=Boolean(pendingPaste||section&&JSON.stringify(section)!==baseline);
  useEffect(()=>{dirtyRef.current=dirty||locked;return()=>{dirtyRef.current=false;};},[dirty,locked,dirtyRef]);
  useEffect(()=>{
    if(!requestedDraftId)return;
    const abort=new AbortController();setOpening(true);
    request(secret,`${endpoint}?${new URLSearchParams({id:requestedDraftId,status:'all',visibility:'all'})}`,undefined,'GET',abort.signal)
      .then(async data=>{if(!abort.signal.aborted){if(!data.rows?.[0])throw new Error('This saved Moon horoscope set could not be found.');await loadSaved(data.rows[0]);}})
      .catch(reason=>{if(!abort.signal.aborted)setError(reason.message);})
      .finally(()=>{if(!abort.signal.aborted)setOpening(false);});
    return()=>abort.abort();
  },[secret,requestedDraftId]);
  useEffect(()=>{
    if(!dirty&&!generationPending)return;
    const warn=(event:BeforeUnloadEvent)=>event.preventDefault();
    window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);
  },[dirty,generationPending]);
  useEffect(()=>{
    const abort=new AbortController();setLoading(true);setError('');setEvents([]);
    request(secret,`/api/admin/lunation-writing?${new URLSearchParams({month,timeZone:zone})}`,undefined,'GET',abort.signal)
      .then(data=>{if(!abort.signal.aborted){setEvents(data.events);setEventId(data.events[0]?.id??'');}})
      .catch(reason=>{if(!abort.signal.aborted)setError(reason.message);})
      .finally(()=>{if(!abort.signal.aborted)setLoading(false);});
    return()=>abort.abort();
  },[secret,month,zone,retry]);
  async function run(action:()=>Promise<unknown>){if(running.current)return;running.current=true;setBusy(true);setError('');setMessage('');try{await action();}catch(reason){setError((reason as Error).message);}finally{running.current=false;setBusy(false);}}
  function accept(row:any){
    if(!row.content_key?.startsWith('cms/lunation-horoscopes/'))throw new Error('This is not a dated Moon horoscope set.');
    assertMoonHoroscopeRow(row);setWorking(null);setSaved(row);setOpened(row.facts.lunationHoroscopes.event);setSection(row.sections.articleHoroscopes);setBaseline(JSON.stringify(row.sections.articleHoroscopes));
    setOriginalSource(row.source_snapshot?.editorialImport?.originalSource??null);setPaste('');setApproved(false);
    window.history.replaceState(null,'',`${window.location.pathname}${window.location.search}#moon-horoscopes?${new URLSearchParams({draft:row.id})}`);
  }
  async function loadSaved(row:any){
    const draft=moonWritingDraft(row);
    if(!draft){accept(row);return;}
    let target=null;
    if(draft.target){
      const data=await request(secret,`${endpoint}?${new URLSearchParams({id:draft.target.id,status:'all',visibility:'all'})}`);
      const current=data.rows?.[0];
      if(!current||current.content_key!==moonHoroscopeKey(draft.event))throw new Error('The original Moon readings could not be loaded. Your draft is preserved.');
      target={...current,updated_at:draft.target.updatedAt};
    }
    setWorking(row);setSaved(target);setOpened(draft.event);setSection(draft.section);setBaseline(JSON.stringify(draft.section));
    setOriginalSource(draft.originalSource);setPaste('');setApproved(false);
    window.history.replaceState(null,'',`${window.location.pathname}${window.location.search}#moon-horoscopes?${new URLSearchParams({draft:row.id})}`);
  }
  async function open(event:MoonEvent){
    const [data,drafts]=await Promise.all([
      request(secret,`${endpoint}?${new URLSearchParams({contentKeys:moonHoroscopeKey(event),status:'all',visibility:'all',limit:'20'})}`),
      request(secret,`${endpoint}?${new URLSearchParams({contentKeyPrefix:moonDraftPrefix(event),status:'DRAFT',visibility:'all',limit:'100'})}`)
    ]);
    const rows=data.rows.filter((row:any)=>row.content_key===moonHoroscopeKey(event));
    const canonical=rows.find((row:any)=>row.mode==='article');
    const draftRows=await Promise.all(drafts.rows.filter((row:any)=>row.content_key?.startsWith(moonDraftPrefix(event))).map(async(row:any)=>row.inventory_only
      ?(await request(secret,`${endpoint}?${new URLSearchParams({id:row.id,status:'all',visibility:'all'})}`)).rows?.[0]:row));
    const raw=draftRows.filter((row:any)=>moonWritingDraft(row)&&!moonWritingDraft(row)!.compiledDraft).sort((a:any,b:any)=>(b.updated_at??'').localeCompare(a.updated_at??''))[0];
    const row=canonical?.status==='ARCHIVED'?canonical:raw??rows.find((row:any)=>row.mode==='studio-draft'&&row.status==='DRAFT')??canonical;
    if(row)await loadSaved(row);else{const empty=emptyMoonHoroscopes(event);setWorking(null);setSaved(null);setOpened(event);setSection(empty);setBaseline(JSON.stringify(empty));setPaste('');setOriginalSource(null);setApproved(false);}
    setSign('aries');requestAnimationFrame(()=>editor.current?.focus());
  }
  function review(){
    if(!opened)return;
    try{const parsed=parseMoonHoroscopes(paste,opened);setSection(parsed);setOriginalSource(paste);setPaste('');setSign('aries');setApproved(false);setError('');setMessage('12 signs imported.');}
    catch(reason){setError((reason as Error).message);}
  }
  async function save(forPublication=false){
    if(pendingPaste)throw new Error(pendingPasteMessage);
    if(!section||!opened)return;
    let complete=true;
    try{assertMoonHoroscopeSection(section,opened);}catch(reason){if(forPublication)throw reason;complete=false;}
    if(!complete){
      const body=moonWritingDraftPayload(opened,section,originalSource,saved,working);
      const result=await request(secret,endpoint,working?{...body,id:working.id,expectedUpdatedAt:working.updated_at}:body,working?'PATCH':'POST');
      const row=result.rows?.[0],draft=moonWritingDraft(row);
      if(!draft||JSON.stringify(draft.section)!==JSON.stringify(section))throw new Error('Save not confirmed. Your writing is preserved.');
      setWorking(row);setBaseline(JSON.stringify(section));setApproved(false);
      window.history.replaceState(null,'',`${window.location.pathname}${window.location.search}#moon-horoscopes?${new URLSearchParams({draft:row.id})}`);
      setMessage('Draft saved.');return row;
    }
    const sourceSnapshot={...saved?.source_snapshot,...(working?.source_snapshot?.moonHoroscopeGeneration?{moonHoroscopeGeneration:working.source_snapshot.moonHoroscopeGeneration}:{}),...(originalSource!==null?{editorialImport:{schema:'moon-horoscope-import/v1',originalSource,importedAt:saved?.source_snapshot?.editorialImport?.originalSource===originalSource?saved.source_snapshot.editorialImport.importedAt:new Date().toISOString(),readerFields:['sections.articleHoroscopes.passages[].heading','sections.articleHoroscopes.passages[].body']}}:{})};
    const body={...(saved?{id:saved.id,expectedUpdatedAt:saved.updated_at}:{contentKey:moonHoroscopeKey(opened),surface:'sky',mode:'article',eventType:'lunation-horoscopes',targetDate:null,provider:'manual-admin'}),
      status:'DRAFT',lane:saved?.mode==='studio-draft'?'reference':'serving',reviewState:null,headline:`${opened.title} horoscopes`,summary:'',body:moonHoroscopeBody(section),sections:{articleHoroscopes:section},facts:{lunationHoroscopes:{event:opened}},sourceSnapshot};
    const result=await request(secret,endpoint,body,saved?'PATCH':'POST');
    const row=result.rows?.[0];
    if(!row||row.content_key!==moonHoroscopeKey(opened)||JSON.stringify(row.sections?.articleHoroscopes?.passages.map((p:any)=>[p.risingSign,p.house,p.heading,p.body]))!==JSON.stringify(section.passages.map(p=>[p.risingSign,p.house,p.heading,p.body])))throw new Error('Save not confirmed. Your writing is preserved.');
    if(working){
      try{await request(secret,endpoint,{id:working.id,expectedUpdatedAt:working.updated_at,sections:{moonWritingDraft:{...moonWritingDraft(working),compiledDraft:{id:row.id,updatedAt:row.updated_at}}}},'PATCH');}
      catch{/* Keep the exact recovery copy if its completion marker cannot be saved. */}
    }
    accept(row);setMessage('Draft saved.');return row;
  }
  async function publish(){
    if(!saved||dirty||!approved)return;
    const result=await request(secret,endpoint,{id:saved.id,expectedUpdatedAt:saved.updated_at,ownerAction:saved.event_type==='horoscope-edition-revision'?'publish-horoscope-edition-revision':'publish-owner-content'},'PATCH');
    const row=result.rows?.[0];
    if(!row||row.status!=='LIVE'||row.content_key!==saved.content_key||row.body!==saved.body)throw new Error('Publication not confirmed. Reload to check its status.');
    accept(row);announceContentUpdate({contentKey:row.content_key,published:true,updatedAt:row.updated_at});setMessage('Published.');
  }
  async function archiveRevision(){
    const targetId=saved.source_snapshot.targetRowId;
    await request(secret,endpoint,{id:saved.id,expectedUpdatedAt:saved.updated_at,status:'ARCHIVED'},'PATCH');
    const data=await request(secret,`${endpoint}?${new URLSearchParams({id:targetId,status:'all',visibility:'all'})}`);
    if(!data.rows?.[0])throw new Error('The revision was archived. Reopen the Moon event to load its current readings.');
    accept(data.rows[0]);setMessage('Revision archived. Published readings loaded.');
  }
  async function lifecycle(){
    const previous=saved,action=archived?'restore':'archive';
    const data=await request(secret,endpoint,{id:previous.id,expectedUpdatedAt:previous.updated_at,sourceLifecycleAction:action},'PATCH');
    const row=data.rows?.[0];
    if(row?.id!==previous.id||row.status!==(action==='archive'?'ARCHIVED':'DRAFT')||row.body!==previous.body)throw new Error('Save not confirmed. Your writing is preserved.');
    accept(row);announceContentUpdate({contentKey:row.content_key,published:false,updatedAt:row.updated_at});
    setMessage(action==='archive'?'Archived. Readings are no longer published.':'Restored as a private draft.');
  }
  const selected=events.find(event=>event.id===eventId),passage=section?.passages.find(p=>p.risingSign===sign);
  const complete=section?.passages.filter(p=>p.body.trim()).length??0;
  let publicationError='';
  if(section&&opened&&complete===12){try{assertMoonHoroscopeSection(section,opened);}catch(reason){publicationError=(reason as Error).message;}}
  const canSave=Boolean(section&&dirty&&!locked&&!archived&&!pendingPaste);
  const canPublish=Boolean(section&&complete===12&&!publicationError&&!locked&&!archived&&!pendingPaste&&(working||dirty||saved?.status!=='LIVE'));
  async function checkGeneration(action='status',row=working){
    if(!row)return;
    const result=await request(secret,'/api/admin/sky-article-template-slots',{moonHoroscopes:{id:row.id,expectedUpdatedAt:row.updated_at,action,...(action==='release'?{acknowledgeUnknownOutcome:true}:{})}},'POST');
    await loadSaved(result.rows[0]);
    setMessage(action==='release'?'Request released.':'Draft loaded.');
  }
  async function generate(){
    if(locked||archived||pendingPaste||complete===12)return;
    const row=await save();
    if(!row||!moonWritingDraft(row))throw new Error('Save a private draft first.');
    try{
      const result=await request(secret,'/api/admin/sky-article-template-slots',{moonHoroscopes:{id:row.id,expectedUpdatedAt:row.updated_at,action:'generate'}},'POST');
      await loadSaved(result.rows[0]);setMessage('AI drafts saved for review.');
    }catch(error){
      // A lost response must not expose a second paid dispatch. Read the durable
      // recovery row before enabling any further generation or editing.
      try{await checkGeneration('status',row);}catch{setWorking({...row,source_snapshot:{...row.source_snapshot,moonHoroscopeGeneration:{status:'running'}}});}
      throw error;
    }
  }
  async function preparePublication(){
    if(!canPublish)return;
    if((!saved||dirty||working)&&!await save(true))return;
    requestAnimationFrame(()=>{publication.current?.scrollIntoView({block:'nearest'});publication.current?.focus();});
  }
  function leave(){
    if(dirty&&!window.confirm('Leave these unsaved horoscope changes?'))return;
    setOpened(null);setWorking(null);setSaved(null);setSection(null);setBaseline('');setPaste('');setApproved(false);setError('');setMessage('');
    window.history.replaceState(null,'',`${window.location.pathname}${window.location.search}#moon-horoscopes`);
  }
  return <section className="admin-template-page studio-moon-horoscopes" aria-label="Dated Moon horoscopes">
    <header className="studio-sky-editor-toolbar">
      <div className="admin-toolbar-actions"><h2 ref={editor} tabIndex={-1}>{opened?opened.title:'Choose a Moon event'}</h2>{opened&&<span className="admin-editor-save-state">{busy?'Working…':archived?'Archived':dirty?'Unsaved changes':working?'Draft saved':saved?.status==='LIVE'?'Published':saved?'Draft saved':'Not saved'}</span>}</div>
      {opened&&<div className="admin-toolbar-actions"><StudioButton disabled={!canSave} onClick={()=>void run(()=>save())}>Save draft</StudioButton><StudioButton className="admin-primary-button" disabled={!canPublish} onClick={()=>void run(preparePublication)}>Publish</StudioButton></div>}
    </header>
    <Stack gap="lg">
      {error&&<p role="alert">{error}</p>}{message&&<p role="status">{message}</p>}
      {opening?<p role="status">Loading saved Moon horoscopes…</p>:!opened?<section className="studio-surface studio-section" aria-label="Choose a Moon event"><Stack gap="md">
        <label><span>Month</span><StudioInput type="month" value={month} disabled={busy} onChange={e=>setMonth(e.target.value)}/></label>
        <details className="studio-contained-disclosure"><AdminDisclosureSummary>Time zone · {zone}</AdminDisclosureSummary><label><span>Time zone</span><StudioInput value={zone} disabled={busy} onChange={e=>setZone(e.target.value)}/></label></details>
        {loading?<p role="status">Finding this month’s New and Full Moons…</p>:selected?<>
          <label><span>Moon event</span><AdminSelect aria-label="Moon event" value={eventId} disabled={busy} onChange={e=>setEventId(e.target.value)}>{events.map(event=><option key={event.id} value={event.id}>{eventLabel(event)}</option>)}</AdminSelect></label>
          <StudioButton className="admin-primary-button" disabled={busy} onClick={()=>void run(()=>open(selected))}>Open Moon horoscopes</StudioButton>
        </>:<><p>No events could be loaded for this month.</p><StudioButton disabled={busy} onClick={()=>setRetry(value=>value+1)}>Reload events</StudioButton></>}
      </Stack></section>:section&&<div className="studio-sky-editor-layout">
        <section className="studio-surface studio-section" aria-label="Moon horoscope editor"><Stack gap="md">
          <div className="studio-editor-context"><span>{eventLabel(opened)} · {opened.timeZone}</span><span>{complete}/12 complete</span></div>
          {!archived&&<div className="admin-toolbar-actions">
            {generationPending?<><span role="status">AI request awaiting confirmation</span><StudioButton disabled={busy} onClick={()=>void run(()=>checkGeneration())}>Check generation</StudioButton><StudioButton disabled={busy} onClick={()=>{if(window.confirm('Release this request? It may still incur a charge. A late result will not replace your writing.'))void run(()=>checkGeneration('release'));}}>Release request</StudioButton></>:<><StudioButton disabled={locked||pendingPaste||complete===12} onClick={()=>void run(generate)}>{busy?'Working…':complete===0?'Generate all 12':complete===12?'12 readings complete':`Generate ${12-complete} missing`}</StudioButton>{complete<12&&<span className="admin-field-hint">Paid AI · fills empty signs</span>}</>}
          </div>}
          <div className="studio-entry-editor">
            <label className="studio-entry-select"><span>Sign</span><AdminSelect aria-label="Moon horoscope sign" value={sign} disabled={busy} onChange={e=>setSign(e.target.value)}>{section.passages.map(p=><option key={p.risingSign} value={p.risingSign}>{label(p.risingSign)}{p.body.trim()?' ✓':''}</option>)}</AdminSelect></label>
            <nav className="studio-entry-navigation" aria-label="Moon readings by sign">{section.passages.map(p=><StudioButton key={p.risingSign} disabled={busy} aria-pressed={sign===p.risingSign} onClick={()=>setSign(p.risingSign)}>{label(p.risingSign)}{p.body.trim()?' ✓':''}</StudioButton>)}</nav>
            <div className="studio-entry-writing">{passage&&<>
              <h3>{label(sign)} / {label(sign)} Rising · House {passage.house}</h3>
              <label><span>Sign heading</span><StudioInput value={passage.heading} disabled={locked||archived} maxLength={200} onChange={e=>{setSection({...section,passages:section.passages.map(p=>p.risingSign===sign?{...p,heading:e.target.value}:p)});setApproved(false);}}/></label>
              <label className="admin-review-copy-editor"><span>Complete horoscope</span><StudioTextarea rows={8} value={passage.body} disabled={locked||archived} maxLength={20000} onChange={e=>{setSection({...section,passages:section.passages.map(p=>p.risingSign===sign?{...p,body:e.target.value}:p)});setApproved(false);}}/></label>
            </>}</div>
          </div>
          {!archived&&<details className="studio-contained-disclosure"><AdminDisclosureSummary>Import 12 readings</AdminDisclosureSummary><label><span>All twelve horoscopes</span><StudioTextarea formatting={false} rows={8} value={paste} disabled={locked} maxLength={240000} onChange={e=>{setPaste(e.target.value);setApproved(false);}}/></label><div className="admin-toolbar-actions"><StudioButton disabled={locked||!pendingPaste} onClick={review}>Import readings</StudioButton><StudioButton disabled={locked||!pendingPaste} onClick={()=>{setPaste('');setApproved(false);setError('');setMessage('');}}>Clear paste</StudioButton></div>{pendingPaste&&<span className="admin-field-hint">{pendingPasteMessage}</span>}</details>}
        </Stack></section>
        <aside className="studio-surface studio-section" aria-label="Moon horoscope settings"><Stack gap="md">
          <div ref={publication} tabIndex={-1} aria-label="Moon publication"><Stack gap="md"><h3>Publication</h3><span className="admin-editor-save-state">{archived?'Archived':working||saved?.status!=='LIVE'?'Private draft':'Published'}</span>
            {complete<12?<span className="admin-field-hint">Complete 12 signs to publish.</span>:publicationError?<p role="alert">{publicationError}</p>:null}
            {saved&&saved.status!=='LIVE'&&!working&&!archived&&<><label><input type="checkbox" checked={approved} disabled={busy||dirty} onChange={e=>setApproved(e.target.checked)}/> I approve all 12 saved readings.</label><StudioButton className="admin-primary-button" disabled={busy||dirty||!approved} onClick={()=>void run(publish)}>Publish Moon horoscopes</StudioButton></>}
          </Stack></div>
          <StudioButton disabled={busy} onClick={leave}>Choose another Moon</StudioButton>
          <details className="studio-contained-disclosure" aria-label="Moon horoscope actions"><AdminDisclosureSummary>More actions</AdminDisclosureSummary><Stack gap="sm">
            <StudioButton disabled={busy} onClick={()=>{if(dirty&&!window.confirm('Replace your unsaved edits with the saved version?'))return;void run(()=>open(opened));}}>Reload saved version</StudioButton>
            {saved?.event_type==='horoscope-edition-revision'&&<StudioButton disabled={busy||dirty||!!working} onClick={()=>{if(window.confirm('Archive this saved draft revision and open the current published readings?'))void run(archiveRevision);}}>Archive draft revision</StudioButton>}
            {saved?.mode==='article'&&<StudioButton className={archived?undefined:'admin-danger-button'} disabled={busy||dirty||!!working} onClick={()=>{if(!archived&&!window.confirm('Archive these twelve saved Moon readings and remove them from readers? The complete writing will be preserved.'))return;void run(lifecycle);}}>{archived?'Restore as draft':'Archive Moon horoscopes'}</StudioButton>}
          </Stack></details>
        </Stack></aside>
      </div>}
    </Stack>
  </section>;
}
