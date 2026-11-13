import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';

export function apiTestCommands(pkg) {
  return [...new Set([
    ...pkg.scripts['test:content-studio-api'].split(' && '),
    ...(pkg.scripts['qa:admin-bundle']??'').split(' && ').filter(command=>command.startsWith('node ')&&/scripts\/test-[\w-]*preview-api\.[cm]?[jt]s$/u.test(command))
  ])];
}

export function validateTestPlan(plan, {head, commands} = {}) {
  assert.equal(plan?.schema, 'affected-tests/v1', 'Missing affected-test plan');
  assert(/^[a-f0-9]{40}$/u.test(plan.head), 'Invalid plan revision');
  if (head) assert.equal(plan.head, head, 'Test plan belongs to another revision');
  for (const key of ['files', 'apiCommands', 'browserSpecs', 'browserJobs']) {
    assert(Array.isArray(plan[key]) && plan[key].every(value => typeof value === 'string'), `Invalid ${key}`);
    assert.equal(new Set(plan[key]).size, plan[key].length, `Duplicate ${key}`);
  }
  assert(plan.files.every(file => file && !file.startsWith('/') && !file.split('/').includes('..')), 'Invalid changed path');
  assert(plan.browserSpecs.every(file => /^tests\/visual\/[\w.-]+\.spec\.ts$/u.test(file)), 'Invalid browser source');
  if (commands) assert(plan.apiCommands.every(command => commands.includes(command)), 'Unknown API command');
  for (const key of ['postgres', 'weeklyPostgres', 'variables']) assert.equal(typeof plan[key], 'boolean');
  assert(Array.isArray(plan.apiShards) && plan.apiShards.every(shard => [1, 2, 3].includes(shard)));
  assert.equal(new Set(plan.apiShards).size, plan.apiShards.length);
  const expected=[0,1,2].flatMap(index=>Math.floor((index+1)*plan.apiCommands.length/3)>Math.floor(index*plan.apiCommands.length/3)
    ||index===0&&(plan.postgres||plan.weeklyPostgres||plan.variables)?[index+1]:[]);
  assert.deepEqual(plan.apiShards,expected,'Missing or unexpected API shards');
  assert(!plan.browserSpecs.length||plan.browserJobs.length,'Browser cases have no selected job');
  return plan;
}

export function affectedTestPlan(env = process.env) {
  if (env.CI_AFFECTED_TEST_PLAN === undefined) return null;
  const head = execFileSync('git', ['rev-parse', 'HEAD'], {encoding:'utf8'}).trim();
  const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
  return validateTestPlan(JSON.parse(env.CI_AFFECTED_TEST_PLAN), {
    head, commands:apiTestCommands(pkg)
  });
}

export function affectedBrowserIdentities(identities, plan) {
  if (!plan) return identities;
  const selected = new Set(plan.browserSpecs);
  return identities.filter(identity => selected.has(identity.match(/tests\/visual\/[^›]+\.spec\.ts/u)?.[0]));
}
