import {useEffect,useRef,useState} from 'react';
import {StudioButton,StudioInput,StudioTextarea} from './StudioControls';
import {AdminSelect,AdminDisclosureSummary} from './AdminNativeControls';
import {adminCredentialHeaders} from './adminSecret';
import {Stack,Grid,Text} from './studio-ds/primitives';

type Event={id:string;sign:string;title:string;startsAt:string;phase:string;eclipseType:string|null;timeZone:string};
type Row={id:string;headline:string;body:string;updated_at:string;facts:{lunationArticle:{event:Event}};source_snapshot:{lunationWriting:any}};
const endpoint='/api/admin/lunation-writing';
async function request(secret:string,body?:unknown,query='',signal?:AbortSignal) {
  const response=await fetch(endpoint+query,{method:body?'POST':'GET',headers:{...adminCredentialHeaders(secret),'content-type':'application/json'},
    cache:'no-store',signal:signal?AbortSignal.any([signal,AbortSignal.timeout(90000)]):AbortSignal.timeout(90000),...(body?{body:JSON.stringify(body)}:{})});
  const payload=await response.json().catch(()=>null);
  if(!response.ok||!payload?.ok)throw new Error(payload?.error??'The lunation request could not be confirmed. Refresh saved drafts before retrying.');
  return payload;
}
const displayTime=(event:Event)=>new Intl.DateTimeFormat('en-US',{timeZone:event.timeZone,dateStyle:'full',timeStyle:'short'}).format(new Date(event.startsAt));

export default function DatedLunationWritingStudio({secret,dirtyRef,onOpenContent,onEditGuidance}:{secret:string;dirtyRef:{current:boolean};onOpenContent:(key:string)=>Promise<void>;onEditGuidance:()=>void}) {
  const [month,setMonth]=useState(()=>{const today=new Date();return `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}`;});
  const [zone,setZone]=useState(()=>Intl.DateTimeFormat().resolvedOptions().timeZone||'America/New_York');
  const [kind,setKind]=useState(()=>{const phase=new URLSearchParams(window.location.hash.split('?')[1]??'').get('phase');return phase&&['new-moon','full-moon'].includes(phase)?phase:'all';}),[events,setEvents]=useState<Event[]>([]);
  const [eventsLoading,setEventsLoading]=useState(true),[eventsError,setEventsError]=useState(''),[eventReload,setEventReload]=useState(0);
  const [rows,setRows]=useState<Row[]>([]),[row,setRow]=useState<Row|null>(null);
  const [direction,setDirection]=useState(''),[headline,setHeadline]=useState(''),[body,setBody]=useState('');
  const [approved,setApproved]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
  const operation=useRef(false);
  const selectedDraft=useRef<HTMLElement>(null);
  const [focusDraft,setFocusDraft]=useState(0);
  const writing=row?.source_snapshot.lunationWriting;
  const proseChanged=!!row&&(body!==row.body||headline!==row.headline);
  const dirty=proseChanged||!!row&&direction!==writing?.direction;
  dirtyRef.current=dirty||busy;
  useEffect(()=>()=>{dirtyRef.current=false;},[dirtyRef]);
  useEffect(()=>{if(!dirty)return;const warn=(event:BeforeUnloadEvent)=>event.preventDefault();window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[dirty]);
  function accept(next:Row) {
    setRow(next);setHeadline(next.headline);setBody(next.body);setDirection(next.source_snapshot.lunationWriting.direction);setApproved(false);
    setRows(current=>[next,...current.filter(r=>r.id!==next.id)]);
  }
  async function run(work:()=>Promise<void>) {
    if(operation.current)return;operation.current=true;setBusy(true);setError('');setMessage('');
    try{await work();}catch(reason){setError((reason as Error).message);}finally{operation.current=false;setBusy(false);}
  }
  async function refresh() {
    const result=await request(secret);setRows(result.rows);
    if(row&&!dirty){const saved=result.rows.find((r:Row)=>r.id===row.id);if(saved)accept(saved);}
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
          if(!Array.isArray(result.events))throw new Error('The event list could not be loaded. Select Refresh events to try again.');
          if(!controller.signal.aborted)setEvents(result.events);
        })
        .catch(reason=>{if(!controller.signal.aborted)setEventsError(reason.message);})
        .finally(()=>{if(!controller.signal.aborted)setEventsLoading(false);});
    },300);
    return()=>{controller.abort();window.clearTimeout(timer);};
  },[secret,month,zone,eventReload]);
  useEffect(()=>{if(focusDraft){selectedDraft.current?.focus();selectedDraft.current?.scrollIntoView({block:'start'});}},[focusDraft]);
  function open(next:Row) {
    if(busy||dirty&&!window.confirm('Discard the unsaved changes to this draft?'))return;
    accept(next);setError('');setMessage('');setFocusDraft(value=>value+1);
  }
  async function act(action:string,extra:Record<string,unknown>={}) {
    if(!row)return;
    const result=await request(secret,{action,id:row.id,expectedUpdatedAt:row.updated_at,...extra});
    accept(result.rows[0]);
    if(action==='review'){setHeadline(headline);setBody(body);}
    setMessage(result.pending?'Writing is in progress. You can return later and retrieve this draft.':action==='save'?'Draft saved.':action==='poll'?'The complete draft is ready for your review.':'Writing plan updated.');
  }
  useEffect(()=>{
    if(!writing?.active?.responseId||busy||error)return;
    const timer=window.setTimeout(()=>void run(()=>act('poll')),3000);
    return()=>window.clearTimeout(timer);
  },[row?.updated_at,writing?.active?.responseId,busy,error]);
  const filteredEvents=events.filter(e=>kind==='all'||(kind==='eclipses'?!!e.eclipseType:!e.eclipseType&&e.phase===kind));
  const plan=writing?.preview;
  const notesChanged=!!row&&direction!==writing?.direction;
  return <section className="admin-template-page" aria-label="Lunation writing">
    <header className="admin-composition-detail-header"><div><h2>Dated articles &amp; eclipses</h2>
      <p>Choose a Moon or eclipse below, review its writing plan, then generate your article. Your saved writing guidance and lunar examples are included automatically.</p></div></header>
    <StudioButton disabled={busy} onClick={onEditGuidance}>Edit shared writing guidance</StudioButton>
    {error&&<p role="alert">{error}</p>}{message&&<p role="status">{message}</p>}
    <section className="studio-surface admin-editor-guidance" aria-label="Choose a lunation">
      <Stack gap="md"><h3>1. Choose a Moon or eclipse</h3><Grid className="admin-form-grid">
        <label><span>Month</span><StudioInput type="month" value={month} disabled={busy} onChange={e=>setMonth(e.target.value)} /></label>
        <label><span>Time zone</span><StudioInput value={zone} disabled={busy} onChange={e=>setZone(e.target.value)} /></label>
        <label><span>Event type</span><AdminSelect value={kind} disabled={busy} onChange={e=>setKind(e.target.value)}>
          <option value="all">All lunations</option><option value="new-moon">New Moons</option><option value="full-moon">Full Moons</option><option value="eclipses">Eclipses</option>
        </AdminSelect></label>
      </Grid>
      {eventsLoading&&<p role="status">Finding this month’s Moons and eclipses…</p>}
      {eventsError&&<p role="alert">{eventsError}</p>}
      {!eventsLoading&&!eventsError&&filteredEvents.map(event=><div className="admin-review-status-bar" key={event.id}>
        <StudioButton className="admin-primary-button" disabled={busy||dirty} onClick={()=>void run(async()=>{
          const result=await request(secret,{action:'prepare',month,timeZone:zone,eventId:event.id,direction:''});accept(result.rows[0]);
          setFocusDraft(value=>value+1);
          setMessage(result.existing?'Opened your saved draft.':'Writing plan ready. Review it below, then choose Generate draft.');
        })}>{rows.some(saved=>saved.facts.lunationArticle.event.id===event.id)?'Open':'Write'} {event.title}</StudioButton>
        <Text size="meta">{displayTime(event)} · {event.timeZone}</Text>
      </div>)}
      {!filteredEvents.length&&!eventsLoading&&!eventsError&&<Text>No matching events in this month. Choose another month or select All lunations.</Text>}
      <StudioButton disabled={busy||eventsLoading} onClick={()=>setEventReload(value=>value+1)}>Refresh events</StudioButton>
      {dirty&&<Text>Save your current draft before opening another event.</Text>}
      </Stack>
    </section>
    {row&&<section ref={selectedDraft} tabIndex={-1} className="studio-surface admin-editor-guidance" aria-label="Selected lunation draft"><Stack gap="md">
      <h3>{row.facts.lunationArticle.event.title}</h3><Text size="meta">{displayTime(row.facts.lunationArticle.event)} · {row.facts.lunationArticle.event.timeZone}</Text>
      <Text>{row.body?'3. Edit and save your article, then open the reader draft to review and publish.':'2. Review the plan below, check “I’ve reviewed this writing plan,” then choose Generate draft. Adding a writing direction is optional.'}</Text>
      {writing.lastError&&<p role="alert">{writing.lastError}</p>}
      {!row.body&&!writing.active&&<>
        <label><span>Writing direction (optional)</span><StudioTextarea value={direction} disabled={busy} maxLength={6000} onChange={e=>{setDirection(e.target.value);setApproved(false);}} placeholder="Describe the emphasis you want this article to explore." /></label>
        <StudioButton disabled={busy} onClick={()=>void run(()=>act('review',{direction}))}>Update writing plan</StudioButton>
      </>}
      {plan&&<details className="admin-workspace-details" open={!row.body}>
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
      {!row.body&&!writing.active&&<>
        <label><input type="checkbox" checked={approved} disabled={busy||notesChanged} onChange={e=>setApproved(e.target.checked)} /> I’ve reviewed this writing plan.</label>
        <Text size="meta">Generate draft makes one paid writing request using the configured model.</Text>
        <StudioButton className="admin-primary-button" disabled={busy||!approved||dirty} onClick={()=>void run(()=>act('generate',{approvedPlanHash:plan.planHash}))}>Generate draft</StudioButton>
        {proseChanged&&<Text>Save your article edits to keep this writing. Generation will not replace saved writing.</Text>}
      </>}
      {writing.active&&<>
        <StudioButton disabled={busy} onClick={()=>void run(()=>act('poll'))}>Retrieve draft</StudioButton>
        {!writing.active.responseId&&Date.now()-Date.parse(writing.active.startedAt)>310000&&<StudioButton disabled={busy} onClick={()=>{
          if(window.confirm('The previous request may have been billed. Release it only if you accept that its outcome is unknown.'))void run(()=>act('release',{acknowledgeUnknownOutcome:true}));
        }}>Release interrupted request</StudioButton>}
      </>}
      <label><span>Article title</span><StudioInput value={headline} disabled={busy||!!writing.active} onChange={e=>setHeadline(e.target.value)} maxLength={200} /></label>
      <label><span>Full article</span><StudioTextarea value={body} disabled={busy||!!writing.active} onChange={e=>setBody(e.target.value)} rows={18} maxLength={40000} /></label>
      {writing.lint?.violations?.length>0&&<div role="alert"><Text>Correct these errors before publishing:</Text><ul>{writing.lint.violations.map((v:any,i:number)=><li key={i}>{v.detail}</li>)}</ul></div>}
      <StudioButton disabled={busy||!!writing.active||dirty||!row.body.trim()} onClick={()=>void run(async()=>{
        const result=await request(secret,{action:'stage',id:row.id,expectedUpdatedAt:row.updated_at});
        const key=result.contentKey;
        await onOpenContent(key);
        setMessage(result.existing?'Opened the existing reader entry. Its saved writing was preserved.':'Copied the complete article to a reader draft. Review and publish it in the content editor.');
      })}>Open reader draft</StudioButton>
      <Text size="meta">The first opening copies your saved article into the content editor for review. Later openings preserve that editor’s changes. Publishing there updates the matching Calendar preview and full article together.</Text>
      <StudioButton disabled={busy||!!writing.active||!dirty||notesChanged||!headline.trim()} onClick={()=>void run(()=>act('save',{headline,body}))}>Save draft</StudioButton>
    </Stack></section>}
    <section className="studio-surface admin-editor-guidance" aria-label="Saved lunation drafts">
      <Stack gap="sm"><h3>Saved drafts</h3><StudioButton disabled={busy} onClick={()=>void run(refresh)}>Refresh saved drafts</StudioButton>
        {!rows.length&&<Text>No lunation drafts saved yet. Choose an event above to start.</Text>}
        {rows.map(saved=><div className="admin-review-status-bar" key={saved.id}><StudioButton disabled={busy} onClick={()=>open(saved)}>{saved.headline}</StudioButton>
          <Text size="meta">{displayTime(saved.facts.lunationArticle.event)} · {saved.source_snapshot.lunationWriting.active?'Writing in progress':'Draft'}</Text></div>)}
      </Stack>
    </section>
  </section>;
}
