import {skyNodeDisplayPositions} from "../sky/skyHelpers";
import { ContentLoading } from "../../components/LoadingPatterns";
import {useMinimumLoading} from "../../hooks/useMinimumLoading";
import {lazy,Suspense,useEffect,useState} from 'react';
import {ChevronLeft,ChevronRight} from 'lucide-react';
import type {SkySnapshot,PlanetPosition} from '../../types';
import {FormattedProse} from '../../components/FormattedProse';
import {PageLoading,PageLoadState} from '../../components/PageLoading';
import {ReaderUnavailable} from '../../components/ReaderUnavailable';
import {loadReaderRows} from '../../services/readerContentClient';
import {subscribeToContentUpdates,subscribeToContentRevalidation} from '../../services/contentUpdateSignal';
import {HOROSCOPE_SIGNS,HOROSCOPE_PERIODS,horoscopeSignLabel,horoscopeEditionAt,horoscopeEditionFromRow,horoscopeWindowLabel,horoscopeOverviewHeadline,validHoroscopeTimeZone,canonicalHoroscopeTimeZone,horoscopeReaderTimeZones,type HoroscopePeriod,type HoroscopeEdition,type HoroscopeWindow} from '../../content/horoscopeEditions.mjs';
import '../../styles/horoscopes.css';
import {nextHoroscopeRefresh,adjacentHoroscopeReference,horoscopeNavigationLabel} from './horoscopeRefresh';
import {articleHeadingComparisonKey} from '../../utils/articleHeadings';
import {HoroscopeLocation} from './HoroscopeLocation';
import type {LocationInput} from '../../types';
import {browserTimeZone,timeZoneForLocation} from '../../services/timezones';
import {zodiacAssetHref,zodiacSignIconFiles} from '../../components/charts/chartAssets';
import type {HoroscopeContextFacts} from './HoroscopeContext';

const HoroscopeContext=lazy(()=>import('./HoroscopeContext'));
const PlanetaryHoroscope=lazy(()=>import('./PlanetaryHoroscope'));
const PlanetaryHoroscopeCards=lazy(()=>import('./PlanetaryHoroscopeCards'));
const HoroscopeSigns=lazy(()=>import('./HoroscopeSigns'));

const periodNames={daily:'Daily',weekly:'Weekly',monthly:'Monthly',seasonal:'Seasonal'};
type LocationPreference=LocationInput|'device'|null;
const validSign=(value?:string)=>HOROSCOPE_SIGNS.includes(value?.toLowerCase()??'')?value!.toLowerCase():null;
function route(defaultSign:string) {
  const params=new URLSearchParams(window.location.hash.split('?')[1]??'');
  const period=params.get('period') as HoroscopePeriod, sign=params.get('sign')??defaultSign.toLowerCase();
  const id=params.get('edition')??'';
  return {period:HOROSCOPE_PERIODS.includes(period)?period:'daily' as HoroscopePeriod,sign:HOROSCOPE_SIGNS.includes(sign)?sign:defaultSign,at:params.get('at')&&Number.isFinite(Date.parse(params.get('at')!))?new Date(params.get('at')!).toISOString():null,view:params.get('view')==='planets'?'planets':'reading',planet:params.get('planet'),placement:validSign(params.get('placement')??undefined),editionId:/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/iu.test(id)?id:null};
}
const locationKey='tldrastro:horoscopeLocation';
function savedLocation():LocationPreference {
  try {const value=JSON.parse(localStorage.getItem(locationKey)??'null');return value?.mode==='device'?'device':value&&typeof value.label==='string'&&Number.isFinite(value.latitude)&&Number.isFinite(value.longitude)&&validHoroscopeTimeZone(value.timeZone)?value:null;}catch{return null;}
}
export default function HoroscopeReader({defaultSign,sunSign,location,sky}:{defaultSign?:string;sunSign?:string;location?:LocationInput;sky?:SkySnapshot|null}) {
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
  const [context,setContext]=useState<HoroscopeContextFacts|null>(null);
  const [seasonWindow,setSeasonWindow]=useState<HoroscopeWindow|null>(null);
  const refresh=()=>setVersion(value=>value+1);
  useEffect(()=>{const sync=()=>setSelection(route(preferredSign));sync();window.addEventListener('hashchange',sync);window.addEventListener('popstate',sync);return()=>{window.removeEventListener('hashchange',sync);window.removeEventListener('popstate',sync);};},[preferredSign]);
  useEffect(()=>subscribeToContentUpdates(notice=>{if(notice.contentKey.startsWith('horoscope/'))refresh();}),[]);
  useEffect(()=>subscribeToContentRevalidation(refresh),[]);
  useEffect(()=>{
    const controller=new AbortController();setLoading(true);setError('');
    const at=selection.at??new Date().toISOString();
    const signal=AbortSignal.any([controller.signal,AbortSignal.timeout(20000)]);
    // Name the destination even when a different period is open. This optional
    // lookup must not hold up the selected reading or invent a season by date.
    if(selection.period!=='seasonal')void loadReaderRows({horoscope:{period:'seasonal',at,timeZone}},signal).then(result=>{
      if(!controller.signal.aborted)setSeasonWindow(horoscopeEditionAt(result.data??[],'seasonal',at,timeZone)?.window??null);
    }).catch(()=>{if(!controller.signal.aborted)setSeasonWindow(null);});
    void loadReaderRows(selection.editionId?{ids:[selection.editionId]}:{horoscope:{period:selection.period,at,timeZone}},signal).then(async result=>{
      if(controller.signal.aborted)return;
      if(result.error)throw new Error('Your horoscope could not load. Please try again.');
      const nextEdition=selection.editionId?horoscopeEditionFromRow(result.data?.find(row=>row.id===selection.editionId)):horoscopeEditionAt(result.data??[],selection.period,at,timeZone);
      setEdition(nextEdition);
      setContext((result.data?.find(row=>{const window=horoscopeEditionFromRow(row)?.window;return window?.period===nextEdition?.window.period&&window?.startsAt===nextEdition?.window.startsAt&&window?.timeZone===nextEdition?.window.timeZone;})?.facts?.horoscopeContext as HoroscopeContextFacts)??null);
      if(!selection.editionId&&selection.period==='seasonal')setSeasonWindow(nextEdition?.window??null);
      setLoadedEditionId(selection.editionId);
    }).catch(reason=>{if(!controller.signal.aborted)setError((reason as Error).message);}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return()=>controller.abort();
  },[selection.period,selection.editionId,selection.at,version,timeZone]);
  useEffect(()=>{
    if(selection.editionId||selection.at)return;
    const now=Date.now();
    const end=edition?.window.period===selection.period&&horoscopeReaderTimeZones(selection.period,timeZone).includes(canonicalHoroscopeTimeZone(edition.window.timeZone))?edition.window.endsAt:undefined;
    const nextRefresh=Math.min(nextHoroscopeRefresh(timeZone,end,now),nextHoroscopeRefresh(timeZone,seasonWindow?.endsAt,now));
    const timeout=setTimeout(refresh,Math.max(1,nextRefresh-now));
    return()=>clearTimeout(timeout);
  },[edition,selection.editionId,selection.at,selection.period,timeZone,version,seasonWindow]);
  function href(next:typeof selection) {return `#horoscopes?period=${next.period}&sign=${next.sign}${next.editionId?'&edition='+next.editionId:''}${next.at?'&at='+encodeURIComponent(next.at):''}${next.view==='planets'?`&view=planets${next.planet?`&planet=${encodeURIComponent(next.planet)}&placement=${next.placement??''}`:''}`:''}`;}
  function select(next:typeof selection) {setSelection(next);window.location.hash=href(next);}
  function readSign(sign:string){select({...selection,sign});document.querySelector('.horoscope-periods')?.scrollIntoView({block:'start'});}
  function planetSelection(position:PlanetPosition){return {...selection,view:'planets',planet:position.planet.toLowerCase().replaceAll(' ','-'),placement:position.sign.toLowerCase()};}
  const planetPositions=sky?skyNodeDisplayPositions(sky.positions):[];
  const planetIndex=planetPositions.findIndex(position=>position.planet.toLowerCase().replaceAll(' ','-')===selection.planet&&position.sign.toLowerCase()===selection.placement)??-1;
  const planetPosition=planetPositions[planetIndex];
  const signs=<Suspense fallback={null}><HoroscopeSigns sign={selection.sign} rising={rising} sun={sun} onSelect={readSign}/></Suspense>;
  const exactEdition=Boolean(selection.editionId&&loadedEditionId===selection.editionId);
  const currentEdition=edition?.window.period===selection.period && (exactEdition || (!selection.editionId&&!loadedEditionId&&horoscopeReaderTimeZones(selection.period,timeZone).includes(canonicalHoroscopeTimeZone(edition.window.timeZone))&&Date.parse(edition.window.startsAt)<=Date.parse(selection.at??new Date().toISOString())&&Date.parse(selection.at??new Date().toISOString())<Date.parse(edition.window.endsAt))) ? edition : null;
  const holdingReading=useMinimumLoading(loading&&!currentEdition);
  const namedSeason=currentEdition?.window.period==='seasonal'?currentEdition.window:seasonWindow&&canonicalHoroscopeTimeZone(seasonWindow.timeZone)===timeZone&&Date.parse(seasonWindow.startsAt)<=Date.now()&&Date.now()<Date.parse(seasonWindow.endsAt)?seasonWindow:null;
  const overview=currentEdition?.passages.find(p=>p.sign==='overview');
  const passage=selection.period==='monthly'?overview:currentEdition?.passages.find(p=>p.sign===selection.sign);
  const date = new Date(currentEdition?.window.startsAt ?? selection.at ?? Date.now());
  const readingZone = currentEdition?.window.timeZone ?? timeZone;
  const dateFormat = new Intl.DateTimeFormat('en-US',{month:selection.period==='seasonal'?'short':'long',day:selection.period==='monthly'?undefined:'numeric',timeZone:readingZone});
  const dateTitle = currentEdition && ['weekly','seasonal'].includes(selection.period)
    ? dateFormat.formatRange(date,new Date(Date.parse(currentEdition.window.endsAt)-1)) : dateFormat.format(date);
  const year=date.toLocaleDateString('en-US',{year:'numeric',timeZone:readingZone});
  const isCurrent = currentEdition && Date.parse(currentEdition.window.startsAt)<=Date.now() && Date.now()<Date.parse(currentEdition.window.endsAt);
  const periodLabel = selection.period==='seasonal'&&currentEdition?.window.seasonSign ? `${horoscopeSignLabel(currentEdition.window.seasonSign)} season`
    : selection.period==='daily' ? `${isCurrent?'Today · ':''}${date.toLocaleDateString('en-US',{weekday:'long',timeZone:readingZone})}`
    : isCurrent ? selection.period==='weekly'?'This week':'This month' : periodNames[selection.period];
  const signName=horoscopeSignLabel(selection.sign);
  const duplicateHeadline=passage&&[dateTitle,signName,`${signName} & ${signName} Rising`,...(selection.period==='monthly'&&currentEdition?[horoscopeOverviewHeadline(currentEdition.window)]:[])].some(title=>articleHeadingComparisonKey(title)===articleHeadingComparisonKey(passage.headline));
  const reference = selection.at ?? new Date().toISOString();
  const previousAt = currentEdition ? new Date(Date.parse(currentEdition.window.startsAt) - 1).toISOString()
    : selection.period === 'seasonal' && namedSeason ? new Date(Date.parse(namedSeason.startsAt) - 1).toISOString() : adjacentHoroscopeReference(selection.period, reference, timeZone, -1);
  const nextAt = currentEdition?.window.endsAt ?? adjacentHoroscopeReference(selection.period, reference, timeZone, 1);
  return <div className="learn-page horoscope-page">
    <h1 className="sr-only">Horoscopes</h1>
    <div className="horoscope-periods" role="group" aria-label="Horoscope period">
      {HOROSCOPE_PERIODS.map(period=><button type="button" aria-pressed={selection.view!=='planets'&&selection.period===period} onClick={()=>select({...selection,period,view:'reading',editionId:null,at:null})} key={period}>{periodNames[period]}</button>)}
      <button type="button" aria-pressed={selection.view==='planets'} onClick={()=>select({...selection,view:'planets',planet:null,placement:null})}>Planets</button>
    </div>
    {selection.view==='planets' ? selection.planet ? <>
      {!sky?<PageLoading message="Loading planetary horoscope…"/>:planetPosition?<Suspense fallback={<PageLoading message="Loading planetary horoscope…"/>}><PlanetaryHoroscope position={planetPosition} generatedAt={sky.generatedAt} sign={selection.sign} timeZone={planetPosition.transitTimeZone??sky.location.timeZone??timeZone} previous={planetPositions[planetIndex-1]} next={planetPositions[planetIndex+1]} onBack={()=>select({...selection,planet:null,placement:null})} onPlanet={position=>select(planetSelection(position))}/></Suspense>:<ReaderUnavailable kind="horoscope" onAction={()=>select({...selection,planet:null,placement:null})}/>}
      {planetPosition&&signs}
    </> : <section className="horoscope-planet-view" aria-label="Planet readings"><h2>Planets</h2>
      {sky ? <Suspense fallback={<ContentLoading layout="placements" message="Loading planet readings…"/>}><PlanetaryHoroscopeCards sky={sky} sign={selection.sign} href={position=>href(planetSelection(position))}/></Suspense> : <ContentLoading layout="placements" message="Loading planet readings…"/>}
    </section> : <>
    <PageLoadState key={`${selection.period}:${selection.sign}:${selection.at ?? ""}`} scope="page" what={selection.period==='daily'?"Today's horoscope":"This horoscope"} cause={error} failed={Boolean(error)} pending={loading} onRetry={refresh}>
    {holdingReading?<PageLoading message="Loading your horoscope…"/>:currentEdition&&passage?<>{selection.period==='seasonal'&&overview&&<article className="learn-sheet horoscope-reading" aria-label="Season introduction"><p className="learn-kicker">For everyone · {namedSeason?horoscopeOverviewHeadline(namedSeason):'Seasonal'}</p><h2>{overview.headline}</h2><p className="horoscope-date">{horoscopeWindowLabel(currentEdition.window)} · {currentEdition.window.timeZone}</p><div className="horoscope-prose"><FormattedProse text={overview.body}/></div></article>}<article className="learn-sheet horoscope-reading" aria-label={selection.period==='monthly'?'Monthly overview':`${horoscopeSignLabel(selection.sign)} horoscope`}>
      <header className="horoscope-reading-header">
        <p className="horoscope-weekday">{periodLabel}</p>
        <h2 className="horoscope-reading-date">{dateTitle}</h2>
        {!dateTitle.includes(year)&&<span className="horoscope-year">{year}</span>}
        {selection.period!=='monthly'&&<div className="horoscope-controls" aria-label="Reading signs"><span className="horoscope-reading-sign"><img src={zodiacAssetHref(zodiacSignIconFiles[signName])!} alt=""/>{signName}</span><span className="horoscope-reading-sign"><span aria-hidden="true">↑</span>{signName} Rising</span></div>}
      </header>
      {!duplicateHeadline&&<h3 className="horoscope-passage-title">{passage.headline}</h3>}
      {canonicalHoroscopeTimeZone(currentEdition.window.timeZone)!==timeZone&&<p className="horoscope-timing-note">Dates and timing in this reading use {currentEdition.window.timeZone.replaceAll('_',' ')}. Some events may fall on a different day in {timeZone.replaceAll('_',' ')}.</p>}
      <div className="horoscope-prose"><FormattedProse text={passage.body}/></div>
    </article></>:<section className="learn-sheet horoscope-reading horoscope-empty">
      <svg className="horoscope-empty-art" viewBox="0 0 160 160" fill="none" aria-hidden="true"><circle cx="80" cy="80" r="64" className="horoscope-empty-art__disc"/><circle cx="80" cy="80" r="64" className="horoscope-empty-art__orbit"/><path d="M98 56a30 30 0 1 0 6 42 24 24 0 0 1-6-42z" className="horoscope-empty-art__moon"/><path d="M112 40l2.5 6.5L121 49l-6.5 2.5L112 58l-2.5-6.5L103 49l6.5-2.5z" className="horoscope-empty-art__star"/><circle cx="46" cy="52" r="2.5" className="horoscope-empty-art__dot"/><circle cx="120" cy="104" r="2" className="horoscope-empty-art__dot"/><circle cx="52" cy="112" r="1.5" className="horoscope-empty-art__dot"/></svg>
      <h2>{selection.editionId?'Find another reading':`No ${selection.period} reading yet`}</h2>
      <p role="status">{selection.editionId?'This published edition is no longer available.':`The ${selection.period} horoscopes haven’t been published for ${timeZone.replaceAll('_',' ')} yet.`}</p>

    </section>}
    {!error&&currentEdition&&passage&&context&&<Suspense fallback={null}><HoroscopeContext facts={context} body={passage.body} sign={selection.period==='monthly'?'':selection.sign} timeZone={readingZone}/></Suspense>}
    <nav className="horoscope-edition-nav" aria-label="Horoscope editions">
      {[previousAt,nextAt].map((at,index)=>{const Icon=index?ChevronRight:ChevronLeft;return <button key={index} type="button" className={index?'horoscope-edition-next':undefined} disabled={!at||Boolean(index&&Date.parse(at)>Date.now())} onClick={()=>at&&select({...selection,editionId:null,at})}><span className="horoscope-edition-arrow"><Icon aria-hidden="true"/></span><span className="horoscope-edition-label"><small>{index?'Next':'Previous'}</small><span>{horoscopeNavigationLabel(selection.period,at,readingZone,currentEdition?.window??namedSeason)}</span></span></button>;})}
      {(selection.at||selection.editionId)&&<button className="horoscope-edition-current" type="button" onClick={()=>select({...selection,editionId:null,at:null})}>Current reading</button>}
    </nav>
    {currentEdition&&selection.period!=='monthly'&&signs}
    <HoroscopeLocation value={{...selectedLocation,timeZone}} onChange={changeLocation} onReset={resetLocation} description="Each published reading keeps its own dates and time zone."/>
    </PageLoadState></>}
  </div>;
}
