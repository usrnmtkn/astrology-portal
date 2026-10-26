import {type ReactNode} from 'react';
import {AdminDisclosureSummary} from './AdminNativeControls';
import {StudioButton,StudioTextarea} from './StudioControls';
import {horoscopeSignLabel,horoscopeRejectionPassage} from '../../web/src/content/horoscopeEditions.mjs';

function Disclosure({title,children}:{title:ReactNode;children:ReactNode}) {
  return <details className="admin-workspace-details"><AdminDisclosureSummary>{title}</AdminDisclosureSummary>{children}</details>;
}
function EvidenceText({label,value,rows=10,caption}:{label:string;value:any;rows?:number;caption?:string}) {
  const field=<StudioTextarea aria-label={label} readOnly rows={rows} value={typeof value==='string'?value:JSON.stringify(value,null,2)}/>;
  return caption?<label className="admin-review-copy-editor"><span>{caption}</span>{field}</label>:field;
}

function SeasonalGenerationDetails({receipt,run}:{receipt?:any;run?:any}) {
  if(run){
    const accepted=run.acceptedCandidate&&run.artifacts.find((a:any)=>a.id===run.acceptedCandidate.artifactId)?.value;
    return <Disclosure title="Seasonal generation record">
      <p>Private run: {run.status}. {run.counts.calls} model calls; {run.counts.plan} plans; {run.counts.prose} prose candidates.</p>
      <p>These candidates have not been copied into the edition or approved for publication.</p>
      {accepted&&<EvidenceText caption="Private accepted candidate" label="Private accepted Seasonal candidate" rows={14} value={`${accepted.headline}\n\n${accepted.body}`}/>}
      {!accepted&&<p>No accepted candidate is available. Failed attempts remain inspection records.</p>}
      {run.artifacts.filter((a:any)=>!['call_reserved','model_response'].includes(a.kind)).map((a:any)=><Disclosure key={a.id} title={`${a.kind.replaceAll('_',' ')} · ${a.id.split(':').at(-1)}`}>
        <EvidenceText label={`Seasonal ${a.kind} ${a.id.split(':').at(-1)}`} value={a.value}/>
      </Disclosure>)}
    </Disclosure>;
  }
  if(!receipt?.developmentPlan)return null;
  const {originalDraft,...details}=receipt;
  return <Disclosure title="Seasonal generation record">
    {originalDraft&&<EvidenceText caption="Original writer draft" label="Original Seasonal writer draft" rows={8} value={`${originalDraft.headline}\n\n${originalDraft.body}`}/>}
    <EvidenceText caption="Complete development, source and review details" label="Complete Seasonal generation details" rows={16} value={details}/>
    <p>These records do not approve the writing. The original draft and review remain separate from your edits.</p>
  </Disclosure>;
}

/** Authenticated Studio only. Exact source text is never rendered as HTML. */
function HoroscopeEvidenceDetails({receipt,saved=false}:{receipt:any;saved?:boolean}) {
  const request=receipt?.providerRequest;
  return <Disclosure title={saved?'Writing evidence used':'Writing evidence for this plan'}>
    {!receipt?<p>No evidence receipt was saved for this reading. A new plan cannot reconstruct an earlier request.</p>:<>
      <p>{receipt.distinctPassageCount} distinct complete passages · {receipt.passages.length} source references · {receipt.profile.id?`saved profile revision ${receipt.profile.revision}`:'starter profile'}</p>
      <p>Complete evidence {saved?'saved with this request':'prepared for this reading'}. Source astrology is historical, not current facts.</p>
      {receipt.passages.map(({text,...source}:any,index:number)=><Disclosure key={`${source.id}-${index}`} title={`${source.role} · ${index+1}`}>
        <EvidenceText caption="Complete source passage" label={`Complete source passage ${index+1}`} value={text}/>
        <EvidenceText caption="Source, exact-text hash and selection reasons" label={`Source and exact-text hash ${index+1}`} rows={8} value={source}/>
      </Disclosure>)}
      <Disclosure title="Corrections and rejected readings">
        <p>Rejected readings apply to this edition and sign. They are never positive writing examples.</p>
        <EvidenceText label="Complete corrections and rejected readings" value={{selectedCorrections:receipt.corrections,savedCorrections:receipt.savedCorrections,rejectedReadings:receipt.rejectedExamples}}/>
      </Disclosure>
      {receipt.selection&&<Disclosure title="Eligible sources and selection reasons">
        <p>Word matches do not establish voice. Source sign names do not affect ranking.</p>
        <EvidenceText label="Eligible sources and selection reasons" rows={14} value={receipt.selection}/>
      </Disclosure>}
      {request&&<Disclosure title="Exact writer input">
        <EvidenceText label="Exact writer request" rows={20} value={request}/>
      </Disclosure>}
    </>}
  </Disclosure>;
}

function HoroscopeRejectionHistory({rejections,period}:{rejections:any[];period:string}) {
  return <Disclosure title="Rejected drafts"><p>{period==='weekly'?'Latest complete rejections are negative evidence for this edition and sign only.':'Rejections are saved for reference only.'}</p>{[...rejections].reverse().map((entry:any)=><details key={entry.id}><AdminDisclosureSummary>{entry.scope==='all'?'All drafts':horoscopeSignLabel(entry.scope)} · {new Date(entry.rejectedAt).toLocaleString()}</AdminDisclosureSummary>{entry.passages.map((saved:any)=>horoscopeRejectionPassage(entry,saved.sign)??saved).map((p:any)=><EvidenceText key={p.sign} caption={horoscopeSignLabel(p.sign)} label={`Rejected ${horoscopeSignLabel(p.sign)} reading`} rows={6} value={`${p.headline}\n\n${p.body}`}/>)}</details>)}</Disclosure>;
}

function HoroscopeReviewHolds({holds,locked,active,canRecover,onRecover,onEdit,onReject}:{holds:[string,any][];locked:boolean;active:boolean;canRecover:(held:any)=>boolean;onRecover:(sign:string)=>void;onEdit:(sign:string,held:any)=>void;onReject:(sign:string)=>void}) {
  return <>{holds.map(([sign,held])=><section key={sign} aria-label={`${horoscopeSignLabel(sign)} prose review`}>
    <h3>{horoscopeSignLabel(sign)} {held.code==='rhetorical_pattern'?'needs a prose edit':'prose check did not finish'}</h3><p>{held.message}</p>
    {(held.review?.rhetoric?.findings??[]).map((finding:any,index:number)=><div key={index}><strong>{finding.label}</strong><blockquote>{finding.quote}</blockquote><p>{finding.reason} {finding.readerConsequence}</p></div>)}
    {canRecover(held)&&<StudioButton disabled={locked||active} onClick={()=>onRecover(sign)}>Check saved {horoscopeSignLabel(sign)} prose review</StudioButton>}
    <StudioButton disabled={locked} onClick={()=>onEdit(sign,held)}>Edit saved {horoscopeSignLabel(sign)} draft</StudioButton>
    <StudioButton disabled={locked} onClick={()=>onReject(sign)}>Reject {horoscopeSignLabel(sign)} draft</StudioButton>
  </section>)}</>;
}

export {default as WeeklyBatchEditorial} from './WeeklyBatchEditorial';

export default function HoroscopeGenerationDetails({view,...props}:{view:"evidence"|"seasonal"|"rejections"|"reviews"|"generation";[key:string]:any}) {
  if(view==='generation'){
    const {period,available,retrySign,serverRunning,serverPaused,checking,needsSync,busy,active,empty,dirty,plan,planApproved}=props;
    return <>
      <p>{serverRunning?'Generating the approved batch. You can leave this page.':serverPaused?'The batch is paused. Resume to continue its saved approval.':checking?'Retrieving your saved request. This does not start another generation.':needsSync?'Paused. Check saved progress before continuing; completed readings are kept.':busy?'Each completed reading is saved automatically.':active?'Continue the saved request without starting it again.':empty===0?'Your drafts are ready to review.':available===0?'The remaining readings need attention above. Edit or reject a saved draft, or resolve an interrupted request.':dirty||!plan?'Prepare the current writing plan to continue.':!planApproved?`Check the plan approval box to ${retrySign?'retry':'continue'}.`:'Ready to generate the missing readings.'}</p>
      {!serverRunning&&!serverPaused&&plan&&!active&&available>0&&<p>{period==='weekly'&&`This batch covers all ${available} remaining ${available===1?'reading':'readings'}. `}{period==='seasonal'?`Up to ${(retrySign?1:available)*30} paid AI requests, bounded at 3 plans and 3 prose candidates per reading, with independent evaluations. Accepted candidates remain private for inspection.`:period==='weekly'?`Up to ${2*available+2} paid AI requests: one shared twelve-sign plan, one draft and one prose check per remaining reading, and one comparison of the complete set.`:period==='monthly'?'Up to 3 paid AI requests: one plan, one draft, and one prose check. Matching saved plans are reused.':`Up to ${2*(retrySign?1:available)} paid AI requests: one draft and one prose check per reading.`}{period!=='seasonal'&&' No automatic rewrites or paid retries. You approve the final wording.'}</p>}
    </>;
  }
  if(view==='reviews')return <HoroscopeReviewHolds holds={props.holds} locked={props.locked} active={props.active} canRecover={props.canRecover} onRecover={props.onRecover} onEdit={props.onEdit} onReject={props.onReject}/>;
  if(view==='seasonal')return <SeasonalGenerationDetails {...props}/>;
  if(view==='rejections')return <HoroscopeRejectionHistory rejections={props.rejections} period={props.period}/>;
  return <HoroscopeEvidenceDetails receipt={props.receipt} saved={props.saved}/>;
}
