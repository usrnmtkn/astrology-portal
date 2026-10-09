import {useEffect,useRef,useState} from 'react';
import {StudioButton,StudioInput,StudioTextarea} from './StudioControls';
import {AdminSelect,AdminDisclosureSummary} from './AdminNativeControls';
import {adminCredentialHeaders} from './adminSecret';
import {Stack,Grid,Text} from './studio-ds/primitives';

type Event={id:string;sign:string;title:string;startsAt:string;phase:string;eclipseType:string|null;timeZone:string};
type Row={id:string;headline:string;body:string;updated_at:string;facts:{lunationArticle:{event:Event}};source_snapshot:{lunationWriting:any}};
class WritingRequestError extends Error {
  constructor(message:string,readonly rows:Row[]=[]){super(message);}
}
const endpoint='/api/admin/lunation-writing';
async function request(secret:string,body?:unknown,query='',signal?:AbortSignal) {
  const response=await fetch(endpoint+query,{method:body?'POST':'GET',headers:{...adminCredentialHeaders(secret),'content-type':'application/json'},
    cache:'no-store',signal:signal?AbortSignal.any([signal,AbortSignal.timeout(90000)]):AbortSignal.timeout(90000),...(body?{body:JSON.stringify(body)}:{})});
  const payload=await response.json().catch(()=>null);
  if(!response.ok||!payload?.ok)throw new WritingRequestError(payload?.error??'The lunation request could not be confirmed. Refresh saved drafts before retrying.',Array.isArray(payload?.rows)?payload.rows:[]);
  return payload;
}
const displayTime=(event:Event)=>new Intl.DateTimeFormat('en-US',{timeZone:event.timeZone,dateStyle:'full',timeStyle:'short'}).format(new Date(event.startsAt));

export default function DatedLunationWritingStudio({secret,dirtyRef,onOpenContent,onEditGuidance,requestedDraftId}:{secret:string;dirtyRef:{current:boolean};onOpenContent:(key:string)=>Promise<void>;onEditGuidance:()=>void;requestedDraftId?:string|null}) {
  const [month,setMonth]=useState(()=>{const today=new Date();return `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}`;});
  const [zone,setZone]=useState(()=>Intl.DateTimeFormat().resolvedOptions().timeZone||'America/New_York');
  const [kind,setKind]=useState(()=>{const phase=new URLSearchParams(window.location.hash.split('?')[1]??'').get('phase');return phase&&['new-moon','full-moon'].includes(phase)?phase:'all';}),[events,setEvents]=useState<Event[]>([]);
  const [eventsLoading,setEventsLoading]=useState(true),[eventsError,setEventsError]=useState(''),[eventReload,setEventReload]=useState(0);
  const [rows,setRows]=useState<Row[]>([]),[row,setRow]=useState<Row|null>(null);
  const [direction,setDirection]=useState(''),[headline,setHeadline]=useState(''),[body,setBody]=useState('');
  const [rejecting,setRejecting]=useState(false),[rejectionReason,setRejectionReason]=useState('');
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
  const [eventId,setEventId]=useState('');
  const operation=useRef(false);
  const selectedDraft=useRef<HTMLElement>(null);
  const draftList=useRef<HTMLElement>(null);
  const [focusList,setFocusList]=useState(0);
  const progress=useRef<HTMLDivElement>(null),article=useRef<HTMLTextAreaElement>(null);
  const [focusDraft,setFocusDraft]=useState(0);
  const [pollRetry,setPollRetry]=useState(0),[elapsed,setElapsed]=useState(0);
  const [focusArticle,setFocusArticle]=useState(0);
  const writing=row?.source_snapshot.lunationWriting;
  const proseChanged=!!row&&(body!==row.body||headline!==row.headline);
  const dirty=proseChanged||!!row&&direction!==writing?.direction;
  const unsaved=dirty||rejecting&&!!rejectionReason;
  const rejections=writing?.rejections??[];
  const generateLabel=rejections.length?'Regenerate draft':'Create draft';
  dirtyRef.current=unsaved||busy;
  useEffect(()=>()=>{dirtyRef.current=false;},[dirtyRef]);
  useEffect(()=>{if(!unsaved)return;const warn=(event:BeforeUnloadEvent)=>event.preventDefault();window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[unsaved]);
  function accept(next:Row) {
    setRow(next);setHeadline(next.headline);setBody(next.body);setDirection(next.source_snapshot.lunationWriting.direction);
    setRejecting(false);setRejectionReason('');
    setRows(current=>[next,...current.filter(r=>r.id!==next.id)]);
  }
  async function run(work:()=>Promise<void>) {
    if(operation.current)return;operation.current=true;setBusy(true);setError('');setMessage('');
    try{await work();}catch(reason){setError((reason as Error).message);}finally{operation.current=false;setBusy(false);}
  }
  async function refresh() {
    const result=await request(secret);setRows(result.rows);
    if(row&&!unsaved){
      const saved=result.rows.find((r:Row)=>r.id===row.id);
      if(saved){
        accept(saved);
        if(writing?.active&&!saved.source_snapshot.lunationWriting.active&&saved.body){
          setMessage('Your article is ready and saved as a draft. Review it below.');setFocusArticle(value=>value+1);
        }
      }
    }
  }
  useEffect(()=>{
    let cancelled=false;
    void request(secret).then(result=>{if(!cancelled)setRows(result.rows);})
      .catch(reason=>{if(!cancelled)setError(reason.message);});
    return()=>{cancelled=true;};
  },[secret]);
  useEffect(()=>{
    const controller=new AbortController();
    setEvents([]);setEventsLoading(true);setEventsError('');
    const timer=window.setTimeout(()=>{
      void request(secret,undefined,`?${new URLSearchParams({month,timeZone:zone})}`,controller.signal)
        .then(result=>{
          if(!Array.isArray(result.events))throw new Error('The event list could not be loaded. Try loading events again.');
          if(!controller.signal.aborted)setEvents(result.events);
        })
        .catch(reason=>{if(!controller.signal.aborted)setEventsError(reason.message);})
        .finally(()=>{if(!controller.signal.aborted)setEventsLoading(false);});
    },300);
    return()=>{controller.abort();window.clearTimeout(timer);};
  },[secret,month,zone,eventReload]);
  useEffect(()=>{if(focusDraft){selectedDraft.current?.focus();selectedDraft.current?.scrollIntoView({block:'start'});}},[focusDraft]);
  useEffect(()=>{if(focusList){draftList.current?.focus();draftList.current?.scrollIntoView({block:'start'});}},[focusList]);
  function backToDrafts() {
    if(busy||unsaved&&!window.confirm('Discard the unsaved changes to this draft?'))return;
    opening.current?.abort();setRow(null);setRejecting(false);setRejectionReason('');setError('');setMessage('');setFocusList(value=>value+1);
  }
  const opening=useRef<AbortController|null>(null);
  useEffect(()=>()=>opening.current?.abort(),[]);
  async function open(next:Pick<Row,'id'>) {
    if(busy||unsaved&&!window.confirm('Discard the unsaved changes to this draft?'))return;
    const controller=new AbortController();opening.current?.abort();opening.current=controller;
    await run(async()=>{
      const result=await request(secret,undefined,`?${new URLSearchParams({id:next.id})}`,controller.signal);
      if(controller.signal.aborted)return;
      const saved=result.rows?.[0];
      if(result.rows?.length!==1||saved?.id!==next.id||!saved.facts?.lunationArticle?.event||!saved.source_snapshot?.lunationWriting)throw new Error('This saved lunar draft could not be verified. Refresh saved drafts and try again.');
      accept(saved);setFocusDraft(value=>value+1);
    });
    if(opening.current===controller)opening.current=null;
  }
  useEffect(()=>{
    if(requestedDraftId)void open({id:requestedDraftId});
    return()=>opening.current?.abort();
  },[secret,requestedDraftId]);

  async function act(action:string,extra:Record<string,unknown>={}) {
    if(!row)return;
    const result=await request(secret,{action,id:row.id,expectedUpdatedAt:row.updated_at,...extra});
    accept(result.rows[0]);
    if(action==='review'){setHeadline(headline);setBody(body);}
    if(action==='reject')setFocusDraft(value=>value+1);
    setMessage(result.pending?'Writing is in progress. You can return later and retrieve this draft.':action==='save'?'Draft saved.':action==='poll'?'The complete draft is ready for your review.':action==='reject'?'Draft rejected and preserved. Review the updated plan, then select Regenerate draft.':'Writing plan updated.');
  }
  useEffect(()=>{
    if(!row||!writing?.active?.responseId||busy)return;
    const controller=new AbortController();
    let timer:number;
    const check=async()=>{
      try{
        const result=await request(secret,{action:'poll',id:row.id,expectedUpdatedAt:row.updated_at},'',controller.signal);
        if(controller.signal.aborted)return;
        if(result.pending){timer=window.setTimeout(check,5000);return;}
        accept(result.rows[0]);setError('');setMessage('Your article is ready and saved as a draft. Review it below.');
        setFocusArticle(value=>value+1);
      }catch(reason){
        if(controller.signal.aborted)return;
        // A terminal provider failure clears the saved request. Reconcile that
        // state as well as the error so the editor cannot get stuck retrieving it.
        if(reason instanceof WritingRequestError){
          const saved=reason.rows.find(saved=>saved.id===row.id);
          if(saved){accept(saved);setFocusDraft(value=>value+1);}
        }
        setMessage('');
        setError((reason as Error).message);
      }
    };
    timer=window.setTimeout(check,1000);
    return()=>{controller.abort();window.clearTimeout(timer);};
  },[secret,row?.id,row?.updated_at,writing?.active?.responseId,busy,pollRetry]);
  useEffect(()=>{
    if(!writing?.active)return;
    const update=()=>setElapsed(Math.max(0,Math.floor((Date.now()-Date.parse(writing.active.startedAt))/1000)));
    update();const timer=window.setInterval(update,1000);
    progress.current?.focus();progress.current?.scrollIntoView({block:'center'});
    return()=>window.clearInterval(timer);
  },[writing?.active?.id]);
  useEffect(()=>{if(focusArticle){article.current?.focus({preventScroll:true});selectedDraft.current?.scrollIntoView({block:'start'});}},[focusArticle]);
  const filteredEvents=events.filter(e=>kind==='all'||(kind==='eclipses'?!!e.eclipseType:!e.eclipseType&&e.phase===kind));
  const selectedEvent=filteredEvents.find(event=>event.id===eventId)??filteredEvents[0];
  const existingEvent=selectedEvent&&rows.some(saved=>saved.facts.lunationArticle.event.id===selectedEvent.id);
  const plan=writing?.preview;
  const notesChanged=!!row&&direction!==writing?.direction;
  async function stage() {
    if(!row)return;
    const result=await request(secret,{action:'stage',id:row.id,expectedUpdatedAt:row.updated_at});
    await onOpenContent(result.contentKey);
    setMessage(result.existing?'Opened the existing reader entry. Its saved writing was preserved.':'Copied the complete article to a reader draft. Review and publish it in the content editor.');
  }
  const editor=<>
    <label><span>Article title</span><StudioInput value={headline} disabled={busy} onChange={e=>setHeadline(e.target.value)} maxLength={200} /></label>
    <label><span>Full article</span><StudioTextarea ref={article} value={body} disabled={busy} onChange={e=>setBody(e.target.value)} rows={18} maxLength={40000} /></label>
  </>;
  return <section className="admin-template-page" aria-label="Lunation writing">
    <header className="admin-composition-detail-header"><div><h2>Dated articles &amp; eclipses</h2>
      {!row&&<p>Create a draft for a Moon or eclipse, or open one you have already saved.</p>}</div></header>
    {!row?<>
      {error&&<p role="alert">{error}</p>}
      <section ref={draftList} tabIndex={-1} className="studio-surface admin-editor-guidance" aria-label="Choose a lunation">
        <Stack gap="md"><h3>Create a new draft</h3><Grid className="admin-form-grid">
          <label><span>Month</span><StudioInput type="month" value={month} disabled={busy} onChange={e=>setMonth(e.target.value)} /></label>
          <label><span>Time zone</span><StudioInput value={zone} disabled={busy} onChange={e=>setZone(e.target.value)} /></label>
          <label><span>Event type</span><AdminSelect value={kind} disabled={busy} onChange={e=>setKind(e.target.value)}>
            <option value="all">All lunations</option><option value="new-moon">New Moons</option><option value="full-moon">Full Moons</option><option value="eclipses">Eclipses</option>
          </AdminSelect></label>
        </Grid>
        {eventsLoading&&<p role="status">Finding this month’s Moons and eclipses…</p>}
        {eventsError&&<><p role="alert">{eventsError}</p><StudioButton disabled={busy} onClick={()=>setEventReload(value=>value+1)}>Try loading events again</StudioButton></>}
        {!eventsLoading&&!eventsError&&selectedEvent&&<>
          <label><span>Moon or eclipse</span><AdminSelect value={selectedEvent.id} disabled={busy} onChange={e=>setEventId(e.target.value)}>
            {filteredEvents.map(event=><option key={event.id} value={event.id}>{event.title}</option>)}
          </AdminSelect></label>
          <Text size="meta">{displayTime(selectedEvent)} · {selectedEvent.timeZone}</Text>
          <StudioButton className="admin-primary-button" disabled={busy} onClick={()=>void run(async()=>{
            const result=await request(secret,{action:'prepare',month,timeZone:zone,eventId:selectedEvent.id,direction:''});accept(result.rows[0]);
            setFocusDraft(value=>value+1);
          })}>{existingEvent?'Open saved draft':'Create new draft'}</StudioButton>
          {!existingEvent&&<Text size="meta">First, review the writing plan. Generation starts only when you choose Create draft.</Text>}
        </>}
        {!filteredEvents.length&&!eventsLoading&&!eventsError&&<Text>No matching events in this month. Choose another month or select All lunations.</Text>}
        </Stack>
      </section>
      <section className="studio-surface admin-editor-guidance" aria-label="Saved lunation drafts">
        <Stack gap="md"><h3>Saved drafts</h3>
          {error&&<StudioButton disabled={busy} onClick={()=>void run(refresh)}>Try loading drafts again</StudioButton>}
          {!rows.length&&<Text>No drafts yet. Choose a Moon or eclipse above to get started.</Text>}
          {rows.map(saved=><div className="admin-review-status-bar" key={saved.id}><StudioButton disabled={busy} onClick={()=>open(saved)}>{saved.headline}</StudioButton>
            <Text size="meta">{displayTime(saved.facts.lunationArticle.event)} · {saved.source_snapshot.lunationWriting.active?'Writing in progress':saved.body?'Draft ready':saved.source_snapshot.lunationWriting.rejections?.length?'Ready to regenerate':'Plan ready'}</Text></div>)}
        </Stack>
      </section>
      <details className="admin-workspace-details"><AdminDisclosureSummary>Writing settings</AdminDisclosureSummary>
        <div className="admin-toolbar-actions"><StudioButton disabled={busy} onClick={onEditGuidance}>Edit shared writing guidance</StudioButton>
          <StudioButton disabled={busy} onClick={()=>void run(refresh)}>Refresh saved drafts</StudioButton></div>
      </details>
    </>:<>
      <StudioButton disabled={busy} onClick={backToDrafts}>Back to drafts</StudioButton>
      <section ref={selectedDraft} tabIndex={-1} className="studio-surface admin-editor-guidance" aria-label="Selected lunation draft"><Stack gap="md">
        <h3>{row.facts.lunationArticle.event.title}</h3><Text size="meta">{displayTime(row.facts.lunationArticle.event)} · {row.facts.lunationArticle.event.timeZone}</Text>
        {!writing.active&&error&&<p role="alert">{error}</p>}
        {!writing.active&&message&&<p role="status">{message}</p>}
        {writing.lastError&&writing.lastError!==error&&<p role="alert">{writing.lastError}</p>}
        {!row.body&&!writing.active&&plan&&<>
          <Text>{rejections.length?'Your feedback is saved. Review the replacement plan below.':'Review the writing plan below.'} {generateLabel} approves this plan and starts one paid writing request.</Text>
          <StudioButton className="admin-primary-button" disabled={busy||proseChanged&&!notesChanged} onClick={()=>void run(()=>notesChanged?act('review',{direction}):act('generate',{approvedPlanHash:plan.planHash}))}>{notesChanged?'Update writing plan':generateLabel}</StudioButton>
          {notesChanged&&<Text>Update the plan with your changes before creating the draft.</Text>}
          {proseChanged&&<Text>Save your manual draft below to keep your writing.</Text>}
          <details className="admin-workspace-details"><AdminDisclosureSummary>Adjust writing direction</AdminDisclosureSummary>
            <label><span>Writing direction (optional)</span><StudioTextarea formatting={false} value={direction} disabled={busy} maxLength={6000} onChange={e=>setDirection(e.target.value)} placeholder="Describe the emphasis you want this article to explore." /></label>
          </details>
        </>}
        {row.body&&!writing.active&&!rejecting&&<>
          <Text>Your draft is ready. Edit it below, or reject it and prepare a replacement.</Text>
          <div className="admin-toolbar-actions">
            {dirty?<StudioButton className="admin-primary-button" disabled={busy||notesChanged||!headline.trim()} onClick={()=>void run(()=>act('save',{headline,body}))}>Save draft</StudioButton>
              :<StudioButton className="admin-primary-button" disabled={busy||!row.body.trim()} onClick={()=>void run(stage)}>Review &amp; publish</StudioButton>}
            <StudioButton disabled={busy||dirty} onClick={()=>setRejecting(true)}>Reject &amp; regenerate</StudioButton>
          </div>
          {dirty&&<Text>Save your edits before rejecting so the complete draft is preserved.</Text>}
        </>}
        {rejecting&&!writing.active&&<>
          <label><span>Reason for rejection</span><StudioTextarea formatting={false} autoFocus required value={rejectionReason} disabled={busy} rows={5} maxLength={6000} onChange={e=>setRejectionReason(e.target.value)} /></label>
          <Text>Your original draft will be kept. Next, review the replacement plan before starting a new draft.</Text>
          <div className="admin-toolbar-actions"><StudioButton className="admin-primary-button" disabled={busy||dirty||!rejectionReason.trim()} onClick={()=>void run(()=>act('reject',{reason:rejectionReason}))}>Review replacement plan</StudioButton>
            <StudioButton disabled={busy} onClick={()=>{setRejecting(false);setRejectionReason('');}}>Cancel</StudioButton></div>
        </>}
      {writing.active&&<div ref={progress} tabIndex={-1} aria-label="Article generation progress"><Stack gap="sm">
        <p role="status">{error?'Progress checks paused.':writing.active.responseId?'Writing your new draft…':'Confirming your writing request…'}</p>
        <Text>{writing.active.responseId?'Your new draft is being written. It will appear here automatically. You can leave and return without starting it again.':'Your writing request is awaiting confirmation. Use Check again to check its saved status before retrying generation.'}</Text>
        <Text size="meta">Elapsed time: {Math.floor(elapsed/60)}m {elapsed%60}s. {error||!writing.active.responseId?'Use Check again to check the saved request.':'Checking automatically. This can take several minutes.'}</Text>
        {error&&<p role="alert">{error}</p>}
        {(error||!writing.active.responseId)&&<StudioButton disabled={busy} onClick={()=>void run(async()=>{
          await refresh();setPollRetry(value=>value+1);
        })}>Check again</StudioButton>}
        {!writing.active.responseId&&Date.now()-Date.parse(writing.active.startedAt)>310000&&<StudioButton disabled={busy} onClick={()=>{
          if(window.confirm('The previous request may have been billed. Release it only if you accept that its outcome is unknown.'))void run(()=>act('release',{acknowledgeUnknownOutcome:true}));
        }}>Release interrupted request</StudioButton>}
      </Stack></div>}
      {plan&&!writing.active&&!rejecting&&<details className="admin-workspace-details" open={!row.body}>
        <AdminDisclosureSummary>Writing plan and sources</AdminDisclosureSummary>
        <Stack gap="sm">
          {['thesis','transit_job','recognition','complication','response','scope_guard'].map(key=><p key={key}>{plan.argument[key]}</p>)}
          <details><AdminDisclosureSummary>Event-time astrology</AdminDisclosureSummary>
            <ul>{plan.positions.map((p:any)=><li key={p.planet}>{p.planet} in {p.sign} · {p.degree}° · {p.motion}</li>)}</ul>
            <ul>{plan.rulers.map((p:any)=><li key={p.rulesSign}>{p.planet} rules {p.rulesSign}</li>)}</ul>
            <ul>{plan.contacts.map((a:any,i:number)=><li key={i}>{a.from} {a.type} {a.to} · {a.orb}°{typeof a.applying==='boolean'?a.applying?' · Applying':' · Separating':''}</li>)}</ul>
          </details>
          <details><AdminDisclosureSummary>Writing approach</AdminDisclosureSummary>{plan.protocol.split('\n').map((p:string)=><p key={p}>{p}</p>)}</details>
          <details><AdminDisclosureSummary>Saved guidance and corrections</AdminDisclosureSummary><Text size="meta">Guidance revision {plan.writingProfile?.revision}</Text>{Object.entries(plan.writingProfile?.profile??{}).filter(([key])=>key!=='schema').map(([key,value])=><p key={key}>{String(value)}</p>)}{plan.corrections?.map((item:any)=><p key={item.id}>{item.owner_reason}</p>)}</details>
          <details><AdminDisclosureSummary>Your writing examples</AdminDisclosureSummary>{plan.voiceSources.map((source:any)=><blockquote key={source.id}><p>{source.text}</p><cite>{source.id}</cite></blockquote>)}</details>
        </Stack>
      </details>}
        {!writing.active&&!rejecting&&(row.body?editor:<details className="admin-workspace-details">
          <AdminDisclosureSummary>Write or paste a draft instead</AdminDisclosureSummary><Stack gap="md">{editor}
            <StudioButton className={proseChanged?'admin-primary-button':undefined} disabled={busy||!proseChanged||notesChanged||!headline.trim()} onClick={()=>void run(()=>act('save',{headline,body}))}>Save draft</StudioButton>
          </Stack></details>)}
        {!writing.active&&!rejecting&&writing.lint?.violations?.length>0&&<div role="alert"><Text>Correct these errors before publishing:</Text><ul>{writing.lint.violations.map((v:any,i:number)=><li key={i}>{v.detail}</li>)}</ul></div>}
      {!writing.active&&!rejecting&&rejections.length>0&&<details className="admin-workspace-details">
        <AdminDisclosureSummary>Rejected drafts ({rejections.length})</AdminDisclosureSummary>
        <Text>Previous versions are kept here with your reasons for rejection.</Text>
        {[...rejections].reverse().map((entry:any)=><details key={entry.id} className="admin-workspace-details">
          <AdminDisclosureSummary>{entry.headline} · {new Date(entry.rejectedAt).toLocaleString()}</AdminDisclosureSummary>
          <Text>{entry.reason}</Text>
          <label><span>Rejected article</span><StudioTextarea formatting={false} readOnly rows={10} value={entry.body} /></label>
        </details>)}
      </details>}
      </Stack></section>
    </>}
  </section>;
}
