import {type ReactNode} from 'react';
import {AdminDisclosureSummary} from './AdminNativeControls';
import {StudioTextarea} from './StudioControls';
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

export default function HoroscopeGenerationDetails({view,...props}:{view:"evidence"|"seasonal"|"rejections";[key:string]:any}) {
  if(view==='seasonal')return <SeasonalGenerationDetails {...props}/>;
  if(view==='rejections')return <HoroscopeRejectionHistory rejections={props.rejections} period={props.period}/>;
  return <HoroscopeEvidenceDetails receipt={props.receipt} saved={props.saved}/>;
}
