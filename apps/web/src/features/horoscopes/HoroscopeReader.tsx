import {useEffect,useState} from 'react';
import {FormattedProse} from '../../components/FormattedProse';
import {PageLoading} from '../../components/PageLoading';
import {loadReaderRows} from '../../services/readerContentClient';
import {subscribeToContentUpdates,subscribeToContentRevalidation} from '../../services/contentUpdateSignal';
import {HOROSCOPE_SIGNS,HOROSCOPE_PERIODS,horoscopeSignLabel,horoscopeEditionAt,horoscopeEditionFromRow,horoscopeWindowLabel,validHoroscopeTimeZone,canonicalHoroscopeTimeZone,type HoroscopePeriod,type HoroscopeEdition} from '../../content/horoscopeEditions.mjs';
import '../../styles/horoscopes.css';
import {nextHoroscopeRefresh} from './horoscopeRefresh';
import {HoroscopeLocation} from './HoroscopeLocation';
import type {LocationInput} from '../../types';
import {browserTimeZone,timeZoneForLocation} from '../../services/timezones';

const labels={daily:'Today',weekly:'This week',seasonal:'This season'};
const availableLabels={daily:'Read today’s horoscope',weekly:'Read this week’s horoscope',seasonal:'Read this season’s horoscope'};
const validSign=(value?:string)=>HOROSCOPE_SIGNS.includes(value?.toLowerCase()??'')?value!.toLowerCase():null;
function route(defaultSign:string) {
  const params=new URLSearchParams(window.location.hash.split('?')[1]??'');
  const period=params.get('period') as HoroscopePeriod, sign=params.get('sign')??defaultSign.toLowerCase();
  const id=params.get('edition')??'';
  return {period:HOROSCOPE_PERIODS.includes(period)?period:'daily' as HoroscopePeriod,sign:HOROSCOPE_SIGNS.includes(sign)?sign:'aries',editionId:/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/iu.test(id)?id:null};
}
const locationKey='tldrastro:horoscopeLocation';
function savedLocation():LocationInput|null {
  try {const value=JSON.parse(localStorage.getItem(locationKey)??'null');return value&&typeof value.label==='string'&&Number.isFinite(value.latitude)&&Number.isFinite(value.longitude)&&validHoroscopeTimeZone(value.timeZone)?value:null;}catch{return null;}
}
export default function HoroscopeReader({defaultSign,sunSign,location}:{defaultSign?:string;sunSign?:string;location?:LocationInput}) {
  const rising=validSign(defaultSign), sun=validSign(sunSign), preferredSign=rising??sun??'aries';
  const [localLocation,setLocalLocation]=useState<LocationInput|null>(savedLocation);
  const selectedLocation=localLocation??location??{label:'Device time zone',latitude:0,longitude:0,timeZone:browserTimeZone()};
  const timeZone=canonicalHoroscopeTimeZone(timeZoneForLocation(selectedLocation));
  function changeLocation(next:LocationInput){setLocalLocation(next);select({...selection,editionId:null});try{localStorage.setItem(locationKey,JSON.stringify(next));}catch{/* Keep the selection for this visit if storage is unavailable. */}}
  const [selection,setSelection]=useState(()=>route(preferredSign));
  const [edition,setEdition]=useState<HoroscopeEdition|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState(''),[version,setVersion]=useState(0);
  const [loadedEditionId,setLoadedEditionId]=useState<string|null>(null);
  const [availablePeriods,setAvailablePeriods]=useState<HoroscopePeriod[]>([]);
  const refresh=()=>setVersion(value=>value+1);
  useEffect(()=>{const sync=()=>setSelection(route(preferredSign));sync();window.addEventListener('hashchange',sync);window.addEventListener('popstate',sync);return()=>{window.removeEventListener('hashchange',sync);window.removeEventListener('popstate',sync);};},[preferredSign]);
  useEffect(()=>subscribeToContentUpdates(notice=>{if(notice.contentKey.startsWith('horoscope/'))refresh();}),[]);
  useEffect(()=>subscribeToContentRevalidation(refresh),[]);
  useEffect(()=>{
    const controller=new AbortController();setLoading(true);setError('');setAvailablePeriods([]);
    const at=new Date().toISOString();
    const signal=AbortSignal.any([controller.signal,AbortSignal.timeout(20000)]);
    void loadReaderRows(selection.editionId?{ids:[selection.editionId]}:{horoscope:{period:selection.period,at,timeZone}},signal).then(async result=>{
      if(controller.signal.aborted)return;
      if(result.error)throw new Error('Your horoscope could not load. Please try again.');
      const nextEdition=selection.editionId?horoscopeEditionFromRow(result.data?.find(row=>row.id===selection.editionId)):horoscopeEditionAt(result.data??[],selection.period,at,timeZone);
      setEdition(nextEdition);
      setLoadedEditionId(selection.editionId);
      // Keep an explicit period selection. Offer only other published editions
      // for this reader's current local window, never an unrelated date or zone.
      if(!nextEdition&&!selection.editionId){
        setLoading(false);
        const alternatives=await Promise.all(HOROSCOPE_PERIODS.filter(period=>period!==selection.period).map(async period=>{
          const result=await loadReaderRows({horoscope:{period,at,timeZone}},signal);
          return !result.error&&horoscopeEditionAt(result.data??[],period,at,timeZone)?period:null;
        }));
        if(!controller.signal.aborted)setAvailablePeriods(alternatives.filter((period):period is HoroscopePeriod=>period!==null));
      }
    }).catch(reason=>{if(!controller.signal.aborted)setError((reason as Error).message);}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return()=>controller.abort();
  },[selection.period,selection.editionId,version,timeZone]);
  useEffect(()=>{
    if(selection.editionId)return;
    const now=Date.now();
    const end=edition?.window.period===selection.period&&canonicalHoroscopeTimeZone(edition.window.timeZone)===timeZone?edition.window.endsAt:undefined;
    const timeout=setTimeout(refresh,Math.max(1,nextHoroscopeRefresh(timeZone,end,now)-now));
    return()=>clearTimeout(timeout);
  },[edition,selection.editionId,selection.period,timeZone,version]);
  function select(next:typeof selection) {setSelection(next);window.location.hash=`horoscopes?period=${next.period}&sign=${next.sign}${next.editionId?'&edition='+next.editionId:''}`;}
  const exactEdition=Boolean(selection.editionId&&loadedEditionId===selection.editionId);
  const currentEdition=edition?.window.period===selection.period && (exactEdition || (!selection.editionId&&!loadedEditionId&&canonicalHoroscopeTimeZone(edition.window.timeZone)===timeZone&&Date.parse(edition.window.startsAt)<=Date.now()&&Date.now()<Date.parse(edition.window.endsAt))) ? edition : null;
  const passage=currentEdition?.passages.find(p=>p.sign===selection.sign);
  return <div className="learn-page horoscope-page">
    <section className="learn-hero-card horoscope-header">
      <h1 className="learn-hero__title">Horoscopes</h1>
      <p>Start with your rising sign. You can also read your Sun sign.</p>
      <HoroscopeLocation value={exactEdition&&currentEdition?{...selectedLocation,label:'Edition time zone',timeZone:currentEdition.window.timeZone}:{...selectedLocation,timeZone}} onChange={changeLocation}/>
      <div className="horoscope-controls">
        <div className="learn-jump" role="group" aria-label="Horoscope period">{HOROSCOPE_PERIODS.map(period=><button type="button" className="learn-jump__link" aria-pressed={selection.period===period} onClick={()=>select({...selection,period,editionId:null})} key={period}>{labels[period]}</button>)}</div>
      </div>
      <div className="horoscope-controls">
        {(rising||sun)&&<div className="learn-jump" role="group" aria-label="Your signs">
          {rising&&<button type="button" className="learn-jump__link" aria-pressed={selection.sign===rising} onClick={()=>select({...selection,sign:rising})}>Your rising sign · {horoscopeSignLabel(rising)}</button>}
          {sun&&<button type="button" className="learn-jump__link" aria-pressed={selection.sign===sun} onClick={()=>select({...selection,sign:sun})}>Your Sun sign · {horoscopeSignLabel(sun)}</button>}
        </div>}
        <label className="horoscope-sign"><span>Zodiac sign</span><select aria-label="Zodiac sign" value={selection.sign} onChange={e=>select({...selection,sign:e.target.value})}>{HOROSCOPE_SIGNS.map(sign=><option key={sign} value={sign}>{horoscopeSignLabel(sign)} &amp; {horoscopeSignLabel(sign)} Rising</option>)}</select></label>
      </div>
    </section>
    {loading&&!currentEdition?<PageLoading message="Loading your horoscope…"/>:error?<section className="learn-sheet horoscope-reading"><p role="alert">{error}</p><button type="button" onClick={refresh}>Try again</button></section>:currentEdition&&passage?<article className="learn-sheet horoscope-reading" aria-label={`${horoscopeSignLabel(selection.sign)} horoscope`}>
      <p className="learn-kicker">{selection.sign===rising&&selection.sign===sun?'Your Sun & rising sign':selection.sign===rising?'Your rising sign':selection.sign===sun?'Your Sun sign':horoscopeSignLabel(selection.sign)} · {selection.editionId?'Published edition':labels[selection.period]}</p>
      <h2>{passage.headline}</h2>
      <p className="horoscope-date">{horoscopeWindowLabel(currentEdition.window)} · {currentEdition.window.timeZone}</p>
      <div className="horoscope-prose"><FormattedProse text={passage.body}/></div>
    </article>:<section className="learn-sheet horoscope-reading"><p role="status">{selection.editionId?'This published edition is no longer available.':`The ${selection.period} horoscopes haven’t been published for ${timeZone.replaceAll('_',' ')} yet.`}</p><p>Your selected location sets the local day and week. Check another period or come back soon.</p>
      {availablePeriods.length>0&&<div className="learn-jump" role="group" aria-label="Available horoscopes">{availablePeriods.map(period=><button type="button" className="learn-jump__link" key={period} onClick={()=>select({...selection,period,editionId:null})}>{availableLabels[period]}</button>)}</div>}
    </section>}
  </div>;
}
