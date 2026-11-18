import type { Page } from "@playwright/test";
import { readerResponse } from "./reader-response";
export async function prepareChartReport(page: Page, theme: string, friendName: string, unknown = false) {
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
