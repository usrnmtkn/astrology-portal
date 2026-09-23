import { test, expect } from '@playwright/test';
import { studioApiStore } from '../helpers/studio-api-store';
import { routeStudioInventoryApi } from '../helpers/studio-inventory-route';
import { bundledPublications } from '../helpers/bundled-publications';
import { readerResponse } from '../helpers/reader-response';

const selectionUrl = '/admin/content#exact-content?category=Calendar+Aspects&first=moon&aspect=square&second=venus';
const exactUrl = `${selectionUrl}&firstSign=aquarius&secondSign=scorpio`;
const key = 'sky.aspect.moon.square.venus.aquarius.scorpio';
const title = 'Moon in Aquarius Square Venus in Scorpio';
const passage = 'Complete synthetic opening.\n\nComplete synthetic final sentence.';
const generic = { id: 'fixture-generic', content_key: 'sky.aspect.moon.square.venus', status: 'DRAFT', surface: 'sky', mode: 'feed', block_type: 'sky_aspect', event_type: 'collective-aspect-card', headline: 'Moon Square Venus', body: 'Generic synthetic passage.', summary: '', lane: 'serving', review_state: 'EDITORIAL_REVIEW_REQUIRED', source_snapshot: {}, facts: {}, sections: {}, updated_at: '2026-09-20T12:00:00Z' };
const headingStyle = (element: Element) => {
  const style = getComputedStyle(element);
  return Object.fromEntries(['fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'marginTop', 'marginBottom', 'textTransform', 'textAlign'].map(key => [key, style[key as keyof CSSStyleDeclaration]]));
};

for (const width of [390, 1440]) for (const theme of ['light', 'dark']) {
  test(`Calendar exact saved revision checks before publication ${theme} ${width}`, async ({ page }) => {
    test.setTimeout(90000);
    const savedKey = 'sky.aspect.moon.trine.uranus.aquarius.gemini';
    const revised = 'Synthetic opening for a document you usually review.\n\nComplete synthetic final sentence.';
    const seed = { ...generic, id: 'stale-exact', content_key: savedKey, headline: 'Moon trine Uranus', body: 'Synthetic old paragraph.',
      judge_gate: null, source_snapshot: { studioWritingCheck: null, skyAspectVoiceLint: { score: 1, fails: 1, findings: [
        { severity: 'fail', source: 'shape', term: 'paragraph-count', reason: 'the card template is exactly two paragraphs' }
      ] } } };
    const store = await studioApiStore([seed], { writing: true, realRecheck: true });
    try {
      await page.setViewportSize({ width, height: 1000 });
      await page.addInitScript(theme => {
        localStorage.setItem('tldrastro:contentAdminSecret', 'calendar-api-fixture');
        localStorage.setItem('tldrastro:studio-theme', theme);
      }, theme);
      await routeStudioInventoryApi(page, { call: store.call, answer: async (route, url) => {
        if (url.pathname === '/api/admin/content-live-status') {
          await route.fulfill({ json: { ok: true, statuses: await store.call({ method: 'statuses', body: route.request().postDataJSON() }) } });
          return true;
        }
        if (url.pathname !== '/api/admin/sky-draft-writing') return false;
        const result = await store.call({ method: 'POST', url: url.pathname, body: route.request().postDataJSON() });
        await route.fulfill({ status: result.status, json: result.payload });
        return true;
      } });
      await page.goto('/admin/content#exact-content?category=Calendar+Aspects&first=moon&aspect=trine&second=uranus&firstSign=aquarius&secondSign=gemini');
      await page.getByRole('button', { name: 'Open write-up', exact: true }).click();
      const editor = page.locator('.admin-editor-panel');
      const footer = editor.locator('.admin-editor-savebar');
      const check = footer.getByRole('button', { name: 'Run writing checks', exact: true });
      const approve = footer.getByRole('button', { name: 'Approve & schedule', exact: true });
      const body = editor.getByRole('textbox', { name: 'Full passage / body', exact: true });
      const readiness = editor.getByRole('region', { name: 'Review and publication readiness', exact: true });
      await expect(readiness).not.toContainText('the card template is exactly two paragraphs');
      await expect(check).toBeEnabled();
      await expect(approve).toBeDisabled();
      await expect(editor.getByLabel('Status', { exact: true })).toBeDisabled();
      await expect(editor.getByRole('button', { name: 'Mark reviewed', exact: true })).toHaveCount(0);
      await body.fill(revised);
      await editor.getByRole('textbox', { name: 'TL;DR / summary', exact: true }).fill('Separate synthetic summary.');
      await expect(check).toBeDisabled();
      await footer.getByRole('button', { name: 'Save', exact: true }).click();
      await expect(editor).toContainText('All changes saved');
      await expect(check).toBeEnabled();
      await expect(approve).toBeDisabled();
      await editor.locator('summary').filter({ hasText: /^Details/ }).click();
      await editor.getByText('Edit metadata', { exact: true }).click();
      await expect(editor.getByLabel('Status', { exact: true })).toBeDisabled();
      await expect(editor).toContainText('Save your edits, run writing checks, then Approve & schedule.');
      await check.click();
      await expect(approve).toBeEnabled();
      await expect(body).toHaveValue(revised);
      await expect(readiness).not.toContainText('the card template is exactly two paragraphs');
      await expect(editor.getByRole('button', { name: 'Run writing checks', exact: true })).toHaveCount(1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await page.screenshot({ path: `test-results/calendar-publish-checks-${width}-${theme}.png` });
      await approve.click();
      await expect.poll(async () => (await store.call({ method: 'rows' }))[0].status).toBe('LIVE');
      const saved = (await store.call({ method: 'rows' }))[0];
      expect(saved.body).toBe(revised);
      expect(saved.summary).toBe('Separate synthetic summary.');
      expect(saved.source_snapshot.skyAspectVoiceLint).toMatchObject({ score: 3, fails: 0 });
      await expect(body).toHaveValue(revised);
    } finally {
      await page.context().route('**/api/**', route => route.abort());
      await page.unrouteAll({ behavior: 'wait' });
      await page.close();
      store.close();
    }
  });
}

for (const width of [390, 1440]) for (const theme of ['light', 'dark']) {
  test(`Calendar exact aspect create save reopen ${theme} ${width}`, async ({ page }) => {
    test.setTimeout(90000);
    const store = await studioApiStore([generic], { writing: true });
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    let failLookup = false;
    let writes = 0;
    try {
      await page.setViewportSize({ width, height: 1000 });
      await page.emulateMedia({ colorScheme: theme as 'light' | 'dark' });
      await page.addInitScript(theme => {
        localStorage.setItem('tldrastro:contentAdminSecret', 'calendar-api-fixture');
        localStorage.setItem('tldrastro:studio-theme', theme);
        localStorage.setItem('tldrastro:theme', theme);
      }, theme);
      await routeStudioInventoryApi(page, {
        call: message => failLookup && message.method === 'GET' && message.url?.includes('contentKeys=')
          ? Promise.resolve({ status: 503, payload: { ok: false, error: 'Synthetic lookup unavailable. Try again.' } }) : store.call(message),
        onWrite: () => { writes++; },
        answer: async (route, url) => {
          if (url.pathname === '/api/admin/content-live-status') {
            await route.fulfill({ json: { ok: true, statuses: await store.call({ method: 'statuses', body: route.request().postDataJSON() }) } });
            return true;
          }
          if (url.pathname !== '/api/admin/sky-draft-writing') return false;
          const result = await store.call({ method: 'POST', url: url.pathname, body: route.request().postDataJSON() });
          await route.fulfill({ status: result.status, json: result.payload });
          return true;
        }
      });
      await page.goto(selectionUrl);
      await expect(page.getByRole('heading', { name: 'Calendar Aspect Cards', exact: true })).toHaveJSProperty('tagName', 'H1');
      const filters = page.getByRole('region', { name: 'Content list filters' });
      const action = page.getByRole('region', { name: 'Exact aspect write-up', exact: true });
      await expect(page.locator('.admin-content-row')).toHaveCount(1);
      await expect(action.getByRole('button')).toHaveCount(0);
      await page.locator('.admin-content-row').getByRole('button', { name: 'Edit', exact: true }).click();
      const editor = page.locator('.admin-editor-panel');
      const previousStyle = await editor.getByRole('heading', { level: 2 }).evaluate(headingStyle);
      await editor.getByRole('button', { name: 'Close', exact: true }).click();
      await filters.getByText('Advanced signs', { exact: true }).click();
      await filters.getByLabel('Calendar aspect first sign', { exact: true }).selectOption('aquarius');
      await expect(page.locator('.admin-content-row')).toHaveCount(0);
      await expect(action.getByRole('button')).toHaveCount(0);
      await filters.getByLabel('Calendar aspect second sign', { exact: true }).selectOption('scorpio');
      for (const field of ['Calendar aspect planet or point', 'Calendar aspect type', 'Other calendar aspect planet or point', 'Calendar aspect first sign', 'Calendar aspect second sign']) {
        await expect(filters.getByLabel(field, { exact: true })).not.toHaveAttribute('required', '');
      }
      await expect(action.locator('strong')).toHaveText(title);
      await expect(action.getByRole('button', { name: 'Add write-up', exact: true })).toBeEnabled();
      expect(await action.locator('strong, p, button').allTextContents()).toEqual([title, 'Add a write-up for this exact aspect. It starts as a draft for your review.', 'Add write-up']);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await page.screenshot({ path: `test-results/calendar-create-empty-${width}-${theme}.png`, fullPage: true });
      if (width === 1440 && theme === 'light') {
        failLookup = true;
        await action.getByRole('button', { name: 'Add write-up', exact: true }).click();
        await expect(page.getByRole('status').filter({ hasText: 'Could not open this write-up.' })).toBeVisible();
        await expect(editor).toHaveCount(0);
        expect(writes).toBe(0);
        failLookup = false;
        await page.getByRole('button', { name: 'Create', exact: true }).click();
        await page.getByRole('menuitem', { name: /Add aspect write-up/ }).click();
      } else await action.getByRole('button', { name: 'Add write-up', exact: true }).click();
      const heading = editor.getByRole('heading', { name: `Write ${title}`, exact: true });
      await expect(heading).toHaveJSProperty('tagName', 'H2');
      expect(await heading.evaluate(headingStyle)).toEqual(previousStyle);
      await expect(editor.getByLabel('Content key', { exact: true })).toHaveValue(key);
      const body = editor.getByRole('textbox', { name: 'Full passage / body', exact: true });
      await expect(body).toHaveValue('');
      await body.fill(passage);
      await editor.getByRole('button', { name: 'Save', exact: true }).click();
      await expect(editor).toContainText('All changes saved');
      await expect(editor.getByRole('heading', { name: `Edit ${title}`, exact: true })).toHaveJSProperty('tagName', 'H2');
      await expect(body).toHaveValue(passage);
      const rows = await store.call({ method: 'rows' });
      expect(rows).toHaveLength(2);
      expect(rows.find((row: any) => row.content_key === key)).toMatchObject({ status: 'DRAFT', body: passage, summary: '', facts: { a: 'moon', signA: 'aquarius', aspect: 'square', b: 'venus', signB: 'scorpio' }, source_snapshot: { contentType: 'owner-authored-sky-aspect', authoringSource: 'admin-dashboard-calendar-aspect', review_status: 'needs_review' } });
      expect(rows.find((row: any) => row.id === generic.id)).toEqual(generic);
      await expect(page.locator('.admin-dashboard')).toHaveAttribute('data-theme', theme);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await page.screenshot({ path: `test-results/calendar-create-editor-${width}-${theme}.png` });
      await editor.getByRole('button', { name: 'Close', exact: true }).click();
      await page.reload();
      await expect(action.getByRole('button', { name: 'Open write-up', exact: true })).toBeEnabled();
      await filters.getByRole('searchbox', { name: 'Find an aspect', exact: true }).fill('unmatched search');
      await expect(page.locator('.admin-content-row')).toHaveCount(0);
      await action.getByRole('button', { name: 'Open write-up', exact: true }).click();
      await expect(body).toHaveValue(passage);
      expect(writes).toBe(1);
      await expect(editor.getByRole('button', { name: 'Approve & schedule', exact: true })).toBeDisabled();
      await editor.getByRole('button', { name: 'Run writing checks', exact: true }).click();
      await expect(editor.getByRole('button', { name: 'Approve & schedule', exact: true })).toBeEnabled();
      await editor.getByRole('button', { name: 'Approve & schedule', exact: true }).click();
      await expect.poll(async () => (await store.call({ method: 'rows' })).find((row: any) => row.content_key === key)?.status).toBe('LIVE');
      const live = (await store.call({ method: 'rows' })).find((row: any) => row.content_key === key);
      expect(live.source_snapshot.review_status).toBe('approved');
      await page.unroute('**/api/**');
      await bundledPublications(page);
      await page.route('**/api/content-reader', async route => {
        const keys = route.request().postDataJSON().keys ?? [];
        const genericLive = { ...generic, status: 'LIVE', review_state: null, source_snapshot: { contentStudioExactAspect: true, exactSkyAspectIdentity: { a: 'moon', b: 'venus', aspect: 'square' } } };
        await route.fulfill({ json: readerResponse([genericLive, live].filter(row => keys.includes(row.content_key))) });
      });
      await page.clock.setFixedTime(new Date('2026-09-22T13:00:00Z'));
      await page.addInitScript(() => localStorage.setItem('tldrastro:selectedLocation', JSON.stringify({ label: 'New York, NY', latitude: 40.7128, longitude: -74.006, timeZone: 'America/New_York' })));
      await page.goto('/?date=2026-09-22#calendar?view=day&date=2026-09-22');
      const card = page.locator('.calendar-day-events .calendar-stoic-card').filter({ hasText: /Moon squares Venus/ });
      await expect(card).toContainText('Complete synthetic opening.', { timeout: 60000 });
      await expect(card).toContainText('Complete synthetic final sentence.');
      await expect(card).not.toContainText(generic.body);
      await card.click();
      const detail = page.getByRole('dialog', { name: 'Event detail' });
      await expect(detail).toContainText('Complete synthetic opening.');
      await expect(detail).toContainText('Complete synthetic final sentence.');
      expect(errors).toEqual([]);
    } finally { store.close(); }
  });
}

for (const existingKey of [key, 'sky.aspect.venus.square.moon.scorpio.aquarius', 'sky-card/moon/aquarius/square/venus/scorpio', 'sky-card/venus/scorpio/square/moon/aquarius', 'fallback-hook/sky-aspect-sign/moon/aquarius/square/venus/scorpio', 'fallback-hook/sky-aspect-sign/venus/scorpio/square/moon/aquarius']) {
  test(`Calendar exact creation finds hidden existing ${existingKey}`, async ({ page }) => {
    const store = await studioApiStore([{ ...generic, id: 'hidden-exact', content_key: existingKey, status: 'ARCHIVED', body: passage }]);
    let writes = 0;
    try {
      await page.addInitScript(() => localStorage.setItem('tldrastro:contentAdminSecret', 'calendar-api-fixture'));
      await routeStudioInventoryApi(page, { call: store.call, listRows: () => [], onWrite: () => { writes++; } });
      await page.goto(exactUrl);
      await page.getByRole('region', { name: 'Exact aspect write-up', exact: true }).getByRole('button', { name: 'Add write-up', exact: true }).click();
      const editor = page.locator('.admin-editor-panel');
      await expect(editor.getByLabel('Content key', { exact: true })).toHaveValue(existingKey);
      await expect(editor.getByRole('textbox', { name: /^(Full passage \/ body|Reader copy)$/ })).toHaveValue(passage);
      await expect(editor.getByRole('heading', { level: 2 })).toContainText('Edit ');
      expect(writes).toBe(0);
      expect(await store.call({ method: 'rows' })).toHaveLength(1);
    } finally { store.close(); }
  });
}
