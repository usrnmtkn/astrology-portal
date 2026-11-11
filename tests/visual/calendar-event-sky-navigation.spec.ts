import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import calendarHandler from '../../api/calendar';
import skyHandler from '../../api/sky';
import { calendarSkyEventRoute, parseCalendarSkyEventRoute, calendarSkyEventMatches } from '../../apps/web/src/services/calendarSkyEventIdentity';
import type { LunarCalendarEvent } from '../../apps/web/src/services/ephemeris';
import { moonSignTransitionForPair } from '../../src/shared/features/calendar/moonSignTransitions';
import { bundledSkyPublications } from '../helpers/bundled-publications';
import { readerResponse } from '../helpers/reader-response';
import { publicationLedgerTag } from '../../apps/web/src/services/publicationLedgerTransport';
import { watchBrowserErrors } from './qaRuntimeGuards';

const location = { label: 'Synthetic New York', latitude: 40.7128, longitude: -74.006, timeZone: 'America/New_York' };
const cases = JSON.parse(readFileSync('tests/fixtures/calendar-sky-event-cases.json', 'utf8')) as { key: string; event: LunarCalendarEvent }[];
const phases = JSON.parse(readFileSync('apps/web/src/content/fallbackArchitectureV3/bundled-calendar-rows-v3.json', 'utf8')).hookRows;
const families = new Set<string>();
const samples = process.env.CALENDAR_EVENT_FULL_MATRIX === '1' ? cases : cases.filter(({ key }) => {
  const family = key.startsWith('ingress/Moon/') || key.startsWith('station/') ? key : key.split('/').slice(0, 2).join('/');
  if (families.has(family)) return false;
  families.add(family); return true;
});
const dayKey = (event: LunarCalendarEvent) => new Intl.DateTimeFormat('en-CA', { timeZone: location.timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(event.startsAt));
const escaped = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');

async function actualCalendarApi(page: Page) {
  await bundledSkyPublications(page);
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url());
    if (!['/api/calendar', '/api/sky'].includes(url.pathname)) return route.fallback();
    expect(route.request().method()).toBe('GET');
    const response = { statusCode: 0, body: '', setHeader() {}, end(body: string) { this.body = body; } };
    await (url.pathname === '/api/sky' ? skyHandler : calendarHandler)({ method: 'GET', url: url.href } as IncomingMessage, response as unknown as ServerResponse);
    expect(response.statusCode).toBe(200);
    await route.fulfill({ status: response.statusCode, contentType: 'application/json', body: response.body });
  });
}

async function openEvent(page: Page, event: LunarCalendarEvent, view = 'day') {
  const date = dayKey(event);
  if (event.phase === 'retrograde-passage') {
    await page.goto(`/?date=${date}#${calendarSkyEventRoute(event)}`);
    const article = page.locator('.sky-detail-article');
    await expect(article.locator('#sky-detail-title')).toBeVisible({ timeout: 60000 });
    return article;
  }
  if (event.planet === 'Sun') view = 'week';
  await page.goto(`/?date=${date}#calendar?view=${view === 'week' ? 'weekly' : view}&date=${date}`);
  if (view === 'month') await page.locator(`.lunar-calendar-day[data-calendar-date="${date}"]`).click();
  if (event.planet === 'Sun') {
    await page.locator(`#calendar-day-group-${date}`).getByRole('button', { name: new RegExp(`^${event.toSign} season begins`) }).click();
  } else {
    const scope = view === 'week' ? page.locator(`#calendar-day-group-${date}`) : view === 'month' ? page.getByRole('dialog', { name: 'Day slideout', exact: true }) : page.getByLabel('Selected lunar day', { exact: true });
    const title = event.type === 'station' ? new RegExp(`^${escaped(event.title)}(?:\\s|$)`) : event.type === 'lunation'
      ? new RegExp(`${escaped(event.title)}|${event.sign} ${/New Moon/iu.test(event.title) ? 'New Moon' : /Full Moon/iu.test(event.title) ? 'Full Moon' : escaped(event.title)}`)
      : view === 'week' ? new RegExp(`^${escaped(event.title)}(?:\\s|$)`) : event.title;
    await scope.getByRole('button', { name: title, exact: typeof title === 'string' }).first().click();
  }
  await expect(page).toHaveURL(/#sky\/event\//);
  expect(calendarSkyEventMatches(parseCalendarSkyEventRoute(new URL(page.url()).hash.slice(1))!, event)).toBe(true);
  const article = page.locator('.sky-detail-article');
  await expect(article.locator('#sky-detail-title')).toBeVisible({ timeout: 60000 });
  await expect(page.getByRole('dialog', { name: 'Event detail', exact: true })).toHaveCount(0);
  return article;
}

test.afterEach(async ({ page }) => page.unrouteAll({ behavior: 'ignoreErrors' }));
for (const [index, sample] of samples.entries()) {
  const width = index % 2 ? 1440 : 390, theme = index % 4 < 2 ? 'light' : 'dark';
  test(`Calendar whole Sky reading ${sample.key} ${width} ${theme}`, async ({ page }) => {
    test.setTimeout(120000);
    const noErrors = watchBrowserErrors(page);
    await page.setViewportSize({ width, height: 1000 });
    await page.addInitScript(({ location, theme }) => {
      localStorage.setItem('tldrastro:selectedLocation', JSON.stringify(location));
      localStorage.setItem('tldrastro:theme', theme);
    }, { location, theme });
    await actualCalendarApi(page);
    const article = await openEvent(page, sample.event);
    const paragraphs = article.locator('.sky-detail-body .article-body-inner').first().locator('p');
    await expect(paragraphs.first()).not.toBeEmpty();
    await expect(article).not.toContainText(/\{\{|\}\}/u);
    const body = await paragraphs.allTextContents();
    if (sample.event.planet === 'Moon') {
      for (const paragraph of moonSignTransitionForPair(sample.event.fromSign!, sample.event.toSign!)!.split(/\n\s*\n/u)) await expect(article).toContainText(paragraph);
    }
    if (/first-quarter|last-quarter/u.test(sample.key)) {
      const phase = sample.key.split('/')[1];
      await expect(article).toContainText(phases.find((row: any) => row.contentKey === `fallback-hook/moon-phase/${phase}`).body_you);
      await expect(article.locator('#sky-detail-title')).toHaveText(sample.event.title);
    }
    await noErrors.reload();
    await expect(paragraphs).toHaveText(body, { timeout: 60000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    noErrors();
  });
}

test('Calculated lunar eclipse identity wins over an incompatible reusable headline', async ({ page }) => {
  test.setTimeout(120000);
  const event = cases.find(c => c.key === 'lunation/lunar/Aries')!.event;
  const date = dayKey(event), key = `cms/lunation-article/${event.startsAt.slice(0, 10)}/full-moon/aries`;
  const passage = 'Synthetic lunar eclipse opening.\n\nThe complete middle paragraph belongs to this lunar reading.\n\nSynthetic lunar eclipse final sentence.';
  await page.addInitScript(location => localStorage.setItem('tldrastro:selectedLocation', JSON.stringify(location)), location);
  await actualCalendarApi(page);
  await page.route('**/api/content-reader', route => route.fulfill({ json: readerResponse(
    (route.request().postDataJSON().keys ?? []).includes(key) ? [{ id: 'lunar-event-identity', content_key: key,
      status: 'LIVE', lane: 'serving', review_state: null, surface: 'sky', mode: 'in_depth', provider: 'manual',
      body: passage, headline: 'Partial Solar Eclipse in Aries', updated_at: '2026-11-01T00:00:00Z' }] : []
  ) }));
  await page.goto(`/?date=${date}#calendar?view=day&date=${date}`);
  const day = page.getByLabel('Selected lunar day', { exact: true });
  await expect(day.getByRole('heading', { level: 2 })).toHaveText(event.title, { timeout: 60000 });
  await day.getByRole('button', { name: event.title, exact: true }).click();
  await expect(page.locator('#sky-detail-title')).toHaveText(event.title, { timeout: 60000 });
  const paragraphs = page.locator('.sky-detail-body .article-body-inner').first().locator('p');
  await expect(paragraphs).toHaveText(passage.split('\n\n'));
  await page.reload();
  await expect(page.locator('#sky-detail-title')).toHaveText(event.title, { timeout: 60000 });
  await expect(paragraphs).toHaveText(passage.split('\n\n'));
});

const moon = cases.find(c => c.key === 'ingress/Moon/Leo')!.event;
const key = `authored/calendar-moon-transition/${moon.fromSign!.toLowerCase()}/${moon.toSign!.toLowerCase()}`;
const updated = 'Synthetic updated ingress opening stays complete.\n\nThe middle paragraph belongs to this same source unit.\n\nSynthetic updated ingress final sentence stays complete.';
for (const view of ['day', 'week', 'month']) for (const width of [390, 1440]) for (const theme of ['light', 'dark']) {
  test(`Calendar ${view} preserves the complete updated ingress ${width} ${theme}`, async ({ page }) => {
    test.setTimeout(120000);
    await page.setViewportSize({ width, height: 1000 });
    await page.addInitScript(({ location, theme }) => {
      localStorage.setItem('tldrastro:selectedLocation', JSON.stringify(location));
      localStorage.setItem('tldrastro:theme', theme);
    }, { location, theme });
    await actualCalendarApi(page);
    await page.route('**/api/content-reader', route => {
      const keys = route.request().postDataJSON().keys ?? [];
      const rows = keys.includes(key) ? [{ id: 'calendar-complete-ingress', content_key: key, status: 'LIVE', lane: 'serving', review_state: null,
        surface: 'sky', mode: 'in_depth', provider: 'manual', body: updated, headline: moon.title, updated_at: '2026-11-01T00:00:00Z' }] : [];
      return route.fulfill({ json: readerResponse(rows) });
    });
    const article = await openEvent(page, moon, view);
    const paragraphs = article.locator('.sky-detail-body .article-body-inner').first().locator('p');
    await expect(paragraphs).toHaveText(updated.split('\n\n'));
    await page.reload();
    await expect(paragraphs).toHaveText(updated.split('\n\n'), { timeout: 60000 });
    await page.getByRole('button', { name: 'Close detail', exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`#calendar\\?view=${view === 'week' ? 'weekly' : view}&date=${dayKey(moon)}$`));
  });
}

for (const sample of [
  { caseKey: 'lunation/first-quarter/Aries', key: 'cms/calendar-day/phase/first-quarter' },
  { caseKey: 'station/Lilith/retrograde', key: 'sky-lilith/station' }
]) for (const state of ['live', 'retired'] as const) {
  test(`Dated Sky preserves the whole ${sample.caseKey} source and its ${state} state`, async ({ page }) => {
    test.setTimeout(120000);
    const event = cases.find(c => c.key === sample.caseKey)!.event;
    await page.addInitScript(location => localStorage.setItem('tldrastro:selectedLocation', JSON.stringify(location)), location);
    await actualCalendarApi(page);
    const updatedAt = '2026-11-01T00:00:00Z', id = 'complete-special-event';
    const passage = `Synthetic complete ${sample.caseKey} opening.\n\nThis middle paragraph is part of the same updated source unit.\n\nSynthetic complete ${sample.caseKey} final sentence.`;
    const publication = { content_key: sample.key, state, revision: 100000, row_id: state === 'live' ? id : null,
      row_updated_at: state === 'live' ? updatedAt : null, updated_at: updatedAt };
    let inventoryReads = 0, release = () => {};
    const unrelated = new Promise<void>(resolve => { release = resolve; });
    page.once('close', release);
    await page.route('**/api/content-reader', async route => {
      const input = route.request().postDataJSON(), keys = input.keys ?? [];
      if (input.scope === 'sky-article') inventoryReads++;
      if (!keys.includes(sample.key)) {
        await unrelated;
        return route.abort().catch(() => {});
      }
      return route.fulfill({ json: readerResponse(state === 'live' ? [{ id, content_key: sample.key, status: 'LIVE', lane: 'serving', review_state: null,
        surface: 'sky', mode: 'in_depth', provider: 'manual', body: passage, headline: event.title, updated_at: updatedAt }] : [], [publication]) });
    });
    await page.goto(`/?date=${dayKey(event)}#${calendarSkyEventRoute(event)}`);
    for (let reload = 0; reload < 2; reload++) {
      if (reload) await page.reload();
      if (state === 'retired') {
        await expect(page.getByRole('heading', { name: 'Sky event unavailable', exact: true })).toBeVisible({ timeout: 15000 });
        await expect(page.locator('.sky-detail-article')).toHaveCount(0);
      } else {
        await expect(page.locator('.sky-detail-body .article-body-inner').first().locator('p')).toHaveText(passage.split('\n\n'), { timeout: 15000 });
      }
      expect(inventoryReads, 'Independent readings must not request unrelated Sky inventory.').toBe(0);
    }
  });
}

test('A nonexistent Calendar event cannot borrow another Sky reading', async ({ page }) => {
  test.setTimeout(90000);
  await actualCalendarApi(page);
  await page.goto('/?date=2026-11-01#sky/event/ingress/sun/aries/at/2026-11-01T04%3A18%3A12.000Z');
  await expect(page.getByRole('heading', { name: 'Sky event unavailable', exact: true })).toBeVisible({ timeout: 60000 });
  await expect(page.locator('.sky-detail-article')).toHaveCount(0);
});

test('A late ingress source cannot reopen the previous dated Sky article', async ({ page }) => {
  test.setTimeout(120000);
  await page.addInitScript(location => localStorage.setItem('tldrastro:selectedLocation', JSON.stringify(location)), location);
  await actualCalendarApi(page);
  let release = () => {}, requested = false, delivered = false;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/api/content-reader', async route => {
    const keys = route.request().postDataJSON().keys ?? [];
    if (!keys.includes(key)) return route.fulfill({ json: readerResponse([]) });
    requested = true;
    await gate;
    await route.fulfill({ json: readerResponse([{ id: 'late-calendar-ingress', content_key: key, status: 'LIVE', lane: 'serving', review_state: null,
      surface: 'sky', mode: 'in_depth', provider: 'manual', body: updated, headline: moon.title, updated_at: '2026-11-01T00:00:00Z' }]) });
    delivered = true;
  });
  try {
    await page.goto(`/?date=${dayKey(moon)}#${calendarSkyEventRoute(moon)}`);
    await expect.poll(() => requested, { timeout: 60000 }).toBe(true);
    const next = cases.find(c => c.key === 'lunation/first-quarter/Aries')!.event;
    await page.evaluate(hash => { window.location.hash = hash; }, calendarSkyEventRoute(next)!);
    await expect(page.locator('#sky-detail-title')).toHaveText(next.title, { timeout: 60000 });
    release();
    await expect.poll(() => delivered).toBe(true);
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    await expect(page.locator('#sky-detail-title')).toHaveText(next.title);
    await expect(page.locator('.sky-detail-article')).not.toContainText(updated.split('\n\n')[0]);
  } finally { release(); }
});

test('A newer publication cannot leave the old dated reading visible when its body fails to load', async ({ page }) => {
  test.setTimeout(120000);
  await page.addInitScript(location => localStorage.setItem('tldrastro:selectedLocation', JSON.stringify(location)), location);
  await actualCalendarApi(page);
  let revision = 1, available = true, unrelated = false;
  const publication = () => ({ content_key: key, state: 'live' as const, revision,
    row_id: `current-ingress-${revision}`, row_updated_at: `2026-11-0${revision}T00:00:00Z`, updated_at: `2026-11-0${revision}T00:00:00Z` });
  const oldBody = 'Synthetic earlier ingress opening.\n\nSynthetic earlier ingress final sentence.';
  const otherKey = 'cms/calendar-day/phase/last-quarter';
  const ledger = () => [publication(), ...(unrelated ? [{ content_key: otherKey, state: 'live' as const, revision: 1,
    row_id: 'unrelated-quarter', row_updated_at: '2026-11-01T00:00:00Z', updated_at: '2026-11-01T00:00:00Z' }] : [])];
  await page.route('**/rest/v1/**', route => {
    const url = new URL(route.request().url());
    if (!url.pathname.endsWith('/content_publications')) return route.fallback();
    const matches = (key: string) => url.searchParams.getAll('content_key').every(filter => {
      const dot = filter.indexOf('.'), op = filter.slice(0, dot), value = filter.slice(dot + 1);
      return op === 'gte' ? key >= value : op === 'gt' ? key > value : op === 'lt' ? key < value : true;
    });
    return route.fulfill({ json: ledger().filter(row => matches(row.content_key)) });
  });
  await page.route(/\/api\/content-publications(?:\?|$)/, async route => {
    const list = new URL(route.request().url()).searchParams.get('scope') === 'sky-list';
    const rows = list ? [] : ledger();
    await route.fulfill({ headers: { etag: await publicationLedgerTag(rows) },
      json: { schema: list ? 'tldr-sky-list-publications/v1' : 'tldr-publications/v1', publications: rows } });
  });
  await page.route('**/api/content-reader', route => {
    const own = (route.request().postDataJSON().keys ?? []).includes(key);
    const row = { id: publication().row_id, content_key: key, status: 'LIVE', lane: 'serving', review_state: null,
      surface: 'sky', mode: 'in_depth', provider: 'manual', body: revision === 1 ? oldBody : updated,
      headline: moon.title, updated_at: publication().row_updated_at };
    return route.fulfill({ json: readerResponse(own && available ? [row] : [], own ? [publication()] : []) });
  });
  await page.goto(`/?date=${dayKey(moon)}#${calendarSkyEventRoute(moon)}`);
  const paragraphs = page.locator('.sky-detail-body .article-body-inner').first().locator('p');
  await expect(paragraphs).toHaveText(oldBody.split('\n\n'), { timeout: 60000 });
  unrelated = true;
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('tldrastro:content-update', {
    detail: { contentKey: '*', published: true, updatedAt: '2026-11-03T00:00:00Z' }
  })));
  await expect.poll(() => page.evaluate(key => JSON.parse(localStorage.getItem('tldrastro:content-publications:v1') ?? '[]')
    .find((row: any) => row.content_key === key)?.revision, otherKey)).toBe(1);
  await expect(paragraphs).toHaveText(oldBody.split('\n\n'));
  revision = 2; available = false;
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('tldrastro:content-update', {
    detail: { contentKey: '*', published: true, updatedAt: '2026-11-04T00:00:00Z' }
  })));
  await expect.poll(() => page.evaluate(key => JSON.parse(localStorage.getItem('tldrastro:content-publications:v1') ?? '[]')
    .find((row: any) => row.content_key === key)?.revision, key)).toBe(2);
  await expect(page.locator('.sky-detail-article')).toHaveCount(0);
  await expect(page.locator('.load-error')).toBeVisible({ timeout: 30000 });
  await expect(page.locator('.sky-detail-article')).toHaveCount(0);
  available = true;
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(paragraphs).toHaveText(updated.split('\n\n'), { timeout: 60000 });
});
