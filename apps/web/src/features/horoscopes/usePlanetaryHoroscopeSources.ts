import {useEffect,useState} from 'react';
import type {PlanetPosition} from '../../types';
import {HOROSCOPE_SIGNS} from '../../content/horoscopeEditions.mjs';
import {installSkyCoreFallbackArchitectureV3Bundle,installSkyPlacementFallbackArchitectureV3Bundle,transitSynastryFallbackRendererV3,SourceGapError} from '../../content/fallbackArchitectureV3Runtime';
import {prepareSkyPlacementSources,skyPlacementPublicationIdentity} from '../../services/skyPlacementHydration';
import {subscribeToContentUpdates,subscribeToContentRevalidation} from '../../services/contentUpdateSignal';
import {subscribeToContentPublications} from '../../content/contentPublicationState';
import {isReaderFacingCopy} from '../../content/readerSafety';

export const planetarySlug=(value:string)=>value.toLowerCase().replaceAll(' ','-');
export const planetaryHouse=(position:PlanetPosition,sign:string)=>(HOROSCOPE_SIGNS.indexOf(position.sign.toLowerCase())-HOROSCOPE_SIGNS.indexOf(sign)+12)%12+1;

export function planetaryHoroscopeBody(position:PlanetPosition,sign:string) {
  try {
    const body=transitSynastryFallbackRendererV3.renderSkyPlacementHouseCore({planet:planetarySlug(position.planet),sign:planetarySlug(position.sign),house:planetaryHouse(position,sign)}).body;
    return isReaderFacingCopy(body)?body:'';
  } catch(reason) {
    if(reason instanceof SourceGapError)return '';
    throw reason;
  }
}

export function planetaryHoroscopeWindow(position:PlanetPosition,generatedAt:string) {
  const station=position.motion==='retrograde'&&position.retrogradeWindowSource==='station';
  const at=Date.parse(generatedAt);
  const visit=position.residencyPasses?.find(pass=>Date.parse(pass.entryDate)<=at&&at<=Date.parse(pass.exitDate));
  const start=Date.parse((station?position.retrogradeStart:visit?.entryDate??position.transitStart)??'');
  const end=Date.parse((station?position.retrogradeEnd:visit?.exitDate??position.transitEnd)??'');
  return Number.isFinite(start)&&Number.isFinite(end)&&start<end?{start:new Date(start),end:new Date(end)}:null;
}

export function usePlanetaryHoroscopeSources(selection?:string) {
  const [revision,setRevision]=useState(0);
  const [loaded,setLoaded]=useState<{selection?:string;identity:string;revision:number;error:boolean}|null>(null);
  const identity=skyPlacementPublicationIdentity(selection);
  const refresh=()=>setRevision(value=>value+1);
  useEffect(()=>subscribeToContentUpdates(refresh),[]);
  useEffect(()=>subscribeToContentRevalidation(refresh),[]);
  useEffect(()=>subscribeToContentPublications(refresh),[]);
  useEffect(()=>{
    let cancelled=false;
    void prepareSkyPlacementSources(selection).then(sources=>{
      if(cancelled)return;
      if(sources.identity!==skyPlacementPublicationIdentity(selection))throw new Error('Publication changed.');
      installSkyCoreFallbackArchitectureV3Bundle(sources.coreBundle);
      installSkyPlacementFallbackArchitectureV3Bundle(sources.placementBundle);
      setLoaded({selection,identity:sources.identity,revision,error:false});
    }).catch(()=>{if(!cancelled)setLoaded({selection,identity:skyPlacementPublicationIdentity(selection),revision,error:true});});
    return()=>{cancelled=true;};
  },[selection,identity,revision]);
  const current=loaded&&loaded.selection===selection&&loaded.identity===identity&&loaded.revision===revision?loaded:null;
  return {ready:Boolean(current&&!current.error),error:Boolean(current?.error),refresh};
}
