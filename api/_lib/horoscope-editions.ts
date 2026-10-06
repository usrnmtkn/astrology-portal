import {createHash,createHmac, timingSafeEqual} from 'node:crypto';
import {AdminHttpError} from './admin-http.js';
import {zonedDateTimeToUtc} from '../../apps/web/src/services/timezones.js';
import {HOROSCOPE_PERIODS, HOROSCOPE_SIGNS, HOROSCOPE_EDITION_PREFIX, validateHoroscopeEdition, validateHoroscopeWindow, isHoroscopeEditionKey, horoscopeEditionBody, horoscopeCanonicalJson, canonicalHoroscopeTimeZone} from '../../apps/web/src/content/horoscopeEditions.mjs';

import {validateHoroscopeReading,horoscopeValidationVersion} from '../../src/astro-writing/horoscopeValidation.mjs';
import {horoscopePunctuationFindings,horoscopeVocabularyFindings} from '../../src/astro-writing/horoscopeEditorialConstraints.mjs';

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
  if (period === 'monthly') return {start:date.slice(0,7)+'-01',end:new Date(Date.UTC(day.getUTCFullYear(),day.getUTCMonth()+1,1)).toISOString().slice(0,10)};
  const start = period === 'weekly' ? addDays(date, -((day.getUTCDay() + 6) % 7)) : date;
  return {start, end:addDays(start, period === 'weekly' ? 7 : 1)};
}
export async function prepareHoroscopeBrief(url: URL) {
  const period = url.searchParams.get('period') ?? 'weekly', date = url.searchParams.get('date') ?? '', requestedZone = url.searchParams.get('timeZone') ?? 'America/New_York';
  let timeZone:string;
  try {timeZone=canonicalHoroscopeTimeZone(requestedZone);} catch {throw new AdminHttpError(400,'Choose a valid time zone.');}
  const civil = horoscopeCivilWindow(period,date,timeZone);
  const referenceDate = ['weekly','monthly'].includes(period) ? civil.start : date;
  const reference = zonedDateTimeToUtc(referenceDate,'12:00 PM',timeZone);
  const {getAstrodienstSky,getSkyPlacementTransitFacts,getHoroscopeCalendarRangeEvents,getHoroscopeRelationalContext} = await import('../../apps/web/src/services/ephemeris.js');
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
  const window = validateHoroscopeWindow({period,audience:period==='monthly'?'collective':'rising',timeZone,startsAt,endsAt,...(period === 'seasonal' ? {seasonSign:sun.sign.toLowerCase()} : {})});
  const includeAspects = ['weekly','monthly','seasonal'].includes(period);
  const calculatedEvents = (await getHoroscopeCalendarRangeEvents(location,new Date(startsAt),new Date(endsAt),{includeAspects}))
    .filter(event => event.startsAt >= startsAt && event.startsAt < endsAt);
  const relationalContext = period==='seasonal' ? await getHoroscopeRelationalContext(new Date(startsAt),sun.sign,calculatedEvents) : undefined;
  const events = calculatedEvents
    .map(event => ({id:event.id,type:event.type,planet:event.planet ?? null,sign:event.sign ?? event.toSign ?? null,startsAt:event.startsAt,
      title:event.title,...(event.type==='aspect'?{planets:event.planets,aspect:event.aspect,toSign:event.toSign,fromMotion:event.fromMotion,toMotion:event.toMotion}:{}),fromSign:event.fromSign ?? null,direction:event.direction ?? null}));
  const positions = sky.positions.map(position => ({planet:position.planet,sign:position.sign,degree:position.degree,motion:position.motion}));
  const brief = {schema:'horoscope-brief/v1',window,referenceDate,calculatedAt:sky.generatedAt,provenance:sky.calculationProvenance,
    coverage:`Positions at the reference instant; calculated lunations, stations and planetary ingresses within the period. ${includeAspects?'Exact major aspects between the Sun and planets are included.':'Exact aspects are not included.'} ${relationalContext?relationalContext.coverage:'Lunar aspects and multi-planet configurations are not included.'} An event time describes the sky event, not a guaranteed personal event.`,positions,events,...(relationalContext?{relationalContext}:{}),
    signs:HOROSCOPE_SIGNS.map(sign => ({sign,houses:positions.map(position => ({planet:position.planet,house:((HOROSCOPE_SIGNS.indexOf(position.sign.toLowerCase())-HOROSCOPE_SIGNS.indexOf(sign)+12)%12)+1}))}))};
  return {ok:true,brief,signature:signature(brief)};
}
export function assertHoroscopeRow(row: Record<string,any>, {enforcePunctuation=false,previous=null}:{enforcePunctuation?:boolean;previous?:Record<string,any>|null}={}) {
  if (!String(row.content_key ?? '').startsWith(HOROSCOPE_EDITION_PREFIX)) return;
  try {
    const edition = validateHoroscopeEdition(row.sections?.horoscopeEdition,row.status === 'LIVE');
    // Keep paid drafts editable and let the remaining signs finish. Publication
    // always checks current text, including imports with no generation receipt.
    if(row.status==='LIVE')for(const passage of edition.passages){
      const issue=horoscopeVocabularyFindings(passage,edition.window.period)[0];
      if(issue)throw new Error(`${passage.sign}: ${issue.detail} Edit this reading before publishing.`);
    }
    if(enforcePunctuation || row.status==='LIVE')for(const passage of edition.passages) {
      const old=previous?.sections?.horoscopeEdition?.passages?.find((p:any)=>p.sign===passage.sign);
      if(row.status!=='LIVE'&&old?.headline===passage.headline&&old?.body===passage.body)continue;
      const issue=horoscopePunctuationFindings(passage)[0];
      if(issue)throw new Error(`${passage.sign}: ${issue.detail} Your text has not been replaced.`);
    }
    const packet = row.facts?.horoscopeBrief;
    const expected = signature(packet?.brief);
    if (typeof packet?.signature !== 'string' || !/^[a-f0-9]{64}$/u.test(packet.signature)
      || !timingSafeEqual(Buffer.from(expected),Buffer.from(packet.signature))) throw new Error('Prepare calculated dates and facts before saving this edition.');
    if (JSON.stringify(edition.window) !== JSON.stringify(validateHoroscopeWindow(packet.brief.window))
      || !isHoroscopeEditionKey(row.content_key,edition.window) || row.surface !== 'sky' || row.mode !== 'article'
      || row.body !== horoscopeEditionBody(edition)) throw new Error('The edition must preserve its calculated dates, identity and complete passages.');
    if(row.status==='LIVE'&&row.source_snapshot?.horoscopeGeneration) {
      for(const passage of edition.passages) {
        const lint=validateHoroscopeReading(passage,packet.brief);
        const receipt=row.source_snapshot.horoscopeGeneration.readings?.[passage.sign];
        const bodyHash=createHash('sha256').update(horoscopeCanonicalJson({headline:passage.headline,body:passage.body})).digest('hex');
        // Preserve the original diagnostic receipt. Recomputed fact checks replace
        // obsolete fact findings (e.g. a lunation compared with a snapshot Moon).
        // Other recorded checks, including private owner corrections, still apply.
        const recorded=receipt?.bodyHash===bodyHash?receipt?.lint?.violations??[]:[];
        const issues=[...lint.violations,...recorded.filter((issue:any)=>issue.category!=='horoscope_fact_boundary'||receipt?.lint?.version===horoscopeValidationVersion)];
        if(issues.length)throw new Error(`${passage.sign}: ${issues[0].detail} Edit this reading before publishing.`);
      }
    }
  } catch (error) {throw new AdminHttpError(422,(error as Error).message);}
}
