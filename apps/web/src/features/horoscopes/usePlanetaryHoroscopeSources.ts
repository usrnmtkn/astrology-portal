import {useEffect,useState} from 'react';
import {installSkyCoreFallbackArchitectureV3Bundle,installSkyPlacementFallbackArchitectureV3Bundle} from '../../content/fallbackArchitectureV3Runtime';
import {prepareSkyPlacementSources,skyPlacementPublicationIdentity} from '../../services/skyPlacementHydration';
import {subscribeToContentUpdates,subscribeToContentRevalidation} from '../../services/contentUpdateSignal';
import {subscribeToContentPublications} from '../../content/contentPublicationState';
import {skyIngressEssayPublicationKeys} from '../../content/skyIngressEssayReader';
import {contentPublicationRecords} from '../../content/contentPublicationState';
import {loadLiveGeneratedContentForKeys,type LiveGeneratedContent} from '../../services/generatedContent';

export {planetarySlug,planetaryHouse,planetaryHoroscopeBody,planetaryHoroscopeWindow,planetaryHoroscopeReading} from './planetaryHoroscopeReading';

export function usePlanetaryHoroscopeSources(selection?:string) {
  const [revision,setRevision]=useState(0);
  const [loaded,setLoaded]=useState<{selection?:string;identity:string;revision:number;error:boolean;rows:LiveGeneratedContent[]}|null>(null);
  const identity=skyPlacementPublicationIdentity(selection);
  const refresh=()=>setRevision(value=>value+1);
  useEffect(()=>subscribeToContentUpdates(refresh),[]);
  useEffect(()=>subscribeToContentRevalidation(refresh),[]);
  useEffect(()=>subscribeToContentPublications(refresh),[]);
  useEffect(()=>{
    let cancelled=false;
    void prepareSkyPlacementSources(selection).then(async sources=>{
      if(cancelled)return;
      if(sources.identity!==skyPlacementPublicationIdentity(selection))throw new Error('Publication changed.');
      const publications=contentPublicationRecords();
      const pairs=selection?.startsWith('article:')?selection.slice(8).split(','):publications.flatMap(p=>/^sky-article\/([^/]+\/[^/]+)\//u.exec(p.content_key)?.[1]??[]);
      const keys=[...new Set(pairs.flatMap(pair=>{const [planet,sign]=pair.split('/');return skyIngressEssayPublicationKeys(publications,{planet,sign});}))];
      const rows=await loadLiveGeneratedContentForKeys(keys,{requireFresh:true,retryKey:revision});
      if(cancelled)return;
      if(sources.identity!==skyPlacementPublicationIdentity(selection)||keys.some(key=>!rows.has(key)))throw new Error('Published planetary readings could not be verified.');
      installSkyCoreFallbackArchitectureV3Bundle(sources.coreBundle);
      installSkyPlacementFallbackArchitectureV3Bundle(sources.placementBundle);
      setLoaded({selection,identity:sources.identity,revision,error:false,rows:[...rows.values()]});
    }).catch(()=>{if(!cancelled)setLoaded({selection,identity:skyPlacementPublicationIdentity(selection),revision,error:true,rows:[]});});
    return()=>{cancelled=true;};
  },[selection,identity,revision]);
  const current=loaded&&loaded.selection===selection&&loaded.identity===identity&&loaded.revision===revision?loaded:null;
  return {ready:Boolean(current&&!current.error),error:Boolean(current?.error),refresh,rows:current?.rows??[]};
}
