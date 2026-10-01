import {test,expect} from '@playwright/test';
import {emptyHoroscopeEdition,horoscopeEditionKey,horoscopeEditionBody,HOROSCOPE_SIGNS} from '../../apps/web/src/content/horoscopeEditions.mjs';
import {READER_ROW_SCHEMA} from '../../apps/web/src/content/readerRowSchema.mjs';

const edition=emptyHoroscopeEdition({period:'weekly',audience:'rising',timeZone:'America/New_York',startsAt:'2026-09-21T04:00:00.000Z',endsAt:'2026-09-28T04:00:00.000Z'});
edition.passages=edition.passages.map(p=>({...p,headline:`${p.sign[0].toUpperCase()+p.sign.slice(1)} & ${p.sign[0].toUpperCase()+p.sign.slice(1)} Rising`,body:`The ${p.sign} weekly opening stays complete.\n\nThe ${p.sign} weekly ending stays complete.`}));
const row={id:'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',content_key:horoscopeEditionKey(edition.window),surface:'sky',mode:'article',status:'LIVE',lane:'serving',review_state:null,body:horoscopeEditionBody(edition),sections:{horoscopeEdition:edition}};

for(const [width,theme] of [[390,'light'],[390,'dark'],[1440,'light'],[1440,'dark']] as const){
 test(`Location reset, worldwide edition discovery and SVG sign navigation ${width} ${theme}`,async({browser,baseURL,storageState})=>{
  const context=await browser.newContext({baseURL,storageState,timezoneId:'Australia/Sydney',viewport:{width,height:1100}});
  try{
   const page=await context.newPage();const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
   await page.clock.setFixedTime(new Date('2026-09-27T23:52:00Z'));
   await page.addInitScript(theme=>{
    localStorage.setItem('tldrastro:theme',theme);
    localStorage.setItem('tldrastro:selectedLocation',JSON.stringify({label:'New York',latitude:40.7,longitude:-74,timeZone:'America/New_York'}));
    localStorage.setItem('tldrastro:horoscopeLocation',JSON.stringify({label:'New York',latitude:40.7,longitude:-74,timeZone:'UTC'}));
   },theme);
   const queries:any[]=[];let mode:'normal'|'empty'|'failed'|'conflict'='normal';
   await page.route('**/api/content-reader',route=>{
    const query=route.request().postDataJSON();if(query.horoscope)queries.push(query.horoscope);
    if(mode==='failed'&&query.horoscope&&!query.horoscope.timeZone)return route.fulfill({status:503,json:{error:'Fixture discovery unavailable'}});
    const matches=query.ids?.includes(row.id)||(query.horoscope?.period==='weekly'&&(!query.horoscope.timeZone||query.horoscope.timeZone==='America/New_York'));
    const rows=mode==='empty'?[]:matches?mode==='conflict'?[row,{...row,id:'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'}]:[row]:[];
    return route.fulfill({json:{schema:READER_ROW_SCHEMA,rows,publications:[],nextCursor:null}});
   });
   await page.goto('/#horoscopes?period=seasonal&sign=gemini');
   await expect(page.getByRole('heading',{name:'No seasonal reading yet'})).toBeVisible();
   const nav=page.getByRole('group',{name:'Zodiac signs',exact:true});
   await expect(nav.getByRole('button')).toHaveCount(12);
   expect(await nav.locator('img').evaluateAll(images=>images.map(image=>image.getAttribute('src')?.split('?')[0]))).toEqual(HOROSCOPE_SIGNS.map(sign=>`/zodiac/${sign}.svg`));
   await expect.poll(()=>nav.locator('img').evaluateAll(images=>images.every(image=>(image as HTMLImageElement).complete&&(image as HTMLImageElement).naturalWidth>0))).toBe(true);
   await page.locator('.horoscope-location summary').click();
   await page.getByLabel('Horoscope time zone',{exact:true}).selectOption('Europe/London');
   await expect(page.locator('.horoscope-location summary')).toContainText('Selected time zone · Europe/London');
   await expect(page.locator('.horoscope-location summary')).not.toContainText('New York');
   await page.getByRole('button',{name:'Reset to device time zone',exact:true}).click();
   await expect(page.locator('.horoscope-location summary')).toContainText('Device time zone · Australia/Sydney');
   await expect(page.getByRole('status')).toContainText('Australia/Sydney');
   // Init scripts seed only this visit; reset must persist across a genuine fresh page.
   const storage=await context.storageState();
   const fresh=await browser.newContext({baseURL,timezoneId:'Australia/Sydney',viewport:{width,height:1100},storageState:storage});
   try{
    const restored=await fresh.newPage();await restored.route('**/api/content-reader',route=>route.fulfill({json:{schema:READER_ROW_SCHEMA,rows:[],publications:[],nextCursor:null}}));
    await restored.goto('/#horoscopes');await expect(restored.locator('.horoscope-location summary')).toContainText('Device time zone · Australia/Sydney');
    expect(JSON.parse((await restored.evaluate(()=>localStorage.getItem('tldrastro:selectedLocation')))!)).toMatchObject({label:'New York',timeZone:'America/New_York'});
   }finally{await fresh.close();}
   const choice=page.getByRole('button',{name:'Read weekly horoscope · America/New York',exact:true});
   await expect(choice).toContainText('September 21, 2026 – September 27, 2026');
   await expect(page.getByRole('article')).toHaveCount(0);
   await expect(page.getByRole('button',{name:'Seasons',exact:true})).toHaveAttribute('aria-pressed','true');
   const headingStyle=await page.locator('.horoscope-empty h2').evaluate(el=>{const s=getComputedStyle(el);return[s.fontFamily,s.fontSize,s.fontWeight,s.lineHeight,s.letterSpacing,s.margin,s.textTransform,s.textAlign];});
   await page.locator('.horoscope-location summary').click();
   await page.screenshot({path:`test-results/horoscope-discovery-${width}-${theme}.png`,fullPage:true,animations:'disabled'});
   await choice.click();
   await expect(page.getByRole('article')).toContainText('The gemini weekly ending stays complete.');
   await expect(page.locator('.horoscope-timing-note')).toContainText('Some events may fall on a different day in Australia/Sydney');
   await expect(page.locator('.horoscope-location summary')).toContainText('Australia/Sydney');
   expect(await page.locator('.horoscope-reading h2').evaluate(el=>{const s=getComputedStyle(el);return[s.fontFamily,s.fontSize,s.fontWeight,s.lineHeight,s.letterSpacing,s.margin,s.textTransform,s.textAlign];})).toEqual(headingStyle);
   for(const sign of HOROSCOPE_SIGNS){
    const button=nav.getByRole('button').nth(HOROSCOPE_SIGNS.indexOf(sign));
    await button.focus();await page.keyboard.press('Enter');
    await expect(button).toHaveAttribute('aria-pressed','true');
    await expect(page.getByRole('article')).toContainText(`The ${sign} weekly opening stays complete.`);
    await expect(page.getByRole('article')).toContainText(`The ${sign} weekly ending stays complete.`);
   }
   await page.screenshot({path:`test-results/horoscope-glyphs-${width}-${theme}.png`,fullPage:true,animations:'disabled'});
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
   await page.goBack();await expect(nav.getByRole('button',{name:'Aquarius & Aquarius Rising',exact:true})).toHaveAttribute('aria-pressed','true');
   // Failed discovery is recoverable and never hides the local empty-state actions.
   mode='failed';await page.getByRole('button',{name:'Today',exact:true}).click();
   await page.getByRole('button',{name:'Try available readings again',exact:true}).waitFor();
   mode='normal';await page.getByRole('button',{name:'Try available readings again',exact:true}).click();await expect(choice).toBeVisible();
   mode='conflict';await page.getByRole('button',{name:'Seasons',exact:true}).click();
   await expect(page.getByText('Finding available readings…',{exact:true})).toHaveCount(0);
   await expect(page.getByRole('group',{name:'Available horoscopes',exact:true})).toHaveCount(0);
   mode='empty';await page.getByRole('button',{name:'Today',exact:true}).click();
   await expect(page.getByText('Explore the current sky or browse the calendar while you’re here.',{exact:true})).toBeVisible();
   await page.getByRole('link',{name:'Explore the sky',exact:true}).click();
   await expect(page.getByRole('region',{name:'Sky summary',exact:true})).toBeVisible();
   expect(queries.filter(query=>query.timeZone).some(query=>query.timeZone==='Australia/Sydney')).toBe(true);
   expect(errors).toEqual([]);
  }finally{await context.close();}
 });
}
