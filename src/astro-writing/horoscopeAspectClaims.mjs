import {horoscopeEventsInWindow,horoscopeRelationSnapshots,horoscopeSampledAspects} from './horoscopeDevelopments.mjs';
const bodies='Sun|Moon|Mercury|Venus|Mars|Jupiter|Saturn|Uranus|Neptune|Pluto';
const terms='square[sd]?|trine[sd]?|sextile[sd]?|opposes?|opposition|conjunct(?:ion)?';
const signs='Aries|Taurus|Gemini|Cancer|Leo|Virgo|Libra|Scorpio|Sagittarius|Capricorn|Aquarius|Pisces';
const motionAside='(?:,\\s*(?:now\\s+)?(?:retrograde|direct)\\s*,)?';
const planet=`(?:${bodies})(?:\\s+(?:in|through)\\s+(?:${signs}))?${motionAside}`;
const direct=`${planet}\\s+(?:(?:is|in|an?|exact|forms?|makes?)\\s+)*(?:${terms})\\s+(?:(?:to|with|the)\\s+)*${planet}`;
const named=`(?:${terms})\\s+(?:between|of)\\s+(?:the\\s+)?${planet}\\s+(?:and|with)\\s+(?:the\\s+)?${planet}`;
const paired=`${planet}(?:\\s*[-–—]\\s*|\\s+and\\s+)${planet}\\s+(?:${terms})`;
export const horoscopeAspectPattern=`(?:${direct}|${named}|${paired})`;
export function horoscopeAspectClaim(text) {
  const planets=[...text.matchAll(new RegExp(`\\b(${bodies})\\b`,'giu'))].map(m=>m[1].toLowerCase());
  const word=text.match(new RegExp(`\\b(${terms})\\b`,'iu'))?.[1].toLowerCase();
  const aspect=word?.startsWith('oppo')?'opposition':word?.startsWith('conjunct')?'conjunction':word?.replace(/[sd]$/u,'');
  const motions=Object.fromEntries([...text.matchAll(new RegExp(`\\b(${bodies})(?:\\s+(?:in|through)\\s+(?:${signs}))?,\\s*(?:now\\s+)?(retrograde|direct)\\s*,`,'giu'))].map(m=>[m[1].toLowerCase(),m[2].toLowerCase()]));
  return planets.length===2&&aspect?{planets,aspect,motions}:null;
}
export function supportsHoroscopeAspect(event,claim) {
  return Boolean(claim)&&event.type==='aspect'&&event.aspect===claim.aspect&&claim.planets.every(p=>event.planets?.some(v=>v.toLowerCase()===p))
    &&Object.entries(claim.motions??{}).every(([p,motion])=>[event.fromMotion,event.toMotion][event.planets.findIndex(v=>v.toLowerCase()===p)]===motion);
}
export function supportsHoroscopeConfiguration(snapshot,sentence) {
  const named=[...sentence.matchAll(new RegExp(`\\b(${bodies})\\b`,'giu'))].map(m=>m[1].toLowerCase());
  return snapshot.configurations?.some(c=>c.type==='T-square'&&c.planets.every(p=>named.includes(p.toLowerCase())));
}
export function horoscopeAspectFindings(text,brief) {
  const events=horoscopeEventsInWindow(brief);
  const sampled=horoscopeSampledAspects(brief);
  const findings=[];
  const checked=text.split(/(?<=[.!?])[ \t]+|\n/u).map(sentence=>sentence.replace(/\bT[ -]square\b/giu,match=>{
    const supported=horoscopeRelationSnapshots(brief).some(s=>supportsHoroscopeConfiguration(s,sentence));
    if(!supported)findings.push('Name all three planets in the T-square; they must belong to one supplied simultaneous configuration.');
    if(/\bexact\b/iu.test(sentence))findings.push('A sampled configuration within the declared orb is not an exact three-planet event.');
    return ' '.repeat(match.length);
  })).join('\n');
  if(/\b(?:grand trine|grand cross|yod|cazimi)\b/iu.test(text))findings.push('This brief does not calculate that configuration or cazimi boundary.');
  if(!events.some(e=>e.type==='aspect')&&!sampled.length){if(new RegExp(`\\b(?:${terms})\\b`,'iu').test(checked))findings.push('Exact aspects are not included in this horoscope brief.');return findings;}
  // Validate each explicit pair, including more than one pair in the same sentence.
  let previous=null;
  const remainder=checked.split('\n').map(sentence=>{
    if(!sentence.trim()){previous=null;return sentence;}
    // An interpretive reference may use a previously checked pair in this
    // paragraph. It cannot introduce another planet, date, motion or exactness.
    let rest=sentence;
    if(previous&&!new RegExp(`\\b(?:${bodies}|${signs}|January|February|March|April|May|June|July|August|September|October|November|December|exact|retrograde|direct|again|returns?|recurs?|tomorrow|yesterday)\\b|\\d`,'iu').test(sentence)){
      rest=rest.replace(/\b(?:this|that)\s+(square|trine|sextile|opposition|conjunction)\b/giu,(match,aspect)=>aspect.toLowerCase()===previous.aspect?' '.repeat(match.length):match);
    }
    let found=false;
    rest=rest.replace(new RegExp(horoscopeAspectPattern,'giu'),match=>{
      found=true;const claim=horoscopeAspectClaim(match);
      const supported=events.some(event=>supportsHoroscopeAspect(event,claim))||(!/\bexact\b/iu.test(sentence)&&sampled.some(event=>supportsHoroscopeAspect(event,claim)));
      if(!supported)findings.push('The named planetary aspect must match a calculated event or supplied event-time aspect in this edition.');
      previous=supported?claim:null;
      return ' '.repeat(match.length);
    });
    // A different named subject or unresolved aspect breaks the reference.
    if((!found&&new RegExp(`\\b(?:${bodies}|${signs})\\b`,'iu').test(sentence))||new RegExp(`\\b(?:${terms})\\b`,'iu').test(rest))previous=null;
    return rest;
  }).join('\n');
  if(new RegExp(`\\b(?:${terms})\\b`,'iu').test(remainder))findings.push('Name both planets with each aspect so it can be checked against the calculated events.');
  return findings;
}
