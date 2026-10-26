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
      <p>Candidates remain private and need your approval.</p>
      {accepted&&<EvidenceText caption="Private accepted candidate" label="Private accepted Seasonal candidate" rows={14} value={`${accepted.headline}\n\n${accepted.body}`}/>}
      {!accepted&&<p>No accepted candidate. Failed attempts remain available.</p>}
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
    <p>These records do not approve writing. Original drafts and reviews stay separate from your edits.</p>
  </Disclosure>;
}

/** Authenticated Studio only. Exact source text is never rendered as HTML. */
function HoroscopeEvidenceDetails({receipt,saved=false}:{receipt:any;saved?:boolean}) {
  const request=receipt?.providerRequest;
  return <Disclosure title={saved?'Writing evidence used':'Writing evidence for this plan'}>
    {!receipt?<p>No saved evidence receipt. A new plan cannot reconstruct this request.</p>:<>
      <p>{receipt.distinctPassageCount} distinct complete passages · {receipt.passages.length} source references · {receipt.profile.id?`saved profile revision ${receipt.profile.revision}`:'starter profile'}</p>
      <p>Evidence {saved?'saved with this request':'prepared for this reading'}. Historical source astrology is not current facts.</p>
      {receipt.passages.map(({text,...source}:any,index:number)=><Disclosure key={`${source.id}-${index}`} title={`${source.role} · ${index+1}`}>
        <EvidenceText caption="Complete source passage" label={`Complete source passage ${index+1}`} value={text}/>
        <EvidenceText caption="Source, exact-text hash and selection reasons" label={`Source and exact-text hash ${index+1}`} rows={8} value={source}/>
      </Disclosure>)}
      <Disclosure title="Corrections and rejected readings">
        <p>Rejected readings are negative evidence for this edition and sign only.</p>
        <EvidenceText label="Complete corrections and rejected readings" value={{selectedCorrections:receipt.corrections,savedCorrections:receipt.savedCorrections,rejectedReadings:receipt.rejectedExamples}}/>
      </Disclosure>
      {receipt.selection&&<Disclosure title="Eligible sources and selection reasons">
        <p>Word matches do not establish voice. Sign names do not affect ranking.</p>
        <EvidenceText label="Eligible sources and selection reasons" rows={14} value={receipt.selection}/>
      </Disclosure>}
      {request&&<Disclosure title="Exact writer input">
        <EvidenceText label="Exact writer request" rows={20} value={request}/>
      </Disclosure>}
    </>}
  </Disclosure>;
}

function HoroscopeRejectionHistory({rejections,period}:{rejections:any[];period:string}) {
  return <Disclosure title="Rejected drafts"><p>{period==='weekly'?'Latest rejections are negative evidence for this edition and sign only.':'Rejections are saved for reference only.'}</p>{[...rejections].reverse().map((entry:any)=><details key={entry.id}><AdminDisclosureSummary>{entry.scope==='all'?'All drafts':horoscopeSignLabel(entry.scope)} · {new Date(entry.rejectedAt).toLocaleString()}</AdminDisclosureSummary>{entry.passages.map((saved:any)=>horoscopeRejectionPassage(entry,saved.sign)??saved).map((p:any)=><EvidenceText key={p.sign} caption={horoscopeSignLabel(p.sign)} label={`Rejected ${horoscopeSignLabel(p.sign)} reading`} rows={6} value={`${p.headline}\n\n${p.body}`}/>)}</details>)}</Disclosure>;
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

export type HoroscopeGenerationState='running'|'paused'|'checking'|'sync'|'saving'|'active'|'ready'|'attention'|'prepare'|'approval'|'generate';
const generationNotices:Record<Exclude<HoroscopeGenerationState,'approval'>,string>={
  running:'Generating the approved batch. You can leave this page.',
  paused:'The batch is paused. Sent requests can still finish; resume with its saved approval.',
  checking:'Retrieving the saved request; no new generation.',
  sync:'Paused. Check saved progress; completed readings are kept.',
  saving:'Completed readings save automatically.',
  active:'Continue the existing request.',
  ready:'Drafts are ready to review.',
  attention:'Resolve flagged drafts or interrupted requests.',
  prepare:'Prepare the current writing plan.',
  generate:'Ready to generate missing readings.'
};

export {default as WeeklyBatchEditorial} from './WeeklyBatchEditorial';

export default function HoroscopeGenerationDetails({view,...props}:{view:"evidence"|"seasonal"|"rejections"|"reviews"|"generation";[key:string]:any}) {
  if(view==='generation'){
    const {period,available,retrySign,showBudget}=props;
    const state:HoroscopeGenerationState=props.state;
    return <>
      <p aria-live="polite">{state==='approval'?`Check the plan approval box to ${retrySign?'retry':'continue'}.`:generationNotices[state]}</p>
      {showBudget&&<p>{period==='seasonal'?`Up to ${(retrySign?1:available)*30} paid AI requests: at most 3 plans and 3 prose candidates per reading, independently evaluated. Candidates stay private.`:period==='weekly'?`Up to ${2*available+2} paid AI requests: one twelve-sign plan, drafts and prose checks, then a full-set review.`:period==='monthly'?'Up to 3 paid AI requests: plan, draft and prose check. Matching saved plans are reused.':`Up to ${2*(retrySign?1:available)} paid AI requests: a draft and prose check per reading.`}{period!=='seasonal'&&' No automatic rewrites or paid retries. You approve wording.'}</p>}

    </>;
  }
  if(view==='reviews')return <HoroscopeReviewHolds holds={props.holds} locked={props.locked} active={props.active} canRecover={props.canRecover} onRecover={props.onRecover} onEdit={props.onEdit} onReject={props.onReject}/>;
  if(view==='seasonal')return <SeasonalGenerationDetails {...props}/>;
  if(view==='rejections')return <HoroscopeRejectionHistory rejections={props.rejections} period={props.period}/>;
  return <HoroscopeEvidenceDetails receipt={props.receipt} saved={props.saved}/>;
}
