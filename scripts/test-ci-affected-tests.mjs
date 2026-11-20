import assert from 'node:assert/strict';
import {execFileSync,spawnSync} from 'node:child_process';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync,realpathSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createAffectedPlan,createDependencyGraph,revisionRange} from './ci-affected-tests.mjs';
import {validateTestPlan,apiTestCommands} from './ci-test-plan.mjs';
import {checkAffectedApiGate} from './check-affected-api-gate.mjs';
import {runAffectedPlaywright} from './run-affected-playwright.mjs';

const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const pkg=JSON.parse(readFileSync('package.json','utf8'));
const planFor=files=>createAffectedPlan({files,head,base:head,previousPackage:JSON.parse(execFileSync('git',['show','HEAD:package.json'],{encoding:'utf8'}))});
const documentation=planFor(['docs/qa/example.md']);
assert.equal(documentation.apiCommands.length,0);assert.equal(documentation.browserJobs.length,0);
const browser=planFor(['tests/visual/studio-owner-publishing.spec.ts']);
assert.equal(browser.apiCommands.length,0);assert.deepEqual(browser.browserSpecs,['tests/visual/studio-owner-publishing.spec.ts']);
assert.deepEqual(browser.browserJobs,['studio-admin-flows']);assert.equal(browser.postgres,false);
const infrastructure=planFor(['.github/workflows/content-studio-api.yml','scripts/ci-test-plan.mjs','scripts/run-affected-playwright.mjs']);
assert.equal(infrastructure.apiCommands.length,0);assert.equal(infrastructure.browserJobs.length,0);
const browserWorkflow=planFor(['.github/workflows/visual-smoke.yml']);
assert(browserWorkflow.browserJobs.includes('studio-admin-flows'),'Changing the Studio Admin matrix must exercise its exact-head shards');
assert(browserWorkflow.browserSpecs.length>0,'Browser workflow topology cannot pass with every browser job skipped');
const styling=planFor(['apps/admin/src/studio-system.css']);
assert.equal(styling.apiCommands.length,0);assert(styling.browserJobs.length>1);
const budgetChecker=planFor(['scripts/check-admin-bundle-budgets.mjs']);
assert.equal(budgetChecker.apiCommands.length,0);
assert.deepEqual(budgetChecker.browserJobs,['visual-smoke'],'A budget checker change must execute the build preflight without unrelated browser journeys');
const natal=planFor(['src/shared/natalSectPlacement.ts','api/admin/natal-placement-preview.ts']);
assert(natal.apiCommands.some(command=>command.includes('test-natal-editorial-library')));
assert(natal.apiCommands.some(command=>command.includes('test-admin-natal-placement-preview-api')));
assert(natal.apiCommands.length<apiTestCommands(pkg).length,'A domain change must not select the whole API suite');
assert(natal.browserSpecs.includes('tests/visual/natal-friend-publication.spec.ts'));
assert(!natal.browserSpecs.includes('tests/visual/report-library-ui.spec.ts'));
const unknown=planFor(['new-unclassified-runtime.ts']);
assert.equal(unknown.apiCommands.length,apiTestCommands(pkg).length);assert(unknown.reasons.length);
const writing=planFor(['src/astro-writing/forecastProseDevelopment.cjs','scripts/assert-horoscope-request-evidence.mjs']);
assert(writing.apiCommands.some(command=>command.includes('test-lunation-saved-writing')),'Retain the lunar writer consumer');
assert(writing.apiCommands.some(command=>command.includes('test-horoscope-monthly')),'Retain the Monthly writer consumer');
assert(writing.apiCommands.length<apiTestCommands(pkg).length,'Indexed writing modules must use their actual API consumers');
assert(writing.browserSpecs.includes('tests/visual/horoscope-model-choice.spec.ts'),'Retain the forked actual-handler browser consumer');
assert(!writing.browserSpecs.includes('tests/visual/friends-loading-performance.spec.ts'),'A writer change must not select unrelated Friends loading');
const unknownWriter=planFor(['src/astro-writing/unmapped-source.cjs']);
assert.equal(unknownWriter.apiCommands.length,unknown.apiCommands.length,'Unmapped writing sources retain the conservative fallback');
assert.deepEqual(unknownWriter.browserSpecs,unknown.browserSpecs);
const friendsUiFiles=[
  'apps/web/src/features/friends/CompatibilityTab.tsx',
  'apps/web/src/features/friends/FriendProfileChartRail.tsx',
  'apps/web/src/features/friends/ManualChartsPanel.tsx',
  'apps/web/src/styles/friends-detail.css',
  'scripts/test-friend-placement-tables-render.mjs',
  'tests/visual/client-facing-user-flows.spec.ts'
];
const friendsUi=planFor(friendsUiFiles);
assert(friendsUi.apiCommands.length<5,'Friends presentation must not expand to the complete API catalog');
assert(friendsUi.apiCommands.includes('node --import tsx scripts/test-composite-writeups-render.mjs'),'Retain the actual SSR consumer of App');
assert.equal(friendsUi.postgres,false);assert.equal(friendsUi.weeklyPostgres,false);assert.equal(friendsUi.variables,false);
for(const name of ['client-facing-user-flows','friends-loading-performance','friends-pair-forecast','connection-transit-separation','natal-friend-publication']) {
  assert(friendsUi.browserSpecs.includes(`tests/visual/${name}.spec.ts`),`Missing Friends journey ${name}`);
}
for(const name of ['sky-live-clock','calendar-month-overview','horoscope-model-choice','studio-variable-crud','report-library-ui']) {
  assert(!friendsUi.browserSpecs.includes(`tests/visual/${name}.spec.ts`),`Unrelated journey ${name}`);
}
assert(friendsUi.browserSpecs.length<unknown.browserSpecs.length/3,'Friends UI must stay surface-scoped');
assert(!friendsUi.reasons.some(reason=>reason.startsWith('shared or unclassified')));
const friendsStyle=planFor(['apps/web/src/styles/friends-detail.css']);
assert.equal(friendsStyle.apiCommands.length,0);assert(friendsStyle.browserSpecs.includes('tests/visual/friends-pair-forecast.spec.ts'));
assert(!friendsStyle.browserSpecs.includes('tests/visual/sky-live-clock.spec.ts'));
const skyUi=planFor(['apps/web/src/features/sky/SkyDatePicker.tsx']);
assert(skyUi.browserSpecs.includes('tests/visual/sky-live-clock.spec.ts'));
assert(!skyUi.browserSpecs.includes('tests/visual/horoscope-model-choice.spec.ts'));
const theme=planFor(['apps/web/src/styles/theme.css']);
assert.equal(theme.apiCommands.length,0);assert.deepEqual(theme.browserSpecs,unknown.browserSpecs,'Shared theme retains all browser surfaces');
const unmappedUi=planFor(['apps/web/src/components/NewUnmappedCard.tsx']);
assert.equal(unmappedUi.apiCommands.length,0);assert.deepEqual(unmappedUi.browserSpecs,unknown.browserSpecs,'An unmapped UI component retains broad browser coverage');
const globalUi=planFor(['apps/web/src/components/PageLoading.tsx']);
assert.deepEqual(globalUi.browserSpecs,unknown.browserSpecs,'Shared App UI retains all browser surfaces');
assert.throws(()=>revisionRange({PR_BASE_SHA:'bad',HEAD_SHA:head}));
assert.throws(()=>validateTestPlan({...browser,head:'b'.repeat(40)},{head}));
assert.throws(()=>validateTestPlan({...browser,apiCommands:['node scripts/not-registered.mjs'],apiShards:[3]},{commands:apiTestCommands(pkg)}));
assert.throws(()=>validateTestPlan({...natal,apiShards:[]}));
assert.throws(()=>validateTestPlan({...browser,browserSpecs:['../private.spec.ts']}));
assert.throws(()=>validateTestPlan({...browser,browserSpecs:[...browser.browserSpecs,...browser.browserSpecs]}));
checkAffectedApiGate('success','skipped',documentation);
checkAffectedApiGate('success','success',natal);
for(const result of ['failure','cancelled','skipped',undefined])assert.throws(()=>checkAffectedApiGate('success',result,natal));
for(const result of ['failure','cancelled','skipped'])assert.throws(()=>checkAffectedApiGate(result,'success',natal));
assert.throws(()=>checkAffectedApiGate('success','skipped',null));

const directory=realpathSync(mkdtempSync(path.join(tmpdir(),'affected-ci-contract-')));
const fixtureFiles=new Set();
const write=(name,text)=>{fixtureFiles.add(name);mkdirSync(path.dirname(path.join(directory,name)),{recursive:true});writeFileSync(path.join(directory,name),text);};
try {
  const output=path.join(directory,'scope-output.txt');
  const selector=fileURLToPath(new URL('./ci-affected-tests.mjs',import.meta.url));
  const cliEnv={PATH:process.env.PATH,HEAD_SHA:head,AFFECTED_BASE_SHA:head,GITHUB_OUTPUT:output};
  const empty=JSON.parse(execFileSync(process.execPath,[selector,'--json'],{env:cliEnv,encoding:'utf8'}));
  assert.equal(empty.apiCommands.length,0);assert.equal(empty.browserJobs.length,0);
  const outputs=Object.fromEntries(readFileSync(output,'utf8').trim().split('\n').map(line=>{const index=line.indexOf('=');return [line.slice(0,index),line.slice(index+1)];}));
  assert.equal(outputs.api_needed,'false');assert.equal(outputs.studio_admin_flows,'false');
  assert.equal(JSON.parse(outputs.test_plan).head,head);
  assert.notEqual(spawnSync(process.execPath,[selector,'--unknown'],{env:cliEnv,stdio:'pipe'}).status,0);
  write('src/shared.ts','export const value=1;');
  write('src/reexport.ts',"export {value} from './shared.js';");
  write('tests/worker.mts',"await import('../src/reexport.js'); const file=new URL('../apps/web/supabase/migrations/example.sql',import.meta.url);");
  write('tests/test.mjs',"require('./worker.mts');");
  write('tests/sql-only.mts',"const migrations=['example.sql'];");
  write('apps/web/supabase/migrations/example.sql','select 1;');
  const graph=createDependencyGraph(directory,['src/shared.ts','src/reexport.ts','tests/worker.mts','tests/test.mjs','tests/sql-only.mts','apps/web/supabase/migrations/example.sql']);
  assert(graph.reaches(['tests/test.mjs'],new Set(['src/shared.ts'])),'Transitive source and JS-to-TS resolution');
  assert(graph.reaches(['tests/test.mjs'],new Set(['apps/web/supabase/migrations/example.sql'])),'SQL dependency');
  assert(graph.reaches(['tests/sql-only.mts'],new Set(['apps/web/supabase/migrations/example.sql'])),'Literal migration catalog');
  assert(!graph.reaches(['tests/test.mjs'],new Set(['src/other.ts'])));

  write('src/types-only.ts',"import type {Value} from './shared.js'; export {type Value as Other} from './shared.js';");
  write('src/metadata.ts',"export const sources=[{path:'src/shared.ts'}];");
  write('src/raw.ts',"import './shared.js';");
  write('tests/text.mts',"import{readFileSync}from'node:fs';readFileSync('../src/raw.ts','utf8');");
  write('apps/web/src/App.tsx',"import './features/friends/Card'; import './features/sky/Card';");
  write('apps/web/src/features/friends/Card.tsx',"import './card.css'; export const Card=()=>null;");
  write('apps/web/src/features/friends/card.css',"@import './palette.css';");
  write('apps/web/src/features/friends/palette.css','');
  write('apps/web/src/features/sky/Card.tsx','export const Card=()=>null;');
  write('tests/visual/friends.spec.ts',"const route=`/#friends?chart=${'fixture'}`;");
  write('tests/visual/sky.spec.ts',"import '../../apps/web/src/App'; const route='/#sky';");
  write('tests/visual/admin.spec.ts',"import '../../apps/web/src/App'; const route='/admin/index.html';");
  write('tests/visual/unknown-route.spec.ts',"import '../../apps/web/src/App';");
  write('tests/visual/dynamic-route.spec.ts',"const route=`/#${name}`;");
  write('tests/ssr.mts',"server.ssrLoadModule('/src/features/friends/Card.tsx');");
  write('src/worker.ts',"import './shared.js';");
  write('src/worker-loader.ts',"new Worker(new URL('./worker.ts',import.meta.url));");
  write('src/process-shared.cjs','module.exports=1;');
  write('tests/process-helper.mts',"const value=require('../src/process-shared.cjs');");
  write('tests/forked.mjs',"fork(path.resolve('tests/process-helper.mts'),[]);");
  write('tests/spawned.mjs',"spawn(process.execPath,['--import','tsx',path.resolve('tests/process-helper.mts')]);");
  const uiGraph=createDependencyGraph(directory,[...fixtureFiles]);
  const friendCard=new Set(['apps/web/src/features/friends/Card.tsx']);
  assert(!uiGraph.reaches(['src/types-only.ts'],new Set(['src/shared.ts'])),'Type-only imports and exports do not execute a module');
  assert(!uiGraph.reaches(['src/metadata.ts'],new Set(['src/shared.ts'])),'Source path metadata is not an import');
  assert(uiGraph.reaches(['tests/text.mts'],new Set(['src/raw.ts'])),'Text reads depend on the exact file');
  assert(!uiGraph.reaches(['tests/text.mts'],new Set(['src/shared.ts'])),'Reading source text must not execute its imports');
  assert(uiGraph.reaches(['src/worker-loader.ts'],new Set(['src/shared.ts'])),'Worker URL imports remain transitive');
  assert(uiGraph.reaches(['tests/forked.mjs'],new Set(['src/process-shared.cjs'])),'Forked helpers retain their transitive CommonJS consumers');
  assert(uiGraph.reaches(['tests/spawned.mjs'],new Set(['src/process-shared.cjs'])),'Node subprocess helpers retain their transitive consumers');
  assert(uiGraph.reaches(['tests/ssr.mts'],friendCard),'Resolve Vite SSR /src modules');
  assert(!uiGraph.reaches(['tests/visual/friends.spec.ts'],friendCard),'Browser route evidence must not create API dependencies');
  assert(uiGraph.reachesBrowser(['tests/visual/friends.spec.ts'],friendCard,true),'A route journey covers its composed UI');
  assert(!uiGraph.reachesBrowser(['tests/visual/sky.spec.ts'],friendCard,true),'An App helper import must not render unrelated views');
  assert(!uiGraph.reachesBrowser(['tests/visual/admin.spec.ts'],friendCard,true),'Studio navigation must not render the public App');
  assert(uiGraph.reachesBrowser(['tests/visual/unknown-route.spec.ts'],friendCard,true),'Unknown App journeys retain broad coverage');
  assert(uiGraph.reachesBrowser(['tests/visual/dynamic-route.spec.ts'],friendCard,true),'Dynamic route selection retains all possible surfaces');
  assert(uiGraph.reachesBrowser(['tests/visual/friends.spec.ts'],new Set(['apps/web/src/features/friends/palette.css']),true),'Follow stylesheet imports');
  for(const file of fixtureFiles)if(file.startsWith('tests/visual/')&&file.endsWith('.spec.ts'))rmSync(path.join(directory,file));

  const commands=['node scripts/a.mjs','node scripts/b.mjs'];
  write('package.json',JSON.stringify({type:'module',scripts:{'test:content-studio-api':commands.join(' && '),'qa:admin-bundle':''}}));
  write('scripts/a.mjs',"throw new Error('Unselected command executed');");
  write('scripts/b.mjs',"import{appendFileSync}from'node:fs';appendFileSync('executed.txt','B');");
  execFileSync('git',['init','--quiet'],{cwd:directory});
  execFileSync('git',['add','.'],{cwd:directory});
  execFileSync('git',['-c','user.name=Fixture','-c','user.email=fixture@example.invalid','commit','--quiet','-m','Synthetic selection fixture'],{cwd:directory});
  const fixtureHead=execFileSync('git',['rev-parse','HEAD'],{cwd:directory,encoding:'utf8'}).trim();
  const fixturePlan={...documentation,head:fixtureHead,apiCommands:[commands[1]],apiShards:[3]};
  const runner=fileURLToPath(new URL('./run-content-studio-api-shard.mjs',import.meta.url));
  const run=()=>spawnSync(process.execPath,[runner,'--shard','3'],{cwd:directory,env:{PATH:process.env.PATH,CI_AFFECTED_TEST_PLAN:JSON.stringify(fixturePlan)},encoding:'utf8'});
  assert.equal(run().status,0);assert.equal(readFileSync(path.join(directory,'executed.txt'),'utf8'),'B');
  write('scripts/b.mjs','process.exit(7);');assert.equal(run().status,7,'Selected child failure must fail the shard');
  fixturePlan.head='b'.repeat(40);assert.notEqual(run().status,0,'Stale revision plan must fail before execution');

  const playwright=fileURLToPath(new URL('../node_modules/@playwright/test/index.mjs',import.meta.url));
  const log=path.join(directory,'browser.txt');
  const source=label=>`import {test} from ${JSON.stringify(playwright)};import{appendFileSync}from'node:fs';test('${label}',()=>appendFileSync(${JSON.stringify(log)},'${label}'));`;
  write('tests/visual/a.spec.ts',source('A'));write('tests/visual/b.spec.ts',source('B'));
  write('playwright.config.ts',`export default {testDir:'./tests/visual',reporter:'list',workers:1,outputDir:${JSON.stringify(path.join(directory,'results'))}};`);
  const selected={...documentation,browserSpecs:['tests/visual/a.spec.ts'],browserJobs:['fixture']};
  for(const shard of ['1/2','2/2'])assert.equal(runAffectedPlaywright(['-c',path.join(directory,'playwright.config.ts'),`--shard=${shard}`],{plan:selected}),0);
  assert.equal(readFileSync(log,'utf8'),'A','Actual CLI shards execute the complete selected union once and omit B');
  write('playwright.studio-admin-flows.config.ts',readFileSync(path.join(directory,'playwright.config.ts'),'utf8'));
  write('config/studio-admin-flow-test-durations.json',JSON.stringify({fallbackSeconds:1,durations:{}}));
  writeFileSync(log,'');
  const balanced=new URL('./balanced-browser-tests.mjs',import.meta.url).href;
  const cli=fileURLToPath(new URL('../node_modules/@playwright/test/cli.js',import.meta.url));
  const balancedPlan={...selected,head:fixtureHead};
  for(const shard of ['1/7','7/7']) {
    const code=`import{main}from ${JSON.stringify(balanced)};process.exitCode=main(['--config','playwright.studio-admin-flows.config.ts',${JSON.stringify(shard)}],{cli:${JSON.stringify(cli)}});`;
    const result=spawnSync(process.execPath,['--input-type=module','-e',code],{cwd:directory,env:{PATH:process.env.PATH,CI_AFFECTED_TEST_PLAN:JSON.stringify(balancedPlan)},encoding:'utf8'});
    assert.equal(result.status,0,result.stderr);
  }
  assert.equal(readFileSync(log,'utf8'),'A','Balanced actual CLI runs the selected file once and accepts proved empty shards');
  write('tests/visual/a.spec.ts',`import{test}from ${JSON.stringify(playwright)};test('failed affected case',()=>{throw new Error('Synthetic selected failure');});`);
  assert.notEqual(runAffectedPlaywright(['-c',path.join(directory,'playwright.config.ts')],{plan:selected,execute:(...args)=>spawnSync(args[0],args[1],{stdio:'pipe'})}),0,'Browser failure must propagate');
} finally {rmSync(directory,{recursive:true,force:true});}
console.log('PASS affected selection: Friends and Sky UI scope; shared theme/App UI and unknown fallbacks; runtime versus type/text/metadata dependencies; routes, CSS, SSR, workers and SQL; stale/malformed/missing plans; required-gate failures; actual selected API/browser execution, sharded union and failure propagation.');
