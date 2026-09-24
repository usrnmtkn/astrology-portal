import {useEffect,useRef,useState} from 'react';
import {AdminSelect,AdminDisclosureSummary} from './AdminNativeControls';
import {StudioButton,StudioInput,StudioTextarea} from './StudioControls';
import {adminCredentialHeaders} from './adminSecret';
import {PageLoading} from '../../web/src/components/PageLoading';
import {FormattedProse} from '../../web/src/components/FormattedProse';
import {announceContentUpdate} from '../../web/src/services/contentUpdateSignal';
import {HOROSCOPE_SIGNS,HOROSCOPE_PERIODS,emptyHoroscopeEdition,validateHoroscopeEdition,horoscopeEditionKey,horoscopeEditionBody,horoscopeWindowLabel,horoscopeSignLabel,horoscopeCanonicalJson,type HoroscopeEdition,type HoroscopePeriod} from '../../web/src/content/horoscopeEditions.mjs';

const endpoint = '/api/admin/generated-content';
async function request(secret:string,url:string,body?:unknown,method='POST') {
  const response = await fetch(url,{method:body ? method:'GET',headers:{...adminCredentialHeaders(secret),'content-type':'application/json'},cache:'no-store',signal:AbortSignal.timeout(60000),...(body ? {body:JSON.stringify(body)}:{})});
  const data = await response.json();
  if (!response.ok || data.ok !== true) throw new Error(data.error ?? 'The edition could not be loaded.');
  return data;
}
function download(name:string,value:unknown) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value,null,2)+'\n'],{type:'application/json'}));
  const link = document.createElement('a'); link.href=url; link.download=name; link.click(); setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export default function HoroscopeEditionsStudio({secret}:{secret:string}) {
  const [rows,setRows]=useState<any[]>([]),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
  const [period,setPeriod]=useState<HoroscopePeriod>('weekly'),[date,setDate]=useState(()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York'}).format(new Date())),[zone,setZone]=useState('America/New_York');
  const [draft,setDraft]=useState<HoroscopeEdition|null>(null),[saved,setSaved]=useState<any>(null),[packet,setPacket]=useState<any>(null),[profile,setProfile]=useState<any>(null);
  const [outlines,setOutlines]=useState<Record<string,string>>({}),[sign,setSign]=useState('aries'),[approved,setApproved]=useState(false);
  const [editorialImport,setEditorialImport]=useState<Record<string,unknown>|null>(null);
  const mounted=useRef(true);
  const dirty=Boolean(draft && (!saved || horoscopeCanonicalJson(draft)!==horoscopeCanonicalJson(saved.sections.horoscopeEdition) || horoscopeCanonicalJson(outlines)!==horoscopeCanonicalJson(saved.source_snapshot?.horoscopeOutlines ?? {}) || horoscopeCanonicalJson(profile)!==horoscopeCanonicalJson(saved.source_snapshot?.studioWritingProfile ?? null) || horoscopeCanonicalJson(editorialImport)!==horoscopeCanonicalJson(saved.source_snapshot?.editorialImport ?? null)));
  async function load() {setLoading(true);try {const data=await request(secret,endpoint+'?horoscopeEditions=true');if(!Array.isArray(data.rows))throw new Error('The edition list could not be read.');for(const row of data.rows)validateHoroscopeEdition(row.sections?.horoscopeEdition);if(mounted.current)setRows(data.rows);}catch(reason){if(mounted.current)setError((reason as Error).message);}finally{if(mounted.current)setLoading(false);}}
  useEffect(()=>{mounted.current=true;void load();return()=>{mounted.current=false;};},[secret]);
  useEffect(()=>{if(!dirty)return;const warn=(event:BeforeUnloadEvent)=>event.preventDefault();window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[dirty]);
  const mayReplace=()=>!dirty || window.confirm('Discard the unsaved changes to this edition?');
  function open(row:any) {if(!mayReplace())return;try{setDraft(validateHoroscopeEdition(row.sections?.horoscopeEdition));setSaved(row);setPacket(row.facts?.horoscopeBrief);setProfile(row.source_snapshot?.studioWritingProfile ?? null);setEditorialImport(row.source_snapshot?.editorialImport ?? null);setOutlines(row.source_snapshot?.horoscopeOutlines ?? {});setApproved(false);setError('');setMessage('');}catch(reason){setError((reason as Error).message);}}
  async function prepare() {
    if(!mayReplace())return;setBusy(true);setError('');setMessage('');
    try {
      const params=new URLSearchParams({horoscopeBrief:'true',period,date,timeZone:zone});
      const [facts,profiles]=await Promise.all([request(secret,endpoint+'?'+params),request(secret,endpoint+'?writingProfiles=true')]);
      const edition=emptyHoroscopeEdition(facts.brief.window);
      const matching=await request(secret,endpoint+'?'+new URLSearchParams({contentKey:horoscopeEditionKey(edition.window),mode:'article'}));
      const existing=matching.rows?.[0];
      if(existing){setDraft(validateHoroscopeEdition(existing.sections.horoscopeEdition));setSaved(existing);setPacket(existing.facts.horoscopeBrief);setOutlines(existing.source_snapshot?.horoscopeOutlines ?? {});setProfile(existing.source_snapshot?.studioWritingProfile ?? null);setMessage('Opened the existing edition for these dates.');}
      else{setDraft(edition);setSaved(null);setPacket({brief:facts.brief,signature:facts.signature});setOutlines({});setProfile(profiles.profiles.find((p:any)=>p.profile.period===period));setMessage('Calculated dates and writing brief are ready. No reading has been generated.');}
      setApproved(false);
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
      if(!row?.id || !row.updated_at || row.content_key!==horoscopeEditionKey(edition.window) || JSON.stringify(validateHoroscopeEdition(row.sections?.horoscopeEdition))!==JSON.stringify(edition)
        || row.status!==(publish ? 'LIVE':'DRAFT')) throw new Error('The exact save could not be confirmed. Your edits are preserved; reload the saved edition before retrying.');
      setSaved(row);setDraft(edition);setRows(current=>[row,...current.filter(r=>r.id!==row.id)]);setApproved(false);
      announceContentUpdate({contentKey:row.content_key,published:publish,updatedAt:row.updated_at});
      setMessage(publish ? 'Published all twelve readings. Open Horoscopes to read this edition during its date range.' : 'Saved edition draft.');
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
  const passage=draft?.passages.find(p=>p.sign===sign);
  const complete=draft?.passages.filter(p=>p.headline.trim()&&p.body.trim()).length ?? 0;
  return <section className="admin-panel" aria-label="Horoscope editions">
    <p>Prepare a daily, weekly or seasonal edition for all twelve rising signs. Edit and review every reading here, then publish the complete edition.</p>
    <div className="admin-toolbar">
      <label><span>Period</span><AdminSelect aria-label="Edition period" value={period} disabled={busy} onChange={e=>setPeriod(e.target.value as HoroscopePeriod)}>{HOROSCOPE_PERIODS.map(p=><option key={p} value={p}>{horoscopeSignLabel(p)}</option>)}</AdminSelect></label>
      <label><span>Reference date</span><StudioInput aria-label="Reference date" type="date" value={date} disabled={busy} onChange={e=>setDate(e.target.value)}/></label>
      <label><span>Edition time zone</span><StudioInput aria-label="Edition time zone" value={zone} disabled={busy} onChange={e=>setZone(e.target.value)}/></label>
      <StudioButton disabled={busy} onClick={()=>void prepare()}>{busy ? 'Working…':'Prepare edition'}</StudioButton>
    </div>
    {error&&<p role="alert">{error}</p>}{message&&<p role="status">{message}</p>}
    <details className="admin-workspace-details" open={!draft}><AdminDisclosureSummary>Recent editions</AdminDisclosureSummary>
      {loading ? <PageLoading message="Loading horoscope editions…"/> : rows.length ? <div className="admin-toolbar-actions">{rows.map(row=><StudioButton key={row.id} disabled={busy} onClick={()=>open(row)}>{row.headline} · {row.sections?.horoscopeEdition ? horoscopeWindowLabel(row.sections.horoscopeEdition.window):row.content_key} · {row.status}</StudioButton>)}</div> : <p>No editions saved yet.</p>}
      <StudioButton disabled={busy||loading} onClick={()=>void load()}>Refresh editions</StudioButton>
    </details>
    {draft&&passage&&<>
      <p>{horoscopeWindowLabel(draft.window)} · {draft.window.timeZone} · {complete}/12 readings complete{dirty?' · Unsaved changes':''}</p>
      <a href="#ai-writing">Edit AI writing instructions</a>
      <p>Writing instructions: {profile?.id ? `saved revision ${profile.revision}`:'starter profile'}.</p>
      <StudioButton disabled={busy} onClick={()=>void refreshProfile()}>Use latest writing instructions</StudioButton>
      <div className="admin-toolbar"><label><span>Rising sign</span><AdminSelect aria-label="Edition rising sign" value={sign} onChange={e=>setSign(e.target.value)}>{HOROSCOPE_SIGNS.map(s=><option key={s} value={s}>{horoscopeSignLabel(s)}</option>)}</AdminSelect></label></div>
      <label className="admin-review-copy-editor"><span>Writing outline · editor only</span><StudioTextarea aria-label="Writing outline" rows={5} value={outlines[sign]??''} disabled={busy} onChange={e=>{setOutlines(current=>({...current,[sign]:e.target.value}));setApproved(false);}}/></label>
      <label className="admin-review-copy-editor"><span>Reading headline</span><StudioInput aria-label="Reading headline" value={passage.headline} maxLength={200} disabled={busy} onChange={e=>{setDraft({...draft,passages:draft.passages.map(p=>p.sign===sign?{...p,headline:e.target.value}:p)});setApproved(false);}}/></label>
      <label className="admin-review-copy-editor"><span>Complete reading</span><StudioTextarea aria-label="Complete reading" rows={12} value={passage.body} maxLength={20000} disabled={busy} onChange={e=>{setDraft({...draft,passages:draft.passages.map(p=>p.sign===sign?{...p,body:e.target.value}:p)});setApproved(false);}}/></label>
      <div className="admin-toolbar-actions"><StudioButton disabled={busy||Boolean(saved&&!dirty)} onClick={()=>void save()}>Save edition draft</StudioButton>
        <StudioButton disabled={busy} onClick={()=>download('horoscope-writing-brief.json',{schema:'horoscope-writing-request/v1',edition:draft,calculatedFacts:packet,writingProfile:profile,outlines,ownerApproved:false})}>Export writing brief</StudioButton>
        <label>Import draft<StudioInput aria-label="Import horoscope draft" type="file" accept="application/json,.json" disabled={busy} onChange={e=>{void importDraft(e.target.files?.[0]);e.target.value='';}}/></label>
      </div>
      <details className="admin-workspace-details"><AdminDisclosureSummary>Calculated facts and timing</AdminDisclosureSummary><StudioTextarea aria-label="Calculated horoscope facts" readOnly rows={12} value={JSON.stringify(packet?.brief,null,2)}/></details>
      <details className="admin-workspace-details"><AdminDisclosureSummary>Review all twelve readings</AdminDisclosureSummary>{draft.passages.map(p=><section className="admin-hook-detail-section" key={p.sign} aria-label={`${horoscopeSignLabel(p.sign)} reading preview`}><h2>{horoscopeSignLabel(p.sign)}</h2><p>{p.headline}</p>{p.body?<div className="admin-copy-preview"><FormattedProse text={p.body}/></div>:<p>No reading written yet.</p>}</section>)}</details>
      <label><input type="checkbox" checked={approved} disabled={busy||dirty||complete!==12||!saved} onChange={e=>setApproved(e.target.checked)}/> I have reviewed and approve the exact wording of all twelve saved readings.</label>
      <div className="admin-toolbar-actions"><StudioButton disabled={busy||dirty||!approved||!saved||saved.status==='LIVE'} onClick={()=>void save(true)}>Publish edition</StudioButton><a href="/#horoscopes">Open Horoscopes</a></div>
    </>}
  </section>;
}
