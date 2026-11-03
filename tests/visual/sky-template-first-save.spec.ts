import { expect, test, type Page, type TestInfo, type Request } from '@playwright/test';
import { studioApiStore } from '../helpers/studio-api-store';
import { routeStudioInventoryApi } from '../helpers/studio-inventory-route';

test.describe.configure({ retries: 0 });
const key = 'sky/article-template/sun/libra';
const title = 'Synthetic neutral Sky template';
const copy = 'Synthetic complete template opening.\n\nSynthetic complete template ending.';
const editor = (page: Page) => page.getByRole('dialog', { name: 'Generated content editor' });
const builder = (page: Page) => editor(page).getByRole('region', { name: 'Create an article edition from this template' });
function gate() { let release!: () => void; const promise = new Promise<void>(resolve => { release = resolve; }); return { promise, release }; }

async function setup(page: Page, info: TestInfo, delayed = false) {
  const api = await studioApiStore([], { publicationDb: true, uuidIds: true });
  const ack = gate();
  const evidence: any = { writes: [], responses: [], errors: [], failed: [], blocked: [] };
  const transfers = new Set<Request>();
  const origin = new URL(info.project.use.baseURL as string).origin;
  page.on('request', request => {
    const path = new URL(request.url()).pathname;
    if (path.startsWith('/api/') || path.startsWith('/rest/v1/')) transfers.add(request);
  });
  page.on('pageerror', error => evidence.errors.push(error.message));
  page.on('requestfailed', request => evidence.failed.push({ path: new URL(request.url()).pathname, error: request.failure()?.errorText }));
  page.on('response', async response => {
    const url = new URL(response.url());
    if (!url.pathname.startsWith('/api/') && !url.pathname.startsWith('/rest/v1/')) return;
    const entry = { path: url.pathname, status: response.status(), complete: false, failure: null as string | null };
    evidence.responses.push(entry);
    entry.failure = await response.finished(); entry.complete = entry.failure === null;
    transfers.delete(response.request());
  });
  await page.addInitScript(() => localStorage.setItem('tldrastro:contentAdminSecret', 'qa-secret'));
  await routeStudioInventoryApi(page, { actualDocumentRoute: true, call: async message => {
    const result = await api.call(message);
    if (message.method !== 'GET' && message.method !== 'rows') {
      evidence.writes.push({ method: message.method, body: message.body, status: result.status });
      if (delayed && message.method === 'POST' && (message.body as any)?.contentKey === key) await ack.promise;
    }
    return result;
  }, answer: async (route, url) => {
    if (['/api/admin/content-live-status', '/api/content-publications'].includes(url.pathname)) {
      const response = await api.call({ method: route.request().method(), url: url.pathname + url.search,
        body: route.request().method() === 'GET' ? undefined : route.request().postDataJSON() });
      await route.fulfill({ status: response.status, headers: response.headers, json: response.payload }); return true;
    }
    if (url.pathname === '/api/admin/sky-article-facts') {
      expect(url.searchParams.get('planet')).toBe('sun');
      expect(url.searchParams.get('date')).toBe('2026-10-09');
      await route.fulfill({ json: { ok: true, facts: {
        schema: 'tldrastro-sky-article-engine-facts-v1', articleFormat: 'ingress-essay-v3',
        calculationSource: 'explicit synthetic calculation fixture', generatedAt: '2026-10-09T12:00:00Z',
        referenceTimeZone: 'America/New_York', planet: 'sun', sign: 'libra', entryYear: 2026,
        validFrom: '2026-09-22', validTo: '2026-10-23', transitStartInstant: '2026-09-23T00:05:14Z', transitEndInstant: '2026-10-23T09:37:57Z',
        templateFields: [{ name: 'articleTitle', description: 'Calculated title.' }, { name: 'when', description: 'Calculated dates.' }, { name: 'articleBody', description: 'Complete neutral passage.' }],
        slotValues: { articleTitle: 'Synthetic calculated title', when: 'Synthetic calculated window.' }
      } } }); return true;
    }
    return false;
  } });
  await page.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin === origin) return route.fallback();
    if (request.method() === 'GET' && url.origin === 'https://fonts.googleapis.com' && url.pathname === '/css2') return route.fulfill({ status: 200, contentType: 'text/css', body: '' });
    if (request.method() === 'GET' && url.pathname === '/rest/v1/content_publications') {
      const response = await api.call({ method: 'publication-page', url: url.pathname + url.search });
      return route.fulfill({ status: response.status, json: response.payload });
    }
    evidence.blocked.push({ method: request.method(), origin: url.origin, path: url.pathname }); await route.abort('blockedbyclient');
  });
  await page.goto('/admin/content#exact-content');
  await page.locator('summary').filter({ hasText: /^Library tools$/ }).click();
  await page.getByRole('button', { name: 'New content row', exact: true }).click();
  await editor(page).getByLabel('Title / headline', { exact: true }).fill(title);
  await editor(page).getByLabel('Full passage / body', { exact: true }).fill(copy);
  await editor(page).locator('.admin-editor-details > summary').click();
  await editor(page).locator('.admin-editor-settings > summary').click();
  await editor(page).getByLabel('Mode', { exact: true }).selectOption('article');
  await editor(page).getByLabel('Lane', { exact: true }).selectOption('reference');
  await editor(page).locator('.admin-editor-key-details > summary').click();
  await editor(page).getByLabel('Content key', { exact: true }).fill(key);
  async function save(label: string, method: string) {
    const done = page.waitForResponse(response => new URL(response.url()).pathname === '/api/admin/generated-content' && response.request().method() === method);
    await editor(page).getByRole('button', { name: label, exact: true }).click();
    const response = await done; expect(response.status()).toBe(200); expect(await response.finished()).toBeNull(); expect(response.request().failure()).toBeNull();
    return (await response.json()).rows[0];
  }
  async function clean() {
    ack.release();
    try {
      await page.waitForLoadState('networkidle', { timeout: 5000 });
      await expect.poll(() => transfers.size, { message: 'Finish every started API transfer before stopping its handler' }).toBe(0);
      expect(evidence.errors).toEqual([]); expect(evidence.failed).toEqual([]); expect(evidence.blocked).toEqual([]);
      expect(evidence.responses.filter((r: any) => !r.complete || r.failure || r.status >= 400)).toEqual([]);
      await info.attach('editor-before-cleanup', { body: await page.screenshot(), contentType: 'image/png' });
      await page.close();
      expect(transfers.size).toBe(0); expect(evidence.failed).toEqual([]);
    } finally { await info.attach('actual-handler-evidence', { body: JSON.stringify(evidence, null, 2), contentType: 'application/json' }); api.close(); }
  }
  return { api, ack, evidence, save, clean };
}

test('first saved template exposes its edition builder without reopening and preserves edition work on later saves', async ({ page }, info) => {
  const f = await setup(page, info);
  try {
    const saved = await f.save('Save', 'POST'); expect(saved.content_key).toBe(key); expect(saved.status).toBe('DRAFT');
    await editor(page).getByRole('button', { name: 'Complete edition', exact: true }).click();
    await expect(builder(page)).toBeVisible();
    await expect(builder(page).getByLabel('Sky article reference date', { exact: true })).toBeFocused();
    await builder(page).getByLabel('Sky article reference date', { exact: true }).fill('2026-10-09');
    await builder(page).getByRole('button', { name: 'Load calculated facts', exact: true }).click();
    await expect(builder(page).getByLabel('Template field articleBody', { exact: true })).toBeVisible();
    await builder(page).getByLabel('Sky article edition TL;DR', { exact: true }).fill('Synthetic independent edition summary.');
    await builder(page).getByLabel('Template field articleBody', { exact: true }).fill('Synthetic independent edition passage.');
    await expect(builder(page).getByText('Draft saved automatically', { exact: true })).toBeVisible();
    const before = (await f.api.call({ method: 'rows' })).find((row: any) => row.event_type === 'sky-article-edition-workspace');
    expect(before).toBeTruthy();
    await editor(page).getByLabel('Article body', { exact: true }).fill(copy + '\n\nA neutral template revision.');
    const revision = await f.save('Save template', 'PATCH'); expect(revision.id).toBe(saved.id); expect(revision.updated_at).not.toBe(saved.updated_at);
    await expect(editor(page).locator('.admin-editor-save-state')).toHaveText('All changes saved');
    await expect(builder(page).getByLabel('Sky article reference date', { exact: true })).toHaveValue('2026-10-09');
    await expect(builder(page).getByLabel('Sky article edition TL;DR', { exact: true })).toHaveValue('Synthetic independent edition summary.');
    await expect(builder(page).getByLabel('Template field articleBody', { exact: true })).toHaveValue('Synthetic independent edition passage.');
    const after = (await f.api.call({ method: 'rows' })).find((row: any) => row.id === before.id);
    expect(after).toEqual(before);
    // The real migration retains its ledger-readiness sentinel, independently of source publications.
    expect((await f.api.call({ method: 'publications' })).filter((row: any) => row.content_key !== '__content-publication-ledger/v1')).toEqual([]);
  } finally { await f.clean(); }
});

test('late first-save acknowledgment retains newer template typing and initializes the builder', async ({ page }, info) => {
  const f = await setup(page, info, true);
  try {
    const done = page.waitForResponse(response => new URL(response.url()).pathname === '/api/admin/generated-content' && response.request().method() === 'POST');
    await editor(page).getByRole('button', { name: 'Save', exact: true }).click();
    await expect.poll(() => f.evidence.writes.length).toBe(1);
    const newer = copy + '\n\nNewer neutral typing while the response is held.';
    await editor(page).getByLabel('Article body', { exact: true }).fill(newer);
    f.ack.release(); const response = await done; expect(response.status()).toBe(200); expect(await response.finished()).toBeNull();
    const saved = (await response.json()).rows[0];
    await expect(builder(page)).toBeVisible();
    await expect(editor(page).getByLabel('Article body', { exact: true })).toHaveValue(newer);
    expect((await f.api.call({ method: 'rows' })).find((row: any) => row.id === saved.id).body).toBe(copy);
    await expect(editor(page).getByRole('button', { name: 'Save template', exact: true })).toBeEnabled();
    const revision = await f.save('Save template', 'PATCH'); expect(revision.id).toBe(saved.id); expect(revision.body).toBe(newer);
    await expect(editor(page).locator('.admin-editor-save-state')).toHaveText('All changes saved');
    expect(f.evidence.writes[1].body.expectedUpdatedAt).toBe(saved.updated_at);
    expect((await f.api.call({ method: 'publications' })).filter((row: any) => row.content_key !== '__content-publication-ledger/v1')).toEqual([]);
  } finally { await f.clean(); }
});
