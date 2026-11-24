import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {checkedWebBuild} from './build-web-checked.mjs';

const root=mkdtempSync(join(tmpdir(),'checked-web-build-'));
const args=source=>['--input-type=module','-e',source];
const phases=[];
try{
  // Each real child must start before either can complete. Serial execution
  // fails this handshake instead of silently making startup slower again.
  const worker=(own,other)=>args(`import{writeFileSync,existsSync}from'node:fs';import{setTimeout as sleep}from'node:timers/promises';writeFileSync(${JSON.stringify(join(root,own))},'ready');const until=Date.now()+5000;while(!existsSync(${JSON.stringify(join(root,other))})&&Date.now()<until)await sleep(10);if(!existsSync(${JSON.stringify(join(root,other))}))process.exit(9);`);
  assert.equal(await checkedWebBuild([['types',worker('types','bundle')],['bundle',worker('bundle','types')]],{onPhase:p=>phases.push(p)}),0);
  assert.equal(phases.length,2);
  assert.equal(await checkedWebBuild([['types',args('await new Promise(r=>setTimeout(r,80));process.exit(2)')],['bundle',args('process.exit(0)')]],{onPhase(){}}),2,'A successful bundle cannot hide a later type error');
  assert.equal(await checkedWebBuild([['types',args('process.exit(0)')],['bundle',args('await new Promise(r=>setTimeout(r,80));process.exit(3)')]],{onPhase(){}}),3,'A successful typecheck cannot hide a later bundle failure');
  console.log('PASS concurrent real build jobs, both completion barriers, and independent typecheck/bundle failure propagation.');
}finally{rmSync(root,{recursive:true,force:true});}
