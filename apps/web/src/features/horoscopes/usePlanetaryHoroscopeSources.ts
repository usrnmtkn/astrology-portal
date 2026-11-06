import {placementVisitWindow} from "../../services/placementCardTiming";
import {isDisplayRetrograde} from "../../services/astrologyDisplay";
import {useEffect,useState} from 'react';
import type {PlanetPosition} from '../../types';
import {HOROSCOPE_SIGNS} from '../../content/horoscopeEditions.mjs';
import {installSkyCoreFallbackArchitectureV3Bundle,installSkyPlacementFallbackArchitectureV3Bundle,transitSynastryFallbackRendererV3,SourceGapError} from '../../content/fallbackArchitectureV3Runtime';
import {prepareSkyPlacementSources,skyPlacementPublicationIdentity} from '../../services/skyPlacementHydration';
import {subscribeToContentUpdates,subscribeToContentRevalidation} from '../../services/contentUpdateSignal';
import {subscribeToContentPublications} from '../../content/contentPublicationState';
import {isReaderFacingCopy} from '../../content/readerSafety';
import {planetaryEventFromPosition,planetaryEventKey,planetaryEventMatches,planetaryReaderReadings} from '../../../../../src/shared/planetaryHoroscopeIdentity';
import {loadReaderRows} from '../../services/readerContentClient';
import type {GeneratedContentRow} from '../../services/generatedContent';

export const planetarySlug=(value:string)=>value.toLowerCase().replaceAll(' ','-');
export const planetaryHouse=(position:PlanetPosition,sign:string)=>(HOROSCOPE_SIGNS.indexOf(position.sign.toLowerCase())-HOROSCOPE_SIGNS.indexOf(sign)+12)%12+1;

export function datedPlanetaryPassage(position:PlanetPosition,sign:string,dated:GeneratedContentRow[],generatedAt:string,timeZone='UTC'){
  const event=planetaryEventFromPosition(position,generatedAt,timeZone);
  const row=event&&dated.find(row=>row.content_key===planetaryEventKey(event));
  const readings=row&&planetaryReaderReadings(row);
  return readings&&planetaryEventMatches((row as any).facts.planetaryEvent.event,event!)?readings.passages.find(p=>p.sign===sign)??null:null;
}
export function planetaryHoroscopeBody(position:PlanetPosition,sign:string,dated:GeneratedContentRow[]=[],generatedAt?:string,timeZone='UTC') {
  try {
    const datedPassage=generatedAt&&datedPlanetaryPassage(position,sign,dated,generatedAt,timeZone);
    if(datedPassage)return isReaderFacingCopy(datedPassage.body)?datedPassage.body:'';
    const body=transitSynastryFallbackRendererV3.renderSkyPlacementHouseCore({planet:planetarySlug(position.planet),sign:planetarySlug(position.sign),house:planetaryHouse(position,sign)}).body;
    return isReaderFacingCopy(body)?body:'';
  } catch(reason) {
    if(reason instanceof SourceGapError)return '';
    throw reason;
  }
}

export function planetaryHoroscopeWindow(position:PlanetPosition,generatedAt:string,dated:GeneratedContentRow[]=[]) {
  const event=planetaryEventFromPosition(position,generatedAt,'UTC');
  const row=event&&dated.find(row=>row.content_key===planetaryEventKey(event));
  if(row&&planetaryReaderReadings(row)&&planetaryEventMatches((row as any).facts.planetaryEvent.event,event!))return {start:new Date(event!.startsAt),end:new Date(event!.endsAt)};
  const station=isDisplayRetrograde(position)&&position.retrogradeWindowSource==='station';
  const visit=placementVisitWindow(position,generatedAt);
  const start=Date.parse((station?position.retrogradeStart:visit?.start.toISOString())??'');
  const end=Date.parse((station?position.retrogradeEnd:visit?.end.toISOString())??'');
  return Number.isFinite(start)&&Number.isFinite(end)&&start<end?{start:new Date(start),end:new Date(end)}:null;
}

export function usePlanetaryHoroscopeSources(selection?:string,context?:{positions:PlanetPosition[];generatedAt:string;timeZone:string}) {
  const [revision,setRevision]=useState(0);
  const eventKeys=context?context.positions.map(p=>planetaryEventFromPosition(p,context.generatedAt,context.timeZone)).filter(Boolean).map(event=>planetaryEventKey(event!)).sort():[];
  const eventIdentity=JSON.stringify(eventKeys);
  const [loaded,setLoaded]=useState<{selection?:string;eventIdentity:string;dated:GeneratedContentRow[];identity:string;revision:number;error:boolean}|null>(null);
  const identity=skyPlacementPublicationIdentity(selection);
  const refresh=()=>setRevision(value=>value+1);
  useEffect(()=>subscribeToContentUpdates(refresh),[]);
  useEffect(()=>subscribeToContentRevalidation(refresh),[]);
  useEffect(()=>subscribeToContentPublications(refresh),[]);
  useEffect(()=>{
    let cancelled=false;const abort=new AbortController();
    const prepared=prepareSkyPlacementSources(selection);
    const admission=prepared.then(sources=>!cancelled&&sources.identity===skyPlacementPublicationIdentity(selection)).catch(()=>false);
    void Promise.all([prepared,eventKeys.length?loadReaderRows({keys:eventKeys},abort.signal,{ready:admission}):Promise.resolve({data:[],error:null})]).then(([sources,dated])=>{
      if(cancelled)return;
      if(dated.error||!dated.data)throw new Error('Dated planetary readings could not load.');
      if(sources.identity!==skyPlacementPublicationIdentity(selection))throw new Error('Publication changed.');
      installSkyCoreFallbackArchitectureV3Bundle(sources.coreBundle);
      installSkyPlacementFallbackArchitectureV3Bundle(sources.placementBundle);
      setLoaded({selection,eventIdentity,dated:dated.data,identity:sources.identity,revision,error:false});
    }).catch(()=>{if(!cancelled)setLoaded({selection,eventIdentity,dated:[],identity:skyPlacementPublicationIdentity(selection),revision,error:true});});
    return()=>{cancelled=true;abort.abort();};
  },[selection,identity,revision,eventIdentity]);
  const current=loaded&&loaded.selection===selection&&loaded.eventIdentity===eventIdentity&&loaded.identity===identity&&loaded.revision===revision?loaded:null;
  return {ready:Boolean(current&&!current.error),error:Boolean(current?.error),refresh,dated:current?.dated??[]};
}
