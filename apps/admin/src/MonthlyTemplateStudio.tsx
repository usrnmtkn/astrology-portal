import { useEffect, useMemo, useRef, useState } from "react";
import { AdminDisclosureSummary, AdminSelect } from "./AdminNativeControls";
import { StudioButton, StudioInput, StudioTextarea, StudioTabs } from "./StudioControls";
import { adminCredentialHeaders } from "./adminSecret";
import { applyMonthlyPhrases, createMonthlyEdition, isPlanetaryEvent, monthlyTargets, snapshotMonthlyLibrary, rootFactNames, signs, validateMonthlyEdition, validateMonthlyTemplate,
  type MonthlyEdition, type MonthlyFacts, type MonthlyLibraryVariable, type MonthlyTemplate, type StoredMonthly } from "../../../src/monthly-writing/model";
import { monthlyTemplateStarter } from "../../../src/monthly-writing/starter";
import type { TemplateDefinition } from "../../../src/monthly-writing/template";
import { calendarVariableColor } from "./calendarOverviewTemplate";
const endpoint="/api/admin/monthly-writing";
const monthNow=()=>{const date=new Date();return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}`;};
async function request(secret:string,body?:unknown,query="",signal?:AbortSignal) {
  const response=await fetch(`${endpoint}${query}`,{method:body?"POST":"GET",headers:{...adminCredentialHeaders(secret),"content-type":"application/json"},cache:"no-store",signal:signal??AbortSignal.timeout(body && (body as any).action==="generate"?300000:90000),...(body?{body:JSON.stringify(body)}:{})});
  const data=await response.json().catch(()=>null);
  if(!response.ok||data?.ok!==true) throw new Error(data?.error??"Monthly writing returned an unreadable response. Your edits were not changed.");
  return data;
}
const Token=({name}:{name:string})=><code className="admin-composition-variable-token" data-variable-name={name} data-variable-color={calendarVariableColor(name)}>{`{{${name}}}`}</code>;
function PreviewText({text}:{text:string}) {
  return <div className="admin-template-reader-copy" aria-label="Assembled monthly writing">{text.split(/\n\s*\n/u).map((block,index)=> {
    const lines=block.split("\n");
    if(/^#{1,6}\s/u.test(lines[0])) return <div key={index}><h5>{lines[0].replace(/^#{1,6}\s/u,"")}</h5>{lines.length>1&&<p className="admin-calendar-template-text">{lines.slice(1).join("\n")}</p>}</div>;
    return <p className="admin-calendar-template-text" key={index}>{block}</p>;
  })}</div>;
}
export default function MonthlyTemplateStudio({secret,registerCloseGuard}:{secret:string;registerCloseGuard?:(guard:(()=>boolean)|null)=>void}) {
  const [month,setMonth]=useState(monthNow),[timeZone,setTimeZone]=useState(()=>Intl.DateTimeFormat().resolvedOptions().timeZone||"UTC");
  const [template,setTemplate]=useState<MonthlyTemplate>(monthlyTemplateStarter),[savedTemplate,setSavedTemplate]=useState<StoredMonthly<MonthlyTemplate>|null>(null);
  const [edition,setEdition]=useState<MonthlyEdition|null>(null),[savedEdition,setSavedEdition]=useState<StoredMonthly<MonthlyEdition>|null>(null);
  const [facts,setFacts]=useState<MonthlyFacts|null>(null),[library,setLibrary]=useState<MonthlyLibraryVariable[]>([]);
  const [error,setError]=useState(""),[status,setStatus]=useState(""),[busy,setBusy]=useState("");
  const [view,setView]=useState("preview"),[reviewed,setReviewed]=useState(false),[instruction,setInstruction]=useState("");
  const [selected,setSelected]=useState<string[]>([]),[suggestion,setSuggestion]=useState<any>(null),[generation,setGeneration]=useState<any>(null);
  const [editingName,setEditingName]=useState("monthlyOverview"),[newName,setNewName]=useState(""),[overrideSign,setOverrideSign]=useState(signs[0]);
  const [zoneInput,setZoneInput]=useState(timeZone);
  const [loadedKey,setLoadedKey]=useState(""),[reload,setReload]=useState(0),[dirty,setDirty]=useState(false);
  const latest=useRef(""),sequence=useRef(0),mounted=useRef(true),dirtyRef=useRef(false),busyRef=useRef("");dirtyRef.current=dirty;busyRef.current=busy;
  useEffect(()=>{registerCloseGuard?.(()=>{if(busyRef.current){window.alert("Finish the monthly editor operation before leaving.");return false;}return !dirtyRef.current||window.confirm("Discard the unsaved monthly changes?");});return()=>registerCloseGuard?.(null);},[registerCloseGuard]);
  const key=`${month}|${timeZone}`;
  const current=useMemo(()=>edition?{...edition,template}:null,[edition,template]);
  const signature=JSON.stringify(current);latest.current=signature;
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;sequence.current++;};},[]);
  useEffect(()=> {
    const controller=new AbortController(),number=++sequence.current;
    setBusy("loading");setError("");setStatus("");setFacts(null);setEdition(null);setSavedEdition(null);setSuggestion(null);setGeneration(null);setReviewed(false);setSelected([]);
    void request(secret,undefined,`?${new URLSearchParams({month,timeZone})}`,controller.signal).then(data=> {
      if(controller.signal.aborted||number!==sequence.current)return;
      setSavedTemplate(data.template);setSavedEdition(data.edition);setLibrary(data.library);
      setTemplate(data.edition?.document.template??data.template?.document??data.starter);
      setEdition(data.edition?.document??null);setLoadedKey(key);setDirty(false);
    }).catch(reason=>{if(!controller.signal.aborted&&number===sequence.current)setError(reason.message);}).finally(()=>{if(!controller.signal.aborted&&number===sequence.current)setBusy("");});
    return()=>controller.abort();
  },[key,reload,secret]);
  useEffect(()=> {
    if(!dirty)return;
    const warn=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue="";};
    window.addEventListener("beforeunload",warn);return()=>window.removeEventListener("beforeunload",warn);
  },[dirty]);
  const assembly=useMemo(()=> {
    if(!facts||!current)return null;
    try{return {...monthlyTargets(facts,current,library),error:""};}
    catch(reason){return {targets:[],rendered:{text:"",issues:[],trace:[]},error:reason instanceof Error?reason.message:"Template could not be assembled."};}
  },[facts,current,library]);
  function edit(patch:Partial<MonthlyEdition>) {setEdition(value=>value?{...value,...patch}:value);setDirty(true);setSuggestion(null);}
  function patternChange(next:MonthlyTemplate) {setTemplate(next);setDirty(true);setSuggestion(null);}
  function changeDefinition(patch:Partial<TemplateDefinition>) {const value=template.definitions[editingName];if(patch.libraryName!==undefined && current){const names=new Set([...Object.values(template.definitions).map(def=>def.libraryName),patch.libraryName]);setEdition({...current,librarySnapshot:snapshotMonthlyLibrary(library.filter(item=>names.has(item.name)))});}if(value)patternChange({...template,definitions:{...template.definitions,[editingName]:{...value,...patch}}});}
  const approveDiscard=()=>!dirty||window.confirm("Leave the unsaved monthly changes? Saved templates and editions will remain unchanged.");
  async function calculate() {
    const number=++sequence.current;setBusy("calculating");setError("");setStatus("");
    try {
      const data=await request(secret,{action:"calculate",month,timeZone});
      if(!mounted.current||number!==sequence.current)return;
      const calculated=data.facts as MonthlyFacts;setFacts(calculated);
      if(!edition){const next=createMonthlyEdition(calculated,template,savedTemplate?.updatedAt??"");const names=new Set(Object.values(template.definitions).map(def=>def.libraryName));next.librarySnapshot=snapshotMonthlyLibrary(library.filter(item=>names.has(item.name)));setEdition(next);}
      else if(edition.factsFingerprint!==calculated.fingerprint) {
        const validIds=new Set(calculated.events.filter(isPlanetaryEvent).map(event=>event.id));
        setEdition({...edition,factsFingerprint:calculated.fingerprint,leadEventId:edition.leadEventId&&validIds.has(edition.leadEventId)?edition.leadEventId:null,supportingEventIds:edition.supportingEventIds.filter(id=>validIds.has(id))});
        setStatus("Calculation changed. Previous phrases are preserved, but review the event selection and writing again.");setDirty(true);
      }
      setReviewed(false);setSuggestion(null);setView("highlights");
    } catch(reason){if(number===sequence.current)setError(reason instanceof Error?reason.message:"Month calculation failed.");}
    finally{if(number===sequence.current)setBusy("");}
  }
  async function save(kind:"template"|"edition") {
    setBusy("saving");setError("");
    try {
      const document=kind==="template"?validateMonthlyTemplate(template):validateMonthlyEdition(current);
      const data=await request(secret,{action:kind==="template"?"save-template":"save-edition",document,expectedUpdatedAt:kind==="template"?savedTemplate?.updatedAt??null:savedEdition?.updatedAt??null});
      if(!mounted.current)return;
      if(kind==="template") {if(!edition)setDirty(false);setSavedTemplate(data.saved);setStatus("Reusable sentence templates saved. Existing monthly editions were not changed.");}
      else {setSavedEdition(data.saved);setEdition(data.saved.document);setDirty(false);setStatus(`${month} draft saved. Nothing was published.`);}
    } catch(reason){setError(reason instanceof Error?reason.message:"Save failed. Your edits are still here.");}
    finally{if(mounted.current)setBusy("");}
  }
  async function generate() {
    if(!current||!assembly||!reviewed)return;
    const unsupported=assembly.targets.filter(target=>target.eventId&&!facts?.events.find(event=>event.id===target.eventId)?.sourceIds.length);
    const chosen=selected.length?selected:assembly.targets.filter(target=>!target.locked&&!target.value.trim()&&!unsupported.includes(target)).map(target=>target.id);
    if(!chosen.length){setStatus(unsupported.length ? "The remaining event phrases need governed meaning support. They stay editable manually; no ordinary lunar passage will be substituted." : "There are no missing unlocked phrases. Select particular phrases to request revisions.");return;}
    const number=++sequence.current,base=signature;setBusy("writing");setError("");setStatus("");
    try {
      const data=await request(secret,{action:"generate",document:current,targetIds:chosen,instruction,selectionReviewed:true});
      if(!mounted.current||number!==sequence.current)return;
      if(latest.current!==base){setError("The month or writing changed during generation. The late suggestion was not applied.");return;}
      if(!Array.isArray(data.changes)||data.factsFingerprint!==facts?.fingerprint)throw new Error("The suggestion does not match this month's calculated facts.");
      setSuggestion({...data,base});setGeneration(data.generation);setView("phrases");if(unsupported.length)setStatus(`${unsupported.length} event phrases were not sent to AI because event-specific meaning support is missing. They remain available for manual writing.`);
    } catch(reason){if(number===sequence.current)setError(reason instanceof Error?reason.message:"Generation failed. Existing writing was not changed.");}
    finally{if(number===sequence.current)setBusy("");}
  }
  const definition=template.definitions[editingName];
  const planetary=facts?.events.filter(isPlanetaryEvent).sort((a,b)=>b.score-a.score||a.startsAt.localeCompare(b.startsAt))??[];
  return <section className="studio-surface studio-section" aria-label="Monthly sentence template writer">
    <header className="admin-section-heading-row"><div><h4>Monthly sentence templates</h4><p>Edit reusable sentence patterns, then fill their smaller phrases for the selected month. AI does not replace your templates.</p></div></header>
    <div className="admin-filter-form">
      <label><span>Month</span><StudioInput aria-label="Writing month" type="month" min="1900-01" max="2100-12" value={month} disabled={!!busy} onChange={event=>{if(approveDiscard())setMonth(event.target.value);}} /></label>
      <label><span>Editorial timezone</span><StudioInput aria-label="Writing timezone" value={zoneInput} disabled={!!busy} onChange={event=>setZoneInput(event.target.value)} onBlur={()=>{if(zoneInput!==timeZone&&approveDiscard())setTimeZone(zoneInput);}} /></label>
    </div>
    <div className="admin-new-actions">
      <StudioButton disabled={!!busy||loadedKey!==key} onClick={()=>void calculate()}>{busy==="calculating"?"Calculating…":facts?"Refresh month facts":"Review selected highlights"}</StudioButton>
      <StudioButton className="primary" disabled={!!busy||!facts||!current||!reviewed||!!assembly?.error} onClick={()=>void generate()}>{busy==="writing"?"Writing phrases…":"Generate monthly draft"}</StudioButton>
      <StudioButton disabled={!!busy||!facts||!current} onClick={()=>void save("edition")}>Save month draft</StudioButton>
      <StudioButton disabled={!!busy} onClick={()=>{if(approveDiscard())setReload(value=>value+1);}}>Reload saved writing</StudioButton>
    </div>
    <p className="admin-field-hint">Template source: {savedTemplate?"saved reusable definitions":"starter, not yet saved"}. Month source: {savedEdition?"saved edition":"new draft"}. Save and generation do not publish anything.</p>
    {busy==="loading"&&<p role="status">Loading saved templates, this month's draft, and your variable library…</p>}
    {status&&<p role="status">{status}</p>}{error&&<p role="alert">{error}</p>}
    <StudioTabs label="Monthly writing views" value={view} onValueChange={setView} tabs={[{value:"preview",label:"Assembled preview"},{value:"patterns",label:"Sentence templates"},{value:"phrases",label:"Phrase values"},{value:"highlights",label:"Selected highlights"}]}>
      {view==="highlights"?<div className="studio-section">
        {!facts||!current?<p>Choose Review selected highlights to calculate the whole month.</p>:<>
          <p>{facts.monthName} {facts.year} · {facts.openingSeasonSign}{facts.closingSeasonSign?` → ${facts.closingSeasonSign}`:""} · {facts.timeZone}</p>
          <p className="admin-field-hint">{facts.provenance.source}. {facts.provenance.eclipseClassification}.</p>
          <label><span>Lead planetary event</span><AdminSelect aria-label="Lead planetary event" value={current.leadEventId??""} disabled={!!busy} onChange={event=>{const id=event.target.value||null;edit({leadEventId:id,supportingEventIds:current.supportingEventIds.filter(value=>value!==id)});setReviewed(false);}}><option value="">No lead event</option>{planetary.map(event=><option value={event.id} key={event.id}>{event.date} · {event.clause}</option>)}</AdminSelect></label>
          {current.leadEventId&&<p>{planetary.find(event=>event.id===current.leadEventId)?.reason} This is an editorial suggestion, not an objective importance score.</p>}
          <fieldset className="studio-section"><legend>Supporting highlights · up to two</legend>{planetary.filter(event=>event.id!==current.leadEventId).map(event=><label key={event.id}><StudioInput type="checkbox" checked={current.supportingEventIds.includes(event.id)} disabled={!!busy||!current.supportingEventIds.includes(event.id)&&current.supportingEventIds.length>=2} onChange={change=>{edit({supportingEventIds:change.target.checked?[...current.supportingEventIds,event.id]:current.supportingEventIds.filter(id=>id!==event.id)});setReviewed(false);}} /><span>{event.date} · {event.clause}</span></label>)}</fieldset>
          <label><span>Optional month-wide themes</span><AdminSelect aria-label="Monthly theme count" value={current.themeCount} disabled={!!busy} onChange={event=>{edit({themeCount:Number(event.target.value) as 0|1|2});setReviewed(false);}}><option value={0}>Season-led · no separate monthly theme</option><option value={1}>One event-supported monthly theme</option><option value={2}>Two distinct monthly themes</option></AdminSelect></label>
          <p>The opening and closing seasonal focuses stay separate. Two Sun seasons do not require two month-wide themes.</p>
          <div className="studio-section" aria-label="Lunar features"><h5>Lunar features</h5>{facts.events.filter(event=>!isPlanetaryEvent(event)&&/moon|eclipse/u.test(event.type)).map(event=><p key={event.id}>{event.date} · {event.clause} · {event.type.includes("eclipse")?"eclipse-specific section":"ordinary lunation section"}</p>)}</div>
          <label><StudioInput aria-label="Highlights reviewed" type="checkbox" checked={reviewed} disabled={!!busy} onChange={event=>setReviewed(event.target.checked)} /><span>I have reviewed the selected events and theme count.</span></label>
        </>}
      </div>:view==="patterns"?<div className="studio-section">
        <label className="admin-review-copy-editor"><span>Main monthly pattern</span><StudioTextarea aria-label="Monthly composition pattern" value={template.body} disabled={!!busy} onChange={event=>patternChange({...template,body:event.target.value})} /></label>
        <label><span>Edit a nested definition</span><AdminSelect aria-label="Monthly definition" value={editingName} onChange={event=>setEditingName(event.target.value)}>{Object.keys(template.definitions).map(name=><option value={name} key={name}>{name} · {template.definitions[name].kind}</option>)}</AdminSelect></label>
        {definition&&<div className="studio-section studio-surface"><Token name={editingName}/>
          <label><span>Definition type</span><AdminSelect aria-label="Definition type" value={definition.kind} disabled={!!busy} onChange={event=>changeDefinition({kind:event.target.value as TemplateDefinition["kind"]})}><option value="template">Sentence template · may contain variables</option><option value="phrase">Literal phrase · may have scoped values</option></AdminSelect></label>
          <label className="admin-review-copy-editor"><span>{definition.kind==="template"?"Editable sentence pattern":"Shared phrase value"}</span><StudioTextarea aria-label="Monthly definition value" value={definition.value} disabled={!!busy} onChange={event=>changeDefinition({value:event.target.value})}/></label>
          {definition.kind==="phrase"&&<>
            <div className="admin-filter-form"><label><span>Select language using</span><AdminSelect aria-label="Phrase source rule" value={definition.source??"edition"} disabled={!!busy} onChange={event=>changeDefinition({source:event.target.value as TemplateDefinition["source"]})}><option value="edition">This monthly edition</option><option value="opening-season">Opening Sun season</option><option value="closing-season">Closing Sun season</option><option value="event">Current selected event</option></AdminSelect></label><label><span>Grammar in its sentence</span><AdminSelect aria-label="Phrase grammar" value={definition.grammar??"clause"} disabled={!!busy} onChange={event=>changeDefinition({grammar:event.target.value as TemplateDefinition["grammar"]})}><option value="noun-phrase">Noun phrase</option><option value="verb-phrase">Base verb phrase</option><option value="clause">Clause</option><option value="text">Short text</option></AdminSelect></label></div>
            <label><span>Writing instruction · editor only</span><StudioTextarea aria-label="Phrase writing instruction" value={definition.description??""} disabled={!!busy} maxLength={1200} onChange={event=>changeDefinition({description:event.target.value})}/></label>
            <label><span>Or use a saved variable from your library</span><AdminSelect aria-label="Monthly library variable" value={definition.libraryName??""} disabled={!!busy} onChange={event=>changeDefinition({libraryName:event.target.value})}><option value="">Use this definition's phrases</option>{library.map(item=><option key={item.id} value={item.name}>{item.name}</option>)}</AdminSelect></label>
            <details className="admin-workspace-details"><AdminDisclosureSummary>Sign-specific phrase values</AdminDisclosureSummary><label><span>Sign</span><AdminSelect aria-label="Phrase override sign" value={overrideSign} onChange={event=>setOverrideSign(event.target.value)}>{signs.map(sign=><option value={sign} key={sign}>{sign}</option>)}</AdminSelect></label><label><span>Value for this sign</span><StudioTextarea aria-label="Sign-specific monthly phrase" value={definition.bySign?.[overrideSign]??""} disabled={!!busy} onChange={event=>changeDefinition({bySign:{...definition.bySign,[overrideSign]:event.target.value}})}/></label><StudioButton disabled={!!busy} onClick={()=>{const next={...definition.bySign};delete next[overrideSign];changeDefinition({bySign:next});}}>Remove sign override</StudioButton><p className="admin-field-hint">An explicit empty override stays unfinished. Removing it restores library/shared lookup.</p></details>
          </>}
          <div className="admin-new-actions"><StudioButton disabled={!!busy} onClick={()=>{if(!window.confirm(`Remove {{${editingName}}}? References will be flagged until you update the pattern.`))return;const next={...template.definitions};delete next[editingName];patternChange({...template,definitions:next});setEditingName(Object.keys(next)[0]??"");}}>Remove definition</StudioButton></div>
        </div>}
        <div className="admin-filter-form"><label><span>New variable name</span><StudioInput aria-label="New monthly variable name" value={newName} disabled={!!busy} onChange={event=>setNewName(event.target.value)}/></label><StudioButton disabled={!!busy||!newName} onClick={()=>{
          if(template.definitions[newName]){setError("That definition already exists.");return;}
          try{const next=validateMonthlyTemplate({...template,definitions:{...template.definitions,[newName]:{kind:"phrase",value:"",source:"edition",grammar:"noun-phrase"}}});patternChange(next);setEditingName(newName);setNewName("");setError("");}catch(reason){setError((reason as Error).message);}
        }}>Add definition</StudioButton></div>
        <div className="admin-new-actions"><StudioButton disabled={!!busy||loadedKey!==key} onClick={()=>void save("template")}>Save reusable sentence templates</StudioButton><StudioButton disabled={!!busy} onClick={()=>{if(window.confirm("Replace these working definitions with the starter? No saved template or edition changes until you save.")){patternChange(monthlyTemplateStarter());setEditingName("monthlyOverview");}}}>Load starter patterns</StudioButton></div>
        <StudioButton disabled={!!busy||!current} onClick={()=>{if(current){const names=new Set(Object.values(template.definitions).map(def=>def.libraryName));edit({librarySnapshot:snapshotMonthlyLibrary(library.filter(item=>names.has(item.name)))});setStatus("Library snapshot refreshed from the loaded library. Review the assembled writing before saving.");}}}>Use loaded library values for this edition</StudioButton>
        <p>Save reusable sentence templates updates the shared source for future months. Save month draft keeps this month's patterns and values together. Existing saved monthly editions are not rewritten.</p>
        <details className="admin-workspace-details"><AdminDisclosureSummary>Calculated variables and collections</AdminDisclosureSummary><p>{rootFactNames.map(name=><span key={name}><Token name={name}/>{" "}</span>)}</p><p>Use <code>{"{{#hasLeadEvent}}…{{/hasLeadEvent}}"}</code> for conditions and <code>{"{{#supportingEvents}}…{{/supportingEvents}}"}</code> for the selected event collection. Prefix a section with ^ for its inverse. Only template definitions execute nested tokens.</p></details>
      </div>:view==="phrases"?<div className="studio-section">
        {!assembly||!current?<p>Calculate the month to see the active phrase variables and their source selections.</p>:<>
          <p>Default generation fills missing unlocked phrases. Select a specific existing phrase to request a revision. Edits here affect only this edition; shared or sign-specific language belongs in Sentence templates.</p>
          <label className="admin-review-copy-editor"><span>Additional instructions for this draft</span><StudioTextarea aria-label="Monthly AI instructions" disabled={!!busy} value={instruction} maxLength={6000} onChange={event=>setInstruction(event.target.value)} /></label>
          {assembly.targets.map(target=><div key={target.id} className="studio-surface studio-section"><div className="admin-new-actions"><Token name={target.name}/><StudioButton onClick={()=>{setEditingName(target.name);setView("patterns");}}>Edit definition</StudioButton></div><p className="admin-field-hint">{target.eventId?facts?.events.find(event=>event.id===target.eventId)?.clause:"Monthly edition"} · {target.definition.source} · {target.definition.grammar} · {target.source}</p>
            <label><span>Edition value</span><StudioTextarea aria-label={`Phrase ${target.id}`} value={target.value} disabled={!!busy||target.locked} onChange={event=>{try{setEdition(applyMonthlyPhrases(current,[{...target,value:event.target.value}]));setDirty(true);setSuggestion(null);}catch(reason){setError((reason as Error).message);}}}/></label>
            {target.eventId&&!facts?.events.find(event=>event.id===target.eventId)?.sourceIds.length&&<p className="admin-field-hint">AI source gap: this event requires its own governed meaning. Write this phrase manually; ordinary lunar copy will not be substituted.</p>}
            <div className="admin-new-actions"><label><StudioInput type="checkbox" aria-label={`Protect ${target.id}`} checked={target.locked} disabled={!!busy} onChange={event=>{edit({locked:event.target.checked?[...current.locked,target.id]:current.locked.filter(id=>id!==target.id)});setSelected(values=>values.filter(id=>id!==target.id));}}/><span>Protect phrase</span></label><label><StudioInput aria-label={`Generate ${target.id}`} type="checkbox" checked={selected.includes(target.id)} disabled={!!busy||target.locked} onChange={event=>setSelected(values=>event.target.checked?[...values,target.id]:values.filter(id=>id!==target.id))}/><span>Include in AI request</span></label><StudioButton disabled={!!busy||target.locked} onClick={()=>{const next=structuredClone(current);if(target.eventId)delete next.eventValues[target.eventId]?.[target.name];else delete next.values[target.name];setEdition(next);setDirty(true);setSuggestion(null);}}>Use shared source again</StudioButton></div>
          </div>)}
          {suggestion&&<section className="studio-surface studio-section" aria-label="Monthly phrase suggestions"><h5>Review suggested phrase changes</h5>{suggestion.changes.map((change:any)=><div key={change.id}><Token name={change.name}/><p>Before: {assembly.targets.find(target=>target.id===change.id)?.value||"Unwritten"}</p><p>Suggested: {change.value}</p></div>)}<div className="admin-new-actions"><StudioButton disabled={!!busy} onClick={()=>{if(signature!==suggestion.base){setError("The writing changed. This suggestion cannot replace newer edits.");return;}try{setEdition(applyMonthlyPhrases(current,suggestion.changes));setDirty(true);setSuggestion(null);setSelected([]);setStatus("Suggested phrases applied to this month's working draft. Templates were preserved. Nothing was saved or published.");}catch(reason){setError((reason as Error).message);}}}>Use suggested phrases</StudioButton><StudioButton disabled={!!busy} onClick={()=>setSuggestion(null)}>Discard suggestions</StudioButton></div></section>}
        </>}
      </div>:<div className="studio-section">
        {!assembly?<p>Review selected highlights to calculate the month. The fallback then assembles saved phrase values without an AI call.</p>:assembly.error?<p role="alert">{assembly.error}</p>:<>
          {assembly.rendered.issues.length>0&&<div role="status"><p>{assembly.rendered.issues.length} unresolved writing or template issues. This is an unpublished preview.</p>{assembly.rendered.issues.map((issue,index)=><p key={index}>{issue.message} <StudioButton onClick={()=>{setEditingName(issue.name in template.definitions?issue.name:"monthlyOverview");setView(issue.code==="missing_value"?"phrases":"patterns");}}>Open source</StudioButton></p>)}</div>}
          <PreviewText text={assembly.rendered.text}/>
          <details className="admin-workspace-details"><AdminDisclosureSummary>Variable source map</AdminDisclosureSummary>{assembly.rendered.trace.map((trace,index)=><p key={index}><Token name={trace.name}/> · {trace.scope} · {trace.kind}<br/>{trace.value||"Needs writing"}</p>)}</details>
        </>}
      </div>}
    </StudioTabs>
    {generation&&<details className="admin-workspace-details"><AdminDisclosureSummary>Writing sources and memory receipt</AdminDisclosureSummary><p>Writer: {generation.provider} · {generation.model}. Generated wording requires your review.</p><p>Repository correction memory: {generation.memoryReceipt?.selected?.length??0} selected. {generation.memoryReceipt?.privateFeedback}</p><p className="admin-field-hint">Repository revision: {generation.memoryReceipt?.revision??"local snapshot"}. Meaning packet: {generation.evidenceReceipt?.packetSha256}.</p>{generation.evidenceReceipt?.ownerExampleKeys?.map((name:string)=><p key={name}>{name}</p>)}</details>}
    <p className="admin-field-hint">Horoscopes remain separate templates. This workspace creates collective monthly drafts only. Private correction text never enters the saved reader writing.</p>
  </section>;
}
