import {HOROSCOPE_SIGNS,PLANETARY_HOROSCOPE_PLANETS,assertPlanetaryEvent,planetaryEventKey,type PlanetaryEvent} from './planetaryHoroscopeIdentity.js';

/** Compare calculated visits, not a planet/sign pair shared by unrelated years or return visits. */
export function planetaryEventMatches(saved:PlanetaryEvent,event:PlanetaryEvent) {
  return planetaryEventKey(saved)===planetaryEventKey(event)&&Math.abs(Date.parse(saved.startsAt)-Date.parse(event.startsAt))<2000
    &&Math.abs(Date.parse(saved.endsAt)-Date.parse(event.endsAt))<2000;
}
export function planetaryEventFromPosition(position:any,referenceInstant:string,timeZone:string):PlanetaryEvent|null {
  const planet=String(position.planet).toLowerCase(),sign=String(position.sign).toLowerCase(),at=Date.parse(referenceInstant);
  if(!PLANETARY_HOROSCOPE_PLANETS.includes(planet as any))return null;
  const pass=position.residencyPasses?.find((p:any)=>Date.parse(p.entryDate)<=at&&at<Date.parse(p.exitDate));
  const event:PlanetaryEvent={schema:'planetary-horoscope-event/v1',planet,sign,startsAt:pass?.entryDate??position.transitStart,
    endsAt:pass?.exitDate??position.transitEnd,referenceInstant,timeZone};
  try{assertPlanetaryEvent(event);return event;}catch{return null;}
}
