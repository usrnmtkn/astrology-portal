import {useEffect,useState} from 'react';
import {FormattedProse} from '../../components/FormattedProse';
import {PageLoading} from '../../components/PageLoading';
import {loadReaderRows} from '../../services/readerContentClient';
import {subscribeToContentUpdates,subscribeToContentRevalidation} from '../../services/contentUpdateSignal';
import {HOROSCOPE_SIGNS,HOROSCOPE_PERIODS,horoscopeSignLabel,horoscopeEditionAt,horoscopeWindowLabel,type HoroscopePeriod,type HoroscopeEdition} from '../../content/horoscopeEditions.mjs';
import '../../styles/horoscopes.css';

const labels={daily:'Today',weekly:'This week',seasonal:'This season'};
function route(defaultSign:string) {
  const params=new URLSearchParams(window.location.hash.split('?')[1]??'');
  const period=params.get('period') as HoroscopePeriod, sign=params.get('sign')??defaultSign.toLowerCase();
  return {period:HOROSCOPE_PERIODS.includes(period)?period:'weekly' as HoroscopePeriod,sign:HOROSCOPE_SIGNS.includes(sign)?sign:'aries'};
}
export default function HoroscopeReader({defaultSign='aries'}:{defaultSign?:string}) {
  const [selection,setSelection]=useState(()=>route(defaultSign));
  const [edition,setEdition]=useState<HoroscopeEdition|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState(''),[version,setVersion]=useState(0);
  const refresh=()=>setVersion(value=>value+1);
  useEffect(()=>{const sync=()=>setSelection(route(defaultSign));sync();window.addEventListener('hashchange',sync);window.addEventListener('popstate',sync);return()=>{window.removeEventListener('hashchange',sync);window.removeEventListener('popstate',sync);};},[defaultSign]);
  useEffect(()=>subscribeToContentUpdates(notice=>{if(notice.contentKey.startsWith('horoscope/'))refresh();}),[]);
  useEffect(()=>subscribeToContentRevalidation(refresh),[]);
  useEffect(()=>{
    const controller=new AbortController();setLoading(true);setError('');
    const at=new Date().toISOString();
    void loadReaderRows({horoscope:{period:selection.period,at}},AbortSignal.any([controller.signal,AbortSignal.timeout(20000)])).then(result=>{
      if(controller.signal.aborted)return;
      if(result.error)throw new Error('Your horoscope could not load. Please try again.');
      setEdition(horoscopeEditionAt(result.data??[],selection.period,at));
    }).catch(reason=>{if(!controller.signal.aborted)setError((reason as Error).message);}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return()=>controller.abort();
  },[selection.period,version]);
  useEffect(()=>{if(!edition)return;const timeout=setTimeout(refresh,Math.max(1,Math.min(Date.parse(edition.window.endsAt)-Date.now(),2147483647)));return()=>clearTimeout(timeout);},[edition]);
  function select(next:typeof selection) {setSelection(next);window.location.hash=`horoscopes?period=${next.period}&sign=${next.sign}`;}
  const currentEdition=edition?.window.period===selection.period && Date.parse(edition.window.startsAt)<=Date.now() && Date.now()<Date.parse(edition.window.endsAt) ? edition : null;
  const passage=currentEdition?.passages.find(p=>p.sign===selection.sign);
  return <div className="learn-page horoscope-page">
    <section className="learn-hero-card horoscope-header">
      <h1 className="learn-hero__title">Horoscopes</h1>
      <p>Read for your rising sign.</p>
      <div className="horoscope-controls">
        <div className="learn-jump" role="group" aria-label="Horoscope period">{HOROSCOPE_PERIODS.map(period=><button type="button" className="learn-jump__link" aria-pressed={selection.period===period} onClick={()=>select({...selection,period})} key={period}>{labels[period]}</button>)}</div>
        <label className="horoscope-sign"><span>Rising sign</span><select aria-label="Rising sign" value={selection.sign} onChange={e=>select({...selection,sign:e.target.value})}>{HOROSCOPE_SIGNS.map(sign=><option key={sign} value={sign}>{horoscopeSignLabel(sign)}</option>)}</select></label>
      </div>
    </section>
    {loading&&!currentEdition?<PageLoading message="Loading your horoscope…"/>:error?<section className="learn-sheet horoscope-reading"><p role="alert">{error}</p><button type="button" onClick={refresh}>Try again</button></section>:currentEdition&&passage?<article className="learn-sheet horoscope-reading" aria-label={`${horoscopeSignLabel(selection.sign)} horoscope`}>
      <p className="learn-kicker">{horoscopeSignLabel(selection.sign)} rising · {labels[selection.period]}</p>
      <h2>{passage.headline}</h2>
      <p className="horoscope-date">{horoscopeWindowLabel(currentEdition.window)} · {currentEdition.window.timeZone}</p>
      <div className="horoscope-prose"><FormattedProse text={passage.body}/></div>
    </article>:<section className="learn-sheet horoscope-reading"><p role="status">The {selection.period==='seasonal'?'seasonal':selection.period} horoscopes haven’t been published yet.</p><p>Check another period or come back soon.</p></section>}
  </div>;
}
