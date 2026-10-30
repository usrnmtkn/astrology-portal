import {AdminDisclosureSummary,AdminSelect} from './AdminNativeControls';
import {StudioButton,StudioInput} from './StudioControls';
import {PageLoading} from '../../../src/shared/components/PageLoading';
import {HOROSCOPE_PERIODS,horoscopeSignLabel,horoscopeWindowLabel} from '../../web/src/content/horoscopeEditions.mjs';

type EditionView={search:string;type:string;status:string;sort:string};
export default function HoroscopeSavedEditions({rows,loading,busy,blockedId,view,onViewChange,onRefresh,onOpen,onDelete}:{rows:any[];loading:boolean;busy:boolean;blockedId?:string;view:EditionView;onViewChange:(view:EditionView)=>void;onRefresh:()=>void;onOpen:(row:any)=>void;onDelete:(row:any)=>void}){
  const searchTerms=view.search.toLowerCase().trim().split(/[\s,]+/).filter(Boolean);
  const visibleEditions=rows.filter(row=>{
    const window=row.sections.horoscopeEdition.window;
    if(view.type!=='all'&&window.period!==view.type)return false;
    if(view.status!=='all'&&row.status!==view.status)return false;
    if(!searchTerms.length)return true;
    const isoDate=new Intl.DateTimeFormat('en-CA',{timeZone:window.timeZone});
    const searchable=`${row.headline} ${horoscopeWindowLabel(window)} ${isoDate.format(new Date(window.startsAt))} ${isoDate.format(new Date(Date.parse(window.endsAt)-1))} ${window.period} ${window.timeZone.replaceAll('_',' ')}`.toLowerCase();
    return searchTerms.every(term=>searchable.includes(term));
  }).sort((a,b)=>{
    const dateOrder=Date.parse(b.sections.horoscopeEdition.window.startsAt)-Date.parse(a.sections.horoscopeEdition.window.startsAt);
    return (view.sort==='updated'?Date.parse(b.updated_at)-Date.parse(a.updated_at)||dateOrder:view.sort==='oldest'?-dateOrder:dateOrder)||a.id.localeCompare(b.id);
  });
  const sortLabel=view.sort==='updated'?'Recently updated':view.sort==='oldest'?'Oldest first':'Newest first';
  const viewChanged=Boolean(view.search||view.type!=='all'||view.status!=='all'||view.sort!=='newest');
  return <details className="admin-workspace-details"><AdminDisclosureSummary>Continue a saved edition{rows.length?` (${rows.length})`:''}</AdminDisclosureSummary>
    <div className="admin-filter-form admin-filter-form--four" role="group" aria-label="Find saved editions">
      <label><span>Search editions</span><StudioInput type="search" value={view.search} placeholder="October 2026" onChange={e=>onViewChange({...view,search:e.target.value})}/></label>
      <label><span>Horoscope type</span><AdminSelect value={view.type} onChange={e=>onViewChange({...view,type:e.target.value})}><option value="all">All types</option>{HOROSCOPE_PERIODS.map(p=><option key={p} value={p}>{horoscopeSignLabel(p)}</option>)}</AdminSelect></label>
      <label><span>Publication status</span><AdminSelect value={view.status} onChange={e=>onViewChange({...view,status:e.target.value})}><option value="all">All statuses</option><option value="LIVE">Published</option><option value="DRAFT">Drafts</option><option value="ARCHIVED">Archived</option></AdminSelect></label>
      <label><span>Sort editions</span><AdminSelect value={view.sort} onChange={e=>onViewChange({...view,sort:e.target.value})}><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="updated">Recently updated</option></AdminSelect></label>
    </div>
    <div className="admin-filter-actions"><p aria-live="polite">{loading?'Loading editions…':`${visibleEditions.length} of ${rows.length} editions`}</p><StudioButton disabled={!viewChanged} onClick={()=>onViewChange({search:'',type:'all',status:'all',sort:'newest'})}>Reset view</StudioButton></div>
    {loading?<PageLoading message="Loading horoscope editions…"/>:visibleEditions.length?<div className="admin-content-table-scroll admin-horoscope-saved" role="region" aria-label="Saved horoscope editions" tabIndex={0}>
    <table aria-label={`Saved editions, ${sortLabel.toLowerCase()}`}>
      <thead><tr><th scope="col">Dates</th><th scope="col">Type</th><th scope="col">Status</th><th scope="col">Action</th></tr></thead>
      <tbody>{visibleEditions.map(row=>{
        const edition=row.sections.horoscopeEdition,dates=horoscopeWindowLabel(edition.window);
        const written=edition.passages.filter((p:any)=>p.headline.trim()&&p.body.trim()).length;
        const status=row.status==='LIVE'?'Published':row.status==='ARCHIVED'?'Archived':row.status==='DRAFT'?`${row.event_type==='horoscope-edition-revision'?'Draft revision · ':''}${written}/${edition.passages.length} drafted`:String(row.status??'Unknown status');
        const action=row.status==='LIVE'||written===edition.passages.length?'Review / Edit':'Continue';
        return <tr key={row.id}>
          <td>{dates}<small>{edition.window.timeZone.replaceAll('_',' ')}</small></td>
          <td>{horoscopeSignLabel(edition.window.period)}</td>
          <td>{status}</td>
          <td><div className="admin-toolbar-actions">
            <StudioButton disabled={busy} aria-label={`${row.headline} · ${dates} · ${edition.window.timeZone} · ${status} · ${action}`} onClick={()=>onOpen(row)}>{action}</StudioButton>
            {row.status!=='LIVE'&&<StudioButton className="admin-danger-button" disabled={busy||row.id===blockedId} aria-label={`Delete ${horoscopeSignLabel(edition.window.period)} ${row.event_type==='horoscope-edition-revision'?'draft revision':'edition'} · ${dates} · ${edition.window.timeZone} · ${status}`} onClick={()=>onDelete(row)}>Delete</StudioButton>}
          </div></td>
        </tr>;
      })}</tbody>
    </table>
  </div>:<p>{rows.length?'No editions match these filters. Change the filters or reset the view.':'No saved editions yet. Start with the dates above.'}</p>}
    <StudioButton disabled={busy||loading} onClick={onRefresh}>Refresh editions</StudioButton>
  </details>;
}
