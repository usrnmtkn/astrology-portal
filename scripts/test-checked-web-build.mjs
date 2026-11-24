import assert from 'node:assert/strict';
import {existsSync,mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {spawn} from 'node:child_process';
import {setTimeout as sleep} from 'node:timers/promises';
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
  const pidFiles=['cancel-types','cancel-bundle'].map(name=>join(root,name));
  const interruptedJobs=pidFiles.map((file,index)=>[String(index),args(`import{writeFileSync}from'node:fs';process.on('SIGTERM',()=>process.exit(0));writeFileSync(${JSON.stringify(file)},String(process.pid));setInterval(()=>{},1000);`)]);
  const source=`import{checkedWebBuild}from${JSON.stringify(new URL('./build-web-checked.mjs',import.meta.url).href)};process.exitCode=await checkedWebBuild(${JSON.stringify(interruptedJobs)},{onPhase(){}});`;
  const parent=spawn(process.execPath,args(source),{stdio:'ignore',detached:true});
  const stopped=new Promise(resolve=>parent.on('close',resolve));
  try{
    const until=Date.now()+5000;
    while(!pidFiles.every(existsSync)&&Date.now()<until)await sleep(10);
    assert(pidFiles.every(existsSync),'Both owned children start before cancellation');
    parent.kill('SIGTERM');
    assert.notEqual(await stopped,0,'Cancellation cannot report success when children stop gracefully');
    for(const file of pidFiles)assert.throws(()=>process.kill(Number(readFileSync(file,'utf8')),0),{code:'ESRCH'},'Owned children must be reaped before the interrupted build exits');
  }finally{try{process.kill(-parent.pid,'SIGKILL');}catch{}await stopped;}
  console.log('PASS concurrent real build jobs, both completion barriers, and independent typecheck/bundle failure propagation.');
}finally{rmSync(root,{recursive:true,force:true});}
