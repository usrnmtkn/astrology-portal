import React from 'react';
import {AdminDisclosureSummary} from './AdminNativeControls';
import {StudioButton,StudioTextarea} from './StudioControls';
export {reconcileHoroscopeEdits,horoscopeEditableState} from './horoscopeEditReconciliation';

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
