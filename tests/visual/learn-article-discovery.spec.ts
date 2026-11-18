import { expect, test } from '@playwright/test';
import { astro101RevisionFixture } from '../helpers/astro101-revision-fixture';
import { studioApiStore } from '../helpers/studio-api-store';
import { emptyLastKnownGoodSnapshot } from '../helpers/bundled-publications';

for (const width of [390, 1440]) for (const theme of ['light', 'dark']) {
  test(`Published Learn articles are discoverable and archive cleanly ${width} ${theme}`, async ({ page }, info) => {
    test.setTimeout(90_000);
    const article = astro101RevisionFixture('article');
    const chapter = { ...astro101RevisionFixture('chapter', 'all'), status: 'LIVE' };
    const named = (id: number, name: string, status: string, hubTitle: string, extra = {}) => ({
      ...article, id: `cccccccc-cccc-4ccc-8ccc-${String(id).padStart(12, '0')}`,
      content_key: `education/astro-101/article/${name}`, headline: name, status,
      facts: { slug: `/learn/astro-101/${name}` }, sections: { ...article.sections, hubTitle }, ...extra
    });
    const hidden = [
      named(1, 'Hidden draft', 'DRAFT', 'Private group'),
      named(2, 'Hidden archive', 'ARCHIVED', 'Private group'),
      named(3, 'Hidden reference', 'LIVE', 'Private group', { lane: 'reference' }),
      named(4, 'Hidden review', 'LIVE', 'Private group', { review_state: 'EDITORIAL_REVIEW_REQUIRED' })
    ];
    const fieldNote = named(5, 'Synthetic field note', 'LIVE', 'Field notes');
    const secondNote = named(7, 'Second field note', 'LIVE', 'Field notes');
    const old = { ...named(6, article.headline, 'ARCHIVED', 'Articles'), content_key: article.content_key };
    const store = await studioApiStore([article, chapter, fieldNote, secondNote, old, ...hidden], { uuidIds: true, projectSelect: true, sqlArticleLifecycle: true });
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    try {
      await page.setViewportSize({ width, height: 1000 });
      await page.addInitScript(theme => localStorage.setItem('tldrastro:theme', theme), theme);
      await emptyLastKnownGoodSnapshot(page);
      await page.route('**/rest/v1/**', route => route.fulfill({ json: [] }));
      await page.route('**/api/content-reader', async route => {
        const result = await store.call({ method: 'POST', url: '/api/content-reader', body: route.request().postDataJSON() });
        await route.fulfill({ status: result.status, json: result.payload });
      });
      const card = () => page.getByRole('button', { name: `${article.headline} ${article.summary}`, exact: true });
      await page.goto('/learn');
      await expect(page.getByRole('heading', { name: 'Astro 101', exact: true })).toBeVisible();
      await expect(card()).toHaveCount(0);
      const publish = await store.call({ method: 'PATCH', body: { id: article.id, ownerAction: 'publish-owner-content' } });
      expect(publish.status, JSON.stringify(publish.payload)).toBe(200);
      await page.reload();
      await expect(card()).toHaveCount(1);
      await expect(page.getByRole('heading', { name: 'Articles', exact: true })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Field notes', exact: true })).toHaveCount(1);
      await expect(page.getByRole('button', { name: `${fieldNote.headline} ${fieldNote.summary}`, exact: true })).toHaveCount(1);
      await expect(page.getByRole('button', { name: `${secondNote.headline} ${secondNote.summary}`, exact: true })).toHaveCount(1);
      await expect(page.getByRole('button', { name: `${chapter.headline} ${chapter.summary}`, exact: true })).toHaveCount(1);
      await expect(page.getByRole('region', { name: 'The twelve houses', exact: true }).getByRole('link')).toHaveCount(12);
      await expect(page.getByRole('region', { name: 'The twelve zodiac signs', exact: true }).getByRole('button')).toHaveCount(12);
      await expect(page.getByRole('heading', { name: 'Private group', exact: true })).toHaveCount(0);
      for (const row of hidden) await expect(page.getByText(row.headline, { exact: true })).toHaveCount(0);
      const typography = (element: Element) => {
        const style = getComputedStyle(element);
        return [style.fontFamily, style.fontSize, style.fontWeight, style.lineHeight, style.letterSpacing, style.textTransform, style.textAlign];
      };
      expect(await page.getByRole('heading', { name: 'Articles', exact: true }).evaluate(typography))
        .toEqual(await page.getByRole('heading', { name: 'The twelve zodiac signs', exact: true }).evaluate(typography));
      const headingBounds = await page.getByRole('heading', { name: 'Articles', exact: true }).boundingBox();
      const cardBounds = await card().boundingBox();
      expect(headingBounds!.y + headingBounds!.height).toBeLessThanOrEqual(cardBounds!.y);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.getByRole('heading', { name: 'Articles', exact: true }).scrollIntoViewIfNeeded();
      await page.screenshot({ path: info.outputPath(`learn-articles-${width}-${theme}.png`) });
      await card().click();
      await expect(page).toHaveURL(new RegExp(`${article.facts.slug}$`));
      await expect(page.getByRole('heading', { name: article.headline, exact: true })).toBeVisible();
      await expect(page.getByText(article.sections.intro, { exact: true })).toBeVisible();
      await expect(page.getByText(article.sections.blocks[0].body, { exact: true })).toBeVisible();
      await page.reload();
      await expect(page.getByText(article.sections.blocks[0].body, { exact: true })).toBeVisible();
      await page.getByRole('button', { name: 'Back to Astro 101', exact: true }).click();
      await expect(page).toHaveURL(/\/learn$/);
      await expect(card()).toHaveCount(1);
      const archive = await store.call({ method: 'PATCH', body: { id: article.id, status: 'ARCHIVED' } });
      expect(archive.status).toBe(200);
      await page.reload();
      await expect(card()).toHaveCount(0);
      await expect(page.getByRole('heading', { name: 'Articles', exact: true })).toHaveCount(0);
      await expect(page.getByRole('heading', { name: 'Field notes', exact: true })).toBeVisible();
      await page.goto(article.facts.slug);
      await expect(page.getByRole('heading', { name: 'Page not found', exact: true })).toBeVisible();
      expect(errors).toEqual([]);
    } finally { await page.unrouteAll({ behavior: 'ignoreErrors' }); store.close(); }
  });
}
