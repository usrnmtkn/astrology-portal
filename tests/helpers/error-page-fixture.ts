import type {Page} from "@playwright/test";
import {readerResponse} from "./reader-response";
export type ErrorScenario = {failure?: "reader"|"reports"|"friends"|"blocks"|"calendar"|"transits"|"astronomy"|"chunk"|"journal"|"signed-out";chart?:boolean;longError?:boolean};

export async function prepareErrorPage(page: Page, theme: string, scenario: ErrorScenario) {
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
    if(scenario.failure==='signed-out'&&url.includes('/rpc/list_social_friends'))return route.fulfill({status:401,json:{code:'PGRST301',message:'Session expired'}});
    const failed = scenario.failure === 'reports' && /user_generated_interpretations|report_entitlements|report_library/u.test(url)
      || scenario.failure === 'friends' && url.includes('/rpc/list_social_friends')
      || scenario.failure === 'blocks' && url.includes('/rpc/list_social_blocks')
      || scenario.failure === 'journal' && url.includes('/calendar_check_ins');
    if (failed) {
      failedRequests++;
      // Exercise SDK retries without backoff delays in these layout-only fixtures.
      return route.fulfill({ status: 503, headers: {
        'Retry-After': '0', 'Access-Control-Expose-Headers': 'Retry-After'
      }, json: {
        message: `Synthetic service unavailable${scenario.longError ? ' (request: ' + 'abcdef0123456789'.repeat(8) + ')' : ''}`
      } });
    }
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

