import { test, expect } from '@playwright/test';
import { studioApiStore } from '../helpers/studio-api-store';
import { bundledPublications } from '../helpers/bundled-publications';
import { canonicalPublicationLedger, publicationLedgerTag } from '../../apps/web/src/services/publicationLedgerTransport';
import { calendarPlanetaryDraft } from '../../apps/admin/src/calendarPlanetaryDraft';

const cases = [
  { view: 'planetary-ingresses', label: 'Planetary ingresses', key: 'sky.ingress.mercury.scorpio', planet: 'mercury', field: 'Enters sign', sign: 'scorpio', direction: 'direct', date: '2026-09-30', title: 'Mercury enters Scorpio' },
  { view: 'planetary-stations', label: 'Planetary stations', key: 'sky.station.venus.scorpio.retrograde', planet: 'venus', field: 'Station sign', sign: 'scorpio', direction: 'retrograde', date: '2026-10-03', title: 'Venus stations retrograde' },
  { view: 'planetary-stations', label: 'Planetary stations', key: 'sky.station.venus.libra.direct', planet: 'venus', field: 'Station sign', sign: 'libra', direction: 'direct', date: '2026-11-13', title: 'Venus stations direct' }
] as const;
const passageFor = (item: typeof cases[number]) => `Synthetic ${item.title} opening.\n\nComplete synthetic ${item.title} ${item.sign} final sentence.`;
const typography = (element: Element) => {
  const style = getComputedStyle(element);
  return Object.fromEntries(['fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'marginTop', 'marginBottom', 'textTransform', 'textAlign'].map(key => [key, style[key as keyof CSSStyleDeclaration]]));
};

for (const legacy of [false,true]) for (const width of [390, 1440]) for (const theme of ['light', 'dark'] as const) {
  test(`Planetary workspaces save, reopen, publish and reach Calendar ${width} ${theme}${legacy?' legacy NULL block':''}`, async ({ page }) => {
    test.setTimeout(150_000);
    const store = await studioApiStore([], { uuidIds: true, sqlCalendarLifecycle: true });
    const publishedBodies = new Map<string,string>(cases.map(item => [item.key, passageFor(item)]));
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    let failLookup = false;
    const publicationsReply = async () => {
      const publications = canonicalPublicationLedger(await store.call({ method: 'publications' }));
      return {headers:{etag:await publicationLedgerTag(publications)},json:{schema:'tldr-publications/v1',publications}};
    };
    try {
      await page.context().route('**/*', route => new URL(route.request().url()).pathname.startsWith('/api/') || !['GET', 'HEAD'].includes(route.request().method()) ? route.abort() : route.continue());
      // Studio also loads and caches the publication ledger. Isolate it before
      // the first navigation so real row identities cannot reject fixture rows.
      await bundledPublications(page);
      await page.setViewportSize({ width, height: 1000 });
      await page.emulateMedia({ colorScheme: theme });
      await page.addInitScript(value => {
        localStorage.setItem('tldrastro:contentAdminSecret', 'calendar-api-fixture');
        localStorage.setItem('tldrastro:studio-theme', value);
        localStorage.setItem('tldrastro:theme', value);
        localStorage.setItem('tldrastro:selectedLocation', JSON.stringify({ label: 'New York, NY', latitude: 40.7128, longitude: -74.006, timeZone: 'America/New_York' }));
      }, theme);
      await page.route('**/api/**', async route => {
        const request = route.request();
        const url = new URL(request.url());
        if (url.pathname === '/api/content-publications') return route.fulfill(await publicationsReply());
        if (url.pathname === '/api/content-reader') {
          const result = await store.call({method:'POST',url:url.pathname,body:request.postDataJSON()});
          return route.fulfill({status:result.status,json:result.payload});
        }
        if (['/api/admin/generated-content-inventory', '/api/admin/generated-content'].includes(url.pathname)) {
          if (failLookup && url.searchParams.has('contentKeys')) return route.fulfill({ status: 503, json: { ok: false, error: 'Synthetic lookup failure' } });
          const result = await store.call({ method: request.method(), url: url.pathname + url.search, body: request.method() === 'GET' ? undefined : request.postDataJSON() });
          return route.fulfill({ status: result.status, json: result.payload });
        }
        if (url.pathname === '/api/admin/content-live-status') {
          const body = request.postDataJSON();
          return route.fulfill({ json: body.action === 'composition-catalog' ? { ok: true, rows: [] } : { ok: true, statuses: await store.call({ method: 'statuses', body }) } });
        }
        return route.fulfill({ json: { ok: true, rows: [], statuses: [], nextCursor: null } });
      });

      for (const item of cases) {
        const passage = passageFor(item);
        await page.goto(`/admin/content#calendar-writeups?view=${item.view}`);
        await expect(page.getByRole('heading', { name: 'Calendar Write-ups', exact: true })).toHaveJSProperty('tagName', 'H1');
        await expect(page.getByRole('heading', { name: 'Calendar writing workspaces', exact: true })).toHaveJSProperty('tagName', 'H2');
        const tabs = page.getByRole('tablist', { name: 'Calendar Write-ups workspaces' });
        const tab = tabs.getByRole('tab', { name: item.label, exact: true });
        await expect(tab).toHaveAttribute('aria-selected', 'true');
        expect(await tab.evaluate(typography)).toEqual(await tabs.getByRole('tab', { name: 'Lunar ingresses', exact: true }).evaluate(typography));
        const names = await tabs.getByRole('tab').allTextContents();
        expect(names.slice(names.indexOf('Lunar ingresses'), names.indexOf('Lunar ingresses') + 5)).toEqual(['Lunar ingresses', 'Moon transition phrases', 'Planetary ingresses', 'Planetary stations', 'Season write-ups']);
        const workspace = page.getByRole('region', { name: item.label, exact: true });
        await workspace.getByLabel('Planet or point', { exact: true }).selectOption('');
        await workspace.getByLabel(item.field, { exact: true }).selectOption('');
        if (item.view === 'planetary-stations') await workspace.getByLabel('Station direction', { exact: true }).selectOption(item.direction);
        await expect(workspace).toContainText('No saved write-ups match this selection.');
        await expect(workspace.getByRole('button', { name: 'Open write-up', exact: true })).toBeDisabled();
        await workspace.getByLabel('Planet or point', { exact: true }).selectOption(item.planet);
        await workspace.getByLabel(item.field, { exact: true }).selectOption(item.sign);
        await page.screenshot({ path: `test-results/${item.view}-empty-${width}-${theme}.png`, fullPage: true });
        if (width === 1440 && theme === 'light' && item.view === 'planetary-ingresses') {
          failLookup = true;
          await workspace.getByRole('button', { name: 'Open write-up', exact: true }).click();
          await expect(page.getByRole('status').filter({ hasText: 'Could not open this write-up.' })).toBeVisible();
          await expect(page.getByRole('dialog', { name: 'Generated content editor' })).toHaveCount(0);
          expect(await store.call({ method: 'rows' })).toEqual([]);
          failLookup = false;
        }
        if (legacy) {
          const {id:_,...draft}=calendarPlanetaryDraft(item.view==='planetary-ingresses'?'ingress':'station',{planet:item.planet,sign:item.sign,direction:item.direction})!;
          const created=await store.call({method:'POST',url:'/api/admin/generated-content',body:{...draft,blockType:null,eventType:'calendar_event'}});
          expect(created.status).toBe(200);
        }
        await workspace.getByRole('button', { name: 'Open write-up', exact: true }).click();
        const editor = page.getByRole('dialog', { name: 'Generated content editor' });
        await expect(editor.getByRole('heading', { level: 2 })).toContainText(`${legacy?'Edit':'Write'} ${item.title}`);
        await expect(editor.getByLabel('Content key', { exact: true })).toHaveValue(item.key);
        const body = editor.getByLabel('Event write-up', { exact: true });
        await expect(body).toHaveValue('');
        await expect(editor.getByRole('button', { name: 'Save & publish', exact: true })).toBeDisabled();
        await body.fill(passage);
        await editor.getByRole('button', { name: 'Save draft', exact: true }).click();
        await expect(editor).toContainText('All changes saved');
        expect((await store.call({ method: 'rows' })).find((row: any) => row.content_key === item.key)).toMatchObject({ status: 'DRAFT', body: passage });
        await editor.getByRole('button', { name: 'Close', exact: true }).click();
        await page.reload();
        if (item.view === 'planetary-stations') await workspace.getByLabel('Station direction', { exact: true }).selectOption(item.direction);
        const edit = workspace.getByRole('button', { name: `Edit ${item.key}`, exact: true });
        await expect(edit).toBeVisible();
        await edit.click();
        await expect(body).toHaveValue(passage);
        await editor.getByRole('button', { name: 'Save & publish', exact: true }).click();
        await expect.poll(async () => (await store.call({ method: 'rows' })).find((row: any) => row.content_key === item.key)?.status).toBe('LIVE');
        await expect(editor.getByRole('alert')).toHaveCount(0);
        await editor.getByRole('button', { name: 'Close', exact: true }).click();
        await expect(workspace.getByRole('table').getByText('Live', { exact: true })).toBeVisible();
        await workspace.getByLabel('Planet or point', { exact: true }).selectOption(item.planet);
        await workspace.getByLabel(item.field, { exact: true }).selectOption(item.sign);
        await workspace.getByRole('button', { name: 'Open write-up', exact: true }).click();
        await expect(body).toHaveValue(passage);
        await expect(editor.getByRole('heading', { level: 2 })).toContainText(`Edit ${item.title}`);
        {
          const before = await store.call({ method: 'POST', url: '/api/content-reader', body: { keys: [item.key] } });
          expect(before.payload.rows[0].body).toBe(passage);
          await body.fill(`${passage}\n\nSynthetic private draft ending.`);
          await editor.getByRole('button', { name: width === 1440 && theme === 'light' && item.direction === 'direct' && item.view === 'planetary-stations' ? 'Mark reviewed' : 'Save draft', exact: true }).click();
          await expect(editor).toContainText('All changes saved');
          const after = await store.call({ method: 'POST', url: '/api/content-reader', body: { keys: [item.key] } });
          expect(after.payload.rows.map((row: any) => row.body)).toEqual([passage]);
          const live = (await store.call({ method: 'rows' })).find((row: any) => row.id === before.payload.rows[0].id);
          expect(live.body).toBe(passage);expect(live.status).toBe('LIVE');
          expect(live.block_type).toBe(legacy?null:'calendar_event');
          await editor.getByRole('button', { name: 'Close', exact: true }).click();await page.reload();
          await workspace.getByLabel('Planet or point', { exact: true }).selectOption(item.planet);
          await workspace.getByLabel(item.field, { exact: true }).selectOption(item.sign);
          if (item.view === 'planetary-stations') await workspace.getByLabel('Station direction', { exact: true }).selectOption(item.direction);
          await workspace.getByRole('button', { name: 'Open write-up', exact: true }).click();
          const revised = `${passage}\n\nSynthetic private draft ending.`;
          await expect(body).toHaveValue(revised);
          if (width === 1440 && theme === 'light' && item.view === 'planetary-stations') {
            if (item.direction === 'retrograde') await editor.getByRole('button', { name: 'Mark reviewed', exact: true }).click();
            await expect(editor.getByRole('button', { name: 'Reviewed', exact: true })).toBeDisabled();
            await expect(editor.getByRole('alert')).toHaveCount(0);
            expect((await store.call({ method: 'POST', url: '/api/content-reader', body: { keys: [item.key] } })).payload.rows.map((row: any) => row.body)).toEqual([passage]);
          }
          await editor.getByRole('button', { name: width === 390 && theme === 'dark' && item.view === 'planetary-stations' ? 'Publish to app' : 'Save & publish', exact: true }).click();
          await expect.poll(async () => (await store.call({ method: 'POST', url: '/api/content-reader', body: { keys: [item.key] } })).payload.rows.map((row: any) => row.body)).toEqual([revised]);
          publishedBodies.set(item.key, revised);
          if (width === 1440 && theme === 'light' && item.view === 'planetary-ingresses') {
            const more = editor.locator('details.admin-editor-more-actions');
            await more.locator('summary').click();await editor.getByRole('button', { name: 'Archive source', exact: true }).click();
            await expect.poll(async () => (await store.call({ method: 'POST', url: '/api/content-reader', body: { keys: [item.key] } })).payload.rows).toEqual([]);
            await editor.getByRole('button', { name: 'Close', exact: true }).click();await page.reload();
            await workspace.getByLabel('Planet or point', { exact: true }).selectOption(item.planet);
            await workspace.getByLabel(item.field, { exact: true }).selectOption(item.sign);
            await workspace.getByRole('button', { name: 'Open write-up', exact: true }).click();
            await expect(body).toHaveValue(revised);
            if (await more.getAttribute('open') === null) await more.locator('summary').click();
            await editor.getByRole('button', { name: 'Restore as draft', exact: true }).click();
            await expect(editor.getByRole('button', { name: 'Archive source', exact: true })).toBeVisible();
            expect((await store.call({ method: 'POST', url: '/api/content-reader', body: { keys: [item.key] } })).payload.rows).toEqual([]);
            await editor.getByRole('button', { name: 'Save & publish', exact: true }).click();
            await expect.poll(async () => (await store.call({ method: 'POST', url: '/api/content-reader', body: { keys: [item.key] } })).payload.rows.map((row: any) => row.body)).toEqual([revised]);
          }
        }
        await editor.getByRole('button', { name: 'Close', exact: true }).click();
        if (item.view === 'planetary-stations') {
          await workspace.getByLabel('Station direction', { exact: true }).selectOption(item.direction === 'direct' ? 'retrograde' : 'direct');
          await expect(edit).toHaveCount(0);
          await workspace.getByLabel('Station direction', { exact: true }).selectOption(item.direction);
          await expect(edit.first()).toBeVisible();
        }
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.screenshot({ path: `test-results/${item.view}-saved-${width}-${theme}.png`, fullPage: true });
      }

      const saved = (await store.call({ method: 'rows' })).filter((row: any) => row.status === 'LIVE');
      expect(saved).toHaveLength(cases.length);
      await page.unrouteAll({ behavior: 'wait' });
      await bundledPublications(page);
      await page.route('**/api/content-publications', async route => route.fulfill(await publicationsReply()));
      await page.route('**/api/content-reader', async route => {
        const result = await store.call({method:'POST',url:'/api/content-reader',body:route.request().postDataJSON()});
        return route.fulfill({status:result.status,json:result.payload});
      });
      for (const item of cases) {
        await page.goto(`/?date=${item.date}#calendar?view=day&date=${item.date}`);
        const card = page.locator('.calendar-day-events .calendar-stoic-card').filter({ hasText: item.title });
        await expect(card).toContainText(`Synthetic ${item.title} opening.`, { timeout: 45_000 });
        await card.click();
        const detail = page.locator('.sky-detail-article');
        await expect(detail.locator('#sky-detail-title')).toContainText(item.planet === 'venus' ? 'Venus' : 'Mercury');
        const body = detail.locator('.sky-detail-body .article-body-inner').first();
        await expect(body.locator('p').first()).not.toBeEmpty();
        await expect(body.locator('p')).toHaveText(publishedBodies.get(item.key)!.split('\n\n'));
        await expect(page.getByRole('dialog', { name: 'Event detail', exact: true })).toHaveCount(0);
        const paragraphs = await body.locator('p').allTextContents();
        await page.reload();
        await expect(body.locator('p')).toHaveText(paragraphs, { timeout: 60000 });
      }
      expect(errors).toEqual([]);
    } finally { await page.unrouteAll({ behavior: 'wait' }); await page.close(); store.close(); }
  });
}
