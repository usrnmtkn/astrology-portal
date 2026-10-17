import { expect, test, type Locator, type Page } from '@playwright/test';
import { readerResponse } from '../helpers/reader-response';
import { calendarRxFixture } from '../helpers/calendar-rx-fixture';
import { studioListingFacts, studioListingRow } from '../../api/_lib/studio-listing-facts';

test.describe.configure({ mode: 'parallel' });

const pageErrors = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  pageErrors.set(page, errors);
  // HTTP 503 fixtures exercise handled error states; page exceptions are never expected.
  page.on('pageerror', error => errors.push(error.message));
});
test.afterEach(async ({ page }) => {
  expect(pageErrors.get(page) ?? [], 'no unexpected runtime errors during viewport changes').toEqual([]);
});

async function prepare(page: Page, theme: string, friendName: string) {
  const user = { id: '11111111-1111-4111-8111-111111111111', aud: 'authenticated', role: 'authenticated',
    email: 'viewport@example.test', phone: '+12025550101', app_metadata: { provider: 'email' }, user_metadata: { name: 'Test Reader' } };
  const authHost = new URL(process.env.VITE_SUPABASE_URL ?? 'https://visual-smoke.supabase.test').hostname.split('.')[0];
  await page.addInitScript(({ theme, user, authHost, friendName }) => {
    localStorage.setItem('tldrastro:theme', theme);
    const location = { label: 'Synthetic New York', latitude: 40.7, longitude: -74, timeZone: 'America/New_York' };
    localStorage.setItem('tldrastro:selectedLocation', JSON.stringify(location));
    localStorage.setItem('tldrastro:userProfile', JSON.stringify({
      ...user, name: 'Test Reader', provider: 'email', sun: 'Aquarius', moon: 'Scorpio', rising: 'Gemini',
      phone: '+12025550101', currentLocation: location.label, currentLocationData: location,
      charts: [{ id: 'viewport-chart', name: 'Test Reader', type: 'Birth chart', birthDate: '1990-01-01',
        birthTime: '12:00 PM', birthCity: location.label, birthLocation: location }]
    }));
    localStorage.setItem(`tldrastro:manualCharts:${user.id}`, JSON.stringify([{
      id: 'overlay-friend', ownerUserId: user.id, chartType: 'person', displayName: friendName,
      firstName: friendName.split(' ')[0], lastName: friendName.split(' ')[1] ?? null, relationshipType: 'friend', birthDate: '1988-04-03',
      birthTime: '9:15 AM', birthTimeUnknown: false, birthPlace: location.label, birthLocation: location,
      natalChart: null, notes: null, syncStatus: 'synced', lastSyncedAt: '2026-10-15T00:00:00Z', createdAt: '2026-10-15T00:00:00Z', updatedAt: '2026-10-15T00:00:00Z'
    }]));
    const session = JSON.stringify({ user, access_token: 'synthetic-token', refresh_token: 'synthetic-refresh', token_type: 'bearer', expires_at: 4102444800 });
    for (const host of new Set([authHost, 'hdmdufozrgrajkfhydit'])) localStorage.setItem(`sb-${host}-auth-token`, session);
  }, { theme, user, authHost, friendName });
  await page.route('**/auth/v1/**', route => route.fulfill({ json: user }));
  await page.route('**/rest/v1/**', route => route.fulfill({ json: [] }));
  await page.route('**/api/**', route => route.fulfill({ status: 503, json: { error: 'Synthetic unavailable service' } }));
  await page.route('**/utils/timezone', route => route.fulfill({ json: { timeZone: 'America/New_York', source: 'synthetic' } }));
  await page.route('**/api/content-reader', route => route.fulfill({ json: readerResponse([]) }));
  await page.route('**/content-studio-last-known-good.json', route => route.fulfill({ json: {
    schema: 'content-studio-last-known-good-v2', rows: [], publications: [], rowCount: 0
  } }));
}

async function chartFits(page: Page, locator: Locator) {
  await fits(page,locator);
  const escaped=await locator.evaluate(svg=>[...svg.querySelectorAll('text,image')].flatMap(el=>{
    const b=el.getBoundingClientRect();
    return b.width && b.height && (b.left < -1 || b.right > innerWidth+1) ? [{tag:el.tagName,left:b.left,right:b.right}] : [];
  }));
  expect(escaped,'chart labels and glyphs remain inside the viewport').toEqual([]);
}

async function fits(page: Page, locator: Locator) {
  await expect(locator).toBeVisible();
  await page.evaluate(()=>document.fonts.ready);
  await locator.scrollIntoViewIfNeeded();
  await expect(async () => {
    const geometry = await locator.evaluate(el => {
      const b = el.getBoundingClientRect();
      return {left:b.left,right:b.right,width:b.width,viewport:innerWidth,scroll:el.scrollWidth,client:el.clientWidth};
    });
    expect(geometry.left, JSON.stringify(geometry)).toBeGreaterThanOrEqual(-1);
    expect(geometry.right, JSON.stringify(geometry)).toBeLessThanOrEqual(geometry.viewport+1);
    expect(geometry.scroll, JSON.stringify(geometry)).toBeLessThanOrEqual(geometry.client+1);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width+1);
  }).toPass({timeout:3000});
}

for (const viewport of [{width:320,height:568},{width:390,height:844},{width:844,height:390},{width:1440,height:900}]) {
 for (const theme of ['light','dark']) {
  for (const family of ['Sky','You natal','You transit','Friend natal','Synastry','Composite','Studio coverage','Studio browse','Calendar comparison']) {
   test(`${family} charts and tables contained ${viewport.width}x${viewport.height} ${theme}`,async({page})=>{
    test.setTimeout(60000);
    await page.setViewportSize(viewport);
    const friendName=family==='Synastry'?'FixtureName'.repeat(7):'Fixture Friend';
    await prepare(page,theme,friendName);
    if(family==='Calendar comparison') {
     await page.goto('/?date=2026-10-03#calendar?view=day&date=2026-10-03');
     await page.locator('.calendar-day-events .calendar-stoic-card').filter({hasText:'Venus stations retrograde'}).click({timeout:30000});
     const panel=page.getByRole('dialog',{name:'Event detail'});
     await panel.locator('.retrograde-cycles__compare summary').click({timeout:30000});
     const scroller=panel.getByRole('region',{name:'Cycle comparison'});
     await expect(scroller).toBeVisible();
     await scroller.scrollIntoViewIfNeeded();
     const bounds=await scroller.boundingBox();
     expect(bounds!.x).toBeGreaterThanOrEqual(-1);
     expect(bounds!.x+bounds!.width).toBeLessThanOrEqual(viewport.width+1);
     await scroller.evaluate(el=>{el.scrollLeft=el.scrollWidth});
     await expect(scroller.getByRole('columnheader',{name:/Next/})).toBeVisible();
     const panelWidth=await panel.evaluate(el=>({scroll:el.scrollWidth,client:el.clientWidth}));
     expect(panelWidth.scroll,JSON.stringify(panelWidth)).toBeLessThanOrEqual(panelWidth.client+1);
     await panel.getByRole('button',{name:'Close',exact:true}).click();
     await expect(panel).toBeHidden();
     return;
    }
    if (family.startsWith('Studio')) {
     await page.addInitScript(theme=>{
      localStorage.setItem('tldrastro:contentAdminSecret','chart-table-fixture');
      localStorage.setItem('tldrastro:studio-theme',theme);
     },theme);
     const long='SyntheticLongIdentifier'.repeat(10);
     await page.route('**/api/admin/**',route=>route.fulfill({json:{ok:true,rows:[],statuses:[],nextCursor:null}}));
     if(family==='Studio coverage') {
      await page.route('**/api/admin/content-coverage',route=>route.fulfill({json:{ok:true,
       generatedAt:'2026-10-16T00:00:00Z',authority:'synthetic',readerEligibility:null,
       summary:{complete:1,incomplete:0,unresolvedQueue:0,unresolvedIssues:0,unresolvedOptionalQueue:0,unresolvedOptionalIssues:0,unresolvedShadowed:0,unresolvedRetired:0},
       notes:{friendsIntentionalGap:null,unresolvedReasonCounts:{},unresolvedWorkload:{},unresolvedOptionalWorkload:{},unresolvedShadowedReasonCounts:{},unresolvedRetiredReasonCounts:{}},
       coverage:[{id:'fixture-corpus',label:'Synthetic corpus',ready:1,total:1,missing:0,percent:100,state:'complete',
        detail:long,source:long,authority:{id:'fixture',ownerAuthority:long,studioOverlay:long,servingSource:long,resolver:long,readerDestinations:[],failurePolicy:long}}]
      }}));
      await page.goto('/admin/content/coverage');
      const table=page.getByRole('table',{name:'Content corpus coverage'});
      await fits(page,table);
      await table.getByText('Authority chain',{exact:true}).click();
      for(const cell of await table.locator('td').all()) await fits(page,cell);
     } else {
      const fixture={...calendarRxFixture(),headline:'Synthetic chart table fixture'};
      await page.route('**/api/admin/generated-content-inventory?**',route=>route.fulfill({json:{
       ok:true,nextCursor:null,rows:[studioListingRow(fixture,studioListingFacts(fixture))]
      }}));
      await page.goto('/admin/content#exact-content?category=Calendar+Aspects&first=moon&aspect=trine&second=saturn');
      const table=page.locator('.admin-content-table--browse');
      await fits(page,table);
      const row=table.locator('.admin-content-row').filter({hasText:'Synthetic chart table fixture'});
      await expect(row).toBeVisible();
      await row.locator('.admin-content-row-title').evaluate((el,text)=>{el.textContent=text},long);
      await row.getByRole('button',{name:/Details/}).click();
      await fits(page,table);
      await fits(page,table.locator('.admin-content-expanded-body:visible'));
     }
     return;
    }
    await page.goto(family==='Sky'?'/#sky':family.startsWith('You')?'/#you':'/#friends?tab=charts');
    if (family==='Sky') {
     if(viewport.width<=820) await page.getByRole('button',{name:'Open full current sky chart',exact:true}).click();
     await chartFits(page,page.locator('.sky-wheel:visible').first());
     return;
    }
    if(family.startsWith('You')) {
     await expect(page.locator('.chart-layout__visual')).toHaveAttribute('data-chart-calculation-status','ready',{timeout:30000});
     if(family==='You natal') await page.getByRole('tab',{name:'Natal Chart',exact:true}).click();
    } else {
     await page.getByRole('button',{name:`Open ${friendName}`,exact:true}).click();
     if(family==='Friend natal') await page.getByRole('tab',{name:'Natal',exact:true}).click();
     if(family!=='Friend natal') {
      await page.getByRole('button',{name:/More, \d+ sections/}).click();
      await page.getByRole('menuitemradio',{name:new RegExp('^'+family)}).click();
     }
    }
    await chartFits(page,page.locator('.sky-wheel:visible').first());
    if(family==='You natal'||family==='Friend natal') {
     await page.getByRole('tab',{name:'Table',exact:true}).click();
     const table=page.locator('.natal-chart-data-table');
     await fits(page,table);
     for(const cell of await table.locator('th,td').all()) {
      const width=await cell.evaluate(el=>({text:el.textContent,scroll:el.scrollWidth,client:el.clientWidth}));
      expect(width.scroll,JSON.stringify(width)).toBeLessThanOrEqual(width.client+1);
     }
     await page.getByRole('tab',{name:'Circle',exact:true}).click();
     await chartFits(page,page.locator('.sky-wheel:visible').first());
    }
    if(family==='Synastry'||family==='Composite') {
     for(const column of await page.locator('.friend-placement-table:visible,.synastry-placement-columns:visible').all()) await fits(page,column);
     await page.getByRole('button',{name:'Full-screen chart',exact:true}).click();
     await fits(page,page.locator('.chart-fullscreen-panel'));
     await chartFits(page,page.locator('.chart-fullscreen-panel .sky-wheel'));
     const panel=await page.locator('.chart-fullscreen-panel').boundingBox();
     const wheel=await page.locator('.chart-fullscreen-panel .sky-wheel').boundingBox();
     expect(wheel!.y).toBeGreaterThanOrEqual(panel!.y-1);
     expect(wheel!.y+wheel!.height).toBeLessThanOrEqual(panel!.y+panel!.height+1);
    }
   });
  }
 }
}
