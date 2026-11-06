import {horoscopeSignLabel} from '../../apps/web/src/content/horoscopeEditions.mjs';
import {HOROSCOPE_SIGNS,PLANETARY_HOROSCOPE_PLANETS,assertPlanetaryEvent,planetaryHouse,planetaryEventKey,type PlanetaryEvent,type PlanetaryReadings} from './planetaryHoroscopeIdentity.js';

// Reservation, dispatch and response-ID confirmation each have bounded waits.
// Let the original invocation finish before an owner can release its reservation.
export const PLANETARY_DISPATCH_RECOVERY_DELAY_MS=120000;

export const planetaryEventTitle=(event:PlanetaryEvent)=>`${horoscopeSignLabel(event.planet)} in ${horoscopeSignLabel(event.sign)}`;

export const emptyPlanetaryReadings=(event:PlanetaryEvent):PlanetaryReadings=>({schema:'planetary-horoscopes/v1',passages:HOROSCOPE_SIGNS.map(sign=>({sign,house:planetaryHouse(event.sign,sign),headline:'',body:''}))});

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
