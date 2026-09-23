import assert from "node:assert/strict";
import { reportJudgeSourcePointerSchema, resolveReportJudgeSourcePointers } from "../api/_lib/transit-reading-source-citations.ts";
import { GENERATED_REPORT_JUDGE_SCHEMA } from "../api/_lib/transit-reading-judge-schema.ts";
import { RECONCILED_REPORT_JUDGE_SCHEMA } from "../api/_lib/transit-reading-review-reconciliation.ts";
import { assertGeneratedReportJudgeEvidence, generatedReportJudgeEvidenceContract } from "../api/_lib/transit-reading-judge-evidence.ts";
import { GENERATED_REPORT_JUDGE_CATEGORIES, generatedReportJudgeVerdict } from "../api/_lib/transit-reading-judge-rules.ts";
import { assertOpenAiStrictResponseSchema } from "../api/_lib/report-model-client.ts";

const source="An option may be available.\r\n\r\nIt is not a guarantee.  Preserve this spacing: — é.";
const brief={approved:{passages:[source]},"a/b":{"~key":["Escaped pointer source."]},empty:"",number:7};
const scores=Object.fromEntries(GENERATED_REPORT_JUDGE_CATEGORIES.map(k=>[k,4]));
const draft={headline:"Fixture",summary:"Fixture summary.",body:"The outcome is guaranteed."};
const finding={category:"unsupported_interpretation",location:"body",finding:"The source is conditional, not a guarantee.",draftQuote:draft.body,sourcePath:"/approved/passages/0",ownerComparisons:[]};
const wire={scores:{...scores,factual_traceability:2},findings:[finding]};
const normalized=resolveReportJudgeSourcePointers(wire,brief) as typeof wire & {findings:Array<typeof finding & {sourceQuote:string}>};
assert.equal(normalized.findings[0].sourceQuote,source,"Resolve the whole original, including paragraph and Unicode bytes.");
assert.equal(Object.hasOwn(wire.findings[0],"sourceQuote"),false,"Raw provider evidence must not be mutated.");
const acceptedDiagnostic=assertGeneratedReportJudgeEvidence(normalized,{draft,brief});
assert.equal(generatedReportJudgeVerdict(acceptedDiagnostic.scores,.85,acceptedDiagnostic.findings),"below_threshold","Exact citation is not permission to pass an unsupported claim.");
assert.throws(()=>resolveReportJudgeSourcePointers({...wire,findings:[{...finding,sourceQuote:"An option will be available."}]},brief),/must select a sourcePath/);
assert.throws(()=>assertGeneratedReportJudgeEvidence({...wire,findings:[{...finding,sourceQuote:"An option will be available."}]},{draft,brief}),/sourceQuote does not occur/,"Legacy exact-quote validation stays strict.");
for(const sourcePath of [undefined,"/missing","/approved","/approved/passages/99","/empty","/number","/__proto__/constructor"]){
 assert.throws(()=>resolveReportJudgeSourcePointers({...wire,findings:[{...finding,sourcePath}]},brief),/not an exact string field/);
}
const escaped=resolveReportJudgeSourcePointers({...wire,findings:[{...finding,sourcePath:"/a~1b/~0key/0"}]},brief) as typeof normalized;
assert.equal(escaped.findings[0].sourceQuote,"Escaped pointer source.");
const noSource=resolveReportJudgeSourcePointers({...wire,findings:[{...finding,sourcePath:null}]},brief) as typeof normalized;
assert.equal(noSource.findings[0].sourceQuote,null);
assert.throws(()=>assertGeneratedReportJudgeEvidence({...normalized,scores},{draft,brief}),/perfect category score/);
for(const base of [GENERATED_REPORT_JUDGE_SCHEMA,RECONCILED_REPORT_JUDGE_SCHEMA]){
 const schema=reportJudgeSourcePointerSchema(base as unknown as Record<string,unknown>,brief) as any;
 assertOpenAiStrictResponseSchema(schema,"source_pointer_fixture");
 assert.equal(Object.hasOwn(schema.properties.findings.items.properties,"sourceQuote"),false);
 assert.equal(schema.properties.findings.items.required.includes("sourceQuote"),false);
 assert.deepEqual(schema.properties.findings.items.properties.sourcePath.enum,[null,"/approved/passages/0","/a~1b/~0key/0"]);
 assert.equal(Object.hasOwn(base.properties.findings.items.properties,"sourceQuote"),true,"Do not alter the legacy/scoped schema.");
}
const contract=generatedReportJudgeEvidenceContract(true);
assert(contract.includes("do not return sourceQuote"));
assert(contract.includes("Selecting a real path does not establish"));
console.log("Source citation protocol: exact whole-source resolution, immutable provider response, locked pointer enum, escaped paths, invalid references, legacy quote rejection and unchanged factual blocking passed (no provider calls).");
