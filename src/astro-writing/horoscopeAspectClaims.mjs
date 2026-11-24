import {resolveHoroscopeClaimSubjects} from './horoscopeClaimContext.mjs';
import {horoscopeEventsInWindow,horoscopeRelationSnapshots,horoscopeSampledAspects} from './horoscopeDevelopments.mjs';
const bodies='Sun|Moon|Mercury|Venus|Mars|Jupiter|Saturn|Uranus|Neptune|Pluto';
const explicitTerms='square[sd]?|trine[sd]?|sextile[sd]?|opposes?|opposition|conjunct(?:ion)?';
const terms=`${explicitTerms}|meets?`;
const signs='Aries|Taurus|Gemini|Cancer|Leo|Virgo|Libra|Scorpio|Sagittarius|Capricorn|Aquarius|Pisces';
const ordinals='1st|2nd|3rd|[4-9]th|1[0-2]th|first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|eleventh|twelfth';
// A short house gloss can separate a planet from its aspect. Never consume
// another planet, aspect, placement, motion or dated clause as part of it.
const glossStop=`${bodies}|${terms}|joins?|${signs}|retrograde|direct|now|is|in|through|from|to|on|at|between|exact|forms?|makes?|January|February|March|April|May|June|July|August|September|October|November|December|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday`;
// Ordinary objects of "with" belong to a life-area gloss. A named planetary
// object still ends that gloss; it cannot be swallowed to attach another pair.
const glossWord=`(?!(?:${glossStop})\\b)(?!with\\s+(?:the\\s+)?(?:(?:retrograde|direct)\\s+)?(?:${bodies})\\b)[\\p{L}]+(?:[-’'][\\p{L}]+)*`;
const gloss=`(?:\\s+of(?:(?:\\s+|,\\s+)${glossWord}){1,8})?`;
const house=`(?:\\s+in\\s+(?:your|the)\\s+(?:${ordinals})\\s+house${gloss})?`;
const motionLabel='(?:\\s+(?:retrograde|direct))?';
const rulerAside='(?:,\\s*your\\s+(?:ruling\\s+planet|(?:traditional\\s+)?ruler)\\s*,)?';
const placement=`(?:\\s+(?:in|through)\\s+(?:${signs}|your sign))?`;
const sector=`(?:\\s+(?:in|through)\\s+(?:your|the)(?:\\s+${glossWord}){1,4}\\s+sector)?`;
const motionAside=`(?:,\\s*(?:which\\s+is\\s+)?(?:(?:now|still)\\s+)?(?:retrograde|direct)${placement}${house}\\s*(?:,|(?=[.!?]|$)))?`;
const planet=`\\b(?:(?:retrograde|direct)\\s+)?(?:${bodies})${motionLabel}${rulerAside}${placement}${house}${sector}${motionAside}`;
// "Meet" is an aspect verb only with a planetary subject. Ordinary prose
// about meeting friends or deadlines must not require a calculated aspect.
const aspectMention=new RegExp(`\\b(?:${explicitTerms})\\b|${planet}\\s+meets?\\b|${planet}\\s+joins?\\s+(?:the\\s+)?${planet}`,'iu');
const leadingRuler=`your\\s+(?:ruling\\s+planet|(?:traditional\\s+)?ruler),\\s*${planet}(?!\\s+(?:and|or)\\s+(?:(?:retrograde|direct)\\s+)?(?:${bodies})\\b)`;
const direct=`${planet}\\s+(?:(?:is|in|an?|exact|forms?|makes?|also)\\s+)*(?:${terms}|joins?)\\s+(?:(?:to|with|the)\\s+)*(?:${leadingRuler}|${planet})`;
const named=`(?:${terms})\\s+(?:between|of)\\s+(?:the\\s+)?${planet}\\s+(?:and|with)\\s+(?:the\\s+)?${planet}`;
const paired=`${planet}(?:\\s*[-–—]\\s*|\\s+and\\s+)${planet}\\s+(?:${terms})`;
// A stated motion/sign can lead into a same-subject temporal clause. Keep the
// intervening sector gloss bounded so another planet cannot supply its subject.
const describedState=`\\b(${bodies})\\s+(?:is|remains)\\s+(?:(?:still|now)\\s+)?(retrograde|direct)\\s+(?:in|through)\\s+(${signs})`;
const described=`${describedState}(?:\\s+and\\s+(?:your|the)(?:\\s+${glossWord}){1,4}\\s+sector)?\\s+when\\s+it\\s+(?:forms?|makes?)\\s+(?:an?\\s+)?(?:${terms})\\s+(?:with|to)\\s+${planet}`;
export const horoscopeAspectPattern=`(?:${described}|${direct}|${named}|${paired})`;
// In two adjacent, explicitly dated aspect sentences, "it" may continue the
// first sentence's grammatical subject. Both pairs and both local weekdays
// must match exact calculated events. No paragraph, intervening clause or
// further pronoun can carry the subject. Reader text is never changed.
function datedAspectSubjects(text,brief) {
  const days='Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday';
  const first=new RegExp(`^\\s*On\\s+(?<day>${days}),?\\s+(?:the\\s+)?(?<aspect>${direct})\\s*[.!?]\\s*$`,'iu');
  const next=new RegExp(`^\\s*On\\s+(?<day>${days}),?\\s+it\\s+(?:${terms}|joins?)\\s+(?:(?:to|with|the)\\s+)*${planet}\\s*[.!?]\\s*$`,'iu');
  const events=horoscopeEventsInWindow(brief);
  const supportsDay=(claim,day)=>events.some(event=>supportsHoroscopeAspect(event,claim)
    &&new Intl.DateTimeFormat('en-US',{timeZone:brief.window.timeZone,weekday:'long'}).format(new Date(event.startsAt)).toLowerCase()===day.toLowerCase());
  let previous=null,lastEnd=0;
  return text.replace(/[^.!?\n]+[.!?]?/gu,(sentence,offset)=>{
    if(text.slice(lastEnd,offset).includes('\n'))previous=null;
    const prior=previous?.match(first),continuation=sentence.match(next);
    previous=sentence;lastEnd=offset+sentence.length;
    if(!prior||!continuation)return sentence;
    const antecedent=horoscopeAspectClaim(prior.groups.aspect);
    if(!antecedent)return sentence;
    const subject=[antecedent.motions[antecedent.planets[0]],antecedent.planets[0]].filter(Boolean).join(' ');
    const resolved=sentence.replace(/\bit\b/iu,subject);
    const claim=horoscopeAspectClaim(resolved.match(new RegExp(direct,'iu'))?.[0]??'');
    return claim&&supportsDay(antecedent,prior.groups.day)&&supportsDay(claim,continuation.groups.day)?resolved:sentence;
  });
}
// Resolve only adjacent coordinated predicates with an explicit first subject:
// "Sun squares Jupiter, then squares Mars". A pronoun, new clause or sentence
// cannot inherit that subject. This is private validation text, never an edit.
function coordinatedAspectSubjects(sentence) {
  // In this bounded introductory clause there is one explicit antecedent:
  // "As the Sun ... moves through your 8th house ..., it squares Jupiter".
  // A second planet, intervening clause or unbounded gloss cannot match.
  const transitSubject=new RegExp(`^(As\\s+(?:the\\s+)?)(?<subject>${planet})\\s+moves\\s+through\\s+(?:your|the)\\s+(?:${ordinals})\\s+house${gloss}\\s*,\\s*it\\s+(?=(?:squares?|trines?|sextiles?|opposes?|meets?)\\b)`,'iu');
  sentence=sentence.replace(transitSubject,(match,...args)=>match.replace(/it\s+$/iu,args.at(-1).subject+' '));
  const insertions=[];
  const day='Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday';
  const prefix=`(?:\\s+(?:on\\s+)?(?:${day}))?\\s*,?\\s*(?:and\\s+then|and|then)\\s+`;
  const next=new RegExp(`^(${prefix})((?:sextiles?|squares?|trines?|opposes?|meets?|joins?)\\s+(?:the\\s+)?${planet})`,'iu');
  const sharedObject=new RegExp(`^(${prefix})((?:the\\s+)?${planet})`,'iu');
  const objectEnd=new RegExp(`^(?:\\s+(?:on\\s+)?(?:${day})\\b|\\s*(?:[.!?;]|$)|\\s*,?\\s*(?:and|then)\\b)`,'iu');
  const verbs={square:'squares',trine:'trines',sextile:'sextiles',opposition:'opposes',conjunction:'meets'};
  for(const match of sentence.matchAll(new RegExp(direct,'giu'))){
    const claim=horoscopeAspectClaim(match[0]);if(!claim)continue;
    const subject=[claim.motions[claim.planets[0]],claim.planets[0]].filter(Boolean).join(' ');
    let end=match.index+match[0].length;
    while(true){
      const remaining=sentence.slice(end),explicit=remaining.match(next),object=remaining.match(sharedObject);
      const tail=explicit??(object&&objectEnd.test(remaining.slice(object[0].length))?object:null);if(!tail)break;
      insertions.push({at:end+tail[1].length,text:subject+' '+(explicit?'':verbs[claim.aspect]+' ')});
      end+=tail[0].length;
    }
  }
  return insertions.sort((a,b)=>b.at-a.at).reduce((text,entry)=>text.slice(0,entry.at)+entry.text+text.slice(entry.at),sentence);
}
export function horoscopeAspectClaim(text) {
  const planets=[...text.matchAll(new RegExp(`\\b(${bodies})\\b`,'giu'))].map(m=>m[1].toLowerCase());
  const word=text.match(new RegExp(`\\b(${terms}|joins?)\\b`,'iu'))?.[1].toLowerCase();
  const aspect=word?.startsWith('oppo')?'opposition':/^(?:conjunct|meet|join)/u.test(word??'')?'conjunction':word?.replace(/[sd]$/u,'');
  const qualified=[...text.matchAll(new RegExp(`\\b(retrograde|direct)\\s+(${bodies})\\b`,'giu'))].map(m=>[m[2].toLowerCase(),m[1].toLowerCase()]);
  qualified.push(...[...text.matchAll(new RegExp(`\\b(${bodies})\\s+(retrograde|direct)\\b`,'giu'))].map(m=>[m[1].toLowerCase(),m[2].toLowerCase()]));
  qualified.push(...[...text.matchAll(new RegExp(`\\b(${bodies})${rulerAside}${placement}${house},\\s*(?:which\\s+is\\s+)?(?:(?:now|still)\\s+)?(retrograde|direct)${placement}${house}\\s*(?:,|(?=[.!?]|$))`,'giu'))].map(m=>[m[1].toLowerCase(),m[2].toLowerCase()]));
  const describedMatch=text.match(new RegExp(describedState,'iu'));
  if(describedMatch)qualified.push([describedMatch[1].toLowerCase(),describedMatch[2].toLowerCase()]);
  const motions=Object.fromEntries(qualified);
  if(qualified.some(([body,motion])=>motions[body]!==motion))return null;
  return planets.length===2&&new Set(planets).size===2&&aspect?{planets,aspect,motions,
    ...(describedMatch?{placements:{[describedMatch[1].toLowerCase()]:describedMatch[3].toLowerCase()}}:{})}:null;
}
// A pair can describe both houses after its second planet. Bind only the
// explicit, adjacent "from ... house to ... house" construction, never prose
// across another clause, planet or aspect. Keys are the numbered house offsets.
export function horoscopeAspectHouseSubjects(sentence) {
  const subjects=new Map();
  const tail=new RegExp(`^\\s+from\\s+(?:your|the)\\s+(?<first>${ordinals})\\s+house${gloss}\\s+to\\s+(?:your|the)\\s+(?<second>${ordinals})\\s+house\\b`,'diu');
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
    &&Object.entries(claim.motions??{}).every(([p,motion])=>[event.fromMotion,event.toMotion][event.planets.findIndex(v=>v.toLowerCase()===p)]===motion)
    &&Object.entries(claim.placements??{}).every(([p,sign])=>[event.fromSign,event.toSign][event.planets.findIndex(v=>v.toLowerCase()===p)]?.toLowerCase()===sign);
}
export function supportsHoroscopeConfiguration(snapshot,sentence) {
  const named=[...sentence.matchAll(new RegExp(`\\b(${bodies})\\b`,'giu'))].map(m=>m[1].toLowerCase());
  return snapshot.configurations?.some(c=>c.type==='T-square'&&c.planets.every(p=>named.includes(p.toLowerCase())));
}
export function horoscopeAspectFindings(text,brief) {
  const events=horoscopeEventsInWindow(brief);
  const sampled=horoscopeSampledAspects(brief);
  const findings=[];
  const checked=datedAspectSubjects(resolveHoroscopeClaimSubjects(text),brief).split(/(?<=[.!?])[ \t]+|\n/u).map(coordinatedAspectSubjects).map(sentence=>sentence.replace(/\bT[ -]square\b/giu,match=>{
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
