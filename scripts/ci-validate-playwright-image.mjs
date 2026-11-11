import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';
import {chromium,webkit} from '@playwright/test';

const require=createRequire(import.meta.url);
const lock=JSON.parse(fs.readFileSync('package-lock.json','utf8'));
const version=lock.packages['node_modules/@playwright/test'].version;
assert.equal(process.platform,'linux','The pinned browser image must run on Linux');
assert.equal(process.arch,'x64','This qualification preserves the existing x64 runner');
assert.match(process.versions.node,/^22\./,'Repository checks must keep Node 22');
assert.equal(require('@playwright/test/package.json').version,version);
assert.equal(require('playwright-core/package.json').version,version);
const image=JSON.parse(fs.readFileSync('/ms-playwright/.docker-info','utf8'));
assert.equal(image.driverVersion,version,'Image and locked browser revisions must match');
assert.equal(image.dockerImageName,`mcr.microsoft.com/playwright:v${version}-noble`);
const os=Object.fromEntries(fs.readFileSync('/etc/os-release','utf8').split('\n').filter(line=>line.includes('=')).map(line=>{
  const index=line.indexOf('=');return [line.slice(0,index),line.slice(index+1).replace(/^"|"$/g,'')];
}));
assert.equal(os.ID,'ubuntu');assert.equal(os.VERSION_ID,'24.04');

// The locked 1.61 Ubuntu 24.04 dependency set includes these font/tool packages.
const packages=['xvfb','fonts-noto-color-emoji','fonts-unifont','libfontconfig1','libfreetype6','xfonts-cyrillic','xfonts-scalable','fonts-liberation','fonts-ipafont-gothic','fonts-wqy-zenhei','fonts-tlwg-loma-otf','fonts-freefont-ttf'];
const installed=spawnSync('dpkg-query',['-W','-f=${binary:Package}\t${db:Status-Status}\n',...packages],{encoding:'utf8',timeout:10000,maxBuffer:65536});
assert.equal(installed.status,0,'All required font/tool packages must be installed');
const states=new Map(installed.stdout.trim().split('\n').map(line=>{const [name,status]=line.split('\t');return [name.split(':')[0],status];}));
for(const name of packages)assert.equal(states.get(name),'installed',`Missing image dependency: ${name}`);

for(const [name,type]of Object.entries({chromium,webkit})){
  const executable=fs.realpathSync(type.executablePath());
  assert(executable.startsWith('/ms-playwright/'),'Use the locked image browser, not a host fallback');
  fs.accessSync(executable,fs.constants.X_OK);
  const browser=await type.launch({timeout:30000});
  try{
    const page=await browser.newPage();
    await page.setContent('<!doctype html><html><body><p style="font:24px FreeSans">Studio browser dependency check ☉ ☽ ♄</p></body></html>');
    assert.equal(await page.locator('p').innerText(),'Studio browser dependency check ☉ ☽ ♄');
    assert((await page.screenshot()).length>100,'The native browser must render with its font stack');
    console.log(JSON.stringify({browser:name,version:browser.version(),imageExecutable:path.relative('/ms-playwright',executable)}));
  }finally{await browser.close();}
}
console.log(JSON.stringify({image:image.dockerImageName,node:process.versions.node,distro:'Ubuntu 24.04',validatedFontAndToolPackages:packages.length}));
