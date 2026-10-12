import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';

export function checkBrowserReleaseGate(needs) {
  assert.equal(needs.scope?.result, 'success', 'Browser scope must succeed');
  assert(Object.keys(needs).length > 1, 'Browser gate must include its test jobs');
  for (const [job, value] of Object.entries(needs)) {
    assert(['success', 'skipped'].includes(value.result), `${job}: ${value.result}`);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  checkBrowserReleaseGate(JSON.parse(process.env.BROWSER_JOB_RESULTS ?? '{}'));
  console.log('PASS all applicable browser release jobs');
}
