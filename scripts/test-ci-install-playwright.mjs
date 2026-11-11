import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const installer=path.resolve('scripts/ci-install-playwright.sh');
const sources={
  'sources.list':'deb [arch=amd64 signed-by=/usr/share/keyrings/ubuntu-archive-keyring.gpg] http://azure.archive.ubuntu.com/ubuntu resolute-backports main restricted\n',
  'sources.list.d/ubuntu.sources':'Types: deb deb-src\nURIs: mirror+file:/etc/apt/apt-mirrors.txt\nSuites: resolute resolute-updates\nComponents: main universe\nSigned-By: /usr/share/keyrings/ubuntu-archive-keyring.gpg\n',
  'sources.list.d/vendor.list':'deb [signed-by=/usr/share/keyrings/vendor.gpg] https://packages.microsoft.com/repos/azure-cli resolute main\n',
  'apt-mirrors.txt':'http://azure.archive.ubuntu.com/ubuntu\nhttps://archive.ubuntu.com/ubuntu\n',
};
const preferred={...sources,
  'sources.list':'deb [arch=amd64 signed-by=/usr/share/keyrings/ubuntu-archive-keyring.gpg] https://archive.ubuntu.com/ubuntu resolute-backports main restricted\n',
  'sources.list.d/ubuntu.sources':'Types: deb deb-src\nURIs: https://archive.ubuntu.com/ubuntu\nSuites: resolute resolute-updates\nComponents: main universe\nSigned-By: /usr/share/keyrings/ubuntu-archive-keyring.gpg\n',
};
const scenarios=[
  {mode:'primary-success',exit:0,calls:1,final:preferred},
  {mode:'fallback-success',exit:0,calls:2,final:sources},
  {mode:'both-fail',exit:37,calls:2,final:sources},
  {mode:'no-change-fail',exit:42,calls:1},
  {mode:'restore-fail',exit:1,calls:1,final:preferred},
];

for(const scenario of scenarios){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'playwright-mirror-contract-'));
  try{
    const apt=path.join(root,'apt'),bin=path.join(root,'bin'),capture=path.join(root,'capture'),temporary=path.join(root,'temporary');
    for(const dir of [apt,bin,capture,temporary,path.join(apt,'sources.list.d')])fs.mkdirSync(dir,{recursive:true});
    const original=scenario.mode==='no-change-fail'?{'sources.list.d/vendor.list':sources['sources.list.d/vendor.list']}:sources;
    for(const [name,body]of Object.entries(original))fs.writeFileSync(path.join(apt,name),body,{mode:0o640});
    fs.writeFileSync(path.join(bin,'package.json'),JSON.stringify({type:'module'}));
    fs.writeFileSync(path.join(bin,'sudo'),`#!/usr/bin/env bash
set -euo pipefail
command="$1"; shift
case "$command" in cat|tee) ;; *) exit 90 ;; esac
for target in "$@"; do
  [[ "$target" == "$PLAYWRIGHT_APT_SOURCES_DIR/"* ]] || exit 90
done
if [[ "$command" == tee && "$TEST_MODE" == restore-fail && -f "$TEST_CAPTURE_DIR/attempts.json" ]]; then exit 91; fi
exec "$command" "$@"
`,{mode:0o755});
    fs.writeFileSync(path.join(bin,'npx'),`#!/usr/bin/env node
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
const args=process.argv.slice(2);assert.deepEqual(args,['playwright','install','--with-deps','chromium']);
const file=path.join(process.env.TEST_CAPTURE_DIR,'attempts.json');const attempts=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):[];
const snapshot={};function read(dir,prefix=''){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const name=prefix+entry.name;if(entry.isDirectory())read(path.join(dir,entry.name),name+'/');else snapshot[name]=fs.readFileSync(path.join(dir,entry.name),'utf8');}}
read(process.env.PLAYWRIGHT_APT_SOURCES_DIR);attempts.push({args,snapshot});fs.writeFileSync(file,JSON.stringify(attempts));
if(process.env.TEST_MODE==='primary-success')process.exit(0);
if(attempts.length===1){console.error("Temporary failure resolving 'archive.ubuntu.com'");process.exit(42);}
process.exit(process.env.TEST_MODE==='fallback-success'?0:37);
`,{mode:0o755});
    const result=spawnSync('bash',[installer],{cwd:root,encoding:'utf8',timeout:10000,maxBuffer:65536,env:{
      PATH:[bin,path.dirname(process.execPath),process.env.PATH].join(path.delimiter),
      TMPDIR:temporary,CI:'1',PLAYWRIGHT_APT_SOURCES_DIR:apt,TEST_CAPTURE_DIR:capture,TEST_MODE:scenario.mode,
    }});
    assert.equal(result.status,scenario.exit,`${scenario.mode}: ${result.stderr}`);
    const attempts=JSON.parse(fs.readFileSync(path.join(capture,'attempts.json'),'utf8'));
    assert.equal(attempts.length,scenario.calls,scenario.mode);
    assert.deepEqual(attempts[0].snapshot,scenario.mode==='no-change-fail'?original:preferred);
    if(attempts.length===2)assert.deepEqual(attempts[1].snapshot,sources,'Fallback must restore exact runner mirrors, suites, components and keyrings');
    const final=scenario.final??original;
    for(const [name,body]of Object.entries(final)){
      assert.equal(fs.readFileSync(path.join(apt,name),'utf8'),body,`${scenario.mode}: ${name}`);
      assert.equal(fs.statSync(path.join(apt,name)).mode&0o777,0o640,'Source permissions must remain intact');
    }
    assert.deepEqual(fs.readdirSync(temporary),[],'Owned source backups must be removed on success and failure');
    console.log(`PASS Playwright source fallback: ${scenario.mode}`);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
}
