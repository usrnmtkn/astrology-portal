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
      handle: 'fixture-friend', display_name: 'Circle Friend', natal_chart: null,
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

async function contained(page: Page, overlay: Locator) {
  await expect(overlay).toBeVisible();
  const viewport = page.viewportSize()!;
  const expectBounds = async () => {
    const box = (await overlay.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(-1);
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1);
    expect(box.y).toBeGreaterThanOrEqual(-1);
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 1);
    expect(await overlay.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
  };
  try {
    await expect(expectBounds).toPass({ timeout: 2000 });
  } catch (error) {
    console.log('Overlay geometry', await overlay.evaluate(element => ({
      style: element.getAttribute('style'), box: element.getBoundingClientRect().toJSON(),
      innerHeight, clientHeight: document.documentElement.clientHeight,
      visualHeight: window.visualViewport?.height, visualTop: window.visualViewport?.offsetTop
    })));
    throw error;
  }
  // Every action remains reachable by scrolling within the contained overlay.
  const actions = overlay.locator('button:visible, input:visible, select:visible, textarea:visible');
  for (const action of await actions.all()) {
    await action.scrollIntoViewIfNeeded();
    const rect = (await action.boundingBox())!;
    expect(rect.x).toBeGreaterThanOrEqual(-1);
    expect(rect.x + rect.width).toBeLessThanOrEqual(viewport.width + 1);
    expect(rect.y).toBeGreaterThanOrEqual(-1);
    expect(rect.y + rect.height).toBeLessThanOrEqual(viewport.height + 1);
    expect(await action.evaluate(element => {
      const box = element.getBoundingClientRect();
      const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
      return hit === element || Boolean(hit && element.contains(hit));
    }), 'Overlay control is not covered or clipped').toBe(true);
  }
  await expectBounds();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
}

const cases = ['Guest site menu', 'Member site menu', 'Reports site menu', 'Report row menu',
  'Sky controls', 'Date picker', 'Location picker', 'Create chart', 'Add friend chart',
  'Friend chart menu', 'Edit friend chart', 'Friend chart sections', 'Circle friend menu',
  'Invite friend', 'Compare chart picker', 'Full-screen chart', 'Profile menu', 'Phone change', 'Calendar check-in', 'Delete account', 'Erase check-ins'] as const;

for (const viewport of [{ width: 360, height: 640 }, { width: 390, height: 844 },
  { width: 768, height: 600 }, { width: 844, height: 390 },
  { width: 1440, height: 900 }]) {
 for (const theme of ['light', 'dark']) for (const name of cases) {
  test(`${name} stays inside ${viewport.width}x${viewport.height} ${theme}`, async ({ page }) => {
    test.setTimeout(45_000);
    await page.setViewportSize(viewport);
    await prepare(page, theme, name !== 'Guest site menu', ['Profile menu', 'Compare chart picker', 'Full-screen chart'].includes(name), name.startsWith('Report'));
    const path = name === 'Profile menu' ? '/#you' : name.startsWith('Report') ? '/reports/' : ['Add friend chart', 'Friend chart menu', 'Edit friend chart', 'Friend chart sections', 'Compare chart picker', 'Full-screen chart'].includes(name) ? '/#friends?tab=charts'
      : ['Circle friend menu', 'Invite friend'].includes(name) ? '/#friends?tab=circle'
      : name === 'Calendar check-in' ? '/#calendar?view=day'
      : name === 'Delete account' || name === 'Erase check-ins' || name === 'Phone change' ? '/#account' : '/#sky';
    await page.goto(path, { waitUntil: 'domcontentloaded' });
    let overlay: Locator;
    if (name.endsWith('site menu')) {
      await page.getByRole('button', { name: 'Open menu', exact: true }).click();
      overlay = page.getByRole('menu', { name: 'Site menu' });
    } else if (name === 'Report row menu') {
      await page.getByRole('button', { name: 'More options for Viewport report' }).click();
      overlay = page.getByRole('menu', { name: 'Options for Viewport report' });
    } else if (name === 'Sky controls' || name === 'Date picker' || name === 'Location picker') {
      await page.locator('.sky-header-date-button').click();
      overlay = page.getByRole('dialog', { name: 'Sky controls' });
      if (name === 'Date picker') {
        await overlay.getByRole('button', { name: 'Date', exact: true }).click();
        overlay = page.locator('.date-picker');
      } else if (name === 'Location picker') {
        await overlay.locator('.mobile-sky-controls__location').click();
        overlay = page.getByRole('dialog', { name: 'Sky controls' });
        await overlay.getByRole('textbox', { name: 'City', exact: true }).fill('Synthetic city');
        await expect(overlay.getByRole('option')).toHaveCount(5);
      }
    } else if (name === 'Create chart') {
      await page.getByRole('button', { name: /Create your chart/ }).click();
      overlay = page.getByRole('dialog');
    } else if (name === 'Add friend chart') {
      await page.getByRole('button', { name: /Add (?:a )?chart/ }).click();
      overlay = page.getByRole('dialog', { name: 'Add chart' });
    } else if (name === 'Friend chart menu' || name === 'Edit friend chart') {
      await page.getByRole('button', { name: 'More actions for Fixture Friend' }).click();
      overlay = page.getByRole('menu');
      if (name === 'Edit friend chart') {
        await page.getByRole('menuitem', { name: 'Edit', exact: true }).click();
        overlay = page.getByRole('dialog', { name: 'Edit chart' });
      }
    } else if (name === 'Compare chart picker' || name === 'Full-screen chart') {
      await page.getByRole('button', { name: 'Open Fixture Friend' }).click();
      await page.getByRole('button', { name: /More, \d+ sections/ }).click();
      await page.getByRole('menuitemradio', { name: /^Synastry/ }).click();
      if (name === 'Full-screen chart') {
        await page.getByRole('button', { name: 'Full-screen chart', exact: true }).click();
        overlay = page.locator('.chart-fullscreen-panel');
      } else {
        await page.locator('.friend-compare-pill').click();
        overlay = page.getByRole('dialog', { name: 'Compare with saved chart' });
      }
    } else if (name === 'Friend chart sections') {
      await page.getByRole('button', { name: 'Open Fixture Friend' }).click();
      await page.getByRole('button', { name: /More, \d+ sections/ }).click();
      overlay = page.getByRole('menu', { name: 'More chart profile sections' });
    } else if (name === 'Circle friend menu') {
      await page.getByRole('button', { name: 'More options for Circle Friend' }).click();
      overlay = page.getByRole('menu', { name: 'Circle Friend actions' });
    } else if (name === 'Invite friend') {
      await page.getByRole('button', { name: 'Invite someone', exact: true }).click();
      overlay = page.getByRole('dialog');
    } else if (name === 'Profile menu') {
      await page.getByRole('button', { name: 'Profile options', exact: true }).click();
      overlay = page.getByRole('menu', { name: 'Profile options' });
    } else if (name === 'Phone change') {
      await page.getByRole('button', { name: /^Phone/ }).click();
      overlay = page.getByRole('dialog');
    } else if (name === 'Calendar check-in') {
      await page.getByRole('button', { name: /^Check in/ }).click();
      overlay = page.getByRole('dialog', { name: 'Check-in' });
    } else {
      await page.getByRole('button', { name: new RegExp(`^${name}`) }).click();
      overlay = page.getByRole('dialog');
    }
    await contained(page, overlay);
    // Resizing an already-open surface must also keep every control reachable.
    await page.setViewportSize({ width: viewport.width, height: Math.min(viewport.height, 390) });
    await contained(page, overlay);
    await page.evaluate(() => window.scrollBy(0, 160));
    await contained(page, overlay);
    await page.evaluate(() => window.scrollTo(0, 0));
    await contained(page, overlay);
    if (name === 'Report row menu') {
      await page.mouse.click(1, 1);
      await expect(overlay).toBeHidden();
      return;
    } else if (name === 'Location picker') {
      await overlay.getByRole('option').last().click();
      await expect(overlay.getByRole('option')).toHaveCount(0);
      await contained(page, overlay);
    } else if (name === 'Circle friend menu') {
      await overlay.getByRole('menuitem', { name: 'Chart privacy', exact: true }).click();
      await expect(overlay).toBeHidden();
      overlay = page.getByRole('dialog');
      await contained(page, overlay);
    } else if (name === 'Profile menu') {
      await overlay.getByRole('menuitem', { name: 'Edit details', exact: true }).click();
      await expect(overlay).toBeHidden();
      overlay = page.getByRole('dialog');
      await contained(page, overlay);
    } else if (name === 'Friend chart sections') {
      await overlay.getByRole('menuitemradio', { name: /^Synastry/ }).click();
      await expect(overlay).toBeHidden();
      return;
    }
    await page.keyboard.press('Escape');
    await expect(overlay).toBeHidden();
  });
 }
}

for (const width of [360, 390]) for (const theme of ['light', 'dark']) {
  test(`Full sky chart stays inside ${width} mobile ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 640 });
    await prepare(page, theme, false);
    await page.goto('/#sky', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'Open full current sky chart' }).click();
    const overlay = page.getByRole('dialog', { name: 'Full sky chart' });
    await contained(page, overlay);
    await page.setViewportSize({ width, height: 390 });
    await contained(page, overlay);
    await page.keyboard.press('Escape');
    await expect(overlay).toBeHidden();
  });
}
