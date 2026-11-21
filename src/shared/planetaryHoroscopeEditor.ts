import {horoscopeSignLabel} from '../../apps/web/src/content/horoscopeEditions.mjs';
import {HOROSCOPE_SIGNS,planetaryHouse,assertPlanetaryEvent,planetaryEventKey,planetaryReadingsBody,planetaryReadingsIssue,normalizedPlanetaryReadings,type PlanetaryEvent,type PlanetaryReadings} from './planetaryHoroscopeIdentity.js';

export function validatePlanetaryReadings(value:any,event:PlanetaryEvent,complete=false):PlanetaryReadings {
  assertPlanetaryEvent(event);
  const issue=planetaryReadingsIssue(value,event,complete);
  if(issue)throw new Error(['','Keep all twelve sign readings.','Each sign needs its own complete reading and calculated house.','Finish all twelve headlines and readings before publishing.'][issue]);
  return normalizedPlanetaryReadings(value);
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

// Reservation, dispatch and response-ID confirmation each have bounded waits.
// Let the original invocation finish before an owner can release its reservation.
export const PLANETARY_DISPATCH_RECOVERY_DELAY_MS=120000;

export const planetaryEventTitle=(event:PlanetaryEvent)=>`${horoscopeSignLabel(event.planet)} in ${horoscopeSignLabel(event.sign)}`;

export const emptyPlanetaryReadings=(event:PlanetaryEvent):PlanetaryReadings=>({schema:'planetary-horoscopes/v1',passages:HOROSCOPE_SIGNS.map(sign=>({sign,house:planetaryHouse(event.sign,sign),headline:'',body:''}))});
