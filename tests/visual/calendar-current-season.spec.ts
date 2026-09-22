import { expect, test } from '@playwright/test';
import { bundledPublications } from '../helpers/bundled-publications';

const location = { label: 'New York, NY', latitude: 40.7128, longitude: -74.006, timeZone: 'America/New_York' };
const typography = (element: Element) => {
  const style = getComputedStyle(element);
  return [style.fontFamily, style.fontSize, style.fontWeight, style.lineHeight, style.letterSpacing,
    style.marginTop, style.marginBottom, style.textTransform, style.textAlign];
};

for (const scenario of [
  { width: 390, theme: 'light', zone: 'America/New_York', date: '2026-09-22', before: '2026-09-22T13:20:00Z', eventTime: '8:05p' },
  { width: 1440, theme: 'dark', zone: 'America/New_York', date: '2026-09-22', before: '2026-09-22T13:20:00Z', eventTime: '8:05p' },
  { width: 390, theme: 'dark', zone: 'Asia/Tokyo', date: '2026-09-23', before: '2026-09-22T23:30:00Z', eventTime: '9:05a' },
  { width: 1440, theme: 'light', zone: 'Asia/Tokyo', date: '2026-09-23', before: '2026-09-22T23:30:00Z', eventTime: '9:05a' }
]) {
  test(`Calendar current season agrees with Sun before and after ingress ${scenario.width} ${scenario.zone}`, async ({ page }) => {
    test.setTimeout(180_000);
    await page.clock.setFixedTime(new Date(scenario.before));
    await page.setViewportSize({ width: scenario.width, height: 1000 });
    await page.addInitScript(({ location, scenario }) => {
      localStorage.setItem('tldrastro:selectedLocation', JSON.stringify({ ...location, timeZone: scenario.zone }));
      localStorage.setItem('tldrastro:theme', scenario.theme);
      localStorage.setItem('tldrastro:dyslexiaFont', 'false');
      const observed: string[] = [];
      (window as typeof window & { observedSeasons: string[] }).observedSeasons = observed;
      new MutationObserver(() => {
        const label = document.querySelector('.calendar-header-season')?.textContent?.trim();
        if (label && !observed.includes(label)) observed.push(label);
      }).observe(document, { subtree: true, childList: true, characterData: true });
    }, { location, scenario });
    await bundledPublications(page);
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    // The API/worker calculation path supplies all astronomy; only the remote
    // editorial plane is isolated. The browser zone differs from the selection.
    await page.goto(`/?date=${scenario.date}#calendar?view=day&date=${scenario.date}`);
    const panel = page.getByLabel('Selected lunar day', { exact: true });
    const sun = panel.getByRole('region', { name: 'Sun in season', exact: true });
    const title = panel.locator('.calendar-sky-card__title');
    const badge = page.locator('.calendar-header-season');
    await expect(sun).toContainText('Sun in Virgo at 29°', { timeout: 90_000 });
    await expect(badge).toContainText('Virgo season');
    await expect(panel.locator('.calendar-sky-card__meta')).toContainText('Virgo season');
    await expect(title).not.toHaveText('Libra Season');
    expect(await page.evaluate(() => (window as typeof window & { observedSeasons: string[] }).observedSeasons.every(value => value.includes('Virgo season')))).toBe(true);
    const beforeTypography = await title.evaluate(typography);
    const beforeHeading = await title.innerText();
    expect(await page.locator('.lunar-calendar-title-row h1').evaluate(element => element.tagName)).toBe('H1');
    expect(await title.evaluate(element => element.tagName)).toBe('H2');
    expect(await title.evaluate(element => Boolean(element.compareDocumentPosition(document.querySelector('.calendar-sky-card__body')!) & Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true);
    // Today's upcoming event remains available, with its exact local time.
    const event = panel.locator('.calendar-stoic-card').filter({ has: page.getByText('Sun enters Libra', { exact: true }) });
    await expect(event).toContainText(scenario.eventTime);
    await panel.locator('.calendar-sky-card').screenshot({ path: `test-results/season-before-${scenario.width}-${scenario.theme}.png` });
    await page.reload();
    await expect(sun).toContainText('Sun in Virgo at 29°', { timeout: 60_000 });
    await expect(title).toHaveText(beforeHeading);
    await expect(badge).toContainText('Virgo season');
    // Focus refresh catches up after the user leaves the tab open across ingress.
    await page.clock.setFixedTime(new Date('2026-09-23T00:06:30Z'));
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    await expect(sun).toContainText('Sun in Libra at 0°', { timeout: 60_000 });
    await expect(badge).toContainText('Libra season');
    await expect(panel.locator('.calendar-sky-card__meta')).toContainText('Libra season');
    await expect(title).toHaveText('Libra Season');
    expect(await title.evaluate(typography)).toEqual(beforeTypography);
    await panel.locator('.calendar-sky-card').screenshot({ path: `test-results/season-after-${scenario.width}-${scenario.theme}.png` });
    await page.reload();
    await expect(sun).toContainText('Sun in Libra at 0°', { timeout: 60_000 });
    await expect(title).toHaveText('Libra Season');
    await expect(badge).toContainText('Libra season');
    // Switching views preserves the live season while keeping the event date.
    await page.getByRole('tab', { name: 'Week', exact: true }).click();
    await expect(badge).toContainText('Libra season');
    await expect(page.locator(`#calendar-day-group-${scenario.date}`).getByRole('button', { name: /Libra season begins/ })).toBeVisible();
    await page.getByRole('tab', { name: 'Month', exact: true }).click();
    await expect(badge).toContainText('Libra season');
    const monthDay = page.locator(`.lunar-calendar-day[data-calendar-date="${scenario.date}"]`);
    await expect(monthDay.locator('.calendar-kind--season')).toContainText('Libra season', { timeout: 60_000 });
    await monthDay.click();
    await expect(sun).toContainText('Sun in Libra at 0°');
    await expect(title).toHaveText('Libra Season');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    expect(errors).toEqual([]);
  });
}

test('Calendar changes Sun season at the ingress while the tab stays open', async ({ page }) => {
  test.setTimeout(120_000);
  await page.clock.install({ time: new Date('2026-09-23T00:04:50Z') });
  await page.addInitScript(value => localStorage.setItem('tldrastro:selectedLocation', JSON.stringify(value)), location);
  await bundledPublications(page);
  await page.goto('/?date=2026-09-22#calendar?view=day&date=2026-09-22');
  const sun = page.getByRole('region', { name: 'Sun in season', exact: true });
  await expect(sun).toContainText('Sun in Virgo', { timeout: 60_000 });
  await expect(page.locator('.calendar-header-season')).toContainText('Virgo season');
  await page.clock.fastForward(30_000);
  await expect(sun).toContainText('Sun in Libra at 0°', { timeout: 60_000 });
  await expect(page.locator('.calendar-header-season')).toContainText('Libra season');
  await expect(page.locator('.calendar-sky-card__title')).toHaveText('Libra Season');
});
