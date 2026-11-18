import { test, expect } from '@playwright/test';
import { getAstrodienstSky } from '../../apps/web/src/services/ephemeris';
import { zonedDateTimeToUtc } from '../../apps/web/src/services/timezones';
import { natalSkySnapshotCacheKey, VERIFIED_SKY_CACHE_SCHEMA } from '../../apps/web/src/services/verifiedSkyCache';
import { wholeSignHouseForSign } from '../../apps/web/src/services/chartMath';
import { skyPlacementAspectBridgeKey } from '../../apps/web/src/content/skyPlacementAspectBridge';
import { skyPlacementAspectBridgeDraft } from '../../apps/admin/src/skyPlacementAspectBridgeDraft';
import { studioApiStore } from '../helpers/studio-api-store';
import { routeStudioInventoryApi } from '../helpers/studio-inventory-route';
import { canonicalPublicationLedger, publicationLedgerTag } from '../../apps/web/src/services/publicationLedgerTransport';

for (const [width, theme] of [[390, 'light'], [390, 'dark'], [1440, 'light'], [1440, 'dark']] as const) {
  test(`Personalized placement preserves complete passages and one timing ${width} ${theme}`, async ({ page }) => {
    test.setTimeout(150_000);
    const store = await studioApiStore([]);
    try {
      const location = { label: 'New York, NY', latitude: 40.7128, longitude: -74.006, timeZone: 'America/New_York' };
      const birthDate = '1997-10-25', birthTime = '12:00 PM', now = '2026-09-11T23:20:00Z';
      const natal = await getAstrodienstSky(location, zonedDateTimeToUtc(birthDate, birthTime, location.timeZone));
      const house = wholeSignHouseForSign('Virgo', natal.ascendant!)!;
      const key = skyPlacementAspectBridgeKey({ house, transiting: 'sun', aspect: 'conjunction', natal: 'north-node' })!;
      const cacheKey = natalSkySnapshotCacheKey(location, zonedDateTimeToUtc(birthDate, birthTime, location.timeZone));
      await page.setViewportSize({ width, height: 1000 });
      await page.clock.setFixedTime(new Date(now));
      await page.addInitScript(({ natal, location, birthDate, birthTime, now, cacheKey, schema, theme }) => {
        localStorage.setItem('tldrastro:theme', theme);
        localStorage.setItem('tldrastro:selectedLocation', JSON.stringify(location));
        localStorage.setItem('tldrastro:userProfile', JSON.stringify({ id: 'qa-house-aspect-bridge', name: 'Transit QA',
          email: 'transit-qa@example.com', provider: 'email', rising: natal.ascendant,
          currentLocation: location.label, currentLocationData: location,
          charts: [{ id: 'qa-chart', name: 'Transit QA', type: 'Birth chart', birthDate, birthTime, birthCity: location.label, birthLocation: location }] }));
        localStorage.setItem(cacheKey, JSON.stringify({ schema, cacheKey, snapshot: natal, verifiedAt: now }));
      }, { natal, location, birthDate, birthTime, now, cacheKey, schema: VERIFIED_SKY_CACHE_SCHEMA, theme });
      await page.route('**/rest/v1/**', route => route.fulfill({ json: [] }));
      await page.route('**/content-studio-last-known-good.json', route => route.fulfill({ json: { schema: 'content-studio-last-known-good-v2', rows: [], publications: [], rowCount: 0 } }));
      await page.route('https://tldrastro-api-27165565299.us-central1.run.app/**', route => route.fulfill({ status: 503, body: 'QA uses local calculations' }));
      await routeStudioInventoryApi(page, { call: store.call, answer: async (route, url) => {
        if (url.pathname === '/api/content-publications') {
          const publications = canonicalPublicationLedger(await store.call({ method: 'publications' }));
          await route.fulfill({ headers: { etag: await publicationLedgerTag(publications) }, json: { schema: 'tldr-publications/v1', publications } }); return true;
        }
        if (url.pathname === '/api/content-reader') {
          const result = await store.call({ method: 'POST', url: url.pathname, body: route.request().postDataJSON() });
          await route.fulfill({ status: result.status, json: result.payload }); return true;
        }
        if (url.pathname === '/api/calendar') { await route.fulfill({ json: { ok: true, calendar: { days: [] } } }); return true; }
        return false;
      } });
      await page.goto('/?date=2026-09-11#sky/placement/sun/virgo');
      const aspect = page.locator('.sky-detail-personalized-aspect').filter({ has: page.getByRole('heading', { name: 'Sun conjunction your North Node · Sun opposition your South Node', exact: true }) });
      await expect(aspect).toContainText('You may be offered a role that feels slightly ahead', { timeout: 90_000 });
      await expect(aspect).toContainText('learn from what happens next.');
      const baseline = await aspect.locator('p').allTextContents();
      const bridge = 'Synthetic bridge opening. Synthetic bridge final sentence.';
      const { id: _id, ...draft } = skyPlacementAspectBridgeDraft(key);
      const created = await store.call({ method: 'POST', body: { ...draft, eventType: 'sky-placement-house-aspect-bridge', reviewStatus: 'needs_review' } });
      expect(created.status).toBe(200);
      let row = created.payload.rows[0];
      const saved = await store.call({ method: 'PATCH', body: { id: row.id, expectedUpdatedAt: row.updated_at,
        sections: { ...row.sections, packageDraft: { body: bridge } }, reviewStatus: 'needs_review' } });
      expect(saved.status).toBe(200); row = saved.payload.rows[0];
      await page.reload();
      await expect(aspect).toContainText('learn from what happens next.', { timeout: 90_000 });
      await expect(aspect).not.toContainText(bridge);
      const published = await store.call({ method: 'PATCH', body: { id: row.id, expectedUpdatedAt: row.updated_at, ownerAction: 'approve-package-revision' } });
      expect(published.status).toBe(200);
      await page.reload();
      await expect(aspect).toContainText(bridge, { timeout: 90_000 });
      const composed = await aspect.locator('p').allTextContents();
      expect(composed.map(paragraph => paragraph.replace(`${bridge} `, '').replace(` ${bridge}`, ''))).toEqual(baseline);
      const dates = baseline.join(' ').match(/(?:September \d{1,2}, 2026)/gu) ?? [];
      expect(dates.length).toBeGreaterThan(0);
      for (const date of new Set(dates)) expect(composed.join(' ').split(date).length).toBe(baseline.join(' ').split(date).length);
      await page.locator('#sky-personalized-placement').screenshot({ path: `test-results/house-aspect-bridge-reader-${width}-${theme}.png` });
      await page.reload();
      await expect(aspect.locator('p')).toHaveText(composed, { timeout: 90_000 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    } finally { store.close(); }
  });
}
