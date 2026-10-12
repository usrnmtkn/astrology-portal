import { syntheticReaderMeanings } from './fixtures/personal-transit-reader-meanings.mjs';
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { prepareBatch, sha256, saveState, loadState, validatePassage } from '../../src/astro-writing/ownerTransitBatch.mjs';
import { createReviewServer } from '../../scripts/transit-owner-batch/server.mjs';
import { syntheticStylePhrase } from '../../scripts/fixtures/personal-transit-writing.mjs';

const output=process.argv[2];if(!output)throw Error('Private screenshot/report directory required');mkdirSync(output,{recursive:true,mode:0o700});
const examples=['venus/moon/square','neptune/jupiter/trine'].map(s=>({contentKey:`authored/transit-aspect/${s}`,field:'body_you',text:`Synthetic reference ${s}.`,sha256:sha256(`Synthetic reference ${s}.`),preferred:true,ownerApproved:true,source:'synthetic-test-only'}));
const records=['moon/saturn/sextile','mercury/venus/trine','mars/saturn/square','moon/chiron/trine'].map(s=>({contentKey:`authored/transit-aspect/${s}`,body_you:'{{untilDate}}',body_they:'{{untilDate}}'}));
const readerMeanings=syntheticReaderMeanings(records);
const stylePhrase=syntheticStylePhrase();
const baseline=prepareBatch({readerMeanings,id:'browser-fixture',records,sources:{version:'synthetic-style-browser',passages:examples,stylePhrases:[stylePhrase]},provenance:{fixture:true},friendEvidencePolicy:'owner-authorized-you-voice'});
const browser=await chromium.launch({headless:true});const results=[];
try {
  for(const width of [1280,390]) for(const theme of ['light','dark']) {
    const directory=mkdtempSync(join(tmpdir(),'owner-batch-browser-'));let server,context;
    try {
      saveState(directory,baseline);const app=createReviewServer(directory);server=app.server;await new Promise(r=>server.listen(0,'127.0.0.1',r));
      const origin=`http://127.0.0.1:${server.address().port}`;const url=origin+'/#'+app.token;
      context=await browser.newContext({viewport:{width,height:1000}});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
      await page.addInitScript(t=>document.addEventListener('DOMContentLoaded',()=>{document.documentElement.dataset.theme=t;},{once:true}),theme);
      await page.goto(url);await page.waitForSelector('.passage');
      assert.equal(await page.evaluate(()=>document.documentElement.dataset.theme),theme);
      const background=await page.locator('body').evaluate(e=>getComputedStyle(e).backgroundColor);
      assert.equal(await page.locator('.passage').count(),8);assert.equal(await page.getByRole('heading',{level:2}).count(),4);
      assert.equal(await page.locator('.passage textarea:not(:disabled)').count(),0);assert(await page.getByRole('button',{name:'Finish batch review',exact:true}).isDisabled());
      await page.getByText('Complete generation input and exact request',{exact:true}).first().click();assert.match(await page.locator('.passage').first().locator('pre').filter({hasText:'readerMeaning'}).first().innerText(),/gemini-3.8-flash/u);
      assert((await page.locator('.passage').first().locator('pre').filter({hasText:'readerMeaning'}).first().innerText()).includes(stylePhrase.text));
      await page.getByText('Complete generation input and exact request',{exact:true}).first().click();
      const typography=await page.locator('.passage textarea').first().evaluate(e=>{const s=getComputedStyle(e),root=getComputedStyle(document.documentElement);return {font:s.fontFamily,size:s.fontSize,bodySize:root.getPropertyValue('--text-body').trim(),lineHeight:s.lineHeight,weight:s.fontWeight};});
      assert(typography.font && typography.size!=='0px');assert.equal(typography.weight,'400');
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
      await page.screenshot({path:join(output,`empty-${width}-${theme}.png`),fullPage:true});results.push({case:`empty ${width} ${theme}`,passed:true,typography});
      const populated=structuredClone(baseline);populated.revision=1;
      for(const c of populated.contacts)for(const p of c.passages){const pronoun=p.perspective==='you'?'your':'their';const title=c.title.replace(/ (Saturn|Venus|Chiron)$/u,` ${pronoun} natal $1`);const text=`${title} through {{untilDate}}. ${p.perspective==='you'?'You':'They'} read this synthetic sentence.`;p.original={text,sha256:sha256(text),fixture:true};p.currentText=text;p.status='needs-review';p.validation=validatePassage(text,c,p);}
      saveState(directory,populated);await page.getByRole('button',{name:'Reload saved batch',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.passage textarea')?.disabled===false);
      assert.match(await page.locator('.passage').first().innerText(),/Mechanical checks passed.*no semantic or voice pass/);
      let card=page.locator('.passage').first();const area=card.getByLabel('Owner edit',{exact:true});const original=await area.inputValue();const edited=original+' Owner test edit.';
      await area.fill(edited);assert(await card.getByRole('button',{name:'Approve exact saved text',exact:true}).isDisabled());
      await card.getByRole('button',{name:'Save edit',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#message').textContent.startsWith('Saved locally'));
      await page.reload();await page.waitForSelector('.passage');card=page.locator('.passage').first();assert.equal(await card.getByLabel('Owner edit',{exact:true}).inputValue(),edited);
      assert.equal(loadState(directory).contacts[0].passages[0].input.destinations[0].stylePhrases[0].text,stylePhrase.text);
      assert(!edited.includes(stylePhrase.text), 'Reference text must not become the saved reader passage');
      await card.getByRole('button',{name:'Approve exact saved text',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#overview').textContent.includes('1 newly approved'));
      const stored=loadState(directory).contacts[0].passages[0];assert.equal(stored.original.text,original);assert.equal(stored.approved.text,edited);assert.equal(stored.approved.sha256,sha256(edited));assert.equal(stored.approved.publicationAuthorized,false);
      assert.equal(stored.approved.readerRuleBundleSha256,stored.validation.readerRuleBundleSha256);
      assert(stored.approved.contextualRulesReviewed.includes('LITERAL_PERFORMANCE'));
      assert.match(await card.getByText('Current contextual writing rules',{exact:true}).textContent(),/Current contextual/);
      const second=page.locator('.passage').nth(1);await second.getByLabel('Reason for rejection or regeneration',{exact:true}).fill('Synthetic owner rejection');await second.getByRole('button',{name:'Reject / request regeneration',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#message').textContent.includes('No provider call'));
      assert.equal(loadState(directory).contacts[0].passages[1].status,'regeneration-requested');
      await page.reload();await page.waitForSelector('.passage');assert.match(await page.locator('.passage').nth(1).innerText(),/regeneration-requested/u);
      await page.locator('.passage').first().getByLabel('Owner edit',{exact:true}).fill('{{broken}}');await page.locator('.passage').first().getByRole('button',{name:'Save edit',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#overview').textContent.includes('0 newly approved'));
      assert(await page.locator('.passage').first().getByRole('button',{name:'Approve exact saved text',exact:true}).isDisabled());assert.match(await page.locator('.passage').first().innerText(),/PLACEHOLDER_CONTRACT/u);
      assert.equal(await page.evaluate(()=>document.documentElement.dataset.theme),theme);
      assert.equal(await page.locator('body').evaluate(e=>getComputedStyle(e).backgroundColor),background);
      await page.evaluate(()=>scrollTo(0,0));
      await page.screenshot({path:join(output,`review-viewport-${width}-${theme}.png`)});
      await page.screenshot({path:join(output,`review-${width}-${theme}.png`),fullPage:true});assert.deepEqual(errors,[]);results.push({case:`edit approve reject invalidate reload ${width} ${theme}`,passed:true});
      const anonymous=await browser.newContext();const denied=await anonymous.newPage();await denied.goto(origin);await denied.waitForFunction(()=>document.querySelector('#message').textContent.includes('LOCAL_OWNER_ACCESS_REQUIRED'));assert.equal(await denied.locator('.passage').count(),0);await anonymous.close();
    } finally {if(context)await context.close();if(server)await new Promise(r=>server.close(r));rmSync(directory,{recursive:true,force:true});}
  }
  writeFileSync(join(output,'browser-results.json'),JSON.stringify({scope:'synthetic local stores; zero provider calls or production writes',passed:results.length,failed:0,results},null,2),{mode:0o600});console.log(`PASS ${results.length}/${results.length} browser scenarios; desktop/mobile, light/dark, empty/review, reload, approval invalidation, anonymous denial.`);
}finally{await browser.close();}
