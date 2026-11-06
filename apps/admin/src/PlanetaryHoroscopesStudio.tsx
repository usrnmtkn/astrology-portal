import {useEffect,useRef,useState} from 'react';
import {AdminSelect,AdminDisclosureSummary} from './AdminNativeControls';
import {StudioButton,StudioInput,StudioTextarea} from './StudioControls';
import {Stack,Grid} from './studio-ds/primitives';
import {fetchWithOwnerSession} from './ownerSessionRequest';
import {browserTimeZone} from '../../web/src/services/timezones';
import {announceContentUpdate} from '../../web/src/services/contentUpdateSignal';
import {HOROSCOPE_SIGNS,PLANETARY_HOROSCOPE_PLANETS,PLANETARY_HOROSCOPE_PREFIX,PLANETARY_DISPATCH_RECOVERY_DELAY_MS,planetaryEventTitle,planetaryReadingsBody,validatePlanetaryReadings,assertPlanetaryHoroscopeRow,horoscopeCanonicalJson,type PlanetaryEvent,type PlanetaryReadings} from '../../../src/shared/planetaryHoroscopes';

const endpoint='/api/admin/planetary-horoscope-writing';
const label=(value:string)=>value[0].toUpperCase()+value.slice(1);
const eventDates=(event:PlanetaryEvent)=>new Intl.DateTimeFormat('en-US',{dateStyle:'long',timeStyle:'short',timeZone:event.timeZone}).formatRange(new Date(event.startsAt),new Date(event.endsAt));
async function request(secret:string,url:string,body?:unknown,signal?:AbortSignal,method=body?'POST':'GET'){
  const response=await fetchWithOwnerSession(url,secret,{method,headers:{'content-type':'application/json'},cache:'no-store',
    signal:signal?AbortSignal.any([signal,AbortSignal.timeout(60000)]):AbortSignal.timeout(60000),...(body?{body:JSON.stringify(body)}:{})});
  const data=await response.json().catch(()=>({error:'The server response could not be read.'}));
  if(!response.ok||data.ok!==true)throw new Error(data.error??'The planetary horoscopes could not be loaded.');
  return data;
}
export default function PlanetaryHoroscopesStudio({secret,dirtyRef,requestedDraftId}:{secret:string;dirtyRef:{current:boolean};requestedDraftId?:string|null}){
  const [planet,setPlanet]=useState('mercury'),[date,setDate]=useState(()=>new Intl.DateTimeFormat('en-CA',{timeZone:browserTimeZone()}).format(new Date())),[zone,setZone]=useState(browserTimeZone);
  const [event,setEvent]=useState<PlanetaryEvent|null>(null),[saved,setSaved]=useState<any>(null),[readings,setReadings]=useState<PlanetaryReadings|null>(null);
  const [rows,setRows]=useState<any[]>([]),[listError,setListError]=useState(''),[loading,setLoading]=useState(true),[listRetry,setListRetry]=useState(0);
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState(''),[direction,setDirection]=useState(''),[sign,setSign]=useState('aries');
  const [planApproved,setPlanApproved]=useState(false),[approved,setApproved]=useState(false),[unknownApproved,setUnknownApproved]=useState(false),[clock,setClock]=useState(0);
  const mounted=useRef(true),heading=useRef<HTMLHeadingElement>(null);
  const g=saved?.source_snapshot?.planetaryGeneration,active=g?.active,opened=saved?.facts?.planetaryEvent?.event as PlanetaryEvent|undefined;
  const dirty=Boolean(saved&&(horoscopeCanonicalJson(readings)!==horoscopeCanonicalJson(saved.sections.planetaryHoroscopes)||direction!==(g?.direction??'')));
  const complete=Boolean(readings?.passages.every(p=>p.headline.trim()&&p.body.trim()));
  const hasWriting=Boolean(readings?.passages.some(p=>p.headline.trim()||p.body.trim()));
  const directionDirty=direction!==(g?.direction??'');
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
  useEffect(()=>{dirtyRef.current=dirty||busy;return()=>{dirtyRef.current=false;};},[dirty,busy,dirtyRef]);
  useEffect(()=>{if(!dirty&&!busy)return;const warn=(event:BeforeUnloadEvent)=>event.preventDefault();window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[dirty,busy]);
  function accept(row:any){
    if(!mounted.current)return;
    if(!row?.content_key?.startsWith(PLANETARY_HOROSCOPE_PREFIX))throw new Error('The saved response belongs to a different writing workspace.');
    assertPlanetaryHoroscopeRow(row);setSaved(row);setReadings(row.sections.planetaryHoroscopes);setDirection(row.source_snapshot?.planetaryGeneration?.direction??'');
    setRows(current=>[row,...current.filter(r=>r.id!==row.id&&!(row.status==='LIVE'&&r.content_key===row.content_key&&r.mode==='studio-draft'))]);setApproved(false);setPlanApproved(false);setUnknownApproved(false);
    window.history.replaceState(null,'',`${window.location.pathname}${window.location.search}#planetary-horoscopes?${new URLSearchParams({draft:row.id})}`);
  }
  async function run(action:()=>Promise<void>){setBusy(true);setError('');setMessage('');try{await action();}catch(reason){if(mounted.current)setError((reason as Error).message);}finally{if(mounted.current)setBusy(false);}}
  useEffect(()=>{
    if(!secret)return;
    const abort=new AbortController();setLoading(true);setListError('');
    request(secret,endpoint,undefined,abort.signal).then(data=>{if(!abort.signal.aborted)setRows(data.rows);})
      .catch(reason=>{if(!abort.signal.aborted)setListError(reason.message);}).finally(()=>{if(!abort.signal.aborted)setLoading(false);});
    return()=>abort.abort();
  },[secret,listRetry]);
  useEffect(()=>{
    if(!secret||!requestedDraftId)return;
    const abort=new AbortController();setBusy(true);
    request(secret,`${endpoint}?${new URLSearchParams({id:requestedDraftId})}`,undefined,abort.signal).then(data=>{if(!abort.signal.aborted){if(!data.rows?.[0])throw new Error('This planetary horoscope set could not be found.');accept(data.rows[0]);}})
      .catch(reason=>{if(!abort.signal.aborted)setError(reason.message);}).finally(()=>{if(!abort.signal.aborted)setBusy(false);});
    return()=>abort.abort();
  },[secret,requestedDraftId]);
  useEffect(()=>{
    if(!active?.responseId||busy)return;
    const abort=new AbortController();const timer=setTimeout(()=>{
      request(secret,endpoint,{action:'poll',id:saved.id,expectedUpdatedAt:saved.updated_at},abort.signal).then(data=>{
        if(abort.signal.aborted)return;accept(data.rows[0]);setClock(v=>v+1);if(!data.rows[0].source_snapshot?.planetaryGeneration?.active)setMessage('The saved writing request finished. Review the result below.');
      }).catch(reason=>{if(!abort.signal.aborted)setError(reason.message);});
    },3000);
    return()=>{clearTimeout(timer);abort.abort();};
  },[secret,saved?.id,saved?.updated_at,active?.responseId,busy,clock]);
  useEffect(()=>{if(!active||active.responseId)return;const timer=setTimeout(()=>setClock(v=>v+1),5000);return()=>clearTimeout(timer);},[active,clock]);
  async function openRow(id:string){
    const data=await request(secret,`${endpoint}?${new URLSearchParams({id})}`);
    if(!data.rows?.[0])throw new Error('This planetary horoscope set could not be found.');accept(data.rows[0]);setSign('aries');heading.current?.focus();
  }
  async function writingAction(action:string,extra:Record<string,unknown>={}){
    const data=await request(secret,endpoint,{action,id:saved.id,expectedUpdatedAt:saved.updated_at,...extra});
    accept(data.rows[0]);
  }
  async function save(){
    if(!saved||!readings||!opened)return;
    const checked=validatePlanetaryReadings(readings,opened);
    const data=await request(secret,'/api/admin/generated-content',{id:saved.id,expectedUpdatedAt:saved.updated_at,status:'DRAFT',
      body:planetaryReadingsBody(checked),sections:{planetaryHoroscopes:checked}},undefined,'PATCH');
    const row=data.rows?.[0];
    if(!row||horoscopeCanonicalJson(row.sections?.planetaryHoroscopes)!==horoscopeCanonicalJson(checked))throw new Error('Storage did not confirm all twelve complete readings. Reload before trying again.');
    accept(row);setMessage('All twelve readings are saved as a draft.');
  }
  async function publish(){
    if(!saved||dirty||!approved||active)return;
    const data=await request(secret,'/api/admin/generated-content',{id:saved.id,expectedUpdatedAt:saved.updated_at,
      ownerAction:saved.event_type==='horoscope-edition-revision'?'publish-horoscope-edition-revision':'publish-owner-content'},undefined,'PATCH');
    const row=data.rows?.[0];
    if(!row||row.status!=='LIVE'||row.content_key!==saved.content_key||row.body!==saved.body)throw new Error('Publication was not confirmed. Reload the saved version to check its status.');
    accept(row);announceContentUpdate({contentKey:row.content_key,published:true,updatedAt:row.updated_at});setMessage('Published. All twelve readings are connected to this planetary visit in Horoscopes → Planets.');
  }
  function leave(){if(dirty&&!window.confirm('Leave these unsaved planetary horoscope changes?'))return;setSaved(null);setReadings(null);setEvent(null);setError('');setMessage('');setDirection('');window.history.replaceState(null,'',`${window.location.pathname}${window.location.search}#planetary-horoscopes`);}
  const passage=readings?.passages.find(p=>p.sign===sign),plan=g?.plan;
  const unknown=active&&!active.responseId&&Date.now()-Date.parse(active.startedAt)>=PLANETARY_DISPATCH_RECOVERY_DELAY_MS;
  return <section className="admin-template-page" aria-label="Planetary horoscopes">
    <header className="admin-composition-detail-header"><div><h2 ref={heading} tabIndex={-1}>Planetary horoscopes</h2><p>Generate twelve sign and rising-sign readings for one calculated planet-in-sign visit, then review and publish them.</p></div></header>
    <Stack gap="lg">
      {error&&<p role="alert">{error}</p>}{message&&<p role="status">{message}</p>}
      {!saved?<section className="studio-surface studio-section" aria-label="Choose a planetary event"><Stack gap="md">
        <Grid className="admin-form-grid"><label><span>Planet</span><AdminSelect value={planet} disabled={busy} onChange={e=>{setPlanet(e.target.value);setEvent(null);}}>{PLANETARY_HOROSCOPE_PLANETS.map(p=><option key={p} value={p}>{label(p)}</option>)}</AdminSelect></label>
          <label><span>A date during the visit</span><StudioInput type="date" value={date} disabled={busy} onChange={e=>{setDate(e.target.value);setEvent(null);}}/></label>
          <label><span>Time zone</span><StudioInput value={zone} disabled={busy} onChange={e=>{setZone(e.target.value);setEvent(null);}}/></label></Grid>
        <StudioButton disabled={busy||!date||!zone} onClick={()=>void run(async()=>{const data=await request(secret,`${endpoint}?${new URLSearchParams({planet,date,timeZone:zone})}`);setEvent(data.event);})}>Find planetary event</StudioButton>
        {event&&<><p>{planetaryEventTitle(event)} · {eventDates(event)} · {event.timeZone}</p><p>Each sign gets its own calculated whole-sign house. A return visit has its own dated set.</p>
          <StudioButton className="admin-primary-button" disabled={busy} onClick={()=>void run(async()=>{const data=await request(secret,endpoint,{action:'open',planet,date,timeZone:zone});accept(data.rows[0]);setSign('aries');})}>Open planetary horoscopes</StudioButton></>}
      </Stack></section>:<>
        <section className="studio-surface studio-section" aria-label="Selected planetary event"><Stack gap="sm">
          <p>{planetaryEventTitle(opened!)} · {eventDates(opened!)} · {opened!.timeZone}</p>
          <p>{saved.status==='LIVE'&&!dirty?'Published':saved.mode==='studio-draft'?'Draft revision · published readings remain available':'Private draft · owner review required'}</p>
          {hasWriting&&g?.lastError&&<p role="alert">{g.lastError}</p>}
          <div className="admin-toolbar-actions"><StudioButton disabled={busy} onClick={leave}>Choose another event</StudioButton><StudioButton disabled={busy} onClick={()=>{if(dirty&&!window.confirm('Replace unsaved changes with the saved version?'))return;void run(()=>openRow(saved.id));}}>Reload saved version</StudioButton></div>
          {saved.event_type==='horoscope-edition-revision'&&<StudioButton disabled={busy||dirty||Boolean(active)} onClick={()=>{if(!window.confirm('Archive this draft revision and open the current published readings?'))return;void run(async()=>{const target=saved.source_snapshot.targetRowId;await request(secret,'/api/admin/generated-content',{id:saved.id,expectedUpdatedAt:saved.updated_at,status:'ARCHIVED'},undefined,'PATCH');await openRow(target);setMessage('Draft revision archived. Published readings are open.');});}}>Archive draft revision</StudioButton>}
          <details className="admin-workspace-details"><AdminDisclosureSummary>Writing request and saved responses</AdminDisclosureSummary><p>Download the private writing plan, complete response and any failure findings for this saved set.</p><StudioButton disabled={busy} onClick={()=>void run(async()=>{
            const data=await request(secret,endpoint,{action:'inspect',id:saved.id,expectedUpdatedAt:saved.updated_at});const url=URL.createObjectURL(new Blob([JSON.stringify(data.receipt,null,2)],{type:'application/json'}));
            const link=document.createElement('a');link.href=url;link.download=`planetary-horoscope-writing-${saved.id}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
          })}>Download private writing record</StudioButton></details>
        </Stack></section>
        {!hasWriting&&<section className="studio-surface studio-section" aria-label="Generate twelve planetary horoscopes"><Stack gap="md">
          <label><span>Direction for these readings</span><StudioTextarea rows={5} maxLength={10000} value={direction} disabled={busy||Boolean(active)} onChange={e=>{setDirection(e.target.value);setPlanApproved(false);}}/></label>
          <StudioButton disabled={busy||Boolean(active)} onClick={()=>void run(()=>writingAction('prepare',{direction}))}>Review writing plan</StudioButton>
          {plan&&<><p>{planetaryEventTitle(opened!)} · 12 readings · {plan.preview.model}</p><p>Complete owner writing supplies voice. The calculated event and each sign’s house supply facts. Generated wording stays private for your review.</p>
            <details className="admin-workspace-details"><AdminDisclosureSummary>Sign and house assignments</AdminDisclosureSummary><ul>{plan.preview.audiences.map((a:any)=><li key={a.sign}>{label(a.sign)} / {label(a.sign)} Rising · House {a.house}</li>)}</ul></details>
            <label><input type="checkbox" checked={planApproved} disabled={busy||dirty||Boolean(active)} onChange={e=>setPlanApproved(e.target.checked)}/> I have reviewed this event and authorize one AI request for all twelve draft readings.</label>
            <StudioButton className="admin-primary-button" disabled={busy||dirty||!planApproved||Boolean(active)} onClick={()=>void run(()=>writingAction('generate',{approvedPlanHash:plan.planHash}))}>Generate 12 planetary horoscopes</StudioButton></>}
          {active&&<p role="status">{active.responseId?'Writing all twelve drafts. You can return to this saved event while it finishes.':'Confirming the saved writing request. Reload before starting another request.'}</p>}
          {unknown&&<><label><input type="checkbox" checked={unknownApproved} onChange={e=>setUnknownApproved(e.target.checked)}/> I understand this unconfirmed request may have been billed and that releasing it does not retrieve its writing.</label><StudioButton disabled={busy||!unknownApproved} onClick={()=>void run(()=>writingAction('release',{acknowledgeUnknownOutcome:true}))}>Release unconfirmed request</StudioButton></>}
          {g?.lastError&&<p role="alert">{g.lastError}</p>}
          {active?.responseId&&error&&<StudioButton disabled={busy} onClick={()=>{setError('');setClock(v=>v+1);}}>Retrieve saved response again</StudioButton>}
        </Stack></section>}
        {readings&&<section className="studio-surface studio-section" aria-label="Review twelve planetary horoscopes"><Stack gap="md">
          <p>{readings.passages.filter(p=>p.headline.trim()&&p.body.trim()).length}/12 complete · Houses are calculated from the selected planetary sign.</p>
          {directionDirty&&<p>Review the writing plan to save your direction before editing readings.</p>}
          <div className="admin-horoscope-signs" role="group" aria-label="Planetary readings by sign">{HOROSCOPE_SIGNS.map(s=><StudioButton key={s} disabled={busy||Boolean(active)} aria-pressed={sign===s} onClick={()=>setSign(s)}>{label(s)}</StudioButton>)}</div>
          {passage&&<><h3>{label(sign)} / {label(sign)} Rising · House {passage.house}</h3><label className="admin-review-copy-editor"><span>Headline</span><StudioInput maxLength={200} value={passage.headline} disabled={busy||Boolean(active)||directionDirty} onChange={e=>{setReadings({...readings,passages:readings.passages.map(p=>p.sign===sign?{...p,headline:e.target.value}:p)});setApproved(false);}}/></label>
            <label className="admin-review-copy-editor"><span>Complete horoscope</span><StudioTextarea rows={14} maxLength={20000} value={passage.body} disabled={busy||Boolean(active)||directionDirty} onChange={e=>{setReadings({...readings,passages:readings.passages.map(p=>p.sign===sign?{...p,body:e.target.value}:p)});setApproved(false);}}/></label></>}
          <StudioButton className="admin-primary-button" disabled={busy||Boolean(active)||!dirty||direction!==(g?.direction??'')} onClick={()=>void run(save)}>Save 12 horoscopes as draft</StudioButton>
          {saved.status!=='LIVE'&&<><label><input type="checkbox" checked={approved} disabled={busy||dirty||!complete||Boolean(active)} onChange={e=>setApproved(e.target.checked)}/> I approve the complete wording of all twelve saved readings for this planetary event.</label><StudioButton className="admin-primary-button" disabled={busy||dirty||!complete||!approved||Boolean(active)} onClick={()=>void run(publish)}>Publish planetary horoscopes</StudioButton></>}
        </Stack></section>}
      </>}
      <details className="admin-workspace-details"><AdminDisclosureSummary>Recent saved planetary horoscope sets ({rows.length})</AdminDisclosureSummary><Stack gap="sm">
        {loading?<p role="status">Loading saved events…</p>:listError?<><p role="alert">{listError}</p><StudioButton onClick={()=>setListRetry(v=>v+1)}>Reload saved sets</StudioButton></>:rows.length?rows.map(row=><StudioButton key={row.id} disabled={busy} onClick={()=>{if(dirty&&!window.confirm('Leave unsaved changes and open this event?'))return;void run(()=>openRow(row.id));}}>{row.headline} · {row.facts.planetaryEvent.event.startsAt.slice(0,10)} · {row.status}</StudioButton>):<p>No saved planetary horoscope sets yet.</p>}
      </Stack></details>
    </Stack>
  </section>;
}
