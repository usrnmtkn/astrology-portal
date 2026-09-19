#!/usr/bin/env node
// Every browser suite must be executed by a workflow, and the browser QA workflow must run on
// pull requests. Both guarantees failed at once in September 2026: the Studio style suite had no
// workflow reference, and visual smoke lost its pull_request trigger and was then disabled, so
// thirty-one Studio regressions reached main without a single red check.
import { readFileSync, readdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const workflowDir = '.github/workflows';
const testDir = 'tests/visual';

// A suite may be run by hand only with a reason. Anything else must be in a workflow.
const runByHand = new Map([
  [
    'playwright.sky-debility-production.config.ts',
    'Production URL smoke run: needs the deployed site, not a CI preview.'
  ],
  [
    'playwright.sky-variable-tables-production.config.ts',
    'Production URL smoke run: needs the deployed site, not a CI preview.'
  ]
]);

// The trigger block runs from the `on:` line to the next top-level key.
export function workflowTriggers(text) {
  const lines = text.split('\n');
  const start = lines.findIndex(line => line === 'on:' || line.startsWith('on: '));
  if (start === -1) return [];
  const triggers = [];
  for (const line of lines.slice(start + 1)) {
    if (/^\S/u.test(line)) break;
    const match = /^ {2}(\w+):/u.exec(line);
    if (match) triggers.push(match[1]);
  }
  return triggers;
}

// A matrix job names its suites once and fills them in per run, so each listed value is
// substituted into a copy of the workflow before any suite name is looked up.
export function expandMatrixValues(text) {
  let expanded = text;
  for (const [, key, list] of text.matchAll(/^\s+(\w+):\s*\[([^\]]*)\]\s*$/gmu)) {
    const token = new RegExp(`\\$\\{\\{\\s*matrix\\.${key}\\s*\\}\\}`, 'gu');
    if (!token.test(text)) continue;
    for (const value of list.split(',')) expanded += `\n${text.replace(token, value.trim().replace(/^["']|["']$/gu, ''))}`;
  }
  return expanded;
}

// Workflows reach suites through npm scripts as often as through a direct playwright command, so
// every `npm run name` is expanded into the script it runs before looking for a config or a spec.
export function expandNpmScripts(text, scripts, depth = 3) {
  if (depth === 0) return text;
  const names = new Set([...text.matchAll(/npm run ([\w:-]+)/gu)].map(match => match[1]));
  let expanded = text;
  for (const name of names) {
    const body = scripts[name];
    if (body) expanded += `\n${expandNpmScripts(body, scripts, depth - 1)}`;
  }
  return expanded;
}

// A config selects specs by array, single string, or regular expression, and a config with no
// testMatch is always given explicit spec arguments in the workflow that runs it.
export function specsSelectedByConfig(source, specs) {
  const index = source.indexOf('testMatch:');
  if (index === -1) return [];
  const value = source.slice(index + 'testMatch:'.length).trimStart();
  const pattern = /^\/((?:[^/\\]|\\.)+)\/(\w*)/u.exec(value);
  if (pattern) {
    const selector = new RegExp(pattern[1], pattern[2]);
    return specs.filter(spec => selector.test(spec));
  }
  const end = value.startsWith('[') ? value.indexOf(']') + 1 : value.indexOf('\n');
  return value.slice(0, end > 0 ? end : undefined).match(/[\w.-]+\.spec\.ts/gu) ?? [];
}

// Which workflows actually run a browser suite. A workflow that runs one must stay enabled.
export function workflowsRunningSuites({ configs, workflows, specs, scripts = {} }) {
  return workflows
    .filter(item => {
      const text = expandNpmScripts(expandMatrixValues(item.text), scripts);
      return [...configs, ...specs].some(name => text.includes(name));
    })
    .map(item => item.name);
}

export function browserSuiteCoverage({ configs, workflows, specs, scripts = {} }) {
  const workflowText = expandNpmScripts(workflows.map(item => expandMatrixValues(item.text)).join('\n'), scripts);
  const orphanConfigs = configs
    .filter(name => !workflowText.includes(name) && !runByHand.has(name))
    .map(name => ({ config: name, problem: 'no workflow runs this config' }));
  const staleByHand = [...runByHand.keys()]
    .filter(name => !configs.includes(name))
    .map(name => ({ config: name, problem: 'listed as run by hand but the config is gone' }));

  // A spec counts as covered when a workflow command names it, or when a workflow runs a config
  // whose testMatch selects it. A config without testMatch is always given explicit spec
  // arguments in a workflow, so it never covers the whole directory on its own.
  const coveredByConfig = new Set();
  for (const name of configs) {
    if (!workflowText.includes(name)) continue;
    for (const spec of specsSelectedByConfig(readFileSync(name, 'utf8'), specs)) coveredByConfig.add(spec);
  }
  const uncoveredSpecs = specs
    .filter(spec => !coveredByConfig.has(spec) && !workflowText.includes(spec))
    .map(spec => ({ spec, problem: 'no workflow runs this spec' }));

  // The browser QA workflow is only a gate when it runs before a merge.
  const qa = workflows.find(item => item.name === 'visual-smoke.yml');
  const triggerProblems = [];
  if (!qa) triggerProblems.push({ workflow: 'visual-smoke.yml', problem: 'the browser QA workflow is missing' });
  else if (!workflowTriggers(qa.text).includes('pull_request')) {
    triggerProblems.push({ workflow: 'visual-smoke.yml', problem: 'browser QA must run on pull_request, not only after merge' });
  }

  return [...orphanConfigs, ...staleByHand, ...uncoveredSpecs, ...triggerProblems];
}

function readRepository() {
  return {
    configs: readdirSync('.').filter(name => /^playwright\..*\.config\.ts$/u.test(name) || name === 'playwright.config.ts').sort(),
    workflows: readdirSync(workflowDir)
      .filter(name => name.endsWith('.yml'))
      .map(name => ({ name, text: readFileSync(`${workflowDir}/${name}`, 'utf8') })),
    specs: readdirSync(testDir).filter(name => name.endsWith('.spec.ts')).sort(),
    scripts: JSON.parse(readFileSync('package.json', 'utf8')).scripts ?? {}
  };
}

// A workflow file can carry the right trigger and still run nothing, because a workflow can be
// disabled in the repository itself. That is how browser QA went quiet: the trigger was removed and
// the workflow was then disabled, and no file in the repository could show it. The state is read
// from the API whenever a token is available, and any workflow that runs a suite must be enabled.
export async function disabledWorkflowProblems(repository, { token, repo, fetchImpl = fetch } = {}) {
  if (!token || !repo) return [];
  const response = await fetchImpl(`https://api.github.com/repos/${repo}/actions/workflows?per_page=100`, {
    headers: { authorization: `Bearer ${token}`, accept: 'application/vnd.github+json' }
  });
  if (!response.ok) return [{ workflow: repo, problem: `workflow states could not be read (${response.status})` }];
  const states = new Map(((await response.json()).workflows ?? [])
    .map(workflow => [workflow.path.split('/').at(-1), workflow.state]));
  return workflowsRunningSuites(repository)
    .filter(name => states.has(name) && states.get(name) !== 'active')
    .map(name => ({ workflow: name, problem: `the workflow is ${states.get(name)} in this repository, so it runs nothing` }));
}

// The disabled-workflow question is the reason this check exists, and a repository whose workflows
// are all enabled cannot demonstrate that the answer still works. It is exercised against a
// fabricated repository on every run.
async function checkDisabledWorkflowReporting() {
  const repository = {
    configs: ['playwright.qa.config.ts'],
    specs: [],
    scripts: {},
    workflows: [{ name: 'qa.yml', text: 'on:\n  pull_request:\njobs:\n  qa:\n    steps:\n      - run: npx playwright test -c playwright.qa.config.ts\n' }]
  };
  const states = { workflows: [{ path: '.github/workflows/qa.yml', state: 'disabled_manually' }] };
  const problems = await disabledWorkflowProblems(repository, {
    token: 'coverage-self-check', repo: 'owner/repo',
    fetchImpl: async () => ({ ok: true, json: async () => states })
  });
  if (problems.length !== 1) throw new Error('A disabled workflow that runs a browser suite must be reported.');
  states.workflows[0].state = 'active';
  const enabled = await disabledWorkflowProblems(repository, {
    token: 'coverage-self-check', repo: 'owner/repo',
    fetchImpl: async () => ({ ok: true, json: async () => states })
  });
  if (enabled.length) throw new Error('An enabled workflow must not be reported.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await checkDisabledWorkflowReporting();
  const repository = readRepository();
  const problems = [
    ...browserSuiteCoverage(repository),
    ...await disabledWorkflowProblems(repository, {
      token: process.env.GITHUB_TOKEN || process.env.GH_TOKEN,
      repo: process.env.GITHUB_REPOSITORY
    })
  ];
  if (problems.length) {
    console.error('Browser suite coverage failed:');
    for (const item of problems) console.error(`  ${item.config ?? item.spec ?? item.workflow}: ${item.problem}`);
    console.error('\nRun the suite in a workflow, or add it to runByHand in this script with the reason.');
    process.exit(1);
  }
  console.log('Browser suite coverage passed.');
}
