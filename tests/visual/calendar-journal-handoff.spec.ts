import { expect, test, type Page } from '../helpers/polish-test';
import { bundledPublications } from '../helpers/bundled-publications';
import { readerResponse } from '../helpers/reader-response';
import { expectReadableTheme } from '../helpers/theme-contrast';
import { emptyHoroscopeEdition, horoscopeEditionBody, horoscopeEditionKey } from '../../apps/web/src/content/horoscopeEditions.mjs';

const zone = 'America/New_York';
const user = { id: '11111111-1111-4111-8111-111111111111', email: 'journal@example.test', aud: 'authenticated', role: 'authenticated', app_metadata: { provider: 'email' }, user_metadata: { name: 'Fixture Reader' } };
const authKey = `sb-${new URL(process.env.VITE_SUPABASE_URL ?? 'https://visual-smoke.supabase.test').hostname.split('.')[0]}-auth-token`;

async function seed(page: Page, theme: string) {
  await bundledPublications(page);
  await page.clock.setFixedTime(new Date('2026-10-25T16:00:00Z'));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(({ theme, user, authKey, zone }) => {
    localStorage.setItem('tldrastro:theme', theme);
    localStorage.setItem('tldrastro:selectedLocation', JSON.stringify({ label: 'QA reference', latitude: 40.7, longitude: -74, timeZone: zone }));
    localStorage.setItem(authKey, JSON.stringify({ user, access_token: 'synthetic-journal', refresh_token: 'synthetic-refresh', token_type: 'bearer', expires_at: 4102444800 }));
  }, { theme, user, authKey, zone });
  await page.route('**/auth/v1/**', route => route.fulfill({ json: user }));
  await page.routeWebSocket('**/realtime/v1/websocket*', socket => socket.onMessage(raw => {
    const m = JSON.parse(String(raw));
    socket.send(JSON.stringify({ topic: m.topic, ref: m.ref, event: 'phx_reply', payload: { status: 'ok', response: {} } }));
  }));
}

async function expectBody(page: Page, selector: string) {
  for (const style of await page.locator(selector).evaluateAll(nodes => nodes.map(node => {
    const s = getComputedStyle(node);
    return { font: s.fontFamily, size: s.fontSize, weight: s.fontWeight, leading: s.lineHeight, tracking: s.letterSpacing };
  }))) {
    expect(style).toEqual({ font: expect.stringContaining('Newsreader'), size: '19px', weight: '400', leading: '28.5px', tracking: 'normal' });
  }
}

for (const theme of ['light', 'dark']) for (const width of [390, 1440]) {
  test(`Calendar v6 monthly TLDR preserves copy and opens its edition ${width} ${theme}`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width, height: 1000 });
    await seed(page, theme);
    const edition = emptyHoroscopeEdition({ period: 'monthly', audience: 'collective', timeZone: zone, startsAt: '2026-10-01T04:00:00.000Z', endsAt: '2026-11-01T04:00:00.000Z' });
    const tldr = 'Synthetic TLDR opening with **emphasis**.\n\nComplete TLDR final sentence.';
    edition.passages[0] = { sign: 'overview', headline: 'October 2026 Overview', body: `TLDR\n\n${tldr}\n\n## The month ahead\n\nComplete monthly forecast ending.` };
    const row = { id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', updated_at: '2026-10-25T12:00:00.000Z', content_key: horoscopeEditionKey(edition.window), surface: 'sky', mode: 'article', status: 'LIVE', lane: 'serving', review_state: null, body: horoscopeEditionBody(edition), sections: { horoscopeEdition: edition } };
    let failure = false;
    await page.route('**/api/content-reader', route => failure && route.request().postDataJSON().horoscope?.period === 'monthly'
      ? route.fulfill({ status: 503, json: { error: 'Synthetic failure' } })
      : route.fulfill({ json: readerResponse([row]) }));
    await page.goto('/?date=2026-10-25#calendar?view=month&date=2026-10-25');
    const card = page.locator('.lunar-month-overview--monthly');
    await expect(card).toContainText('Complete TLDR final sentence.');
    await expect(card.locator('.lunar-month-overview__label')).toHaveText('TLDR');
    await expect(card.getByRole('heading')).toHaveClass('sr-only');
    await expect(card.locator('h2.sr-only')).toHaveText(row.sections.horoscopeEdition.passages[0].headline);
    await expect(card.locator('p')).toHaveText(['Synthetic TLDR opening with emphasis.', 'Complete TLDR final sentence.']);
    await expectBody(page, '.lunar-month-overview--monthly p');
    await expectReadableTheme(page, '.lunar-month-overview__label, .lunar-month-overview--monthly p, .lunar-month-overview--monthly a');
    await expect(page.locator('.lunar-calendar-header h1')).toHaveCSS('font-size', '36px');
    const background = await page.locator('.app-shell').evaluate(node => getComputedStyle(node).backgroundImage);
    if (theme === 'light') expect(background).toContain('linear-gradient');
    else expect(background).toBe('none');
    await page.screenshot({ path: test.info().outputPath(`calendar-month-${theme}-${width}.png`), fullPage: true });
    await card.getByRole('link', { name: 'Read more: October 2026 Overview' }).click();
    await expect(page).toHaveURL(/#horoscopes\?period=monthly&edition=/);
    await expect(page.getByRole('article')).toContainText('Complete monthly forecast ending.');
    await page.goBack();
    await expect(card).toContainText('Complete TLDR final sentence.');
    failure = true;
    await page.reload();
    await expect(page.getByText('The monthly overview could not load.', { exact: true })).toBeVisible();
    failure = false;
    await page.getByRole('button', { name: 'Try again', exact: true }).click();
    await expect(card).toContainText('Complete TLDR final sentence.');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });

  test(`Journal v6 five steps save, retry and reload ${width} ${theme}`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width, height: 844 });
    await seed(page, theme);
    let rows: Record<string, unknown>[] = [];
    let failSave = true;
    await page.route('**/rest/v1/calendar_check_ins?**', route => {
      if (route.request().method() === 'POST') {
        if (failSave) return route.fulfill({ status: 503, json: { message: 'Synthetic save failure' } });
        rows = [route.request().postDataJSON()];
        expect(rows[0].user_id).toBe(user.id);
        return route.fulfill({ json: rows[0] });
      }
      return route.fulfill({ json: rows });
    });
    await page.route('**/rest/v1/calendar_check_in_library?**', route => route.fulfill({ json: [{ user_id: user.id, kind: 'tag', label: 'work' }] }));
    await page.goto('/?date=2026-10-25#calendar?view=day&date=2026-10-25');
    await expect(page.locator('.calendar-sky-card__title')).toBeVisible();
    await expect(page.locator('.calendar-sky-card__title')).toHaveCSS('font-size', '26px');
    await expectBody(page, '.calendar-sky-card__body p');
    await page.locator('.calendar-checkin-card').click();
    const dialog = page.getByRole('dialog', { name: 'Check-in', exact: true });
    await expect(dialog.getByRole('heading', { name: 'How are you feeling?' })).toBeVisible();
    expect(await dialog.getByRole('heading').evaluate(node => {
      const s = getComputedStyle(node);
      return { family: s.fontFamily, size: s.fontSize, weight: s.fontWeight, leading: s.lineHeight, align: s.textAlign };
    })).toEqual({ family: expect.stringContaining('Newsreader'), size: '36px', weight: '400', leading: '40.32px', align: 'left' });
    const box = (await dialog.boundingBox())!;
    expect(box.width).toBe(width < 761 ? width : 530);
    expect(box.y).toBe(0); expect(box.height).toBe(844);
    for (const control of await dialog.locator('.calendar-slideout__close, .calendar-checkin__round, .calendar-checkin__skip').all()) expect((await control.boundingBox())!.height).toBe(44);
    await dialog.getByRole('button', { name: 'Good', exact: true }).click();
    expect(await dialog.getByRole('button', { name: 'Good', exact: true }).locator('svg').evaluate(node => getComputedStyle(node).width)).toBe('40px');
    await expectReadableTheme(page, '.calendar-checkin h2, .calendar-checkin__ends span, .calendar-checkin__skip, .calendar-slideout__date');
    await page.screenshot({ path: test.info().outputPath(`journal-mood-${theme}-${width}.png`) });
    await dialog.getByRole('button', { name: 'Next', exact: true }).click();
    const rest = dialog.getByRole('slider', { name: 'Rested', exact: true });
    await expect(dialog.getByRole('heading', { name: 'How rested do you feel?' })).toBeVisible();
    await rest.focus(); await rest.press('End');
    await expect(rest).toHaveValue('100');
    await page.screenshot({path:test.info().outputPath(`journal-rest-${theme}-${width}.png`)});
    expect(await dialog.locator('.calendar-checkin__slider-track').evaluate(node => getComputedStyle(node).height)).toBe('36px');
    expect(await dialog.locator('.calendar-checkin__slider-thumb').evaluate(node => getComputedStyle(node).width)).toBe('30px');
    const track = (await dialog.locator('.calendar-checkin__slider-track').boundingBox())!;
    const thumb = (await dialog.locator('.calendar-checkin__slider-thumb').boundingBox())!;
    expect(track.x + track.width - thumb.x - thumb.width).toBeCloseTo(3, 0);
    await rest.press('Home'); await expect(rest).toHaveValue('0');
    expect((await dialog.locator('.calendar-checkin__slider-thumb').boundingBox())!.x - track.x).toBeCloseTo(3, 0);
    await rest.press('ArrowRight');
    await dialog.getByRole('button', { name: 'Next', exact: true }).click();
    await expect(dialog.getByRole('heading', { name: 'How was your time with people?' })).toBeVisible();
    await page.screenshot({path:test.info().outputPath(`journal-people-${theme}-${width}.png`)});
    await dialog.getByRole('button', { name: 'Next', exact: true }).click();
    const note = dialog.getByRole('textbox', { name: "What's on your mind?", exact: true });
    await note.fill('Synthetic journal opening.\nComplete journal ending.');
    await expectBody(page, '.calendar-checkin__summary, .calendar-checkin textarea');
    await dialog.getByRole('button', { name: 'Tags', exact: true }).click();
    await dialog.getByRole('button', { name: '#work', exact: true }).click();
    await dialog.getByRole('button', { name: 'Done', exact: true }).click();
    await page.screenshot({ path: test.info().outputPath(`journal-entry-${theme}-${width}.png`) });
    await dialog.getByRole('button', { name: 'Next', exact: true }).click();
    await dialog.getByRole('textbox', { name: 'Anything else?', exact: true }).fill('Complete additional note.');
    await page.screenshot({path:test.info().outputPath(`journal-summary-${theme}-${width}.png`)});
    await dialog.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(dialog.getByRole('status')).toHaveText('This check-in could not be saved. Try again.');
    await expect(dialog.getByRole('textbox')).toHaveValue('Complete additional note.');
    const footer = (await dialog.locator('footer').boundingBox())!;
    expect(footer.y + footer.height).toBeLessThanOrEqual(844);
    failSave = false;
    await dialog.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(dialog).toHaveCount(0);
    expect(rows[0]).toMatchObject({ mood: 3, sleep: 1, tags: ['work'], mood_note: 'Synthetic journal opening.\nComplete journal ending.', note: 'Complete additional note.' });
    await page.reload();
    await expect(page.locator('.calendar-checkin-card')).toContainText('Good');
    await page.goto('/#account?view=journal');
    await expect(page.locator('.account-journal-entry')).toContainText('Synthetic journal opening.');
    await page.locator('.account-journal-entry').click();
    await expect(dialog.getByRole('button', { name: 'Good', exact: true })).toHaveAttribute('aria-pressed', 'true');
    for (let step = 0; step < 3; step++) await dialog.getByRole('button', { name: 'Next', exact: true }).click();
    await expect(dialog.getByRole('textbox', { name: "What's on your mind?", exact: true })).toHaveValue('Synthetic journal opening.\nComplete journal ending.');
    await dialog.getByRole('button', { name: 'Close', exact: true }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}
