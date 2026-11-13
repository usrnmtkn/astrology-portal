import assert from 'node:assert/strict';
import {execFileSync,spawnSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {affectedTestPlan,affectedBrowserIdentities} from './ci-test-plan.mjs';
import {identities,withShardLists} from './balanced-browser-tests.mjs';

export function runAffectedPlaywright(args,{execute=spawnSync,list=execFileSync,plan=affectedTestPlan(),cli='node_modules/@playwright/test/cli.js'}={}) {
  assert(!args.some(arg=>/^--(?:test-list|list|reporter)(?:=|$)/u.test(arg)),'Test selection/reporting is owned by the affected runner');
  const run=selection=>{
    const result=execute(process.execPath,[cli,'test',...args,...selection],{stdio:'inherit'});
    if(result.error)throw result.error;return result.status??1;
  };
  if(!plan)return run([]);
  // Discover before sharding. Each original shard then receives the same exact
  // affected list, so Playwright partitions it once without losing cases.
  const discovery=[];
  for(let i=0;i<args.length;i++) {
    if(args[i]==='--shard'){i++;continue;}
    if(args[i].startsWith('--shard='))continue;
    discovery.push(args[i]);
  }
  const report=JSON.parse(list(process.execPath,[cli,'test',...discovery,'--list','--reporter=json'],{encoding:'utf8',maxBuffer:10*1024*1024}));
  assert.equal(report.errors.length,0,'Browser discovery failed');
  const selected=affectedBrowserIdentities(identities(report),plan);
  if(!selected.length){console.log('No affected cases in this browser command.');return 0;}
  const all=identities(report),native=identities(report,{testListFiles:true});
  const selectedNames=new Set(selected);
  const rows=native.filter((_,index)=>selectedNames.has(all[index]));
  return withShardLists([{tests:rows}],files=>{
    const selectedArgs=['--test-list',files[0]];
    const proof=JSON.parse(list(process.execPath,[cli,'test',...discovery,...selectedArgs,'--list','--reporter=json'],{encoding:'utf8',maxBuffer:10*1024*1024}));
    assert.equal(proof.errors.length,0,'Affected browser list failed');
    assert.deepEqual(identities(proof).sort(),[...selected].sort(),'Affected test list lost cases before sharding');
    const resolved=JSON.parse(list(process.execPath,[cli,'test',...args,...selectedArgs,'--list','--reporter=json'],{encoding:'utf8',maxBuffer:10*1024*1024}));
    assert.equal(resolved.errors.length,0,'Affected browser selection failed');
    const actual=identities(resolved);
    assert.equal(new Set(actual).size,actual.length,'Duplicate affected browser cases');
    assert(actual.every(name=>selected.includes(name)),'Unexpected browser selection');
    if(!args.some(arg=>arg==='--shard'||arg.startsWith('--shard=')))assert.deepEqual([...actual].sort(),[...selected].sort(),'Missing affected browser cases');
    if(!actual.length){console.log('No affected cases assigned to this shard.');return 0;}
    console.log(`Running ${actual.length} affected browser cases (${selected.length} across all shards).`);
    return run(selectedArgs);
  },{preservePaths:true});
}

if(import.meta.url===pathToFileURL(process.argv[1]??'').href)process.exitCode=runAffectedPlaywright(process.argv.slice(2));
