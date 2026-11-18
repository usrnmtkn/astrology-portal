export const MOON_HOROSCOPE_PREFIX='cms/lunation-horoscopes/';
export const MOON_HOROSCOPE_SIGNS=['aries','taurus','gemini','cancer','leo','virgo','libra','scorpio','sagittarius','capricorn','aquarius','pisces'];
export function moonHoroscopeKey(event){
  if(!event||typeof event.sign!=='string'||typeof event.startsAt!=='string')return '';
  const sign=event?.sign?.toLowerCase(),instant=Date.parse(event?.startsAt);
  const phase=event?.phase??(event?.eclipseType==='solar'?'new-moon':event?.eclipseType==='lunar'?'full-moon':/new moon/iu.test(event?.title??'')?'new-moon':/full moon/iu.test(event?.title??'')?'full-moon':null);
  return MOON_HOROSCOPE_SIGNS.includes(sign)&&['new-moon','full-moon'].includes(phase)&&Number.isFinite(instant)
    ?`${MOON_HOROSCOPE_PREFIX}${new Date(instant).toISOString().slice(0,10)}/${phase}/${sign}`:'';
}
export const moonHoroscopeHouse=(sign,risingSign)=>(MOON_HOROSCOPE_SIGNS.indexOf(sign.toLowerCase())-MOON_HOROSCOPE_SIGNS.indexOf(risingSign)+12)%12+1;
export const moonHoroscopeBody=section=>section.passages.map(p=>`${p.heading}\n\n${p.body}`).join('\n\n');
/** Reader admission needs only the public identity and complete published fields. */
export function isMoonHoroscopeReaderRow(row){
  const event=row.facts?.lunationHoroscopes?.event,section=row.sections?.articleHoroscopes;
  if(row.status!=='LIVE'||row.lane!=='serving'||row.review_state||row.surface!=='sky'||row.mode!=='article'
    ||row.event_type!=='lunation-horoscopes'||row.target_date!=null||!moonHoroscopeKey(event)||row.content_key!==moonHoroscopeKey(event)
    ||section?.schema!=='sky-article-horoscopes-v1'||!Array.isArray(section.passages)||section.passages.length!==12)return false;
  const signs=new Set();
  for(const p of section.passages){
    if(!p||!MOON_HOROSCOPE_SIGNS.includes(p.risingSign)||signs.has(p.risingSign)||p.house!==moonHoroscopeHouse(event.sign,p.risingSign)
      ||typeof p.heading!=='string'||!p.heading.trim()||typeof p.body!=='string'||!p.body.trim())return false;
    signs.add(p.risingSign);
  }
  return row.body===moonHoroscopeBody(section);
}
