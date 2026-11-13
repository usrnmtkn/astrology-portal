import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {appendFileSync, existsSync, readFileSync, readdirSync} from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import ts from 'typescript';
import {apiCommandShards} from './run-content-studio-api-shard.mjs';
import {expandMatrixValues, expandNpmScripts, specsSelectedByConfig} from './test-browser-suite-coverage.mjs';
import {apiTestCommands,validateTestPlan} from './ci-test-plan.mjs';

const nonRuntime = /^(?:docs\/|README(?:\.[^/]+)?$|LICENSE(?:\.[^/]+)?$|AGENTS\.md$|CLAUDE\.md$)/u;
const infrastructure = /^(?:\.github\/workflows\/|scripts\/(?:ci-|test-ci-|check-affected-api-gate|check-browser-release-gate|test-browser-release-gate|test-browser-suite-coverage|test-content-studio-api-shards|run-content-studio-api-shard|run-affected-playwright|balanced-browser-tests|test-browser-balance)|config\/.*(?:durations|timings).*\.json$)/u;
const budget = /^scripts\/(?:web|admin)-bundle-budgets\.json$/u;

export function browserJobCatalog(root, scripts, specs) {
  const workflow = readFileSync(path.join(root,'.github/workflows/visual-smoke.yml'),'utf8');
  const source = workflow.slice(workflow.indexOf('jobs:\n')+6);
  const configs = readdirSync(root).filter(file => /^playwright\..*\.config\.ts$/u.test(file));
  const jobs = {};
  const sections = [...source.matchAll(/^  ([\w-]+):\n([\s\S]*?)(?=^  [\w-]+:\n|^env:|$(?![\s\S]))/gmu)];
  for (const [,name,body] of sections) {
    if (['scope','browser-release-gate'].includes(name)) continue;
    const text = expandNpmScripts(expandMatrixValues(body),scripts);
    const selected = new Set(specs.filter(file => text.includes(path.basename(file))));
    for (const config of configs.filter(file => text.includes(file))) {
      for (const spec of specsSelectedByConfig(readFileSync(path.join(root,config),'utf8'),specs.map(file=>path.basename(file)))) selected.add(`tests/visual/${spec}`);
    }
    jobs[name] = [...selected].sort();
  }
  assert(Object.keys(jobs).length >= 10,'Browser workflow catalog is incomplete');
  return jobs;
}

export function createDependencyGraph(root, files) {
  const known = new Set(files), cache = new Map();
  const names = new Map();
  for (const file of files.filter(file=>file.endsWith('.sql'))) names.set(path.basename(file),file);
  function resolveReference(file, value) {
    if (names.has(value)) return names.get(value);
    if (value === '@tldr/astro-knowledge') return 'packages/astro-knowledge/src/index.ts';
    if (!value.startsWith('.') && !/^(?:api|apps|src|tests|scripts|packages|config)\//u.test(value)) return null;
    const candidate = value.startsWith('.') ? path.posix.normalize(path.posix.join(path.posix.dirname(file),value)) : value;
    const stem = candidate.replace(/\.[cm]?js$/u,'');
    return [candidate,...['.ts','.tsx','.mts','.mjs','.js','.json','/index.ts','/index.tsx','/index.js'].map(ext=>stem+ext)].find(candidate=>known.has(candidate)) ?? null;
  }
  function dependencies(file) {
    if (cache.has(file)) return cache.get(file);
    const dependencies = new Set();cache.set(file,dependencies);
    if (!/\.[cm]?[jt]sx?$/u.test(file) || !existsSync(path.join(root,file))) return dependencies;
    const ast=ts.createSourceFile(file,readFileSync(path.join(root,file),'utf8'),ts.ScriptTarget.Latest,true);
    function visit(node) {
      if (ts.isStringLiteralLike(node)) {
        const dependency=resolveReference(file,node.text);
        if (dependency) dependencies.add(dependency);
      }
      ts.forEachChild(node,visit);
    }
    visit(ast);
    return dependencies;
  }
  function reaches(roots, changed) {
    const seen = new Set(), pending=[...roots];
    while(pending.length) {
      const file=pending.pop();
      if(changed.has(file))return true;
      if(seen.has(file))continue;seen.add(file);
      pending.push(...dependencies(file));
    }
    return false;
  }
  return {reaches};
}

export function commandSources(command,scripts,seen=new Set()) {
  const result=new Set(command.match(/(?:api|apps|src|tests|scripts|packages)\/[\w./-]+\.[cm]?[jt]sx?/gu)??[]);
  for(const [,name] of command.matchAll(/npm run ([\w:-]+)/gu)) {
    if(seen.has(name))continue;seen.add(name);
    for(const file of commandSources(scripts[name]??'',scripts,seen))result.add(file);
  }
  return [...result];
}

export function createAffectedPlan({root=process.cwd(),files,head,base,previousPackage}) {
  assert(Array.isArray(files),'Changed files must be resolved before test selection');
  files=[...new Set(files)].sort();
  const pkg=JSON.parse(readFileSync(path.join(root,'package.json'),'utf8'));
  const commands=apiTestCommands(pkg);
  apiCommandShards(commands.join(' && '));
  const tracked=execFileSync('git',['ls-files','-z'],{cwd:root,encoding:'utf8'}).split('\0').filter(Boolean);
  const universe=[...new Set([...tracked,...files])];
  const specs=tracked.filter(file=>/^tests\/visual\/[^/]+\.spec\.ts$/u.test(file)&&existsSync(path.join(root,file)));
  const jobs=browserJobCatalog(root,pkg.scripts,specs);
  const runnableSpecs=new Set(Object.values(jobs).flat());
  const graph=createDependencyGraph(root,universe);
  const selected=new Set(),api=new Set(),reasons=[];
  let all=false,build=false;
  for(const file of files) {
    if(nonRuntime.test(file)||infrastructure.test(file))continue;
    if(budget.test(file)){build=true;continue;}
    if(file.startsWith('tests/visual/')) {if(runnableSpecs.has(file))selected.add(file);continue;}
    if(/^apps\/(?:admin|web)\/.*\.css$/u.test(file)){runnableSpecs.forEach(spec=>selected.add(spec));build=true;continue;}
    if(file==='package.json') {
      assert(previousPackage,'Package changes require the base package manifest');
      const withoutScripts=value=>Object.fromEntries(Object.entries(value).filter(([key])=>key!=='scripts'));
      if(JSON.stringify(withoutScripts(pkg))!==JSON.stringify(withoutScripts(previousPackage))){all=true;reasons.push('package metadata or dependencies');continue;}
      const changedNames=new Set([...new Set([...Object.keys(pkg.scripts),...Object.keys(previousPackage.scripts??{})])].filter(name=>pkg.scripts[name]!==previousPackage.scripts?.[name]));
      if([...changedNames].some(name=>!/^(?:test|qa|privacy)(?::|$)/u.test(name))){all=true;reasons.push('build or runtime script');continue;}
      const prior=new Set((previousPackage.scripts?.['test:content-studio-api']??'').split(' && '));
      for(const command of commands)if(!prior.has(command)||[...changedNames].some(name=>name!=='test:content-studio-api'&&command.includes(`npm run ${name}`)))api.add(command);
      continue;
    }
    const changed=new Set([file]);
    let known=false;
    for(const command of commands)if(graph.reaches(commandSources(command,pkg.scripts),changed)){api.add(command);known=true;}
    for(const spec of runnableSpecs)if(graph.reaches([spec],changed)){selected.add(spec);known=true;}
    if(/^playwright\..*\.config\.ts$/u.test(file)) {
      if(file==='playwright.config.ts')for(const spec of runnableSpecs)selected.add(spec);
      else for(const spec of specsSelectedByConfig(readFileSync(path.join(root,file),'utf8'),specs.map(file=>path.basename(file))))selected.add(`tests/visual/${spec}`);
      continue;
    }
    if(file.startsWith('apps/admin/')) {
      build=true;
      const narrow=/(?:Natal|natal|EmptyHouse|emptyHouse|houseTransit)/u.test(file);
      for(const spec of runnableSpecs)if(narrow?/natal|empty-house|house-transit|house-natal|content-dashboard-admin/u.test(spec):['studio-admin-flows','studio-preview-suites','sky-placement-studio'].some(job=>jobs[job]?.includes(spec)))selected.add(spec);
      continue;
    }
    if(/^src\/shared\/natal/u.test(file)) {for(const spec of runnableSpecs)if(/natal|content-dashboard-admin/u.test(spec))selected.add(spec);continue;}
    if(file.startsWith('api/')) {if(!known){all=true;reasons.push(`unmapped API source: ${file}`);}continue;}
    if(/^scripts\/test-/u.test(file))continue;
    if(file.startsWith('tests/helpers/')){if(!known){all=true;reasons.push(`unmapped test dependency: ${file}`);}continue;}
    if(file.startsWith('apps/web/supabase/migrations/')) {if(!known){all=true;reasons.push(`unmapped migration: ${file}`);}continue;}
    all=true;reasons.push(`shared or unclassified dependency: ${file}`);
  }
  if(all){commands.forEach(command=>api.add(command));runnableSpecs.forEach(spec=>selected.add(spec));build=true;}
  const apiCommands=commands.filter(command=>api.has(command));
  const postgres=all||files.some(file=>!file.startsWith('tests/visual/')&&/content.*publication|generated-content\.ts$|content_studio|private_revisions.*\.sql$|test-content-studio-publication-concurrency/u.test(file));
  const weeklyPostgres=all||files.some(file=>/weekly.*checkpoint|test-weekly-checkpoint-postgres/u.test(file));
  const variables=all||files.some(file=>/studio[-/]variable|studioVariable/u.test(file));
  const shards=apiCommands.length?apiCommandShards(apiCommands.join(' && ')): [[],[],[]];
  const apiShards=shards.flatMap((commands,index)=>commands.length||index===0&&(postgres||weeklyPostgres||variables)?[index+1]:[]);
  const browserSpecs=[...selected].sort();
  const browserJobs=Object.entries(jobs).filter(([job,specs])=>job==='visual-smoke'&&build||specs.some(spec=>selected.has(spec))).map(([job])=>job);
  const plan={schema:'affected-tests/v1',base,head,files,apiCommands,apiShards,postgres,weeklyPostgres,variables,browserSpecs,browserJobs,reasons};
  return validateTestPlan(plan,{head,commands});
}

export function revisionRange(env=process.env) {
  const head=env.HEAD_SHA||execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
  let base=env.PR_BASE_SHA||env.PUSH_BASE_SHA||env.AFFECTED_BASE_SHA;
  if(!base||/^0+$/u.test(base))base=execFileSync('git',['rev-parse',env.EVENT_NAME==='workflow_dispatch'?'HEAD^':'origin/main'],{encoding:'utf8'}).trim();
  assert(/^[a-f0-9]{40}$/iu.test(base)&&/^[a-f0-9]{40}$/iu.test(head),'Invalid revision range');
  if(env.PR_BASE_SHA)base=execFileSync('git',['merge-base',base,head],{encoding:'utf8'}).trim();
  const files=execFileSync('git',['diff','--no-renames','--name-only','-z',base,head],{encoding:'utf8'}).split('\0').filter(Boolean);
  const previousPackage=files.includes('package.json')?JSON.parse(execFileSync('git',['show',`${base}:package.json`],{encoding:'utf8'})):undefined;
  return {base,head,files,previousPackage};
}

if(import.meta.url===pathToFileURL(process.argv[1]??'').href) {
  assert(process.argv.length===2||process.argv.length===3&&process.argv[2]==='--json','Usage: node scripts/ci-affected-tests.mjs [--json]');
  const plan=createAffectedPlan(revisionRange());
  const outputs={test_plan:JSON.stringify(plan),api_needed:String(plan.apiShards.length>0),api_shards:JSON.stringify(plan.apiShards)};
  for(const job of Object.keys(browserJobCatalog(process.cwd(),JSON.parse(readFileSync('package.json','utf8')).scripts,plan.browserSpecs)))outputs[job.replaceAll('-','_')]=String(plan.browserJobs.includes(job));
  const lines=Object.entries(outputs).map(([key,value])=>`${key}=${value}`).join('\n')+'\n';
  if(process.env.GITHUB_OUTPUT)appendFileSync(process.env.GITHUB_OUTPUT,lines);
  console.log(JSON.stringify(process.argv[2]==='--json'?plan:{head:plan.head,changedFiles:plan.files.length,apiCommands:plan.apiCommands.length,apiShards:plan.apiShards,browserSpecs:plan.browserSpecs.length,browserJobs:plan.browserJobs,reasons:plan.reasons}));
}
