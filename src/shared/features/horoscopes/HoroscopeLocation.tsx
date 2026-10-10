import {useEffect,useId,useState} from 'react';
import type {LocationInput} from '../../types';
import {browserTimeZone} from '../../../../apps/web/src/services/timezones';
import {validHoroscopeTimeZone} from '../../../../apps/web/src/content/horoscopeEditions.mjs';

export function HoroscopeLocation({value,onChange,onReset,description,disabled=false}:{value:LocationInput;onChange:(value:LocationInput)=>void;onReset?:()=>void;description?:string;disabled?:boolean}) {
  const id=useId();
  const [query,setQuery]=useState(''),[cities,setCities]=useState<LocationInput[]>([]),[error,setError]=useState(''),[searching,setSearching]=useState(false);
  const zone=value.timeZone??browserTimeZone();
  const zones=[...new Set([zone,'UTC',...Intl.supportedValuesOf('timeZone')])];
  useEffect(()=>{
    let current=true;setCities([]);setError('');
    if(query.trim().length<3){setSearching(false);return;}
    setSearching(true);
    const timer=setTimeout(()=>{void import('../../../../apps/web/src/services/mapbox').then(({searchCities})=>searchCities(query)).then(found=>{if(current){setCities(found);if(!found.length)setError('No matching cities. You can select a time zone below.');}}).catch(()=>{if(current)setError('City search is unavailable. Select your time zone below.');}).finally(()=>{if(current)setSearching(false);});},350);
    return()=>{current=false;clearTimeout(timer);};
  },[query]);
  function choose(city:LocationInput){if(!city.timeZone||!validHoroscopeTimeZone(city.timeZone)){setError('This city’s time zone could not be verified. Select its time zone below.');return;}onChange(city);setQuery('');setCities([]);}
  return <details className="horoscope-location">
    <summary>{value.label||'Your location'} · {zone.replaceAll('_',' ')} · Change</summary>
    <div className="horoscope-location-fields">
      <label htmlFor={id}>City<input id={id} type="search" placeholder="Search for a city" value={query} disabled={disabled} autoComplete="off" onChange={e=>setQuery(e.target.value)}/></label>
      {searching&&<p role="status">Looking up cities…</p>}
      {cities.length>0&&<ul aria-label="Matching cities">{cities.map(city=><li key={`${city.label}/${city.latitude}/${city.longitude}`}><button type="button" disabled={disabled} onClick={()=>choose(city)}>{city.label}</button></li>)}</ul>}
      {error&&<p role="status">{error}</p>}
      <label>Time zone<select aria-label="Horoscope time zone" value={zone} disabled={disabled} onChange={e=>{setQuery('');onChange({label:'Selected time zone',latitude:0,longitude:0,timeZone:e.target.value});}}>{zones.map(z=><option key={z} value={z}>{z.replaceAll('_',' ')}</option>)}</select></label>
      {onReset&&<button type="button" disabled={disabled} onClick={()=>{setQuery('');setCities([]);setError('');onReset();}}>Reset to device time zone</button>}
      <p>{description??'Local dates follow this time zone, including daylight saving time. Readings use your rising sign.'}</p>
    </div>
  </details>;
}
