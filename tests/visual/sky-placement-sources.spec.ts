import { test, expect } from '@playwright/test';
import { studioApiStore } from '../helpers/studio-api-store';
import { canonicalPublicationLedger, publicationLedgerTag } from '../../apps/web/src/services/publicationLedgerTransport';
import { routeStudioInventoryApi } from '../helpers/studio-inventory-route';
import { skyPlacementSourceFixture } from '../helpers/sky-placement-source-fixture.mts';

for (const [width, theme] of [[390, 'light'], [390, 'dark'], [1440, 'light'], [1440, 'dark']] as const) {
  test(`Placement reader sources preserve draft isolation and open Sky at ${width} ${theme}`, async ({ page, context }) => {
    await page.clock.install({ time: new Date('2026-10-21T12:00:00Z') });
    test.setTimeout(180_000);
    const fixture = await skyPlacementSourceFixture();
    const store = await studioApiStore([fixture.active, fixture.pending, fixture.fallback]);
    const call = store.call;
    try {
      const errors: string[] = [], writes: any[] = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.setViewportSize({ width, height: 1000 });
      await page.addInitScript(theme => {
        localStorage.setItem('tldrastro:contentAdminSecret', 'calendar-api-fixture');
        localStorage.setItem('tldrastro:studio-theme', theme);
      }, theme);
      let failStatus = false;
      await routeStudioInventoryApi(page, { call, actualDocumentRoute: true, onWrite: write => writes.push(write), answer: async (route, url) => {
        if (url.pathname === '/api/content-publications') {
          const publications = canonicalPublicationLedger(await call({ method: 'publications' }));
          await route.fulfill({ headers: { etag: await publicationLedgerTag(publications) }, json: { schema: 'tldr-publications/v1', publications } }); return true;
        }
        if (url.pathname === '/api/calendar') { await route.fulfill({ json: { ok: true, calendar: { days: [] } } }); return true; }
        if (url.pathname === '/api/content-reader') {
          const result = await call({ method: 'POST', url: url.pathname, body: route.request().postDataJSON() });
          await route.fulfill({ status: result.status, json: result.payload }); return true;
        }
        if (url.pathname !== '/api/admin/content-live-status') return false;
        if (failStatus) await route.fulfill({ status: 503, json: { ok: false, error: 'Synthetic status outage.' } });
        else {
          const result = await call({ method: 'POST', url: url.pathname, body: route.request().postDataJSON() });
          await route.fulfill({ status: result.status, json: result.payload });
        }
        return true;
      } });
      await page.route('**/content-studio-last-known-good.json', route => route.fulfill({ json: { schema: 'content-studio-last-known-good-v2', rows: [], publications: [], rowCount: 0 } }));
      await page.route('**/rest/v1/**', async route => route.fulfill({ json: new URL(route.request().url()).pathname.endsWith('/content_publications') ? await call({ method: 'publications' }) : [] }));
      const choosePlacement = async () => {
        await page.getByLabel('Sky placement planet or point').selectOption('saturn');
        await page.getByLabel('Sky placement zodiac sign').selectOption('aries');
      };
      const entry = process.env.STUDIO_PRODUCTION_ENTRY === '1' ? '/admin/content' : '/';
      await page.goto(`${entry}#sky-writeups`);
      await choosePlacement();
      const summary = page.getByRole('region', { name: 'Sky placement reader sources', exact: true });
      await expect(summary.getByRole('button', { name: 'Edit active article', exact: true })).toBeVisible();
      await expect(summary.getByRole('button', { name: 'Open pending revision', exact: true })).toBeVisible();
      await expect(summary.getByRole('button', { name: 'Edit shared fallback', exact: true })).toBeVisible();
      await expect(summary.getByText('Article window: 2026-09-22 to 2026-10-23', { exact: true })).toBeVisible();
      await expect(summary.getByRole('heading', { level: 3, name: 'Reader sources' })).toBeVisible();
      const expectReaderLink = async (name: string, searchAndHash: string) => {
        const frameOrigin = new URL((await summary.locator('iframe').getAttribute('src'))!).origin;
        const link = new URL((await summary.getByRole('link', { name, exact: true }).getAttribute('href'))!, page.url());
        expect(link.origin).toBe(frameOrigin);
        expect(link.pathname + link.search + link.hash).toBe(searchAndHash);
      };
      await expectReaderLink('Read in Sky', '/?date=2026-10-21#/sky/placement/saturn/aries');
      await expectReaderLink('Export what readers see', '/?date=2026-10-21&studioExport=sky-article-csv#/sky/placement/saturn/aries');
      await expect(summary.getByRole('link')).toHaveText(['Export what readers see', 'Read in Sky']);
      const buttonFill = (element: HTMLElement) => getComputedStyle(element).backgroundColor;
      expect(await summary.getByRole('link', { name: 'Export what readers see', exact: true }).evaluate(buttonFill))
        .not.toBe(await summary.getByRole('link', { name: 'Read in Sky', exact: true }).evaluate(buttonFill));
      expect(writes).toEqual([]);
      await summary.getByRole('button', { name: 'Open pending revision', exact: true }).click();
      const editor = page.getByRole('dialog');
      await expect(editor.getByLabel('Sky article general copy', { exact: true })).toHaveValue(fixture.pending.body);
      await expect(editor.getByRole('heading', { level: 2, name: /Edit/ })).toBeVisible();
      const headingStyles = (element: HTMLElement) => {
        const style = getComputedStyle(element);
        return [style.fontFamily, style.fontSize, style.fontWeight, style.lineHeight, style.letterSpacing, style.textTransform];
      };
      expect(await summary.getByRole('heading', { name: 'Reader sources' }).evaluate(headingStyles))
        .toEqual(await editor.getByRole('heading', { name: 'Edit the reader experience' }).evaluate(headingStyles));
      const workspace=editor.getByLabel('Dated Sky article workspace',{exact:true});
      for (const title of ['How this article is assembled','Article variables','Publication sources']) {
        const disclosure=editor.locator('details').filter({has:page.locator(':scope > summary').filter({hasText:new RegExp(`^${title}$`)})});
        await expect(disclosure).not.toHaveAttribute('open','');
      }
      const saveDraft=workspace.getByRole('button',{name:'Save draft',exact:true});
      await expect(saveDraft).toBeVisible();
      await expect(saveDraft).toBeDisabled();
      const field=workspace.getByLabel('Sky article general copy',{exact:true});
      const fieldBox=await field.boundingBox(),saveBox=await saveDraft.boundingBox();
      expect(saveBox!.y-fieldBox!.y-fieldBox!.height).toBeLessThan(140);
      const assembly=editor.getByLabel('Passage variable values');
      await assembly.locator(':scope > summary').click();
      await expect(assembly.getByText('No variables in this field. Its complete wording is stored directly in the dated article.',{exact:true})).toBeVisible();
      await assembly.locator(':scope > summary').click();
      const summaryStyles=await assembly.locator(':scope > summary').evaluate(headingStyles);
      expect(summaryStyles).toEqual(await editor.getByText('Article variables',{exact:true}).evaluate(headingStyles));
      const editCopy = 'Synthetic revised opening.\n\nSynthetic revised final sentence.';
      // The clock keeps running during the browser/runner round trip. Pause
      // before editing, with enough virtual time to avoid targeting the past.
      // This advances simulated time; it adds no real wait or deadline.
      await page.clock.pauseAt(await page.evaluate(()=>Date.now()+5000));
      await field.fill(editCopy);
      await expect(saveDraft).toBeEnabled();
      await saveDraft.click();
      await page.clock.runFor(1);
      await expect(editor.getByText('Draft saved · Changes not published', { exact: true })).toBeVisible();
      await expect(workspace.getByRole('status',{name:'Sky draft save status'})).toContainText('Draft saved');
      expect(writes.filter(write=>write.body.ownerAction==='save-sky-article-edition-revision')).toHaveLength(1);
      await expect(saveDraft).toBeDisabled();
      await page.clock.resume();
      expect((await call({ method: 'rows' })).find((row: any) => row.id === fixture.active.id).body).toBe(fixture.active.body);
      await page.reload();
      await choosePlacement();
      await summary.getByRole('button', { name: 'Open pending revision', exact: true }).click();
      await expect(editor.getByLabel('Sky article general copy', { exact: true })).toHaveValue(editCopy);
      const writesBeforeNavigation = writes.length;
      await summary.getByText('Publication sources', { exact: true }).click();
      await summary.getByRole('button', { name: 'Edit shared fallback', exact: true }).click();
      await expect(editor.locator('textarea[data-sky-field="placementArticle"]')).toHaveValue(fixture.fallback.body);
      await editor.getByRole('button', { name: /^Back to/ }).click();
      await expect(editor.getByLabel('Sky article general copy', { exact: true })).toHaveValue(editCopy);
      expect(writes.length).toBe(writesBeforeNavigation);
      const popupPromise = context.waitForEvent('page');
      await summary.getByRole('link', { name: 'Read in Sky', exact: true }).click();
      const popup = await popupPromise;
      await expect(popup).toHaveURL(/#\/sky\/placement\/saturn\/aries$/);
      await popup.close();
      await editor.screenshot({ path: `test-results/sky-placement-sources-${width}-${theme}.png` });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await editor.getByRole('button', { name: 'Done', exact: true }).click();
      await page.getByLabel('Sky placement zodiac sign').selectOption('pisces');
      await expect(summary.locator('p').filter({ hasText: /^Editing:/ })).toHaveText('Editing: Saturn in Pisces');
      await expect(summary.locator('p').filter({ hasText: /^Readers see:/ })).toContainText('Saturn in Aries');
      await expect(summary.getByRole('button', { name: 'Edit active article', exact: true })).toBeVisible();
      await expect(summary.getByText('No saved article revision is pending.', { exact: true })).toBeVisible();
      await expectReaderLink('Read in Sky', '/?date=2026-10-21#/sky/placement/saturn/aries');
      failStatus = true;
      await page.reload();
      await choosePlacement();
      await expect(summary.getByText(/Reader sources could not be verified:/)).toBeVisible();
      await expect(summary.getByText('No published dated article is active now.', { exact: true })).toHaveCount(0);
      failStatus = false;
      await summary.getByRole('button', { name: 'Retry sources', exact: true }).click();
      await expect(summary.getByRole('button', { name: 'Edit active article', exact: true })).toBeVisible();
      expect(errors).toEqual([]);
    } finally {
      store.close();
    }
  });
}
