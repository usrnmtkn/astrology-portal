import { expect, test } from '@playwright/test';
import { bundledPublications } from '../helpers/bundled-publications';
import { readerResponse } from '../helpers/reader-response';

for (const width of [390, 1440]) {
  test(`Calendar keeps its loaded day through repeated route and background checks ${width}`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width, height: 1000 });
    await page.clock.install({ time: new Date('2026-09-27T16:00:00Z') });
    await page.addInitScript(() => {
      localStorage.setItem('tldrastro:selectedLocation', JSON.stringify({ label: 'New York, NY', latitude: 40.7128, longitude: -74.006, timeZone: 'America/New_York' }));
      // A full/quota-limited browser cache must not evict the open reading.
      const setItem = Storage.prototype.setItem;
      Storage.prototype.setItem = function(key, value) {
        if (key.startsWith('tldr-lunar-calendar')) throw new DOMException('Full', 'QuotaExceededError');
        setItem.call(this, key, value);
      };
    });
    await bundledPublications(page);
    let requests = 0;
    page.on('request', request => { if (new URL(request.url()).pathname === '/api/calendar') requests++; });
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/?date=2026-10-02#calendar?view=day&date=2026-10-02');
    const day = page.getByLabel('Selected lunar day');
    await expect(day.locator('.calendar-sky-card__body')).toHaveAttribute('aria-busy', 'false', { timeout: 60_000 });
    const card = day.getByRole('button', { name: 'Mercury squares Mars', exact: true });
    await expect(card).toBeVisible();
    await card.click();
    const dialog = page.getByRole('dialog', { name: 'Event detail' });
    await expect(dialog).toBeVisible();
    const before = await dialog.innerText();
    const beforeRequests = requests;
    await page.evaluate(() => {
      const panel = document.querySelector('[aria-label="Selected lunar day"]')!;
      const dialog = document.querySelector('[role="dialog"]')!;
      (window as any).__calendarStability = { panel, dialog, flashes: 0, scroll: window.scrollY };
      new MutationObserver(() => {
        if (!panel.isConnected || !dialog.isConnected || panel.querySelector('.card-skeleton, [aria-busy="true"]')) {
          (window as any).__calendarStability.flashes++;
        }
      }).observe(document.querySelector('#root')!, { childList: true, subtree: true, attributes: true, attributeFilter: ['aria-busy'] });
      // Browser URL restoration may announce the same selection more than once.
      window.dispatchEvent(new PopStateEvent('popstate'));
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });
    await page.clock.runFor(1000);
    expect(requests, 'The same date/location should reuse its facts').toBe(beforeRequests);
    for (let cycle = 0; cycle < 2; cycle++) {
      await page.clock.fastForward(301_000);
      await page.evaluate(() => { window.dispatchEvent(new Event('focus')); document.dispatchEvent(new Event('visibilitychange')); });
      await page.clock.runFor(1000);
      await expect(dialog).toHaveText(before, { useInnerText: true });
      const stability = await page.evaluate(() => {
        const state = (window as any).__calendarStability;
        return { flashes: state.flashes, samePanel: state.panel.isConnected, sameDialog: state.dialog.isConnected, scroll: window.scrollY - state.scroll };
      });
      expect(stability).toEqual({ flashes: 0, samePanel: true, sameDialog: true, scroll: 0 });
    }
    await dialog.getByRole('button', { name: 'Close', exact: true }).click();
    await page.getByRole('button', { name: 'Next day', exact: true }).click();
    await expect(day).toHaveAttribute('data-calendar-date', '2026-10-03');
    await expect(day.locator('.calendar-sky-card__body')).toHaveAttribute('aria-busy', 'false');
    await page.reload();
    await expect(day).toHaveAttribute('data-calendar-date', '2026-10-03', { timeout: 60_000 });
    await expect(day.locator('.calendar-sky-card__body')).toHaveAttribute('aria-busy', 'false');
    expect(errors).toEqual([]);
  });
}


// Facts are real ephemeris calculations. Only the publication plane is a
// synthetic fixture; no owner content or publication state is changed.
for (const scenario of [
  { date: '2026-09-21', now: '2026-09-21T23:00:00Z', sign: 'Aquarius', pair: 'capricorn/aquarius' },
  { date: '2026-10-02', now: '2026-09-27T16:00:00Z', sign: 'Gemini', pair: 'gemini/cancer' }
]) for (const width of [390, 1440]) {
  test(`Calendar reveals one resolved Moon reading ${scenario.date} ${width}`, async ({ page }) => {
    test.setTimeout(120_000);
    const theme = width === 390 ? 'dark' : 'light';
    const key = `authored/calendar-moon-transition/${scenario.pair}`;
    const body = 'Synthetic saved Moon opening.\n\nSynthetic saved Moon final sentence.';
    const row = {
      id: 'calendar-hydration-fixture', content_key: key, body, status: 'LIVE', lane: 'serving',
      surface: 'sky', mode: 'card', updated_at: '2026-09-27T12:00:00Z',
      source_snapshot: { content_role: 'full_copy', review_status: 'approved_reuse' }
    };
    await page.setViewportSize({ width, height: 1000 });
    await page.clock.setFixedTime(new Date(scenario.now));
    await page.emulateMedia({ colorScheme: theme });
    await page.addInitScript(theme => {
      localStorage.setItem('tldrastro:theme', theme);
      localStorage.setItem('tldrastro:selectedLocation', JSON.stringify({ label: 'New York, NY', latitude: 40.7128, longitude: -74.006, timeZone: 'America/New_York' }));
      (window as any).__moonPaints = { titles: [], passages: [] };
      new MutationObserver(() => {
        const panel = document.querySelector('[aria-label="Selected lunar day"]');
        const title = panel?.querySelector('h2.calendar-sky-card__title')?.textContent;
        const passage = panel?.querySelector('[data-guidance-key]')?.textContent;
        const paints = (window as any).__moonPaints;
        if (title && !paints.titles.includes(title)) paints.titles.push(title);
        if (passage && !paints.passages.includes(passage)) paints.passages.push(passage);
      }).observe(document, { childList: true, subtree: true, characterData: true });
    }, theme);
    await bundledPublications(page);
    let release = () => {};
    let gate: Promise<void> | null;
    let held = 0;
    const hold = () => { held = 0; gate = new Promise<void>(resolve => { release = resolve; }); };
    hold();
    await page.route('**/api/content-reader', async route => {
      const keys: string[] = route.request().postDataJSON().keys ?? [];
      if (keys.includes(key) && gate) { held++; await gate; }
      await route.fulfill({ json: readerResponse(keys.includes(key) ? [row] : []) });
    });
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    const day = page.getByLabel('Selected lunar day', { exact: true });
    try {
      await page.goto(`/?date=${scenario.date}#calendar?view=day&date=${scenario.date}`);
      for (const warm of [false, true]) {
        if (warm) { hold(); await page.reload(); }
        await expect.poll(() => held, { timeout: 60_000 }).toBeGreaterThan(0);
        // The server response is still held. Neither the noon heading nor
        // bundled Moon prose can be exposed as a completed day in the meantime.
        await expect(day.locator('.calendar-sky-card__body')).toHaveAttribute('aria-busy', 'true');
        await expect(day.locator('h2.calendar-sky-card__title')).toHaveCount(0);
        await expect(day.locator('[data-guidance-key]')).toHaveCount(0);
        const typography = (el: Element) => {
          const css = getComputedStyle(el);
          return ['fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'marginTop', 'marginBottom', 'textTransform', 'textAlign'].map(key => css[key as keyof CSSStyleDeclaration]);
        };
        const loadingTitleStyle = await day.locator('.calendar-sky-card__title').evaluate(typography);
        await expect(day.locator('.calendar-sky-card__title .card-skeleton-text__measure')).toContainText(`Moon in ${scenario.sign}`);
        const loadingHeader = await day.locator('.calendar-sky-card__lockup').boundingBox();
        release(); gate = null;
        await expect(day.locator('.calendar-sky-card__body')).toHaveAttribute('aria-busy', 'false', { timeout: 60_000 });
        const heading = day.getByRole('heading', { level: 2 }).first();
        await expect(heading).toContainText(`Moon in ${scenario.sign}`);
        await expect(day.locator('[data-guidance-key]')).toContainText('Synthetic saved Moon opening.');
        await expect(day.locator('[data-guidance-key]')).toContainText('Synthetic saved Moon final sentence.');
        expect(await heading.evaluate(typography)).toEqual(loadingTitleStyle);
        const readyHeader = await day.locator('.calendar-sky-card__lockup').boundingBox();
        expect(Math.abs(readyHeader!.height - loadingHeader!.height), 'Known header geometry must not jump when prose becomes ready').toBeLessThanOrEqual(1);
        const paints = await page.evaluate(() => (window as any).__moonPaints);
        expect(paints.titles).toEqual([await heading.textContent()]);
        expect(paints.passages).toHaveLength(1);
        expect(paints.passages[0]).toContain('Synthetic saved Moon opening.');
        expect(paints.passages[0]).toContain('Synthetic saved Moon final sentence.');
        expect(await day.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
      }
      // Changing the selected date must wait for its own Sky facts, even if
      // the same week's content request is already cached and marked ready.
      await page.getByRole('button', { name: 'Next day', exact: true }).click();
      const nextDate = scenario.date === '2026-10-02' ? '2026-10-03' : '2026-09-22';
      await expect(day).toHaveAttribute('data-calendar-date', nextDate);
      await expect(day.locator('.calendar-sky-card__body')).toHaveAttribute('aria-busy', 'false', { timeout: 60_000 });
      await expect(day.getByRole('region', { name: 'Sun in season' })).toBeVisible();
      expect(errors).toEqual([]);
    } finally { release(); }
  });
}

test('Calendar keeps the whole day pending when Sky arrives after calendar facts', async ({ page }) => {
  test.setTimeout(120_000);
  await page.clock.setFixedTime(new Date('2026-09-21T23:00:00Z'));
  await page.addInitScript(() => localStorage.setItem('tldrastro:selectedLocation', JSON.stringify({ label: 'New York, NY', latitude: 40.7128, longitude: -74.006, timeZone: 'America/New_York' })));
  await bundledPublications(page);
  let release = () => {};
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/api/sky?**', async route => { await gate; await route.continue(); });
  try {
    await page.goto('/?date=2026-09-21#calendar?view=day&date=2026-09-21');
    const panel = page.getByLabel('Selected lunar day', { exact: true });
    await expect(page.getByRole('region', { name: 'Selected week' })).toBeVisible();
    await expect(panel.locator('.calendar-sky-card__body')).toHaveAttribute('aria-busy', 'true');
    await expect(panel.locator('h2.calendar-sky-card__title')).toHaveCount(0);
    release();
    await expect(panel.locator('.calendar-sky-card__body')).toHaveAttribute('aria-busy', 'false', { timeout: 60_000 });
    await expect(panel.getByRole('heading', { level: 2 }).first()).toContainText('Moon in Aquarius');
  } finally { release(); }
});

test('Calendar still advances the live Moon at its real ingress', async ({ page }) => {
  test.setTimeout(120_000);
  await page.clock.install({ time: new Date('2026-09-21T17:13:30Z') });
  await page.addInitScript(() => localStorage.setItem('tldrastro:selectedLocation', JSON.stringify({ label: 'New York, NY', latitude: 40.7128, longitude: -74.006, timeZone: 'America/New_York' })));
  await bundledPublications(page);
  await page.goto('/?date=2026-09-21#calendar?view=day&date=2026-09-21');
  const heading = page.getByLabel('Selected lunar day', { exact: true }).getByRole('heading', { level: 2 }).first();
  await expect(heading).toContainText('Moon in Capricorn', { timeout: 60_000 });
  await page.clock.fastForward(90_000);
  await expect(heading).toContainText('Moon in Aquarius', { timeout: 60_000 });
  await expect(page.locator('.calendar-sky-card__element')).toHaveText('Air');
  await expect(page.locator('.calendar-sky-card__body')).toHaveAttribute('aria-busy', 'false');
});
