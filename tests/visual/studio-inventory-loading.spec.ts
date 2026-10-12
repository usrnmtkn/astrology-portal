import { expect, test } from '@playwright/test';

test('Studio starts independent aspect prefixes together and waits for all of them', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('tldrastro:contentAdminSecret', 'inventory-loading-fixture'));
  const started: string[] = [];
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url());
    if (url.pathname === '/api/admin/generated-content-inventory' && url.searchParams.get('view') === 'inventory') {
      const prefix = url.searchParams.get('contentKeyPrefix')!;
      started.push(prefix);
      if (prefix === 'sky-card/') await gate;
      await route.fulfill({ json: { ok: true, rows: [], nextCursor: null } });
    } else await route.fulfill({ json: { ok: true, rows: [], statuses: [], nextCursor: null } });
  });
  try {
    await page.goto('/admin/content#exact-content?category=Calendar+Aspects');
    await expect.poll(() => started.length).toBe(3);
    expect(new Set(started)).toEqual(new Set(['sky-card/', 'fallback-hook/sky-aspect-sign/', 'sky.aspect.']));
    await expect(page.getByRole('region', { name: 'Admin status' })).not.toContainText('Connected');
    release();
    await expect(page.getByRole('region', { name: 'Admin status' })).toContainText('Connected');
    expect(started).toHaveLength(3);
  } finally { release(); }
});

test('Studio progressively displays and completes a 16,000-row catalog across three independent ranges', async ({ page }) => {
  test.setTimeout(60_000);
  await page.addInitScript(() => localStorage.setItem('tldrastro:contentAdminSecret', 'inventory-loading-fixture'));
  const rows = Array.from({length: 16000}, (_, index) => ({id: `${["1", "7", "d"][index % 3]}0000000-0000-4000-8000-${String(index).padStart(12, "0")}`, content_key: `qa/source/${index}`,
    headline: `Synthetic source ${index}`, status: 'DRAFT', lane: 'reference', surface: 'sky', mode: 'card',
    block_type: 'sky_aspect', provider: 'fixture', updated_at: '2026-10-01T00:00:00Z',
    inventory_only: true, body: null, summary: null, sections: null, source_snapshot: null}));
  const limits: number[] = [];
  const partitions = new Set<string>();
  let releaseContinuation!: () => void;
  const continuation = new Promise<void>(resolve => {releaseContinuation = resolve;});
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url());
    if (url.pathname === '/api/admin/generated-content-inventory' && url.searchParams.get('view') === 'inventory') {
      const cursor = Number(url.searchParams.get('cursor') || 0), limit = Number(url.searchParams.get('limit'));
      const partition = url.searchParams.get("partition")!;
      partitions.add(partition);
      const rangeRows = rows.filter((_row, index) => index % 3 === Number(partition));
      limits.push(limit);
      if (cursor) await continuation;
      await route.fulfill({json: {ok: true, rows: rangeRows.slice(cursor, cursor + limit),
        nextCursor: cursor + limit < rangeRows.length ? String(cursor + limit) : null}});
      return;
    }
    await route.fulfill({json: {ok: true, rows: [], statuses: [], nextCursor: null}});
  });
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  const started = Date.now();
  try {
    await page.goto('/admin/content#review-queue');
    await expect.poll(() => partitions.size).toBe(3);
    await expect(page.getByRole('region', {name: 'Admin status'})).toContainText(/(?:80|160|240) rows/);
    await expect(page.getByRole('region', {name: 'Admin status'})).not.toContainText('Connected');
    expect(limits[0]).toBe(80);
    await expect(page.getByRole('heading', {name: 'Review Queue', exact: true})).toBeVisible();
  } finally {releaseContinuation();}
  await expect(page.getByRole('region', {name: 'Admin status'})).toContainText('Connected', {timeout: 30_000});
  await expect(page.getByRole('region', {name: 'Admin status'})).toContainText('16,000 rows');
  expect(limits).toHaveLength(45);
  expect(limits.filter(limit => limit === 80)).toHaveLength(3);
  expect(limits.filter(limit => limit === 400)).toHaveLength(42);
  expect(errors).toEqual([]);
  console.log(JSON.stringify({rows: rows.length, requests: limits.length, elapsedMs: Date.now() - started, environment: 'isolated browser API fixture'}));
});
