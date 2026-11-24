import test from 'node:test';
import assert from 'node:assert/strict';
import {RHETORICAL_LABELS} from '../../src/astro-writing/rhetoricalPatterns.mjs';
import {readHoroscopeReview,HOROSCOPE_WRITER_EVALUATION_COVERAGE} from '../../src/astro-writing/horoscopeRhetoricalReview.mjs';
import {WEEKLY_OWNER_DIRECTION,WEEKLY_DIRECTION_CHECKS} from '../../src/astro-writing/weeklyConcernDirection.mjs';
const candidate={headline:'Aries & Aries Rising',body:'You can consider a choice.\n\nUncertainty can outrun your strategy.'};
const pass=()=>({checks:RHETORICAL_LABELS.map(label=>({label,outcome:'pass',reason:'Synthetic contract test, not a semantic judgment.'})),findings:[]});
const payload=value=>({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(value)}]}]});

test('writer validation makes no claim that rhetoric, voice or training was evaluated',()=>{
 assert.equal(HOROSCOPE_WRITER_EVALUATION_COVERAGE.factualValidation,'evaluated');
 assert.equal(HOROSCOPE_WRITER_EVALUATION_COVERAGE.rhetoricalPatterns,'not_run');
 assert.equal(HOROSCOPE_WRITER_EVALUATION_COVERAGE.voiceMatch,'not_evaluated');
 assert.equal(HOROSCOPE_WRITER_EVALUATION_COVERAGE.trainingUpdate,'none');
});
test('a synthetically passing rhetorical receipt cannot become a voice success',()=>{
 const result=readHoroscopeReview(payload(pass()),candidate);
 assert.equal(result.rhetoricalBlocked,false);
 assert.equal(result.coverage.rhetoricalPatterns,'evaluated');
 assert.equal(result.coverage.voiceMatch,'not_evaluated');
 assert.equal(result.coverage.savedWeeklyDirection,'not_requested');
 assert.equal(result.coverage.trainingUpdate,'none');
 assert.equal(result.ownerApproved,undefined);
});
test('coverage metadata preserves existing cited rhetorical blockers',()=>{
 const report=pass();report.checks=report.checks.map(check=>({...check,outcome:check.label==='PURPLE_PROSE'?'fail':'pass'}));
 report.findings=[{label:'PURPLE_PROSE',field:'body',quote:'Uncertainty can outrun your strategy.',paragraph:'Uncertainty can outrun your strategy.',
  reason:'Synthetic fixture: the race image substitutes for explanation.',readerConsequence:'The reader cannot identify what the uncertainty changes.',meaningTest:'Plain wording loses no stated fact or consequence.'}];
 const result=readHoroscopeReview(payload(report),candidate);
 assert.equal(result.rhetoricalBlocked,true);assert.equal(result.coverage.voiceMatch,'not_evaluated');
});
test('checking a saved Weekly direction does not establish an author-voice match',()=>{
 const evidence={engineFacts:{window:{period:'weekly'},risingSign:'aries'},weeklyOwnerDirection:{version:WEEKLY_OWNER_DIRECTION,sign:'aries',coreConcern:'Synthetic concern.',stakes:'Synthetic stakes.',distinctiveObservation:'Synthetic observation.'}};
 const direction=Object.fromEntries(WEEKLY_DIRECTION_CHECKS.map(key=>[key,{outcome:'pass',quote:'Uncertainty can outrun your strategy.',paragraph:'Uncertainty can outrun your strategy.',reason:'Synthetic direction-contract assertion, not a real style review.'}]));
 const result=readHoroscopeReview(payload({...pass(),weeklyDirection:direction}),candidate,evidence);
 assert.equal(result.directionBlocked,false);assert.equal(result.coverage.savedWeeklyDirection,'evaluated');assert.equal(result.coverage.voiceMatch,'not_evaluated');
});
