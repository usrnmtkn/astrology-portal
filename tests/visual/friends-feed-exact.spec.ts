import { test, expect } from '../helpers/polish-test';
import { getAstrodienstSky } from '../../apps/web/src/services/ephemeris';
import { natalSkySnapshotCacheKey, VERIFIED_SKY_CACHE_SCHEMA } from '../../apps/web/src/services/verifiedSkyCache';
import { bundledPublications } from '../helpers/bundled-publications';
import skyHandler from '../../api/sky';
import type { IncomingMessage, ServerResponse } from 'node:http';

for (const [width, theme] of [[390, 'dark'], [1440, 'light']] as const) {
  test(`Friends exact-today write-ups ${width} ${theme}`, async ({ page }) => {
    test.setTimeout(120_000);
    const at = '2026-10-25T16:00:00.000Z';
    const location = { label: 'New York', latitude: 40.7, longitude: -74, timeZone: 'America/New_York' };
    const birth = new Date('1990-01-01T17:00:00Z');
    const natal = { ...await getAstrodienstSky(location, birth), birthTimeKnown: true };
    const key = natalSkySnapshotCacheKey(location, birth);
    const user = { id: 'exact-reader', email: 'reader@example.test', aud: 'authenticated', role: 'authenticated', app_metadata: { provider: 'email' }, user_metadata: { name: 'Fixture Reader' } };
    const profile = { id: user.id, name: 'Fixture Reader', email: user.email, provider: 'email', currentLocation: location.label, currentLocationData: location,
      charts: [{ id: 'exact-natal', name: 'Fixture Reader', type: 'Birth chart', birthDate: '1990-01-01', birthTime: '12:00 PM', birthCity: location.label, birthLocation: location }] };
    const authKey = `sb-${new URL(process.env.VITE_SUPABASE_URL ?? 'https://visual-smoke.supabase.test').hostname.split('.')[0]}-auth-token`;
    await page.setViewportSize({ width, height: 1100 });
    await page.clock.setFixedTime(new Date(at));
    await bundledPublications(page);
    await page.route('**/auth/v1/**', route => route.fulfill({ json: user }));
    await page.route('**/rest/v1/user_profiles*', route => route.fulfill({ json: { data: { version: 1, profile } } }));
    await page.route('**/rest/v1/manual_charts*', route => route.fulfill({ status: 503, json: { message: 'Synthetic offline chart sync' } }));
    await page.route('**/rest/v1/rpc/list_social_friends', route => route.fulfill({ json: [
      { friendship_id: 'exact-friendship', user_id: 'exact-circle', display_name: 'Connected Friend', handle: 'connected_friend', natal_chart: natal, viewer_shares_chart: true, friend_shares_chart: true, accepted_at: at },
      { friendship_id: 'private-friendship', user_id: 'private-circle', display_name: 'Private Friend', handle: 'private_friend', natal_chart: natal, viewer_shares_chart: true, friend_shares_chart: false, accepted_at: at }
    ] }));
    await page.route('https://tldrastro-api-27165565299.us-central1.run.app/**', route => route.fulfill({ status: 503, body: 'Synthetic local fixture' }));
    await page.route('**/api/sky?**', async route => {
      const response = { statusCode: 200, setHeader() {}, end(body: string) { void route.fulfill({ status: this.statusCode, contentType: 'application/json', body }); } };
      await skyHandler({ method: 'GET', url: route.request().url() } as IncomingMessage, response as unknown as ServerResponse);
    });
    await page.addInitScript(({ at, theme, location, profile, user, authKey, natal, key, schema }) => {
      if (localStorage.getItem('exactFixtureSeeded')) return;
      localStorage.setItem('exactFixtureSeeded', 'true');
      localStorage.setItem('tldrastro:theme', theme);
      localStorage.setItem('tldrastro:pageAnimations', 'off');
      localStorage.setItem('tldrastro:selectedLocation', JSON.stringify(location));
      localStorage.setItem('tldrastro:userProfile', JSON.stringify(profile));
      localStorage.setItem(authKey, JSON.stringify({ access_token: 'synthetic-exact-session', refresh_token: 'synthetic-refresh', expires_at: Date.parse(at) / 1000 + 3600, token_type: 'bearer', user }));
      localStorage.setItem(key, JSON.stringify({ schema, cacheKey: key, snapshot: natal, verifiedAt: at }));
      localStorage.setItem('tldrastro:manualCharts:exact-reader', JSON.stringify([{ id: 'exact-saved', ownerUserId: user.id, chartType: 'person', displayName: 'Fixture Friend', firstName: 'Fixture', relationshipType: 'friend', birthDate: '1990-01-01', birthTime: '12:00 PM', birthTimeUnknown: false, birthPlace: location.label, birthLocation: location, natalChart: natal, createdAt: at, updatedAt: at }]));
    }, { at, theme, location, profile, user, authKey, natal, key, schema: VERIFIED_SKY_CACHE_SCHEMA });
    if (width === 390) await page.addInitScript(() => {
      const OriginalWorker = window.Worker;
      window.Worker = class extends OriginalWorker {
        postMessage(message: any, transfer: any) {
          if (message.kind === 'natal-daily-peaks' && !sessionStorage.getItem('exact-peaks-recovered')) {
            queueMicrotask(() => this.dispatchEvent(new MessageEvent('message', { data: { id: message.id, ok: false, error: 'Synthetic peak failure' } })));
            return;
          }
          super.postMessage(message, transfer);
        }
      };
    });

    await page.goto('/?date=2026-10-25#friends?tab=feed');
    if (width === 390) {
      await expect(page.getByText('The transit readings could not load. Please try again.', { exact: true })).toBeVisible();
      await page.evaluate(() => sessionStorage.setItem('exact-peaks-recovered', 'true'));
      await page.getByRole('button', { name: 'Try again', exact: true }).click();
    }
    const today = page.getByRole('region', { name: 'Today', exact: true });
    const saved = today.locator('.friends-timing-card').filter({ hasText: "Moon in Aries square Fixture Friend's natal Mercury" });
    const circle = today.locator('.friends-timing-card').filter({ hasText: "Moon in Aries square Connected Friend's natal Mercury" });
    await expect(saved).toBeVisible({ timeout: 60_000 });
    await expect(circle).toBeVisible();
    for (const [card, name] of [[saved, 'Fixture Friend'], [circle, 'Connected Friend']] as const) {
      await expect(card.locator('.friends-timing-card__friend-name')).toHaveText(name);
      await expect(card.locator('.friends-timing-card__friend-name')).toHaveCSS('text-decoration-line', 'underline');
    }
    // Independently checked Swiss peak for this real synthetic birth chart.
    await expect(saved.locator('small')).toContainText('Exact 12:11 PM EDT');
    await expect(circle.locator('small')).toContainText('Exact 12:11 PM EDT');
    await expect(page.locator('.friends-timing-card').filter({ hasText: 'Private Friend' })).toHaveCount(0);
    await expect(page.locator('.friends-person-day, .friends-feed-disclosure')).toHaveCount(0);
    const filter = page.getByRole('combobox', { name: 'Filter friends feed', exact: true });
    await filter.selectOption('charts');
    await expect(saved).toBeVisible(); await expect(circle).toHaveCount(0);
    await page.screenshot({ path: `test-results/friends-exact-today-${width}-${theme}.png`, fullPage: true });
    await saved.click();
    const detail = page.locator('.sky-detail-article');
    await expect(detail).toBeVisible({ timeout: 60_000 });
    await expect(detail).toContainText('Moon in Aries');
    await expect(detail).toContainText('Mercury');
    const paragraphs = await detail.locator('p').allTextContents();
    const sentences = paragraphs.filter(text => text.length > 80);
    expect(sentences.length).toBeGreaterThan(0);
    await expect(detail).toContainText('Exact Oct 25, 2026 · 12:11 PM EDT');
    await page.reload();
    await expect(detail).toContainText(sentences[0], { timeout: 60_000 });
    await expect(detail).toContainText(sentences.at(-1)!);
    await page.getByRole('button', { name: 'Close detail', exact: true }).click();
    await expect(saved).toBeVisible({ timeout: 60_000 });
    await filter.selectOption('circle');
    await expect(circle).toBeVisible(); await expect(saved).toHaveCount(0);
    await page.goto('/?date=2026-10-26#friends?tab=feed');
    await expect(today.locator('.friends-timing-card').filter({ hasText: "Moon in Taurus trine Connected Friend's natal Sun" })).toBeVisible({ timeout: 60_000 });
    await expect(today.locator('.friends-timing-card').filter({ hasText: "Moon in Aries square Connected Friend's natal Mercury" })).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}
