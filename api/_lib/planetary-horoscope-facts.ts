import {createHmac,timingSafeEqual} from 'node:crypto';
import {AdminHttpError} from './admin-http.js';
import {planetaryEventFromPosition,horoscopeCanonicalJson,PLANETARY_HOROSCOPE_PLANETS,type PlanetaryEvent} from '../../src/shared/planetaryHoroscopes.js';
import {zonedDateTimeToUtc} from '../../apps/web/src/services/timezones.js';

function signature(event:PlanetaryEvent) {
  const secret=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!secret)throw new AdminHttpError(503,'Planetary horoscope storage is unavailable.');
  return createHmac('sha256',secret).update('planetary-horoscope-event/v1\n'+horoscopeCanonicalJson(event)).digest('hex');
}
export function signedPlanetaryEvent(event:PlanetaryEvent){return {event,signature:signature(event)};}
export function assertSignedPlanetaryEvent(packet:any) {
  const expected=signature(packet?.event);
  if(typeof packet?.signature!=='string'||!/^[a-f0-9]{64}$/u.test(packet.signature)
    ||!timingSafeEqual(Buffer.from(expected),Buffer.from(packet.signature)))throw new AdminHttpError(422,'Calculate this planetary event before saving its readings.');
}
export async function calculatePlanetaryEvent(planet:string,referenceInstant:string,timeZone:string) {
  if(!PLANETARY_HOROSCOPE_PLANETS.includes(planet as any))throw new AdminHttpError(400,'Choose a supported planet.');
  const instant=new Date(referenceInstant);
  if(!Number.isFinite(instant.getTime())||instant.toISOString()!==referenceInstant||instant.getUTCFullYear()<2020||instant.getUTCFullYear()>2100)throw new AdminHttpError(400,'Choose a date between 2020 and 2100.');
  if(typeof timeZone!=='string'||!timeZone)throw new AdminHttpError(400,'Choose a valid time zone.');
  try{new Intl.DateTimeFormat('en',{timeZone});}catch{throw new AdminHttpError(400,'Choose a valid time zone.');}
  const {getAstrodienstSky}=await import('../../apps/web/src/services/ephemeris.js');
  const sky=await getAstrodienstSky({label:'Planetary horoscope calculation',latitude:0,longitude:0,timeZone},instant,{includeDailyEvents:false,includeTransitWindows:true,
    includeAspectTiming:false,deferPlacementHistory:true,transitWindowPlanets:[planet[0].toUpperCase()+planet.slice(1)]});
  const position=sky.positions.find(p=>p.planet.toLowerCase()===planet);
  const event=position&&planetaryEventFromPosition(position,sky.generatedAt,timeZone);
  if(!event)throw new AdminHttpError(422,'A complete calculated sign visit is unavailable for this planet and date.');
  return event;
}
export function planetaryReferenceInstant(date:string,timeZone:string) {
  const parsed=typeof date==='string'?new Date(`${date}T12:00:00.000Z`):new Date(NaN);
  if(typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/u.test(date)||!Number.isFinite(parsed.getTime())||parsed.toISOString().slice(0,10)!==date)throw new AdminHttpError(400,'Choose a valid calendar date.');
  if(typeof timeZone!=='string'||!timeZone)throw new AdminHttpError(400,'Choose a valid time zone.');
  let instant;
  try{instant=zonedDateTimeToUtc(date,'12:00 PM',timeZone);}catch{throw new AdminHttpError(400,'Choose a valid date and time zone.');}
  if(!Number.isFinite(instant.getTime()))throw new AdminHttpError(400,'Choose a valid date.');
  return instant.toISOString();
}
