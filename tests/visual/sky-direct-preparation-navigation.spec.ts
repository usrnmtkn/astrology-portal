import { expect, test } from '@playwright/test';
import { bundledPublications } from '../helpers/bundled-publications';
import { readerResponse } from '../helpers/reader-response';
import skyHandler from '../../api/sky';
import type { IncomingMessage, ServerResponse } from 'node:http';

test('Leaving a prepared direct article before full Sky resolves cannot reopen it', async ({ page }) => {
  test.setTimeout(90_000);
  await page.clock.setFixedTime(new Date('2026-09-10T04:20:00Z'));
  await bundledPublications(page);
  await page.addInitScript(() => {
    localStorage.setItem('tldrastro:selectedLocation', JSON.stringify({ label: 'Synthetic New York', latitude: 40.7, longitude: -74, timeZone: 'America/New_York' }));
    (window as any).__abandonedArticlePaints = [];
    new MutationObserver(() => {
      const body = document.querySelector('.sky-detail-article .article-body-inner')?.textContent;
      if (body?.trim()) (window as any).__abandonedArticlePaints.push(body);
    }).observe(document, { subtree: true, childList: true, characterData: true });
  });
  let releaseSky!: () => void;
  const skyGate = new Promise<void>(resolve => { releaseSky = resolve; });
  let releaseWriting!: () => void;
  const writingGate = new Promise<void>(resolve => { releaseWriting = resolve; });
  await page.route('**/api/content-reader', async route => {
    if (route.request().postDataJSON()?.keys?.some((key: string) => key.startsWith('sky.aspect.sun.'))) await writingGate;
    await route.fulfill({ json: readerResponse([]) });
  });
  let selectedWritingStarted = false;
  page.on('request', request => {
    if (new URL(request.url()).pathname === '/api/content-reader'
      && request.postDataJSON()?.keys?.some((key: string) => key.startsWith('sky.aspect.sun.'))) selectedWritingStarted = true;
  });
  await page.route('**/api/sky?**', async route => {
    await skyGate;
    const response = { statusCode: 200, setHeader() {}, end(body: string) {
      void route.fulfill({ status: this.statusCode, contentType: 'application/json', body });
    } };
    await skyHandler({ method: 'GET', url: route.request().url() } as IncomingMessage, response as unknown as ServerResponse);
  });
  await page.route('**/api/calendar?**', route => route.fulfill({ json: { ok: true, calendar: { days: [] } } }));
  try {
    await page.goto('/#sky/placement/sun/virgo', { waitUntil: 'domcontentloaded' });
    await expect.poll(() => selectedWritingStarted, { timeout: 60_000 }).toBe(true);
    await page.getByRole('button', { name: 'Sky', exact: true }).click();
    await expect(page).toHaveURL(/#sky$/);
  } finally { releaseWriting(); releaseSky(); }
  await expect(page.getByRole('button', { name: 'Read more about Sun in Virgo', exact: true })).toBeVisible({ timeout: 60_000 });
  await expect(page.locator('.planet-placement-row--sky')).toHaveCount(14);
  await expect(page.locator('.sky-detail-article')).toHaveCount(0);
  expect(await page.evaluate(() => (window as any).__abandonedArticlePaints)).toEqual([]);
});
