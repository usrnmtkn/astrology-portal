import {horoscopeEventsInWindow} from './horoscopeDevelopments.mjs';
const bodies='Sun|Moon|Mercury|Venus|Mars|Jupiter|Saturn|Uranus|Neptune|Pluto';
const terms='square[sd]?|trine[sd]?|sextile[sd]?|opposes?|opposition|conjunct(?:ion)?';
const signs='Aries|Taurus|Gemini|Cancer|Leo|Virgo|Libra|Scorpio|Sagittarius|Capricorn|Aquarius|Pisces';
const planet=`(?:${bodies})(?:\\s+(?:in|through)\\s+(?:${signs}))?`;
const direct=`${planet}\\s+(?:(?:is|in|an?|exact|forms?|makes?)\\s+)*(?:${terms})\\s+(?:(?:to|with|the)\\s+)*${planet}`;
const named=`(?:${terms})\\s+(?:between|of)\\s+(?:the\\s+)?${planet}\\s+(?:and|with)\\s+(?:the\\s+)?${planet}`;
const paired=`${planet}(?:\\s*[-–—]\\s*|\\s+and\\s+)${planet}\\s+(?:${terms})`;
export const horoscopeAspectPattern=`(?:${direct}|${named}|${paired})`;
export function horoscopeAspectClaim(text) {
  const planets=[...text.matchAll(new RegExp(`\\b(${bodies})\\b`,'giu'))].map(m=>m[1].toLowerCase());
  const word=text.match(new RegExp(`\\b(${terms})\\b`,'iu'))?.[1].toLowerCase();
  const aspect=word?.startsWith('oppo')?'opposition':word?.startsWith('conjunct')?'conjunction':word?.replace(/[sd]$/u,'');
  return planets.length===2&&aspect?{planets,aspect}:null;
}
export function supportsHoroscopeAspect(event,claim) {
  return event.type==='aspect'&&event.aspect===claim.aspect&&claim.planets.every(p=>event.planets?.some(v=>v.toLowerCase()===p));
}
export function horoscopeAspectFindings(text,brief) {
  const events=horoscopeEventsInWindow(brief);
  if(!events.some(e=>e.type==='aspect'))return new RegExp(`\\b(?:${terms})\\b`,'iu').test(text)?['Exact aspects are not included in this horoscope brief.']:[];
  const findings=[];
  // Validate each explicit pair, including more than one pair in the same sentence.
  const remainder=text.replace(new RegExp(horoscopeAspectPattern,'giu'),match=>{
    if(!events.some(event=>supportsHoroscopeAspect(event,horoscopeAspectClaim(match))))findings.push('The named planetary aspect must match a calculated event in this edition.');
    return ' '.repeat(match.length);
  });
  if(new RegExp(`\\b(?:${terms})\\b`,'iu').test(remainder))findings.push('Name both planets with each aspect so it can be checked against the calculated events.');
  if(/\b(?:T[ -]square|grand trine|grand cross|yod|cazimi)\b/iu.test(text))findings.push('This brief does not calculate configurations or cazimi boundaries.');
  return findings;
}
