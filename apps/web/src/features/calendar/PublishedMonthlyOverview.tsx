import {useEffect,useState} from 'react';
import {loadReaderRows} from '../../services/readerContentClient';
import {subscribeToContentUpdates,subscribeToContentRevalidation} from '../../services/contentUpdateSignal';
import {horoscopeEditionAt,horoscopeEditionKey} from '../../content/horoscopeEditions.mjs';
import {monthlyHoroscopeTldr} from '../../content/monthlyHoroscopeTldr.mjs';
import {zonedDateTimeToUtc} from '../../services/timezones';
import {CalendarPassageProse} from './CalendarPassageProse';
import {PageLoadState} from '../../components/PageLoading';

/** Calendar previews only the authored TLDR; Horoscopes owns the full edition. */
export function PublishedMonthlyOverview({month,timeZone}:{month:string;timeZone:string}) {
  const key=`${month}/${timeZone}`;
  const [version,setVersion]=useState(0);
  const [state,setState]=useState<{key:string;reading?:{headline:string;tldr:string|null;href:string};error?:boolean}>({key:''});
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
        const passage=edition?.passages.find(p=>p.sign==='overview');
        const row=edition?result.data?.find(row=>row.content_key===horoscopeEditionKey(edition.window)):undefined;
        if(!controller.signal.aborted)setState({key,reading:passage&&row?{
          headline:passage.headline,
          tldr:monthlyHoroscopeTldr(passage.body),
          href:`/#horoscopes?period=monthly&edition=${encodeURIComponent(row.id)}`
        }:undefined});
      }).catch(()=>{if(!controller.signal.aborted)setState({key,error:true});});
    return()=>controller.abort();
  },[key,month,timeZone,version]);
  if(state.key!==key||state.error)return <PageLoadState what="The monthly overview" failed={Boolean(state.error)} pending={state.key!==key} onRetry={retry}><p role="status">Loading the monthly overview…</p></PageLoadState>;
  if(!state.reading)return null;
  return <section className="lunar-month-overview lunar-month-overview--monthly" aria-labelledby="lunar-month-overview-heading">
    <h2 className="sr-only" id="lunar-month-overview-heading">{state.reading.headline}</h2>
    {state.reading.tldr&&<>
      <span className="lunar-month-overview__label">TLDR</span>
      <CalendarPassageProse text={state.reading.tldr}/>
    </>}
    <a className="learn-jump__link" href={state.reading.href} aria-label={`Read more: ${state.reading.headline}`}>Read more</a>
  </section>;
}
