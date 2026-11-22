import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {appendFileSync, existsSync, readFileSync, readdirSync} from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import ts from 'typescript';
import {apiCommandShards} from './run-content-studio-api-shard.mjs';
import {expandMatrixValues, expandNpmScripts, specsSelectedByConfig} from './test-browser-suite-coverage.mjs';
import {apiTestCommands,validateTestPlan,preflightInventory} from './ci-test-plan.mjs';

const nonRuntime = /^(?:docs\/|README(?:\.[^/]+)?$|LICENSE(?:\.[^/]+)?$|AGENTS\.md$|CLAUDE\.md$)/u;
const infrastructure = /^(?:\.github\/workflows\/|scripts\/(?:ci-|test-ci-|check-affected-api-gate|check-browser-release-gate|test-browser-release-gate|test-browser-suite-coverage|test-content-studio-api-shards|run-content-studio-api-shard|run-affected-playwright|balanced-browser-tests|test-browser-balance)|config\/.*(?:durations|timings).*\.json$)/u;
const budget = /^scripts\/(?:(?:web|admin)-bundle-budgets\.json|check-(?:web|admin)-bundle-budgets\.mjs|release-build-preflight\.mjs)$/u;
const webUi = /^apps\/web\/src\/(?:(?:features|components|routes)\/.*\.(?:[jt]sx|css)|styles\/.*\.css)$/u;
// Browser journeys load UI through routes rather than importing its components.
// Include every source in that surface, including children passed by App.tsx.
const uiSurfaces = [
  ['friends', /(?:features\/friends\/|routes\/FriendsRoute\.|components\/FriendsPageShell\.|styles\/friends(?:-|\.))/u],
  ['you|profile', /(?:features\/you\/|routes\/YouRoute\.|styles\/you-)/u],
  ['sky', /(?:features\/sky\/|routes\/SkyRoute\.|styles\/sky(?:-|\.))/u],
  ['calendar', /(?:features\/calendar\/|routes\/CalendarRoute\.|styles\/(?:lunar-calendar|calendar-))/u],
  ['horoscopes', /(?:features\/horoscopes\/|styles\/(?:horoscopes|weekly-horoscope)\.)/u],
  ['account', /(?:features\/account\/|styles\/account-)/u],
  ['settings', /(?:routes\/SettingsRoute\.|styles\/settings(?:-|\.))/u],
  ['learn|guide', /(?:features\/learn\/|styles\/learn\.)/u],
  ['signup|login|auth', /(?:features\/auth\/|styles\/auth\.)/u],
  ['reports?', /(?:features\/reports\/|components\/reports\/|routes\/ReportRoute\.|styles\/(?:reports?-|you-reports\.))/u]
];

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
  const known = new Set(files), cache = new Map(), referenceCache = new Map(), browserCache = new Map(), browserRoutes = new Set();
  const surfaces = uiSurfaces.map(([routes,source])=>({
    route: new RegExp(`(?:#(?:${routes})|^(?:https?:\\/\\/[^/]+)?\\/(?:${routes}))(?=[/?&]|$)`,'u'),
    sources: files.filter(file=>file.startsWith('apps/web/src/')&&source.test(file.slice('apps/web/src/'.length)))
  }));
  const names = new Map();
  for (const file of files.filter(file=>file.endsWith('.sql'))) names.set(path.basename(file),file);
  function subprocessEntry(node) {
    for(let value=node;value.parent;value=value.parent) {
      const call=value.parent;
      if(!ts.isCallExpression(call))continue;
      const method=ts.isIdentifier(call.expression)?call.expression.text
        :ts.isPropertyAccessExpression(call.expression)?call.expression.name.text:null;
      const argument=call.arguments.indexOf(value);
      if(method==='fork'&&argument===0
        ||['spawn','spawnSync','execFile','execFileSync'].includes(method)&&argument>=0&&argument<=1)return true;
    }
    return false;
  }
  function resolveReferences(file, value) {
    if (names.has(value)) return [names.get(value)];
    if (value === '@tldr/astro-knowledge') return ['packages/astro-knowledge/src/index.ts'];
    if (!value.startsWith('.') && !value.startsWith('/src/') && !/^(?:api|apps|src|tests|scripts|packages|config)\//u.test(value)) return [];
    const candidates = value.startsWith('/src/') ? [`apps/web${value}`,`apps/admin${value}`]
      : [value.startsWith('.') ? path.posix.normalize(path.posix.join(path.posix.dirname(file),value)) : value];
    return candidates.flatMap(candidate=>{
      const stem = candidate.replace(/\.[cm]?js$/u,'');
      const resolved=[candidate,...['.ts','.tsx','.mts','.mjs','.js','.json','/index.ts','/index.tsx','/index.js'].map(ext=>stem+ext)].find(candidate=>known.has(candidate));
      return resolved?[resolved]:[];
    });
  }
  function dependencies(file) {
    if (cache.has(file)) return cache.get(file);
    const dependencies = new Set(),references=new Set();cache.set(file,dependencies);referenceCache.set(file,references);
    if (!/\.(?:css|[cm]?[jt]sx?)$/u.test(file) || !existsSync(path.join(root,file))) return dependencies;
    const source=readFileSync(path.join(root,file),'utf8');
    if(file.endsWith('.css')) {
      for(const [,value] of source.matchAll(/@import\s+(?:url\(\s*)?["']([^"']+)["']/gu)) {
        for(const dependency of resolveReferences(file,value))dependencies.add(dependency);
      }
      return dependencies;
    }
    if (!/\.[cm]?[jt]sx?$/u.test(file)) return dependencies;
    const ast=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true);
    function visit(node) {
      // Browser component harnesses compile real imports in stdin.contents.
      // Parse that program, rather than treating its code as inert fixture text.
      const parent=node.parent;
      if((ts.isStringLiteralLike(node)||ts.isTemplateExpression(node))&&ts.isPropertyAssignment(parent)
        &&parent.name.getText(ast)==='contents'&&ts.isPropertyAssignment(parent.parent.parent)
        &&parent.parent.parent.name.getText(ast)==='stdin'
        &&parent.parent.properties.some(property=>ts.isPropertyAssignment(property)&&property.name.getText(ast)==='resolveDir'&&property.initializer.getText(ast)==='process.cwd()')) {
        const program=ts.isTemplateExpression(node)?node.head.text+node.templateSpans.map(span=>'__interpolated__'+span.literal.text).join(''):node.text;
        const inline=ts.createSourceFile('stdin.tsx',program,ts.ScriptTarget.Latest,true);
        const imports=node=>{
          if(ts.isStringLiteralLike(node)&&(ts.isImportDeclaration(node.parent)||ts.isExportDeclaration(node.parent)
            ||ts.isCallExpression(node.parent)&&node.parent.expression.kind===ts.SyntaxKind.ImportKeyword)) {
            for(const dependency of resolveReferences('stdin.tsx',node.text))dependencies.add(dependency);
          }
          ts.forEachChild(node,imports);
        };
        imports(inline);
      }
      if(ts.isImportDeclaration(node)) {
        const clause=node.importClause;
        if(clause?.isTypeOnly||clause&&!clause.name&&clause.namedBindings&&ts.isNamedImports(clause.namedBindings)
          &&clause.namedBindings.elements.length&&clause.namedBindings.elements.every(element=>element.isTypeOnly))return;
      }
      if(ts.isExportDeclaration(node)&&(node.isTypeOnly||node.exportClause&&ts.isNamedExports(node.exportClause)
        &&node.exportClause.elements.length&&node.exportClause.elements.every(element=>element.isTypeOnly)))return;
      if (ts.isStringLiteralLike(node)) {
        const parent=node.parent;
        const call=ts.isCallExpression(parent)?parent:null;
        const method=call&&(ts.isIdentifier(call.expression)?call.expression.text:ts.isPropertyAccessExpression(call.expression)?call.expression.name.text:null);
        const module=ts.isImportDeclaration(parent)||ts.isExportDeclaration(parent)||ts.isExternalModuleReference(parent)
          ||call&&(call.expression.kind===ts.SyntaxKind.ImportKeyword||['require','ssrLoadModule'].includes(method));
        const worker=ts.isNewExpression(parent)&&ts.isIdentifier(parent.expression)&&parent.expression.text==='URL'
          &&ts.isNewExpression(parent.parent)&&ts.isIdentifier(parent.parent.expression)&&['Worker','SharedWorker'].includes(parent.parent.expression.text);
        for(const dependency of resolveReferences(file,node.text)) {
          if(module||worker||subprocessEntry(node))dependencies.add(dependency);
          // Text/fixture reads depend on these bytes, not on their imports.
          else if(/^(?:scripts|tests)\//u.test(file)||call||ts.isNewExpression(parent))references.add(dependency);
        }
      }
      ts.forEachChild(node,visit);
    }
    visit(ast);
    return dependencies;
  }
  function browserDependencies(file) {
    if(browserCache.has(file))return browserCache.get(file);
    const result=new Set();browserCache.set(file,result);
    if(!/^tests\/(?:visual|helpers)\/.*\.[cm]?[jt]sx?$/u.test(file)||!existsSync(path.join(root,file)))return result;
    const ast=ts.createSourceFile(file,readFileSync(path.join(root,file),'utf8'),ts.ScriptTarget.Latest,true);
    const addRoutes=value=>{
      if(/^(?:https?:\/\/[^/]+)?\/admin(?:[/?#.]|$)/u.test(value))browserRoutes.add(file);
      for(const surface of surfaces)if(surface.route.test(value)||value.endsWith('/#')) {
        browserRoutes.add(file);
        for(const source of surface.sources)result.add(source);
      }
    };
    function visit(node) {
      if(ts.isStringLiteralLike(node))addRoutes(node.text);
      if(ts.isTemplateExpression(node)) {
        addRoutes(node.head.text);
        for(const span of node.templateSpans)addRoutes(span.literal.text);
      }
      ts.forEachChild(node,visit);
    }
    visit(ast);
    return result;
  }
  function reaches(roots, changed, browser=false, ui=false) {
    const routeKnown=browser&&roots.some(file=>{browserDependencies(file);return browserRoutes.has(file);});
    const seen = new Set(), pending=[...roots];
    while(pending.length) {
      const file=pending.pop();
      if(changed.has(file))return true;
      if(seen.has(file))continue;seen.add(file);
      // Route evidence supplies the rendered children. Importing an App helper
      // does not mean a Sky journey renders every Friends and Calendar view.
      if(ui&&routeKnown&&file==='apps/web/src/App.tsx')continue;
      pending.push(...dependencies(file));
      if([...referenceCache.get(file)??[]].some(reference=>changed.has(reference)))return true;
      if(browser)pending.push(...browserDependencies(file));
    }
    return false;
  }
  return {reaches, reachesBrowser:(roots,changed,ui=false)=>reaches(roots,changed,true,ui),
    appImports:file=>dependencies('apps/web/src/App.tsx').has(file)};
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
    if(file==='.github/workflows/visual-smoke.yml') {
      runnableSpecs.forEach(spec=>selected.add(spec));
      build=true;
      reasons.push('browser workflow topology');
      continue;
    }
    if(nonRuntime.test(file)||infrastructure.test(file))continue;
    if(budget.test(file)){
      build=true;
      for(const command of commands)if(graph.reaches(commandSources(command,pkg.scripts),new Set([file])))api.add(command);
      continue;
    }
    if(file.startsWith('tests/visual/')) {
      const snapshot=file.match(/^(tests\/visual\/[\w.-]+\.spec\.ts)-snapshots\//u)?.[1];
      if(runnableSpecs.has(snapshot??file))selected.add(snapshot??file);
      continue;
    }
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
    const styling=/^apps\/(?:admin|web)\/.*\.css$/u.test(file);
    let known=false;
    if(!styling)for(const command of commands)if(graph.reaches(commandSources(command,pkg.scripts),changed)){api.add(command);known=true;}
    let browserKnown=false;
    for(const spec of runnableSpecs)if(graph.reachesBrowser([spec],changed,webUi.test(file))){selected.add(spec);known=true;browserKnown=true;}
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
    if(webUi.test(file)) {
      const surfaceOwned=uiSurfaces.some(([,source])=>source.test(file.slice('apps/web/src/'.length)));
      const shared=styling&&!surfaceOwned||!surfaceOwned&&graph.appImports(file);
      if(shared||!browserKnown) {
        runnableSpecs.forEach(spec=>selected.add(spec));
        build=true;reasons.push(`shared or unmapped UI: ${file}`);
      }
      continue;
    }
    if(/^src\/shared\/natal/u.test(file)) {for(const spec of runnableSpecs)if(/natal|content-dashboard-admin/u.test(spec))selected.add(spec);continue;}
    if(file.startsWith('api/')) {if(!known){all=true;reasons.push(`unmapped API source: ${file}`);}continue;}
    if(/^src\/astro-writing\/|^scripts\/assert-/u.test(file)) {
      if(!known){all=true;reasons.push(`unmapped writing or assertion source: ${file}`);}
      continue;
    }
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
  assert(process.argv.length===2||process.argv.length===3&&process.argv[2]==='--json'||process.argv.length===4&&process.argv[2]==='--preflight-report','Usage: node scripts/ci-affected-tests.mjs [--json | --preflight-report receipts.json]');
  const plan=createAffectedPlan(revisionRange());
  if(process.argv[2]==='--preflight-report') {
    const report=preflightInventory(plan,JSON.parse(readFileSync(process.argv[3],'utf8')).receipts);
    console.log(JSON.stringify(report));
    process.exitCode=report.status==='PASS'?0:1;
  } else {
  const outputs={test_plan:JSON.stringify(plan),api_needed:String(plan.apiShards.length>0),api_shards:JSON.stringify(plan.apiShards)};
  for(const job of Object.keys(browserJobCatalog(process.cwd(),JSON.parse(readFileSync('package.json','utf8')).scripts,plan.browserSpecs)))outputs[job.replaceAll('-','_')]=String(plan.browserJobs.includes(job));
  const lines=Object.entries(outputs).map(([key,value])=>`${key}=${value}`).join('\n')+'\n';
  if(process.env.GITHUB_OUTPUT)appendFileSync(process.env.GITHUB_OUTPUT,lines);
  console.log(JSON.stringify(process.argv[2]==='--json'?plan:{head:plan.head,changedFiles:plan.files.length,apiCommands:plan.apiCommands.length,apiShards:plan.apiShards,browserSpecs:plan.browserSpecs.length,browserJobs:plan.browserJobs,reasons:plan.reasons}));
  }
}
