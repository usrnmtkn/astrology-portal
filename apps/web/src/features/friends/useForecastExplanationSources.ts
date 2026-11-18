import { useEffect, useState } from "react";
import { subscribeToContentPublications } from "../../content/contentPublicationState";
import { frictionFlowFields } from "../../content/frictionFlowCatalog";
import { frictionFlowCopy } from "../../content/frictionFlowCopy";
import { forecastAspectGuideKey } from "../../content/relationshipForecastCopy";
import { subscribeToContentUpdates } from "../../services/contentUpdateSignal";
import { loadReaderRows } from "../../services/readerContentClient";
import type { GeneratedContentRow } from "../../services/generatedContent";
import type { ForecastContact } from "../../services/relationshipForecast";
import { connectionActivationKey } from "../../content/connectionTransit";
import type { NatalTransitTiming } from "../../services/ephemeris";
import { transitAspectDefinitions, transitToNatalOrbLimit } from "../../astrologyConfig";

export function forecastConnectionKey(link: ForecastContact["connections"][number]) {
  return connectionActivationKey(link.readerPoint.toLowerCase().replaceAll(" ","-"),link.aspect,link.friendPoint.toLowerCase().replaceAll(" ","-"));
}

export function useForecastExplanationSources(contacts: ForecastContact[]) {
  return useForecastSourceRows(contacts.length ? [forecastAspectGuideKey,
    ...contacts.flatMap(c=>c.connections.flatMap(link=>forecastConnectionKey(link) ?? []))] : []);
}

export function useFrictionFlowCopy(enabled: boolean) {
  const state = useForecastSourceRows(enabled ? frictionFlowFields.map(field => field.key) : []);
  return { ...state, copy: frictionFlowCopy(state.rows) };
}

function useForecastSourceRows(keys: string[]) {
  const [revision, setRevision] = useState(0);
  const identity = JSON.stringify([...new Set(keys)].sort());
  const [state, setState] = useState<{ identity: string; revision: number; rows: GeneratedContentRow[]; error: boolean } | null>(null);
  useEffect(() => {
    const refresh = () => setRevision(value => value + 1);
    const stopPublications = subscribeToContentPublications(refresh);
    const stopUpdates = subscribeToContentUpdates(refresh);
    return () => { stopPublications(); stopUpdates(); };
  }, []);
  useEffect(() => {
    const keys = JSON.parse(identity) as string[];
    if (!keys.length) return;
    const controller = new AbortController();
    let active = true;
    const timer = setTimeout(() => {
      controller.abort();
      if (active) setState({ identity, revision, rows: [], error: true });
    }, 20_000);
    void loadReaderRows({ keys }, controller.signal).then(result => {
      if (!active || controller.signal.aborted) return;
      setState({ identity, revision, rows: result.data ?? [], error: Boolean(result.error) });
    }).finally(() => clearTimeout(timer));
    return () => { active = false; clearTimeout(timer); controller.abort(); };
  }, [identity, revision]);
  const current = state?.identity === identity && state.revision === revision ? state : null;
  return { rows: current?.rows ?? [], loading: keys.length > 0 && !current, error: current?.error ?? false,
    retry: () => setRevision(value => value + 1) };
}

export function useForecastContactTimings(contacts: ForecastContact[], timeZone: string) {
  const [revision,setRevision] = useState(0);
  const identity=JSON.stringify([timeZone,contacts.map(c=>[c.id,c.planet,c.targetLongitude,c.aspect,c.peakAt])]);
  const [state,setState]=useState<{identity:string;revision:number;timings:Map<string,NatalTransitTiming>;error:boolean}|null>(null);
  useEffect(()=>{
    if (!contacts.length) return;
    let active=true;
    void import("../../services/skyCalculationClient").then(async ({natalTransitTimingForOffMainThread:calculate})=>{
      const results=await Promise.allSettled(contacts.map(async contact=>[contact.id,await calculate(contact.planet,contact.targetLongitude,contact.peakAt,{
        aspectDegrees:transitAspectDefinitions.find(a=>a.type === contact.aspect)?.exact,
        presentationDegrees:transitToNatalOrbLimit(contact.planet),timeZone
      })] as const));
      const timings=new Map<string,NatalTransitTiming>();
      for(const result of results) if(result.status === "fulfilled" && result.value[1]) timings.set(result.value[0],result.value[1]);
      if(active) setState({identity,revision,timings,error:timings.size !== contacts.length});
    }).catch(()=>{if(active)setState({identity,revision,timings:new Map(),error:true});});
    return()=>{active=false;};
  },[identity,revision]);
  const current=state?.identity === identity && state.revision === revision ? state : null;
  return {timings:current?.timings??new Map<string,NatalTransitTiming>(),loading:contacts.length>0&&!current,error:current?.error??false,retry:()=>setRevision(v=>v+1)};
}
