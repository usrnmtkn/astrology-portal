import assert from 'node:assert/strict';
import {horoscopeAspectFindings} from '../src/astro-writing/horoscopeAspectClaims.mjs';

const brief={window:{startsAt:'2026-11-09T05:00:00Z',endsAt:'2026-11-16T05:00:00Z'},events:[{
 id:'synthetic-aspect',type:'aspect',aspect:'sextile',planets:['Venus','Mars'],
 startsAt:'2026-11-10T06:47:38Z',fromSign:'Libra',toSign:'Leo',fromMotion:'retrograde',toMotion:'direct'}]};
const sentence='Venus is still retrograde in Libra and your relationship sector when it forms a sextile with Mars, your ruling planet, on Tuesday.';
assert.deepEqual(horoscopeAspectFindings(sentence,brief),[]);
assert(horoscopeAspectFindings(sentence.replace('retrograde','direct'),brief).length,'Motion stays attached to Venus.');
assert(horoscopeAspectFindings(sentence.replace('in Libra','in Scorpio'),brief).length,'The stated sign must match the event.');
assert(horoscopeAspectFindings(sentence.replace('with Mars','with Saturn'),brief).length,'The actual pair is still required.');
assert(horoscopeAspectFindings(sentence.replace('a sextile','a trine'),brief).length,'The aspect must match.');
assert(horoscopeAspectFindings(sentence.replace('with Mars, your ruling planet','with your ruling planet'),brief).length,'An unnamed second planet remains blocked.');
assert(horoscopeAspectFindings(sentence.replace('relationship sector','relationship with Jupiter sector'),brief).length,'Another named planet cannot be absorbed into the gloss.');
assert(horoscopeAspectFindings('Venus is still retrograde in Libra. It forms a sextile with Mars.',brief).length,'The new grammar does not infer a subject across sentences.');
assert.deepEqual(horoscopeAspectFindings('Venus sextiles Mars.',brief),[],'Existing concise grammar remains valid.');
console.log('Described aspect grammar: valid same-subject clause accepted; wrong motion/sign/pair/aspect and ambiguous subjects remain blocked.');
