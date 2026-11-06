import {HOROSCOPE_SIGNS,horoscopeCanonicalJson,horoscopeSignLabel} from '../../apps/web/src/content/horoscopeEditions.mjs';

export const PLANETARY_HOROSCOPE_PREFIX='horoscope/planetary/';
// Reservation, dispatch and response-ID confirmation each have bounded waits.
// Let the original invocation finish before an owner can release its reservation.
export const PLANETARY_DISPATCH_RECOVERY_DELAY_MS=120000;
export const PLANETARY_HOROSCOPE_PLANETS=['mercury','venus','mars','jupiter','saturn','uranus','neptune','pluto'] as const;
export type PlanetaryEvent={schema:'planetary-horoscope-event/v1';planet:string;sign:string;startsAt:string;endsAt:string;referenceInstant:string;timeZone:string};
export type PlanetaryReadings={schema:'planetary-horoscopes/v1';passages:Array<{sign:string;house:number;headline:string;body:string}>};
const instant=(value:unknown)=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(value)&&Number.isFinite(Date.parse(value));
export const planetaryHouse=(sign:string,rising:string)=>(HOROSCOPE_SIGNS.indexOf(sign)-HOROSCOPE_SIGNS.indexOf(rising)+12)%12+1;
export function assertPlanetaryEvent(event:any):asserts event is PlanetaryEvent {
  if(event?.schema!=='planetary-horoscope-event/v1'||!PLANETARY_HOROSCOPE_PLANETS.includes(event.planet)||!HOROSCOPE_SIGNS.includes(event.sign)
    ||!instant(event.startsAt)||!instant(event.endsAt)||!instant(event.referenceInstant)
    ||!(Date.parse(event.startsAt)<=Date.parse(event.referenceInstant)&&Date.parse(event.referenceInstant)<Date.parse(event.endsAt))
    ||typeof event.timeZone!=='string'||Object.keys(event).some(k=>!['schema','planet','sign','startsAt','endsAt','referenceInstant','timeZone'].includes(k)))throw new Error('Choose a calculated planetary sign visit.');
  try{new Intl.DateTimeFormat('en',{timeZone:event.timeZone});}catch{throw new Error('Choose a valid time zone.');}
}
export function planetaryEventKey(event:PlanetaryEvent) {
  assertPlanetaryEvent(event);
  return `${PLANETARY_HOROSCOPE_PREFIX}${event.planet}/${event.sign}/${event.startsAt.slice(0,10)}`;
}
export const planetaryEventTitle=(event:PlanetaryEvent)=>`${horoscopeSignLabel(event.planet)} in ${horoscopeSignLabel(event.sign)}`;
export const planetaryReadingsBody=(readings:PlanetaryReadings)=>readings.passages.map(p=>`## ${horoscopeSignLabel(p.sign)} / ${horoscopeSignLabel(p.sign)} Rising\n\n${p.headline}\n\n${p.body}`).join('\n\n');
export const emptyPlanetaryReadings=(event:PlanetaryEvent):PlanetaryReadings=>({schema:'planetary-horoscopes/v1',passages:HOROSCOPE_SIGNS.map(sign=>({sign,house:planetaryHouse(event.sign,sign),headline:'',body:''}))});
export function validatePlanetaryReadings(value:any,event:PlanetaryEvent,complete=false):PlanetaryReadings {
  assertPlanetaryEvent(event);
  if(value?.schema!=='planetary-horoscopes/v1'||Object.keys(value).some(k=>!['schema','passages'].includes(k))||!Array.isArray(value.passages)||value.passages.length!==12)throw new Error('Keep all twelve sign readings.');
  const seen=new Set();
  for(const p of value.passages){
    if(!p||!HOROSCOPE_SIGNS.includes(p.sign)||seen.has(p.sign)||p.house!==planetaryHouse(event.sign,p.sign)
      ||typeof p.headline!=='string'||p.headline.length>200||typeof p.body!=='string'||p.body.length>20000
      ||Object.keys(p).some(k=>!['sign','house','headline','body'].includes(k)))throw new Error('Each sign needs its own complete reading and calculated house.');
    if(complete&&(!p.headline.trim()||!p.body.trim()||/\{\{|\}\}/u.test(p.headline+p.body)))throw new Error('Finish all twelve headlines and readings before publishing.');
    seen.add(p.sign);
  }
  return {schema:'planetary-horoscopes/v1',passages:HOROSCOPE_SIGNS.map(sign=>({...value.passages.find((p:any)=>p.sign===sign)}))};
}
export function assertPlanetaryHoroscopeRow(row:any,complete=row.status==='LIVE') {
  const event=row.facts?.planetaryEvent?.event;
  assertPlanetaryEvent(event);
  const revision=row.mode==='studio-draft'&&row.event_type==='horoscope-edition-revision'&&row.status!=='LIVE'&&row.lane==='reference'
    &&row.source_snapshot?.targetRowId&&row.source_snapshot?.targetRowUpdatedAt&&row.source_snapshot?.targetContentKey===row.content_key;
  const readings=validatePlanetaryReadings(row.sections?.planetaryHoroscopes,event,complete);
  if(row.content_key!==planetaryEventKey(event)||row.surface!=='sky'||!revision&&(row.mode!=='article'||row.event_type!=='planetary-horoscopes')
    ||row.target_date!=null||row.body!==planetaryReadingsBody(readings))throw new Error('Keep the calculated event identity and all twelve complete readings.');
  return readings;
}
export function planetaryReaderReadings(row:any) {
  try{
    if(row.status!=='LIVE'||row.lane!=='serving'||row.review_state||row.mode!=='article')return null;
    return assertPlanetaryHoroscopeRow(row,true);
  }catch{return null;}
}
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
export {HOROSCOPE_SIGNS,horoscopeCanonicalJson};
