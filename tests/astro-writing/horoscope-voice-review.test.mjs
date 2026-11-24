import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {HOROSCOPE_VOICE_REVIEW,HOROSCOPE_VOICE_CRITERIA} from '../../src/astro-writing/horoscopeVoiceStandard.mjs';
import {horoscopeVoiceReferences,horoscopeVoiceReferenceInventory,validateHoroscopeVoiceReview} from '../../src/astro-writing/horoscopeVoiceReview.mjs';
import {horoscopeReviewInput,horoscopeReviewInstructions,horoscopeReviewSchema,readHoroscopeReview,horoscopeReviewValidationCode} from '../../src/astro-writing/horoscopeRhetoricalReview.mjs';
import {evaluateHoroscopeVoiceBenchmark} from '../../src/astro-writing/horoscopeVoiceBenchmark.mjs';
import {syntheticHoroscopeVoiceReview} from '../helpers/horoscope-voice-review-fixture.mjs';

const hash=text=>createHash('sha256').update(text).digest('hex');
const candidate={headline:'Aries & Aries Rising',body:'A synthetic observation develops here.\n\nThe synthetic ending follows it.'};
const reference='Aries & Aries Rising\n\nA complete synthetic source observation.\n\nIts exact complete ending. 🌙  ';
const evidence={voiceReviewContract:HOROSCOPE_VOICE_REVIEW,engineFacts:{window:{period:'daily'},risingSign:'aries'},
  ownerExamples:[{id:'original',text:reference,role:'primary owner passage'}]};
const pass=()=>({checks:['CORRECTIO','TRICOLON','PURPLE_PROSE'].map(label=>({label,outcome:'pass',reason:'Synthetic fixture.'})),findings:[],voiceReview:syntheticHoroscopeVoiceReview({candidate,evidence})});
const payload=value=>({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(value)}]}]});

test('fresh Daily/Weekly requests extend the same review, old and longer formats keep their contract',()=>{
  for(const period of ['daily','weekly']){
    const e={...evidence,engineFacts:{...evidence.engineFacts,window:{period}}};
    assert(horoscopeReviewSchema(e).required.includes('voiceReview'));
    assert(horoscopeReviewInstructions(e).includes('FULL-READING VOICE REVIEW'));
    assert(!horoscopeReviewInstructions(e).includes('This is not a broad voice'));
  }
  for(const e of [{...evidence,voiceReviewContract:undefined}, {...evidence,engineFacts:{window:{period:'monthly'}}}]){
    assert(!horoscopeReviewSchema(e).required.includes('voiceReview'));
    assert(!horoscopeReviewInstructions(e).includes('FULL-READING VOICE REVIEW'));
  }
});
test('review includes full evidence once, an eligible inventory and exact paragraph context',()=>{
  const input=JSON.parse(horoscopeReviewInput(candidate,evidence));
  assert.equal(input.evidence.ownerExamples[0].text,reference);
  assert.deepEqual(input.voiceReferences[0].eligibleParagraphs,[1,2]);
  const result=readHoroscopeReview(payload(pass()),candidate,evidence);
  assert.equal(result.voiceDecision,'no_cited_issue');assert.equal(result.voiceReviewRequired,false);
  assert.equal(result.coverage.voiceMatch,'evaluated_advisory');assert.equal(result.coverage.voiceCalibration,'unverified');
  assert.equal(result.coverage.trainingUpdate,'none');assert.equal(result.ownerApproved,undefined);
  assert.equal(result.voiceReview.ending.candidateParagraphText,'The synthetic ending follows it.');
  assert.equal(result.voiceReview.ending.referenceParagraphText,'A complete synthetic source observation.');
});
test('cited voice findings and missing assessments require human review without a rhetoric failure',()=>{
  for(const outcome of ['revise','unassessed']){
    const value=pass();
    value.voiceReview.ending=outcome==='revise'?{...value.voiceReview.ending,outcome}
      :{outcome,candidateParagraph:null,candidateQuote:'',referenceId:null,referenceParagraph:null,referenceQuote:'',reason:'The comparison cannot be established.'};
    const result=readHoroscopeReview(payload(value),candidate,evidence);
    assert.equal(result.voiceDecision,outcome);assert.equal(result.voiceReviewRequired,true);assert.equal(result.rhetoricalBlocked,false);
    assert.equal(result.coverage.voiceMatch,outcome==='unassessed'?'partially_assessed':'evaluated_advisory');
  }
});
test('missing criteria, false citations, headings and non-ending paragraphs never validate',()=>{
  const mutations=[v=>delete v.ending,v=>v.author_voice.candidateQuote='Invented quote',v=>v.author_voice.referenceQuote='Invented source',
    v=>v.development.referenceId='not-selected',v=>v.author_voice.referenceParagraph=0,v=>v.ending.candidateParagraph=0,
    v=>v.ending.candidateParagraph=-1,v=>v.development.outcome='approved',v=>v.ending.reason=''];
  for(const mutate of mutations){const value=pass().voiceReview;mutate(value);assert.throws(()=>validateHoroscopeVoiceReview(value,candidate,evidence),/invalid_horoscope_voice_review/u);}
  assert.throws(()=>readHoroscopeReview(payload({...pass(),voiceReview:undefined}),candidate,evidence),/invalid_horoscope_voice_review/u);
  assert.equal(horoscopeReviewValidationCode(new Error('invalid_horoscope_voice_review')),'invalid_horoscope_voice_review');
});
test('pinned Daily and Weekly source units preserve complete original bytes and roles',()=>{
  const daily=`ACTIVE COMPLETE OWNER-DESIGNATED COMPARISONS\nComplete prose SHA-256: ${hash(reference)}\nBEGIN COMPLETE PROSE saved\n${reference}\nEND COMPLETE PROSE saved`;
  const weekly=`REFERENCE saved\nRole: Primary complete owner-supplied Weekly voice example; historical astrology only.\nSource: synthetic-owner-source\nComplete text SHA-256: ${hash(reference)}\nBEGIN COMPLETE REFERENCE saved\n${reference}\nEND COMPLETE REFERENCE saved`;
  for(const sourceGuidance of [daily,weekly]){
    const e={...evidence,writingProfile:{profile:{sourceGuidance}}};
    const refs=horoscopeVoiceReferences(e);assert.equal(refs.length,1);assert.equal(refs[0].text,reference);assert.equal(refs[0].id,'saved');
    assert.equal(horoscopeVoiceReferenceInventory(e)[0].eligibleParagraphs[0],1);
    assert.throws(()=>horoscopeVoiceReferences({...e,writingProfile:{profile:{sourceGuidance:sourceGuidance.replace(hash(reference),'0'.repeat(64))}}}));
  }
});
test('negative evidence and self-comparison cannot become voice references',()=>{
  const e={...evidence,ownerExamples:[{id:'rejected',text:reference,role:'rejected reading'}]};
  assert.equal(horoscopeVoiceReferences(e).length,0);
  const self={...evidence,ownerExamples:[{id:'original',text:candidate.body}]};
  assert.throws(()=>validateHoroscopeVoiceReview(syntheticHoroscopeVoiceReview({candidate,evidence:self}),candidate,self),/invalid_horoscope_voice_review/u);
});
test('the named Weekly V2 primary remains eligible with exact prose and its original role',()=>{
  const sourceGuidance=`OWNER-DESIGNATED WEEKLY ARIES VOICE EXAMPLE\nAPPROVED EXAMPLE — VERBATIM\n${reference}\nEND OF ARIES EXAMPLE`;
  const e={...evidence,engineFacts:{window:{period:'weekly'},risingSign:'aries'},writingProfile:{profile:{sourceGuidance}}};
  const refs=horoscopeVoiceReferences(e);
  assert.equal(refs.length,1);assert.equal(refs[0].text,reference+'\n');
  assert.equal(refs[0].role,'current owner-designated complete example');
  assert(!refs[0].text.includes('APPROVED EXAMPLE'));
});
test('Markdown, dated and multiline sign headings cannot supply voice evidence',()=>{
  for(const title of ['#### Capricorn / Capricorn Rising','Aries\nAries & Aries Rising','2026-11-23 · Aries & Aries Rising','### Original source heading']){
    const text=title+'\n\nThe complete source observation develops here.';
    const e={...evidence,ownerExamples:[{id:'original',text,role:'primary owner passage'}]};
    assert.deepEqual(horoscopeVoiceReferenceInventory(e)[0].eligibleParagraphs,[1]);
    const report=syntheticHoroscopeVoiceReview({candidate,evidence:e});
    assert.equal(report.author_voice.referenceParagraph,1);
  }
  const text='#### Capricorn / Capricorn Rising\nThe complete source observation develops here.';
  const e={...evidence,ownerExamples:[{id:'original',text,role:'primary owner passage'}]};
  const report=syntheticHoroscopeVoiceReview({candidate,evidence:e});
  report.author_voice.referenceQuote='#### Capricorn / Capricorn Rising';
  assert.throws(()=>validateHoroscopeVoiceReview(report,candidate,e),/invalid_horoscope_voice_review/u);
});

const benchmark=()=>({cases:['rejected','reference','unlabelled'].map(id=>({id,candidate:{body:`Complete synthetic ${id} reading.`}})),
  labels:['rejected','reference','unlabelled'].map((id,i)=>({id,textSha256:hash(`Complete synthetic ${id} reading.`),
    label:{ownerDisposition:['rejected_in_the_recorded_scope','designated_voice_reference','unlabelled'][i]},provenance:{unit:i===0?'feedback_fragment':'complete'}}))});
const records=(bank,outcome)=>bank.cases.map(c=>({id:c.id,candidateSha256:hash(c.candidate.body),contract:HOROSCOPE_VOICE_REVIEW,
  synthetic:true,evidence,voiceReview:syntheticHoroscopeVoiceReview({candidate:c.candidate,evidence},outcome)}));
test('offline tuning cannot use missing checks, all-pass bias or all-revise bias as success',()=>{
  const bank=benchmark(),missing=evaluateHoroscopeVoiceBenchmark(bank);
  assert.equal(missing.status,'incomplete');assert.equal(missing.missing,3);assert.equal(missing.tuningEligible,false);
  const allPass=evaluateHoroscopeVoiceBenchmark({...bank,reviews:records(bank,'pass')});
  assert.equal(allPass.falseAcceptances,1);assert.equal(allPass.status,'disagreement');assert.equal(allPass.tuningEligible,false);
  const allRevise=evaluateHoroscopeVoiceBenchmark({...bank,reviews:records(bank,'revise')});
  assert.equal(allRevise.referenceFlags,1);assert.equal(allRevise.tuningEligible,false);
  assert.equal(allRevise.measuredVoiceAccuracy,null);assert.equal(allRevise.newModelCalls,0);
});
test('offline tuning preserves owner labels, rejects identity drift, and cannot activate synthetic success',()=>{
  const bank=benchmark(),before=JSON.stringify(bank),reviews=records(bank,'pass');
  reviews[0].voiceReview=syntheticHoroscopeVoiceReview({candidate:bank.cases[0].candidate,evidence},'revise');
  const result=evaluateHoroscopeVoiceBenchmark({...bank,reviews});
  assert.equal(result.status,'consistent_on_labelled_cases');assert.equal(result.tuningEligible,false);assert.equal(result.automaticActivation,false);
  assert.equal(result.unlabelled,1);assert.equal(JSON.stringify(bank),before);
  reviews[0].candidateSha256='not-this-candidate';assert.equal(evaluateHoroscopeVoiceBenchmark({...bank,reviews}).invalid,1);
  bank.labels[0].textSha256='drift';assert.throws(()=>evaluateHoroscopeVoiceBenchmark(bank),/identity_mismatch/u);
});
test('shared rubric is qualitative and includes all five benchmark concerns',()=>{
  assert.deepEqual(Object.keys(HOROSCOPE_VOICE_CRITERIA),['interpretation_specificity','development','author_voice','unsupported_story','ending']);
});
test('the offline benchmark CLI rejects missing evidence without provider access or label mutation',()=>{
  const dir=mkdtempSync(join(tmpdir(),'horoscope-voice-benchmark-'));
  try{
    const bank=benchmark(),cases=join(dir,'cases.json'),labels=join(dir,'labels.json'),out=join(dir,'result.json');
    const original=JSON.stringify({labels:bank.labels});
    writeFileSync(cases,JSON.stringify({cases:bank.cases}));writeFileSync(labels,original);
    const result=spawnSync(process.execPath,['scripts/check-horoscope-voice-benchmark.mjs','--cases',cases,'--labels',labels,'--out',out],{encoding:'utf8',env:{PATH:process.env.PATH}});
    assert.equal(result.status,2,result.stderr);
    const report=JSON.parse(readFileSync(out,'utf8'));
    assert.equal(report.missing,3);assert.equal(report.tuningEligible,false);assert.equal(report.newModelCalls,0);
    assert.equal(readFileSync(labels,'utf8'),original);
  }finally{rmSync(dir,{recursive:true,force:true});}
});
