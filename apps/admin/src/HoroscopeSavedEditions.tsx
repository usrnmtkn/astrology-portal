import {StudioButton} from './StudioControls';
import {horoscopeSignLabel,horoscopeWindowLabel} from '../../web/src/content/horoscopeEditions.mjs';

export default function HoroscopeSavedEditions({rows,busy,blockedId,sortLabel,onOpen,onDelete}:{rows:any[];busy:boolean;blockedId?:string;sortLabel:string;onOpen:(row:any)=>void;onDelete:(row:any)=>void}){
  return <div className="admin-content-table-scroll admin-horoscope-saved" role="region" aria-label="Saved horoscope editions" tabIndex={0}>
    <table aria-label={`Saved editions, ${sortLabel.toLowerCase()}`}>
      <thead><tr><th scope="col">Dates</th><th scope="col">Type</th><th scope="col">Status</th><th scope="col">Action</th></tr></thead>
      <tbody>{rows.map(row=>{
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
  </div>;
}
