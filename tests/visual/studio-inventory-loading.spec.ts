import { expect, test } from '@playwright/test';

test('Studio progressively displays and completes a 16,000-row catalog in 41 requests', async ({ page }) => {
  test.setTimeout(60_000);
  await page.addInitScript(() => localStorage.setItem('tldrastro:contentAdminSecret', 'inventory-loading-fixture'));
  const rows = Array.from({length: 16000}, (_, index) => ({id: `qa-${index}`, content_key: `qa/source/${index}`,
    headline: `Synthetic source ${index}`, status: 'DRAFT', lane: 'reference', surface: 'sky', mode: 'card',
    block_type: 'sky_aspect', provider: 'fixture', updated_at: '2026-10-01T00:00:00Z',
    inventory_only: true, body: null, summary: null, sections: null, source_snapshot: null}));
  const limits: number[] = [];
  let releaseContinuation!: () => void;
  const continuation = new Promise<void>(resolve => {releaseContinuation = resolve;});
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url());
    if (url.pathname === '/api/admin/generated-content-inventory' && url.searchParams.get('view') === 'inventory') {
      const cursor = Number(url.searchParams.get('cursor') || 0), limit = Number(url.searchParams.get('limit'));
      limits.push(limit);
      if (cursor) await continuation;
      await route.fulfill({json: {ok: true, rows: rows.slice(cursor, cursor + limit),
        nextCursor: cursor + limit < rows.length ? String(cursor + limit) : null}});
      return;
    }
    await route.fulfill({json: {ok: true, rows: [], statuses: [], nextCursor: null}});
  });
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  const started = Date.now();
  try {
    await page.goto('/admin/content#review-queue');
    await expect(page.getByRole('region', {name: 'Admin status'})).toContainText('80 rows');
    expect(limits[0]).toBe(80);
    await expect(page.getByRole('heading', {name: 'Review Queue', exact: true})).toBeVisible();
  } finally {releaseContinuation();}
  await expect(page.getByRole('region', {name: 'Admin status'})).toContainText('Connected', {timeout: 30_000});
  await expect(page.getByRole('region', {name: 'Admin status'})).toContainText('16,000 rows');
  expect(limits).toHaveLength(41);
  expect(limits.slice(1).every(limit => limit === 400)).toBe(true);
  expect(errors).toEqual([]);
  console.log(JSON.stringify({rows: rows.length, requests: limits.length, elapsedMs: Date.now() - started, environment: 'isolated browser API fixture'}));
});
