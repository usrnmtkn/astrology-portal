import test from 'node:test';
import assert from 'node:assert/strict';
import {dailyHoroscopeFindings} from '../../src/astro-writing/dailyHoroscopeValidation.mjs';

const findings=body=>dailyHoroscopeFindings({headline:'Aries & Aries Rising',body});
const has=(body,category)=>findings(body).some(f=>f.category===category);

test('Daily explicit exclusions apply to both reader fields, including encoded text',()=>{
  for(const word of ['whether','PLEASURE','bond','preference','preferences','out loud','labor','whe&#116;her','whe\u200bther']){
    assert(has(`You can read ${word} here.`,'daily_required_vocabulary'),word);
    assert(dailyHoroscopeFindings({headline:word,body:'You can read this.'}).some(f=>f.field==='headline'));
  }
  assert(has('You can read this -- then continue.','daily_required_punctuation'));
  for(const body of ['You prefer the window seat.','Your neighborhood bookshop is open.','You enjoy laboratory work.'])assert.deepEqual(findings(body),[]);
});

test('Ordinary Moon placement stays private; special calculated phases remain available',()=>{
  for(const body of ['The Moon in Gemini accompanies your day.','The Moon enters Cancer tonight for you.','You experience the Gemini Moon.','The Full Moon in Aries arrives while the Moon enters Cancer for you.'])assert(has(body,'daily_private_moon'),body);
  for(const body of ['The Full Moon in Aries concerns your plans.','The New Moon in Libra concerns your plans.','The First Quarter Moon in Cancer concerns your plans.','The Last Quarter Moon in Gemini concerns your plans.','The Aries Full Moon concerns your plans.','Your lunar eclipse reading continues.','Your plans may change tonight.'])assert(!has(body,'daily_private_moon'),body);
  for(const body of ['Venus moves through your 7th house.','You notice your fourth house.','You consider the 12th whole-sign house.'])assert(has(body,'daily_private_house'),body);
  assert.deepEqual(findings('You can leave your keys at the first house on the street.'),[],'Literal houses are not numbered astrological houses');
});

test('Substantial source copying is separate from short shared language and source integrity',()=>{
  const source={id:'synthetic-source',text:'You take the last train across town because the small independent bookshop stays open late on Thursdays for its regular evening reading group.'};
  const before=structuredClone(source);
  const check=body=>dailyHoroscopeFindings({headline:'Aries & Aries Rising',body},{sourcePassages:[source]});
  assert(check('You take the last train across town because the small independent bookshop stays open late on Thursdays for its reading.').some(f=>f.category==='daily_source_transplant'&&f.sourceId===source.id));
  assert(check('YOU TAKE THE LAST TRAIN, across town because the small independent bookshop stays open late on Thursdays for its reading.').some(f=>f.category==='daily_source_transplant'));
  assert.deepEqual(check('You take the last train across town. Your friend has left a book for you.'),[]);
  assert.deepEqual(source,before);
});
