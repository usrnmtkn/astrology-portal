import {installSyntheticNetworkGuard} from "../helpers/synthetic-network-guard";
import {test,expect,type Page} from '../helpers/polish-test';
import {bundledPublications} from '../helpers/bundled-publications';
import {readerResponse} from '../helpers/reader-response';
import houses from '../../apps/web/src/content/fallbackArchitectureV3/bundled-sky-placement-house-rows-v3.json' with {type:'json'};
import skyHandler from '../../api/sky';
import type {IncomingMessage,ServerResponse} from 'node:http';
import {expectReadableTheme} from '../helpers/theme-contrast';

const location={label:'New York',latitude:40.7,longitude:-74,timeZone:'America/New_York'};
const list='/?date=2026-10-25#horoscopes?period=monthly&sign=gemini&view=planets';
const body=(house:number)=>houses.hookRows.find(row=>row.contentKey===`house-horoscope-core/sun/scorpio/house-${house}`)!.body_you;
async function seed(page:Page,theme:string){
 await page.clock.setFixedTime(new Date('2026-10-25T16:00:00.000Z'));
 await bundledPublications(page);
 await page.route('**/auth/v1/**',route=>route.fulfill({json:null}));
 await page.route('**/api/content-reader',route=>route.fulfill({json:readerResponse([])}));
 await page.route('**/api/sky?**',async route=>{
  const response={statusCode:200,setHeader(){},end(value:string){void route.fulfill({status:this.statusCode,contentType:'application/json',body:value});}};
  await skyHandler({method:'GET',url:route.request().url()} as IncomingMessage,response as unknown as ServerResponse);
 });
 await page.addInitScript(({location,theme})=>{
  if(localStorage.getItem('planetaryFixture'))return;
  localStorage.setItem('planetaryFixture','true');
  localStorage.setItem('tldrastro:theme',theme);localStorage.setItem('tldrastro:pageAnimations','off');
  localStorage.setItem('tldrastro:selectedLocation',JSON.stringify(location));
  localStorage.setItem('tldrastro:horoscopeLocation',JSON.stringify(location));
 },{location,theme});
}

for(const entry of ['list','detail'])test(`Planetary ${entry} loads the exact publication, retries failures and respects retirement`,async({page})=>{
 test.setTimeout(120_000);await seed(page,'light');
 const base=houses.hookRows.find(row=>row.contentKey==='house-horoscope-core/sun/scorpio/house-6')!;
 const key=base.contentKey,updatedAt='2026-10-24T12:00:00.000Z',id='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
 const exact='Complete published planetary horoscope opening.\n\nComplete published planetary horoscope ending.';
 const record={...base,body_you:exact};
 const row={id,content_key:key,surface:'sky',mode:'in_depth',status:'LIVE',lane:'serving',review_state:null,provider:'tldrastro-fallback-architecture-v3',updated_at:updatedAt,headline:'Published planetary fixture',body:exact,sections:{packageRecord:record},facts:{fallbackArchitectureV3:true},source_snapshot:{sourcePackage:'visual-fixture',content_role:'house_horoscope_core'},block_type:'fallback_hook',event_type:'fallback-hook'};
 let fail=true,retired=false;
 const publication=()=>({content_key:key,state:retired?'retired':'live',revision:retired?2:1,row_id:retired?null:id,row_updated_at:retired?null:updatedAt,updated_at:retired?'2026-10-25T15:00:00.000Z':updatedAt});
 await page.route('**/rest/v1/**',route=>route.fulfill({json:new URL(route.request().url()).pathname.endsWith('/content_publications')?[publication()]:[]}));
 await page.route('**/api/content-reader',route=>fail?route.fulfill({status:503,json:{error:'Fixture unavailable'}}):route.fulfill({json:readerResponse(retired?[]:[row],[publication()])}));
 await page.goto(entry==='list'?list:`${list}&planet=sun&placement=scorpio`);
 await expect(page.getByRole('alert')).toContainText('could not load',{timeout:60_000});
 fail=false;await page.getByRole('button',{name:'Try again',exact:true}).click();
 if(entry==='detail'){await expect(page.locator('.horoscope-prose')).toHaveText(exact,{timeout:60_000});await page.getByRole('button',{name:'All planets',exact:true}).click();}
 const card=page.getByRole('link',{name:'Sun in Scorpio · Read horoscope',exact:true});
 await expect(card.locator('.planet-placement-row__description')).toHaveText(exact,{timeout:60_000});
 await card.click();
 const article=page.getByRole('article',{name:'Sun in Scorpio horoscope',exact:true});
 await expect(article.locator('.horoscope-prose')).toHaveText(exact,{timeout:60_000});
 await page.reload();await expect(article.locator('.horoscope-prose')).toHaveText(exact,{timeout:60_000});
 await page.getByRole('button',{name:'All planets',exact:true}).click();
 await expect(card.locator('.planet-placement-row__description')).toHaveText(exact,{timeout:60_000});
 retired=true;await page.reload();
 await expect(card).toBeVisible({timeout:60_000});
 await expect(card.locator('.planet-placement-row__description')).toHaveCount(0);
 await card.click();
 await expect(article.getByRole('status')).toContainText('No planetary horoscope is published',{timeout:60_000});
 await expect(article.locator('.horoscope-prose')).toHaveCount(0);await expect(page.locator('.sky-detail-page')).toHaveCount(0);
});

for(const width of [390,1440])for(const theme of ['light','dark']){
 test(`Planet placement opens its full horoscope and returns to planets ${width} ${theme}`,async({page})=>{
  test.setTimeout(120_000);await page.setViewportSize({width,height:1000});await seed(page,theme);
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(list);
  const sun=page.getByRole('link',{name:/^Sun in Scorpio .*Read horoscope/});
  await expect(sun).toBeVisible({timeout:60_000});await expect(sun).toHaveAttribute('href',/#horoscopes\?.*&planet=sun&placement=scorpio$/);
  await expect(sun.locator('.planet-placement-row__description')).toHaveText(body(6));
  await expect(sun).toHaveCSS('border-radius','32px');
  await expect(sun.locator('.planet-placement-row__glyph')).toHaveCSS('width','48px');
  await expect(sun.locator('.planet-placement-row__title')).toHaveCSS('font-family',/Newsreader/);
  await expect(sun.locator('.planet-placement-row__title')).toHaveCSS('font-size','26px');
  await expect(sun.locator('.planet-placement-row__degree')).toHaveCSS('font-family',/system-ui/);
  await expect(sun.locator('.planet-placement-row__degree')).toHaveCSS('font-size','14px');
  await expect(sun.locator('.planet-placement-row__degree')).toContainText('Your 6th house');
  await expect(sun.locator('.planet-placement-row__description')).toHaveCSS('font-family',/Newsreader/);
  await expect(sun.locator('.planet-placement-row__description')).toHaveCSS('font-size','19px');
  await expect(sun.locator('.planet-placement-row__description')).toHaveCSS('line-height','28.5px');
  await expect(sun.locator('.placement-progress svg')).toBeVisible();
  await expect(sun.locator('.placement-progress > span').last()).toHaveText('4 weeks left');
  await expect(sun.locator('.placement-progress')).not.toHaveAttribute('aria-hidden','true');
  const nextBox=(await page.locator('.horoscope-planet-grid > a').nth(1).boundingBox())!;
  const sunBox=(await sun.boundingBox())!;
  if(width>800)expect(nextBox.y).toBeCloseTo(sunBox.y,0);
  else expect(nextBox.y).toBeGreaterThan(sunBox.y+sunBox.height);
  await expectReadableTheme(page,'.horoscope-planet-grid .planet-placement-row__title, .horoscope-planet-grid .planet-placement-row__degree, .horoscope-planet-grid .planet-placement-row__description');
  await page.screenshot({path:`test-results/planetary-horoscope-cards-${width}-${theme}.png`,fullPage:true});
  await sun.click();
  const article=page.getByRole('article',{name:'Sun in Scorpio horoscope',exact:true});
  await expect(article.locator('.horoscope-prose')).toHaveText(body(6),{timeout:60_000});
  await expect(page.locator('.sky-detail-page')).toHaveCount(0);
  await expect(page.locator('.site-nav button.active')).toHaveText('Horoscopes');
  await expect(page.getByRole('button',{name:'Planets',exact:true})).toHaveAttribute('aria-pressed','true');
  await expect(article.locator('.horoscope-reading-sign')).toHaveText(['Gemini','↑Gemini Rising']);
  const title=article.locator('.horoscope-reading-date');
  await expect(title).toHaveCSS('font-family',/Newsreader/);await expect(title).toHaveCSS('font-size','36px');await expect(title).toHaveCSS('font-weight','400');await expect(title).toHaveCSS('line-height','40.32px');
  await expect(article.locator('.horoscope-prose p')).toHaveCSS('font-family',/Newsreader/);await expect(article.locator('.horoscope-prose p')).toHaveCSS('font-size','19px');await expect(article.locator('.horoscope-prose p')).toHaveCSS('line-height','28.5px');
  await expect(page.getByRole('heading',{level:1})).toHaveText('Horoscopes');
  await expect(page.getByRole('navigation',{name:'Planetary horoscopes'}).getByRole('button',{name:'Previous',exact:true})).toBeDisabled();
  await page.getByRole('button',{name:'Aries & Aries Rising',exact:true}).click();
  await expect(article.locator('.horoscope-prose')).toHaveText(body(8));
  await page.reload();await expect(article.locator('.horoscope-prose')).toHaveText(body(8),{timeout:60_000});
  await page.goBack();await expect(article.locator('.horoscope-prose')).toHaveText(body(6));
  await page.getByRole('button',{name:'Next Moon in Aries',exact:true}).click();
  await expect(page.getByRole('article',{name:'Moon in Aries horoscope',exact:true}).locator('.horoscope-prose')).toBeVisible({timeout:60_000});
  await page.goBack();await expect(article.locator('.horoscope-prose')).toHaveText(body(6));
  await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:`test-results/planetary-horoscope-${width}-${theme}.png`,fullPage:true});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.getByRole('button',{name:'All planets',exact:true}).click();await expect(sun).toBeVisible();
  await page.goBack();await expect(article.locator('.horoscope-prose')).toHaveText(body(6));
  await page.getByRole('button',{name:'Planets',exact:true}).click();await expect(sun).toBeVisible();
  await page.getByRole('link',{name:/^Mercury Rx in Scorpio .*Read horoscope/}).click();
  const mercury=page.getByRole('article',{name:'Mercury in Scorpio horoscope',exact:true});
  await expect(mercury.locator('.horoscope-prose')).toHaveText(houses.hookRows.find(row=>row.contentKey==='house-horoscope-core/mercury/scorpio/house-6')!.body_you,{timeout:60_000});
  await expect(mercury.locator('.horoscope-reading-date')).toHaveText('Mercury Rx in Scorpio');
  await expect(mercury.locator('.horoscope-reading-sign').first()).toHaveText('℞ Retrograde');
  await expect(mercury.locator('.horoscope-date')).toBeVisible();await expect(page.locator('.sky-detail-page')).toHaveCount(0);
  await page.goto(`${list}&planet=unknown&placement=scorpio`);await expect(page.getByRole('heading',{name:'We couldn’t find that horoscope',exact:true})).toBeVisible();
  await expect(page.getByRole('heading',{name:'We couldn’t find that horoscope',exact:true})).toHaveCSS('font-size','36px');
  await expect(page.locator('.sky-detail-page')).toHaveCount(0);await page.getByRole('button',{name:'Go to Horoscopes',exact:true}).click();await expect(sun).toBeVisible();
  expect(errors).toEqual([]);
 });
}

for(const [date,cardDates,detailDates,skyDates] of [
 ['2026-10-02',/Sep 10.*Oct 25, 2026/u,/September 10.*October 25, 2026/u,/September 10 to October 25, 2026/u],
 ['2026-10-13',/Oct 3.*Nov 13, 2026/u,/October 3.*November 13, 2026/u,/Oct 3, 2026 - Nov 13, 2026/u],
] as const)test(`Planetary card and reading keep the calculated Venus window ${date}`,async({page})=>{
 test.setTimeout(90_000);await seed(page,'light');
 await page.goto(`/?date=${date}#horoscopes?sign=gemini&view=planets`);
 const venus=page.getByRole('link',{name:/^Venus.*Read horoscope/});
 await expect(venus.locator('.planet-placement-row__timing')).toContainText(cardDates,{timeout:60_000});
 await venus.click();
 await expect(page.locator('.horoscope-reading .horoscope-date')).toHaveText(detailDates);
 await page.reload();await expect(page.locator('.horoscope-reading .horoscope-date')).toHaveText(detailDates);
 await page.goto(`/?date=${date}#sky/placement/venus/scorpio`);
 await expect(page.locator('.article-duration').first()).toHaveText(skyDates,{timeout:60_000});
});

const guards = new WeakMap<import('@playwright/test').Page, Awaited<ReturnType<typeof installSyntheticNetworkGuard>>>();
test.beforeEach(async ({page,baseURL}) => { guards.set(page, await installSyntheticNetworkGuard(page.context(), new URL(baseURL!).origin)); });
test.afterEach(async ({page}, info) => {
 const guard = guards.get(page);
 await info.attach('synthetic-network-boundary', {body:JSON.stringify(guard),contentType:'application/json'});
 expect(guard?.unhandledExternal).toEqual([]);
});

test('Planetary and Sky cards share remaining countdowns',async({page},info)=>{
 const theme=info.project.name.endsWith('dark')?'dark':'light';
 await seed(page,theme);
 await page.goto(list);
 const cards=page.locator('.horoscope-planet-grid .planet-placement-row');
 await expect(cards).toHaveCount(14,{timeout:60_000});
 const labels=new Map<string,string[]>();
 for(const card of await cards.all()){
  const title=(await card.locator('.planet-placement-row__title').innerText()).trim();
  const captions=await card.locator('.placement-progress > span').allTextContents();
  expect(captions.length,title).toBeGreaterThan(0);
  expect(captions.at(-1),title).toMatch(/^(?:Ends today|\d+ (?:day|week|month|year)s? left)$/);
  labels.set(title,captions);
 }
 await expect(cards.first().locator('.placement-progress > span').last()).toHaveText('4 weeks left');
 await page.screenshot({path:info.outputPath('planetary-countdowns.png'),fullPage:true});
 await cards.first().click();await page.reload();
 await page.getByRole('button',{name:'All planets',exact:true}).click();
 for(const card of await cards.all())expect(await card.locator('.placement-progress > span').allTextContents()).toEqual(labels.get((await card.locator('.planet-placement-row__title').innerText()).trim()));
 await page.goto('/?date=2026-10-25#sky');
 const skyCards=page.locator('.sky-placement-group .planet-placement-row');
 await expect(skyCards).toHaveCount(14,{timeout:60_000});
 for(const card of await skyCards.all()){
  const title=(await card.locator('.planet-placement-row__title').innerText()).trim();
  expect(await card.locator('.placement-progress > span').allTextContents(),title).toEqual(labels.get(title));
 }
 await page.screenshot({path:info.outputPath('sky-countdowns.png'),fullPage:true});
});
