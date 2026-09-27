import {validateCopy} from './validateCopy.mjs';
import {governValidationResult} from './effectiveRuleGovernance.mjs';
import {HOROSCOPE_SIGNS} from '../../apps/web/src/content/horoscopeEditions.mjs';

export function validateHoroscopeReading(passage,brief,{ownerCorrections=[]}={}) {
  const planet=brief.window.period==='daily'?'moon':'sun';
  const anchor=brief.positions.find(p=>p.planet.toLowerCase()===planet);
  if(!anchor)throw new Error('Calculated horoscope anchor is missing.');
  const house=(HOROSCOPE_SIGNS.indexOf(anchor.sign.toLowerCase())-HOROSCOPE_SIGNS.indexOf(passage.sign)+12)%12+1;
  const lint=governValidationResult(validateCopy({headline:passage.headline,body:passage.body},{validationProfile:'horoscope',family:'horoscope',surface:'horoscopes',register:'second_person',requiredFields:['headline','body'],ownerCorrections}),{surface:'horoscopes',family:'horoscope'});
  const violations=[...lint.violations], text=`${passage.headline}\n${passage.body}`;
  const fail=detail=>violations.push({category:'horoscope_fact_boundary',detail});
  if(!/\b(?:you|your)\b/iu.test(passage.body))fail('Address the reader in the second person.');
  if(/\b(?:born with|your natal|since childhood|you always|you have always)\b/iu.test(text))fail('A temporary forecast cannot establish natal biography.');
  if(/\b(?:square[sd]?|trine[sd]?|sextile[sd]?|opposes?|opposition|conjunct(?:ion)?)\b/iu.test(text))fail('Exact aspects are not included in this horoscope brief.');
  if(/\b\d{1,2}:\d{2}\b|\b\d{4}-\d{2}-\d{2}\b|\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d/iu.test(text))fail('Keep exact dates and clock times in the calculated timing display.');
  for(const match of text.matchAll(/\b(Sun|Moon|Mercury|Venus|Mars|Jupiter|Saturn|Uranus|Neptune|Pluto)\s+(?:(?:is|moves|moving|travels|traveling)\s+)?(?:in|through)\s+(Aries|Taurus|Gemini|Cancer|Leo|Virgo|Libra|Scorpio|Sagittarius|Capricorn|Aquarius|Pisces)\b/giu)) {
    if(!brief.positions.some(p=>p.planet.toLowerCase()===match[1].toLowerCase()&&p.sign.toLowerCase()===match[2].toLowerCase()))fail(`The ${match[1]} placement must match the calculated brief.`);
  }
  for(const match of text.matchAll(/\b(Sun|Moon|Mercury|Venus|Mars|Jupiter|Saturn|Uranus|Neptune|Pluto)\s+(?:enters?|entering)\s+(Aries|Taurus|Gemini|Cancer|Leo|Virgo|Libra|Scorpio|Sagittarius|Capricorn|Aquarius|Pisces)\b/giu)) {
    if(!brief.events.some(e=>e.planet?.toLowerCase()===match[1].toLowerCase()&&e.sign?.toLowerCase()===match[2].toLowerCase()&&String(e.type).includes('ingress')))fail(`The ${match[1]} ingress must be present in the calculated events.`);
  }
  const ordinals=['first','second','third','fourth','fifth','sixth','seventh','eighth','ninth','tenth','eleventh','twelfth'];
  for(const match of text.matchAll(/\b(\d{1,2}(?:st|nd|rd|th)|first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|eleventh|twelfth)\s+(?:whole[ -]sign\s+)?house\b/giu)) {
    const n=parseInt(match[1])||ordinals.indexOf(match[1].toLowerCase())+1;
    if(n!==house)fail(`This reading’s ${planet} anchor belongs to house ${house}.`);
  }
  return {...lint,passed:violations.length===0,violations,rulesRun:[...lint.rulesRun,'horoscope-calculated-facts','horoscope-local-timing','horoscope-temporary-register']};
}
