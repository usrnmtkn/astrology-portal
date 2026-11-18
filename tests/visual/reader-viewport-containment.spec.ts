import { expect, test, type Page } from '../helpers/polish-test';
import { readerResponse } from '../helpers/reader-response';

const surfaces = [
  { name: 'Sky', path: '/#sky', ready: '.sky-reading-layout' },
  { name: 'Calendar', path: '/#calendar?view=day', ready: '.calendar-day-panel' },
  { name: 'Horoscopes', path: '/#horoscopes', ready: '.horoscope-reading' },
  { name: 'Guide', path: '/learn', ready: '.learn-page' },
  { name: 'Friends charts', path: '/#friends?tab=charts', ready: '.friends-layout' },
  { name: 'Friends circle', path: '/#friends?tab=circle', ready: '.friends-layout' },
  { name: 'Reports', path: '/reports/', ready: '.report-library-header' },
  { name: 'Settings', path: '/#settings', ready: '.settings-group' },
  { name: 'Account', path: '/#account', ready: '.account-page' },
  { name: 'Sign in', path: '/#you', ready: '.auth-flow-v2', guest: true }
];

async function prepare(page: Page, theme: string, guest = false) {
  await page.addInitScript(({ theme, guest }) => {
    localStorage.setItem('tldrastro:theme', theme);
    const location = { label: 'Synthetic New York', latitude: 40.7, longitude: -74, timeZone: 'America/New_York' };
    localStorage.setItem('tldrastro:selectedLocation', JSON.stringify(location));
    if (!guest) localStorage.setItem('tldrastro:userProfile', JSON.stringify({
      id: 'viewport-fixture', name: 'Test Reader', email: 'reader@example.test', provider: 'email',
      sun: 'Aquarius', moon: 'Scorpio', rising: 'Gemini', currentLocation: location.label, currentLocationData: location,
      charts: [{ id: 'viewport-chart', name: 'Test Reader', type: 'Birth chart', birthDate: '1990-01-01', birthTime: '12:00 PM', birthCity: location.label, birthLocation: location }]
    }));
    const violations = new Map<string, unknown>();
    const observedLoaders = new Set<string>();
    const sample = () => {
      const width = document.documentElement.clientWidth;
      if (document.documentElement.scrollWidth > width + 1) violations.set('document', {
        viewport: width, scrollWidth: document.documentElement.scrollWidth
      });
      for (const element of document.querySelectorAll('.page-shell, .page-shell--narrow, .chart-layout, .chart-layout__content, .app-loading, .feature-loading-fallback, .learn-page, .report-library, [role="dialog"], [role="status"], [role="alert"]')) {
        const box = element.getBoundingClientRect();
        if (box.width <= 2 || box.height <= 2 || element.closest('[hidden], [aria-hidden="true"]') || getComputedStyle(element).visibility === 'hidden') continue;
        if (element.matches('.app-loading, [role="status"]')) observedLoaders.add(element.getAttribute('aria-label') ?? element.className);
        if (box.left < -1 || box.right > width + 1) violations.set(element.className || element.tagName, {
          left: box.left, right: box.right, viewport: width, text: element.textContent?.trim().slice(0, 80)
        });
      }
      requestAnimationFrame(sample);
    };
    (window as any).__viewportAudit = { violations, observedLoaders };
    requestAnimationFrame(sample);
  }, { theme, guest });
  await page.route('**/rest/v1/**', route => route.fulfill({ json: [] }));
  await page.route('**/content-studio-last-known-good.json', route => route.fulfill({ json: {
    schema: 'content-studio-last-known-good-v2', rows: [], publications: [], rowCount: 0
  } }));
  await page.route('**/api/content-reader', async route => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    await route.fulfill({ json: readerResponse([]) });
  });
  await page.route('**/api/calendar?**', route => route.fulfill({ status: 503, json: { ok: false, error: 'Synthetic offline recovery' } }));
}

for (const width of [360, 390, 768, 1024, 1440, 1768]) for (const theme of ['light', 'dark']) {
  for (const surface of surfaces) {
    test(`${surface.name} containers stay in the viewport at ${width} ${theme}`, async ({ page }, info) => {
      test.setTimeout(45_000);
      await page.setViewportSize({ width, height: 1000 });
      await prepare(page, theme, surface.guest);
      await page.goto(surface.path, { waitUntil: 'domcontentloaded' });
      await expect(page.locator(surface.ready).filter({ visible: true }).first()).toBeVisible();
      // Cover delayed data, font hydration, and the first settled layout.
      await page.waitForTimeout(1800);
      const result = await page.evaluate(() => {
        const audit = (window as any).__viewportAudit;
        return { violations: [...audit.violations.entries()], loaders: [...audit.observedLoaders] };
      });
      await info.attach('viewport-audit', { body: JSON.stringify(result, null, 2), contentType: 'application/json' });
      expect(result.violations).toEqual([]);
    });
  }
}
