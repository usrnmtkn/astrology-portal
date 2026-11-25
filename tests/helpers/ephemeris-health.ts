import type { Page } from '@playwright/test';

/** A declared healthy upstream for isolated reader fixtures. Engine correctness
 * is tested separately; use the browser clock so dated fixtures remain fresh. */
export async function healthyEphemerisProbe(page: Pick<Page, 'route' | 'evaluate' | 'isClosed'>) {
  await page.route('**/api/health?scope=ephemeris', async route => {
    if (route.request().method() !== 'GET') return route.fallback();
    try {
      const timestamp = await page.evaluate(() => new Date().toISOString());
      const check = { ok: true, elapsedMs: 1, detail: { actualEngine: 'swiss' } };
      await route.fulfill({ json: { schema: 'ephemeris-health/v1', timestamp, ok: true, status: 'ok',
        dependencies: { ephemeris: check, skyCalculationApi: check } } });
    } catch (error) {
      // Background probes can belong to a document already replaced by goto
      // or reload. Its request has no consumer in the new document.
      if (page.isClosed() || /Target page, context or browser has been closed/u.test(String(error))) return;
      if (/Execution context was destroyed|Cannot find context/u.test(String(error))) {
        // Returning alone leaves Playwright's route invocation pending, so
        // unrouteAll({ behavior: 'wait' }) cannot finish after navigation.
        await route.abort('aborted');
        return;
      }
      throw error;
    }
  });
}
