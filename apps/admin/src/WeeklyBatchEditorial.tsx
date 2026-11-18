import {useEffect,useState} from 'react';
import {AdminDisclosureSummary} from './AdminNativeControls';
import {StudioButton,StudioTextarea} from './StudioControls';

export default function WeeklyBatchEditorial({period='weekly',gate,complete,dirty,disabled,running,hasPlan,planHash,onPrepare,onAction,onConcernDirty}:any){
  const daily=period==='daily',reviewAction='review-'+period,pollAction='poll-'+period,releaseAction='release-'+period;
  const [edits,setEdits]=useState<Record<string,any>>({});
  const unsaved=Object.keys(edits).length>0;
  useEffect(()=>{onConcernDirty?.(unsaved);return()=>onConcernDirty?.(false);},[unsaved,onConcernDirty]);
  function discard(sign:string){setEdits(current=>{const next={...current};delete next[sign];return next;});}
  const pending=gate?.pending;
  const plan=gate?.plan,review=gate?.review;
  const concernsCurrent=Boolean(planHash&&plan?.scopeHash===planHash);
  const findings=[...(plan?.status==='failed'?plan.findings??[]:[]),...(review?.matchesCurrent===true?review.findings??[]:[])];
  const current=review?.status==='passed'&&review.current&&!dirty&&!unsaved;
  function act(action:string){
    if(disabled||dirty||unsaved)return;
    if(action===releaseAction&&!window.confirm('This check may be billed. Release its unknown outcome?'))return;
    void onAction(action,{
      ...(['plan-weekly',reviewAction].includes(action)?{approvedPlanHash:planHash}:{}),
      ...(action===releaseAction?{acknowledgeUnknownOutcome:true}:{})
    });
  }
  return <section className="admin-horoscope-plan" aria-label={daily?'Daily batch editorial gate':'Weekly batch editorial gate'}>
    <p aria-live="polite">{pending?pending.phase==='planning'?'Planning twelve distinct concerns…':'Checking all twelve readings…':current?'The current twelve-sign set passed its batch comparison.':review&&(!review.matchesCurrent||dirty)?'Batch check out of date. Save and recheck.':review?.status==='failed'?'Edit flagged readings, then recheck.':daily?complete?'Review all twelve Daily readings for repeated interpretations, openings and endings.':'The full-set Daily review runs after all twelve readings are saved.':['owner-edited','passed'].includes(plan?.status)?'Twelve concerns saved.':'Plan twelve distinct concerns before drafting.'}</p>
    {plan?.error&&<p role="alert">{plan.error}</p>}
    {review?.error&&<p role="alert">{review.error}</p>}
    {findings.map((finding:any,index:number)=><div className="admin-inline-warning" role="note" key={index}>
      <p>{finding.category.replaceAll('_',' ')}: {finding.reason}</p>
      {[...finding.evidence,...(finding.priorEvidence??[])].map((e:any,i:number)=><p key={i}>{e.editionId&&'Prior week · '}{e.sign}: “{e.quote}”</p>)}
    </div>)}
    {plan?.concerns&&<details className="admin-workspace-details"><AdminDisclosureSummary>Shared concerns for all twelve signs</AdminDisclosureSummary>
      {hasPlan&&!concernsCurrent&&<p>Save your edits, then refresh the plan before drafting.</p>}
      {plan.concerns.map((concern:any)=>{
        const label=concern.sign[0].toUpperCase()+concern.sign.slice(1),value=edits[concern.sign]??concern;
        const fields=[['coreConcern','Concern'],['stakes','Stakes'],['distinctiveObservation','Observation']];
        return <div key={concern.sign}>
          <p><strong>{concern.sign}: </strong>{concern.coreConcern}</p>
          {fields.map(([key,title])=><label className="admin-review-copy-editor" key={key}><span>{title}</span>
            <StudioTextarea aria-label={`${label} ${title.toLowerCase()}`} rows={3} maxLength={5000} value={value[key]} disabled={disabled||dirty||running||Boolean(pending)||!hasPlan}
              onChange={event=>setEdits(current=>({...current,[concern.sign]:Object.fromEntries(fields.map(([field])=>[field,field===key?event.target.value:value[field]]))}))}/>
          </label>)}
          <div className="admin-toolbar-actions">
            <StudioButton disabled={disabled||dirty||running||Boolean(pending)||!hasPlan||!edits[concern.sign]||fields.some(([key])=>!value[key].trim())}
              onClick={async()=>{if(await onAction('save-weekly-concern',{sign:concern.sign,concern:edits[concern.sign],approvedPlanHash:planHash}))discard(concern.sign);}}>Save {label} concern</StudioButton>
            {edits[concern.sign]&&<StudioButton disabled={disabled} onClick={()=>discard(concern.sign)}>Discard {label} changes</StudioButton>}
          </div>
        </div>;
      })}
      {unsaved&&<p role="status">Save or discard edits before generating.</p>}
    </details>}
    {!running&&<div className="admin-toolbar-actions">
      {pending?<>
        <StudioButton disabled={disabled||dirty||unsaved} onClick={()=>act(pollAction)}>Check saved batch progress</StudioButton>
        {Date.now()-Date.parse(pending.startedAt)>=310000&&<StudioButton disabled={disabled||dirty||unsaved} onClick={()=>act(releaseAction)}>Release interrupted batch check</StudioButton>}
      </>:!hasPlan?<StudioButton disabled={disabled||dirty||unsaved} onClick={onPrepare}>Load batch review plan</StudioButton>:<>
        {complete&&!current&&<StudioButton disabled={disabled||dirty||unsaved} onClick={()=>act(reviewAction)}>Review all twelve · 1 AI request</StudioButton>}
        {!daily&&!plan?.concerns&&<StudioButton disabled={disabled||dirty||unsaved} onClick={()=>act('plan-weekly')}>Plan twelve concerns · 1 AI request</StudioButton>}
        {!daily&&plan&& (!['passed','owner-edited'].includes(plan.status)||!concernsCurrent)&&<StudioButton disabled={disabled||dirty||unsaved} onClick={()=>act('plan-weekly')}>Plan twelve concerns again · 1 AI request</StudioButton>}
      </>}
    </div>}
  </section>;
}
