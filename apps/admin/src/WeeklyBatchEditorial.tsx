import {AdminDisclosureSummary} from './AdminNativeControls';
import {StudioButton} from './StudioControls';

export default function WeeklyBatchEditorial({gate,complete,dirty,disabled,running,hasPlan,planHash,onPrepare,onAction}:any){
  const pending=gate?.pending;
  const plan=gate?.plan,review=gate?.review;
  const findings=[...(plan?.status==='failed'?plan.findings??[]:[]),...(review?.matchesCurrent===true?review.findings??[]:[])];
  const current=review?.status==='passed'&&review.current&&!dirty;
  function act(action:string){
    if(disabled||dirty)return;
    if(action==='release-weekly'&&!window.confirm('This check may be billed. Release its unknown outcome?'))return;
    void onAction(action,{
      ...(['plan-weekly','review-weekly'].includes(action)?{approvedPlanHash:planHash}:{}),
      ...(action==='release-weekly'?{acknowledgeUnknownOutcome:true}:{})
    });
  }
  return <section className="admin-horoscope-plan" aria-label="Weekly batch editorial gate">
    <p aria-live="polite">{pending?pending.phase==='planning'?'Planning twelve distinct concerns…':'Checking all twelve readings…':current?'The current twelve-sign set passed its batch comparison.':review&&(!review.matchesCurrent||dirty)?'Batch check out of date. Save and recheck.':review?.status==='failed'?'Edit flagged readings, then recheck.':plan?.status==='passed'?'Twelve concerns saved.':'Plan twelve distinct concerns before drafting.'}</p>
    {plan?.error&&<p role="alert">{plan.error}</p>}
    {review?.error&&<p role="alert">{review.error}</p>}
    {findings.map((finding:any,index:number)=><div className="admin-inline-warning" role="note" key={index}>
      <p>{finding.category.replaceAll('_',' ')}: {finding.reason}</p>
      {finding.evidence.map((e:any,i:number)=><p key={i}>{e.sign}: “{e.quote}”</p>)}
    </div>)}
    {plan?.concerns&&<details className="admin-workspace-details"><AdminDisclosureSummary>Shared concerns for all twelve signs</AdminDisclosureSummary>
      {plan.concerns.map((concern:any)=><div key={concern.sign}><p><strong>{concern.sign}: </strong>{concern.coreConcern}</p><p>{concern.stakes}</p><p>{concern.distinctiveObservation}</p></div>)}
    </details>}
    {!running&&<div className="admin-toolbar-actions">
      {pending?<>
        <StudioButton disabled={disabled||dirty} onClick={()=>act('poll-weekly')}>Check saved batch progress</StudioButton>
        {Date.now()-Date.parse(pending.startedAt)>=310000&&<StudioButton disabled={disabled||dirty} onClick={()=>act('release-weekly')}>Release interrupted batch check</StudioButton>}
      </>:!hasPlan?<StudioButton disabled={disabled||dirty} onClick={onPrepare}>Load batch review plan</StudioButton>:<>
        {complete&&!current&&<StudioButton disabled={disabled||dirty} onClick={()=>act('review-weekly')}>Review all twelve · 1 AI request</StudioButton>}
        {plan&&plan.status!=='passed'&&<StudioButton disabled={disabled||dirty} onClick={()=>act('plan-weekly')}>Plan twelve concerns again · 1 AI request</StudioButton>}
      </>}
    </div>}
  </section>;
}
