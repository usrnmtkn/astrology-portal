import {horoscopeEventsInWindow,horoscopeEventPlanet} from './horoscopeDevelopments.mjs';

const months='January|February|March|April|May|June|July|August|September|October|November|December';
const signs='Aries|Taurus|Gemini|Cancer|Leo|Virgo|Libra|Scorpio|Sagittarius|Capricorn|Aquarius|Pisces';
const bodies='Sun|Moon|Mercury|Venus|Mars|Jupiter|Saturn|Uranus|Neptune|Pluto';
const eventPattern=`(?:(?:${signs})\\s+)?(?:Full|New)\\s+Moon(?:\\s+in\\s+(?:${signs}))?|(?:${bodies})\\s+(?:enters?|entering|stations?\\s+(?:retrograde|direct))(?:\\s+(?:in\\s+)?(?:${signs}))?`;

/** Check supplied month/day dates and their nearest explicit event in each sentence. */
export function seasonalDateFindings(text,brief) {
  const formatter=new Intl.DateTimeFormat('en-US',{timeZone:brief.window.timeZone,month:'long',day:'numeric',year:'numeric'});
  const events=horoscopeEventsInWindow(brief).map(event=>{
    const parts=formatter.formatToParts(new Date(event.startsAt));
    const part=type=>parts.find(p=>p.type===type)?.value;
    return {...event,month:part('month').toLowerCase(),day:Number(part('day')),year:Number(part('year'))};
  });
  const findings=[];
  for(const sentence of text.split(/(?<=[.!?])\s+|\n/u)) {
    const mentions=[...sentence.matchAll(new RegExp(eventPattern,'giu'))];
    for(const date of sentence.matchAll(new RegExp(`\\b(${months})\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s+(\\d{4}))?\\b`,'giu'))) {
      const supported=events.filter(e=>e.month===date[1].toLowerCase()&&e.day===Number(date[2])&&(!date[3]||e.year===Number(date[3])));
      if(!supported.length){findings.push('A seasonal calendar date must match a supplied event in the edition’s time zone.');continue;}
      const distance=mention=>Math.max(0,mention.index-(date.index+date[0].length),date.index-(mention.index+mention[0].length));
      const nearest=[...mentions].sort((a,b)=>distance(a)-distance(b))[0];
      if(!nearest)continue;
      const phase=nearest[0].match(/(Full|New)\s+Moon/iu)?.[1]?.toLowerCase();
      const planet=phase?'moon':nearest[0].match(new RegExp(bodies,'iu'))?.[0]?.toLowerCase();
      const sign=nearest[0].match(new RegExp(signs,'iu'))?.[0]?.toLowerCase();
      const ingress=/enter/iu.test(nearest[0]),station=/station/iu.test(nearest[0]);
      const direction=nearest[0].match(/retrograde|direct/iu)?.[0]?.toLowerCase();
      if(!supported.some(e=>horoscopeEventPlanet(e)===planet&&(!sign||e.sign?.toLowerCase()===sign)
        &&(!phase||e.type==='lunation'&&String(e.id).includes(`lunation-${phase}-moon-`))
        &&(!ingress||e.type==='ingress')&&(!station||e.type==='station'&&(!direction||e.direction===direction)))) {
        findings.push('The seasonal date must belong to the named calculated event, not another event in the brief.');
      }
    }
  }
  return findings;
}
