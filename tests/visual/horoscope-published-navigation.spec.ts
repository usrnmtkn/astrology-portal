import {test,expect,type Page} from '../helpers/polish-test';
import {emptyHoroscopeEdition,horoscopeEditionKey,horoscopeEditionBody} from '../../apps/web/src/content/horoscopeEditions.mjs';
import {READER_ROW_SCHEMA} from '../../apps/web/src/content/readerRowSchema.mjs';

const user={id:'11111111-1111-4111-8111-111111111111',aud:'authenticated',role:'authenticated',email:'reader@example.test',app_metadata:{provider:'email'},user_metadata:{name:'Fixture Reader'}};
const profile={id:user.id,name:'Fixture Reader',email:user.email,provider:'email',sun:'Aquarius',moon:'Cancer',rising:'Gemini',charts:[]};
const authKey=`sb-${new URL(process.env.VITE_SUPABASE_URL??'https://visual-smoke.supabase.test').hostname.split('.')[0]}-auth-token`;
const edition=emptyHoroscopeEdition({period:'weekly',audience:'rising',timeZone:'America/New_York',startsAt:'2026-09-21T04:00:00.000Z',endsAt:'2026-09-28T04:00:00.000Z'});
edition.passages=edition.passages.map(p=>({...p,headline:`${p.sign} weekly fixture`,body:`Complete ${p.sign} opening.\n\nComplete ${p.sign} ending.`}));
const row={id:'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',content_key:horoscopeEditionKey(edition.window),surface:'sky',mode:'article',status:'LIVE',lane:'serving',review_state:null,body:horoscopeEditionBody(edition),sections:{horoscopeEdition:edition}};
const publishedHref=`/#horoscopes?edition=${row.id}&period=weekly&sign=pisces`;

async function seed(page:Page,theme='light',authenticated=true){
 await page.clock.setFixedTime(new Date('2026-09-27T23:52:00.000Z'));
 await page.addInitScript(({profile,user,authKey,theme,authenticated})=>{
  localStorage.setItem('tldrastro:userProfile',JSON.stringify(profile));
  localStorage.setItem('tldrastro:portalMode','profile');
  localStorage.setItem('tldrastro:theme',theme);
  if(!localStorage.getItem('tldrastro:horoscopeLocation'))localStorage.setItem('tldrastro:horoscopeLocation',JSON.stringify({label:'New York',latitude:40.7,longitude:-74,timeZone:'America/New_York'}));
  if(authenticated)localStorage.setItem(authKey,JSON.stringify({user,access_token:'synthetic-token',refresh_token:'synthetic-refresh',token_type:'bearer',expires_at:4102444800}));
 },{profile,user,authKey,theme,authenticated});
 await page.route('**/rest/v1/**',route=>route.fulfill({json:[]}));
 await page.routeWebSocket('**/realtime/v1/websocket*',socket=>socket.onMessage(raw=>{
  const m=JSON.parse(String(raw)),payload={status:'ok',response:{}};
  socket.send(JSON.stringify(Array.isArray(m)?[m[0],m[1],m[2],'phx_reply',payload]:{topic:m.topic,event:'phx_reply',ref:m.ref,payload}));
 }));
}

for(const [width,theme] of [[390,'light'],[390,'dark'],[1440,'light'],[1440,'dark']] as const){
 test(`Published link survives delayed account restoration and reload ${width} ${theme}`,async({page})=>{
  await seed(page,theme);await page.setViewportSize({width,height:1000});
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  let release!:()=>void;const hold=new Promise<void>(resolve=>release=resolve);let authReads=0,profileReads=0;
  await page.route('**/auth/v1/**',async route=>{authReads++;await hold;await route.fulfill({json:user});});
  await page.route('**/rest/v1/user_profiles?**',route=>{if(route.request().method()==='GET')profileReads++;return route.fulfill({json:[]});});
  await page.route('**/api/content-reader',route=>route.fulfill({json:{schema:READER_ROW_SCHEMA,rows:route.request().postDataJSON()?.ids?.includes(row.id)?[row]:[],publications:[],nextCursor:null}}));
  await page.goto(publishedHref);
  await expect(page.getByRole('article',{name:'Pisces horoscope'})).toContainText('Complete pisces ending.');
  await expect.poll(()=>authReads).toBeGreaterThan(0);
  release();
  await expect.poll(()=>profileReads).toBeGreaterThan(0);
  await expect(page.getByRole('button',{name:'Also read for your rising sign · Gemini',exact:true})).toBeVisible();
  await expect(page.getByRole('heading',{name:'Horoscopes',exact:true})).toBeVisible();
  await expect(page.getByRole('article')).toContainText('Complete pisces opening.');
  await page.clock.setFixedTime(new Date('2026-10-05T16:00:00.000Z'));
  await page.reload();await expect.poll(()=>profileReads).toBeGreaterThan(1);
  await expect(page.getByRole('article')).toContainText('Complete pisces ending.');
  await expect(page.getByRole('button',{name:'Weekly',exact:true})).toHaveAttribute('aria-pressed','true');
  expect(new URL(page.url()).hash).toBe(publishedHref.slice(1));
  await page.getByRole('button',{name:'Also read for your rising sign · Gemini',exact:true}).click();
  await expect(page.getByRole('article')).toContainText('Complete gemini ending.');
  await page.goBack();await expect(page.getByRole('article')).toContainText('Complete pisces ending.');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:`test-results/horoscope-published-navigation-${width}-${theme}.png`,fullPage:true});
  expect(errors).toEqual([]);
 });
}

test('Empty reading stays in its period and zone, recovers from errors and navigates to a published prior day',async({page})=>{
 await seed(page,'light',false);
 const daily=emptyHoroscopeEdition({period:'daily',audience:'rising',timeZone:'America/New_York',startsAt:'2026-09-26T04:00:00.000Z',endsAt:'2026-09-27T04:00:00.000Z'});
 daily.passages=daily.passages.map(p=>({...p,headline:`${p.sign} daily fixture`,body:`Prior ${p.sign} opening.\n\nPrior ${p.sign} ending.`}));
 const dailyRow={...row,content_key:horoscopeEditionKey(daily.window),body:horoscopeEditionBody(daily),sections:{horoscopeEdition:daily}};
 let fail=false;const queries:any[]=[];
 await page.route('**/api/content-reader',route=>{
  const q=route.request().postDataJSON();if(q.horoscope)queries.push(q.horoscope);
  if(fail&&q.horoscope)return route.fulfill({status:503,json:{error:'Fixture unavailable'}});
  const h=q.horoscope;
  const matches=h?.period==='daily'&&h.timeZone==='America/New_York'&&Date.parse(h.at)>=Date.parse(daily.window.startsAt)&&Date.parse(h.at)<Date.parse(daily.window.endsAt);
  return route.fulfill({json:{schema:READER_ROW_SCHEMA,rows:matches?[dailyRow]:[],publications:[],nextCursor:null}});
 });
 await page.goto('/#horoscopes');
 const empty=page.locator('.horoscope-empty');
 await expect(empty).toContainText('daily horoscopes haven’t been published');
 await expect(page.getByRole('button',{name:'Daily',exact:true})).toHaveAttribute('aria-pressed','true');
 await expect(empty.locator('p')).toHaveCount(1);await expect(empty.getByRole('link')).toHaveCount(0);
 await expect(page.getByRole('button',{name:/Read.*horoscope/})).toHaveCount(0);
 expect(queries.every(q=>['daily','seasonal'].includes(q.period)&&q.timeZone==='America/New_York')).toBe(true);
 await page.getByRole('button',{name:/^Previous(?: |$)/}).click();
 await expect(page.getByRole('article')).toContainText('Prior gemini opening.');await expect(page.getByRole('article')).toContainText('Prior gemini ending.');
 await page.reload();await expect(page.getByRole('article')).toContainText('Prior gemini ending.');
 await page.getByRole('button',{name:/^Next(?: |$)/}).click();await expect(empty).toBeVisible();
 await page.locator('.horoscope-location summary').click();
 await page.getByLabel('Horoscope time zone',{exact:true}).selectOption('Australia/Sydney');
 await expect(empty).toContainText('Australia/Sydney');await expect(page.getByRole('article')).toHaveCount(0);
 await page.reload();await expect(empty).toContainText('Australia/Sydney');
 fail=true;await page.reload();await expect(page.getByRole('alert')).toContainText('could not load');
 fail=false;await page.getByRole('button',{name:'Try again',exact:true}).click();await expect(empty).toContainText('haven’t been published');
});
