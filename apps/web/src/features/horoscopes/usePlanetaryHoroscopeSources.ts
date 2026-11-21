import {useEffect,useState} from 'react';
import {installSkyCoreFallbackArchitectureV3Bundle,installSkyPlacementFallbackArchitectureV3Bundle} from '../../content/fallbackArchitectureV3Runtime';
import {prepareSkyPlacementSources,skyPlacementPublicationIdentity} from '../../services/skyPlacementHydration';
import {subscribeToContentUpdates,subscribeToContentRevalidation} from '../../services/contentUpdateSignal';
import {subscribeToContentPublications} from '../../content/contentPublicationState';
import {skyIngressEssayPublicationKeys} from '../../content/skyIngressEssayReader';
import {contentPublicationRecords} from '../../content/contentPublicationState';
import {loadLiveGeneratedContentForKeys,type LiveGeneratedContent} from '../../services/generatedContent';
import type {GeneratedContentRow} from '../../services/generatedContent';
import type {PlanetPosition} from '../../types';
import {planetaryEventKey} from '../../../../../src/shared/planetaryHoroscopeIdentity';
import {planetaryEventFromPosition} from '../../../../../src/shared/planetaryHoroscopeVisit';
import {loadReaderRows} from '../../services/readerContentClient';

export {planetarySlug,planetaryHouse,planetaryHoroscopeBody,planetaryHoroscopeWindow,planetaryHoroscopeReading,datedPlanetaryPassage} from './planetaryHoroscopeReading';

export function usePlanetaryHoroscopeSources(selection?:string,context?:{positions:PlanetPosition[];generatedAt:string;timeZone:string}) {
  const [revision,setRevision]=useState(0);
  const eventKeys=context?[...new Set(context.positions.map(position=>planetaryEventFromPosition(position,context.generatedAt,context.timeZone)).filter(Boolean).map(event=>planetaryEventKey(event!)))].sort():[];
  const eventIdentity=JSON.stringify(eventKeys);
  const [loaded,setLoaded]=useState<{selection?:string;eventIdentity:string;identity:string;revision:number;error:boolean;rows:LiveGeneratedContent[];dated:GeneratedContentRow[]}|null>(null);
  const identity=skyPlacementPublicationIdentity(selection);
  const refresh=()=>setRevision(value=>value+1);
  useEffect(()=>subscribeToContentUpdates(refresh),[]);
  useEffect(()=>subscribeToContentRevalidation(refresh),[]);
  useEffect(()=>subscribeToContentPublications(refresh),[]);
  useEffect(()=>{
    let cancelled=false;const abort=new AbortController();
    const prepared=prepareSkyPlacementSources(selection);
    const admission=prepared.then(sources=>!cancelled&&sources.identity===skyPlacementPublicationIdentity(selection)).catch(()=>false);
    const datedRequest=eventKeys.length?loadReaderRows({keys:eventKeys},abort.signal,{ready:admission}):Promise.resolve({data:[],error:null});
    const publishedRequest=prepared.then(async sources=>{
      if(cancelled)return {sources,rows:[]};
      if(sources.identity!==skyPlacementPublicationIdentity(selection))throw new Error('Publication changed.');
      const publications=contentPublicationRecords();
      const pairs=selection?.startsWith('article:')?selection.slice(8).split(','):publications.flatMap(p=>/^sky-article\/([^/]+\/[^/]+)\//u.exec(p.content_key)?.[1]??[]);
      const keys=[...new Set(pairs.flatMap(pair=>{const [planet,sign]=pair.split('/');return skyIngressEssayPublicationKeys(publications,{planet,sign});}))];
      const rows=await loadLiveGeneratedContentForKeys(keys,{requireFresh:true,retryKey:revision});
      if(keys.some(key=>!rows.has(key)))throw new Error('Published planetary readings could not be verified.');
      return {sources,rows:[...rows.values()]};
    });
    void Promise.all([publishedRequest,datedRequest]).then(([{sources,rows},dated])=>{
      if(cancelled)return;
      if(sources.identity!==skyPlacementPublicationIdentity(selection))throw new Error('Publication changed.');
      if(dated.error||!dated.data)throw new Error('Dated planetary readings could not load.');
      installSkyCoreFallbackArchitectureV3Bundle(sources.coreBundle);
      installSkyPlacementFallbackArchitectureV3Bundle(sources.placementBundle);
      setLoaded({selection,eventIdentity,identity:sources.identity,revision,error:false,rows,dated:dated.data});
    }).catch(()=>{if(!cancelled)setLoaded({selection,eventIdentity,identity:skyPlacementPublicationIdentity(selection),revision,error:true,rows:[],dated:[]});});
    return()=>{cancelled=true;abort.abort();};
  },[selection,identity,revision,eventIdentity]);
  const current=loaded&&loaded.selection===selection&&loaded.eventIdentity===eventIdentity&&loaded.identity===identity&&loaded.revision===revision?loaded:null;
  return {ready:Boolean(current&&!current.error),error:Boolean(current?.error),refresh,rows:current?.rows??[],dated:current?.dated??[]};
}
