import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {HOROSCOPE_SIGNS} from '../../apps/web/src/content/horoscopeEditions.mjs';
import {defaultHoroscopeProfile} from '../../src/astro-writing/horoscopeWritingProfiles.mjs';
import {DAILY_BATCH_EDITORIAL,DAILY_BATCH_REVIEW_CHECKS,DAILY_BATCH_INPUT_LIMIT,
  dailyEditorialInput,dailyEditorialContent,dailyEditorialComplete,dailyReviewCurrent,
  dailyEditorialIssue,validateDailyEditorialResult,dailyLexicalSignals} from '../../src/astro-writing/dailyBatchEditorial.mjs';

const hash=text=>createHash('sha256').update(text).digest('hex');
const profile=defaultHoroscopeProfile('daily'),writingProfile={id:null,profile};
const example={id:'synthetic-complete-source',text:'Complete synthetic owner source opening. Literal {{sourceData}} remains data. Complete source ending.'};
const context={sameFamilyExamples:[example],primaryRegisterPassages:[example],corrections:[{id:'synthetic-correction',reason:'Complete synthetic correction.'}]};
const window={period:'daily',startsAt:'2026-10-28T04:00:00.000Z',endsAt:'2026-10-29T04:00:00.000Z',timeZone:'America/New_York'};
const readings=HOROSCOPE_SIGNS.map(sign=>({sign,headline:'Synthetic '+sign,body:'Shared opening sentence. A distinct '+sign+' observation. Shared complete ending.'}));
const row={sections:{horoscopeEdition:{window,passages:readings}},facts:{horoscopeBrief:{signature:'synthetic-signed-facts'}},
  source_snapshot:{studioWritingProfile:writingProfile,horoscopeOutlines:{},horoscopeGeneration:{dailyEditorial:{version:DAILY_BATCH_EDITORIAL}}}};
const prepared={edition:row.sections.horoscopeEdition,writingProfile,sourceHash:'synthetic-source-hash',
  entries:HOROSCOPE_SIGNS.map(sign=>({sign,ownerContext:context,developments:{events:[],background:[{id:'synthetic-background-'+sign}]}}))};
const assessment=p=>({sign:p.sign,interpretation:'The actual synthetic concern for '+p.sign,
  openingQuote:'Shared opening sentence.',endingQuote:'Shared complete ending.'});
const result=()=>({assessments:readings.map(assessment),checks:Object.fromEntries(DAILY_BATCH_REVIEW_CHECKS.map(k=>[k,'pass'])),findings:[]});
const original=structuredClone({prepared,row});
const input=dailyEditorialInput(prepared,row);
assert.deepEqual({prepared,row},original,'Input preparation is read-only');
assert.deepEqual(input.profile,profile,'Full profile, including all saved examples, remains exact');
assert.equal(input.readings.length,12);assert.equal(input.facts.length,12);
assert.deepEqual(input.facts.map(f=>f.sign),HOROSCOPE_SIGNS);
assert(input.facts.every(f=>f.developments.events.length===0),'A quiet day needs no invented dated events');
assert.equal(input.ownerExamples.length,1,'Repeated full source text is transported once');
assert.equal(input.ownerExamples[0].text,example.text);
assert.equal(input.ownerExamples[0].sha256,hash(example.text));
assert.equal(input.ownerExamples[0].references.length,12,'Every sign/source role remains auditable');
assert.equal(input.selectedCorrections.length,1);
assert.equal(validateDailyEditorialResult(result(),input).status,'passed');
assert.equal(dailyEditorialComplete(row),true);
assert.equal(dailyReviewCurrent(row),false);
assert.match(dailyEditorialIssue(row),/Review all twelve/);
const lexical=dailyLexicalSignals(readings);
assert.equal(lexical.openings[0].signs.length,12);
assert.equal(lexical.endings[0].signs.length,12);
assert.equal(validateDailyEditorialResult(result(),input).status,'passed','Lexical matches are not a semantic failure');

const failed=result();
failed.checks={interpretations:'fail',openings:'fail',endings:'fail'};
failed.findings=DAILY_BATCH_REVIEW_CHECKS.map(category=>({category,reason:'The same synthetic thought repeats rather than supplying a distinct observation.',
  evidence:readings.slice(0,2).map(p=>({sign:p.sign,quote:category==='openings'?'Shared opening sentence.':category==='endings'?'Shared complete ending.':p.body}))}));
assert.equal(validateDailyEditorialResult(failed,input).status,'failed');
const whitespaceInput=structuredClone(input),whitespaceResult=structuredClone(failed);
whitespaceInput.readings.forEach(p=>p.body='\n'+p.body+'\n');
whitespaceResult.assessments.forEach(a=>{a.openingQuote='\n'+a.openingQuote;a.endingQuote+='\n';});
whitespaceResult.findings.forEach(f=>f.evidence.forEach(e=>{if(f.category==='openings')e.quote='\n'+e.quote;if(f.category==='endings')e.quote+='\n';}));
assert.equal(validateDailyEditorialResult(whitespaceResult,whitespaceInput).status,'failed','Exact evidence may include the saved boundary whitespace');
assert.equal(validateDailyEditorialResult(failed,whitespaceInput).status,'failed','Exact prose without boundary whitespace is also accepted');
let negatives=0;
function rejects(change,pattern){
  const value=structuredClone(failed);change(value);
  assert.throws(()=>validateDailyEditorialResult(value,input),pattern);negatives++;
}
rejects(v=>delete v.checks.openings,/required checks/);
rejects(v=>v.assessments.pop(),/twelve signs/);
rejects(v=>v.assessments[1].sign='aries',/twelve signs/);
rejects(v=>v.assessments[0].openingQuote='Invented opening.',/opening quote for aries/);
rejects(v=>v.assessments[0].endingQuote='A distinct aries observation.',/ending quote for aries/);
rejects(v=>v.assessments[0].interpretation='',/assessment for aries/);
rejects(v=>v.findings[0].evidence[0].quote='Not in the supplied writing.',/not supplied/);
rejects(v=>v.findings[0].evidence[1]={...v.findings[0].evidence[0]},/distinct signs/);
rejects(v=>v.findings[1].evidence[0].quote='A distinct aries observation.',/actual opening/);
rejects(v=>v.findings[2].evidence[0].quote='Shared opening sentence.',/actual ending/);
rejects(v=>v.findings.pop(),/missing its supporting/);
rejects(v=>v.checks.interpretations='pass',/failed check/);
rejects(v=>v.findings[0].evidence[0].quote='"'+v.findings[0].evidence[0].quote+'"',/not supplied/);

const passed=structuredClone(row);
passed.source_snapshot.horoscopeGeneration.dailyEditorial.review={...result(),status:'passed',contentHash:dailyEditorialContent(passed)};
assert.equal(dailyReviewCurrent(passed),true);assert.equal(dailyEditorialIssue(passed),null);
for(const mutate of [
  r=>r.sections.horoscopeEdition.passages[0].body+=' A newer owner edit.',
  r=>r.sections.horoscopeEdition.passages[0].headline+=' Changed',
  r=>r.source_snapshot.studioWritingProfile.profile.voiceGuidance+=' A new rule.',
  r=>r.source_snapshot.horoscopeOutlines.aries='A changed outline.',
  r=>r.source_snapshot.horoscopeWriterChoice='gemini',
  r=>r.facts.horoscopeBrief.signature='changed'
]){
  const changed=structuredClone(passed);mutate(changed);
  assert.equal(dailyReviewCurrent(changed),false,'A changed review binding cannot remain current');
}
const paused=structuredClone(row);paused.source_snapshot.horoscopeGeneration.dailyEditorial.pending={id:'synthetic'};
assert.match(dailyEditorialIssue(paused),/Finish the saved/);
const legacy=structuredClone(row);delete legacy.source_snapshot.horoscopeGeneration.dailyEditorial;
assert.equal(dailyEditorialIssue(legacy),null,'An old edition is not silently enrolled');
for(const period of ['weekly','monthly','seasonal']){
  const other=structuredClone(row);other.sections.horoscopeEdition.window.period=period;
  assert.equal(dailyEditorialIssue(other),null);assert.equal(dailyEditorialComplete(other),false);
}
const incomplete=structuredClone(row);incomplete.sections.horoscopeEdition.passages[0].body='';
assert.throws(()=>dailyEditorialInput(prepared,incomplete),/all twelve complete/);
const missing=structuredClone(prepared);missing.entries[0].ownerContext.sameFamilyExamples=[];
assert.throws(()=>dailyEditorialInput(missing,row),/complete selected owner/);
const huge=structuredClone(prepared);const text='x'.repeat(DAILY_BATCH_INPUT_LIMIT+1);
huge.entries[0].ownerContext.sameFamilyExamples=[{id:'synthetic-oversize-complete-example',text}];
assert.throws(()=>dailyEditorialInput(huge,row),e=>e.code==='DAILY_BATCH_REVIEW_TOO_LARGE');
assert.equal(profile.voiceGuidance,original.prepared.writingProfile.profile.voiceGuidance);
console.log('PASS Daily full-set review contract: complete12 readings/facts/profile/examples,13 invalid evidence cases, contextual lexical leads, edit invalidation, legacy/period isolation and fail-before-spend bounds. No model calls.');
