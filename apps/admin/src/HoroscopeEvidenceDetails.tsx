import {AdminDisclosureSummary} from './AdminNativeControls';
import {StudioTextarea} from './StudioControls';

/** Authenticated Studio only. Exact source text is never rendered as HTML. */
export function HoroscopeEvidenceDetails({receipt,saved=false}:{receipt:any;saved?:boolean}) {
  const request=receipt?.providerRequest;
  const instructions=request?.instructions??request?.system_instruction??request?.system;
  const input=request?.input??request?.messages?.find((m:any)=>m.role==='user')?.content;
  return <details className="admin-workspace-details">
    <AdminDisclosureSummary>{saved?'Writing evidence used':'Writing evidence for this plan'}</AdminDisclosureSummary>
    {!receipt?<p>This older reading has no complete evidence receipt. Preparing a new plan will not reconstruct what its writer received.</p>:<>
      <p>{receipt.distinctPassageCount} distinct complete passages · {receipt.passages.length} source references · {receipt.profile.id?`saved profile revision ${receipt.profile.revision}`:'starter profile'}</p>
      <p>{saved?'These sources and instructions were saved with this request.':'These are the complete selected passages and saved comparisons prepared for this reading.'} Historical astrology in the examples is not used as current facts.</p>
      {receipt.passages.map((p:any,index:number)=><details className="admin-workspace-details" key={`${p.id}-${index}`}>
        <AdminDisclosureSummary>{p.role} · {index+1}</AdminDisclosureSummary>
        {p.selection&&<p>{p.selection.surfaceCompatibility}. Matched life-area or outline words: {p.selection.matches.humanSituation.join(', ')||'none'}. Matched meaning words: {p.selection.matches.mechanism.join(', ')||'none'}.</p>}
        {p.reason&&<p>{p.reason}</p>}
        {p.duplicateOf&&<p>This repeats the exact text of another source reference and is counted once.</p>}
        <label className="admin-review-copy-editor"><span>Complete source passage</span><StudioTextarea aria-label={`Complete source passage ${index+1}`} readOnly rows={10} value={p.text}/></label>
        <label className="admin-review-copy-editor"><span>Source and exact-text hash</span><StudioTextarea readOnly rows={3} value={`${p.id}\n${p.sourcePath}\n${p.sha256}`}/></label>
      </details>)}
      <details className="admin-workspace-details"><AdminDisclosureSummary>Corrections and rejected readings</AdminDisclosureSummary>
        <p>Rejected readings apply to this edition and sign. They are never positive writing examples.</p>
        <StudioTextarea aria-label="Complete corrections and rejected readings" readOnly rows={10} value={JSON.stringify({selectedCorrections:receipt.corrections,savedCorrections:receipt.savedCorrections,rejectedReadings:receipt.rejectedExamples},null,2)}/>
      </details>
      {receipt.selection&&<details className="admin-workspace-details"><AdminDisclosureSummary>Eligible sources and selection reasons</AdminDisclosureSummary>
        <p>These are word matches to the outline and calculated meanings, not a judgment that a passage has the right voice. Source sign names do not receive a ranking bonus.</p>
        <StudioTextarea aria-label="Eligible sources and selection reasons" readOnly rows={14} value={JSON.stringify(receipt.selection,null,2)}/>
      </details>}
      {request&&<details className="admin-workspace-details"><AdminDisclosureSummary>Exact writer input</AdminDisclosureSummary>
        <StudioTextarea aria-label="Exact writer instructions" readOnly rows={8} value={instructions}/>
        <StudioTextarea aria-label="Exact writer input" readOnly rows={16} value={input}/>
      </details>}
    </>}
  </details>;
}
