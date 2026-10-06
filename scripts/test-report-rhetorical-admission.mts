import assert from 'node:assert/strict';
import fs from 'node:fs';
import {assembleReportGenerationPayload} from '../api/_lib/report-generation.ts';
import {REPORT_JUDGE_CATEGORIES,judgeReportUnit} from '../api/_lib/report-judge.ts';
import {RHETORICAL_LABELS} from '../src/astro-writing/rhetoricalPatterns.mjs';
const manifest=JSON.parse(fs.readFileSync('scripts/fixtures/report-judge-complete-unit-regressions-v3.json','utf8'));
const facts=JSON.parse(fs.readFileSync(manifest.factsSourcePath,'utf8'));
const payload=assembleReportGenerationPayload({reportId:'00000000-0000-0000-0000-000000000085',reportDomain:'general',reportHorizon:'12_months',unitId:'spring',frozenFacts:facts});
const draft={headline:'Synthetic check',body:'First synthetic sentence. Second synthetic sentence.',sections:[]};
const receipt=(label?:string)=>({checks:RHETORICAL_LABELS.map(item=>({label:item,outcome:item===label?'fail':'pass',reason:'Synthetic contract fixture.'})),findings:label?[{label,field:'body',quote:'Second synthetic sentence.',paragraph:draft.body,reason:'Synthetic rhetorical operation.',readerConsequence:'Synthetic loss of meaning.',meaningTest:'Synthetic complete-context test.'}]:[]});
async function judge(rhetoric:any){return judgeReportUnit({payload,draft,validatorResults:[],threshold:.85,callModel:(async input=>{
 assert(input.prompt.includes(draft.body));assert(input.prompt.includes('CORRECTIO'));assert(input.schema.required.includes('rhetoric'));
 return {value:{scores:Object.fromEntries(REPORT_JUDGE_CATEGORIES.map(c=>[c,4])),applicability:{interpretive_movement:'not_applicable',reason:'Synthetic'},overall:1,verdict:'pass',findings:[],rhetoric},model:'fixture',provider:'fixture',usage:{inputTokens:0,outputTokens:0,totalTokens:0}};
}) as any});}
assert.equal((await judge(receipt())).result.verdict,'pass');
for(const label of RHETORICAL_LABELS)assert.equal((await judge(receipt(label))).result.verdict,'below_threshold','Perfect scores cannot bypass a material contextual finding');
await assert.rejects(()=>judge(undefined),/invalid_rhetorical_review/);
const unsupported=receipt('TRICOLON');unsupported.findings[0].paragraph='Not in the candidate.';
await assert.rejects(()=>judge(unsupported),/unsupported_finding/);
const indeterminate=receipt();indeterminate.checks[0].outcome='indeterminate';
assert.equal((await judge(indeterminate)).result.verdict,'below_threshold');
console.log('PASS report rhetorical admission: actual judge adapter, complete draft, perfect-score blocker, missing/unsupported/indeterminate receipts. Injected judgments, no paid calls.');
