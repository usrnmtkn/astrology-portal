import {createHmac, timingSafeEqual} from 'node:crypto';
import {AdminHttpError} from './admin-http.js';
import {zonedDateTimeToUtc} from '../../apps/web/src/services/timezones.js';
import {HOROSCOPE_PERIODS, HOROSCOPE_SIGNS, HOROSCOPE_EDITION_PREFIX, validateHoroscopeEdition, validateHoroscopeWindow, horoscopeEditionKey, horoscopeEditionBody, horoscopeCanonicalJson} from '../../apps/web/src/content/horoscopeEditions.mjs';

function signature(brief: unknown) {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new AdminHttpError(503, 'Horoscope storage is unavailable.');
  return createHmac('sha256', secret).update('horoscope-brief/v1\n' + horoscopeCanonicalJson(brief)).digest('hex');
}
const addDays = (date: string, days: number) => {const value = new Date(date + 'T12:00:00Z'); value.setUTCDate(value.getUTCDate() + days); return value.toISOString().slice(0,10);};
export function horoscopeCivilWindow(period: string, date: string, timeZone: string) {
  const day = new Date(date + 'T12:00:00Z');
  if (!HOROSCOPE_PERIODS.includes(period as any) || !/^\d{4}-\d{2}-\d{2}$/u.test(date) || !Number.isFinite(day.getTime()) || day.toISOString().slice(0,10) !== date
    || day.getUTCFullYear() < 2020 || day.getUTCFullYear() > 2100) throw new AdminHttpError(400, 'Choose a valid horoscope period and date.');
  try {new Intl.DateTimeFormat('en', {timeZone});} catch {throw new AdminHttpError(400, 'Choose a valid time zone.');}
  const start = period === 'weekly' ? addDays(date, -((day.getUTCDay() + 6) % 7)) : date;
  return {start, end:addDays(start, period === 'weekly' ? 7 : 1)};
}
export async function prepareHoroscopeBrief(url: URL) {
  const period = url.searchParams.get('period') ?? 'weekly', date = url.searchParams.get('date') ?? '', timeZone = url.searchParams.get('timeZone') ?? 'America/New_York';
  const civil = horoscopeCivilWindow(period,date,timeZone);
  const reference = zonedDateTimeToUtc(date,'12:00 PM',timeZone);
  const {getAstrodienstSky,getSkyPlacementTransitFacts,getLunarCalendarRangeEvents} = await import('../../apps/web/src/services/ephemeris.js');
  // Shared sign forecasts use geocentric positions; these coordinates are not a natal chart.
  const location = {label:'Geocentric horoscope calculation',latitude:0,longitude:0,timeZone};
  const sky = await getAstrodienstSky(location,reference,{includeTransitWindows:false});
  if (sky.calculationProvenance?.actualEphemeris !== 'swiss') throw new AdminHttpError(503, 'Verified ephemeris facts are unavailable.');
  const sun = sky.positions.find(position => position.planet === 'Sun');
  if (!sun) throw new AdminHttpError(503, 'Calculated Sun placement is unavailable.');
  let startsAt = zonedDateTimeToUtc(civil.start,'12:00 AM',timeZone).toISOString(), endsAt = zonedDateTimeToUtc(civil.end,'12:00 AM',timeZone).toISOString();
  if (period === 'seasonal') {
    const transit = await getSkyPlacementTransitFacts({planet:'Sun',sign:sun.sign,referenceDate:reference,timeZone});
    startsAt = new Date(transit.transitStart).toISOString(); endsAt = new Date(transit.transitEnd).toISOString();
  }
  const window = validateHoroscopeWindow({period,audience:'rising',timeZone,startsAt,endsAt,...(period === 'seasonal' ? {seasonSign:sun.sign.toLowerCase()} : {})});
  const events = (await getLunarCalendarRangeEvents(location,new Date(startsAt),new Date(endsAt)))
    .filter(event => event.startsAt >= startsAt && event.startsAt < endsAt)
    .map(event => ({id:event.id,type:event.type,planet:event.planet ?? null,sign:event.sign ?? event.toSign ?? null,startsAt:event.startsAt}));
  const positions = sky.positions.map(position => ({planet:position.planet,sign:position.sign,degree:position.degree,motion:position.motion}));
  const brief = {schema:'horoscope-brief/v1',window,referenceDate:date,calculatedAt:sky.generatedAt,provenance:sky.calculationProvenance,
    coverage:'Positions at the reference instant; lunations and stations within the period. This is not a complete list of exact aspects or ingresses.',positions,events,
    signs:HOROSCOPE_SIGNS.map(sign => ({sign,houses:positions.map(position => ({planet:position.planet,house:((HOROSCOPE_SIGNS.indexOf(position.sign.toLowerCase())-HOROSCOPE_SIGNS.indexOf(sign)+12)%12)+1}))}))};
  return {ok:true,brief,signature:signature(brief)};
}
export function assertHoroscopeRow(row: Record<string,any>) {
  if (!String(row.content_key ?? '').startsWith(HOROSCOPE_EDITION_PREFIX)) return;
  try {
    const edition = validateHoroscopeEdition(row.sections?.horoscopeEdition,row.status === 'LIVE');
    const packet = row.facts?.horoscopeBrief;
    const expected = signature(packet?.brief);
    if (typeof packet?.signature !== 'string' || !/^[a-f0-9]{64}$/u.test(packet.signature)
      || !timingSafeEqual(Buffer.from(expected),Buffer.from(packet.signature))) throw new Error('Prepare calculated dates and facts before saving this edition.');
    if (JSON.stringify(edition.window) !== JSON.stringify(validateHoroscopeWindow(packet.brief.window))
      || row.content_key !== horoscopeEditionKey(edition.window) || row.surface !== 'sky' || row.mode !== 'article'
      || row.body !== horoscopeEditionBody(edition)) throw new Error('The edition must preserve its calculated dates, identity and complete passages.');
  } catch (error) {throw new AdminHttpError(422,(error as Error).message);}
}
