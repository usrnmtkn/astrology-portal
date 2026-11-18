import { useEffect, useMemo, useRef, useState } from "react";
import type { SkySnapshot } from "../../types";
import { manualChartHasReliableBirthTime } from "../../services/manualCharts";
import type { FriendsFeedPerson } from "./friendsFeedSources";
import { calculatedSynastryContacts, synastryContactSignalTier, zodiacLongitude } from "../../services/chartMath";
import { natalForecastTargets, relationshipForecastDates, type ForecastPerson, type RelationshipForecastDay } from "../../services/relationshipForecast";

export type ForecastDayState = { date: string; status: "loading" | "error" | "ready"; day?: RelationshipForecastDay };

export function useRelationshipForecast(friends: FriendsFeedPerson[], reader: SkySnapshot | null, at: string, timeZone: string, enabled: boolean, readerBirthDate: string) {
  // Keep the existing consent and reliable-time boundary for precise Moons,
  // angles and annual profections. Never invent a birth time or Ascendant.
  const eligible = useMemo(()=>enabled ? friends.filter(friend => friend.canCompare && manualChartHasReliableBirthTime(friend.chart)) : [],[enabled,friends]);
  const pairs = useMemo(()=>reader?.birthTimeKnown === true ? eligible.flatMap(friend => {
    // Shared charts deliberately omit birth dates. Leave their profection
    // unavailable while still calculating their natal transits and synastry.
    const person = (sky:SkySnapshot, owner:ForecastPerson["owner"], birthDate:string):ForecastPerson => ({owner,birthDate,ascendant:sky.ascendant,
      targets:[...sky.positions.filter(p => natalForecastTargets.includes(p.planet)).map(p=>({planet:p.planet,longitude:zodiacLongitude(p)})),
        ...([{planet:"Ascendant",longitude:sky.ascendantLongitude},{planet:"Midheaven",longitude:sky.midheavenLongitude}]
          .filter((p):p is {planet:string;longitude:number} => typeof p.longitude === "number" && Number.isFinite(p.longitude)))]});
    if (!friend.chart.natalChart) return [];
    return [{id:friend.id,people:[person(reader,"reader",readerBirthDate),person(friend.chart.natalChart,"friend",friend.chart.birthDate??"")],
      synastry:calculatedSynastryContacts(reader,friend.chart,Infinity)
        .filter(c=>synastryContactSignalTier(c.yourPoint.name,c.friendPoint.name)!=="background")
        .map(c=>({id:c.id,readerPoint:c.yourPoint.name,friendPoint:c.friendPoint.name,aspect:c.aspect,orb:c.orb}))}];
  }) : [],[eligible,reader,readerBirthDate]);
  const dates = relationshipForecastDates(at,timeZone);
  const key = JSON.stringify([dates,timeZone,pairs]);
  const [state,setState] = useState<{key:string;days:Record<string,Record<string,ForecastDayState>>}>({key:"",days:{}});
  const retryRef = useRef<(date:string) => void>(() => {});
  useEffect(() => {
    if (!pairs.length) return;
    let active=true;
    const calculate = (date:string) => {
      setState(current => {
        const days = current.key === key ? {...current.days} : {};
        for (const pair of pairs) days[pair.id] = {...days[pair.id],[date]:{date,status:"loading"}};
        return {key,days};
      });
      void import("../../services/skyCalculationClient").then(({relationshipForecastDayOffMainThread}) => relationshipForecastDayOffMainThread(pairs,date,timeZone)).then(results => {
        if (!active) return;
        setState(current => {
          if (current.key !== key) return current;
          const days={...current.days};
          for (const result of results) days[result.id]={...days[result.id],[date]:{date,status:"ready",day:result.day}};
          return {key,days};
        });
      }).catch(() => {
        if (!active) return;
        setState(current => {
          if (current.key !== key) return current;
          const days={...current.days};
          for (const pair of pairs) days[pair.id]={...days[pair.id],[date]:{date,status:"error"}};
          return {key,days};
        });
      });
    };
    for (const date of dates) calculate(date);
    retryRef.current=calculate;
    return () => {active=false;retryRef.current=() => {};};
    // The key contains only stable calculation inputs, never presentation names.
    // Retry only failed dates; keep already calculated days visible.
  },[key]);
  return {
    pairs:pairs.map(pair => ({friend:eligible.find(friend => friend.id === pair.id)!,days:dates.map(date => state.key === key ? state.days[pair.id]?.[date] ?? {date,status:"loading" as const} : {date,status:"loading" as const})})),
    retry:(date:string) => {if(dates.includes(date)) retryRef.current(date);},
    eligibleCount:eligible.length
  };
}
