import { expect, test } from '@playwright/test';
for (const width of [390, 1440]) for (const theme of ['light', 'dark']) {
  test(`aspects live inside placements ${width} ${theme}`, async ({ page }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width, height: 1000 });
    await page.clock.setFixedTime(new Date('2026-09-08T04:06:00Z'));
    await page.addInitScript(theme => {
      localStorage.setItem('tldrastro:theme', theme);
      localStorage.setItem('tldrastro:selectedLocation', JSON.stringify({ label:'New York, NY', latitude:40.7128, longitude:-74.006, timeZone:'America/New_York' }));
    }, theme);
    const errors: string[]=[]; page.on('pageerror', e=>errors.push(e.message));
    await page.goto('/#sky');
    await expect(page.getByLabel('Daily sky summary')).toBeVisible({timeout:60000});
    await expect(page.locator('.aspect-section')).toHaveCount(0);
    await expect(page.locator('.deferred-render-placeholder--aspects')).toHaveCount(0);
    await page.getByLabel('Daily sky summary').getByRole('link', {name:'Read about Neptune in Aries',exact:true}).click();
    const card = page.getByRole('link', {name:'Read more about Neptune Rx Sextile Pluto Rx', exact:true});
    await expect(card).toBeVisible({timeout:60000});
    await expect(card).toContainText('Building through September 15.');
    await expect(card).toContainText('Pass 2 of 13.');
    await expect(card).toContainText('These two last met like this in 1986.');
    await expect(card).toHaveAttribute('href', /#sky\/aspect\/neptune\/sextile\/pluto/);
    await expect(card.locator('h4')).toHaveCount(1);
    await expect(card.getByLabel('exact aspect')).toBeVisible();
    expect(await card.evaluate(el => getComputedStyle(el).textDecorationLine)).toBe('none');
    await card.scrollIntoViewIfNeeded();
    await page.screenshot({path:`test-results/sky-placement-aspects-${width}-${theme}.png`});
    await card.click();
    await expect(page).toHaveURL(/#sky\/aspect\/neptune\/sextile\/pluto/);
    await expect(page.locator('#sky-detail-title')).toHaveText(/Neptune.*sextile.*Pluto/i);
    await expect(page.locator('.article-related-aspect-row')).toHaveCount(0);
    await page.getByRole('button', {name:'Close detail', exact:true}).click();
    await expect(page).toHaveURL(/#sky\/placement\/neptune\/aries$/);
    await expect(page.locator('#sky-detail-title')).toHaveText(/Neptune.*Aries/i);
    await page.getByRole('button', {name:'Close detail', exact:true}).click();
    await expect(page).toHaveURL(/#sky$/);
    expect(errors).toEqual([]);
  });
}

test('main summary still includes exact aspects', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-09-08T04:06:00Z'));
  await page.route('**/api/calendar?**', route => route.fulfill({ json: { ok: true, calendar: { days: [{ dateKey: '2026-09-08', events: [{ id: 'test-exact', type: 'aspect', planets: ['Moon', 'Mercury'], aspect: 'sextile', startsAt: '2026-09-08T10:00:00Z', dateKey: '2026-09-08' }] }] } } }));
  await page.goto('/#sky');
  await expect(page.getByLabel('Daily sky summary')).toContainText('Today’s exact aspect is Moon sextiles Mercury.', {timeout:60000});
  await expect(page.locator('.aspect-section')).toHaveCount(0);
});
