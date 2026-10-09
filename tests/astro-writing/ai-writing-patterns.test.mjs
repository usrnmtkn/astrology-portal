import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import * as canonical from '../../src/astro-writing/canonicalInstructions.mjs';
import {RHETORICAL_LABELS,RHETORICAL_WRITER_POLICY,RHETORICAL_JUDGE_POLICY,rhetoricalSignals,rhetoricalDecision,validateRhetoricalReview} from '../../src/astro-writing/rhetoricalPatterns.mjs';
import {runRhetoricalCalibration} from '../../src/astro-writing/rhetoricalCalibration.mjs';
import {aiWritingPatternCases} from './fixtures/ai-writing-patterns.mjs';
import {HOROSCOPE_RHETORICAL_REVIEW,LEGACY_HOROSCOPE_RHETORICAL_REVIEW,horoscopeReviewPolicy,supportedHoroscopeReview} from '../../src/astro-writing/horoscopeRhetoricalReview.mjs';
const require=createRequire(import.meta.url);
const responses=require('../../src/astro-writing/openAIResponses.cjs');
const compiled=require('../../src/astro-writing/canonicalInstructions.cjs');
const pass=()=>({checks:RHETORICAL_LABELS.map(label=>({label,outcome:'pass',reason:'Injected context control, not a model judgment.'})),findings:[]});
// Actual provider-bound requests: shared module, generated CJS and special lunar/
// horoscope prefixes must all carry the new policy. No network or credentials.
for(const [surface,family] of [['sky-placement-page','sky-placement'],['calendar','calendar'],['horoscopes','horoscope'],['lunation-article','lunation-article'],['calendar-lunation','lunations'],['natal','natal'],['personal-transits','personal-transits'],['friends-transit','friends-transit']]){
  await responses.callOpenAIResponses({apiKey:'synthetic',role:'WRITER',surface,family,request:{model:'synthetic',input:'Synthetic provider transport test.'},fetchImpl:async(url,options)=>{
    const request=JSON.parse(options.body);
    assert(request.instructions.includes(RHETORICAL_WRITER_POLICY),`${surface} writer policy`);
    return Response.json({status:'completed',output:[]});
  }});
}
assert.equal(compiled.canonicalAstrologyWritingInstructions,canonical.canonicalAstrologyWritingInstructions);
assert.equal(compiled.canonicalAstrologyReviewInstructions,canonical.canonicalAstrologyReviewInstructions);
for(const phrase of ['HARD FLAG — REWRITE','REVIEW FLAG — CHECK CONTEXT','Do not force all four into every sentence','genuine narrative meaning','Specificity creates emotional depth.']){
  assert(RHETORICAL_WRITER_POLICY.includes(phrase),phrase);
  assert(RHETORICAL_JUDGE_POLICY.includes(phrase),phrase);
}
for(const phrase of ['QUIET FRUSTRATION','Gentle unfolding','uncomfortable awareness','Something is stirring','Venus reminds you','Neptune invites you','Hold space','It’s okay to','What matters most']){
  const body=`First paragraph.\n\n${phrase}.`;
  const signals=rhetoricalSignals({body});
  assert(signals.length,phrase);
  for(const s of signals){
    assert.equal(s.severity,'review');assert(s.advisory&&s.requiresSemanticReview);
    assert.equal(body.slice(s.offset,s.offset+s.quote.length),s.quote);
  }
  assert.equal(rhetoricalDecision(validateRhetoricalReview(pass(),{body})),'pass','Triage cannot overrule a contextual semantic pass.');
}
for(const id of ['literal-quiet','observable-silence','literal-space-weight-shift']){
  assert.deepEqual(rhetoricalSignals(aiWritingPatternCases.find(f=>f.id===id).body),[],id);
}
const contextual=aiWritingPatternCases.find(f=>f.id==='contextual-emotion');
assert(rhetoricalSignals(contextual.body).length);
assert.equal(rhetoricalDecision(validateRhetoricalReview(pass(),{body:contextual.body})),'pass');
assert.deepEqual(rhetoricalSignals(aiWritingPatternCases.find(f=>f.id==='unlisted-decoration').body),[],'Semantic review must also inspect unlisted patterns.');
const failed=aiWritingPatternCases.find(f=>f.id==='planet-replaces-interpretation');
const receipt={checks:pass().checks.map(c=>({...c,outcome:c.label==='PURPLE_PROSE'?'fail':'pass'})),findings:[{
  label:'PURPLE_PROSE',field:'body',quote:failed.body,paragraph:failed.body,
  reason:'Saturn is given a generic reminder but its meaning is never interpreted.',readerConsequence:'The reader cannot identify what Saturn changes in this situation.',meaningTest:'Removing the planetary name leaves the same stock boundary instruction; the complete passage supplies no behavior or consequence.'
}]};
assert.equal(rhetoricalDecision(validateRhetoricalReview(receipt,{body:failed.body})),'regenerate');
assert.throws(()=>validateRhetoricalReview({...receipt,findings:[{...receipt.findings[0],meaningTest:''}]},{body:failed.body}),/unsupported_finding/);
const controls=await runRhetoricalCalibration(aiWritingPatternCases,async request=>{
  assert(!('required' in request)&&!('forbidden' in request)&&!('authority' in request));
  assert(request.instructions.includes(RHETORICAL_JUDGE_POLICY));return pass();
});
assert.equal(controls.totals.falseAcceptances,7,'An always-pass judge must fail the new negative controls.');
assert.equal(Object.keys(controls.bySurface).length,9);
const falseReject=await runRhetoricalCalibration([contextual],async()=>({...receipt,findings:[{...receipt.findings[0],quote:'quiet resentment',paragraph:contextual.body}]}));
assert.equal(falseReject.totals.falseRejections,1,'A hard flag on the contextual control must be counted as a false rejection.');
const invalid=await runRhetoricalCalibration(aiWritingPatternCases,async()=>({}));
assert.equal(invalid.totals.invalidEvaluations,aiWritingPatternCases.length);
assert.notEqual(HOROSCOPE_RHETORICAL_REVIEW,LEGACY_HOROSCOPE_RHETORICAL_REVIEW);
assert(!supportedHoroscopeReview(undefined));assert(!supportedHoroscopeReview('invented'));
assert.throws(()=>horoscopeReviewPolicy('invented'),/Unsupported/);
for(const version of [HOROSCOPE_RHETORICAL_REVIEW,LEGACY_HOROSCOPE_RHETORICAL_REVIEW]){
  const frozen=`${horoscopeReviewPolicy(version)}\n\nSaved review task.`;
  const got=responses.governedInstructionsForRole('RHETORICAL_REVIEWER',{surface:'horoscopes',family:'horoscope',governedInstructions:frozen});
  assert.equal(got,frozen,'Saved request must retain its exact policy.');
}
assert.throws(()=>responses.governedInstructionsForRole('WRITER',{surface:'horoscopes',family:'horoscope',governedInstructions:`${horoscopeReviewPolicy(LEGACY_HOROSCOPE_RHETORICAL_REVIEW)}\n\nSaved task.`}),/canonical role instructions/);
console.log('PASS AI-pattern transport, contextual exceptions, evidence admission, hidden-label controls and frozen-review compatibility. Injected responses only; no literary calibration or paid calls.');
