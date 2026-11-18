import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { constants } from 'node:os';
import { delimiter, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import {affectedTestPlan} from './ci-test-plan.mjs';

export const apiShardCount = 3;

// The package script remains the single complete list, including nested npm
// suites. Reject shell syntax rather than silently partitioning it incorrectly.
export function apiCommandShards(script) {
  if (typeof script !== 'string' || !script.trim()) throw new Error('Missing full API test command.');
  const commands = script.split(' && ');
  if (commands.some(command => !/^(?:node|npm|tsx) [\w./:= -]+$/u.test(command))) {
    throw new Error('API commands must be plain node/npm/tsx commands separated by " && ".');
  }
  return Array.from({ length: apiShardCount }, (_, index) =>
    commands.slice(Math.floor(index * commands.length / apiShardCount),
      Math.floor((index + 1) * commands.length / apiShardCount)));
}

export function runApiShard(script, shard, { cwd = process.cwd(), stdio = 'inherit' } = {}) {
  if (!Number.isInteger(shard) || shard < 1 || shard > apiShardCount) throw new Error('Invalid API shard.');
  const commands = apiCommandShards(script)[shard - 1];
  if (!commands.length) throw new Error('An API shard must not be empty.');
  const env = { ...process.env, PATH: `${resolve(cwd, 'node_modules/.bin')}${delimiter}${process.env.PATH ?? ''}` };
  for (const command of commands) {
    console.log(`[API shard ${shard}/${apiShardCount}] ${command}`);
    const [program, ...args] = command.trim().split(/\s+/u);
    const result = spawnSync(program, args, { cwd, env, stdio });
    if (result.error) throw result.error;
    if (result.status !== 0) return result.status ?? 128 + (constants.signals[result.signal] ?? 1);
  }
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [, , flag, value, ...extra] = process.argv;
  if (flag !== '--shard' || !/^[1-3]$/u.test(value ?? '') || extra.length) {
    console.error('Usage: node scripts/run-content-studio-api-shard.mjs --shard 1|2|3');
    process.exitCode = 1;
  } else {
    const { scripts } = JSON.parse(readFileSync('package.json', 'utf8'));
    const plan=affectedTestPlan();
    if(plan) {
      if(!plan.apiShards.includes(Number(value))) throw new Error('Unplanned API shard');
      const selected=plan.apiCommands.length?apiCommandShards(plan.apiCommands.join(' && '))[Number(value)-1]:[];
      if(selected.length)process.exitCode=runApiShard(plan.apiCommands.join(' && '),Number(value));
      else console.log('This planned shard owns only the selected database/variable contracts.');
    } else process.exitCode = runApiShard(scripts['test:content-studio-api'], Number(value));
  }
}
