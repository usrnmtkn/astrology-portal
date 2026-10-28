import {ChevronRight} from 'lucide-react';
import {pointGlyph} from '../../components/charts/chartAssets';
import {PlacementGlyphIcon} from '../../components/charts/PlacementRows';
import {HOROSCOPE_SIGNS} from '../../content/horoscopeEditions.mjs';

export type HoroscopeContextFacts={calculatedAt:string;positions:{planet:string;sign:string;degree:number;motion:string;houses:(number|null)[]}[]};

export default function HoroscopeContext({facts,body,sign,timeZone}:{facts:HoroscopeContextFacts;body:string;sign:string;timeZone:string}) {
  const positions=facts.positions.filter(p=>new RegExp(`\\b${p.planet}\\b`,'iu').test(body));
  if(!positions.length)return null;
  const date=new Date(facts.calculatedAt);
  const dateKey=new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
  return <section className="horoscope-context" aria-label="What's behind it">
    <header><h2>What's behind it</h2><p>As of {date.toLocaleString('en-US',{timeZone,month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'})}</p></header>
    <div className="horoscope-context-grid">{positions.map(p=>{
      const house=p.houses[HOROSCOPE_SIGNS.indexOf(sign)];
      return <a key={p.planet} className="horoscope-context-row" href={`/?date=${dateKey}#sky/placement/${p.planet.toLowerCase().replaceAll(' ','-')}/${p.sign.toLowerCase()}`}>
        <PlacementGlyphIcon className="horoscope-context-glyph" pointName={p.planet} signName={p.sign} fallback={pointGlyph(p.planet)}/>
        <span><strong>{p.planet}{p.motion==='retrograde'?' Rx':''} in {p.sign}</strong><small>{p.degree.toFixed(1)}°{house?` · House ${house}`:''}</small></span>
        <span className="horoscope-context-arrow"><ChevronRight aria-hidden="true"/></span>
      </a>;
    })}</div>
  </section>;
}
