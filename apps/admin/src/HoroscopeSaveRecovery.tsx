import React from 'react';
import {AdminDisclosureSummary} from './AdminNativeControls';
import {StudioButton,StudioTextarea} from './StudioControls';
export {reconcileHoroscopeEdits,horoscopeEditableState} from './horoscopeEditReconciliation';

/** A lost first revision reply leaves the live source unchanged. Check its
 * private revision before offering a retry; never replay the draft write. */
export async function readHoroscopeDraftAfterFailure(saved:any,readSaved:(id:string)=>Promise<any>,read:(url:string)=>Promise<any>){
  let latest=await readSaved(saved.id);
  if(saved.status==='LIVE'&&latest.updated_at===saved.updated_at){
    const result=await read('/api/admin/generated-content?'+new URLSearchParams({horoscopeEditions:'true',contentKey:saved.content_key}));
    const revision=result.rows?.[0];
    if(revision?.event_type==='horoscope-edition-revision'&&revision.source_snapshot?.targetRowId===saved.id&&revision.source_snapshot?.targetRowUpdatedAt===saved.updated_at)latest=revision;
  }
  return latest.updated_at===saved.updated_at?null:latest;
}

export default function HoroscopeSaveRecovery({conflict,busy,onChoose,onDownload}:{conflict:any;busy:boolean;onChoose:(state:any)=>void;onDownload:()=>void}){
  return <div role="group" aria-label="Compare saved changes">
    <p>Only the fields changed in both versions need a choice. Other edits will be kept. Choosing a version does not save or publish it.</p>
    {conflict.conflicts.map((item:any)=><details className="admin-workspace-details" key={item.label} open>
      <AdminDisclosureSummary>{item.label}</AdminDisclosureSummary>
      <label className="admin-review-copy-editor"><span>Your unsaved version</span><StudioTextarea rows={6} readOnly value={typeof item.local==='string'?item.local:JSON.stringify(item.local,null,2)}/></label>
      <label className="admin-review-copy-editor"><span>Latest saved version</span><StudioTextarea rows={6} readOnly value={typeof item.remote==='string'?item.remote:JSON.stringify(item.remote,null,2)}/></label>
    </details>)}
    <div className="admin-toolbar-actions">
      <StudioButton disabled={busy} onClick={()=>onChoose(conflict.keepLocal)}>Keep my edits</StudioButton>
      <StudioButton disabled={busy} onClick={()=>onChoose(conflict.useSaved)}>Use saved changes</StudioButton>
      <StudioButton onClick={onDownload}>Download my draft</StudioButton>
    </div>
  </div>;
}
