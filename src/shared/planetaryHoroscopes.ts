import {assertCleanReaderCopy} from '../../apps/web/src/content/editorialCopyBoundary.mjs';
import {validatePlanetaryReadings as validateStructure,assertPlanetaryHoroscopeRow as assertRowStructure,type PlanetaryEvent} from './planetaryHoroscopeIdentity.js';
export * from './planetaryHoroscopeIdentity.js';

function assertReaderFields(readings:ReturnType<typeof validateStructure>){
  assertCleanReaderCopy({headline:readings.passages.map(p=>p.headline).join('\n'),body:readings.passages.map(p=>p.body).join('\n\n')});
  return readings;
}
export function validatePlanetaryReadings(value:any,event:PlanetaryEvent,complete=false){return assertReaderFields(validateStructure(value,event,complete));}
export function assertPlanetaryHoroscopeRow(row:any,complete=row.status==='LIVE'){return assertReaderFields(assertRowStructure(row,complete));}
