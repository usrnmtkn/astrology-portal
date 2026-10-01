import {seasonalDateFindings} from './horoscopeSeasonalDates.mjs';
import {validateCopy} from './validateCopy.mjs';
import {governValidationResult} from './effectiveRuleGovernance.mjs';
import {HOROSCOPE_SIGNS} from '../../apps/web/src/content/horoscopeEditions.mjs';
import {horoscopeEventsInWindow,horoscopeEventPlanet,horoscopeHouse} from './horoscopeDevelopments.mjs';

export const horoscopeValidationVersion='horoscope-facts/v3';
const bodies='Sun|Moon|Mercury|Venus|Mars|Jupiter|Saturn|Uranus|Neptune|Pluto';
const signs=HOROSCOPE_SIGNS.join('|');
const ordinals=['first','second','third','fourth','fifth','sixth','seventh','eighth','ninth','tenth','eleventh','twelfth'];
const lunationPhase=event=>String(event.id).match(/^lunation-(full|new)-moon-/iu)?.[1]?.toLowerCase();

export function validateHoroscopeReading(passage,brief,{ownerCorrections=[]}={}) {
  const planet=brief.window.period==='daily'?'moon':'sun';
  const anchor=brief.positions.find(p=>p.planet.toLowerCase()===planet);
  if(!anchor)throw new Error('Calculated horoscope anchor is missing.');
  const events=horoscopeEventsInWindow(brief);
  const lint=governValidationResult(validateCopy({headline:passage.headline,body:passage.body},{validationProfile:'horoscope',family:'horoscope',surface:'horoscopes',register:'second_person',requiredFields:['headline','body'],ownerCorrections}),{surface:'horoscopes',family:'horoscope'});
  const violations=[...lint.violations], text=`${passage.headline}\n${passage.body}`;
  const fail=detail=>violations.push({category:'horoscope_fact_boundary',detail,governanceTier:'blocking'});
  if(!/\b(?:you|your)\b/iu.test(passage.body))fail('Address the reader in the second person.');
  if(/\b(?:born with|your natal|since childhood|you always|you have always)\b/iu.test(text))fail('A temporary forecast cannot establish natal biography.');
  if(/\b(?:square[sd]?|trine[sd]?|sextile[sd]?|opposes?|opposition|conjunct(?:ion)?)\b/iu.test(text))fail('Exact aspects are not included in this horoscope brief.');
  if(/\b\d{1,2}:\d{2}\b|\b\d{4}-\d{2}-\d{2}\b/iu.test(text))fail('Keep exact clock times and ISO dates in the calculated timing display.');
  if(brief.window.period==='seasonal')seasonalDateFindings(text,brief).forEach(fail);
  else if(/\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d/iu.test(text))fail('Keep exact dates in the calculated timing display.');
  for(const match of text.matchAll(new RegExp(`\\b(?:(Full|New)\\s+)?(${bodies})\\s+(?:(?:is|moves|moving|travels|traveling)\\s+)?(?:in|through)\\s+(${signs})\\b`,'giu'))) {
    const [,phase,body,sign]=match;
    const supported=phase
      ? body.toLowerCase()==='moon'&&events.some(e=>e.type==='lunation'&&lunationPhase(e)===phase.toLowerCase()&&e.sign?.toLowerCase()===sign.toLowerCase())
      : brief.positions.some(p=>p.planet.toLowerCase()===body.toLowerCase()&&p.sign.toLowerCase()===sign.toLowerCase())
        ||events.some(e=>e.type==='ingress'&&horoscopeEventPlanet(e)===body.toLowerCase()&&e.sign?.toLowerCase()===sign.toLowerCase());
    if(!supported)fail(`The ${phase?phase+' ':''}${body} placement must match the calculated brief.`);
  }
  for(const match of text.matchAll(/\b(Sun|Moon|Mercury|Venus|Mars|Jupiter|Saturn|Uranus|Neptune|Pluto)\s+(?:enters?|entering)\s+(Aries|Taurus|Gemini|Cancer|Leo|Virgo|Libra|Scorpio|Sagittarius|Capricorn|Aquarius|Pisces)\b/giu)) {
    if(!events.some(e=>e.planet?.toLowerCase()===match[1].toLowerCase()&&e.sign?.toLowerCase()===match[2].toLowerCase()&&e.type==='ingress'))fail(`The ${match[1]} ingress must be present in the calculated events.`);
  }
  for(const sentence of text.split(/(?<=[.!?])\s+|\n/u)) {
    const subjects=[...sentence.matchAll(new RegExp(`\\b(?:(Full|New)\\s+)?(${bodies})\\b`,'giu'))];
    for(const match of sentence.matchAll(/\b(\d{1,2}(?:st|nd|rd|th)|first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|eleventh|twelfth)\s+(?:whole[ -]sign\s+)?house\b/giu)) {
      const n=parseInt(match[1])||ordinals.indexOf(match[1].toLowerCase())+1;
      const subject=subjects.filter(s=>s.index<match.index).at(-1)??subjects[0];
      if(!subject){fail('Name the planet or lunation with each numbered house so its calculation can be checked.');continue;}
      const body=subject[2].toLowerCase(),phase=subject[1]?.toLowerCase();
      const nextSubject=subjects.find(s=>s.index>subject.index)?.index??sentence.length;
      const subjectClause=sentence.slice(subject.index,nextSubject);
      const statedSign=subjectClause.match(new RegExp(`\\b(?:in|through|enters?|entering)\\s+(${signs})\\b`,'iu'))?.[1]?.toLowerCase();
      let placements=phase ? events.filter(e=>e.type==='lunation'&&lunationPhase(e)===phase)
        : brief.positions.filter(p=>p.planet.toLowerCase()===body);
      if(statedSign&&!phase)placements=[...placements,...events.filter(e=>e.type==='ingress'&&horoscopeEventPlanet(e)===body)];
      if(statedSign)placements=placements.filter(p=>p.sign?.toLowerCase()===statedSign);
      if(!placements.some(p=>p.sign&&horoscopeHouse(p.sign,passage.sign)===n))fail(`The ${subject[0]} house must match its own calculated placement for ${passage.sign}.`);
    }
  }
  return {...lint,version:horoscopeValidationVersion,passed:violations.length===0,violations,governance:{...lint.governance,blockingViolationCount:violations.length},rulesRun:[...lint.rulesRun,'horoscope-calculated-facts','horoscope-local-timing','horoscope-temporary-register']};
}
