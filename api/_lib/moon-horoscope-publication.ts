import {createHash} from 'node:crypto';
import {AdminHttpError} from './admin-http.js';
import {lunationArticleEvents} from './lunation-article-facts.js';
import {assertMoonHoroscopeRow,moonHoroscopeKey} from '../../src/shared/datedLunationHoroscopes.mjs';

/** Exact event identity is recalculated for every write, including bulk publication. */
export async function moonHoroscopePublicationPatch(row:Record<string,any>) {
  try{assertMoonHoroscopeRow(row);}catch(error){throw new AdminHttpError(422,(error as Error).message);}
  const savedEvent=row.facts.lunationHoroscopes.event;
  const date=new Intl.DateTimeFormat('en-CA',{timeZone:savedEvent.timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(savedEvent.startsAt));
  const event=(await lunationArticleEvents(date.slice(0,7),savedEvent.timeZone)).find(candidate=>moonHoroscopeKey(candidate)===row.content_key);
  if(!event||Date.parse(event.startsAt)!==Date.parse(savedEvent.startsAt)||event.phase!==savedEvent.phase||event.sign.toLowerCase()!==savedEvent.sign.toLowerCase()
    ||(savedEvent.id&&event.id!==savedEvent.id)||event.eclipseType!==(savedEvent.eclipseType??null))throw new AdminHttpError(422,'These horoscopes do not match a calculated Moon event. Select the correct New or Full Moon.');
  const imported=row.source_snapshot?.editorialImport;
  if(imported&&(typeof imported.originalSource!=='string'||imported.originalSource.length>240000))throw new AdminHttpError(422,'The original horoscope import is invalid.');
  return {
    facts:{...row.facts,lunationHoroscopes:{event}},
    source_snapshot:{...row.source_snapshot,...(imported?{editorialImport:{...imported,sha256:createHash('sha256').update(imported.originalSource).digest('hex')}}:{}),
      moonHoroscopeCheck:{checkedAt:new Date().toISOString(),event,copyHash:createHash('sha256').update(row.body).digest('hex')}}
  };
}
