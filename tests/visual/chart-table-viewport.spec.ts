import { expect, test, type Locator, type Page } from '../helpers/polish-test';
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

async function prepare(page: Page, theme: string, friendName: string, unknown = false) {
  const user = { id: '11111111-1111-4111-8111-111111111111', aud: 'authenticated', role: 'authenticated',
    email: 'viewport@example.test', phone: '+12025550101', app_metadata: { provider: 'email' }, user_metadata: { name: 'Test Reader' } };
  const authHost = new URL(process.env.VITE_SUPABASE_URL ?? 'https://visual-smoke.supabase.test').hostname.split('.')[0];
  await page.addInitScript(({ theme, user, authHost, friendName, unknown }) => {
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
      birthTime: unknown ? null : '9:15 AM', birthTimeUnknown: unknown, birthPlace: location.label, birthLocation: location,
      natalChart: null, notes: null, syncStatus: 'synced', lastSyncedAt: '2026-10-15T00:00:00Z', createdAt: '2026-10-15T00:00:00Z', updatedAt: '2026-10-15T00:00:00Z'
    }]));
    const session = JSON.stringify({ user, access_token: 'synthetic-token', refresh_token: 'synthetic-refresh', token_type: 'bearer', expires_at: 4102444800 });
    for (const host of new Set([authHost, 'hdmdufozrgrajkfhydit'])) localStorage.setItem(`sb-${host}-auth-token`, session);
  }, { theme, user, authHost, friendName, unknown });
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
  for (const family of ['Sky','You natal','You transit','Friend natal','Friend unknown-time natal','Synastry','Composite','Studio coverage','Studio browse','Calendar comparison']) {
   test(`${family} charts and tables contained ${viewport.width}x${viewport.height} ${theme}`,async({page})=>{
    test.setTimeout(60000);
    await page.setViewportSize(viewport);
    const friendName=family==='Synastry'?'FixtureName'.repeat(7):'Fixture Friend';
    const friendNatal = family === 'Friend natal' || family === 'Friend unknown-time natal';
    const unknown = family === 'Friend unknown-time natal';
    await prepare(page,theme,friendName,unknown);
    if(family==='Calendar comparison') {
     await page.goto('/?date=2026-10-03#calendar?view=day&date=2026-10-03');
     await page.locator('.calendar-day-events .calendar-stoic-card').filter({hasText:'Venus stations retrograde'}).click({timeout:30000});
     const panel=page.getByRole('dialog',{name:'Event detail'});
     const cycleCopy=panel.locator('.retrograde-cycles p:visible').first();
     await expect(cycleCopy).toBeVisible();
     await expect(cycleCopy).toHaveCSS('font-family',/Newsreader/);
     await expect(cycleCopy).toHaveCSS('font-size','19px');
     await expect(cycleCopy).toHaveCSS('font-weight','400');
     await expect(cycleCopy).toHaveCSS('line-height','28.5px');
     await expect(cycleCopy).toHaveCSS('letter-spacing','normal');
     await panel.locator('.retrograde-cycles__compare summary').click({timeout:30000});
     const scroller=panel.getByRole('region',{name:'Cycle comparison'});
     await expect(scroller).toBeVisible();
     await page.evaluate(()=>document.fonts.ready);
     await scroller.scrollIntoViewIfNeeded();
     const bounds=await scroller.boundingBox();
     expect(bounds!.x).toBeGreaterThanOrEqual(-1);
     expect(bounds!.x+bounds!.width).toBeLessThanOrEqual(viewport.width+1);
     await scroller.evaluate(el=>{el.scrollLeft=el.scrollWidth});
     await expect(scroller.locator('thead th')).toHaveText(['Year','Stations retrograde','Sign change','Stations direct','Length']);
     const nextCycle=scroller.getByRole('row').filter({has:page.getByRole('rowheader',{name:/Next/})});
     await expect(nextCycle).toBeVisible();
     const lastBounds=await nextCycle.boundingBox();
     expect(lastBounds!.x).toBeGreaterThanOrEqual(bounds!.x-1);
     expect(lastBounds!.x+lastBounds!.width).toBeLessThanOrEqual(bounds!.x+bounds!.width+1);
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
     await page.evaluate(()=>document.fonts.ready);
     const signatures=page.locator('.friend-hero-card .manual-chart-signatures > span');
     await expect(signatures).toHaveCount(3);
     await expect(signatures.nth(0)).toHaveText(/^☉ (?!.*pending).+$/i);
     await expect(signatures.nth(1)).toHaveText(/^☽ (?!.*pending).+$/i);
     if(friendNatal) {
      const natalTab=page.getByRole('tab',{name:'Natal',exact:true});
      await natalTab.scrollIntoViewIfNeeded();
      await expect(natalTab).toBeInViewport();
      await natalTab.click();
      await expect(natalTab).toHaveAttribute('aria-selected','true');
      await expect(page.locator('.friend-tab-pane[aria-label="Natal"]')).toBeVisible();
     }
     if(!friendNatal) {
      const tab=page.getByRole('tab',{name:family,exact:true});
      if(await tab.isVisible()) await tab.click();
      else {
       await page.getByRole('button',{name:/More, \d+ sections/}).click();
       await page.getByRole('menuitemradio',{name:new RegExp('^'+family)}).click();
      }
      await expect(page.getByRole('tab',{name:family,exact:true,includeHidden:true})).toHaveAttribute('aria-selected','true');
     }
    }
    await chartFits(page,page.locator('.sky-wheel:visible').first());
    if(friendNatal) {
     const bigThree = page.locator('.friend-big-three-list');
     await expect(bigThree).toContainText('Sun');
     await expect(bigThree).toContainText('Moon');
     await expect(bigThree.locator('.placement-table-row__title').filter({hasText:/^Ascendant/})).toHaveCount(unknown ? 0 : 1);
    }
    if(family==='You natal'||friendNatal) {
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
    if(family==='Friend natal') {
     const ascendant=page.getByRole('button',{name:/Ascendant in/});
     await ascendant.scrollIntoViewIfNeeded();
     await expect(ascendant).toBeInViewport();
     await ascendant.locator('.placement-table-row__title').click();
     const detail=page.getByRole('region',{name:/Ascendant in/});
     await expect(detail).toBeVisible();
     expect((await detail.innerText()).length).toBeGreaterThan(80);
     await fits(page,detail);
    }
    if(family==='Synastry'||family==='Composite') {
     const placements=page.locator(family==='Synastry'?'.synastry-placement-columns:visible':'.friend-placement-table:visible');
     await expect(placements).toHaveCount(1);
     await fits(page,placements);
     if(family==='Synastry') {
      const headings=placements.locator('.synastry-placement-column-header h3');
      await expect(headings).toHaveCount(2);
      await expect(headings.first()).toHaveText(friendName);
      await expect(headings.last()).toHaveText('You');
      const typography=(el:Element)=>{
       const s=getComputedStyle(el);
       return [s.fontFamily,s.fontSize,s.fontWeight,s.lineHeight,s.letterSpacing,s.margin,s.textTransform,s.textAlign];
      };
      expect(await headings.first().evaluate(typography)).toEqual(await headings.last().evaluate(typography));
     }
     await page.getByRole('button',{name:'Full-screen chart',exact:true}).click();
     await fits(page,page.locator('.chart-fullscreen-panel'));
     await chartFits(page,page.locator('.chart-fullscreen-panel .sky-wheel'));
     const panel=await page.locator('.chart-fullscreen-panel').boundingBox();
     const wheel=await page.locator('.chart-fullscreen-panel .sky-wheel').boundingBox();
     expect(wheel!.y).toBeGreaterThanOrEqual(panel!.y-1);
     expect(wheel!.y+wheel!.height).toBeLessThanOrEqual(panel!.y+panel!.height+1);
     const close=page.getByRole('button',{name:'Close full-screen chart',exact:true});
     const closeBounds=await close.boundingBox();
     expect(closeBounds!.width,'full-screen close control keeps its circular target').toBeCloseTo(closeBounds!.height,0);
     await close.click();
     await expect(page.locator('.chart-fullscreen-panel')).toBeHidden();
    }
   });
  }
 }
}
