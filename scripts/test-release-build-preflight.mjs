import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {releaseBuildEnvironment,releaseBuildPreflight} from './release-build-preflight.mjs';

const env={npm_execpath:'/synthetic/npm-cli.js',PATH:process.env.PATH,VITE_SUPABASE_URL:'wrong-browser-fixture',VITE_SUPABASE_PUBLISHABLE_KEY:'wrong-key',VITE_ENABLE_NATAL_ASPECT_PATTERNS:'leaked',VITE_UNREGISTERED_FLAG:'leaked'};
const calls=[];
const receipts=releaseBuildPreflight({env,run:(command,args,options)=>{calls.push({command,args,env:options.env});return{status:0};},onPhase(){}});
assert.equal(receipts.length,10);
assert(calls.some(call=>call.args.includes('pretest:content-studio-api')),'Standalone API types must pass without browser ambient declarations');
for(const call of calls){
  assert.equal(call.command,process.execPath,'Every child uses the actual verified Node launcher');
  for(const[key,value]of Object.entries(releaseBuildEnvironment))assert.equal(call.env[key],value);
  assert.equal(call.env.VITE_UNREGISTERED_FLAG,undefined);
  assert.equal(call.env.CI,'true');
}
const auth=calls.filter(call=>call.env.VITE_ENABLE_NATAL_ASPECT_PATTERNS==='true');
assert.equal(auth.length,2,'Only authenticated Web build and measurement use the auth profile');
assert(calls.filter(call=>call.args.includes('build:admin')||call.args.includes('scripts/check-admin-bundle-budgets.mjs')).every(call=>call.env.VITE_ENABLE_NATAL_ASPECT_PATTERNS===undefined));
let nativeCalls=0;
assert.throws(()=>releaseBuildPreflight({env,run:()=>{nativeCalls++;return{status:1};},onPhase(){}}),/before application checks/);
assert.equal(nativeCalls,1,'A broken native prerequisite never starts application builds');
const failed=[];
assert.throws(()=>releaseBuildPreflight({env,run:(_command,args)=>{failed.push(args);return{status:args.includes('build')?1:0};},onPhase(){}}),/web-default-build/);
assert(failed.some(args=>args.includes('build:admin')),'Collect independent profile failures in one preflight');
assert.equal(failed.filter(args=>args.includes('qa:bundle')).length,1,'A failed build does not measure stale artifacts');
assert.throws(()=>releaseBuildPreflight({env:{},run:()=>{throw Error('must not execute');}}),/npm run qa:release-builds/);

const workflow=readFileSync('.github/workflows/visual-smoke.yml','utf8');
const block=workflow.split('  build-preflight:\n')[1].split('\n  friends-loading-performance:')[0];
const ciEnv=Object.fromEntries([...block.matchAll(/^      (VITE_[A-Z_]+): (?:"([^"]*)"|([^\n]+))$/gmu)].map(([,key,quoted,plain])=>[key,quoted??plain]));
assert.deepEqual(ciEnv,releaseBuildEnvironment,'Local measurement inputs must match the shared hosted preflight');
assert(block.includes('VITE_ENABLE_NATAL_ASPECT_PATTERNS: "true"'));
assert(block.includes('npm run build && npm run qa:bundle'));
assert(block.includes('npm run build:web && npm run qa:bundle'));
assert(block.includes('npm run build:admin && node scripts/check-admin-bundle-budgets.mjs'));
console.log('PASS canonical CI build profiles: fixture/flag isolation, native launcher prerequisite, independent failures, fresh artifacts and workflow parity.');
