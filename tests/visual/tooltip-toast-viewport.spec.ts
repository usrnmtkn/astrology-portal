import { expect, test, type Locator, type Page } from '@playwright/test';
import { readerResponse } from '../helpers/reader-response';

test.describe.configure({ mode: 'parallel' });

async function prepare(page: Page, theme: string, member: boolean, chart = false, reports = false) {
  const user = { id: '11111111-1111-4111-8111-111111111111', aud: 'authenticated', role: 'authenticated',
    email: 'viewport@example.test', phone: '+12025550101', app_metadata: { provider: 'email' }, user_metadata: { name: 'Test Reader' } };
  const authHost = new URL(process.env.VITE_SUPABASE_URL ?? 'https://visual-smoke.supabase.test').hostname.split('.')[0];
  await page.addInitScript(({ theme, user, authHost, chart, member }) => {
    localStorage.setItem('tldrastro:theme', theme);
    const location = { label: 'Synthetic New York', latitude: 40.7, longitude: -74, timeZone: 'America/New_York' };
    localStorage.setItem('tldrastro:selectedLocation', JSON.stringify(location));
    if (member) localStorage.setItem('tldrastro:userProfile', JSON.stringify({
      ...user, name: 'Test Reader', provider: 'email', sun: 'Aquarius', moon: 'Scorpio', rising: 'Gemini',
      phone: '+12025550101', currentLocation: location.label, currentLocationData: location,
      charts: chart ? [{ id: 'viewport-chart', name: 'Test Reader', type: 'Birth chart', birthDate: '1990-01-01',
        birthTime: '12:00 PM', birthCity: location.label, birthLocation: location }] : []
    }));
    if (member) localStorage.setItem(`tldrastro:manualCharts:${user.id}`, JSON.stringify([{
      id: 'overlay-friend', ownerUserId: user.id, chartType: 'person', displayName: 'Fixture Friend',
      firstName: 'Fixture', lastName: 'Friend', relationshipType: 'friend', birthDate: '1988-04-03',
      birthTime: '9:15 AM', birthTimeUnknown: false, birthPlace: location.label, birthLocation: location,
      natalChart: null, notes: null, syncStatus: 'synced', lastSyncedAt: '2026-10-15T00:00:00Z', createdAt: '2026-10-15T00:00:00Z', updatedAt: '2026-10-15T00:00:00Z'
    }]));
    const session = JSON.stringify({ user, access_token: 'synthetic-token', refresh_token: 'synthetic-refresh', token_type: 'bearer', expires_at: 4102444800 });
    if (member) for (const host of new Set([authHost, 'hdmdufozrgrajkfhydit'])) localStorage.setItem(`sb-${host}-auth-token`, session);
  }, { theme, user, authHost, chart, member });
  await page.route('https://api.mapbox.com/**', route => route.fulfill({ json: { features: Array.from({ length: 5 }, (_, index) => ({
    id: `synthetic-city-${index}`, properties: { name: `Synthetic city ${index}`, context: { region: { name: 'Test region' } },
      coordinates: { latitude: 40.7, longitude: -74 } }
  })) } }));
  await page.route('**/auth/v1/**', route => route.fulfill({ json: user }));
  await page.route('**/rest/v1/**', route => {
    const table = new URL(route.request().url()).pathname.split('/').pop();
    if (table === 'list_social_friends') return route.fulfill({ json: [{
      friendship_id: 'fixture-friendship', user_id: '33333333-3333-4333-8333-333333333333',
      handle: 'fixture_handle_123456789', display_name: 'Circle Friend', natal_chart: null,
      accepted_at: '2026-10-15T00:00:00Z', viewer_shares_chart: true, friend_shares_chart: true
    }] });
    return route.fulfill({ json: reports && table === 'user_generated_interpretations' ? [{
      id: '22222222-2222-4222-8222-222222222222', subject_type: 'you_day_reading', status: 'DRAFT',
      body: 'Synthetic saved report.', headline: 'Viewport report', target_date: '2026-10-15',
      created_at: '2026-10-15T12:00:00Z', updated_at: '2026-10-15T12:00:00Z'
    }] : [] });
  });
  await page.route('**/api/**', route => route.fulfill({ status: 503, json: { error: 'Synthetic unavailable service' } }));
  await page.route('**/utils/timezone', route => route.fulfill({ json: { timeZone: 'America/New_York', source: 'synthetic' } }));
  await page.route('**/api/content-reader', route => route.fulfill({ json: readerResponse([]) }));
  await page.route('**/content-studio-last-known-good.json', route => route.fulfill({ json: {
    schema: 'content-studio-last-known-good-v2', rows: [], publications: [], rowCount: 0
  } }));
}


const longName = 'FixtureName'.repeat(7);
const longTitle = 'Synthetic viewport report ' + 'complete reading '.repeat(7);

async function contained(page: Page, surface: Locator) {
  await expect(surface).toBeVisible();
  await page.evaluate(()=>document.fonts.ready);
  try { await expect(async () => {
    const box = (await surface.boundingBox())!;
    const viewport = page.viewportSize()!;
    expect(box.x, 'left edge').toBeGreaterThanOrEqual(-1);
    expect(box.y, 'top edge').toBeGreaterThanOrEqual(-1);
    expect(box.x + box.width, 'right edge').toBeLessThanOrEqual(viewport.width + 1);
    expect(box.y + box.height, 'bottom edge').toBeLessThanOrEqual(viewport.height + 1);
    expect(await surface.evaluate(el => el.scrollWidth <= el.clientWidth + 1), 'no horizontal text clipping').toBe(true);
  }).toPass({ timeout: 2000 }); } catch(error) {
    console.log('Floating surface geometry',await surface.evaluate(el=>({
      className:el.className,box:el.getBoundingClientRect().toJSON(),scrollWidth:el.scrollWidth,clientWidth:el.clientWidth,
      viewport:{width:innerWidth,height:innerHeight},visualViewport:{width:visualViewport?.width,height:visualViewport?.height}
    })));
    throw error;
  }
  expect(await surface.evaluate(el=>{
    const prior=(el as HTMLElement).style.pointerEvents;
    (el as HTMLElement).style.pointerEvents='auto';
    const b=el.getBoundingClientRect();
    const hit=document.elementFromPoint(b.left+b.width/2,b.top+b.height/2);
    (el as HTMLElement).style.pointerEvents=prior;
    return hit===el || Boolean(hit && el.contains(hit));
  }), 'surface not covered or clipped').toBe(true);
  for (const action of await surface.locator('button:visible').all()) {
    await action.scrollIntoViewIfNeeded();
    expect(await action.evaluate(el => {
      const b = el.getBoundingClientRect();
      const hit = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
      return hit === el || Boolean(hit && el.contains(hit));
    }), 'toast action reachable').toBe(true);
  }
}

const cases = ['Planet tooltip', 'Dignity tooltip', 'Calendar month tooltip', 'Calendar week tooltip',
  'Report ready toast', 'Report notice toast', 'Friend acceptance toast', 'Friend removal toast', 'Studio toast'] as const;
for (const viewport of [{width:360,height:640},{width:390,height:844},{width:844,height:390},{width:1440,height:900}]) {
 for (const theme of ['light','dark']) for (const name of cases) {
  test(`${name} stays inside ${viewport.width}x${viewport.height} ${theme}`, async ({page}) => {
    test.setTimeout(45000);
    await page.setViewportSize(viewport);
    await prepare(page,theme,true,false,name.startsWith('Report'));
    if (name === 'Report ready toast') await page.route('**/rest/v1/user_generated_interpretations?**', route => route.fulfill({json:[{
      id:'22222222-2222-4222-8222-222222222222',subject_type:'you_day_reading',status:'DRAFT',body:'Synthetic reading.',
      headline:longTitle,target_date:'2026-10-15',created_at:'2026-10-15T12:00:00Z',updated_at:'2026-10-15T12:00:00Z'
    }]}));
    if (name.startsWith('Friend')) {
      await page.route('**/rest/v1/rpc/list_social_friends',route=>route.fulfill({json:[{
        friendship_id:'fixture-friendship',user_id:'33333333-3333-4333-8333-333333333333',handle:'fixture_handle',
        display_name:longName,natal_chart:null,accepted_at:'2026-10-15T00:00:00Z',viewer_shares_chart:true,friend_shares_chart:true
      }]}));
      if (name === 'Friend acceptance toast') await page.route('**/rest/v1/rpc/list_social_notifications',route=>route.fulfill({json:[{
        notification_id:'fixture-notification',notification_type:'friend_request_accepted',actor_user_id:'33333333-3333-4333-8333-333333333333',
        actor_handle:'fixture_handle',actor_display_name:longName,actor_avatar_url:null,friendship_id:'fixture-friendship',created_at:new Date().toISOString()
      }]}));
    }
    if (name === 'Studio toast') {
      await page.addInitScript(theme=>{
        localStorage.setItem('tldrastro:contentAdminSecret','tooltip-toast-fixture');
        localStorage.setItem('tldrastro:studio-theme',theme);
      },theme);
      await page.route('**/api/admin/**',route=>route.fulfill({json:{ok:true,rows:[],statuses:[],nextCursor:null}}));
    }
    const path = name === 'Dignity tooltip' ? '/?date=2026-10-16#sky/placement/sun/libra' : name === 'Studio toast' ? '/admin/content#content/aspect-patterns' : name.startsWith('Calendar') ? `/#calendar?view=${name.includes('month')?'month':'week'}`
      : name.startsWith('Friend') ? '/#friends?tab=circle' : name === 'Report notice toast' ? '/reports/'
      : name === 'Report ready toast' ? '/#account' : '/#sky';
    await page.goto(path,{waitUntil:'domcontentloaded'});
    let surface: Locator;
    let anchor: Locator | undefined;
    if (name === 'Studio toast') {
      surface=page.locator('.admin-save-toast');
      await expect(surface).toContainText('Loaded 0 Natal write-ups.');
      // Stress a server-derived notice on the actual rendered notification.
      await surface.locator('span').first().evaluate((el,text)=>{el.textContent=text},longTitle + longName);
    } else if (name === 'Planet tooltip') {
      if (viewport.width <= 820) await page.getByRole('button',{name:'Open full current sky chart',exact:true}).click();
      anchor=page.locator('.planet-marker:visible').first();
      await anchor.focus();surface=page.locator('.floating-tooltip--planet');
    } else if (name === 'Dignity tooltip') {
      anchor=page.locator('.spl-dig[tabindex="0"]:visible').first();
      await anchor.focus();surface=page.locator('.floating-tooltip');
    } else if (name.startsWith('Calendar')) {
      anchor=page.locator(name.includes('month')?'.lunar-calendar-day:not(.is-selected)':'.lunar-week-day:not(.is-selected)').last();
      await anchor.focus();surface=page.locator('[role="tooltip"]:visible');
    } else if (name === 'Report ready toast') surface=page.locator('.report-ready-toast');
    else if (name === 'Report notice toast') {
      page.on('dialog',dialog=>dialog.accept());
      await page.getByRole('button',{name:'More options for Viewport report'}).click();
      await page.getByRole('menuitem',{name:'Delete',exact:true}).click();
      surface=page.locator('.report-library-share-toast');
    } else if (name === 'Friend acceptance toast') surface=page.locator('.friends-acceptance-toast');
    else {
      await page.getByRole('button',{name:`More options for ${longName}`}).click();
      await page.getByRole('menuitem',{name:'Remove friend',exact:true}).click();
      await page.getByRole('button',{name:'Remove',exact:true}).click();
      surface=page.locator('.friends-toast');
    }
    await contained(page,surface);
    await page.setViewportSize({width:viewport.width,height:240});
    await contained(page,surface);
    if (anchor) {
      await anchor.evaluate(el=>window.scrollBy(0,el.getBoundingClientRect().top - 12));
      await contained(page,surface);
    } else {
      await page.evaluate(()=>window.scrollBy(0,160));
      await contained(page,surface);
    }
    if (name === 'Studio toast') {
      await surface.getByRole('button',{name:'Dismiss notification'}).click();await expect(surface).toBeHidden();
    } else if (name === 'Report ready toast') {
      await surface.getByRole('button',{name:'Dismiss report notification'}).click();await expect(surface).toBeHidden();
      await page.reload();
      await contained(page,page.locator('.report-ready-toast'));
      await page.locator('.report-ready-toast__open').click();
      await expect(page).toHaveURL(/\/reports\//);
    } else if (name === 'Friend acceptance toast') {
      await surface.getByRole('button',{name:'Dismiss',exact:true}).click();await expect(surface).toBeHidden();
    } else if (name === 'Friend removal toast') {
      await surface.getByRole('button',{name:'Undo',exact:true}).click();await expect(surface).toBeHidden();
    }
  });
 }
}
