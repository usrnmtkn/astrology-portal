import { test, expect } from '@playwright/test';
test.use({ timezoneId: 'America/New_York' });
import { mkdirSync } from 'node:fs';
import { studioApiStore } from '../helpers/studio-api-store';
import { routeStudioInventoryApi } from '../helpers/studio-inventory-route';
import { workspaceVisitFacts } from '../helpers/sky-placement-workspace-fixtures';
import { placementVisitDraft } from '../../apps/admin/src/skyPlacementWorkspaceModel';
import { reviseSkyArticleEdition, skyArticleEditableFields } from '../../apps/web/src/content/skyArticleTemplateCompiler';

for (const theme of ['light', 'dark']) for (const width of [1440, 390]) {
  test(`Sky CMS article workflow ${theme} ${width}`, async ({ page }) => {
    const facts = { ...workspaceVisitFacts('mercury', 'scorpio', '2026-10-24', '2026-11-13'),
      articlePeriod: 'current' as const, motion: 'retrograde' as const, periodLabel: 'Retrograde in this sign',
      slotValues: { articleTitle: 'Mercury Rx in Scorpio 2026', when: 'October 24, 2026 at 3:12 AM ET to November 13, 2026 at 10:53 AM ET' } };
    const article = await placementVisitDraft(facts, { headline: 'Mercury Rx in Scorpio 2026', summary: 'Synthetic summary retained exactly.',
      body: 'Synthetic complete opening.\n\nSynthetic final sentence.' });
    const initial = { id: 'mercury-rx-draft', content_key: article.contentKey, surface: 'sky', mode: 'article', status: 'DRAFT',
      lane: 'reference', event_type: article.eventType, sections: article.sections, headline: article.headline, body: article.body,
      summary: article.summary, source_snapshot: article.sourceSnapshot, facts: article.facts, updated_at: '2026-10-30T12:00:00.000Z' };
    const store = await studioApiStore([initial]);
    const writes: unknown[] = [], generation: string[] = [], errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewportSize({ width, height: 1000 });
    await page.addInitScript(theme => {
      localStorage.setItem('tldrastro:contentAdminSecret', 'calendar-api-fixture');
      localStorage.setItem('tldrastro:studio-theme', theme);
    }, theme);
    await routeStudioInventoryApi(page, { call: store.call, actualDocumentRoute: true,
      onWrite: write => writes.push(write), answer: async (route, url) => {
        if (url.pathname === '/api/admin/content-live-status') {
          const body = route.request().postDataJSON();
          await route.fulfill({ json: body.action === 'composition-catalog' ? { ok: true, rows: [] }
            : { ok: true, statuses: await store.call({ method: 'statuses', body }) } });
          return true;
        }
        if (url.pathname === '/api/admin/sky-article-facts') {
          await route.fulfill({ json: { ok: true, facts } }); return true;
        }
        if (url.pathname === '/api/admin/sky-article-template-slots') {
          generation.push(url.pathname); await route.abort(); return true;
        }
        return false;
      } });
    try {
      await page.goto(`${process.env.STUDIO_PRODUCTION_ENTRY === '1' ? '/admin/content' : '/'}#sky-writeups?planet=mercury&sign=scorpio`);
      const workspace = page.getByRole('region', { name: 'Mercury in Scorpio workspace', exact: true });
      await expect(workspace.getByRole('button', { name: 'Edit', exact: true })).toBeVisible();
      mkdirSync('test-results/sky-cms', { recursive: true });
      await page.evaluate(() => document.fonts.ready);
      if (process.env.SKY_CMS_BASELINE === '1') {
        await workspace.scrollIntoViewIfNeeded();
        await page.screenshot({ path: `test-results/sky-cms/before-${theme}-${width}.png` });
        return;
      }
      await expect(workspace.getByRole('tab', { name: 'Articles', exact: true })).toHaveAttribute('aria-selected', 'true');
      if (width > 900) await expect(workspace.getByRole('columnheader')).toHaveText(['Article', 'Period', 'Status', 'Updated', 'Actions']);
      else await expect(workspace.locator('td[data-label]')).toHaveCount(5);
      await expect(workspace.getByRole('table', { name: 'Saved articles' })).toContainText('Oct 24, 2026');
      await expect(workspace.getByRole('table', { name: 'Saved articles' })).toContainText('Nov 13, 2026');
      await expect(workspace.getByRole('region', { name: 'Sky placement reader sources' })).toHaveCount(0);
      await workspace.getByRole('button', { name: 'Edit', exact: true }).click();
      const editor = workspace.getByRole('region', { name: 'Article for this visit', exact: true });
      const body = editor.getByLabel('Visit article body', { exact: true });
      await expect(body).toHaveValue(initial.body);
      const settings = editor.getByRole('complementary', { name: 'Article settings' });
      const heading = settings.getByRole('heading', { name: 'Article settings', exact: true });
      if (width < 900) expect((await body.boundingBox())!.y).toBeLessThan((await settings.boundingBox())!.y);
      await expect(heading).toHaveCSS('font-size', '16px');
      await expect(heading).toHaveCSS('font-weight', '600');
      await expect(settings.locator('dd').first()).toHaveCSS('font-size', '16px');
      await expect(settings.locator('dd').first()).toHaveCSS('line-height', '24px');
      await expect(settings).toContainText('October 24, 2026');
      await expect(settings).toContainText('November 13, 2026');
      await expect(editor.getByRole('button', { name: 'Save draft', exact: true })).toBeDisabled();
      await editor.getByLabel('Visit article title', { exact: true }).fill('Synthetic revised Mercury article');
      await editor.getByRole('button', { name: 'Save draft', exact: true }).click();
      await expect(workspace.getByText('Draft saved. Nothing was published.', { exact: true })).toBeVisible();
      expect(writes).toHaveLength(1);
      await page.reload();
      await workspace.getByRole('button', { name: 'Edit', exact: true }).click();
      await expect(editor.getByLabel('Visit article title', { exact: true })).toHaveValue('Synthetic revised Mercury article');
      await expect(body).toHaveValue(initial.body);
      await expect(settings).toContainText('November 13, 2026');
      await editor.scrollIntoViewIfNeeded();
      await page.screenshot({ path: `test-results/sky-cms/after-editor-${theme}-${width}.png` });
      await editor.getByRole('button', { name: 'Back to articles', exact: true }).click();
      await expect(body).toHaveCount(0);
      await workspace.scrollIntoViewIfNeeded();
      await page.screenshot({ path: `test-results/sky-cms/after-list-${theme}-${width}.png` });
      await workspace.getByLabel('Search saved articles').fill('no matching article');
      await expect(workspace.getByText('No articles match these filters.', { exact: true })).toBeVisible();
      await workspace.getByLabel('Search saved articles').fill('');
      await workspace.getByRole('button', { name: 'New article', exact: true }).click();
      await workspace.getByLabel('Visit reference date').fill('2026-10-31');
      await expect(workspace.getByLabel('Article coverage')).toHaveValue('current');
      await workspace.getByRole('button', { name: 'Write article', exact: true }).click();
      await expect(body).toHaveValue(initial.body);
      await expect(settings).toContainText('November 13, 2026');
      expect(writes).toHaveLength(1);
      await editor.getByLabel('Visit article title', { exact: true }).fill('Synthetic unsaved conflict');
      const saved = (await store.call({ method: 'rows' })).find((row: any) => row.id === initial.id);
      const revised = await reviseSkyArticleEdition(saved.sections.skyArticleEdition, { ...skyArticleEditableFields(saved.sections.skyArticleEdition), headline: 'Synthetic concurrent edit' });
      const external = await store.call({ method: 'PATCH', body: { id: initial.id, expectedUpdatedAt: saved.updated_at,
        ownerAction: 'save-sky-article-edition-revision', sections: { skyArticleEdition: revised } } });
      expect(external.status, JSON.stringify(external.payload)).toBe(200);
      await editor.getByRole('button', { name: 'Save draft', exact: true }).click();
      await expect(workspace.getByRole('alert')).toContainText('changed in another editor');
      await expect(editor.getByLabel('Visit article title', { exact: true })).toHaveValue('Synthetic unsaved conflict');
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      expect(generation).toEqual([]); expect(errors).toEqual([]);
      const stored = await store.call({ method: 'rows' });
      expect(stored.find((row: any) => row.id === initial.id).sections.skyArticleEdition.transitStartInstant).toBe(facts.transitStartInstant);
      expect(stored.find((row: any) => row.id === initial.id).sections.skyArticleEdition.transitEndInstant).toBe(facts.transitEndInstant);
    } finally { await page.unrouteAll({ behavior: 'wait' }); store.close(); }
  });
}

for (const [width, theme] of [[1440, 'dark'], [390, 'light']] as const) {
  test(`Sky CMS empty, calculation error and full-period creation ${theme} ${width}`, async ({ page }) => {
    const facts = { ...workspaceVisitFacts('mercury', 'scorpio', '2026-10-24', '2026-11-13'), articlePeriod: 'current', motion: 'retrograde', periodLabel: 'Retrograde in this sign' };
    const store = await studioApiStore([]);
    let failCalculation = true;
    await page.setViewportSize({ width, height: 1000 });
    await page.addInitScript(theme => {
      localStorage.setItem('tldrastro:contentAdminSecret', 'calendar-api-fixture');
      localStorage.setItem('tldrastro:studio-theme', theme);
    }, theme);
    await routeStudioInventoryApi(page, { call: store.call, actualDocumentRoute: true, answer: async (route, url) => {
      if (url.pathname === '/api/admin/content-live-status') {
        const body = route.request().postDataJSON();
        if (body.action === 'composition-catalog') await route.fulfill({ json: { ok: true, rows: [] } });
        else {
          const result = await store.call({ method: 'POST', body, url: '/api/admin/content-live-status' });
          await route.fulfill({ status: result.status, json: result.payload });
        }
        return true;
      }
      if (url.pathname !== '/api/admin/sky-article-facts') return false;
      expect(url.searchParams.get('period')).toBe('current');
      expect(url.searchParams.get('date')).toBe('2026-10-31');
      await route.fulfill(failCalculation ? { status: 503, json: { ok: false, error: 'Synthetic calculation unavailable.' } } : { json: { ok: true, facts } });
      return true;
    } });
    try {
      await page.goto(`${process.env.STUDIO_PRODUCTION_ENTRY === '1' ? '/admin/content' : '/'}#sky-writeups?planet=mercury&sign=scorpio`);
      const workspace = page.getByRole('region', { name: 'Mercury in Scorpio workspace', exact: true });
      await expect(workspace.getByText('No articles yet.', { exact: false })).toBeVisible();
      await workspace.getByRole('button', { name: 'New article', exact: true }).click();
      await workspace.getByLabel('Visit reference date').fill('2026-10-31');
      await workspace.getByRole('button', { name: 'Write article', exact: true }).click();
      await expect(workspace.getByRole('alert')).toBeVisible();
      expect(await store.call({ method: 'rows' })).toEqual([]);
      failCalculation = false;
      await workspace.getByRole('button', { name: 'Write article', exact: true }).click();
      const editor = workspace.getByRole('region', { name: 'Article for this visit', exact: true });
      await editor.getByLabel('Visit article title', { exact: true }).fill('Synthetic full retrograde article');
      await editor.getByLabel('Visit article body', { exact: true }).fill('Synthetic new opening.\n\nSynthetic new final sentence.');
      await editor.getByLabel('Visit article summary', { exact: true }).fill('Synthetic new summary.');
      await editor.getByRole('button', { name: 'Save draft', exact: true }).click();
      await expect(workspace.getByText('Draft saved. Nothing was published.', { exact: true })).toBeVisible();
      const saved = (await store.call({ method: 'rows' }))[0];
      expect(saved.status).toBe('DRAFT');
      expect(saved.sections.skyArticleEdition.transitStartInstant).toBe(facts.transitStartInstant);
      expect(saved.sections.skyArticleEdition.transitEndInstant).toBe(facts.transitEndInstant);
      await page.reload();
      await workspace.getByRole('button', { name: 'Edit', exact: true }).click();
      await expect(editor.getByLabel('Visit article body', { exact: true })).toHaveValue(saved.body);
      await expect(editor.getByRole('complementary', { name: 'Article settings' })).toContainText('Retrograde in this sign');
      const publication = editor.getByLabel('Publication settings', { exact: true });
      await expect(publication).toContainText('Leave blank to publish now.');
      await publication.getByLabel('Publication date and time').fill('2099-01-15T09:30');
      await publication.getByRole('button', { name: 'Save publication date', exact: true }).click();
      await expect(publication.getByRole('button', { name: 'Save publication date', exact: true })).toBeDisabled();
      await expect(publication.getByRole('status')).toHaveText('Publication date saved. Approval is still required.');
      await publication.getByRole('button', { name: 'Approve & schedule', exact: true }).click();
      await expect(publication.getByRole('button', { name: 'Cancel schedule', exact: true })).toBeVisible();
      await page.reload();
      await workspace.getByLabel('Article status', { exact: true }).selectOption('scheduled');
      await expect(workspace.getByRole('table', { name: 'Saved articles' })).toContainText('Scheduled');
      await workspace.getByRole('button', { name: 'Edit', exact: true }).click();
      await expect(publication.getByLabel('Publication date and time')).toHaveValue('2099-01-15T09:30');
      expect((await store.call({ method: 'POST', body: { keys: [saved.content_key] }, url: '/api/content-reader' })).payload.rows).toEqual([]);
      const scheduledRow = (await store.call({ method: 'rows' })).find((row: any) => row.id === saved.id);
      await publication.getByLabel('Publication date and time').fill('2027-03-14T02:30');
      await publication.getByRole('button', { name: 'Save publication date', exact: true }).click();
      await expect(publication.getByRole('alert')).toHaveText('Choose a valid local date and time.');
      expect((await store.call({ method: 'rows' })).find((row: any) => row.id === saved.id).source_snapshot.skyArticlePublication).toEqual(scheduledRow.source_snapshot.skyArticlePublication);
      await publication.getByRole('button', { name: 'Cancel schedule', exact: true }).click();
      await expect(publication.getByRole('button', { name: 'Cancel schedule', exact: true })).toHaveCount(0);
      await expect(publication.getByRole('alert')).toHaveCount(0);
      await publication.getByLabel('Publication date and time').fill('2026-09-20T09:30');
      await publication.getByRole('button', { name: 'Approve & publish', exact: true }).click();
      await expect(publication).toContainText('Published');
      const published = (await store.call({ method: 'rows' })).find((row: any) => row.id === saved.id);
      expect(published.status).toBe('LIVE');
      expect(published.published_at).toBe('2026-09-20T13:30:00.000Z');
      expect(published.sections.skyArticleEdition).toEqual(saved.sections.skyArticleEdition);
      expect((await store.call({ method: 'POST', body: { keys: [saved.content_key] }, url: '/api/content-reader' })).payload.rows[0].body).toBe(saved.body);
      await page.reload();
      await workspace.getByLabel('Article status', { exact: true }).selectOption('LIVE');
      await expect(workspace.getByRole('table', { name: 'Saved articles' })).toContainText('Published');
      await workspace.getByRole('button', { name: 'Edit', exact: true }).click();
      await expect(publication).toContainText('Choose a previous date and time.');
      await expect(publication).not.toContainText('Leave blank to publish now.');
      await publication.getByLabel('Publication date and time').fill('2026-09-19T09:30');
      await publication.getByRole('button', { name: 'Save publication date', exact: true }).click();
      await expect(publication.getByRole('status')).toHaveText('Publication date updated.');
      const corrected = (await store.call({ method: 'rows' })).find((row: any) => row.id === saved.id);
      expect(corrected.status).toBe('LIVE');
      expect(corrected.published_at).toBe('2026-09-19T13:30:00.000Z');
      expect(corrected.body).toBe(saved.body);
      expect(corrected.sections.skyArticleEdition).toEqual(saved.sections.skyArticleEdition);
      await page.reload();
      await workspace.getByRole('button', { name: 'Edit', exact: true }).click();
      await expect(publication.getByLabel('Publication date and time')).toHaveValue('2026-09-19T09:30');
      await expect(editor.getByLabel('Visit article body', { exact: true })).toHaveValue(saved.body);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    } finally { await page.unrouteAll({ behavior: 'wait' }); store.close(); }
  });
}
