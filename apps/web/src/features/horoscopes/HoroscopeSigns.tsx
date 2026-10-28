import {HOROSCOPE_SIGNS,horoscopeSignLabel} from '../../content/horoscopeEditions.mjs';
import {zodiacAssetHref,zodiacSignIconFiles} from '../../components/charts/chartAssets';

export default function HoroscopeSigns({sign,rising,sun,onSelect}:{sign:string;rising:string|null;sun:string|null;onSelect:(sign:string)=>void}) {
  return <section className="horoscope-explore" aria-label="Explore signs">
    <h2>Explore signs</h2><p>Be sure to check both your Sun sign and your rising sign.</p>
    <div className="horoscope-personal-signs" role="group" aria-label="Your signs">{(rising?[{sign:rising,label:'rising sign'}]:[]).concat(sun&&sun!==rising?[{sign:sun,label:'Sun sign'}]:[]).filter(entry=>entry.sign!==sign).map(entry=><button className="learn-jump__link" key={entry.label} type="button" onClick={()=>onSelect(entry.sign)}>Also read for your {entry.label} · {horoscopeSignLabel(entry.sign)}</button>)}</div>
    <div className="horoscope-signs" role="group" aria-label="Zodiac signs">{HOROSCOPE_SIGNS.map(value=>{
      const name=horoscopeSignLabel(value);
      return <button type="button" className="learn-jump__link horoscope-sign-link" key={value} aria-label={`${name} & ${name} Rising`} aria-pressed={sign===value} onClick={()=>onSelect(value)}>
        <img src={zodiacAssetHref(zodiacSignIconFiles[name])!} alt="" aria-hidden="true"/><span>{name}</span>
      </button>;
    })}</div>
  </section>;
}
