import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync('.github/workflows/calendar-aspect-content-studio.yml', 'utf8');
const requiredPaths = [
  'apps/web/src/App.tsx', 'apps/web/src/features/calendar/LunarCalendar.tsx',
  'scripts/lib/assert-sky-studio-authority.mjs', 'scripts/test-sky-studio-authority-contract.mjs',
  'scripts/test-calendar-aspect-workflow-contract.mjs', 'scripts/test-sky-placement-exact-aspect-authority.mjs',
  'scripts/test-sky-calendar-collective-release-20260907.mjs', 'scripts/test-published-calendar-aspect-content-studio.mjs',
  '.github/workflows/calendar-aspect-content-studio.yml'
];
function verify(workflow) {
  for (const event of ['push', 'pull_request']) {
    const section = workflow.match(new RegExp(`^  ${event}:\\n([\\s\\S]*?)(?=^  [a-z_]+:|^permissions:)`, 'mu'))?.[1];
    assert.ok(section, `${event} validation trigger required`);
    for (const path of requiredPaths) assert.ok(section.includes(`- "${path}"`), `${event}: ${path}`);
  }
  const jobs = [...workflow.matchAll(/^  ([a-z][a-z-]+):\n([\s\S]*?)(?=^  [a-z][a-z-]+:|$(?![\s\S]))/gmu)];
  let writeJobs = 0;
  for (const [, name, body] of jobs) {
    if (!body.includes('--apply')) continue;
    writeJobs++;
    const input = name === 'seed-content-studio' ? 'seed_content_studio' : 'sync_published_exact_aspects';
    const gate = body.match(/^    if: (.+)$/mu)?.[1];
    assert.equal(gate, `github.event_name == 'workflow_dispatch' && inputs.${input}`);
    for (const event of ['push', 'pull_request', 'workflow_dispatch']) {
      for (const enabled of [false, true]) {
        const actual = vm.runInNewContext(gate, { github: { event_name: event }, inputs: { [input]: enabled } });
        assert.equal(actual, event === 'workflow_dispatch' && enabled, `${name}: ${event}/${enabled}`);
      }
    }
  }
  assert.equal(writeJobs, 2, 'Both existing write jobs remain explicit manual operations');
}
verify(source);
const unsafe = source.replace("if: github.event_name == 'workflow_dispatch' && inputs.sync_published_exact_aspects", "if: github.event_name == 'push' || (github.event_name == 'workflow_dispatch' && inputs.sync_published_exact_aspects)");
assert.notEqual(unsafe, source);
assert.throws(() => verify(unsafe), { name: 'AssertionError' });
console.log('Calendar workflow: push/PR validate; both writes require explicit manual true; automatic-write mutation rejected.');
