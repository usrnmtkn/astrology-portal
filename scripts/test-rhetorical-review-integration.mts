import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { RHETORICAL_LABELS } from '../src/astro-writing/rhetoricalPatterns.mjs';
import { GENERATED_REPORT_JUDGE_CATEGORIES, generatedReportJudgeVerdict, type GeneratedReportJudgeScores } from '../api/_lib/transit-reading-judge-rules.js';
import { assertGeneratedReportJudgeEvidence } from '../api/_lib/transit-reading-judge-evidence.js';
import { isReportDeliveryBlocker } from '../api/_lib/transit-reading-delivery-evidence.js';
import { REVIEW_FINDINGS } from '../api/_lib/transit-reading-review-contract.js';
import { checksFor, validateEvaluation, evaluationDecision } from '../src/astro-writing/editorial/evaluation.mjs';
import { digest, evidenceManifest } from '../src/astro-writing/editorial/evidenceRegistry.mjs';
import { evaluateEditorialCoherence } from '../api/_lib/content-generation.js';
const require=createRequire(import.meta.url);
const {editorialGate}=require('../packages/astro-knowledge/scripts/editorial-judge-policy.js');
const perfect=Object.fromEntries(GENERATED_REPORT_JUDGE_CATEGORIES.map(c=>[c,4])) as GeneratedReportJudgeScores;
const candidate={headline:'Synthetic metadata',summary:'Synthetic summary.',body:'First synthetic sentence. Second synthetic sentence.'};
const manifest=evidenceManifest({surface:'seasonal',target:'synthetic',query:{},entries:[
  {id:'approved',role:'approved',authority:'owner_authored_final',text:'Synthetic comparison.',source:{locator:'test:approved',version:'1'},scope:'fixture',relevance:{score:1,reason:'Synthetic prose function'},ownerReason:null,rejectedSpans:[]},
  {id:'rejected',role:'rejected',authority:'explicit_owner_rejection',text:'Synthetic rejected comparison.',source:{locator:'test:rejected',version:'1'},scope:'fixture',relevance:{score:1,reason:'Synthetic failure'},ownerReason:'Synthetic reason.',rejectedSpans:['Synthetic rejected comparison.']}
]});
for(const label of RHETORICAL_LABELS){
  const finding={category:label,location:'body',finding:`${candidate.body} Synthetic material consequence and context-sensitive test.`,
    draftQuote:'Second synthetic sentence.',sourcePath:null,sourceQuote:null,ownerComparisons:[],delivery:null};
  assert.equal(generatedReportJudgeVerdict(perfect,.85,[finding]),'below_threshold');
  assert.equal(isReportDeliveryBlocker(finding),true,'Evidence-delivery scores cannot bypass the specific owner prohibition.');
  assert.ok(REVIEW_FINDINGS.writing.includes(label));assert.ok(!REVIEW_FINDINGS.facts.includes(label as never));
  assert.doesNotThrow(()=>assertGeneratedReportJudgeEvidence({scores:{...perfect,natural_language:3},findings:[finding]},{draft:candidate,brief:{}}));
  assert.throws(()=>assertGeneratedReportJudgeEvidence({scores:{...perfect,natural_language:3},findings:[{...finding,finding:'Only a fragment.'}]},{draft:candidate,brief:{}}),/complete containing paragraph/);
  const value={candidateHash:digest(candidate),manifestHash:manifest.hash,comparisonSummary:'Synthetic comparison only.',
    checks:checksFor('voice').map((id:string)=>({id,outcome:id===label?'fail':'pass',explanation:'Injected test.'})),
    findings:[{checkId:label,label,field:'body',quote:'Second synthetic sentence.',paragraph:candidate.body,
      explanation:'Synthetic semantic operation.',readerConsequence:'Synthetic material consequence.',
      comparisons:[{evidenceId:'approved',quote:'Synthetic comparison.',reason:'Synthetic shared function.'}],responsibleStage:'prose'}]};
  validateEvaluation(value,{role:'voice',candidate,manifest});assert.equal(evaluationDecision([value]).stage,'prose');
  value.findings[0].responsibleStage='mechanism';assert.throws(()=>validateEvaluation(value,{role:'voice',candidate,manifest}),/unsupported_finding/);
}
assert.equal(isReportDeliveryBlocker({category:'POLISHED_ASTROLOGY_PROSE',location:'body',finding:'Synthetic',delivery:null}),false,'Related label does not silently expand this amendment.');
assert.equal(editorialGate({score:3,disagreement:true,rhetoricalBlocked:true}).gate,'regenerate');
assert.equal(editorialGate({score:1,rhetoricalBlocked:true,exactApprovedGold:true}).gate,'auto-publish','Existing exact owner approval remains unchanged.');
const listReview=evaluateEditorialCoherence({headline:'Synthetic',summary:'The form needs the date, time, place, and selected time zone.',body:'Each field records a different fact.'} as any,
  {surface:'calendar',eventType:'transit',mode:'standard',facts:{}} as any);
assert.equal(listReview.failures.find(f=>f.code==='KEYWORD_LISTING')?.severity,'warning');
assert.equal(listReview.score,100,'Advisory style signals cannot indirectly fail the aggregate score.');
assert.equal(listReview.passed,true,'A list of factual fields is not a semantic rhetorical verdict.');
console.log('PASS report/scoped/Seasonal label coverage, whole-paragraph evidence, prose routing, delivery blockers and owner-source preservation. No model calls.');
