import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { RHETORICAL_LABELS, rhetoricalSignals, validateRhetoricalReview, rhetoricalDecision } from '../../src/astro-writing/rhetoricalPatterns.mjs';
import { runRhetoricalCalibration } from '../../src/astro-writing/rhetoricalCalibration.mjs';
import { rhetoricalCases, rhetoricalSurfaceSets } from './fixtures/rhetorical-patterns.mjs';
import { reviewDraft } from '../../src/astro-writing/reviewDraft.mjs';
import { REVIEW_FIELDS } from '../../src/astro-writing/canonicalInstructions.mjs';
const require = createRequire(import.meta.url);
const {runJudgeSamples} = require('../../packages/astro-knowledge/scripts/editorial-judge-runtime.js');
const {judgeCandidate:judgeDaily} = require('../../packages/astro-knowledge/scripts/judge-daily-glance.js');
const pass = ()=>({checks:RHETORICAL_LABELS.map(label=>({label,outcome:'pass',reason:'Injected contract test; no semantic claim.'})),findings:[]});
const candidate = {body:'First paragraph.\n\nUncertainty can outrun your strategy.'};
const failure = ()=>({checks:pass().checks.map(c=>({...c,outcome:c.label==='PURPLE_PROSE'?'fail':'pass'})),findings:[{
  label:'PURPLE_PROSE',field:'body',quote:'Uncertainty can outrun your strategy.',paragraph:'Uncertainty can outrun your strategy.',
  reason:'The ending supplies a race image without explaining the uncertainty.',readerConsequence:'The reader does not learn what uncertainty changes.',
  meaningTest:'An ordinary account of missing information loses no stated consequence; the body never develops the race image.'}]});
assert.equal(rhetoricalDecision(validateRhetoricalReview(failure(),candidate)),'regenerate');
assert.equal(rhetoricalDecision(validateRhetoricalReview(pass(),candidate)),'pass');
for (const invalid of [undefined,{...pass(),checks:[]},{...failure(),findings:[]},
  {...failure(),findings:[{...failure().findings[0],quote:'Invented evidence.'}]},
  {...failure(),findings:[{...failure().findings[0],paragraph:'Uncertainty'}]},
  {...failure(),findings:[{...failure().findings[0],field:'draft.body'}]}]) {
  assert.throws(()=>validateRhetoricalReview(invalid,candidate),/invalid_rhetorical_review/);
}
const overlap=failure();overlap.findings.push({...overlap.findings[0],label:'POLISHED_ASTROLOGY_PROSE'});
assert.equal(validateRhetoricalReview(overlap,candidate).findings.length,2);
const related=pass();related.findings.push({...failure().findings[0],label:'POLISHED_ASTROLOGY_PROSE'});
assert.equal(rhetoricalDecision(validateRhetoricalReview(related,candidate)),'pass','Only the three newly authorized labels change blocking policy.');
const unknown=pass();unknown.checks[0].outcome='indeterminate';assert.equal(rhetoricalDecision(unknown),'evaluation_unavailable');
assert.deepEqual(rhetoricalSignals(rhetoricalCases.find(f=>f.id==='consequential-contrast').body),[]);
assert.deepEqual(rhetoricalSignals(rhetoricalCases.find(f=>f.id==='required-chart-data').body),[]);
const precision=rhetoricalCases.find(f=>f.id==='necessary-time-precision');
assert.equal(rhetoricalSignals(precision.body)[0].advisory,true);
assert.equal(rhetoricalDecision(validateRhetoricalReview(pass(),{body:precision.body})),'pass','A signal cannot overrule a semantic precision control.');
assert.deepEqual(Object.keys(rhetoricalSurfaceSets).sort(),['calendar','daily','moon-sign-ingress','natal','personal-transits','seasonal','sky','weekly','you-friend'].sort());
// An always-pass judge must expose all missed failures, not yield a green suite.
const alwaysPass=await runRhetoricalCalibration(rhetoricalCases,async request=>{
  assert.ok(!('required' in request)&&!('authority' in request)&&!('protectedSpans' in request));
  assert.match(request.id,/^[a-f0-9]{64}$/);return pass();
});
assert.equal(alwaysPass.totals.falseAcceptances,8);
const invalids=await runRhetoricalCalibration(rhetoricalCases,async()=>({checks:[],findings:[]}));
assert.equal(invalids.totals.invalidEvaluations,rhetoricalCases.length);
const falseReject=await runRhetoricalCalibration([precision],async({candidate})=>({checks:pass().checks.map(c=>({...c,outcome:c.label==='CORRECTIO'?'fail':'pass'})),
  findings:[{...failure().findings[0],label:'CORRECTIO',quote:'or more accurately',paragraph:candidate.body}]}));
assert.equal(falseReject.totals.falseRejections,1);
// Existing shared reviewer uses the independent result even if other checks pass.
const reviewed=await reviewDraft({draft:candidate,requiredFields:['body'],modelClient:async({stage})=>stage==='cold-review'
  ? {cold_rendered_prose:{status:'PASS',reason:'Synthetic'},decision:'PASS',violations:[]}
  : {...Object.fromEntries(REVIEW_FIELDS.map(f=>[f,{status:'PASS',reason:'Synthetic'}])),decision:'PASS',violations:[],rhetoric:failure()}});
assert.equal(reviewed.decision,'REVISE');assert.ok(reviewed.required_revisions.some(r=>r.field==='body'));
const unevaluated=await reviewDraft({draft:candidate,requiredFields:['body']});assert.equal(unevaluated.rhetoricDecision,'not_run');
// Legacy judge path: no additional provider call; the injected verdict cannot
// override a cited material failure with a high score.
let calls=0;
const legacy=await runJudgeSamples({content:JSON.stringify(candidate),prompt:'Synthetic',rubric:'Synthetic',rubricVersion:'test',
  judgeFn:async()=>{calls++;return JSON.stringify({score:3,verdict:'on-voice',rhetoric:failure()});},parseVerdict:JSON.parse});
assert.equal(calls,1);assert.equal(legacy.score,1);assert.ok(legacy.failedChecks.includes('PURPLE_PROSE'));
const noReceipt=await runJudgeSamples({content:JSON.stringify(candidate),prompt:'Synthetic',rubric:'Synthetic',rubricVersion:'test',
  judgeFn:async()=>JSON.stringify({score:3,verdict:'on-voice'}),parseVerdict:JSON.parse});assert.equal(noReceipt.contractViolation,true);
const daily=await judgeDaily({headline:'Synthetic',...candidate},'synthetic',1,{judgeFn:async prompt=>{
  assert.ok(prompt.includes(candidate.body.replaceAll('\n','\\n')));
  return {verdict:{score:3,dimensions:{},rhetoric:failure()},usage:{}};
}});
assert.equal(daily.score,3,'The demoted legacy score stays advisory.');assert.equal(daily.rhetoricDecision,'regenerate');
assert.equal((await judgeDaily({headline:'Synthetic',...candidate},'synthetic',1,{judgeFn:async()=>({verdict:{score:3},usage:{}})})).rhetoricDecision,'evaluation_unavailable');
console.log('PASS rhetorical contract, overlap, semantic exceptions, hidden-label scoring and shared/legacy admission tests. Injected judges only; literary calibration has NOT run.');
