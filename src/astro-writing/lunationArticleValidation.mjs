import {validateCopy} from './validateCopy.mjs';
import {governValidationResult} from './effectiveRuleGovernance.mjs';
import {withLunationVocabularyFindings} from './lunationEditorialConstraints.mjs';

export function validateLunationArticle(value,facts) {
  const lint=withLunationVocabularyFindings(governValidationResult(validateCopy(value,{family:'lunation-article',surface:'lunation-article',register:'second_person',requiredFields:['headline','body']}),{family:'lunation-article',surface:'lunation-article'}),value);
  const violations=[...lint.violations],text=`${value.headline}\n${value.body}`;
  const fail=detail=>violations.push({category:'lunation_fact_boundary',detail,governanceTier:'blocking'});
  if(!facts.event.eclipseType&&/\b(?:this|the current) (?:solar |lunar )?eclipse\b/iu.test(text))fail('This event is not a verified eclipse.');
  if(/\b(?:your natal|born with|since childhood)\b/iu.test(text))fail('A collective lunation article cannot establish personal biography.');
  if(/\b(?:\d{1,2}(?:st|nd|rd|th)|first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|eleventh|twelfth) house\b/iu.test(text))fail('No personal houses are supplied for this collective article.');
  for(const m of text.matchAll(/\b(Sun|Moon|Mercury|Venus|Mars|Jupiter|Saturn|Uranus|Neptune|Pluto)\s+(?:(?:is|moves|moving|travels|traveling)\s+)?(?:in|through)\s+(Aries|Taurus|Gemini|Cancer|Leo|Virgo|Libra|Scorpio|Sagittarius|Capricorn|Aquarius|Pisces)\b/giu)) {
    if(!facts.positions.some(p=>p.planet.toLowerCase()===m[1].toLowerCase()&&p.sign.toLowerCase()===m[2].toLowerCase()))fail(`${m[1]} in ${m[2]} does not match the event-time calculation.`);
  }
  return {...lint,passed:violations.length===0,violations,governance:{...lint.governance,blockingViolationCount:violations.length},rulesRun:[...lint.rulesRun,'lunation-event-time-facts','collective-lunation-register']};
}
