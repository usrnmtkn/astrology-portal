import { auditReaderScreen, expect, test, type Locator, type Page } from '../helpers/polish-test';
import { prepareErrorPage as prepare } from '../helpers/error-page-fixture';

type Scenario = {
  name: string;
  path: string;
  state: string;
  text: string;
  failure?: 'reader' | 'reports' | 'friends' | 'blocks' | 'calendar' | 'transits' | 'astronomy' | 'chunk' | 'journal' | 'signed-out';
  chart?: boolean;
  action?: 'archive' | 'search' | 'details';
  retry?: string;
  longError?: boolean;
};

const scenarios: Scenario[] = [
  { name: 'Sky calculation error', path: '/#sky', state: '.load-error--page', text: 'The current sky could not load.', failure: 'astronomy', retry: 'Try again' },
  { name: 'Page asset error details', path: '/#calendar', state: '.load-error--page', text: 'This page could not load.', failure: 'chunk', retry: 'Try again' },
  { name: 'Horoscopes empty', path: '/#horoscopes', state: '.horoscope-empty', text: 'No daily reading yet' },
  { name: 'Horoscopes error', path: '/#horoscopes', state: '.load-error--page', text: "Today's horoscope could not load.", failure: 'reader', retry: 'Try again' },
  { name: 'Learn unavailable lesson', path: '/learn/astro-101/synthetic-missing-lesson', state: '.learn-sheet', text: 'That lesson is not live yet.' },
  { name: 'Learn error', path: '/learn', state: '.load-error--page', text: 'Astro 101 could not load.', failure: 'reader', retry: 'Try again' },
  { name: 'Articles empty', path: '/#articles', state: '.learn-hub', text: 'No articles or guides are published yet.' },
  { name: 'Articles unavailable', path: '/#articles/article%2Fguide%2Fsynthetic-missing', state: '.reader-unavailable__card', text: 'Article unavailable' },
  { name: 'Articles error', path: '/#articles', state: '.load-error--page', text: 'Articles and guides could not load.', failure: 'reader', retry: 'Try again' },
  { name: 'Reports empty', path: '/reports/', state: '.report-library-empty', text: 'No reports yet' },
  { name: 'Reports archived empty', path: '/reports/', state: '.report-library-empty', text: 'Nothing archived', action: 'archive' },
  { name: 'Reports error', path: '/reports/', state: '.report-library-list', text: 'Your reports could not be loaded right now.', failure: 'reports' },
  { name: 'Report unavailable', path: '/reports/generated/22222222-2222-4222-8222-222222222222', state: '.reader-unavailable__card', text: 'Report not found' },
  { name: 'Friends charts empty', path: '/#friends?tab=charts', state: '[aria-label="No charts"]', text: 'No charts yet.' },
  { name: 'Friends circle empty', path: '/#friends?tab=circle', state: '.friends-unified-empty', text: 'Nobody here yet.' },
  { name: 'Friends search empty long query', path: '/#friends?tab=circle', state: '.friends-unified-empty', text: 'No one found for', action: 'search' },
  { name: 'Friends signed out', path: '/#friends?tab=feed', state: '.friends-signin-card', text: 'Sign in to see your friends', failure: 'signed-out' },
  { name: 'Friends error', path: '/#friends?tab=circle', state: '.load-error--page', text: 'Your friends could not load.', failure: 'friends', retry: 'Try again' },
  { name: 'You empty chart', path: '/#you', state: '.you-empty-state', text: 'Create your chart' },
  { name: 'You transits error', path: '/#you', state: '.load-error--section', text: 'The transit readings could not load.', chart: true, failure: 'transits', retry: 'Try again' },
  { name: 'Calendar error', path: '/#calendar', state: '.load-error--page', text: 'This day could not load.', failure: 'calendar', retry: 'Try again' },
  { name: 'Calendar empty check-in', path: '/#calendar?view=day', state: '.calendar-checkin-card.is-empty', text: 'Check in' },
  { name: 'Account journal empty', path: '/#account?view=journal', state: '.settings-card', text: 'No check-ins yet' },
  { name: 'Account journal error', path: '/#account?view=journal', state: '[aria-label="Journal history"]', text: 'Your check-ins could not load.', failure: 'journal', retry: 'Retry' },
  { name: 'Settings blocked empty', path: '/#settings?view=blocked-accounts', state: '.settings-blocked-summary', text: 'None' },
  { name: 'Settings blocked error', path: '/#settings?view=blocked-accounts', state: '.settings-blocked-error', text: 'Synthetic service unavailable', failure: 'blocks', retry: 'Retry' },
  { name: 'Settings long error', path: '/#settings?view=blocked-accounts', state: '.settings-blocked-error', text: 'Synthetic service unavailable', failure: 'blocks', longError: true, retry: 'Retry' }
];

async function assertContained(page: Page, state: Locator) {
  await expect(state).toBeVisible();
  const measure = () => state.evaluateAll(elements => {
    const element = elements[0];
    let parentElement = element?.parentElement;
    if (!element?.isConnected || !parentElement) return null;
    while (parentElement.parentElement && (getComputedStyle(parentElement).display === 'contents' || parentElement.getBoundingClientRect().width === 0)) {
      parentElement = parentElement.parentElement;
    }
    const state = element.getBoundingClientRect();
    if (state.width <= 0 || state.height <= 0 || getComputedStyle(element).visibility === 'hidden') return null;
    const viewport = document.documentElement.clientWidth;
    const parent = parentElement.getBoundingClientRect();
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
  let result!: NonNullable<Awaited<ReturnType<typeof measure>>>;
  // A retry can replace the visible error panel before its geometry is read.
  // Retry only missing/hidden snapshots; overflow assertions still fail directly.
  await expect.poll(async () => {
    const snapshot = await measure();
    if (snapshot) result = snapshot;
    return snapshot !== null;
  }, { message: 'Error or empty state has connected, visible geometry' }).toBe(true);
  expect(result.violations).toEqual([]);
  expect(result.scroll).toBeLessThanOrEqual(result.viewport + 1);
  expect(result.state.left).toBeGreaterThanOrEqual(result.parent.left - 1);
  expect(result.state.right).toBeLessThanOrEqual(result.parent.right + 1);
}

for (const width of [360, 768, 1440]) for (const theme of ['light', 'dark']) for (const scenario of scenarios) {
  test(`${scenario.name} stays contained at ${width} ${theme}`, async ({ page },info) => {
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
    await auditReaderScreen(page,info,'initial-state');
    if(scenario.name==='Horoscopes empty') {
      await page.locator('.horoscope-location > summary').click();
      for(const control of await page.locator('.horoscope-location-fields input, .horoscope-location-fields select').all()) {
        await expect(control).toHaveCSS('font-family',/system-ui/);await expect(control).toHaveCSS('font-size','15px');
        await expect(control).toHaveCSS('border-top-style','none');
        expect((await control.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      }
      await auditReaderScreen(page,info,'expanded-horoscope-location');
      await page.getByRole('button',{name:'Reset to device time zone',exact:true}).click();
      await page.locator('.horoscope-location > summary').click();
    }
    if(scenario.failure==='signed-out') {
      for(const action of ['Log in','Create an account']) {
        const button=state.getByRole('button',{name:action,exact:true});
        await expect(button).toHaveCSS('font-size','15px');await expect(button).toHaveCSS('border-top-style','none');
        const bounds=await button.boundingBox();expect(bounds!.height).toBeGreaterThanOrEqual(44);
        await button.click();const dialog=page.getByRole('dialog');await expect(dialog).toBeVisible();
        await auditReaderScreen(page,info,action==='Log in'?'login-dialog':'signup-dialog');
        await dialog.getByRole('button',{name:'Close',exact:true}).click();await expect(state).toBeVisible();
      }
    }
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
