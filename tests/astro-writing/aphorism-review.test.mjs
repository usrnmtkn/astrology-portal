import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {RHETORICAL_LABELS,RHETORICAL_WRITER_POLICY,RHETORICAL_JUDGE_POLICY,RHETORICAL_REVIEW_SCHEMA,validateRhetoricalReview,rhetoricalDecision} from '../../src/astro-writing/rhetoricalPatterns.mjs';
import {reviewDraft} from '../../src/astro-writing/reviewDraft.mjs';
import {REVIEW_FIELDS} from '../../src/astro-writing/canonicalInstructions.mjs';
import * as horoscope from '../../src/astro-writing/horoscopeRhetoricalReview.mjs';
const require=createRequire(import.meta.url);
const history=require('../../src/astro-writing/rhetoricalPatternHistory.cjs');
const transport=require('../../src/astro-writing/openAIResponses.cjs');
const pass=()=>({checks:RHETORICAL_LABELS.map(label=>({label,outcome:'pass',reason:'Injected contract control, not a literary judgment.'})),findings:[]});

for(const policy of [RHETORICAL_WRITER_POLICY,RHETORICAL_JUDGE_POLICY]){
  assert(policy.includes('APHORISMS AND MAXIMS — REVIEW ONLY'));
  assert(policy.includes('Use sparingly, never as the default ending'));
  assert(policy.includes('An occasional aphorism can remain'));
}
assert(RHETORICAL_REVIEW_SCHEMA.properties.findings.items.properties.label.enum.includes('APHORISM'));
assert(!RHETORICAL_LABELS.includes('APHORISM'),'A review flag cannot become a fourth material blocker.');

const cases=[
  {body:'A synthetic belief passage ends with a rule about what all convictions require.',quote:'a rule about what all convictions require'},
  {body:'A synthetic belief passage ends with a hedged general lesson about faith.',quote:'a hedged general lesson about faith'},
  {body:'A synthetic developed passage uses one relevant maxim in context.',quote:'one relevant maxim'},
];
for(const candidate of cases){
  const receipt={...pass(),findings:[{label:'APHORISM',field:'body',quote:candidate.quote,paragraph:candidate.body,
    reason:'Synthetic contextual flag for owner review.',readerConsequence:'Review if this conclusion develops the specific experience or merely generalizes.',
    meaningTest:'Read the complete passage and its ending; occasional relevant use can remain.'}]};
  assert.equal(rhetoricalDecision(validateRhetoricalReview(receipt,candidate)),'pass');
  const reviewed=await reviewDraft({draft:candidate,requiredFields:['body'],modelClient:async({stage})=>stage==='cold-review'
    ?{cold_rendered_prose:{status:'PASS',reason:'Synthetic'},decision:'PASS',violations:[]}
    :{...Object.fromEntries(REVIEW_FIELDS.map(field=>[field,{status:'PASS',reason:'Synthetic'}])),decision:'PASS',violations:[],rhetoric:receipt}});
  assert.equal(reviewed.decision,'PASS');
  assert.equal(reviewed.violations.find(v=>v.category==='APHORISM').severity,'nonblocking');
  assert.deepEqual(reviewed.required_revisions,[],'Review-only findings must not request automatic regeneration.');
  assert.throws(()=>validateRhetoricalReview({...receipt,findings:[{...receipt.findings[0],quote:'Absent evidence'}]},candidate),/unsupported_finding/);
  const blocking={...receipt,checks:receipt.checks.map(c=>({...c,outcome:c.label==='PURPLE_PROSE'?'fail':'pass'})),
    findings:[...receipt.findings,{...receipt.findings[0],label:'PURPLE_PROSE',reason:'Independent synthetic material abstraction defect.'}]};
  assert.equal(rhetoricalDecision(validateRhetoricalReview(blocking,candidate)),'regenerate','Independent material failures retain their own gate.');
}
assert.equal(rhetoricalDecision(validateRhetoricalReview(pass(),{body:'A complete synthetic observation.'})),'pass');

assert.equal(horoscope.horoscopeReviewPolicy(horoscope.PREVIOUS_HOROSCOPE_RHETORICAL_REVIEW),history.PREVIOUS_RHETORICAL_JUDGE_POLICY);
assert(!history.PREVIOUS_RHETORICAL_JUDGE_POLICY.includes('APHORISMS AND MAXIMS'));
for(const version of [horoscope.HOROSCOPE_RHETORICAL_REVIEW,horoscope.PREVIOUS_HOROSCOPE_RHETORICAL_REVIEW,horoscope.LEGACY_HOROSCOPE_RHETORICAL_REVIEW]){
  const instructions=horoscope.horoscopeReviewPolicy(version)+'\n\nFrozen synthetic review task.';
  assert.equal(transport.governedInstructionsForRole('RHETORICAL_REVIEWER',{surface:'horoscopes',family:'horoscope',governedInstructions:instructions}),instructions);
}
assert.equal(transport.governedInstructionsForRole('WRITER',{surface:'horoscopes',family:'horoscope',governedInstructions:history.PREVIOUS_HOROSCOPE_WRITER_POLICY}),history.PREVIOUS_HOROSCOPE_WRITER_POLICY);
console.log('PASS aphorism policy, review-only findings, owner-review visibility, independent blockers and frozen v1/v2 requests. Injected responses only.');
