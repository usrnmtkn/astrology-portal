import { test, expect } from '@playwright/test';
import { studioApiStore } from '../helpers/studio-api-store';
import { routeStudioInventoryApi } from '../helpers/studio-inventory-route';
import { workspaceVisitFacts } from '../helpers/sky-placement-workspace-fixtures';
import { placementVisitDraft } from '../../apps/admin/src/skyPlacementWorkspaceModel';
import { WRITEUP_HOROSCOPE_SIGNS } from '../../src/shared/skyWriteupHoroscopes';

for (const width of [1440, 390]) for (const theme of ['light', 'dark']) {
  test(`write-up sign horoscopes save and reopen ${width} ${theme}`, async ({ page }) => {
    const facts = workspaceVisitFacts('mercury', 'scorpio', '2026-10-24', '2026-11-13');
    const article = await placementVisitDraft(facts, { headline: 'Mercury Rx in Scorpio 2026', summary: 'Synthetic complete summary.', body: 'Synthetic opening.\n\nSynthetic article final sentence.' });
    const initial = { id: 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa', content_key: article.contentKey, status: 'DRAFT', surface: 'sky', mode: 'article',
      lane: 'reference', review_state: 'owner-review-required', event_type: article.eventType, block_type: 'sky_article', sections: article.sections,
      headline: article.headline, body: article.body, summary: article.summary, source_snapshot: article.sourceSnapshot, updated_at: '2026-10-30T12:00:00Z' };
    const store = await studioApiStore([initial]);
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    await page.setViewportSize({ width, height: 1000 });
    await page.addInitScript(theme => { localStorage.setItem('tldrastro:contentAdminSecret', 'calendar-api-fixture'); localStorage.setItem('tldrastro:studio-theme', theme); }, theme);
    await routeStudioInventoryApi(page, { call: store.call, actualDocumentRoute: true });
    const title = (s: string) => s[0].toUpperCase() + s.slice(1);
    const passage = (s: string) => `Synthetic ${s} opening.\n\nSynthetic ${s} complete final sentence.`;
    try {
      await page.goto(`${process.env.STUDIO_PRODUCTION_ENTRY === '1' ? '/admin/content' : '/'}#sky-writeups?planet=mercury&sign=scorpio`);
      const workspace = page.getByRole('region', { name: 'Mercury in Scorpio workspace', exact: true });
      await workspace.getByRole('button', { name: 'Edit', exact: true }).click();
      await workspace.getByRole('button', { name: 'Horoscopes', exact: true }).click();
      const panel = page.getByRole('dialog', { name: 'Horoscopes for this write-up', exact: true });
      await expect(panel).toHaveClass(/studio-writeup-horoscopes-panel/u);
      await expect(panel).toHaveCSS('overflow-y', 'hidden');
      await expect(panel.locator('.studio-side-panel-content')).toHaveCSS('overflow-y', 'auto');
      await expect(panel.getByRole('group', { name: 'Write-up horoscope signs' }).getByRole('button')).toHaveCount(12);
      await expect(panel.getByText(/0 of 12 signs entered/u)).toBeVisible();
      await expect(panel).toContainText('2026');
      await panel.getByLabel('Aries write-up horoscope', { exact: true }).fill(passage('aries'));
      await panel.getByRole('button', { name: 'Save draft', exact: true }).click();
      await expect(panel.getByText('Draft saved. Nothing was published.', { exact: true })).toBeVisible();
      await expect(panel.getByRole('button', { name: 'Approve & publish', exact: true })).toBeDisabled();
      await panel.getByRole('button', { name: 'Back to write-up', exact: true }).click();
      await expect(workspace.getByRole('button', { name: 'Approve & publish', exact: true })).toBeDisabled();
      await expect(workspace.getByLabel('Visit article body', { exact: true })).toHaveValue(initial.body);
      await page.reload(); await workspace.getByRole('button', { name: 'Edit', exact: true }).click();
      await workspace.getByRole('button', { name: 'Horoscopes', exact: true }).click();
      await expect(panel.getByLabel('Aries write-up horoscope', { exact: true })).toHaveValue(passage('aries'));
      for (const sign of WRITEUP_HOROSCOPE_SIGNS.slice(1)) {
        await panel.getByRole('group', { name: 'Write-up horoscope signs' }).getByRole('button', { name: title(sign), exact: true }).click();
        await panel.getByLabel(`${title(sign)} write-up horoscope`, { exact: true }).fill(passage(sign));
      }
      await expect(panel.getByText(/12 of 12 signs entered/u)).toBeVisible();
      await panel.getByRole('button', { name: 'Close Horoscopes for this write-up', exact: true }).click();
      await workspace.getByRole('button', { name: 'Horoscopes', exact: true }).click();
      await expect(panel.getByLabel('Pisces write-up horoscope', { exact: true })).toHaveValue(passage('pisces'));
      await panel.getByRole('button', { name: 'Save draft', exact: true }).click();
      await expect(panel.getByText('Draft saved. Nothing was published.', { exact: true })).toBeVisible();
      await expect(panel.getByRole('button', { name: 'Approve & publish', exact: true })).toBeEnabled();
      await expect(panel).toContainText('These readings publish with the write-up in its Horoscopes by rising sign section.');
      await expect(panel.getByRole('heading', { name: 'Horoscopes for this write-up' })).toHaveCSS('font-family', /system-ui/);
      await panel.getByLabel('Pisces write-up horoscope', { exact: true }).scrollIntoViewIfNeeded();
      const header = await panel.getByRole('heading', { name: 'Horoscopes for this write-up' }).boundingBox();
      const field = await panel.getByLabel('Pisces write-up horoscope', { exact: true }).boundingBox();
      expect(field!.y).toBeGreaterThan(header!.y + header!.height);
      const content = await panel.locator('.studio-side-panel-content').boundingBox();
      expect(content!.y).toBeGreaterThanOrEqual(header!.y + header!.height);
      expect(await panel.evaluate(node => node.scrollTop)).toBe(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: test.info().outputPath('writeup-horoscopes.png') });
      const scheduled = width === 1440 && theme === 'light';
      const publicationDate = scheduled ? '2030-10-24T12:00' : theme === 'dark' ? '2026-10-24T08:00' : '';
      const expectedPublishedAt = publicationDate ? await page.evaluate(value => new Date(value).toISOString(), publicationDate) : null;
      if (publicationDate) await panel.getByLabel('Publication date and time', { exact: true }).fill(publicationDate);
      await panel.getByRole('button', { name: scheduled ? 'Approve & schedule' : 'Approve & publish', exact: true }).click();
      await expect(panel.getByText(scheduled ? 'Publication scheduled. The saved article stays private until release.' : 'Article published with the selected publication date.', { exact: true })).toBeVisible();
      await page.reload();
      const saved = (await store.call({ method: 'rows' })).find((r: any) => r.id === initial.id);
      expect(saved.status).toBe(scheduled ? 'DRAFT' : 'LIVE');
      if (scheduled) expect(saved.source_snapshot.skyArticlePublication.state).toBe('scheduled');
      else if (expectedPublishedAt) expect(saved.published_at).toBe(expectedPublishedAt);
      expect(saved.sections.skyArticleEdition.writeupHoroscopes).toEqual(WRITEUP_HOROSCOPE_SIGNS.map(sign => ({ sign, body: passage(sign) })));
      expect(saved.sections.skyArticleEdition.transitStartInstant).toBe(article.sections.skyArticleEdition.transitStartInstant);
      expect(saved.sections.skyArticleEdition.transitEndInstant).toBe(article.sections.skyArticleEdition.transitEndInstant);
      expect(errors).toEqual([]);
    } finally { store.close(); }
  });
}
