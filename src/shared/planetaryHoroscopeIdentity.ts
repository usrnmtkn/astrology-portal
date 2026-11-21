import {HOROSCOPE_SIGNS,horoscopeCanonicalJson,horoscopeSignLabel} from '../../apps/web/src/content/horoscopeEditions.mjs';

export const PLANETARY_HOROSCOPE_PREFIX='horoscope/planetary/';
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
export const planetaryReadingsBody=(readings:PlanetaryReadings)=>readings.passages.map(p=>`## ${horoscopeSignLabel(p.sign)} / ${horoscopeSignLabel(p.sign)} Rising\n\n${p.headline}\n\n${p.body}`).join('\n\n');
export function planetaryReadingsIssue(value:any,event:PlanetaryEvent,complete=false) {
  if(value?.schema!=='planetary-horoscopes/v1'||Object.keys(value).some(k=>!['schema','passages'].includes(k))||!Array.isArray(value.passages)||value.passages.length!==12)return 1;
  const seen=new Set();
  for(const p of value.passages){
    if(!p||!HOROSCOPE_SIGNS.includes(p.sign)||seen.has(p.sign)||p.house!==planetaryHouse(event.sign,p.sign)
      ||typeof p.headline!=='string'||p.headline.length>200||typeof p.body!=='string'||p.body.length>20000
      ||Object.keys(p).some(k=>!['sign','house','headline','body'].includes(k)))return 2;
    if(complete&&(!p.headline.trim()||!p.body.trim()||/\{\{|\}\}/u.test(p.headline+p.body)))return 3;
    seen.add(p.sign);
  }
  return 0;
}
export function normalizedPlanetaryReadings(value:PlanetaryReadings):PlanetaryReadings {
  return {schema:'planetary-horoscopes/v1',passages:HOROSCOPE_SIGNS.map(sign=>({...value.passages.find(p=>p.sign===sign)!}))};
}
export function planetaryReaderReadings(row:any) {
  try{
    if(row.status!=='LIVE'||row.lane!=='serving'||row.review_state||row.mode!=='article'||row.surface!=='sky'
      ||row.event_type!=='planetary-horoscopes'||row.target_date!=null)return null;
    const event=row.facts?.planetaryEvent?.event;assertPlanetaryEvent(event);
    if(planetaryReadingsIssue(row.sections?.planetaryHoroscopes,event,true)||row.content_key!==planetaryEventKey(event))return null;
    const readings=normalizedPlanetaryReadings(row.sections.planetaryHoroscopes);
    return row.body===planetaryReadingsBody(readings)?readings:null;
  }catch{return null;}
}
export {HOROSCOPE_SIGNS,horoscopeCanonicalJson};
