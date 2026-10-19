export {publishSavedOwnerContent, ownerPublicationStatusPath} from './ownerPublication';
import {useEffect,useState,type ReactNode} from 'react';
import {ownerCredentialIdentity} from './ownerSession';
import {StudioButton} from './StudioControls';
import {horoscopeEditionReaderHref} from './adminReaderDestinations';
import {FormattedProse} from '../../../src/shared/components/FormattedProse';
import {horoscopeSignLabel,type HoroscopeEdition} from '../../web/src/content/horoscopeEditions.mjs';

type Props={
  draft:HoroscopeEdition;saved:any;sign:string;dirty:boolean;locked:boolean;approved:boolean;publication:any;
  validationOverride:boolean;onOverride:(value:boolean)=>void;
  secret:string;request:(secret:string,url:string,body?:unknown,method?:string,signal?:AbortSignal)=>Promise<any>;
  onCheck:(value:any)=>void;onApprove:(value:boolean)=>void;onReload:()=>void;onEdit:(sign:string)=>void;
  onBack:()=>void;onPublish:()=>void;onSetup:()=>void;rejectAllButton:ReactNode;
};
/** Loaded only for the final review step; generation stays in the editor chunk. */
export default function HoroscopePublicationReview({draft,saved,sign,dirty,locked,approved,publication,validationOverride,onOverride,secret,request,onCheck,onApprove,onReload,onEdit,onBack,onPublish,onSetup,rejectAllButton}:Props){
  const [attempt,setAttempt]=useState(0);
  const credentialIdentity=ownerCredentialIdentity(secret);
  useEffect(()=>{
    onApprove(false);onCheck(null);
    if(!saved||saved.status!=='DRAFT'||dirty)return;
    const controller=new AbortController(),id=saved.id,updatedAt=saved.updated_at;
    request(secret,'/api/admin/horoscope-writing',{action:'validate-publication',id,expectedUpdatedAt:updatedAt},'POST',controller.signal)
      .then(data=>{
        if(data.publication?.id!==id||data.publication?.updatedAt!==updatedAt||!Array.isArray(data.publication?.issues))throw new Error('The publication check could not be confirmed.');
        if(!controller.signal.aborted)onCheck(data.publication);
      })
      .catch(reason=>{if(!controller.signal.aborted)onCheck({id,updatedAt,ready:false,issues:[],error:reason.message,status:reason.status});});
    return()=>controller.abort();
  },[saved?.id,saved?.updated_at,saved?.status,dirty,credentialIdentity,attempt,onCheck,onApprove,request]);
  const isPublished=saved?.status==='LIVE'&&!dirty;
  const complete=draft.passages.filter(p=>p.headline.trim()&&p.body.trim()).length,total=draft.passages.length;
  const publicationCurrent=Boolean(publication&&saved&&publication.id===saved.id&&publication.updatedAt===saved.updated_at);
  const publicationReady=publicationCurrent&&(publication?.ready===true&&publication.issues.length===0||publication?.canOverride===true&&validationOverride);
  return <>
    {isPublished?<div className="admin-horoscope-actions"><a className="admin-primary-button" href={horoscopeEditionReaderHref(saved.id,draft.window.period,sign)} target="_blank" rel="noreferrer">Read published edition</a><StudioButton onClick={onSetup}>Create another edition</StudioButton></div>:<>
          {!publicationCurrent&&<p role="status">Checking all saved readings before publication…</p>}
          {publicationCurrent&&publication.error&&<div role="alert"><p>{publication.error}</p><StudioButton disabled={locked} onClick={()=>publication.status===409?onReload():setAttempt(value=>value+1)}>{publication.status===409?'Reload saved edition':'Check publication again'}</StudioButton></div>}
          {publicationCurrent&&publication.issues.length>0&&<section aria-label="Publication checks">
            <h3>Readings that need attention</h3>{[...new Set<string|null>(publication.issues.map((issue:any)=>issue.sign))].map(affectedSign=><div key={affectedSign??'edition'}>{publication.issues.filter((issue:any)=>issue.sign===affectedSign).map((issue:any,index:number)=><p key={index}>{affectedSign?`${horoscopeSignLabel(affectedSign)}: `:''}{issue.detail}</p>)}{affectedSign&&<StudioButton disabled={locked} onClick={()=>onEdit(affectedSign)}>Edit {horoscopeSignLabel(affectedSign)} reading</StudioButton>}</div>)}
            {publication.canOverride===true&&<label><input type="checkbox" checked={validationOverride} disabled={locked||dirty} onChange={e=>onOverride(e.target.checked)}/> I have reviewed these automated checks and want to override them for this saved edition.</label>}
          </section>}
          {draft.passages.map(p=><section className="admin-hook-detail-section" key={p.sign} aria-label={`${horoscopeSignLabel(p.sign)} reading preview`}><h3>{horoscopeSignLabel(p.sign)}</h3><p>{p.headline}</p>{p.body?<div className="admin-copy-preview"><FormattedProse text={p.body}/></div>:<p>No reading written yet.</p>}</section>)}
          <footer className={`admin-writing-savebar admin-horoscope-actions${!publicationReady?' admin-horoscope-held-actions':''}`}><label><input type="checkbox" checked={approved} disabled={locked||dirty||complete!==total||!saved||!publicationReady} onChange={e=>onApprove(e.target.checked)}/> I have reviewed and approve the exact wording of every saved reading in this edition.</label><p>{!publicationReady?'Review the publication checks above. You can override automated reading checks after reviewing the saved wording.':approved?'Ready to publish the complete edition.':'Check the approval box when you are happy with the complete edition.'}</p><div className="admin-toolbar-actions"><StudioButton disabled={locked} onClick={onBack}>Back to readings</StudioButton><div className="admin-toolbar-actions admin-horoscope-decision-actions">{rejectAllButton}<StudioButton className="admin-primary-button" disabled={locked||dirty||!approved||!saved||!publicationReady} onClick={onPublish}>Publish edition</StudioButton></div></div></footer>
        </>}
  </>;
}
