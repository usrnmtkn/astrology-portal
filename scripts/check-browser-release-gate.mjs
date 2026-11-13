import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import {affectedTestPlan,validateTestPlan} from './ci-test-plan.mjs';

export function checkBrowserReleaseGate(needs,plan=JSON.parse(needs.scope?.outputs?.test_plan??'null')) {
  assert.equal(needs.scope?.result, 'success', 'Browser scope must succeed');
  assert(Object.keys(needs).length > 1, 'Browser gate must include its test jobs');
  validateTestPlan(plan);
  for(const job of plan.browserJobs)assert.equal(needs[job]?.result,'success',`${job}: selected browser job must succeed`);
  for (const [job, value] of Object.entries(needs)) {
    assert(['success', 'skipped'].includes(value.result), `${job}: ${value.result}`);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  checkBrowserReleaseGate(JSON.parse(process.env.BROWSER_JOB_RESULTS ?? '{}'),affectedTestPlan());
  console.log('PASS all applicable browser release jobs');
}
