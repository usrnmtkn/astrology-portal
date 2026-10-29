import { test, expect, type Page } from '../helpers/polish-test';
import { readFileSync } from 'node:fs';
import { getAstrodienstSky } from '../../apps/web/src/services/ephemeris';
import { natalSkySnapshotCacheKey, VERIFIED_SKY_CACHE_SCHEMA } from '../../apps/web/src/services/verifiedSkyCache';
import { rateRelationshipContacts, type ForecastContact } from '../../apps/web/src/services/relationshipForecast';
import { personalDayBounds } from '../../apps/web/src/services/personalDailyTransits';
import { bundledPublications } from '../helpers/bundled-publications';
import { readerResponse } from '../helpers/reader-response';
import { installSyntheticNetworkGuard } from '../helpers/synthetic-network-guard';
import skyHandler from '../../api/sky';
import type { IncomingMessage, ServerResponse } from 'node:http';

const guideKey = 'education/astro-101/chapter/06-aspects';
const guide = JSON.parse(readFileSync('data/astro-101/astro-101-rows.json', 'utf8')).rows.find((row: any) => row.content_key === guideKey);
const guideBody = guide.sections.blocks.find((block: any) => block.heading === "Ptolemy's five").body as string;
const contact = (planet: string, aspect: string, units: number, owner: 'reader'|'friend' = 'reader', target = 'Sun'): ForecastContact => ({
  id: `${owner}:${planet}:${aspect}:${target}`, planet, aspect, target, owner, orb: 0, units,
  channel: ['trine', 'sextile'].includes(aspect) ? 'flow' : ['square', 'opposition'].includes(aspect) ? 'friction' : 'unrated',
  exactAt: [], continuesFromPreviousDay: true, continuesIntoNextDay: true,
  targetLongitude: 0, transitLongitude: 60, peakAt: '2026-10-25T16:00:00Z', activeIntervals: [], timeLord: true, retrograde: false,
  connections: [{ id:'fixture-link',readerPoint:'Sun',friendPoint:'Mars',aspect:'trine',orb:0.5,directContactId:'fixture-other' }]
});
const authoredRows = JSON.parse(readFileSync('apps/web/src/content/fallbackArchitectureV3/source-rows/transit-synastry-rows-v1.json','utf8')).authoredCards;

async function forecastFixture(page: Page, width: number, theme: string, realCalculations: boolean | "personal" = false, multipleLinks = false, birthHour = 12, date = '2026-10-25') {
  const at = `${date}T16:00:00.000Z`;
  const location = { label: 'New York', latitude: 40.7, longitude: -74, timeZone: 'America/New_York' };
  const birth = new Date(Date.parse('1990-01-01T05:00:00Z') + birthHour * 3_600_000);
  const birthTime = birthHour === 12 ? '12:00 PM' : `${String(birthHour).padStart(2,'0')}:00`;
  const natal = { ...await getAstrodienstSky(location, birth), birthTimeKnown: true };
  const key = natalSkySnapshotCacheKey(location, birth);
  const user = { id: 'forecast-reader', email: 'reader@example.test', aud: 'authenticated', role: 'authenticated', app_metadata: { provider: 'email' }, user_metadata: { name: 'Fixture Reader' } };
  const profile = { id: user.id, name: 'Fixture Reader', email: user.email, provider: 'email', currentLocation: location.label, currentLocationData: location,
    charts: [{ id: 'forecast-natal', name: 'Fixture Reader', type: 'Birth chart', birthDate: '1990-01-01', birthTime, birthCity: location.label, birthLocation: location }] };
  const authKey = `sb-${new URL(process.env.VITE_SUPABASE_URL ?? 'https://visual-smoke.supabase.test').hostname.split('.')[0]}-auth-token`;
  await page.setViewportSize({ width, height: 1000 });
  await page.clock.setFixedTime(new Date(at));
  await bundledPublications(page);
  await page.route('**/auth/v1/**', route => route.fulfill({ json: user }));
  await page.route('**/rest/v1/user_profiles*', route => route.fulfill({ json: { data: { version: 1, profile } } }));
  await page.route('**/rest/v1/manual_charts*', route => route.fulfill({ status: 503, json: { message: 'Synthetic offline chart sync' } }));
  await page.route('https://tldrastro-api-27165565299.us-central1.run.app/**', route => route.fulfill({ status: 503, body: 'Synthetic local fixture' }));
  await page.route('**/api/sky?**', async route => {
    const response = { statusCode: 200, setHeader() {}, end(body: string) { void route.fulfill({ status: this.statusCode, contentType: 'application/json', body }); } };
    await skyHandler({ method: 'GET', url: route.request().url() } as IncomingMessage, response as unknown as ServerResponse);
  });
  const days = Object.fromEntries(['2026-10-25', '2026-10-26', '2026-10-27'].map((date, index) => {
    const contacts = index === 0 ? [contact('Venus','trine',100),contact('Jupiter','opposition',40,'friend','Mars'),
      {...contact('Moon','sextile',35,'friend','Sun'),timeLord:false,connections:[]},
      {...contact('Mars','square',60,'reader','Moon'),timeLord:false,connections:[]},
      {...contact('Moon','sextile',20,'reader','Mars'),timeLord:false,connections:[]}]
      : index === 1 ? [{...contact('Mars','square',125,'friend','Moon'),connections:[]}]:[];
    const bounds = personalDayBounds(date, location.timeZone);
    // Deterministic rendering fixtures use the real rating function. The Swiss
    // calculations and civil-day boundaries have their own independent suite.
    const dated = contacts.map((row,i) => ({ ...row, exactAt: i<3 ? [`${date}T16:00:00.000Z`]:[] }));
    if (index === 0) {
      dated[1] = { ...dated[1], planet: 'Venus', aspect: 'sextile', channel: 'flow', id: 'friend:Venus:sextile:Mars' };
      dated[0].connections[0].directContactId = dated[1].id;
      dated[1].connections = [{ ...dated[0].connections[0], directContactId: dated[0].id }];
      if(multipleLinks){
        const link={id:'fixture-link-b',readerPoint:'Sun',friendPoint:'Mercury',aspect:'sextile',orb:0.9,directContactId:'friend:Venus:opposition:Mercury'};
        dated[0].connections.push(link);
        dated.push({...contact('Venus','opposition',30,'friend','Mercury'),connections:[{...link,directContactId:dated[0].id}]});
      }
    }
    return [date, { date, start: bounds.start.toISOString(), end: bounds.end.toISOString(), contacts: dated, ...rateRelationshipContacts(dated), drivers:dated.slice(0,2).map(c=>c.id),mainThemes:dated.slice(0,2).map(c=>c.id),annualTiming:[{owner:'reader',house:2,sign:'Taurus',lordOfYear:'Venus'},{owner:'friend',house:9,sign:'Sagittarius',lordOfYear:'Jupiter'}] }];
  }));
  await page.addInitScript(({ at, theme, location, profile, user, authKey, natal, key, schema, days, realCalculations }) => {
    if (!localStorage.getItem('forecastFixtureSeeded')) {
      localStorage.setItem('forecastFixtureSeeded', 'true');
      localStorage.setItem('tldrastro:theme', theme);
      localStorage.setItem('tldrastro:pageAnimations', 'off');
      localStorage.setItem('tldrastro:selectedLocation', JSON.stringify(location));
      localStorage.setItem('tldrastro:userProfile', JSON.stringify(profile));
      localStorage.setItem(authKey, JSON.stringify({ access_token: 'synthetic-forecast-session', refresh_token: 'synthetic-refresh', expires_at: Date.parse(at) / 1000 + 3600, token_type: 'bearer', user }));
      localStorage.setItem(key, JSON.stringify({ schema, cacheKey: key, snapshot: natal, verifiedAt: at }));
      localStorage.setItem('tldrastro:manualCharts:forecast-reader', JSON.stringify([{ id: 'forecast-saved', ownerUserId: user.id, chartType: 'person', displayName: 'Fixture Friend', firstName: 'Fixture', relationshipType: 'friend', birthDate: '1990-01-01', birthTime: profile.charts[0].birthTime, birthTimeUnknown: false, birthPlace: location.label, birthLocation: location, natalChart: natal, createdAt: at, updatedAt: at }]));
    }
    const rateFixtureContacts=(contacts:any[])=>({rating:contacts.length?'tense':'quiet',flow:0,friction:contacts.length?35:0,drivers:contacts.map(c=>c.id)});
    const OriginalWorker = window.Worker;
    window.Worker = class extends OriginalWorker {
      constructor(...args:ConstructorParameters<typeof Worker>){
        super(...args);
        this.addEventListener('message',event=>{
          // A bounded rendering fixture selects the real Swiss Moon/Mercury
          // contacts. Personal timing and the two article resolvers stay real.
          if(realCalculations!=='personal'||!Array.isArray(event.data?.value)||event.data.fixtureFiltered||!event.data.value[0]?.day)return;
          const value=event.data.value.map((row:any)=>{
            const contacts=row.day.contacts.filter((c:any)=>c.planet==='Moon'&&c.aspect==='square'&&c.target==='Mercury').map((c:any)=>({...c,connections:c.connections.filter((link:any)=>link.readerPoint==='Mercury'&&link.friendPoint==='Mercury')}));
            return {...row,day:{...row.day,contacts,...rateFixtureContacts(contacts),mainThemes:contacts.map((c:any)=>c.id)}};
          });
          event.stopImmediatePropagation();this.dispatchEvent(new MessageEvent('message',{data:{...event.data,value,fixtureFiltered:true}}));
        });
      }
      postMessage(message: any, transfer: any) {
        if (!realCalculations && message.kind === 'natal-transit-timing') {
          if((window as any).forecastTimingFail){queueMicrotask(()=>this.dispatchEvent(new MessageEvent('message',{data:{id:message.id,ok:false,error:'Synthetic timing failure'}})));return;}
          const value={currentStart:'2026-10-24T12:00:00Z',currentEnd:'2026-10-28T12:00:00Z',engagementStart:'2026-10-24T12:00:00Z',engagementEnd:'2026-10-28T12:00:00Z',group:'this-week',phase:'exact',passIndex:1,exactPasses:[]};
          queueMicrotask(()=>this.dispatchEvent(new MessageEvent('message',{data:{id:message.id,ok:true,value}}))); return;
        }
        if (!realCalculations && message.kind === 'relationship-forecast-day') {
          const value = message.args[0].map((pair: any) => ({ id: pair.id, day: days[message.args[1]] }));
          queueMicrotask(() => this.dispatchEvent(new MessageEvent('message', { data: { id: message.id, ok: true, value } })));
          return;
        }
        super.postMessage(message, transfer);
      }
    };
  }, { at, theme, location, profile, user, authKey, natal, key, days, realCalculations, schema: VERIFIED_SKY_CACHE_SCHEMA });
  return {natal};
}

for (const [width, theme] of [[390,'dark'],[390,'light'],[1440,'light'],[1440,'dark']] as const) {
  test(`Natal Friction/Flow readings preserve feed ${width} ${theme}`, async ({page})=>{
    test.setTimeout(120_000);
    await forecastFixture(page,width,theme);
    let failed=width===390;
    await page.route('**/api/content-reader',route=>{
      const query=route.request().postDataJSON();
      if(!query.keys?.includes(guideKey))return route.fulfill({json:readerResponse([])});
      if(failed)return route.fulfill({status:500,json:{message:'Synthetic source failure'}});
      return route.fulfill({json:readerResponse([])});
    });
    await page.goto('/?date=2026-10-25#friends?tab=feed');
    const group=page.getByRole('region',{name:'Friction and flow',exact:true});
    const today=group.getByRole('button',{name:'Today, Oct 25, Easy for You and Fixture Friend',exact:true});
    await expect(today).toBeVisible({timeout:60_000});
    await expect(group.locator('.pair-forecast-days')).toHaveCount(1);
    await expect(group.locator('.pair-forecast-day')).toHaveCount(3);
    await expect(group.locator('.pair-forecast-identity button')).toHaveCSS('text-decoration-line','underline');
    await expect(page.locator('.friends-person-day, .friends-feed-disclosure')).toHaveCount(0);
    await today.click();
    const dialog=page.getByRole('dialog',{name:'You and Fixture Friend',exact:true});
    await expect(dialog.getByRole('heading')).toHaveText(['You and Fixture Friend','Between you','Transits']);
    await expect(dialog.getByRole('button',{name:'Close forecast',exact:true})).toBeFocused();
    const tile=dialog.locator('.pair-forecast-link-toggle').first();
    await expect(tile).toHaveAttribute('aria-expanded','true');
    await expect(tile).toContainText('Your Sun trine Fixture Friend’s Mars');
    await expect(tile).toContainText('2 transits today');
    await expect(dialog.getByLabel('1 trine',{exact:true})).toBeVisible();
    await expect(dialog.getByLabel('1 sextile',{exact:true})).toBeVisible();
    const bodies=dialog.locator('[data-content-key^="authored/transit-aspect/"]');
    await expect(bodies).toHaveCount(2,{timeout:60_000});
    for(const element of await bodies.all()){
      const key=await element.getAttribute('data-content-key');
      const original=authoredRows.find((r:any)=>r.contentKey===key);
      expect(original,`Existing authored source ${key}`).toBeTruthy();
      const owner=await element.locator('xpath=ancestor::*[@data-endpoint-owner][1]').getAttribute('data-endpoint-owner');
      const body=owner==='reader'?(original.body_you??original.body):original.body_they;
      const expected=body.replaceAll('{{untilDate}}','October 28, 2026').replaceAll('{{Name}}',owner==='reader'?'you':'Fixture Friend')
        .replaceAll('{{aspectWord}}',owner==='friend'?'sextile':'trine');
      expect((await element.textContent())!.replace(/\s+/g,' ').trim()).toBe(expected.replace(/\s+/g,' ').trim());
      await expect(element.locator('p').first()).toHaveCSS('font-size','19px');
      expect(await element.locator('p').first().evaluate(e=>getComputedStyle(e).fontFamily)).toContain('Newsreader');
      await expect(element).toHaveCSS('-webkit-line-clamp','3');
    }
    await expect(dialog.locator('.pair-forecast-person strong')).toHaveText(['Fixture Friend','You']);
    for(const link of await dialog.locator('.pair-forecast-person').all()) expect(new URL((await link.getAttribute('href'))!).searchParams.get('date')).toBe('2026-10-25');
    if(width===1440) await expect(dialog).toHaveCSS('width','520px');
    if(theme==='dark') {
      const cardColor=await dialog.locator('.pair-forecast-link').first().evaluate(e=>getComputedStyle(e).backgroundColor);
      expect(cardColor).not.toBe(await dialog.evaluate(e=>getComputedStyle(e).backgroundColor));
      expect(await dialog.locator('.pair-forecast-transit .pair-forecast-chevron').first().evaluate(e=>getComputedStyle(e).backgroundColor)).not.toBe(cardColor);
    }
    await page.screenshot({path:`test-results/friends-day-sheet-${width}-${theme}.png`});
    await page.setViewportSize({width,height:1550});
    await dialog.screenshot({path:`test-results/friction-flow-handoff11-complete-${width}-${theme}.png`});
    await page.setViewportSize({width,height:1000});
    await tile.click();await expect(tile).toHaveAttribute('aria-expanded','false');
    await expect(bodies.first()).not.toBeVisible();await tile.click();
    await dialog.getByRole('button',{name:'How this is rated',exact:true}).click();
    const method=page.getByRole('dialog',{name:'How this is rated',exact:true});
    await expect(method).toContainText('Flow leads among the overlapping transits');
    await method.getByText('Annual profections',{exact:true}).click();
    await expect(method).toContainText('Lord of the year: Venus');await expect(method).toContainText('Lord of the year: Jupiter');
    if(failed){await expect(method.getByText('Some aspect explanations could not load.',{exact:true})).toBeVisible();failed=false;await method.getByRole('button',{name:'Try again',exact:true}).click();}
    await page.keyboard.press('Escape');await expect(dialog).toBeVisible();
    await page.keyboard.press('Escape');await expect(today).toBeFocused();
    await group.getByRole('button',{name:'Tomorrow, Oct 26, Active for You and Fixture Friend',exact:true}).click();
    await expect(dialog.getByRole('heading')).toHaveText(['You and Fixture Friend','Transits']);
    await expect(dialog.locator('.pair-forecast-person').first()).toContainText('Their transits on Mon, Oct 26');
    await page.keyboard.press('Escape');
    await group.getByRole('button',{name:'Tue, Oct 27, Quiet for You and Fixture Friend',exact:true}).click();
    await expect(dialog.getByRole('heading')).toHaveText(['You and Fixture Friend','Transits']);
    await page.keyboard.press('Escape');
    await today.click();await page.reload();await expect(dialog).toBeVisible({timeout:60_000});
    await expect(bodies).toHaveCount(2,{timeout:60_000});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    const panel=await dialog.boundingBox();expect(panel!.width).toBeLessThanOrEqual(width);
  });
}

test('Real Swiss worker to natal readings and existing date feed',async({page})=>{
  test.setTimeout(120_000);
  const {natal}=await forecastFixture(page,1440,'light',true);
  await page.goto('/?date=2026-10-25#friends?tab=feed');
  const group=page.getByRole('region',{name:'Friction and flow',exact:true});
  const today=group.getByRole('button',{name:/^Today, Oct 25, .* for You and Fixture Friend$/});
  await expect(today).toBeEnabled({timeout:60_000});
  await expect(group).not.toContainText('composite');
  await today.click();
  const dialog=page.getByRole('dialog',{name:'You and Fixture Friend',exact:true});
  await expect(dialog.locator('.pair-forecast-link-toggle').first()).toBeVisible({timeout:60_000});
  // Independent Swiss reference for this synthetic birth: Moon square Mercury.
  await expect(dialog).toContainText('Moon conjunction your Ascendant');
  await expect(dialog).toContainText('Moon conjunction Fixture Friend’s Ascendant');
  await expect(dialog.locator('a.pair-forecast-transit')).toHaveCount(0);
  await dialog.getByRole('button',{name:'How this is rated',exact:true}).click();
  const method=page.getByRole('dialog',{name:'How this is rated',exact:true});
  const annual=method.locator('details').filter({has:page.getByText('Annual profections',{exact:true})});
  await annual.locator('summary').click();
  await expect(annual).toContainText(`Annual profection: house 1, ${natal.ascendant}`);
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  const originalToday=page.getByRole('region',{name:'Today',exact:true});
  const card=originalToday.locator('.friends-timing-card').filter({hasText:"Moon in Aries square Fixture Friend's natal Mercury"});
  await expect(card).toBeVisible({timeout:60_000});
  await expect(card.locator('.friends-timing-card__friend-name')).toHaveCSS('text-decoration-line','underline');
  await page.screenshot({path:'test-results/friends-natal-real-feed.png',fullPage:true});
  await page.reload();await today.click({timeout:60_000});
  await expect(dialog).toContainText('Moon conjunction your Ascendant',{timeout:60_000});
});

for(const width of [390,1440]) for(const theme of ['light','dark']) test(`Studio edits Friction/Flow status and profections without changing feed design ${width} ${theme}`,async({page},testInfo)=>{
  test.setTimeout(150_000);
  page.setDefaultTimeout(15_000);
  const {studioApiStore}=await import('../helpers/studio-api-store');
  const {routeStudioInventoryApi}=await import('../helpers/studio-inventory-route');
  const {frictionFlowField}=await import('../../apps/web/src/content/frictionFlowCatalog');
  const store=await studioApiStore([],{uuidIds:true});
  try {
    await forecastFixture(page,width,theme);
    await page.addInitScript(theme=>{localStorage.setItem('tldrastro:contentAdminSecret','calendar-api-fixture');localStorage.setItem('tldrastro:studio-theme',theme);},theme);
    await routeStudioInventoryApi(page,{call:store.call,actualDocumentRoute:true,answer:async(route,url)=>{
      if(url.pathname==='/api/content-reader'){
        const result=await store.call({method:'POST',url:url.pathname,body:route.request().postDataJSON()});
        await route.fulfill({status:result.status,json:result.payload});return true;
      }
      if(url.pathname==='/api/admin/content-live-status'){
        const statuses=await store.call({method:'statuses',body:route.request().postDataJSON()});
        await route.fulfill({json:{ok:true,statuses}});return true;
      }
      if(url.pathname==='/api/sky'){await route.fallback();return true;}
      return false;
    }});
    const group=page.getByRole('region',{name:'Friction and flow',exact:true});
    const today=group.getByRole('button',{name:'Today, Oct 25, Easy for You and Fixture Friend',exact:true});
    const feedPath='/?date=2026-10-25#friends?tab=feed';
    await page.goto(feedPath); await expect(today).toBeEnabled({timeout:60_000});
    const design=()=>group.locator('.pair-forecast').evaluate(e=>{
      const style=getComputedStyle(e),title=getComputedStyle(e.querySelector('h3')!);
      return {classes:e.className,background:style.backgroundColor,radius:style.borderRadius,padding:style.padding,font:title.fontFamily,size:title.fontSize,lineHeight:title.lineHeight,weight:title.fontWeight};
    });
    const before=await design();
    await page.goto('/admin/content#connection-transits');
    const studio=page.getByRole('region',{name:'Friction and flow writing',exact:true});
    await expect(studio).toBeVisible();
    const analogous=page.getByRole('heading',{name:'Transit reading',exact:true});
    const heading=studio.getByRole('heading',{name:'Friction and flow writing',exact:true});
    for(const prop of ['font-family','font-size','font-weight','line-height','letter-spacing','margin-top','text-transform','text-align'])
      expect(await heading.evaluate((e,p)=>getComputedStyle(e).getPropertyValue(p),prop)).toBe(await analogous.evaluate((e,p)=>getComputedStyle(e).getPropertyValue(p),prop));
    const editor=page.getByRole('dialog',{name:'Generated content editor'});
    const bodyField=editor.locator('textarea[data-sky-field="body"]');
    const revised=new Map<string,string>();
    for(const name of ['explanation/easy','profection/priority','profection/facts','profection/method','method/charts','method/rating']){
      const key='cms/friction-flow/'+name,field=frictionFlowField(key)!;
      await studio.getByRole('combobox',{name:'Writing group',exact:true}).selectOption(field.group);
      await studio.getByRole('combobox',{name:'Writing source',exact:true}).selectOption(key);
      await studio.getByRole('button',{name:'Edit Friction/Flow writing',exact:true}).click();
      await expect(bodyField).toHaveValue(field.body);
      const text=`Fixture ${name}. ${field.body} Complete fixture ending.`;
      revised.set(name,text);
      await bodyField.fill(text);
      const save=editor.locator('.admin-editor-savebar').getByRole('button',{name:/^Save(?: draft)?$/,exact:true});
      await save.click();
      await expect.poll(async()=>(await store.call({method:'rows'})).find((r:any)=>r.content_key===key)?.body).toBe(text);
      expect((await store.call({method:'rows'})).find((r:any)=>r.content_key===key).status).toBe('DRAFT');
      const draftRead=await store.call({method:'POST',url:'/api/content-reader',body:{keys:[key]}});expect(draftRead.payload.rows).toHaveLength(0);
      await page.reload();
      // Selection resets to its initial group on reload; navigate to the exact saved source again.
      await studio.getByRole('combobox',{name:'Writing group',exact:true}).selectOption(field.group);
      await studio.getByRole('combobox',{name:'Writing source',exact:true}).selectOption(key);
      await studio.getByRole('button',{name:'Edit Friction/Flow writing',exact:true}).click();
      await expect(bodyField).toHaveValue(text);
      if(name==='profection/facts'){
        await bodyField.fill('The house is {untrusted}.');
        await expect(editor.locator('.admin-editor-savebar').getByRole('button',{name:'Save & publish',exact:true})).toBeDisabled();
        await bodyField.fill(text);
      }
      await editor.locator('.admin-editor-savebar').getByRole('button',{name:'Save & publish',exact:true}).click();
      await expect.poll(async()=>(await store.call({method:'rows'})).find((r:any)=>r.content_key===key)?.status).toBe('LIVE');
      await editor.getByRole('button',{name:'Close',exact:true}).click();
    }
    await page.screenshot({path:testInfo.outputPath(`friction-flow-studio-${width}-${theme}.png`),fullPage:true});
    await page.goto(feedPath);await expect(today).toBeEnabled({timeout:60_000});
    expect(await design()).toEqual(before);
    await expect(group.locator('.pair-forecast-day')).toHaveCount(3);
    await expect(group.locator('.pair-forecast-identity button')).toHaveCSS('text-decoration-line','underline');
    await today.click();
    const dialog=page.getByRole('dialog',{name:'You and Fixture Friend',exact:true});
    await expect(dialog.locator('[data-content-key^="authored/transit-aspect/"]').first()).toBeVisible();
    await dialog.getByRole('button',{name:'How this is rated',exact:true}).click();
    const method=page.getByRole('dialog',{name:'How this is rated',exact:true});
    await expect(method.locator('[data-content-key="cms/friction-flow/explanation/easy"]')).toHaveText(revised.get('explanation/easy')!);
    await method.locator('summary').filter({hasText:/^Annual profections/}).click();
    await expect(method.locator('[data-content-key="cms/friction-flow/profection/priority"]')).toHaveText(revised.get('profection/priority')!);
    await expect(method).toContainText(revised.get('profection/facts')!.replace('{house}','2').replace('{sign}','Taurus').replace('{lordOfYear}','Venus'));
    await page.screenshot({path:testInfo.outputPath(`friction-flow-published-${width}-${theme}.png`)});
    for(const name of ['profection/method','method/charts','method/rating']) await expect(method).toContainText(revised.get(name)!);
    await page.keyboard.press('Escape');await page.keyboard.press('Escape');
    await page.reload();await today.click({timeout:60_000});
    await dialog.getByRole('button',{name:'How this is rated',exact:true}).click();
    await expect(method.locator('[data-content-key="cms/friction-flow/explanation/easy"]')).toHaveText(revised.get('explanation/easy')!);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  } finally {store.close();}
});

for(const width of [360,1440]) test(`Day sheet missing reading and timing retry ${width}`,async({page})=>{
  await forecastFixture(page,width,'dark');
  await page.addInitScript(()=>{Object.assign(window,{forecastTimingFail:true});});
  await page.route('**/api/content-reader',route=>route.fulfill({json:readerResponse([],[{content_key:'authored/transit-aspect/venus/sun/soft',state:'retired',revision:900001,row_id:null,row_updated_at:null,updated_at:'2026-10-25T16:00:00Z'}])}));
  await page.goto('/?date=2026-10-25#friends?tab=feed');
  const tile=page.getByRole('button',{name:'Today, Oct 25, Easy for You and Fixture Friend',exact:true});await tile.click({timeout:60_000});
  const dialog=page.getByRole('dialog',{name:'You and Fixture Friend',exact:true});
  await expect(dialog.getByRole('button',{name:'Try again',exact:true})).toBeVisible();
  await expect(dialog.locator('a.pair-forecast-transit')).toHaveCount(0);
  await page.evaluate(()=>{(window as any).forecastTimingFail=false;});await dialog.getByRole('button',{name:'Try again',exact:true}).click();
  await expect(dialog.locator('a.pair-forecast-transit')).toHaveCount(1);
  const missing=dialog.locator('.pair-forecast-transit[data-endpoint-owner="reader"]');
  await expect(missing).toHaveJSProperty('tagName','DIV');await expect(missing.locator('a,button,[tabindex],.pair-forecast-chevron')).toHaveCount(0);
  await expect(missing).toContainText('Venus trine your Sun');
  expect(await dialog.evaluate(e=>e.scrollWidth<=e.clientWidth)).toBe(true);
  const close=dialog.getByRole('button',{name:'Close forecast',exact:true});await close.focus();await page.keyboard.press('Shift+Tab');
  await expect(dialog.getByRole('button',{name:'How this is rated',exact:true})).toBeFocused();
  await page.keyboard.press('Escape');await expect(tile).toBeFocused();
  await tile.click();
  if(width===360){
    const header=dialog.locator('header');
    await header.dispatchEvent('pointerdown',{pointerType:'touch',pointerId:4,clientX:120,clientY:100});
    await header.dispatchEvent('pointerup',{pointerType:'touch',pointerId:4,clientX:122,clientY:200});
  }else await page.locator('.pair-forecast-modal .modal-positioner').click({position:{x:5,y:5}});
  await expect(dialog).not.toBeVisible();await expect(tile).toBeFocused();
});

for(const owner of ['reader','friend'] as const) test(`Day sheet real personal article and Back ${owner}`,async({page})=>{
  test.setTimeout(150_000);
  await forecastFixture(page,390,'light','personal');
  await page.goto('/?date=2026-10-25#friends?tab=feed');
  const tile=page.getByRole('region',{name:'Friction and flow',exact:true}).locator('.pair-forecast-day-open').first();await tile.click({timeout:60_000});
  const dialog=page.getByRole('dialog',{name:'You and Fixture Friend',exact:true});
  const link=dialog.locator(`a.pair-forecast-transit[data-endpoint-owner="${owner}"]`).first();await expect(link).toBeVisible({timeout:60_000});
  const title=await link.locator('strong').innerText();
  await link.click();await expect(dialog).not.toBeVisible();
  const article=page.locator(owner==='reader'?'.you-transit-article':'.sky-detail-article');
  await expect(article).toBeVisible({timeout:60_000});
  await expect(article).toContainText(title.split(' ')[0]);
  expect(new URL(page.url()).searchParams.get('date')).toBe('2026-10-25');
  await page.reload();await expect(article).toBeVisible({timeout:60_000});
  expect(await page.evaluate(()=>history.state?.articleParent)).toContain('flowPair=');
  await page.getByRole('button',{name:owner==='reader'?'Back to updates':'Close detail',exact:true}).click();
  await expect(dialog).toBeVisible({timeout:60_000});await expect(dialog.locator('.pair-forecast-link-toggle').first()).toHaveAttribute('aria-expanded','true');
  await link.click();await expect(article).toBeVisible({timeout:60_000});
  await page.getByRole('button',{name:owner==='reader'?'Back to updates':'Close detail',exact:true}).click();await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');await expect(tile).toBeFocused();
});

test('House transit profiles keep available readings after unavailable placements',async({page,baseURL},info)=>{
  test.setTimeout(180_000);
  const guard=await installSyntheticNetworkGuard(page.context(),new URL(baseURL!).origin);
  const width=page.viewportSize()!.width,theme=info.project.use.colorScheme==='dark'?'dark':'light';
  const {natal}=await forecastFixture(page,width,theme,true,false,5,'2026-10-29');
  expect(natal.ascendant).toBe('Sagittarius');
  await page.goto('/?date=2026-10-29#friends?tab=charts&chart=forecast-saved&view=transits');
  const houses=page.getByRole('region',{name:'House transits',exact:true});
  await expect(houses).toBeVisible({timeout:60_000});
  await expect(houses.locator('.reading-story-card')).toHaveCount(4);
  await page.evaluate(()=>document.fonts.ready);
  await houses.screenshot({path:info.outputPath('house-transit-cards.png')});
  const card=houses.locator('.reading-story-card').first(),title=await card.locator('.updates-aspect-row__title').innerText();
  await card.click();
  await expect(page.locator('.sky-detail-article')).toBeVisible({timeout:60_000});
  await expect(page.locator('.sky-detail-article h1')).toHaveText(title);
  await page.getByRole('button',{name:'Close detail',exact:true}).click();await expect(houses).toBeVisible();
  await page.reload();await expect(houses.locator('.reading-story-card')).toHaveCount(4,{timeout:60_000});
  await page.goto('/?date=2026-10-29#you');
  await expect(page.getByRole('region',{name:'Planets moving through your houses',exact:true})).toBeVisible({timeout:60_000});
  await page.evaluate(()=>{
    const key='tldrastro:manualCharts:forecast-reader',charts=JSON.parse(localStorage.getItem(key)!);
    charts[0].birthTimeUnknown=true;charts[0].birthTime=null;charts[0].natalChart.birthTimeKnown=false;
    localStorage.setItem(key,JSON.stringify(charts));
  });
  await page.goto('/?date=2026-10-29#friends?tab=charts&chart=forecast-saved&view=transits');
  await expect(page.getByRole('region',{name:'Fixture Friend chart profile',exact:true})).toBeVisible({timeout:60_000});
  await expect(page.locator('.friend-transits-stage .friend-transit-row').first()).toBeVisible({timeout:60_000});
  await expect(houses).toHaveCount(0);
  await page.evaluate(()=>document.fonts.ready);
  expect(guard.unhandledExternal).toEqual([]);
});

for(const start of ['/friends?tab=feed','/#friends?tab=feed']) test(`Day sheet social transit returns to selected dialog ${start}`,async({page,baseURL},info)=>{
  test.setTimeout(180_000);
  const width=page.viewportSize()!.width,theme=info.project.use.colorScheme==='dark'?'dark':'light';
  const guard=await installSyntheticNetworkGuard(page.context(),new URL(baseURL!).origin);
  await page.route('**/rest/v1/**',route=>route.fulfill({json:[]}));
  const {natal}=await forecastFixture(page,width,theme,'personal');
  await page.route('**/rest/v1/rpc/list_social_friends',route=>route.fulfill({json:[{friendship_id:'forecast-connected',user_id:'forecast-circle',display_name:'Connected Friend',handle:'connected_friend',natal_chart:natal,viewer_shares_chart:true,friend_shares_chart:true,accepted_at:'2026-10-25T16:00:00Z'}]}));
  await page.goto(start);
  const tile=page.getByRole('region',{name:'Friction and flow',exact:true}).getByRole('button',{name:/^Today, Oct 25, .* for You and Connected Friend$/});
  await tile.click({timeout:60_000});
  const dialog=page.getByRole('dialog',{name:'You and Connected Friend',exact:true});
  const link=dialog.locator('a.pair-forecast-transit[data-endpoint-owner="friend"]').first();
  await expect(link).toBeVisible({timeout:60_000});
  const parent=page.url();
  await link.click();
  await expect(page.locator('.sky-detail-article')).toBeVisible({timeout:60_000});
  await expect(page).toHaveURL(/\/connected_friend\/transits\?/);
  await page.getByRole('button',{name:'Close detail',exact:true}).click();
  await expect(dialog).toBeVisible({timeout:60_000});
  await expect(page).toHaveURL(parent);
  await link.click();
  await expect(page.locator('.sky-detail-article')).toBeVisible({timeout:60_000});
  await page.reload();
  await expect(page.locator('.sky-detail-article')).toBeVisible({timeout:60_000});
  await page.goBack();
  await expect(dialog).toBeVisible({timeout:60_000});
  await expect(page).toHaveURL(parent);
  // A restored tab or a reopened link may no longer have the original entry state.
  for(const endpoint of ['reader','friend']){
    await dialog.locator(`a.pair-forecast-transit[data-endpoint-owner="${endpoint}"]`).first().click();
    const article=page.locator(endpoint==='reader'?'.you-transit-article':'.sky-detail-article');
    await expect(article).toBeVisible({timeout:60_000});
    await expect(article.locator('hr')).toHaveCount(0);
    await expect(article.locator('.article-transit-description')).toHaveCSS('border-top-width','0px');
    await expect(article.locator('.sky-detail-body')).toHaveCSS('margin-top','32px');
    expect(new URL(page.url()).searchParams.get('flowReturn')).toBe(new URL(parent).pathname+new URL(parent).search+new URL(parent).hash);
    await page.evaluate(()=>history.replaceState(null,'',location.href));
    await page.reload();await expect(article).toBeVisible({timeout:60_000});
    await page.getByRole('button',{name:endpoint==='reader'?'Back to updates':'Close detail',exact:true}).click();
    await expect(dialog).toBeVisible({timeout:60_000});
    await expect(page).toHaveURL(parent);
  }
  await dialog.getByRole('button',{name:'Close forecast',exact:true}).click();
  await expect(dialog).not.toBeVisible();
  expect(new URL(page.url()).searchParams.has('flowPair')).toBe(false);
  await expect(tile).toBeFocused();
  expect(guard.unhandledExternal).toEqual([]);
});

for(const [width,theme] of [[360,'light'],[768,'dark']] as const) test(`Day sheet multiple links, long names and person Back ${width} ${theme}`,async({page})=>{
  await forecastFixture(page,width,theme,false,true);
  const name='Alexandria Montgomery-Wellington';
  await page.addInitScript(name=>{
    const key='tldrastro:manualCharts:forecast-reader';const charts=JSON.parse(localStorage.getItem(key)!);charts[0].displayName=name;localStorage.setItem(key,JSON.stringify(charts));
  },name);
  await page.goto('/?date=2026-10-25#friends?tab=feed');
  const tile=page.getByRole('region',{name:'Friction and flow',exact:true}).locator('.pair-forecast-day-open').first();await tile.click({timeout:60_000});
  const dialog=page.getByRole('dialog',{name:`You and ${name}`,exact:true}),cards=dialog.locator('.pair-forecast-link-toggle');
  await expect(cards).toHaveCount(2);await expect(cards.nth(0)).toHaveAttribute('aria-expanded','true');await expect(cards.nth(1)).toHaveAttribute('aria-expanded','false');
  await expect(dialog.getByLabel('2 trine',{exact:true})).toBeVisible();await expect(dialog.getByLabel('1 opposition',{exact:true})).toBeVisible();
  await cards.nth(1).click();await expect(cards.nth(1)).toHaveAttribute('aria-expanded','true');
  expect(await dialog.evaluate(e=>e.scrollWidth<=e.clientWidth)).toBe(true);
  for(const element of await dialog.locator('.pair-forecast-day-meta,.pair-forecast-link-orb,.pair-forecast-link-count,.pair-forecast-transit-copy small,.pair-forecast-person small').all()){
    await expect(element).toHaveCSS('font-size','14px');expect(await element.evaluate(e=>getComputedStyle(e).fontFamily)).toContain('system-ui');
  }
  await page.screenshot({path:`test-results/friction-flow-handoff11-multiple-${width}-${theme}.png`});
  await dialog.locator('.pair-forecast-person').first().click();
  await expect(page.getByRole('region',{name:`${name} chart profile`,exact:true})).toBeVisible({timeout:60_000});
  await page.getByRole('button',{name:'Feed',exact:true}).click();
  await expect(dialog).toBeVisible({timeout:60_000});await page.keyboard.press('Escape');await expect(tile).toBeFocused();
});

test('Day sheet plain Friends route restores after reload',async({page})=>{
  await forecastFixture(page,390,'light');await page.goto('/#friends');
  const tile=page.getByRole('button',{name:'Today, Oct 25, Easy for You and Fixture Friend',exact:true});await tile.click({timeout:60_000});
  const dialog=page.getByRole('dialog',{name:'You and Fixture Friend',exact:true});await expect(dialog).toBeVisible();
  await page.reload();await expect(dialog).toBeVisible({timeout:60_000});await page.keyboard.press('Escape');await expect(tile).toBeFocused();
});
