import { test, expect } from '@playwright/test';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { buildMemoryIndex, memoryDetail } from '../../api/_lib/agent-memory.mjs';

const standardPath = 'docs/writing/SKY_CALENDAR_ASPECT_STANDARD.md';
const sourceHash = createHash('sha256').update(fs.readFileSync(standardPath)).digest('hex');
const index = buildMemoryIndex({ root: process.cwd() });
const sections = index.records.filter(record => record.path === standardPath)
  .map(record => memoryDetail(index, record.id));
const unavailable = { ok: false, authFailure: 'content_admin_verification_unavailable',
  error: 'Content Studio access verification is temporarily unavailable. Please retry.' };

for (const width of [1167, 390]) for (const theme of ['light', 'dark'] as const) {
  test(`Memory access recovers and preserves all standard sections ${width} ${theme}`, async ({ page }) => {
    test.setTimeout(60_000);
    await page.setViewportSize({ width, height: 844 });
    await page.emulateMedia({ colorScheme: theme });
    await page.addInitScript(() => localStorage.setItem('tldrastro:contentAdminSecret', 'memory-browser-fixture'));
    const faults = new Set(['visual', 'search', 'detail']);
    const injected: string[] = [];
    await page.route('**/api/admin/memory-graph?**', async route => {
      expect(route.request().method()).toBe('GET');
      const url = new URL(route.request().url());
      const phase = url.searchParams.get('mode') === 'visual' ? 'visual'
        : url.searchParams.get('mode') === 'detail' ? 'detail' : 'search';
      if (faults.delete(phase)) {
        injected.push(phase);
        await route.fulfill({ status: 503, json: unavailable });
      } else await route.continue(); // Success must come from the actual protected handler.
    });
    await page.goto('/admin/content/memory');
    await expect(page.getByRole('button', { name: 'Fit', exact: true })).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Emergency admin secret' })).toHaveCount(0);
    expect(sections).toHaveLength(20);
    await page.getByRole('textbox', { name: 'Search memories' }).fill(standardPath);
    const matches = page.getByRole('complementary', { name: 'Matching memories', exact: true });
    const detail = page.getByRole('complementary', { name: 'Memory detail', exact: true });
    for (const section of sections) {
      const response = page.waitForResponse(response => {
        const url = new URL(response.url());
        return url.pathname === '/api/admin/memory-graph' && url.searchParams.get('id') === section.id && response.status() === 200;
      });
      await matches.getByRole('button', { name: section.title, exact: true }).click();
      const served = (await (await response).json()).record;
      expect(served.body).toBe(section.body);
      expect(served.bodySha256).toBe(section.bodySha256);
      expect(served.sourceSha256).toBe(sourceHash);
      await expect(detail.locator(':scope > .memory-detail-content')).toHaveText(section.body, { useInnerText: false });
      await detail.locator('.memory-provenance > summary').click();
      await expect(detail.locator('.memory-provenance > code')).toHaveText(section.bodySha256);
      await page.keyboard.press('Escape');
      await expect(detail).toHaveCount(0);
    }
    expect(injected).toEqual(['visual', 'search', 'detail']);
    await page.reload();
    await expect(page.getByRole('button', { name: 'Fit', exact: true })).toBeVisible();
    await page.getByRole('textbox', { name: 'Search memories' }).fill('Final Editorial Principle');
    await matches.getByRole('button', { name: 'Final Editorial Principle', exact: true }).click();
    await expect(detail.locator(':scope > .memory-detail-content')).toHaveText(sections.at(-1).body, { useInnerText: false });
    expect((await page.request.get('/api/admin/memory-graph?mode=detail&id=' + sections[0].id)).status()).toBe(401);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

test('persistent verification failure is bounded and Try again preserves the credential', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('tldrastro:contentAdminSecret', 'memory-browser-fixture'));
  let unavailableNow = true, requests = 0;
  await page.route('**/api/admin/memory-graph?mode=visual', async route => {
    requests++;
    if (unavailableNow) await route.fulfill({ status: 503, json: unavailable });
    else await route.continue();
  });
  await page.goto('/admin/content/memory');
  await expect(page.getByRole('button', { name: 'Try again', exact: true })).toBeVisible();
  expect(requests).toBe(2);
  expect(await page.evaluate(() => localStorage.getItem('tldrastro:contentAdminSecret'))).toBe('memory-browser-fixture');
  await expect(page.getByRole('textbox', { name: 'Emergency admin secret' })).toHaveCount(0);
  unavailableNow = false;
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Fit', exact: true })).toBeVisible();
  expect(requests).toBe(3);
});
