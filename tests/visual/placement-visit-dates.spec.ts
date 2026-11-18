import { expect, test } from '@playwright/test';
import { bundledPublications } from '../helpers/bundled-publications';

test.use({ timezoneId: 'Pacific/Honolulu' });
for (const theme of ['light', 'dark']) for (const width of [390, 1440]) {
  test(`Venus visit and residency metadata ${theme} ${width}`, async ({ page }) => {
    test.setTimeout(150_000);
    await page.setViewportSize({ width, height: 1000 });
    await page.clock.setFixedTime(new Date('2026-09-14T12:00:00Z'));
    await page.addInitScript(theme => {
      localStorage.setItem('tldrastro:theme', theme);
      localStorage.setItem('tldrastro:selectedLocation', JSON.stringify({ label: 'Test location', latitude: 40.7, longitude: -74, timeZone: 'America/New_York' }));
    }, theme);
    await bundledPublications(page);
    await page.route('**/api/calendar?**', route => route.fulfill({ json: { ok: true, calendar: { days: [] } } }));
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/?date=2026-09-14#sky');
    const card = page.getByRole('button', { name: 'Read more about Venus in Scorpio', exact: true });
    await expect(card.locator('.planet-placement-row__timing > span:first-child')).toHaveText('Sep 10 - Oct 25', { timeout: 60_000 });
    await card.click();
    const dates = page.locator('.sky-detail-id .article-duration');
    await expect(dates).toHaveText(['September 10 to October 25, 2026', 'Full residency in Scorpio: September 10, 2026 to January 7, 2027'], { timeout: 60_000 });
    const typography = await dates.evaluateAll(elements => elements.map(element => {
      const s = getComputedStyle(element);
      return { font: s.fontFamily, size: s.fontSize, weight: s.fontWeight, lineHeight: s.lineHeight, spacing: s.letterSpacing, margin: s.margin, casing: s.textTransform, alignment: s.textAlign };
    }));
    expect(typography[0].font).toMatch(width < 800 ? /system-ui/ : /Newsreader/);
    expect(typography[0].size).toBe(width < 800 ? '14px' : '18px');
    expect(typography[1].font).toMatch(/system-ui/);
    expect(typography[1].size).toBe('14px');
    for(const style of typography)expect(style.weight).toBe('400');
    await expect(page.locator('.sky-detail-article h1')).toHaveText(['Venus in Scorpio']);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    // Assert the complete source body remains identical through hydration/reopen.
    const prose = page.locator('.article-body-inner').first().locator(':scope > .sky-detail-section > p');
    const body = await prose.allTextContents();
    expect(body.join('\n\n')).toContain('When Venus reaches Scorpio, intimacy and connection stop being separable from power dynamics.');
    expect(body.join('\n\n')).toContain('Trust gets stronger when the terms can be named without turning vulnerability into leverage.');
    await page.locator('.sky-detail-id').screenshot({ path: `test-results/venus-visit-${theme}-${width}.png` });
    await page.reload();
    await expect(dates).toHaveText(['September 10 to October 25, 2026', 'Full residency in Scorpio: September 10, 2026 to January 7, 2027'], { timeout: 60_000 });
    await expect(prose).toHaveText(body);
    await page.getByRole('button', { name: 'Close detail', exact: true }).click();
    await expect(card.locator('.planet-placement-row__timing > span:first-child')).toHaveText('Sep 10 - Oct 25');
    await page.goto('/?date=2026-12-10#sky/placement/venus/scorpio');
    await expect(dates).toHaveText(['December 4, 2026 to January 7, 2027', 'Full residency in Scorpio: September 10, 2026 to January 7, 2027'], { timeout: 60_000 });
    expect(errors).toEqual([]);
  });
}

for (const theme of ['light', 'dark']) for (const width of [390, 1440]) {
  test(`True Black Moon Lilith visit and full residency ${theme} ${width}`, async ({ page }, info) => {
    test.setTimeout(150_000);
    const corpus = JSON.parse((await import('node:fs')).readFileSync(new URL('../../apps/web/src/content/fallbackArchitectureV3/authored-inputs/sky-v4-canonical-content-studio-stage-v1.json', import.meta.url), 'utf8'));
    const approvedArticle = corpus.content.lilith.find((row: {Sign:string}) => row.Sign === 'Sagittarius').LilithArticle as string;
    const approvedParagraphs = approvedArticle.split('\n\n');
    await page.setViewportSize({ width, height: 1000 });
    await page.clock.setFixedTime(new Date('2026-11-04T17:21:35Z'));
    await page.addInitScript(theme => {
      localStorage.setItem('tldrastro:theme', theme);
      localStorage.setItem('tldrastro:pageAnimations', 'off');
      localStorage.setItem('tldrastro:selectedLocation', JSON.stringify({ label: 'New York', latitude: 40.7, longitude: -74, timeZone: 'America/New_York' }));
    }, theme);
    await bundledPublications(page);
    await page.route('**/api/calendar?**', route => route.fulfill({ json: { ok: true, calendar: { days: [] } } }));
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/?date=2026-11-04#sky');
    const card = page.getByRole('button', { name: 'Read more about True Black Moon Lilith in Sagittarius', exact: true });
    await expect(card.locator('.planet-placement-row__timing > span:first-child')).toHaveText('Oct 20 - Nov 7', { timeout: 60_000 });
    await card.click();
    const title = page.locator('#sky-detail-title');
    const dates = page.locator('.sky-detail-id .article-duration');
    const expectedDates = ['October 20 to November 7, 2026', 'Full residency in Sagittarius: October 25, 2025 to January 3, 2027'];
    await expect(title).toHaveText('True Black Moon Lilith in Sagittarius');
    await expect(dates).toHaveText(expectedDates, { timeout: 60_000 });
    const typography = await dates.evaluateAll(elements => elements.map(element => {
      const style = getComputedStyle(element);
      return { font: style.fontFamily, size: style.fontSize, weight: style.fontWeight, lineHeight: style.lineHeight, spacing: style.letterSpacing };
    }));
    expect(typography[0].font).toMatch(width < 800 ? /system-ui/ : /Newsreader/);
    expect(typography[0].size).toBe(width < 800 ? '14px' : '18px');
    expect(typography[1].font).toMatch(/system-ui/);
    expect(typography[1].size).toBe('14px');
    for (const style of typography) expect(style.weight).toBe('400');
    expect(await dates.evaluateAll(elements => elements.every(element => element.scrollWidth <= element.clientWidth))).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const prose = page.locator('.article-body-inner').first().locator(':scope > .sky-detail-section > p');
    await expect(prose.filter({hasText:approvedParagraphs[0]})).toHaveText([approvedParagraphs[0]]);
    const body = await prose.allTextContents();
    expect(approvedParagraphs[0]).toContain('While Black Moon Lilith moves through Sagittarius, certainty gets tested against evidence.');
    const articleStart = body.findIndex(paragraph => paragraph === approvedParagraphs[0]);
    expect(articleStart).toBeGreaterThanOrEqual(0);
    expect(body.slice(articleStart, articleStart + approvedParagraphs.length).join('\n\n')).toBe(approvedArticle);
    expect(body.join('\n\n')).toContain('Lilith in Sagittarius exposes what happens when being challenged starts feeling more threatening than being inaccurate.');
    await page.locator('.sky-detail-id').screenshot({ path: info.outputPath('lilith-current-visit-full-residency.png') });
    await page.locator('.sky-placement-article__previous').click();
    await expect(title).toHaveText('South Node in Leo');
    await page.locator('.sky-placement-article__next').click();
    await expect(title).toHaveText('True Black Moon Lilith in Sagittarius');
    await expect(dates).toHaveText(expectedDates);
    await expect(prose).toHaveText(body);
    await page.reload();
    await expect(title).toHaveText('True Black Moon Lilith in Sagittarius');
    await expect(dates).toHaveText(expectedDates, { timeout: 60_000 });
    await expect(prose).toHaveText(body);
    await page.goto('/?date=2026-11-04#sky');
    await expect(card.locator('.planet-placement-row__timing > span:first-child')).toHaveText('Oct 20 - Nov 7', { timeout: 60_000 });
    expect(errors).toEqual([]);
  });
}
