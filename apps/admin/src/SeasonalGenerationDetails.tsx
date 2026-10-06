import {AdminDisclosureSummary} from './AdminNativeControls';
import {StudioTextarea} from './StudioControls';

export function SeasonalGenerationDetails({receipt,run}:{receipt?:any;run?:any}) {
  if(run){
    const accepted=run.acceptedCandidate&&run.artifacts.find((a:any)=>a.id===run.acceptedCandidate.artifactId)?.value;
    return <details className="admin-workspace-details">
      <AdminDisclosureSummary>Seasonal generation record</AdminDisclosureSummary>
      <p>Private run: {run.status}. {run.counts.calls} model calls; {run.counts.plan} plans; {run.counts.prose} prose candidates.</p>
      <p>These candidates have not been copied into the edition or approved for publication.</p>
      {accepted&&<label className="admin-review-copy-editor"><span>Private accepted candidate</span><StudioTextarea readOnly rows={14} aria-label="Private accepted Seasonal candidate" value={`${accepted.headline}\n\n${accepted.body}`}/></label>}
      {!accepted&&<p>No accepted candidate is available. Failed attempts remain inspection records.</p>}
      {run.artifacts.filter((a:any)=>!['call_reserved','model_response'].includes(a.kind)).map((a:any)=><details key={a.id} className="admin-workspace-details">
        <AdminDisclosureSummary>{a.kind.replaceAll('_',' ')} · {a.id.split(':').at(-1)}</AdminDisclosureSummary>
        <StudioTextarea readOnly rows={10} aria-label={`Seasonal ${a.kind} ${a.id.split(':').at(-1)}`} value={JSON.stringify(a.value,null,2)}/>
      </details>)}
    </details>;
  }
  if(!receipt?.developmentPlan)return null;
  const plan=receipt.developmentPlan.value,review=receipt.editorialReview;
  const labels:Record<string,string>={astrologyFacts:'Astrology facts',currentRules:'Current rules',ownerPassages:'Owner passages',developmentPlan:'Development plan',schemaAndMetadata:'Schema and metadata'};
  return <details className="admin-workspace-details">
    <AdminDisclosureSummary>Seasonal generation record</AdminDisclosureSummary>
    <p>Internal development plan</p>
    <p>{plan.startingSituation}</p><p>{plan.humanWant}</p>
    <ol>{plan.developments.map((d:any)=><li key={d.eventId}>{d.whatChanges}</li>)}</ol>
    <p>{plan.changedUnderstanding}</p><p>{plan.differentResponse}</p>
    <p>Selected owner passages</p>
    <ul>{(receipt.selectedPassages??[]).map((p:any)=><li key={p.id}>{p.sourcePath}: {p.selectionReason}</li>)}</ul>
    {receipt.contextBudget&&<>
      <p>Writer context size</p><p>{receipt.contextBudget.method}</p>
      <ul>{Object.entries(receipt.contextBudget.sections).map(([key,value]:[string,any])=><li key={key}>{labels[key]??key}: {value.characters.toLocaleString()} characters · approximately {value.estimatedTokens.toLocaleString()} tokens</li>)}</ul>
      <p>Total: {receipt.contextBudget.total.characters.toLocaleString()} characters · approximately {receipt.contextBudget.total.estimatedTokens.toLocaleString()} tokens</p>
      {receipt.usage?.input_tokens!=null&&<p>Provider input usage: {receipt.usage.input_tokens.toLocaleString()} tokens</p>}
    </>}
    {receipt.originalDraft&&<label className="admin-review-copy-editor"><span>Original writer draft</span><StudioTextarea readOnly rows={8} aria-label="Original Seasonal writer draft" value={`${receipt.originalDraft.headline}\n\n${receipt.originalDraft.body}`}/></label>}
    <p>Deterministic validation: {receipt.lint?.passed?'passed':'requires correction'}</p>
    {(receipt.lint?.violations??[]).map((f:any,i:number)=><p key={i}>{f.detail}</p>)}
    <p>Editorial review: {review?.status==='complete'?'complete; advisory only':review?.status==='failed'?'failed; original draft preserved':review?.status==='not_run_factual_failure'?'not run because factual checks failed':'pending'}</p>
    {review?.error&&<p>{review.error.message}</p>}
    {review?.report&&<><p>{review.report.comparison}</p><ul>{review.report.findings.map((f:any,i:number)=><li key={i}>Paragraph {f.paragraph}: “{f.quote}” {f.reason}</li>)}</ul></>}
    <p>These records do not approve the writing. The original draft and review remain separate from your edits.</p>
  </details>;
}
