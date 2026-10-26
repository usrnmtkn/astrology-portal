import {resolveHoroscopeClaimSubjects} from './horoscopeClaimContext.mjs';
import {horoscopeEventsInWindow,horoscopeRelationSnapshots,horoscopeSampledAspects} from './horoscopeDevelopments.mjs';
const bodies='Sun|Moon|Mercury|Venus|Mars|Jupiter|Saturn|Uranus|Neptune|Pluto';
const explicitTerms='square[sd]?|trine[sd]?|sextile[sd]?|opposes?|opposition|conjunct(?:ion)?';
const terms=`${explicitTerms}|meets?`;
const signs='Aries|Taurus|Gemini|Cancer|Leo|Virgo|Libra|Scorpio|Sagittarius|Capricorn|Aquarius|Pisces';
const ordinals='1st|2nd|3rd|[4-9]th|1[0-2]th|first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|eleventh|twelfth';
// A short house gloss can separate a planet from its aspect. Never consume
// another planet, aspect, placement, motion or dated clause as part of it.
const glossStop=`${bodies}|${terms}|${signs}|retrograde|direct|now|is|in|through|from|to|on|at|with|between|exact|forms?|makes?|January|February|March|April|May|June|July|August|September|October|November|December|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday`;
const glossWord=`(?!(?:${glossStop})\\b)[\\p{L}]+(?:[-’'][\\p{L}]+)*`;
const house=`(?:\\s+in\\s+(?:your|the)\\s+(?:${ordinals})\\s+house(?:\\s+of(?:\\s+${glossWord}){1,8})?)?`;
const motionLabel='(?:\\s+(?:retrograde|direct))?';
const rulerAside='(?:,\\s*your\\s+(?:ruling\\s+planet|(?:traditional\\s+)?ruler)\\s*,)?';
const placement=`(?:\\s+(?:in|through)\\s+(?:${signs}|your sign))?`;
const motionAside=`(?:,\\s*(?:which\\s+is\\s+)?(?:(?:now|still)\\s+)?(?:retrograde|direct)${placement}${house}\\s*(?:,|(?=[.!?]|$)))?`;
const planet=`\\b(?:(?:retrograde|direct)\\s+)?(?:${bodies})${motionLabel}${rulerAside}${placement}${house}${motionAside}`;
// "Meet" is an aspect verb only with a planetary subject. Ordinary prose
// about meeting friends or deadlines must not require a calculated aspect.
const aspectMention=new RegExp(`\\b(?:${explicitTerms})\\b|${planet}\\s+meets?\\b`,'iu');
const leadingRuler=`your\\s+(?:ruling\\s+planet|(?:traditional\\s+)?ruler),\\s*${planet}(?!\\s+(?:and|or)\\s+(?:(?:retrograde|direct)\\s+)?(?:${bodies})\\b)`;
const direct=`${planet}\\s+(?:(?:is|in|an?|exact|forms?|makes?|also)\\s+)*(?:${terms})\\s+(?:(?:to|with|the)\\s+)*(?:${leadingRuler}|${planet})`;
const named=`(?:${terms})\\s+(?:between|of)\\s+(?:the\\s+)?${planet}\\s+(?:and|with)\\s+(?:the\\s+)?${planet}`;
const paired=`${planet}(?:\\s*[-–—]\\s*|\\s+and\\s+)${planet}\\s+(?:${terms})`;
export const horoscopeAspectPattern=`(?:${direct}|${named}|${paired})`;
export function horoscopeAspectClaim(text) {
  const planets=[...text.matchAll(new RegExp(`\\b(${bodies})\\b`,'giu'))].map(m=>m[1].toLowerCase());
  const word=text.match(new RegExp(`\\b(${terms})\\b`,'iu'))?.[1].toLowerCase();
  const aspect=word?.startsWith('oppo')?'opposition':/^(?:conjunct|meet)/u.test(word??'')?'conjunction':word?.replace(/[sd]$/u,'');
  const qualified=[...text.matchAll(new RegExp(`\\b(retrograde|direct)\\s+(${bodies})\\b`,'giu'))].map(m=>[m[2].toLowerCase(),m[1].toLowerCase()]);
  qualified.push(...[...text.matchAll(new RegExp(`\\b(${bodies})\\s+(retrograde|direct)\\b`,'giu'))].map(m=>[m[1].toLowerCase(),m[2].toLowerCase()]));
  qualified.push(...[...text.matchAll(new RegExp(`\\b(${bodies})${rulerAside}${placement}${house},\\s*(?:which\\s+is\\s+)?(?:(?:now|still)\\s+)?(retrograde|direct)${placement}${house}\\s*(?:,|(?=[.!?]|$))`,'giu'))].map(m=>[m[1].toLowerCase(),m[2].toLowerCase()]));
  const motions=Object.fromEntries(qualified);
  if(qualified.some(([body,motion])=>motions[body]!==motion))return null;
  return planets.length===2&&new Set(planets).size===2&&aspect?{planets,aspect,motions}:null;
}
// A pair can describe both houses after its second planet. Bind only the
// explicit, adjacent "from ... house to ... house" construction, never prose
// across another clause, planet or aspect. Keys are the numbered house offsets.
export function horoscopeAspectHouseSubjects(sentence) {
  const subjects=new Map();
  const tail=new RegExp(`^\\s+from\\s+(?:your|the)\\s+(?<first>${ordinals})\\s+house(?:\\s+of(?:\\s+${glossWord}){1,8})?\\s+to\\s+(?:your|the)\\s+(?<second>${ordinals})\\s+house\\b`,'diu');
  for(const match of sentence.matchAll(new RegExp(horoscopeAspectPattern,'giu'))) {
    const claim=horoscopeAspectClaim(match[0]),end=match.index+match[0].length;
    const houses=sentence.slice(end).match(tail);
    if(!claim||!houses)continue;
    const planets=[...match[0].matchAll(new RegExp(`\\b(${bodies})\\b`,'giu'))];
    subjects.set(end+houses.indices.groups.first[0],match.index+planets[0].index);
    subjects.set(end+houses.indices.groups.second[0],match.index+planets[1].index);
  }
  return subjects;
}
export function horoscopePersonalSignClaims(text) {
  return [...text.matchAll(new RegExp(`\\b(${bodies})${rulerAside}\\s+(?:in|through)\\s+your sign\\b`,'giu'))].map(m=>m[1]);
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
  const checked=resolveHoroscopeClaimSubjects(text).split(/(?<=[.!?])[ \t]+|\n/u).map(sentence=>sentence.replace(/\bT[ -]square\b/giu,match=>{
    const supported=horoscopeRelationSnapshots(brief).some(s=>supportsHoroscopeConfiguration(s,sentence));
    if(!supported)findings.push('Name all three planets in the T-square; they must belong to one supplied simultaneous configuration.');
    if(/\bexact\b/iu.test(sentence))findings.push('A sampled configuration within the declared orb is not an exact three-planet event.');
    return ' '.repeat(match.length);
  })).join('\n');
  if(/\b(?:grand trine|grand cross|yod|cazimi)\b/iu.test(text))findings.push('This brief does not calculate that configuration or cazimi boundary.');
  if(!events.some(e=>e.type==='aspect')&&!sampled.length){if(aspectMention.test(checked))findings.push('Exact aspects are not included in this horoscope brief.');return findings;}
  // Validate each explicit pair, including more than one pair in the same sentence.
  let previous=null;
  const remainder=checked.split('\n').map(sentence=>{
    if(!sentence.trim()){previous=null;return sentence;}
    // An interpretive reference may use a previously checked pair in this
    // paragraph. It cannot introduce another planet, date, motion or exactness.
    let rest=sentence;
    if(new RegExp(`\\b(?:${bodies})\\b`,'iu').test(sentence)&&/\b(?:it|and)\s+meets?\b/iu.test(sentence))findings.push('Name both planets when the aspect subject is ambiguous.');
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
    if((!found&&new RegExp(`\\b(?:${bodies}|${signs})\\b`,'iu').test(sentence))||aspectMention.test(rest))previous=null;
    return rest;
  }).join('\n');
  if(aspectMention.test(remainder))findings.push('Name both planets with each aspect so it can be checked against the calculated events.');
  return findings;
}
