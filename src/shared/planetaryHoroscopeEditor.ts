import {horoscopeSignLabel} from '../../apps/web/src/content/horoscopeEditions.mjs';
import {HOROSCOPE_SIGNS,planetaryHouse,type PlanetaryEvent,type PlanetaryReadings} from './planetaryHoroscopeIdentity.js';

// Reservation, dispatch and response-ID confirmation each have bounded waits.
// Let the original invocation finish before an owner can release its reservation.
export const PLANETARY_DISPATCH_RECOVERY_DELAY_MS=120000;

export const planetaryEventTitle=(event:PlanetaryEvent)=>`${horoscopeSignLabel(event.planet)} in ${horoscopeSignLabel(event.sign)}`;

export const emptyPlanetaryReadings=(event:PlanetaryEvent):PlanetaryReadings=>({schema:'planetary-horoscopes/v1',passages:HOROSCOPE_SIGNS.map(sign=>({sign,house:planetaryHouse(event.sign,sign),headline:'',body:''}))});

