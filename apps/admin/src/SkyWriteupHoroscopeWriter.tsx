import {useEffect,useRef,useState} from 'react';
import {StudioButton,StudioTextarea} from './StudioControls';
import WritingPlanExport from './WritingPlanExport';

type Source={id:string;updatedAt:string;sign:string;compiledHash:string;startsAt:string;endsAt:string};
type Draft={body:string;source:Source;generation:{provider:string;model:string;responseId:string|null}};
type Props={row?:{id:string;updated_at?:string|null}|null;sign:string;currentText:string;disabled:boolean;
 request:<T>(path:string,options?:RequestInit)=>Promise<T>;onBusyChange:(busy:boolean)=>void;onDirtyChange:(dirty:boolean)=>void;onUse:(body:string)=>void};

export default function SkyWriteupHoroscopeWriter(props:Props) {
  const [direction,setDirection]=useState(''),[draft,setDraft]=useState<Draft|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const request=useRef<AbortController|null>(null),mounted=useRef(true);
  const identity=`${props.row?.id}/${props.row?.updated_at}/${props.sign}`;
  useEffect(()=>{setDraft(null);setError('');setDirection('');},[identity]);
  useEffect(()=>{props.onDirtyChange(Boolean(direction||draft));},[direction,draft,props.onDirtyChange]);
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;request.current?.abort();props.onBusyChange(false);props.onDirtyChange(false);};},[props.onBusyChange,props.onDirtyChange]);
  const body={writeupHoroscope:{id:props.row?.id,expectedUpdatedAt:props.row?.updated_at,sign:props.sign,currentText:props.currentText},voiceNotes:direction};
  const disabled=props.disabled||!props.row?.updated_at;
  async function generate(){
    if(disabled||busy||request.current)return;
    const controller=new AbortController();request.current=controller;setBusy(true);props.onBusyChange(true);setError('');
    try{
      const result=await props.request<Draft&{ok:boolean}>('/api/admin/sky-article-template-slots',{method:'POST',signal:controller.signal,body:JSON.stringify(body)});
      if(!mounted.current)return;
      if(!result.ok||!result.body?.trim()||result.source?.id!==props.row?.id||result.source?.updatedAt!==props.row?.updated_at||result.source?.sign!==props.sign)throw new Error('The returned draft does not match this saved write-up and sign. Your writing is unchanged.');
      setDraft(result);
    }catch(reason){
      if(mounted.current){
        const status=(reason as {status?:number}|null)?.status;
        setError(status===409?'Reopen the saved write-up before generating again. Your writing is unchanged.'
          :status===401?'Sign in to Content Studio again. Your writing is unchanged.'
          :reason instanceof Error&&reason.message.startsWith('The returned draft')?reason.message
          :'The horoscope draft could not be generated. Your writing is unchanged. Try again.');
      }
    }
    finally{request.current=null;if(mounted.current){setBusy(false);props.onBusyChange(false);}}
  }
  return <section className="studio-section" aria-label="AI horoscope draft">
    <h3>AI draft for this sign</h3>
    <p className="admin-field-hint">Paid generation · Review before using</p>
    {!props.row?.updated_at&&<p>Save the write-up draft before generating horoscopes.</p>}
    <label className="admin-review-copy-editor"><span>Optional direction</span><StudioTextarea aria-label="Horoscope draft direction" rows={3} maxLength={6000} value={direction} disabled={disabled||busy} onChange={e=>setDirection(e.target.value)}/></label>
    <WritingPlanExport request={props.request} endpoint="/api/admin/sky-article-template-slots" body={{...body,preview:true}} disabled={disabled||busy}/>
    <StudioButton disabled={disabled||busy||Boolean(draft)} onClick={()=>void generate()}>{busy?'Generating draft…':'Generate draft'}</StudioButton>
    {error&&<p role="alert">{error}</p>}
    {draft&&<><p>AI draft · {draft.generation.provider} · {draft.generation.model}</p><StudioTextarea aria-label="Generated horoscope draft" formatting={false} readOnly rows={12} value={draft.body}/>
      <div className="admin-toolbar-actions"><StudioButton disabled={disabled||busy} onClick={()=>{props.onUse(draft.body);setDraft(null);setDirection('');}}>Use this draft</StudioButton><StudioButton disabled={busy} onClick={()=>{setDraft(null);setDirection('');}}>Discard AI draft</StudioButton></div></>}
  </section>;
}
