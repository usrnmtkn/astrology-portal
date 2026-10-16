import { expect, test, type Locator, type Page } from '@playwright/test';
import { readerResponse } from '../helpers/reader-response';

type Scenario = {
  name: string;
  path: string;
  state: string;
  text: string;
  failure?: 'reader' | 'reports' | 'friends' | 'blocks' | 'calendar' | 'transits' | 'astronomy' | 'chunk' | 'journal';
  chart?: boolean;
  action?: 'archive' | 'search' | 'details';
  retry?: string;
  longError?: boolean;
};

const scenarios: Scenario[] = [
  { name: 'Sky calculation error', path: '/#sky', state: '.app-loading[role="alert"]', text: 'The current sky could not load.', failure: 'astronomy', retry: 'Retry' },
  { name: 'Page asset error details', path: '/#calendar', state: '.app-loading[role="alert"]', text: 'This page could not load.', failure: 'chunk', action: 'details', retry: 'Reload page' },
  { name: 'Horoscopes empty', path: '/#horoscopes', state: '.horoscope-empty', text: 'No daily reading yet' },
  { name: 'Horoscopes error', path: '/#horoscopes', state: '.horoscope-reading', text: 'Your horoscope could not load.', failure: 'reader', retry: 'Try again' },
  { name: 'Learn unavailable lesson', path: '/learn/astro-101/synthetic-missing-lesson', state: '.learn-sheet', text: 'That lesson is not live yet.' },
  { name: 'Learn error', path: '/learn', state: '.learn-sheet', text: 'Astro 101 could not load.', failure: 'reader' },
  { name: 'Articles empty', path: '/#articles', state: '.learn-hub', text: 'No articles or guides are published yet.' },
  { name: 'Articles unavailable', path: '/#articles/article%2Fguide%2Fsynthetic-missing', state: '.articles-library-state', text: 'Article unavailable' },
  { name: 'Articles error', path: '/#articles', state: '.articles-library-state', text: 'Articles and guides could not load.', failure: 'reader', retry: 'Try again' },
  { name: 'Reports empty', path: '/reports/', state: '.report-library-empty', text: 'No reports yet' },
  { name: 'Reports archived empty', path: '/reports/', state: '.report-library-empty', text: 'Nothing archived', action: 'archive' },
  { name: 'Reports error', path: '/reports/', state: '.report-library-list', text: 'Your reports could not be loaded right now.', failure: 'reports' },
  { name: 'Report unavailable', path: '/reports/generated/22222222-2222-4222-8222-222222222222', state: '.saved-generated-report__state-card, .report-delivery-state', text: 'This report is unavailable.' },
  { name: 'Friends charts empty', path: '/#friends?tab=charts', state: '[aria-label="No charts"]', text: 'No charts yet.' },
  { name: 'Friends circle empty', path: '/#friends?tab=circle', state: '.friends-unified-empty', text: 'Nobody here yet.' },
  { name: 'Friends search empty long query', path: '/#friends?tab=circle', state: '.friends-unified-empty', text: 'No one found for', action: 'search' },
  { name: 'Friends error', path: '/#friends?tab=circle', state: '.friends-unified-empty', text: 'Friends could not load.', failure: 'friends', retry: 'Try again' },
  { name: 'You empty chart', path: '/#you', state: '.you-empty-state', text: 'Create your chart' },
  { name: 'You transits error', path: '/#you', state: '.app-loading[role="alert"]', text: 'The transit readings could not load.', chart: true, failure: 'transits', retry: 'Retry' },
  { name: 'Calendar error', path: '/#calendar', state: '.lunar-calendar-empty', text: 'Calendar data could not load.', failure: 'calendar', retry: 'Retry' },
  { name: 'Calendar empty check-in', path: '/#calendar?view=day', state: '.calendar-checkin-card.is-empty', text: 'Check in' },
  { name: 'Account journal empty', path: '/#account?view=journal', state: '.settings-card', text: 'No check-ins yet' },
  { name: 'Account journal error', path: '/#account?view=journal', state: '[aria-label="Journal history"]', text: 'Your check-ins could not load.', failure: 'journal', retry: 'Retry' },
  { name: 'Settings blocked empty', path: '/#settings?view=blocked-accounts', state: '.settings-blocked-summary', text: 'None' },
  { name: 'Settings blocked error', path: '/#settings?view=blocked-accounts', state: '.settings-blocked-error', text: 'Synthetic service unavailable', failure: 'blocks', retry: 'Retry' },
  { name: 'Settings long error', path: '/#settings?view=blocked-accounts', state: '.settings-blocked-error', text: 'Synthetic service unavailable', failure: 'blocks', longError: true, retry: 'Retry' }
];

async function prepare(page: Page, theme: string, scenario: Scenario) {
  const user = { id: '11111111-1111-4111-8111-111111111111', aud: 'authenticated', role: 'authenticated',
    email: 'viewport@example.test', app_metadata: { provider: 'email' }, user_metadata: { name: 'Test Reader' } };
  const authHost = new URL(process.env.VITE_SUPABASE_URL ?? 'https://visual-smoke.supabase.test').hostname.split('.')[0];
  await page.addInitScript(({ theme, user, authHost, chart }) => {
    localStorage.setItem('tldrastro:theme', theme);
    const location = { label: 'Synthetic New York', latitude: 40.7, longitude: -74, timeZone: 'America/New_York' };
    localStorage.setItem('tldrastro:selectedLocation', JSON.stringify(location));
    localStorage.setItem('tldrastro:userProfile', JSON.stringify({
      ...user, name: 'Test Reader', provider: 'email', sun: 'Aquarius', moon: 'Scorpio', rising: 'Gemini',
      currentLocation: location.label, currentLocationData: location,
      charts: chart ? [{ id: 'viewport-chart', name: 'Test Reader', type: 'Birth chart', birthDate: '1990-01-01',
        birthTime: '12:00 PM', birthCity: location.label, birthLocation: location }] : []
    }));
    const session = JSON.stringify({ user, access_token: 'synthetic-token', refresh_token: 'synthetic-refresh', token_type: 'bearer', expires_at: 4102444800 });
    for (const host of new Set([authHost, 'hdmdufozrgrajkfhydit'])) localStorage.setItem(`sb-${host}-auth-token`, session);
  }, { theme, user, authHost, chart: scenario.chart });
  await page.route('**/auth/v1/**', route => route.fulfill({ json: user }));
  let failedRequests = 0;
  if (scenario.failure === 'astronomy' || scenario.failure === 'calendar') {
    await page.route(/\/assets\/skyCalculation\.worker-.*\.js$/u, route => { failedRequests++; return route.abort('failed'); });
    await page.route('**/api/sky?**', route => { failedRequests++; return route.fulfill({ status: 503, json: { ok: false, error: 'Synthetic calculation unavailable' } }); });
  }
  if (scenario.failure === 'chunk') {
    await page.route(/\/assets\/CalendarRoute-.*\.js$/u, route => { failedRequests++; return route.abort('failed'); });
  }
  await page.route('**/rest/v1/**', route => {
    const url = route.request().url();
    const failed = scenario.failure === 'reports' && /user_generated_interpretations|report_entitlements|report_library/u.test(url)
      || scenario.failure === 'friends' && url.includes('/rpc/list_social_friends')
      || scenario.failure === 'blocks' && url.includes('/rpc/list_social_blocks')
      || scenario.failure === 'journal' && url.includes('/calendar_check_ins');
    if (failed) { failedRequests++; return route.fulfill({ status: 503, json: { message: `Synthetic service unavailable${scenario.longError ? ' (request: ' + 'abcdef0123456789'.repeat(8) + ')' : ''}` } }); }
    if (scenario.failure === 'transits' && url.includes('/content_publications')) return route.fulfill({ json: [{
      content_key: 'authored/transit-fixture', state: 'live', revision: 1, row_id: 'fixture-transit',
      row_updated_at: null, updated_at: '2026-10-15T00:00:00Z'
    }] });
    return route.fulfill({ json: [] });
  });
  await page.route('**/content-studio-last-known-good.json', route => route.fulfill({ json: {
    schema: 'content-studio-last-known-good-v2', rows: [], publications: [], rowCount: 0
  } }));
  await page.route('**/api/content-reader', route => {
    if (scenario.failure === 'reader' || scenario.failure === 'transits') {
      failedRequests++;
      return route.fulfill({ status: 503, json: { error: 'Synthetic service unavailable' } });
    }
    return route.fulfill({ json: readerResponse([]) });
  });
  await page.route('**/api/calendar?**', route => {
    if (scenario.failure === 'calendar') failedRequests++;
    return route.fulfill({ status: 503, json: { ok: false, error: 'Synthetic service unavailable' } });
  });
  return { failedRequests: () => failedRequests };
}

async function assertContained(page: Page, state: Locator) {
  await expect(state).toBeVisible();
  const result = await state.evaluate(element => {
    const viewport = document.documentElement.clientWidth;
    const parent = element.parentElement!.getBoundingClientRect();
    const state = element.getBoundingClientRect();
    const violations = [element, ...element.querySelectorAll('*')].flatMap(node => {
      const box = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      if (!node.getClientRects().length || box.width <= 1 || box.height <= 1 || style.visibility === 'hidden') return [];
      // Single-line metadata intentionally uses ellipsis; its visible box must
      // still fit. Error details and card contents must wrap instead of clip.
      const ellipsis = style.textOverflow === 'ellipsis' && style.overflowX === 'hidden';
      return box.left < Math.max(0, state.left) - 1 || box.right > Math.min(viewport, state.right) + 1
        || !ellipsis && node.clientWidth > 0 && node.scrollWidth > node.clientWidth + 1
        ? [{ tag: node.tagName, className: node.getAttribute('class'), left: box.left, right: box.right, scroll: node.scrollWidth, width: node.clientWidth }] : [];
    });
    const box = element.getBoundingClientRect();
    return { viewport, scroll: document.documentElement.scrollWidth, parent: { left: parent.left, right: parent.right },
      state: { left: box.left, right: box.right }, violations };
  });
  expect(result.violations).toEqual([]);
  expect(result.scroll).toBeLessThanOrEqual(result.viewport + 1);
  expect(result.state.left).toBeGreaterThanOrEqual(result.parent.left - 1);
  expect(result.state.right).toBeLessThanOrEqual(result.parent.right + 1);
}

for (const width of [360, 768, 1440]) for (const theme of ['light', 'dark']) for (const scenario of scenarios) {
  test(`${scenario.name} stays contained at ${width} ${theme}`, async ({ page }) => {
    test.setTimeout(45_000);
    await page.setViewportSize({ width, height: 1000 });
    const fixture = await prepare(page, theme, scenario);
    await page.goto(scenario.path, { waitUntil: 'domcontentloaded' });
    if (scenario.action === 'archive') await page.getByRole('tab', { name: /^Archived/u }).click();
    if (scenario.action === 'search') await page.getByRole('textbox', { name: 'Search by name or handle' }).fill('SyntheticUnmatchedName'.repeat(5));
    const state = page.locator(scenario.state).filter({ hasText: scenario.text }).first();
    await expect(state).toBeVisible();
    if (scenario.action === 'details') await state.getByText('Error details', { exact: true }).click();
    await assertContained(page, state);
    if (scenario.retry) {
      const requests = fixture.failedRequests();
      await state.getByRole('button', { name: scenario.retry, exact: true }).click();
      await expect.poll(fixture.failedRequests).toBeGreaterThan(requests);
      await expect(state).toBeVisible();
      if (scenario.action === 'details') await state.getByText('Error details', { exact: true }).click();
      await assertContained(page, state);
    }
    await page.reload({ waitUntil: 'domcontentloaded' });
    if (scenario.action === 'archive') await page.getByRole('tab', { name: /^Archived/u }).click();
    if (scenario.action === 'search') await page.getByRole('textbox', { name: 'Search by name or handle' }).fill('SyntheticUnmatchedName'.repeat(5));
    await expect(state).toBeVisible();
    if (scenario.action === 'details') await state.getByText('Error details', { exact: true }).click();
    await assertContained(page, state);
  });
}
