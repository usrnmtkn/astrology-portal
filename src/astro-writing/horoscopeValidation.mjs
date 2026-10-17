import {resolveHoroscopeClaimSubjects,horoscopePlacementClaims,horoscopeHouseIngressTargets} from './horoscopeClaimContext.mjs';
import {horoscopeAspectFindings,horoscopeAspectHouseSubjects,horoscopePersonalSignClaims} from './horoscopeAspectClaims.mjs';
import {horoscopePunctuationFindings,horoscopeVocabularyFindings} from './horoscopeEditorialConstraints.mjs';
import {seasonalDateFindings} from './horoscopeSeasonalDates.mjs';
import {validateCopy} from './validateCopy.mjs';
import {governValidationResult} from './effectiveRuleGovernance.mjs';
import {HOROSCOPE_SIGNS} from '../../apps/web/src/content/horoscopeEditions.mjs';
import {horoscopeEventsInWindow,horoscopeEventPlanet,horoscopeHouse} from './horoscopeDevelopments.mjs';
import {horoscopePhasePattern,normalizeHoroscopePhase,horoscopeLunationPhase as lunationPhase} from './horoscopeLunationClaims.mjs';

export const horoscopeValidationVersion='horoscope-facts/v14';
const bodies='Sun|Moon|Mercury|Venus|Mars|Jupiter|Saturn|Uranus|Neptune|Pluto';
const signs=HOROSCOPE_SIGNS.join('|');
const ordinals=['first','second','third','fourth','fifth','sixth','seventh','eighth','ninth','tenth','eleventh','twelfth'];

export function validateHoroscopeReading(passage,brief,{ownerCorrections=[]}={}) {
  const planet=brief.window.period==='daily'?'moon':'sun';
  const anchor=brief.positions.find(p=>p.planet.toLowerCase()===planet);
  if(!anchor)throw new Error('Calculated horoscope anchor is missing.');
  const events=horoscopeEventsInWindow(brief);
  const lint=governValidationResult(validateCopy({headline:passage.headline,body:passage.body},{validationProfile:'horoscope',family:'horoscope',surface:'horoscopes',register:'second_person',requiredFields:['headline','body'],ownerCorrections}),{surface:'horoscopes',family:'horoscope'});
  const violations=[...lint.violations,...horoscopePunctuationFindings(passage),...horoscopeVocabularyFindings(passage,brief.window.period)], text=resolveHoroscopeClaimSubjects(`${passage.headline}\n${passage.body}`);
  const fail=detail=>violations.push({category:'horoscope_fact_boundary',detail,governanceTier:'blocking'});
  if(!/\b(?:you|your)\b/iu.test(passage.body))violations.push({category:'register_consistency',detail:'Address the reader in the second person.',governanceTier:'blocking'});
  if(/\b(?:born with|your natal|since childhood|you always|you have always)\b/iu.test(text))fail('A temporary forecast cannot establish natal biography.');
  horoscopeAspectFindings(text,brief).forEach(fail);
  for(const body of horoscopePersonalSignClaims(text)) {
    if(!brief.positions.some(p=>p.planet.toLowerCase()===body.toLowerCase()&&p.sign.toLowerCase()===passage.sign)
      &&!events.some(e=>e.type==='ingress'&&horoscopeEventPlanet(e)===body.toLowerCase()&&e.sign?.toLowerCase()===passage.sign))fail(`The ${body} placement in your sign must match the calculated brief for ${passage.sign}.`);
  }
  if(/\b\d{1,2}:\d{2}\b|\b\d{4}-\d{2}-\d{2}\b/iu.test(text))fail('Keep exact clock times and ISO dates in the calculated timing display.');
  if(['seasonal','monthly'].includes(brief.window.period))seasonalDateFindings(text,brief).forEach(fail);
  else if(/\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d/iu.test(text))fail('Keep exact dates in the calculated timing display.');
  // A named quarter is an event-time Moon, just like a Full or New Moon.
  // Validate leading-sign phrasing as well as "Moon in Sign" even without a house.
  for(const match of text.matchAll(new RegExp(`\\b(${signs})\\s+(${horoscopePhasePattern})\\s+Moon\\b`,'giu'))) {
    if(!events.some(e=>e.type==='lunation'&&lunationPhase(e)===normalizeHoroscopePhase(match[2])&&e.sign?.toLowerCase()===match[1].toLowerCase()))fail(`The ${match[0]} placement must match the calculated brief.`);
  }
  for(const match of text.matchAll(new RegExp(`\\b(?:(${horoscopePhasePattern})\\s+)?(${bodies})\\s+(?:(?:is|moves|moving|travels|traveling)\\s+)?(?:in|through)\\s+(${signs})\\b`,'giu'))) {
    const [,phase,body,sign]=match;
    const supported=phase
      ? body.toLowerCase()==='moon'&&events.some(e=>e.type==='lunation'&&lunationPhase(e)===normalizeHoroscopePhase(phase)&&e.sign?.toLowerCase()===sign.toLowerCase())
      : brief.positions.some(p=>p.planet.toLowerCase()===body.toLowerCase()&&p.sign.toLowerCase()===sign.toLowerCase())
        ||events.some(e=>e.type==='ingress'&&horoscopeEventPlanet(e)===body.toLowerCase()&&e.sign?.toLowerCase()===sign.toLowerCase());
    if(!supported)fail(`The ${phase?phase+' ':''}${body} placement must match the calculated brief.`);
  }
  for(const paragraph of text.split(/\n\s*\n/u)) {
   const checkedHouses=new Set();
   for(const sentence of paragraph.split(/(?<=[.!?])\s+|\n/u)) {
    const subjects=[...sentence.matchAll(new RegExp(`\\b(?:(?:${signs})\\s+)?(?:(${horoscopePhasePattern})\\s+)?(${bodies})\\b`,'giu'))];
    for(let i=0;i<subjects.length;i++){
      const subject=subjects[i],clause=sentence.slice(subject.index,subjects[i+1]?.index??sentence.length);
      for(const claim of horoscopePlacementClaims(clause,passage.sign)){
        const hasIngress=events.some(e=>e.type==='ingress'&&horoscopeEventPlanet(e)===subject[2].toLowerCase()&&e.sign?.toLowerCase()===claim.sign);
        if(claim.ingress&&!hasIngress)fail(`The ${subject[2]} ingress must be present in the calculated events.`);
        else if(claim.personal&&!hasIngress&&!brief.positions.some(p=>p.planet.toLowerCase()===subject[2].toLowerCase()&&p.sign.toLowerCase()===claim.sign))fail(`The ${subject[2]} placement in your sign must match the calculated brief for ${passage.sign}.`);
      }
    }
    const pairedHouses=horoscopeAspectHouseSubjects(sentence);
    for(const match of sentence.matchAll(/\b(\d{1,2}(?:st|nd|rd|th)|first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|eleventh|twelfth)\s+(?:whole[ -]sign\s+)?house\b/giu)) {
      if(passage.sign==='overview'){fail('A shared overview cannot assign a personal house to every reader.');continue;}
      const n=parseInt(match[1])||ordinals.indexOf(match[1].toLowerCase())+1;
      const pairedSubject=pairedHouses.get(match.index);
      const subject=(pairedSubject!==undefined?subjects.find(s=>s.index===pairedSubject):subjects.filter(s=>s.index<match.index).at(-1))??subjects[0];
      // Repeating a house already verified in this paragraph adds no new placement.
      // An explicit planet/lunation always receives its own check below.
      if(!subject){if(!checkedHouses.has(n))fail('Name the planet or lunation with each numbered house so its calculation can be checked.');continue;}
      const body=subject[2].toLowerCase(),phase=normalizeHoroscopePhase(subject[1]);
      const nextSubject=subjects.find(s=>s.index>subject.index)?.index??sentence.length;
      const subjectClause=sentence.slice(subject.index,nextSubject);
      const houseIngress=horoscopeHouseIngressTargets(subjectClause).has(match.index-subject.index);
      const placementClaims=horoscopePlacementClaims(subjectClause,passage.sign);
      const placedBeforeHouse=placementClaims.filter(c=>c.end<=match.index-subject.index).at(-1);
      const placementClaim=placedBeforeHouse??placementClaims.find(c=>!c.ingress);
      const statedSign=houseIngress?undefined:subject[0].match(new RegExp(`^(${signs})\\b`,'iu'))?.[1]?.toLowerCase()??placementClaim?.sign;
      let placements=phase ? events.filter(e=>e.type==='lunation'&&lunationPhase(e)===phase)
        : brief.positions.filter(p=>p.planet.toLowerCase()===body);
      if(houseIngress)placements=events.filter(e=>e.type==='ingress'&&horoscopeEventPlanet(e)===body);
      else if(statedSign&&!phase){
        const ingresses=events.filter(e=>e.type==='ingress'&&horoscopeEventPlanet(e)===body);
        placements=placementClaim?.ingress?ingresses:[...placements,...ingresses];
      }
      if(statedSign)placements=placements.filter(p=>p.sign?.toLowerCase()===statedSign);
      if(!placements.some(p=>p.sign&&horoscopeHouse(p.sign,passage.sign)===n))fail(`The ${subject[0]} house must match its own calculated placement for ${passage.sign}.`);
      else checkedHouses.add(n);
    }
   }
  }
  return {...lint,version:horoscopeValidationVersion,passed:violations.length===0,violations,governance:{...lint.governance,blockingViolationCount:violations.length},rulesRun:[...lint.rulesRun,'horoscope-calculated-facts','horoscope-local-timing','horoscope-temporary-register']};
}
