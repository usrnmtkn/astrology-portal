import {useEffect,useRef,useState} from 'react';
import {AdminDisclosureSummary,AdminSelect} from './AdminNativeControls';
import {StudioButton,StudioTextarea} from './StudioControls';
import {fetchWithOwnerSession} from './ownerSessionRequest';

type Export={title:string;text:string;requestCount:number;introLength?:number;units?:{label:string;start:number;end:number}[]};
export default function WritingPlanExport({secret='',endpoint,body,disabled=false,request,getCredential}:{secret?:string;endpoint:string;body:unknown;disabled?:boolean;request?:<T>(path:string,options?:RequestInit)=>Promise<T>;getCredential?:()=>Promise<string>}) {
  const [value,setValue]=useState<Export|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
  const [selection,setSelection]=useState('all');
  const text=useRef<HTMLTextAreaElement>(null),version=useRef(0),identity=JSON.stringify({endpoint,body});
  const activeRequest=useRef<AbortController|null>(null);
  const unit=selection==='all'?null:value?.units?.[Number(selection)];
  const selectedText=value?(unit?value.text.slice(0,value.introLength??0)+value.text.slice(unit.start,unit.end):value.text):'';
  useEffect(()=>{version.current++;activeRequest.current?.abort();setValue(null);setSelection('all');setError('');setMessage('');setBusy(false);return()=>{version.current++;activeRequest.current?.abort();};},[identity,secret,disabled]);
  async function load(){
    const current=++version.current;setBusy(true);setValue(null);setSelection('all');setError('');setMessage('');
    activeRequest.current?.abort();const controller=new AbortController();activeRequest.current=controller;
    try{
      const init={method:'POST',headers:{'content-type':'application/json'},cache:'no-store' as const,body:JSON.stringify(body),signal:AbortSignal.any([controller.signal,AbortSignal.timeout(90000)])};
      let data:any;
      if(request)data=await request(endpoint!,init);
      else{
        const credential=getCredential?await getCredential():secret;
        if(!credential)throw new Error('Sign in to Content Studio to read this private writing plan.');
        const response=await fetchWithOwnerSession(endpoint!,credential,init);
        data=await response.json();if(!response.ok)throw new Error(data.error??'The complete writing plan could not load.');
      }
      if(data.ok!==true)throw new Error(data.error??'The complete writing plan could not load.');
      const next=data.writingExport;
      if(!next||next.schema!=='studio-writing-export/v1'||typeof next.text!=='string'||!next.text||typeof next.title!=='string'
        ||!Number.isInteger(next.introLength)||next.introLength<0||next.introLength>next.text.length
        ||!Array.isArray(next.units)||next.units.length!==next.requestCount||!next.units.length
        ||next.units.some((entry:any,index:number)=>typeof entry.label!=='string'||!entry.label||!Number.isInteger(entry.start)||!Number.isInteger(entry.end)||entry.start!==(index?next.units[index-1].end:next.introLength)||entry.end<=entry.start||entry.end>next.text.length)
        ||next.units.at(-1).end!==next.text.length)throw new Error('The complete writing plan was not returned.');
      if(current===version.current)setValue(next);
    }catch(reason){if(current===version.current)setError((reason as Error).message);}finally{if(current===version.current)setBusy(false);}
  }
  async function copy(){
    setError('');setMessage('');try{await navigator.clipboard.writeText(selectedText);setMessage('Complete writing plan copied.');}
    catch{text.current?.focus();text.current?.select();setError('Clipboard access is unavailable. The complete text is selected so you can copy it.');}
  }
  function download(){const url=URL.createObjectURL(new Blob([selectedText],{type:'text/plain;charset=utf-8'}));const link=document.createElement('a');link.href=url;link.download='writing-plan.txt';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  return <details className="admin-workspace-details">
    <AdminDisclosureSummary>Complete writing plan · copy or download</AdminDisclosureSummary>
    <p>Read the instructions, calculated facts and complete source material before writing. Copying or downloading makes no AI call.</p>
    <StudioButton disabled={disabled||busy} onClick={()=>void load()}>{busy?'Loading writing plan…':value?'Refresh complete writing plan':'Load complete writing plan'}</StudioButton>
    {disabled&&<p className="admin-field-hint">Finish saving or loading this write-up before copying its current plan.</p>}
    {value&&!disabled&&<>
      {value.units&&value.units.length>1&&<label>Reading<AdminSelect aria-label="Reading to copy" value={selection} disabled={busy} onChange={event=>{setSelection(event.target.value);setMessage('');setError('');}}><option value="all">All readings</option>{value.units.map((entry,index)=><option key={index} value={index}>{entry.label[0].toUpperCase()+entry.label.slice(1)}</option>)}</AdminSelect></label>}
      <p>{value.requestCount===1?'Complete plan':unit?'1 reading':`${value.requestCount} readings`} · {selectedText.length.toLocaleString()} characters</p>
      <div className="admin-toolbar-actions"><StudioButton disabled={busy} onClick={()=>void copy()}>{unit?'Copy this plan':'Copy all'}</StudioButton><StudioButton disabled={busy} onClick={download}>Download writing plan</StudioButton></div>
      <StudioTextarea ref={text} formatting={false} readOnly aria-label="Complete writing plan" rows={18} value={selectedText}/></>}
    {error&&<p role="alert">{error}</p>}{message&&<p role="status">{message}</p>}
  </details>;
}
