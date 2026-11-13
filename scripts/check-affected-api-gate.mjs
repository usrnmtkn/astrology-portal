import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {affectedTestPlan} from './ci-test-plan.mjs';
export function checkAffectedApiGate(scopeResult,matrixResult,plan) {
  assert.equal(scopeResult,'success','API selection must succeed');
  assert(plan,'Missing API selection proof');
  assert.equal(matrixResult,plan.apiShards.length?'success':'skipped','Every selected API shard must succeed');
}
if(import.meta.url===pathToFileURL(process.argv[1]??'').href) {
  checkAffectedApiGate(process.env.API_SCOPE_RESULT,process.env.API_MATRIX_RESULT,affectedTestPlan());
  console.log('PASS all affected API and selected database contracts');
}
