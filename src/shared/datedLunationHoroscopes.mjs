import {articleHoroscopeSection} from '../../apps/web/src/content/skyArticleHoroscopes.mjs';
import {assertCleanReaderCopy} from '../../apps/web/src/content/editorialCopyBoundary.mjs';

import {MOON_HOROSCOPE_PREFIX,MOON_HOROSCOPE_SIGNS,moonHoroscopeKey,moonHoroscopeHouse,moonHoroscopeBody} from './datedMoonIdentity.mjs';
export {MOON_HOROSCOPE_PREFIX,MOON_HOROSCOPE_SIGNS,moonHoroscopeKey,moonHoroscopeHouse,moonHoroscopeBody};

/** Accept known sign headings; never rewrite prose or silently discard a preface. */
export function parseMoonHoroscopes(text,event) {
  if(typeof text!=='string'||text.length>240000||!moonHoroscopeKey(event))throw new Error('Choose a Moon event and paste up to 240,000 characters.');
  const signPattern=MOON_HOROSCOPE_SIGNS.join('|');
  const pattern=new RegExp(`^(?:#{1,4} +)?(?:\\*\\*)?(${signPattern})(?: *[/&] *(${signPattern}) +Rising| +Rising)?(?:\\*\\*)?[ \\t]*\\r?$`,'gimu');
  const headings=[...text.matchAll(pattern)];
  if(text.slice(0,headings[0]?.index??text.length).trim())throw new Error('Paste only the twelve sign readings, beginning with a sign heading. Keep article introductions and editorial notes separate.');
  const passages=headings.map((match,index)=>{
    const risingSign=match[1].toLowerCase();
    if(match[2]&&match[2].toLowerCase()!==risingSign)throw new Error('A heading names two different signs. Correct it before continuing.');
    return {risingSign,house:moonHoroscopeHouse(event.sign,risingSign),heading:match[0].replace(/\r$/u,''),body:text.slice(match.index+match[0].length,headings[index+1]?.index??text.length).trim()};
  });
  const section={schema:'sky-article-horoscopes-v1',heading:'## Horoscopes',introduction:'',passages};
  assertMoonHoroscopeSection(section,event);
  return section;
}

export function assertMoonHoroscopeSection(section,event) {
  if(!moonHoroscopeKey(event))throw new Error('Choose a valid New or Full Moon event.');
  articleHoroscopeSection({articleHoroscopes:section});
  if(section.passages.length!==12)throw new Error('Include all twelve signs exactly once, with a complete reading for each.');
  for(const passage of section.passages){
    const heading=passage.heading.replace(/^#{1,4}\s+/u,'').replace(/^\*\*|\*\*$/gu,'').trim();
    const signHeading=/^([a-z]+)(?:\s*[/&]\s*([a-z]+)\s+Rising|\s+Rising)?$/iu.exec(heading);
    if(!signHeading||signHeading[1].toLowerCase()!==passage.risingSign||signHeading[2]&&signHeading[2].toLowerCase()!==passage.risingSign)throw new Error(`The heading must name ${passage.risingSign}, the sign assigned to this reading.`);
    if(passage.house!==moonHoroscopeHouse(event.sign,passage.risingSign))throw new Error(`The house for ${passage.risingSign} does not match this Moon event.`);
    if(passage.body.length>20000||passage.heading.length>200)throw new Error('Keep each complete reading under 20,000 characters and its heading under 200.');
    const houseHeading=passage.body.split(/\r?\n/u)[0].match(/^(?:#{1,6}\s*)?(?:\*\*)?(New|Full) Moon in Your (\d{1,2})(?:st|nd|rd|th) House(?:\*\*)?\s*$/iu);
    if(houseHeading&&(Number(houseHeading[2])!==passage.house||(houseHeading[1].toLowerCase()==='new'?'new-moon':'full-moon')!==event.phase))throw new Error(`The Moon or house heading for ${passage.risingSign} does not match the selected event.`);
  }
  assertCleanReaderCopy({sections:{articleHoroscopes:section}});
  return section;
}

export function assertMoonHoroscopeRow(row) {
  if(!String(row.content_key??'').startsWith(MOON_HOROSCOPE_PREFIX))return;
  const event=row.facts?.lunationHoroscopes?.event;
  const revision=row.mode==='studio-draft'&&row.event_type==='horoscope-edition-revision'&&row.lane==='reference'&&row.status!=='LIVE'
    &&row.source_snapshot?.targetContentKey===row.content_key&&row.source_snapshot?.targetRowId&&row.source_snapshot?.targetRowUpdatedAt;
  if(row.content_key!==moonHoroscopeKey(event)||row.surface!=='sky'||!revision&&(row.mode!=='article'||row.event_type!=='lunation-horoscopes')||row.target_date!=null)throw new Error('The horoscope identity must match its saved Moon event.');
  if(typeof event.timeZone!=='string'||!event.timeZone)throw new Error('Choose a valid time zone.');
  try{new Intl.DateTimeFormat('en',{timeZone:event.timeZone});}catch{throw new Error('Choose a valid time zone.');}
  const section=assertMoonHoroscopeSection(row.sections?.articleHoroscopes,event);
  if(row.body!==moonHoroscopeBody(section))throw new Error('The saved text must contain the complete twelve readings. Reload before saving.');
}
