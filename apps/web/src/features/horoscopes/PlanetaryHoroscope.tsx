import {useMinimumLoading} from "../../hooks/useMinimumLoading";
import type {PlanetPosition} from '../../types';
import {ChevronLeft,ChevronRight} from 'lucide-react';
import {FormattedProse} from '../../components/FormattedProse';
import {PageLoading,PageLoadState} from '../../components/PageLoading';
import {pointGlyph,zodiacAssetHref,zodiacSignIconFiles} from '../../components/charts/chartAssets';
import {horoscopeSignLabel} from '../../content/horoscopeEditions.mjs';
import {planetarySlug,planetaryHoroscopeBody,planetaryHoroscopeWindow,usePlanetaryHoroscopeSources} from './usePlanetaryHoroscopeSources';

export default function PlanetaryHoroscope({position,generatedAt,sign,timeZone,previous,next,onBack,onPlanet}:{position:PlanetPosition;generatedAt:string;sign:string;timeZone:string;previous?:PlanetPosition;next?:PlanetPosition;onBack:()=>void;onPlanet:(position:PlanetPosition)=>void}) {
  const {ready,error,refresh}=usePlanetaryHoroscopeSources(`article:${planetarySlug(position.planet)}/${planetarySlug(position.sign)}`);
  const holding=useMinimumLoading(!ready);
  const body=ready?planetaryHoroscopeBody(position,sign):'';
  const rx=position.motion==='retrograde';
  const window=planetaryHoroscopeWindow(position,generatedAt);
  const dateFormat=new Intl.DateTimeFormat('en-US',{month:'long',day:'numeric',year:'numeric',timeZone});
  const dateLine=window?dateFormat.formatRange(window.start,window.end):null;
  const signName=horoscopeSignLabel(sign);
  return <>
    <button className="horoscope-all-planets" type="button" onClick={onBack}><ChevronLeft aria-hidden="true"/>All planets</button>
    <article className="learn-sheet horoscope-reading" aria-label={`${position.planet} in ${position.sign} horoscope`}>
      <header className="horoscope-reading-header">
        <span className="horoscope-planet-card__glyph" aria-hidden="true">{pointGlyph(position.planet)}</span>
        <h2 className="horoscope-reading-date">{position.planet}{rx?' Rx':''} in {position.sign}</h2>
        {dateLine&&<p className="horoscope-date">{dateLine}</p>}
        {rx&&<span className="horoscope-reading-sign">℞ Retrograde</span>}
        <div className="horoscope-controls" aria-label="Reading signs"><span className="horoscope-reading-sign"><img src={zodiacAssetHref(zodiacSignIconFiles[signName])!} alt=""/>{signName}</span><span className="horoscope-reading-sign"><span aria-hidden="true">↑</span>{signName} Rising</span></div>
      </header>
      <PageLoadState scope="page" what="This planetary horoscope" failed={Boolean(error)} pending={holding} onRetry={refresh}>{holding?<PageLoading message="Loading planetary horoscope…"/>:body?<div className="horoscope-prose"><FormattedProse text={body}/></div>:<p role="status">No planetary horoscope is published for this placement and rising sign yet.</p>}</PageLoadState>
    </article>
    {!error&&<nav className="horoscope-edition-nav" aria-label="Planetary horoscopes">{[previous,next].map((entry,index)=>{
      const Icon=index?ChevronRight:ChevronLeft;
      return <button type="button" key={index} disabled={!entry} className={index?'horoscope-edition-next':undefined} onClick={()=>entry&&onPlanet(entry)}><span className="horoscope-edition-arrow"><Icon aria-hidden="true"/></span><span className="horoscope-edition-label"><small>{index?'Next':'Previous'}</small><span>{entry?`${entry.planet}${entry.motion==='retrograde'?' Rx':''} in ${entry.sign}`:''}</span></span></button>;
    })}</nav>}
  </>;
}
