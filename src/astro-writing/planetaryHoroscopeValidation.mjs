import {validateHoroscopeReading} from './horoscopeValidation.mjs';

export function validatePlanetaryReading(passage,event) {
  const brief={window:{period:'planetary',startsAt:event.startsAt,endsAt:event.endsAt,timeZone:event.timeZone},
    positions:[{planet:event.planet,sign:event.sign}],events:[{id:'calculated-sign-entry',type:'ingress',planet:event.planet,sign:event.sign,startsAt:event.startsAt}]};
  const result=validateHoroscopeReading(passage,brief,{anchorPlanet:event.planet});
  const violations=[...result.violations];
  if(/\b(?:stations? (?:direct|retrograde)|turns? (?:direct|retrograde)|is retrograde|retrograde (?:Mercury|Venus|Mars|Jupiter|Saturn|Uranus|Neptune|Pluto))\b/iu.test(passage.headline+'\n'+passage.body))violations.push({category:'planetary_fact_boundary',detail:'This sign-visit packet supplies no motion interval or station. Remove the unsupported motion claim.',governanceTier:'blocking'});
  return {...result,version:'planetary-horoscope-validation/v1',passed:violations.length===0,violations};
}
