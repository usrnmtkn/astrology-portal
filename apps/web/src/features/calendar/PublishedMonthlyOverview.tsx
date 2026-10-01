import {useEffect,useState,type ReactNode} from 'react';
import {loadReaderRows} from '../../services/readerContentClient';
import {subscribeToContentUpdates,subscribeToContentRevalidation} from '../../services/contentUpdateSignal';
import {horoscopeEditionAt} from '../../content/horoscopeEditions.mjs';
import {zonedDateTimeToUtc} from '../../services/timezones';
import {CalendarPassageProse} from './CalendarPassageProse';

/** Calendar and Horoscopes read the same approved monthly edition; no second writer. */
export function PublishedMonthlyOverview({month,timeZone,fallback}:{month:string;timeZone:string;fallback:ReactNode}) {
  const key=`${month}/${timeZone}`;
  const [version,setVersion]=useState(0);
  const [state,setState]=useState<{key:string;body?:string;error?:boolean}>({key:''});
  const retry=()=>setVersion(v=>v+1);
  useEffect(()=>subscribeToContentUpdates(notice=>{if(notice.contentKey.startsWith('horoscope/monthly/'))retry();}),[]);
  useEffect(()=>subscribeToContentRevalidation(retry),[]);
  useEffect(()=>{
    const controller=new AbortController();
    setState({key:''});
    const at=zonedDateTimeToUtc(`${month.slice(0,7)}-01`,'12:00 PM',timeZone).toISOString();
    void loadReaderRows({horoscope:{period:'monthly',at,timeZone}},AbortSignal.any([controller.signal,AbortSignal.timeout(20000)]))
      .then(result=>{
        if(result.error)throw new Error('unavailable');
        const edition=horoscopeEditionAt(result.data??[],'monthly',at,timeZone);
        if(!controller.signal.aborted)setState({key,body:edition?.passages.find(p=>p.sign==='overview')?.body});
      }).catch(()=>{if(!controller.signal.aborted)setState({key,error:true});});
    return()=>controller.abort();
  },[key,version]);
  if(state.key!==key)return <p role="status">Loading the monthly overview…</p>;
  if(state.error)return <p role="status">The monthly overview couldn’t load. <button type="button" className="learn-jump__link" onClick={retry}>Try again</button></p>;
  return state.body?<CalendarPassageProse text={state.body}/>:<>{fallback}</>;
}
