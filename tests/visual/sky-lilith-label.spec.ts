import { expect, test } from '@playwright/test';
import type { IncomingMessage, ServerResponse } from 'node:http';
import skyHandler from '../../api/sky';
import { bundledPublications } from '../helpers/bundled-publications';
import { readerResponse } from '../helpers/reader-response';
import { skyPlacementSourceRecords } from '../../api/_lib/sky-placement-sources';

for (const width of [390, 1440]) for (const theme of ['light', 'dark']) for (const published of [false, true]) {
  test(`True Black Moon Lilith label ${width} ${theme} ${published ? 'published' : 'bundled'}`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width, height: 1000 });
    await page.clock.setFixedTime(new Date('2026-11-04T17:21:35Z'));
    await bundledPublications(page);
    const passage = 'Published label fixture opening.\n\nPublished label fixture final sentence.';
    if (published) {
      const key = 'sky-lilith/article/sagittarius';
      const source = { ...skyPlacementSourceRecords.get(key)!, LilithArticle: passage,
        body_you: passage, studio_version_status: 'approved-serving-revision' };
      const updatedAt = '2026-11-04T12:00:00.000Z';
      const row = { id: 'qa-lilith-label-publication', content_key: key, surface: 'sky', mode: 'in_depth',
        status: 'LIVE', lane: 'serving', review_state: null, provider: 'tldrastro-fallback-architecture-v3',
        updated_at: updatedAt, headline: 'Lilith in Sagittarius', body: passage, summary: source.summary,
        sections: { packageRecord: source }, facts: { fallbackArchitectureV3: true },
        source_snapshot: { sourcePackage: source.source_package, content_role: source.content_role },
        block_type: 'fallback_hook', event_type: 'fallback-hook' };
      const publication = { content_key: key, state: 'live', revision: 1, row_id: row.id,
        row_updated_at: updatedAt, updated_at: updatedAt };
      await page.route('**/api/content-reader', route => route.fulfill({ json: readerResponse([row], [publication]) }));
      await page.route('**/rest/v1/**', route => route.fulfill({ json: new URL(route.request().url()).pathname.endsWith('/content_runtime_revision')
        ? updatedAt : [publication] }));
    }
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(theme => {
      localStorage.setItem('tldrastro:theme', theme);
      localStorage.setItem('tldrastro:pageAnimations', 'off');
      localStorage.setItem('tldrastro:selectedLocation', JSON.stringify({
        label: 'New York', latitude: 40.7, longitude: -74, timeZone: 'America/New_York'
      }));
    }, theme);
    await page.route('**/api/sky?**', async route => {
      const response = {
        statusCode: 200,
        setHeader() {},
        end(body: string) {
          void route.fulfill({ status: this.statusCode, contentType: 'application/json', body });
        }
      };
      await skyHandler({ method: 'GET', url: route.request().url() } as IncomingMessage,
        response as unknown as ServerResponse);
    });

    await page.goto('/?date=2026-11-04#sky');
    const card = page.getByRole('button', {
      name: 'Read more about True Black Moon Lilith in Sagittarius', exact: true
    });
    const title = card.locator('.planet-placement-row__title');
    await expect(title).toHaveText('True Black Moon Lilith in Sagittarius', { timeout: 60_000 });
    await expect(card.locator('.placement-progress > span')).toHaveText('3 days left');
    await expect(card.locator('.planet-placement-row__status')).toHaveCount(0);
    await expect(card.locator('h1,h2,h3,h4,h5,h6')).toHaveCount(0);

    const typography = (element: Element) => {
      const style = getComputedStyle(element);
      return [style.fontFamily, style.fontSize, style.fontWeight, style.lineHeight,
        style.letterSpacing, style.margin, style.textTransform, style.textAlign];
    };
    const sunTitle = page.getByRole('button', { name: 'Read more about Sun in Scorpio', exact: true })
      .locator('.planet-placement-row__title');
    expect(await title.evaluate(typography)).toEqual(await sunTitle.evaluate(typography));
    expect(await card.locator('.planet-placement-row__topline').evaluate(element =>
      element.scrollWidth <= element.clientWidth)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await card.screenshot({ path: `test-results/true-black-moon-lilith-${width}-${theme}.png` });

    await card.click();
    await expect(page.locator('#sky-detail-title')).toHaveText('True Black Moon Lilith in Sagittarius');
    const publishedParagraphs = page.locator('.article-body-inner p').filter({ hasText: /^Published label fixture / });
    if (published) await expect(publishedParagraphs).toHaveText(passage.split('\n\n'));
    await page.reload();
    await expect(page.locator('#sky-detail-title')).toHaveText('True Black Moon Lilith in Sagittarius');
    if (published) await expect(publishedParagraphs).toHaveText(passage.split('\n\n'));
    await page.getByRole('button', { name: 'Close detail', exact: true }).click();
    await expect(title).toHaveText('True Black Moon Lilith in Sagittarius');
    await page.reload();
    await expect(title).toHaveText('True Black Moon Lilith in Sagittarius', { timeout: 60_000 });
    expect(errors).toEqual([]);
  });
}
