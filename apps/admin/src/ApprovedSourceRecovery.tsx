import {useEffect,useRef,useState} from 'react';
import {StudioButton} from './StudioControls';
import type {ContentPublication} from '../../web/src/content/contentPublicationState';

export type RecoverySource={id:string;contentKey:string;expectedUpdatedAt:string};
type PlannedSource=RecoverySource&{baselineSHA256:string;expectedPublicationRevision:number|null};
export type RecoveredSource={id:string;contentKey:string;updatedAt:string;baselineSHA256:string;publication:ContentPublication};
type Props={sources:RecoverySource[];disabled:boolean;request:(body:unknown)=>Promise<any>;onRecovered:(rows:RecoveredSource[])=>void;onBusy?:(busy:boolean)=>void;onSettled?:(message:string)=>void;statusOnly?:boolean;kind?:'moon-reusable'};
const pendingKey='tldr-studio-approved-source-recovery-v1';
export const pendingEvent='tldr-studio-approved-source-recovery-change';
export function readPending(){try{const saved=JSON.parse(sessionStorage.getItem(pendingKey)??'null');return typeof saved?.identity==='string'&&typeof saved?.operationId==='string'?saved:null;}catch{return null;}}
function clearPending(){sessionStorage.removeItem(pendingKey);window.dispatchEvent(new Event(pendingEvent));}
export function PendingApprovedSourceRecovery(props:Omit<Props,'sources'|'statusOnly'>){
  const [saved,setSaved]=useState(readPending);
  useEffect(()=>{const update=()=>setSaved(readPending());window.addEventListener(pendingEvent,update);return()=>window.removeEventListener(pendingEvent,update);},[]);
  if(!saved)return null;
  let sources:RecoverySource[];try{sources=JSON.parse(saved.identity);if(!Array.isArray(sources))return null;}catch{return null;}
  return <ApprovedSourceRecovery {...props} sources={sources} kind={saved.kind==='moon-reusable'?saved.kind:undefined} statusOnly />;
}
/** An explicit recovery action; neither closing nor saving the editor invokes it. */
export function ApprovedSourceRecovery({sources,disabled,request,onRecovered,onBusy,onSettled,statusOnly=false,kind}:Props){
  const identity=JSON.stringify(sources);
  const latest=useRef({request,onRecovered,onBusy,onSettled});latest.current={request,onRecovered,onBusy,onSettled};
  const call=(body:Record<string,unknown>)=>latest.current.request({...body,...(kind?{recoveryKind:kind}:{})});
  const [plan,setPlan]=useState<{sources:PlannedSource[];packageVersion:string}|null>(null);
  const [expanded,setExpanded]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const [pending,setPending]=useState<string|null>(null);
  useEffect(()=>{const update=()=>{const saved=readPending(),active=saved?.identity===identity&&saved?.kind===kind;setPending(active?saved.operationId:null);};update();window.addEventListener(pendingEvent,update);return()=>window.removeEventListener(pendingEvent,update);},[identity,kind]);
  useEffect(()=>{
    let cancelled=false;setPlan(null);setExpanded(false);setError('');setPending(null);
    const saved=readPending();if(saved){if(saved.identity===identity&&saved.kind===kind){setPending(saved.operationId);setExpanded(true);}return;}
    if(statusOnly||!sources.length)return;
    call({action:'preview',sources:JSON.parse(identity)}).then(result=>{
      if(!cancelled&&result.ok&&Array.isArray(result.sources))setPlan(result);
    }).catch(()=>{/* Unsupported or unavailable recovery must not offer a write action. */});
    return()=>{cancelled=true;};
  },[identity,kind,statusOnly]);
  const run=async(checkOnly=false,cancel=false)=>{
    if(disabled||busy||(!pending&&!plan))return;
    setBusy(true);latest.current.onBusy?.(true);setError('');
    try{
      let operationId=pending;
      if(!operationId){
        operationId=crypto.randomUUID();
        // Persist before dispatch; a reload can only check, never replay, this operation.
        sessionStorage.setItem(pendingKey,JSON.stringify({identity,operationId,kind}));setPending(operationId);window.dispatchEvent(new Event(pendingEvent));
      }
      const result=await call(checkOnly?{action:cancel?'cancel':'status',operationId}:{action:'restore',operationId,sources:plan!.sources});
      if(result.state==='cancelled'){clearPending();setPending(null);setError('');latest.current.onSettled?.('Unconfirmed recovery stopped. Saved writing has not changed.');return;}
      if(result.state==='unconfirmed')throw new Error('Recovery is not confirmed. Check again before making another change.');
      if(result.state==='changed'){clearPending();setPending(null);latest.current.onSettled?.('This source changed after recovery. Reload to see its current state. This check did not change saved writing.');return;}
      if(!result.ok||!Array.isArray(result.recovered)||!result.recovered.length)throw new Error('Recovery is not confirmed. Check the saved result before continuing.');
      clearPending();setPending(null);latest.current.onRecovered(result.recovered);
    }catch(failure){
      const status=(failure as {status?:number})?.status;
      if(!checkOnly&&status&&[400,401,409,422].includes(status)){clearPending();setPending(null);}
      setError((failure as {details?:string})?.details||(failure instanceof Error?failure.message:'Recovery is not confirmed. Check its status.'));
    }
    finally{setBusy(false);latest.current.onBusy?.(false);}
  };
  if(!plan&&!pending||pending&&!statusOnly)return null;
  return <div className="admin-savebar-next-step" aria-label={kind?'Moon reading recovery':'Approved source recovery'}>
    {!expanded?<StudioButton type="button" className="admin-secondary-button" disabled={disabled||busy} onClick={()=>setExpanded(true)}>{kind?'Use reusable Moon readings':'Use approved source'}</StudioButton>:<>
      <p>{kind?'Readers will receive the available approved reusable Moon readings. Your dated readings stay archived and unchanged.':'Readers will receive the installed approved source. Your saved writing stays recoverable in source history.'}</p>
      {plan&&<p>Installed version: {plan.packageVersion}</p>}
      {pending?<>
        <StudioButton type="button" disabled={disabled||busy} onClick={()=>void run(true)}>{busy?'Checking recovery…':'Check recovery'}</StudioButton>
        <StudioButton type="button" className="admin-secondary-button" disabled={disabled||busy} onClick={()=>void run(true,true)}>Stop unconfirmed recovery</StudioButton>
      </>:<>
        <StudioButton type="button" disabled={disabled||busy} onClick={()=>void run()}>{kind?'Use reusable Moon readings':`Restore approved source${sources.length===2?' pair':''}`}</StudioButton>
        <StudioButton type="button" className="admin-secondary-button" disabled={busy} onClick={()=>setExpanded(false)}>Cancel</StudioButton>
      </>}
      {error&&<p role="alert">{error}</p>}
    </>}
  </div>;
}
