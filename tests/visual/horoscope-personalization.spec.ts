import {test,expect} from '@playwright/test';
import {emptyHoroscopeEdition,horoscopeEditionKey,horoscopeEditionBody} from '../../apps/web/src/content/horoscopeEditions.mjs';
import {READER_ROW_SCHEMA} from '../../apps/web/src/content/readerRowSchema.mjs';

const fixtureProfile={id:'horoscope-fixture',name:'Fixture Reader',email:'reader@example.test',provider:'email',sun:'Aquarius',moon:'Cancer',rising:'Gemini',charts:[]};
function row(period:'daily'|'weekly',startsAt:string,endsAt:string,id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') {
 const edition=emptyHoroscopeEdition({period,audience:'rising',timeZone:'America/New_York',startsAt,endsAt});
 edition.passages=edition.passages.map(p=>({...p,headline:`${p.sign[0].toUpperCase()+p.sign.slice(1)} & ${p.sign[0].toUpperCase()+p.sign.slice(1)} Rising`,body:`You can read the ${period} ${p.sign} fixture opening.\n\nYour ${period} ${p.sign} fixture ends here.`}));
 return {id,content_key:horoscopeEditionKey(edition.window),surface:'sky',mode:'article',status:'LIVE',lane:'serving',review_state:null,body:horoscopeEditionBody(edition),sections:{horoscopeEdition:edition}};
}
const daily=row('daily','2026-09-27T04:00:00.000Z','2026-09-28T04:00:00.000Z');
const weekly=row('weekly','2026-09-21T04:00:00.000Z','2026-09-28T04:00:00.000Z','bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');

for(const [width,theme] of [[390,'light'],[390,'dark'],[1440,'light'],[1440,'dark']] as const) {
 test(`Rising default and Sun shortcut preserve complete daily and weekly readings ${width} ${theme}`,async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize({width,height:1000});await page.clock.setFixedTime(new Date('2026-09-27T16:00:00Z'));
  await page.addInitScript(({profile,theme})=>{localStorage.setItem('tldrastro:userProfile',JSON.stringify(profile));localStorage.setItem('tldrastro:theme',theme);localStorage.setItem('tldrastro:horoscopeLocation',JSON.stringify({label:'New York',latitude:40.7,longitude:-74,timeZone:'America/New_York'}));},{profile:fixtureProfile,theme});
  let empty=false;const requests:any[]=[];
  await page.route('**/api/content-reader',route=>{const query=route.request().postDataJSON();if(query.horoscope)requests.push(query.horoscope);return route.fulfill({json:{schema:READER_ROW_SCHEMA,rows:empty?[]:query.horoscope?.period==='daily'?[daily]:query.horoscope?.period==='weekly'?[weekly]:[],publications:[],nextCursor:null}});});
  await page.goto('/#horoscopes');
  await expect(page.getByRole('button',{name:'Today',exact:true})).toHaveAttribute('aria-pressed','true');
  await expect(page.getByLabel('Zodiac sign',{exact:true})).toHaveValue('gemini');
  await expect(page.getByRole('button',{name:'Your rising sign · Gemini',exact:true})).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('.horoscope-page :is(h1,h2)')).toHaveText(['Horoscopes','Gemini & Gemini Rising']);
  await expect(page.getByRole('article')).toContainText('You can read the daily gemini fixture opening.');
  await expect(page.getByRole('article')).toContainText('Your daily gemini fixture ends here.');
  await expect(page.locator('.learn-kicker')).toHaveText('Your rising sign · Today');
  const requestsBeforeSwitch=requests.length;
  await page.getByRole('button',{name:'Your Sun sign · Aquarius',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Aquarius & Aquarius Rising',exact:true})).toBeVisible();
  await expect(page.locator('.learn-kicker')).toHaveText('Your Sun sign · Today');
  await expect(page.getByRole('article')).toContainText('Your daily aquarius fixture ends here.');
  expect(requests).toHaveLength(requestsBeforeSwitch); // Both signs come from the same published edition.
  await page.reload();await expect(page.getByLabel('Zodiac sign',{exact:true})).toHaveValue('aquarius');
  await page.getByRole('button',{name:'This week',exact:true}).click();
  await expect(page.getByRole('article')).toContainText('Your weekly aquarius fixture ends here.');
  await page.getByRole('button',{name:'Your rising sign · Gemini',exact:true}).click();
  await expect(page.getByRole('article')).toContainText('You can read the weekly gemini fixture opening.');
  await expect(page.getByRole('article')).toContainText('Your weekly gemini fixture ends here.');
  await page.getByLabel('Zodiac sign',{exact:true}).selectOption('leo');
  await expect(page.locator('.learn-kicker')).toHaveText('Leo · This week');
  await expect(page.getByRole('group',{name:'Your signs'}).locator('[aria-pressed="true"]')).toHaveCount(0);
  await page.goBack();await expect(page.getByLabel('Zodiac sign',{exact:true})).toHaveValue('gemini');
  expect(await page.locator('.horoscope-page h2').evaluate(el=>{const probe=document.createElement('h2');probe.style.cssText='font-family:var(--font-display);font-size:var(--type-h2-size);font-weight:var(--weight-regular);line-height:var(--leading-h2);letter-spacing:var(--tracking-title);margin:var(--space-4) 0';el.parentElement!.append(probe);const a=getComputedStyle(el),b=getComputedStyle(probe);const same=['fontFamily','fontSize','fontWeight','lineHeight','letterSpacing','margin','textTransform','textAlign'].every(k=>(a as any)[k]===(b as any)[k]);probe.remove();return same;})).toBe(true);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:`test-results/horoscope-personalized-${width}-${theme}.png`,fullPage:true,animations:'disabled'});
  empty=true;await page.reload();await expect(page.getByRole('status')).toContainText('haven’t been published');
  await expect(page.locator('.horoscope-page :is(h1,h2,h3)')).toHaveText(['Horoscopes']);
  await expect(page.getByRole('button',{name:'Your rising sign · Gemini',exact:true})).toBeVisible();
  await page.screenshot({path:`test-results/horoscope-personalized-empty-${width}-${theme}.png`,fullPage:true,animations:'disabled'});
  expect(errors).toEqual([]);
 });
}

for(const initiallyEmpty of [false,true])test(`Local midnight refresh with ${initiallyEmpty?'missing':'published'} edition`,async({browser,baseURL})=>{
 // Browser and selected city deliberately disagree about which day it is.
 const context=await browser.newContext({baseURL,timezoneId:'Asia/Tokyo'});
 try {
  const page=await context.newPage();await page.clock.install({time:new Date('2026-09-28T03:59:00.000Z')});
  await page.addInitScript(()=>localStorage.setItem('tldrastro:horoscopeLocation',JSON.stringify({label:'New York',latitude:40.7,longitude:-74,timeZone:'America/New_York'})));
  const next=row('daily','2026-09-28T04:00:00.000Z','2026-09-29T04:00:00.000Z');const queries:any[]=[];
  await page.route('**/api/content-reader',route=>{const query=route.request().postDataJSON();if(query.horoscope)queries.push(query.horoscope);const rows=query.horoscope?(query.horoscope.at>='2026-09-28T04:00:00.000Z'?[next]:initiallyEmpty?[]:[daily]):query.ids?[daily]:[];return route.fulfill({json:{schema:READER_ROW_SCHEMA,rows,publications:[],nextCursor:null}});});
  await page.goto('/#horoscopes?period=daily&sign=gemini');
  if(initiallyEmpty)await expect(page.getByRole('status')).toContainText('haven’t been published');else await expect(page.locator('.horoscope-date')).toContainText('September 27, 2026');
  await page.clock.fastForward(61_000);
  await expect(page.locator('.horoscope-date')).toContainText('September 28, 2026');
  expect(queries.at(-1).timeZone).toBe('America/New_York');
  expect(queries.at(-1).at>='2026-09-28T04:00:00.000Z').toBe(true);
  expect(queries.length).toBeLessThan(5);
  // An archive link keeps its exact date across midnight.
  await page.goto(`/#horoscopes?period=daily&sign=gemini&edition=${daily.id}`);
  await expect(page.locator('.horoscope-date')).toContainText('September 27, 2026');
  await page.clock.fastForward(24*60*60*1000);
  await expect(page.locator('.horoscope-date')).toContainText('September 27, 2026');
 }finally{await context.close();}
});

test('Missing rising sign falls back to the saved Sun; an explicit URL still wins',async({page})=>{
 await page.addInitScript(profile=>localStorage.setItem('tldrastro:userProfile',JSON.stringify({...profile,rising:''})),fixtureProfile);
 await page.route('**/api/content-reader',route=>route.fulfill({json:{schema:READER_ROW_SCHEMA,rows:[],publications:[],nextCursor:null}}));
 await page.goto('/#horoscopes');
 await expect(page.getByLabel('Zodiac sign',{exact:true})).toHaveValue('aquarius');
 await expect(page.getByRole('button',{name:'Your Sun sign · Aquarius',exact:true})).toHaveAttribute('aria-pressed','true');
 await expect(page.getByRole('button',{name:/Your rising sign/})).toHaveCount(0);
 await page.goto('/#horoscopes?period=weekly&sign=taurus');
 await expect(page.getByLabel('Zodiac sign',{exact:true})).toHaveValue('taurus');
 await expect(page.getByRole('button',{name:'This week',exact:true})).toHaveAttribute('aria-pressed','true');
});
