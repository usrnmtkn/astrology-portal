import { expect, test } from '../helpers/polish-test';
import { expectReadableTheme } from '../helpers/theme-contrast';
import { authenticate, seed } from '../helpers/synthetic-member-sources';

for (const width of [390, 1440]) for (const theme of ['light', 'dark']) {
  test(`Friends transit detail preserves dates and navigation ${width} ${theme}`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width, height: 1000 });
    await seed(page, theme);
    await authenticate(page);
    await page.goto('/?date=2026-10-13#friends?tab=charts&chart=fixture-friend&view=transits');
    const transits = page.getByLabel('Fixture Friend transits', { exact: true });
    const datedTransits = transits.locator('button.friend-transit-row').filter({
      has: page.locator('.updates-aspect-row__meta-line')
    });
    const card = datedTransits.first();
    await expect(card).toBeVisible({ timeout: 60_000 });
    const title = (await card.locator('h3').innerText()).trim();
    const cardDate = (await card.locator('.updates-aspect-row__meta-line').innerText()).trim();
    expect(cardDate).not.toBe('');
    await card.click();
    const article = page.locator('.article-page');
    await expect(article.getByRole('heading', { level: 1 })).toHaveText(title);
    const timeline = article.locator('.article-key-dates');
    await expect(timeline).toHaveAttribute('open', '');
    expect(await timeline.evaluate(node => node.parentElement?.classList.contains('article-shell'))).toBe(true);
    await expect(timeline.locator('.article-key-dates__label').first()).toContainText('Current contact');
    await expect(timeline.locator('.article-key-dates__label').last()).toHaveText('Full transit series');
    const timelineText = await timeline.innerText();
    const date = article.locator('.article-duration').first();
    const duration = article.locator('.article-pills .house-transit-term-tag');
    await expect(date).toBeVisible();
    await expect(duration).toBeVisible();
    const dateText = (await date.innerText()).trim();
    const durationText = (await duration.innerText()).trim();
    expect(dateText).not.toBe('');
    expect(durationText).not.toBe('');
    const paragraphs = await article.locator('.article-section p').allTextContents();
    expect(paragraphs.length).toBeGreaterThan(0);
    expect(paragraphs[0].trim()).not.toBe('');
    expect(paragraphs.at(-1)!.trim()).not.toBe('');
    for (const paragraph of await article.locator('.article-section:not(.article-transit-description) p').all()) {
      await expect(paragraph).toHaveCSS('font-family', /Newsreader/);
      await expect(paragraph).toHaveCSS('font-size', '19px');
      await expect(paragraph).toHaveCSS('line-height', '28.5px');
    }
    const facts = article.locator('.article-transit-description p');
    await expect(facts).toHaveCSS('font-family', /system-ui/);
    await expect(facts).toHaveCSS('font-size', '14px');
    await expect(facts).toHaveCSS('line-height', '18.9px');
    await expectReadableTheme(page, '.article-title, .article-duration, .article-pills span, .article-section p');
    await article.screenshot({ path: test.info().outputPath('friends-transit-detail.png') });
    await page.reload();
    await expect(article.getByRole('heading', { level: 1 })).toHaveText(title);
    await expect(timeline).toHaveAttribute('open', '');
    await expect(timeline).toHaveText(timelineText, { useInnerText: true });
    await expect(date).toHaveText(dateText);
    await expect(duration).toHaveText(durationText);
    await expect(article.locator('.article-section p')).toHaveText(paragraphs);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole('button', { name: /Close detail|Back/ }).first().click();
    await expect(transits).toBeVisible();
    await expect(datedTransits.filter({ hasText: title }).first()).toBeVisible();
    await expect(datedTransits.filter({ hasText: title }).first().locator('.updates-aspect-row__meta-line')).toHaveText(cardDate);
  });
}
