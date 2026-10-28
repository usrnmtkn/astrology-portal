import { expect, test } from '../helpers/polish-test';
import skyHandler from '../../api/sky';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { expectReadableTheme } from '../helpers/theme-contrast';
import { bundledPublications } from '../helpers/bundled-publications';

// Exact CSS values from Screens - Sky v2, Sky Web Mobile, Screens - Articles
// and Articles Web Mobile in the owner's ZIP. Geometry assertions catch the
// retrograde-specific width:auto override that previously hid Mercury/Venus.
for (const width of [390, 1440]) for (const theme of ['light', 'dark']) {
  test(`handoff typography and unobscured retrograde glyphs ${width} ${theme}`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width, height: 1100 });
    await page.clock.setFixedTime(new Date('2026-10-24T16:00:00Z'));
    await page.addInitScript(theme => {
      localStorage.setItem('tldrastro:theme', theme);
      localStorage.setItem('tldrastro:pageAnimations', 'off');
      localStorage.setItem('tldrastro:selectedLocation', JSON.stringify({ label: 'New York', latitude: 40.7, longitude: -74, timeZone: 'America/New_York' }));
    }, theme);
    await bundledPublications(page);
    await page.route('**/api/calendar?**', route => route.fulfill({ json: { ok: true, calendar: { days: [] } } }));
    await page.route('**/api/sky?**', async route => {
      const response = { statusCode: 200, setHeader() {}, end(body: string) {
        void route.fulfill({ status: this.statusCode, contentType: 'application/json', body });
      } };
      await skyHandler({ method: 'GET', url: route.request().url() } as IncomingMessage, response as unknown as ServerResponse);
    });
    await page.goto('/?date=2026-10-24#sky');
    await expect(page.getByLabel('Daily sky summary')).toBeVisible({ timeout: 60_000 });
    const compact = width < 800;
    await expect(page.getByRole('heading', { name: 'Sky', exact: true, level: 1 })).toHaveCSS('font-size', '36px');
    await expect(page.getByLabel('Daily sky summary').locator('p').first()).toHaveCSS('font-size', '19px');
    const cards = page.locator('.sky-placement-group .planet-placement-row');
    await expect(cards).toHaveCount(14);
    await expect(cards.filter({ hasText: 'Mercury Rx in Scorpio' })).toHaveClass(/is-retrograde/);
    await expect(cards.filter({ hasText: 'Venus Rx in Scorpio' })).toHaveClass(/is-retrograde/);
    const planetFilter = await cards.first().locator('.placement-glyph-svg').evaluate(node => getComputedStyle(node).filter);
    for (const card of await cards.all()) {
      await card.scrollIntoViewIfNeeded();
      const glyph = card.locator('.planet-placement-row__glyph');
      await expect(glyph).toHaveCSS('width', compact ? '52px' : '48px');
      await expect(glyph).toHaveCSS('height', compact ? '52px' : '48px');
      await expect(glyph).not.toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
      await expect(glyph.locator('.placement-glyph-svg')).toHaveCSS('filter', planetFilter);
      const visible = await glyph.evaluate(node => {
        const image = node.querySelector<HTMLImageElement>('.placement-glyph-svg')!;
        const box = image.getBoundingClientRect();
        const atCenter = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
        const tile = node.getBoundingClientRect();
        return { loaded: image.complete && image.naturalWidth > 0, width: box.width, height: box.height,
          centered: Math.abs(box.x + box.width / 2 - tile.x - tile.width / 2) < 1 && Math.abs(box.y + box.height / 2 - tile.y - tile.height / 2) < 1,
          unobscured: atCenter === image };
      });
      expect(visible).toEqual({ loaded: true, width: compact ? 24 : 22, height: compact ? 24 : 22, centered: true, unobscured: true });
      await expect(card.locator('.planet-placement-row__title')).toHaveCSS('font-size', compact ? '17px' : '26px');
      await expect(card.locator('.planet-placement-row__title')).toHaveCSS('font-weight', compact ? '600' : '400');
      await expect(card.locator('.planet-placement-row__title')).toHaveCSS('line-height', compact ? '21.25px' : '29.9px');
      await expect(card.locator('.planet-placement-row__title')).toHaveCSS('font-family', compact ? /system-ui/ : /Newsreader/);
      await expect(card.locator('.planet-placement-row__description')).toHaveCSS('font-size', '19px');
      await expect(card.locator('.planet-placement-row__description')).toHaveCSS('line-height', '28.5px');
      if (compact) await expect(glyph.locator('.placement-glyph-pair__sign')).toHaveCSS('width', '24px');
      else await expect(glyph.locator('.placement-glyph-pair__sign')).toBeHidden();
    }
    expect(await page.evaluate(() => Array.from(document.fonts).some(face => face.family.includes('Newsreader') && face.status === 'loaded'))).toBe(true);
    await page.locator('.sky-placement-group').first().screenshot({ path: `test-results/refined-sky-cards-${width}-${theme}.png` });
    await cards.filter({ hasText: 'Saturn Rx in Aries' }).click();
    const article = page.locator('.article-page');
    await expect(article.locator('h1')).toContainText('Saturn');
    await expectReadableTheme(page, '.sky-placement-article h1, .sky-placement-article .article-section p, .sky-placement-article__retrograde, .sky-placement-key-dates h2, .retrograde-cycles__title');
    await expect(article.locator('h1')).toHaveCSS('font-size', '36px');
    await expect(article.locator('.article-section p').first()).toHaveCSS('font-size', '19px');
    await expect(article.locator('.sky-placement-article__glyph')).toHaveCSS('width', '64px');
    await expect(article.locator('.article-title')).toHaveCSS('font-weight', '400');
    const dates = article.locator('.sky-placement-key-dates');
    await expect(dates.locator('h2')).toHaveCSS('font-size', '26px');
    await expect(dates.locator('h2')).toHaveCSS('font-weight', '400');
    await expect(dates.locator('summary')).toHaveCSS('letter-spacing', '-0.26px');
    await expect(dates.locator('summary')).toHaveCSS('text-align', 'start');
    await expect(dates.locator('.sky-placement-article__chevron')).toHaveCSS('width', '44px');
    await expect(dates.locator('.sky-placement-key-dates__title strong').first()).toHaveCSS('font-size', compact ? '16px' : '18px');
    await expect(article.locator('.sky-detail-card .sky-placement-key-dates')).toHaveCount(0);
    await expect(dates.locator('.sky-placement-key-dates__next')).toHaveCount(1);
    await expect(dates).not.toHaveAttribute('open');
    await dates.locator('summary').press('Enter');
    await expect(dates).toHaveAttribute('open');
    await dates.locator('summary').press('Enter');
    await expect(dates).not.toHaveAttribute('open');
    await dates.locator('summary').press('Enter');
    const facts = article.locator('.retrograde-cycles');
    await expect(facts).toBeVisible({ timeout: 60_000 });
    await expect(facts.locator('.retrograde-cycles__section')).toHaveCount(2);
    await expect(facts.locator('.retrograde-cycles__section[open]')).toHaveCount(0);
    await expect(facts.locator('.retrograde-cycles__card').first()).toBeHidden();
    for (const summary of await facts.locator('.retrograde-cycles__section > summary').all()) await summary.press('Enter');
    await expect(facts.locator('.retrograde-cycles__section > summary')).toHaveText(['Previous retrograde', 'Next retrograde']);
    await expect(facts.locator('.retrograde-cycles__section > summary').first()).toHaveCSS('font-size', '26px');
    await expect(facts.locator('.retrograde-cycles__date').first()).toHaveCSS('font-family', /system-ui/);
    await expect(facts.locator('.retrograde-cycles__date').first()).toHaveCSS('font-size', compact ? '17px' : '18px');
    await expect(facts.locator('.retrograde-cycles__meta').first()).toHaveCSS('font-size', '14px');
    await expectReadableTheme(page, '.sky-placement-key-dates__title strong, .sky-placement-key-dates__next, .retrograde-cycles__date, .retrograde-cycles__meta, .retrograde-cycles__jump, .retrograde-cycles__compare-title');
    await expect(article.locator('.retrograde-history-facts')).toHaveCount(0);
    await facts.locator('.retrograde-cycles__date').first().scrollIntoViewIfNeeded();
    await page.screenshot({ path: `test-results/refined-retrograde-facts-${width}-${theme}.png` });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const levels = await article.locator('h1,h2,h3,h4,h5,h6').evaluateAll(nodes => nodes.filter(n => n.getBoundingClientRect().height > 0).map(n => Number(n.tagName.slice(1))));
    expect(levels[0]).toBe(1);
    for (let i = 1; i < levels.length; i++) expect(levels[i]).toBeLessThanOrEqual(levels[i - 1] + 1);
    await page.reload();
    await expect(article.locator('h1')).toContainText('Saturn');
    await expect(article.locator('h1')).toHaveCSS('font-size', '36px');
    await expect(dates).not.toHaveAttribute('open');
    await expect(facts.locator('.retrograde-cycles__section')).toHaveCount(2);
    await expect(facts.locator('.retrograde-cycles__section[open]')).toHaveCount(0);
    const previous = article.getByRole('navigation', { name: 'Planetary placements' }).getByRole('link', { name: /Previous Jupiter in Leo/ });
    await previous.click();
    await expect(article.locator('h1')).toHaveText('Jupiter in Leo');
    await expect(article.locator('.retrograde-cycles')).toHaveCount(0);
    await expect(article.locator('.sky-placement-key-dates')).toBeVisible();
    await expect(article.locator('.sky-placement-key-dates')).not.toHaveAttribute('open');
    await expect(article.locator('h1')).toHaveCSS('font-size', '36px');
    await article.locator('h1').scrollIntoViewIfNeeded();
    await page.screenshot({ path: `test-results/placement-direct-${width}-${theme}.png` });
  });
}
