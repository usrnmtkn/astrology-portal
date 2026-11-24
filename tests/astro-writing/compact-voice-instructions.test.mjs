import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {compactVoiceParts,compactVoiceArchiveMaterial,withCompactVoiceInstructions,withoutLegacyVoiceMarker,COMPACT_VOICE_COMPOSITION_CHECK} from '../../src/astro-writing/compactVoiceInstructions.mjs';
import {COMPACT_REFERENCE_LEARNING,PUBLIC_HOROSCOPE_EVIDENCE_BOUNDARY} from '../../src/astro-writing/compactReferenceLearning.mjs';
import {WEEKLY_FROM_SAMPLES_AUTHORITY} from '../../src/astro-writing/weeklyFromSamples.mjs';
import {DAILY_HOROSCOPE_INSTRUCTIONS,DAILY_RHETORICAL_WRITING_GUIDANCE} from '../../src/astro-writing/dailyHoroscopeDraft.mjs';
import {horoscopeProseInstructions} from '../../src/astro-writing/horoscopeProseInstructions.mjs';

test('the public-audience scope reaches both compact writers without changing longer formats',()=>{
  for(const text of [DAILY_HOROSCOPE_INSTRUCTIONS,horoscopeProseInstructions('weekly')]){
    assert.equal(text.split(COMPACT_REFERENCE_LEARNING).length-1,1);
    assert(text.includes('House topics identify life areas; combining them does not establish a personal incident'));
    assert(!text.includes('A possible reason for a reaction can be developed'));
  }
  for(const period of ['monthly','seasonal'])assert(!horoscopeProseInstructions(period).includes(COMPACT_REFERENCE_LEARNING));
});

test('Weekly V3 receives the same public-forecast evidence boundary as Daily',()=>{
  for(const text of [DAILY_HOROSCOPE_INSTRUCTIONS,WEEKLY_FROM_SAMPLES_AUTHORITY])assert.equal(text.split(PUBLIC_HOROSCOPE_EVIDENCE_BOUNDARY).length-1,1);
  assert(PUBLIC_HOROSCOPE_EVIDENCE_BOUNDARY.includes('conditional wording supplies no evidence of conduct or motives'));
  assert.equal(WEEKLY_FROM_SAMPLES_AUTHORITY.split(COMPACT_VOICE_COMPOSITION_CHECK).length-1,1,'The full-reading standard also reaches the samples-based Weekly writer once.');
  for(const period of ['monthly','seasonal'])assert(!horoscopeProseInstructions(period).includes(PUBLIC_HOROSCOPE_EVIDENCE_BOUNDARY));
});

test('Daily receives prose directions without assigning reviewer-schema work',()=>{
  assert(DAILY_HOROSCOPE_INSTRUCTIONS.includes(DAILY_RHETORICAL_WRITING_GUIDANCE));
  assert(DAILY_RHETORICAL_WRITING_GUIDANCE.includes("same literal scene"));
  assert(DAILY_RHETORICAL_WRITING_GUIDANCE.includes('aphorisms and maxims sparingly'));
  assert(!DAILY_HOROSCOPE_INSTRUCTIONS.includes('When the return schema permits it'));
  assert(!DAILY_HOROSCOPE_INSTRUCTIONS.includes('record a contextual APHORISM finding'));
  assert(!DAILY_HOROSCOPE_INSTRUCTIONS.includes('lower a score'));
});

for(const period of ['daily','weekly'])test(`${period}: normal Voice delivery preserves exact editorial and archived source bytes`,()=>{
  const editorial='Complete editorial guidance.\r\n\r\n  \r\n';
  const archive='RETAINED SAVED-GUIDE SOURCE EXAMPLES\r\nComplete original source.\r\n\r\nIts complete ending. 🌙  ';
  const profile={period,voiceGuidance:editorial+archive,prompt:'No private-test marker.'};
  assert.deepEqual(compactVoiceParts(profile),{editorial,archive});
  const instructions=withCompactVoiceInstructions('Existing factual contract.',profile);
  assert(instructions.includes('SAVED VOICE\n'+editorial));
  assert(!instructions.includes(archive));
  assert.equal(instructions.split(COMPACT_VOICE_COMPOSITION_CHECK).length-1,1);
  assert(!instructions.includes('distinguish what someone says from evidence of how they will behave later'),'A prior relationship-specific repair cannot become every reading’s closing assignment');
  const data=compactVoiceArchiveMaterial(profile);
  assert(data.endsWith(archive));assert(data.includes(createHash('sha256').update(archive).digest('hex')));
  assert.equal(profile.voiceGuidance,editorial+archive);
  assert.equal(compactVoiceArchiveMaterial({...profile,voiceGuidance:editorial}),'');
  assert.deepEqual(compactVoiceParts({...profile,voiceGuidance:'Quoted RETAINED SAVED-GUIDE SOURCE EXAMPLES inside prose.'}),{editorial:'Quoted RETAINED SAVED-GUIDE SOURCE EXAMPLES inside prose.',archive:''});
});

test('only a complete legacy Prompt control line is removed; source-looking text stays exact',()=>{
  assert.equal(withoutLegacyVoiceMarker('WEEKLY PROMPT V2\r\nCOMPACT VOICE INSTRUCTIONS V1\r\nWrite.'),'WEEKLY PROMPT V2\r\nWrite.');
  for(const text of ['COMPACT VOICE INSTRUCTIONS V10\nWrite.','Historical COMPACT VOICE INSTRUCTIONS V1\nWrite.'])assert.equal(withoutLegacyVoiceMarker(text),text);
  assert.equal(withoutLegacyVoiceMarker('COMPACT VOICE INSTRUCTIONS V1'),'');
  for(const period of ['monthly','seasonal'])assert.equal(withCompactVoiceInstructions('Original instructions.',{period,voiceGuidance:'Exact existing field.'}),'Original instructions.');
});
