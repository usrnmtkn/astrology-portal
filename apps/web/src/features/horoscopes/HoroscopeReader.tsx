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
import {zodiacAssetHref,zodiacSignIconFiles} from '../../components/charts/chartAssets';

const labels={daily:'Today',weekly:'This week',monthly:'This month',seasonal:'This season'};
const availableLabels={daily:'Read today’s horoscope',weekly:'Read this week’s horoscope',monthly:'Read this month’s overview',seasonal:'Read this season’s horoscope'};
const periodNames={daily:'Daily',weekly:'Weekly',monthly:'Monthly',seasonal:'Seasonal'};
type AvailableEdition={id:string;edition:HoroscopeEdition};
type LocationPreference=LocationInput|'device'|null;
const validSign=(value?:string)=>HOROSCOPE_SIGNS.includes(value?.toLowerCase()??'')?value!.toLowerCase():null;
function route(defaultSign:string) {
  const params=new URLSearchParams(window.location.hash.split('?')[1]??'');
  const period=params.get('period') as HoroscopePeriod, sign=params.get('sign')??defaultSign.toLowerCase();
  const id=params.get('edition')??'';
  return {period:HOROSCOPE_PERIODS.includes(period)?period:'daily' as HoroscopePeriod,sign:HOROSCOPE_SIGNS.includes(sign)?sign:defaultSign,editionId:/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/iu.test(id)?id:null};
}
const locationKey='tldrastro:horoscopeLocation';
function savedLocation():LocationPreference {
  try {const value=JSON.parse(localStorage.getItem(locationKey)??'null');return value?.mode==='device'?'device':value&&typeof value.label==='string'&&Number.isFinite(value.latitude)&&Number.isFinite(value.longitude)&&validHoroscopeTimeZone(value.timeZone)?value:null;}catch{return null;}
}
export default function HoroscopeReader({defaultSign,sunSign,location}:{defaultSign?:string;sunSign?:string;location?:LocationInput}) {
  const rising=validSign(defaultSign), sun=validSign(sunSign), preferredSign=rising??sun??'aries';
  const [localLocation,setLocalLocation]=useState<LocationPreference>(savedLocation);
  const deviceLocation={label:'Device time zone',latitude:0,longitude:0,timeZone:browserTimeZone()};
  const selectedLocation=localLocation==='device'?deviceLocation:localLocation??location??deviceLocation;
  const timeZone=canonicalHoroscopeTimeZone(timeZoneForLocation(selectedLocation));
  function changeLocation(next:LocationInput){setLocalLocation(next);select({...selection,editionId:null});try{localStorage.setItem(locationKey,JSON.stringify(next));}catch{/* Keep the selection for this visit if storage is unavailable. */}}
  function resetLocation(){setLocalLocation('device');select({...selection,editionId:null});try{localStorage.setItem(locationKey,JSON.stringify({mode:'device'}));}catch{/* Keep device mode for this visit. */}}
  const [selection,setSelection]=useState(()=>route(preferredSign));
  const [edition,setEdition]=useState<HoroscopeEdition|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState(''),[version,setVersion]=useState(0);
  const [loadedEditionId,setLoadedEditionId]=useState<string|null>(null);
  const [availableEditions,setAvailableEditions]=useState<AvailableEdition[]>([]);
  const [discovering,setDiscovering]=useState(false),[discoveryFailed,setDiscoveryFailed]=useState(false);
  const refresh=()=>setVersion(value=>value+1);
  useEffect(()=>{const sync=()=>setSelection(route(preferredSign));sync();window.addEventListener('hashchange',sync);window.addEventListener('popstate',sync);return()=>{window.removeEventListener('hashchange',sync);window.removeEventListener('popstate',sync);};},[preferredSign]);
  useEffect(()=>subscribeToContentUpdates(notice=>{if(notice.contentKey.startsWith('horoscope/'))refresh();}),[]);
  useEffect(()=>subscribeToContentRevalidation(refresh),[]);
  useEffect(()=>{
    const controller=new AbortController();setLoading(true);setError('');setAvailableEditions([]);setDiscovering(false);setDiscoveryFailed(false);
    const at=new Date().toISOString();
    const signal=AbortSignal.any([controller.signal,AbortSignal.timeout(20000)]);
    void loadReaderRows(selection.editionId?{ids:[selection.editionId]}:{horoscope:{period:selection.period,at,timeZone}},signal).then(async result=>{
      if(controller.signal.aborted)return;
      if(result.error)throw new Error('Your horoscope could not load. Please try again.');
      const nextEdition=selection.editionId?horoscopeEditionFromRow(result.data?.find(row=>row.id===selection.editionId)):horoscopeEditionAt(result.data??[],selection.period,at,timeZone);
      setEdition(nextEdition);
      setLoadedEditionId(selection.editionId);
      // Offer explicitly labelled published editions. A reader chooses another
      // zone's edition; it is never silently substituted for their local reading.
      if(!nextEdition){
        setLoading(false);setDiscovering(true);
        const results=await Promise.all(HOROSCOPE_PERIODS.map(period=>loadReaderRows({horoscope:{period,at}},signal)));
        if(controller.signal.aborted)return;
        const groups=new Map<string,AvailableEdition[]>();
        for(const result of results)for(const row of result.data??[]){
          const edition=horoscopeEditionFromRow(row);
          if(!edition||Date.parse(edition.window.startsAt)>Date.parse(at)||Date.parse(edition.window.endsAt)<=Date.parse(at))continue;
          const key=`${edition.window.period}/${canonicalHoroscopeTimeZone(edition.window.timeZone)}`;
          const group=groups.get(key)??[];
          if(!group.some(item=>item.id===row.id))group.push({id:row.id,edition});
          groups.set(key,group);
        }
        // Conflicting editions for one period/zone still require editorial resolution.
        const choices=[...groups.values()].filter(group=>group.length===1).flat();
        choices.sort((a,b)=>Number(canonicalHoroscopeTimeZone(b.edition.window.timeZone)===timeZone)-Number(canonicalHoroscopeTimeZone(a.edition.window.timeZone)===timeZone)||HOROSCOPE_PERIODS.indexOf(a.edition.window.period)-HOROSCOPE_PERIODS.indexOf(b.edition.window.period)||a.edition.window.timeZone.localeCompare(b.edition.window.timeZone));
        setAvailableEditions(choices.slice(0,6));setDiscoveryFailed(results.some(result=>result.error));setDiscovering(false);
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
  const overview=currentEdition?.passages.find(p=>p.sign==='overview');
  const passage=selection.period==='monthly'?overview:currentEdition?.passages.find(p=>p.sign===selection.sign);
  return <div className="learn-page horoscope-page">
    <section className="learn-hero-card horoscope-header">
      <h1 className="learn-hero__title">Horoscopes</h1>
      <p>{selection.period==='monthly'?'A shared overview of the month’s astrology, for everyone.':'Start with your rising sign. You can also read your Sun sign.'}</p>
      <HoroscopeLocation value={{...selectedLocation,timeZone}} onChange={changeLocation} onReset={resetLocation} description="Your local date follows this time zone. Each published reading shows the time zone used for its dates and timing."/>
      <div className="horoscope-controls">
        <div className="learn-jump" role="group" aria-label="Horoscope period">{HOROSCOPE_PERIODS.map(period=><button type="button" className="learn-jump__link" aria-pressed={selection.period===period} onClick={()=>select({...selection,period,editionId:null})} key={period}>{labels[period]}</button>)}</div>
      </div>
      {selection.period!=='monthly'&&<><div className="horoscope-controls">
        {(rising||sun)&&<div className="learn-jump" role="group" aria-label="Your signs">
          {rising&&<button type="button" className="learn-jump__link" aria-pressed={selection.sign===rising} onClick={()=>select({...selection,sign:rising})}>Your rising sign · {horoscopeSignLabel(rising)}</button>}
          {sun&&<button type="button" className="learn-jump__link" aria-pressed={selection.sign===sun} onClick={()=>select({...selection,sign:sun})}>Your Sun sign · {horoscopeSignLabel(sun)}</button>}
        </div>}
      </div>
      <div className="horoscope-signs" role="group" aria-label="Zodiac signs">{HOROSCOPE_SIGNS.map(sign=>{
        const name=horoscopeSignLabel(sign);
        return <button type="button" className="learn-jump__link horoscope-sign-link" key={sign} aria-label={`${name} & ${name} Rising`} aria-pressed={selection.sign===sign} onClick={()=>select({...selection,sign})}>
          <img src={zodiacAssetHref(zodiacSignIconFiles[name])!} alt="" aria-hidden="true"/><span>{name}</span>
        </button>;
      })}</div></>}
    </section>
    {loading&&!currentEdition?<PageLoading message="Loading your horoscope…"/>:error?<section className="learn-sheet horoscope-reading"><p role="alert">{error}</p><button type="button" onClick={refresh}>Try again</button></section>:currentEdition&&passage?<>{selection.period==='seasonal'&&overview&&<article className="learn-sheet horoscope-reading" aria-label="Season introduction"><p className="learn-kicker">For everyone · This season</p><h2>{overview.headline}</h2><p className="horoscope-date">{horoscopeWindowLabel(currentEdition.window)} · {currentEdition.window.timeZone}</p><div className="horoscope-prose"><FormattedProse text={overview.body}/></div></article>}<article className="learn-sheet horoscope-reading" aria-label={selection.period==='monthly'?'Monthly overview':`${horoscopeSignLabel(selection.sign)} horoscope`}>
      <p className="learn-kicker">{selection.period==='monthly'?'For everyone':selection.sign===rising&&selection.sign===sun?'Your Sun & rising sign':selection.sign===rising?'Your rising sign':selection.sign===sun?'Your Sun sign':horoscopeSignLabel(selection.sign)} · {selection.editionId?'Published edition':labels[selection.period]}</p>
      <h2>{passage.headline}</h2>
      <p className="horoscope-date">{horoscopeWindowLabel(currentEdition.window)} · {currentEdition.window.timeZone}</p>
      {canonicalHoroscopeTimeZone(currentEdition.window.timeZone)!==timeZone&&<p className="horoscope-timing-note">Dates and timing in this reading use {currentEdition.window.timeZone.replaceAll('_',' ')}. Some events may fall on a different day in {timeZone.replaceAll('_',' ')}.</p>}
      <div className="horoscope-prose"><FormattedProse text={passage.body}/></div>
    </article></>:<section className="learn-sheet horoscope-reading horoscope-empty">
      <h2>{selection.editionId?'Find another reading':`No ${selection.period} reading yet`}</h2>
      <p role="status">{selection.editionId?'This published edition is no longer available.':`The ${selection.period} horoscopes haven’t been published for ${timeZone.replaceAll('_',' ')} yet.`}</p>
      {discovering&&<p>Finding available readings…</p>}
      {availableEditions.length>0&&<>
        <p>You can explore these published readings. Each keeps its own dates and time zone.</p>
        <div className="horoscope-available" role="group" aria-label="Available horoscopes">{availableEditions.map(({id,edition:available})=>{
          const local=canonicalHoroscopeTimeZone(available.window.timeZone)===timeZone;
          return <button type="button" className="learn-jump__link horoscope-edition-link" key={id} aria-label={local?availableLabels[available.window.period]:`Read ${available.window.period} horoscope · ${available.window.timeZone.replaceAll('_',' ')}`} onClick={()=>select({...selection,period:available.window.period,editionId:id})}>
            <span>{periodNames[available.window.period]} horoscope</span>
            <span>{horoscopeWindowLabel(available.window)}</span>
            <span>{available.window.timeZone.replaceAll('_',' ')}{local?' · Your time zone':''}</span>
            <span>{available.window.period==='monthly'?'Read overview':`Read ${horoscopeSignLabel(selection.sign)}`} →</span>
          </button>;
        })}</div>
      </>}
      {discoveryFailed&&<p>Other readings could not be loaded. <button type="button" className="learn-jump__link" onClick={refresh}>Try available readings again</button></p>}
      {!discovering&&!availableEditions.length&&<p>Explore the current sky or browse the calendar while you’re here.</p>}
      <div className="learn-jump horoscope-empty-actions"><a className="learn-jump__link" href="#sky">Explore the sky</a><a className="learn-jump__link" href="#calendar">Open the calendar</a></div>
    </section>}
  </div>;
}
