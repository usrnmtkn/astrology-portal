import { expect, test } from '@playwright/test';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { writeFileSync } from 'node:fs';
import skyHandler from '../../api/sky';
import { skyPlacementSourceRecords } from '../../api/_lib/sky-placement-sources';
import { readerResponse } from '../helpers/reader-response';
import { canonicalPublicationLedger, publicationLedgerTag } from '../../apps/web/src/services/publicationLedgerTransport';
import { installSyntheticNetworkGuard } from '../helpers/synthetic-network-guard';
import { isSkyListPublicationKey } from '../../apps/web/src/content/skyListPublicationScope';

for (const theme of ['light', 'dark']) test(`published Lilith refresh during the first press preserves activation ${theme}`, async ({ page, context }, info) => {
 test.setTimeout(120_000);
 const { unhandledExternal, finishStaticFonts } = await installSyntheticNetworkGuard(context, new URL(String(info.project.use.baseURL)).origin);
 const key='sky-lilith/article/sagittarius', id='aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
 const base=skyPlacementSourceRecords.get(key)!;
 let revision=1, secondReadStarted=false;
 const reads:any[]=[];const tracked=new Map<any,any>();
 page.on('requestfinished',request=>{const read=tracked.get(request);if(read)read.finishedAt=Date.now()});
 page.on('requestfailed',request=>{const read=tracked.get(request);if(read)read.failedAt=Date.now()});
 let release!:()=>void;
 const gate=new Promise<void>(resolve=>{release=resolve});
 const copy=(rev:number)=>`Synthetic complete Lilith opening ${rev}.\n\nSynthetic complete Lilith final sentence ${rev}.`;
 const timestamp=()=>`2026-11-04T12:0${revision}:00.123456Z`;
 const publications=()=>canonicalPublicationLedger([
  {content_key:'__content-publication-ledger/v1',state:'live',revision:1,row_id:null,row_updated_at:null,updated_at:timestamp()},
  {content_key:key,state:'live',revision,row_id:id,row_updated_at:timestamp(),updated_at:timestamp()}
 ]);
 const row=()=>({id,content_key:key,surface:'sky',mode:'in_depth',status:'LIVE',lane:'serving',review_state:null,target_date:null,
  provider:'tldrastro-fallback-architecture-v3',updated_at:timestamp(),headline:base.headline,summary:'',body:copy(revision),
  sections:{packageRecord:{...base,body_you:copy(revision),LilithArticle:copy(revision),studio_version_status:'approved-serving-revision'}},
  facts:{fallbackArchitectureV3:true},source_snapshot:{sourcePackage:base.source_package,content_role:base.content_role},block_type:'fallback_hook',event_type:'fallback-hook'});
 await page.clock.setFixedTime(new Date('2026-11-04T17:21:35Z'));
 await page.addInitScript(theme=>{
  localStorage.setItem('tldrastro:theme',theme);localStorage.setItem('tldrastro:pageAnimations','off');
  localStorage.setItem('tldrastro:selectedLocation',JSON.stringify({label:'New York',latitude:40.7,longitude:-74,timeZone:'America/New_York'}));
  (window as any).__pressEvents=[];
  for(const type of ['pointerdown','pointerup','mousedown','mouseup','click'])addEventListener(type,event=>{
   const target=event.target as Element;
   if(type==='pointerdown') (window as any).__pressedInputTarget=target;
   (window as any).__pressEvents.push({type,trusted:event.isTrusted,target:target?.tagName,classes:String(target?.className),samePressedTarget:target===(window as any).__pressedInputTarget,label:target?.closest('button')?.getAttribute('aria-label'),hash:location.hash,at:performance.now()});
  },true);
 },theme);
 await page.route('**/content-studio-last-known-good.json',route=>route.fulfill({json:{schema:'content-studio-last-known-good-v2',rows:[],publications:[],rowCount:0}}));
 await page.route('**/api/content-publications*',async route=>{const scoped=new URL(route.request().url()).searchParams.get('scope')==='sky-list';const ledger=publications().filter(row=>!scoped||isSkyListPublicationKey(row.content_key));await route.fulfill({headers:{etag:await publicationLedgerTag(ledger)},json:{schema:scoped?'tldr-sky-list-publications/v1':'tldr-publications/v1',publications:ledger}})});
 await page.route('**/rest/v1/**',route=>{const path=new URL(route.request().url()).pathname;return route.fulfill({json:path.endsWith('/content_publications')?publications():path.endsWith('/content_runtime_revision')?timestamp():[]})});
 await page.route('**/api/content-reader',async route=>{
  const query=route.request().postDataJSON(), rev=revision, ledger=publications();
  // Lilith is a shared Sky-list/core source, not the separate continuous-placement partition.
  const matches=query.scope ? ['sky','sky-list','sky-article'].includes(query.scope)
   : ((!query.keys&&!query.ids)||query.keys?.includes(key)||query.ids?.includes(id));
  const rows=matches?[row()]:[];
  const read={scope:query.scope??null,keys:query.keys??null,ids:query.ids??null,revision:rev,rowCount:rows.length,startedAt:Date.now(),fulfilledAt:null,finishedAt:null,failedAt:null};reads.push(read);tracked.set(route.request(),read);
  if(rev===2&&matches){secondReadStarted=true;await gate}
  await route.fulfill({json:readerResponse(rows,ledger)});read.fulfilledAt=Date.now() as any;
 });
 await page.route(/\/api\/sky(?:-reader)?\?/,async route=>{
  let body='';const response={statusCode:200,setHeader(){},end(value:string){body=value}};
  await skyHandler({method:'GET',url:route.request().url()} as IncomingMessage,response as unknown as ServerResponse);
  await route.fulfill({status:response.statusCode,contentType:'application/json',body});
 });
 await page.route('**/api/calendar?**',route=>route.fulfill({json:{ok:true,calendar:{days:[]}}}));
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 let before:any, during:any, after:any, firstRelease:any, admittedAt:number|undefined, withdrawnAt:number|undefined;
 try {
  await page.goto('/?date=2026-11-04#sky');
  const card=page.getByRole('button',{name:'Read more about True Black Moon Lilith in Sagittarius',exact:true});
  await expect(card.locator('.planet-placement-row__description')).toContainText('Synthetic complete Lilith opening 1.',{timeout:60_000});
  // This controlled publication race holds typography fixed; the original fast
  // first-click journey separately exercises startup without a font wait.
  await page.evaluate(async()=>{await document.fonts.ready;});
  await card.scrollIntoViewIfNeeded();
  const box=await card.boundingBox();expect(box).not.toBeNull();
  await card.evaluate(el=>{(window as any).__pressedCard=el});
  await page.mouse.move(box!.x+box!.width/2,box!.y+box!.height/2);
  await page.mouse.down();
  before=await page.evaluate(()=>{const card=(window as any).__pressedCard,r=card.getBoundingClientRect();return {connected:card.isConnected,hash:location.hash,rect:{x:r.x,y:r.y,width:r.width,height:r.height}}});
  revision++;
  await page.evaluate(key=>dispatchEvent(new CustomEvent('tldrastro:content-update',{detail:{contentKey:key,published:true,updatedAt:'2026-11-04T12:02:00.123456Z'}})),key);
  await expect.poll(()=>secondReadStarted,{timeout:30_000}).toBe(true);
  // A request starting does not mean the new publication was admitted. Keep
  // this explicit controlled press across the real ledger installation/commit.
  await expect.poll(()=>page.evaluate(key=>JSON.parse(localStorage.getItem('tldrastro:content-publications:v1')??'[]').find((row:any)=>row.content_key===key)?.revision??null,key),{timeout:5000,intervals:[25,50,100]}).toBe(2);
  admittedAt=await page.evaluate(()=>performance.now());
  await expect.poll(()=>page.evaluate(()=>document.body.textContent?.includes('Synthetic complete Lilith opening 1.')??false),{timeout:5000,intervals:[25,50,100]}).toBe(false);
  withdrawnAt=await page.evaluate(()=>performance.now());
  during=await page.evaluate(()=>{const card=(window as any).__pressedCard,r=card.getBoundingClientRect();return {connected:card.isConnected,hash:location.hash,skeletons:document.querySelectorAll('.planet-placement-row.card-skeleton').length,oldCopy:document.body.textContent?.includes('Synthetic complete Lilith opening 1.'),rect:{x:r.x,y:r.y,width:r.width,height:r.height}}});
  expect(during.oldCopy, 'Changed publication prose withdraws before the press is released').toBe(false);
  await page.screenshot({path:info.outputPath('pending-publication-press.png')});
  await page.mouse.up();
  release();
  expect(during.connected, 'A ready native card survives publication revalidation').toBe(true);
  for (const dimension of ['x', 'y', 'width', 'height']) {
    expect(Math.abs(during.rect[dimension]-before.rect[dimension]), `The pressed card keeps its ${dimension} within one CSS pixel`).toBeLessThanOrEqual(1);
  }
  await expect(page).toHaveURL(/#sky\/placement\/lilith\/sagittarius$/);
  firstRelease=await page.evaluate(()=>({hash:location.hash,events:(window as any).__pressEvents}));
  expect(firstRelease.events.filter((event:any)=>event.type==='click'&&event.trusted&&event.label==='Read more about True Black Moon Lilith in Sagittarius')).toHaveLength(1);
  const article=page.locator('.sky-detail-article .article-body-inner').first();
  await expect(article).toContainText('Synthetic complete Lilith opening 2.',{timeout:60_000});
  await expect(article).toContainText('Synthetic complete Lilith final sentence 2.');
  await expect(article).not.toContainText('Synthetic complete Lilith opening 1.');
  await expect.poll(()=>reads.some(read=>read.revision===2&&read.rowCount===1&&read.finishedAt&&!read.failedAt)).toBe(true);
  await page.reload();
  await expect(article).toContainText('Synthetic complete Lilith opening 2.',{timeout:60_000});
  await expect(article).toContainText('Synthetic complete Lilith final sentence 2.');
  await expect(article).not.toContainText('Synthetic complete Lilith opening 1.');
  await page.getByRole('button',{name:'Close detail',exact:true}).click();
  await expect(card.locator('.planet-placement-row__description')).toContainText('Synthetic complete Lilith opening 2.',{timeout:60_000});
  await card.screenshot({path:info.outputPath('current-publication-card.png')});
  expect(errors).toEqual([]);expect(unhandledExternal).toEqual([]);
 } finally {
  release();after=await page.evaluate(()=>({hash:location.hash,events:(window as any).__pressEvents})).catch(()=>null);
  writeFileSync(info.outputPath('controlled-press-evidence.json'),JSON.stringify({before,during,firstRelease,after,admittedAt,withdrawnAt,reads,errors,unhandledExternal,scope:'synthetic publication update during an explicitly held real mouse press; no claim that original live failure used this timing'},null,2));
  await finishStaticFonts();await page.unrouteAll({behavior:'ignoreErrors'});
 }
});
