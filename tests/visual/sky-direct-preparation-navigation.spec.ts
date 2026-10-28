import { expect, test } from '@playwright/test';
import { bundledPublications } from '../helpers/bundled-publications';
import { readerResponse } from '../helpers/reader-response';
import skyHandler from '../../api/sky';
import type { IncomingMessage, ServerResponse } from 'node:http';

test('Leaving a prepared direct article before full Sky resolves cannot reopen it', async ({ page }) => {
  test.setTimeout(90_000);
  await page.clock.setFixedTime(new Date('2026-09-10T04:20:00Z'));
  await bundledPublications(page);
  await page.addInitScript(() => {
    localStorage.setItem('tldrastro:selectedLocation', JSON.stringify({ label: 'Synthetic New York', latitude: 40.7, longitude: -74, timeZone: 'America/New_York' }));
    (window as any).__abandonedArticlePaints = [];
    new MutationObserver(() => {
      const body = document.querySelector('.sky-detail-article .article-body-inner')?.textContent;
      if (body?.trim()) (window as any).__abandonedArticlePaints.push(body);
    }).observe(document, { subtree: true, childList: true, characterData: true });
  });
  let releaseSky!: () => void;
  const skyGate = new Promise<void>(resolve => { releaseSky = resolve; });
  let releaseWriting!: () => void;
  const writingGate = new Promise<void>(resolve => { releaseWriting = resolve; });
  await page.route('**/api/content-reader', async route => {
    if (route.request().postDataJSON()?.keys?.some((key: string) => key.startsWith('sky.aspect.sun.'))) await writingGate;
    await route.fulfill({ json: readerResponse([]) });
  });
  let selectedWritingStarted = false;
  page.on('request', request => {
    if (new URL(request.url()).pathname === '/api/content-reader'
      && request.postDataJSON()?.keys?.some((key: string) => key.startsWith('sky.aspect.sun.'))) selectedWritingStarted = true;
  });
  await page.route('**/api/sky?**', async route => {
    await skyGate;
    const response = { statusCode: 200, setHeader() {}, end(body: string) {
      void route.fulfill({ status: this.statusCode, contentType: 'application/json', body });
    } };
    await skyHandler({ method: 'GET', url: route.request().url() } as IncomingMessage, response as unknown as ServerResponse);
  });
  await page.route('**/api/calendar?**', route => route.fulfill({ json: { ok: true, calendar: { days: [] } } }));
  try {
    await page.goto('/#sky/placement/sun/virgo', { waitUntil: 'domcontentloaded' });
    await expect.poll(() => selectedWritingStarted, { timeout: 60_000 }).toBe(true);
    await page.getByRole('button', { name: 'Sky', exact: true }).click();
    await expect(page).toHaveURL(/#sky$/);
  } finally { releaseWriting(); releaseSky(); }
  await expect(page.getByRole('button', { name: 'Read more about Sun in Virgo', exact: true })).toBeVisible({ timeout: 60_000 });
  await expect(page.locator('.planet-placement-row--sky')).toHaveCount(14);
  await expect(page.locator('.sky-detail-article')).toHaveCount(0);
  expect(await page.evaluate(() => (window as any).__abandonedArticlePaints)).toEqual([]);
});

for (const width of [390, 1440]) test(`Complete direct placement does not wait for unrelated full Sky ${width}`, async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width, height: 1000 });
  await page.clock.setFixedTime(new Date('2026-09-10T04:20:00Z'));
  await bundledPublications(page);
  await page.addInitScript(() => {
    localStorage.setItem('tldrastro:selectedLocation', JSON.stringify({ label:'Synthetic New York', latitude:40.7, longitude:-74, timeZone:'America/New_York' }));
    (window as any).__fullSkyFallbacks = 0;
    const OriginalWorker = window.Worker;
    window.Worker = class extends OriginalWorker {
      postMessage(message: any, ...args: any[]) {
        if (message.kind === 'sky') (window as any).__fullSkyFallbacks++;
        return super.postMessage(message, ...args as [Transferable[]]);
      }
    };
  });
  await page.route('**/api/content-reader', route => route.fulfill({json:readerResponse([])}));
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release=resolve; });
  let skyReturned = false;
  await page.route('**/api/sky?**', async route => {
    await gate;
    const response = { statusCode:200, setHeader() {}, end(body:string) {
      skyReturned = true;
      void route.fulfill({status:this.statusCode,contentType:'application/json',body});
    } };
    await skyHandler({method:'GET',url:route.request().url()} as IncomingMessage,response as unknown as ServerResponse);
  });
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  try {
    await page.goto('/#sky/placement/sun/virgo',{waitUntil:'domcontentloaded'});
    const body=page.locator('.sky-detail-article .article-body-inner').first();
    await expect(body).toContainText('The Sun in Virgo makes the systems',{timeout:60_000});
    await expect(body).toContainText('The system that works is the one that makes your life easier to live.');
    await expect(body).toContainText('Today’s New Moon');
    await expect(page.locator('.sky-detail-id .article-duration').first()).toHaveText('August 22 to September 22, 2026');
    expect(skyReturned).toBe(false);
    expect(await page.evaluate(()=>(window as any).__fullSkyFallbacks)).toBe(0);
    const article=page.locator('.sky-detail-article .sky-detail-card');
    const complete=await article.textContent();
    const fullResponse=page.waitForResponse(response=>new URL(response.url()).pathname==='/api/sky');
    release();
    const response=await fullResponse;
    expect(response.status()).toBe(200);
    const {sky}=await response.json();
    await expect.poll(()=>page.evaluate(({at,latitude,longitude})=>Object.keys(localStorage)
      .filter(key=>key.startsWith('tldrastro:verifiedSky:v2:'))
      .some(key=>{const value=JSON.parse(localStorage.getItem(key)!);return value.snapshot.generatedAt===at
        &&value.snapshot.location.latitude===latitude&&value.snapshot.location.longitude===longitude;}),
      {at:sky.generatedAt,latitude:sky.location.latitude,longitude:sky.location.longitude})).toBe(true);
    const frames=await page.evaluate(()=>new Promise<string[]> (resolve=>{
      const states:string[]=[];
      const observe=()=>{states.push(document.querySelector('.sky-detail-article .sky-detail-card')?.textContent??'');
        if(states.length===30)resolve(states);else requestAnimationFrame(observe);};
      requestAnimationFrame(observe);
    }));
    expect([...new Set(frames)]).toEqual([complete]);
    await expect(article).toHaveText(complete!);
    expect(errors).toEqual([]);
  } finally {release();await page.unrouteAll({behavior:'wait'});}
});

for (const restoring of [false, true]) test(`${restoring ? 'Restoring account' : 'Saved profile'} retains the full Sky personalization boundary`, async ({ page }) => {
  test.setTimeout(90_000);
  await page.clock.setFixedTime(new Date('2026-09-10T04:20:00Z'));
  await bundledPublications(page);
  const location={label:'Synthetic New York',latitude:40.7,longitude:-74,timeZone:'America/New_York'};
  const profile={id:'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',name:'Synthetic Reader',email:'reader@example.test',provider:'email',sun:'Aquarius',moon:'Scorpio',rising:'Gemini',currentLocation:location.label,currentLocationData:location,
    charts:[{id:'synthetic-chart',name:'Synthetic Reader',type:'Birth chart',birthDate:'1990-01-01',birthTime:'12:00 PM',birthCity:location.label,birthLocation:location}]};
  const user={id:profile.id,email:profile.email,aud:'authenticated',role:'authenticated',app_metadata:{provider:'email'},user_metadata:{name:profile.name}};
  const storageKey=`sb-${new URL(process.env.VITE_SUPABASE_URL??'https://visual-smoke.supabase.test').hostname.split('.')[0]}-auth-token`;
  await page.addInitScript(({location,profile,user,storageKey,restoring})=>{
    localStorage.setItem('tldrastro:selectedLocation',JSON.stringify(location));
    if(restoring)localStorage.setItem(storageKey,JSON.stringify({access_token:'synthetic-token',refresh_token:'synthetic-refresh',expires_at:Math.floor(Date.now()/1000)+3600,token_type:'bearer',user}));
    else localStorage.setItem('tldrastro:userProfile',JSON.stringify(profile));
  },{location,profile,user,storageKey,restoring});
  await page.route('**/auth/v1/**',route=>route.fulfill({json:user}));
  let releaseProfile!:()=>void;
  const profileGate=new Promise<void>(resolve=>{releaseProfile=resolve;});
  let profileRequested=false;
  await page.route('**/rest/v1/user_profiles*',async route=>{
    profileRequested=true;
    await profileGate;
    await route.fulfill({json:{data:{version:1,profile}}});
  });
  let writingFinished=false;
  await page.route('**/api/content-reader',async route=>{
    const selected=route.request().postDataJSON()?.keys?.some((key:string)=>key.startsWith('sky.aspect.sun.'));
    await route.fulfill({json:readerResponse([])});
    if(selected)writingFinished=true;
  });
  let releaseSky!:()=>void;
  const skyGate=new Promise<void>(resolve=>{releaseSky=resolve;});
  await page.route('**/api/sky?**',async route=>{
    await skyGate;
    const response={statusCode:200,setHeader(){},end(body:string){void route.fulfill({status:this.statusCode,contentType:'application/json',body});}};
    await skyHandler({method:'GET',url:route.request().url()} as IncomingMessage,response as unknown as ServerResponse);
  });
  try {
    await page.goto('/#sky/placement/sun/virgo',{waitUntil:'domcontentloaded'});
    if(restoring)await expect.poll(()=>profileRequested).toBe(true);
    await expect.poll(()=>writingFinished,{timeout:60_000}).toBe(true);
    await page.waitForTimeout(1500); // Observe the completed selected article while the account/full-Sky gates remain held.
    await expect(page.locator('.sky-detail-article .article-body-inner')).toHaveCount(0);
    releaseProfile();releaseSky();
    await expect(page.locator('.sky-detail-article .article-body-inner').first()).toContainText('The system that works is the one that makes your life easier to live.',{timeout:60_000});
  } finally {releaseProfile();releaseSky();await page.unrouteAll({behavior:'wait'});}
});

for (const [width,theme] of [[390,'dark'],[1440,'light']] as const) {
  test(`A plain root article parent restores Sky on Close, Back and Forward ${width} ${theme}`,async({page})=>{
    test.setTimeout(90000);
    await page.setViewportSize({width,height:1000});
    await page.clock.setFixedTime(new Date('2026-10-12T16:00:00Z'));
    await page.addInitScript(theme=>{
      localStorage.setItem('tldrastro:theme',theme);
      localStorage.setItem('tldrastro:pageAnimations','off');
      localStorage.setItem('tldrastro:selectedLocation',JSON.stringify({label:'Synthetic New York',latitude:40.7128,longitude:-74.006,timeZone:'America/New_York'}));
    },theme);
    await page.route('**/api/**',route=>route.fulfill({status:503,json:{error:'Isolated offline source'}}));
    await page.route('https://tldrastro-api-27165565299.us-central1.run.app/**',route=>route.fulfill({status:503,json:{}}));
    await bundledPublications(page);
    await page.goto('/?date=2026-10-11');
    const parent=page.url();
    const sun=page.locator('.planet-placement-row:has(.card-read-more)').filter({hasText:'Sun in Libra'}).first();
    await expect(sun).toBeVisible({timeout:45000});
    await sun.click();
    const article=page.locator('.sky-detail-page');
    await expect(article.getByRole('heading',{level:1})).toHaveText('Sun in Libra');
    const body=await article.locator('.article-body-inner').first().innerText();
    expect(body.length).toBeGreaterThan(1000);
    await page.getByRole('button',{name:'Close detail',exact:true}).click();
    await expect(page).toHaveURL(parent);
    await expect(article).toHaveCount(0);
    await expect(sun).toBeVisible();
    await page.goForward();
    await expect(article.getByRole('heading',{level:1})).toHaveText('Sun in Libra');
    await expect(article.locator('.article-body-inner').first()).toHaveText(body,{useInnerText:true});
    await page.goBack();
    await expect(page).toHaveURL(parent);await expect(article).toHaveCount(0);
    await sun.click();await expect(article).toBeVisible();await page.reload();
    await expect(article.locator('.article-body-inner').first()).toHaveText(body,{useInnerText:true});
    await page.getByRole('button',{name:'Close detail',exact:true}).click();
    await expect(page).toHaveURL(parent);await expect(article).toHaveCount(0);await expect(sun).toBeVisible();
  });
}
