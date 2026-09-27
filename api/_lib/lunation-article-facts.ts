import {AdminHttpError} from './admin-http.js';
import {zonedDateTimeToUtc} from '../../apps/web/src/services/timezones.js';
import {traditionalSignRulers} from '../../apps/web/src/content/skySunSeason.js';
import {getAstrodienstSky,getLunarCalendarRangeEvents} from '../../apps/web/src/services/ephemeris.js';
import SwissEph from 'swisseph-wasm';

let eclipseEngine:Promise<SwissEph>|undefined;
export async function verifiedLunationEclipse(instant:string,phase:string) {
  // The Calendar's near-node indicator is only a candidate. Confirm a global
  // eclipse with Swiss's eclipse search before sending that claim to the writer.
  const swe=await (eclipseEngine??=(async()=>{const engine=new SwissEph();await engine.initSwissEph();return engine;})().catch(error=>{eclipseEngine=undefined;throw error;}));
  const module=(swe as any).SweModule;
  const jd=Date.parse(instant)/86400000+2440587.5;
  const times=module._malloc(10*8),error=module._malloc(256);
  try {
    const flags=module.ccall(phase==='new-moon'?'swe_sol_eclipse_when_glob':'swe_lun_eclipse_when','number',
      ['number','number','number','number','number','number'],[jd-1,2,0,times,0,error]);
    const maximum=module.HEAPF64[times>>3];
    if(flags<0||!Number.isFinite(maximum)||maximum<jd-1)throw new AdminHttpError(503,'Eclipse verification is unavailable.');
    return Math.abs(maximum-jd)<1 ? phase==='new-moon'?'solar':'lunar' : null;
  }finally{module._free(times);module._free(error);}
}

export async function lunationArticleEvents(month:string,timeZone:string) {
  if(!/^\d{4}-\d{2}$/u.test(month)||Number(month.slice(0,4))<2020||Number(month.slice(0,4))>2100||Number(month.slice(5))<1||Number(month.slice(5))>12)
    throw new AdminHttpError(400,'Choose a valid month from 2020 to 2100.');
  try{new Intl.DateTimeFormat('en',{timeZone});}catch{throw new AdminHttpError(400,'Choose a valid time zone.');}
  const next=new Date(`${month}-01T12:00:00Z`);next.setUTCMonth(next.getUTCMonth()+1);
  const start=zonedDateTimeToUtc(`${month}-01`,'12:00 AM',timeZone),end=zonedDateTimeToUtc(next.toISOString().slice(0,10),'12:00 AM',timeZone);
  const location={label:'Lunation article calculation',latitude:0,longitude:0,timeZone};
  const events=(await getLunarCalendarRangeEvents(location,start,end)).filter(e=>e.type==='lunation'&&/new moon|full moon/iu.test(e.title)&&e.startsAt>=start.toISOString()&&e.startsAt<end.toISOString());
  const verified=[];
  for(const e of events){
    const phase=/new moon/iu.test(e.title)?'new-moon':'full-moon';
    const eclipseType=await verifiedLunationEclipse(e.startsAt,phase);
    const title=`${phase==='new-moon'?'New Moon':'Full Moon'}${eclipseType?` ${eclipseType==='solar'?'Solar':'Lunar'} Eclipse`:''} in ${e.sign}`;
    verified.push({id:e.id,title,startsAt:e.startsAt,sign:e.sign!,phase,eclipseType,timeZone});
  }
  return verified;
}

export async function calculateLunationArticleFacts(month:string,timeZone:string,eventId:string) {
  const event=(await lunationArticleEvents(month,timeZone)).find(e=>e.id===eventId);
  if(!event)throw new AdminHttpError(422,'Choose a calculated lunation from this month.');
  const sky=await getAstrodienstSky({label:'Lunation article calculation',latitude:0,longitude:0,timeZone},new Date(event.startsAt),{includeTransitWindows:false});
  if(sky.calculationProvenance?.actualEphemeris!=='swiss')throw new AdminHttpError(503,'Verified event-time astrology is unavailable.');
  const positions=sky.positions.map(p=>({planet:p.planet,sign:p.sign,degree:p.degree,motion:p.motion}));
  const sun=positions.find(p=>p.planet==='Sun'),moon=positions.find(p=>p.planet==='Moon');
  if(!sun||!moon||moon.sign.toLowerCase()!==event.sign.toLowerCase())throw new AdminHttpError(503,'The calculated event and Moon position do not agree.');
  const rulers=[...new Set([sun.sign,moon.sign])].map(sign=>{
    const planet=traditionalSignRulers[sign.toLowerCase()];
    const position=positions.find(p=>p.planet.toLowerCase()===planet);
    if(!position)throw new AdminHttpError(503,'An event ruler could not be calculated.');
    return {rulesSign:sign,...position};
  });
  const bodies=new Set(['sun','moon',...rulers.map(r=>r.planet.toLowerCase())]);
  const contacts=sky.aspects.filter(a=>Number.isFinite(a.orb)&&a.orb<=3&&['conjunction','opposition','square','trine','sextile'].includes(a.type)&&(bodies.has(a.from.toLowerCase())||bodies.has(a.to.toLowerCase())))
    .map(a=>({from:a.from,to:a.to,type:a.type,orb:a.orb,...(typeof a.applying==='boolean'?{applying:a.applying}:{})}));
  return {schema:'lunation-article-facts/v1',event,positions,rulers,contacts,provenance:sky.calculationProvenance,
    coverage:'Event-time tropical geocentric positions; major contacts within 3 degrees involving the luminaries or their traditional rulers. Future stations, ingresses and previous cycles are not supplied.'};
}
