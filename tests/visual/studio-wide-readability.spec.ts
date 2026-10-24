import { test, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { studioApiStore } from '../helpers/studio-api-store';
import { routeStudioInventoryApi } from '../helpers/studio-inventory-route';
import { bundledPublications } from '../helpers/bundled-publications';
import { sectionFixtures } from '../helpers/studio-section-fixtures.mjs';
import { expectStudioPanel, expectStudioReadingType } from '../helpers/studio-readability';

const views = [
  'review-queue', 'unresolved-content', 'exact-content', 'horoscopes', 'ai-writing',
  'variables', 'articles-guides', 'astro-101', 'compatibility', 'composite-review',
  'composition-map', 'templates', 'slots', 'vocabulary', 'fallback-hooks',
  'surface-map', 'content/aspect-patterns', 'connection-transits',
  'exact-content?category=Natal+Chart', 'exact-content?category=Natal+Aspects',
  'exact-content?category=Calendar+Aspects',
  'sky-writeups?view=transits-to-natal', 'sky-writeups?view=house-transits',
  'sky-writeups?view=daily-summary', 'calendar-writeups?view=planetary-stations',
] as const;
const titles = ['Review Queue','Unresolved Content','Content Library','Horoscopes','AI Writing','Variables','Articles & Guides','Astro 101','Compatibility','Composite Review','Composition Map','Templates','Slots','Vocabulary & Phrases','Fallback Articles & Passages','Surface Map','Aspect Patterns','Connection Transits','Natal Chart Write-ups','Natal Aspect Write-ups','Calendar Aspect Cards','Sky Write-ups','Sky Write-ups','Sky Write-ups','Calendar Write-ups'];

for (const [width, theme] of [[390, 'dark'], [1440, 'light'], [390, 'light'], [1440, 'dark']] as const) {
  test(`Studio remaining surfaces readability ${width} ${theme}`, async ({ page, context }) => {
    test.setTimeout(180_000);
    const store = await studioApiStore(sectionFixtures);
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    const observations: unknown[] = [];
    try {
      await page.setViewportSize({ width, height: 1000 });
      await context.route('**/*', route => new URL(route.request().url()).pathname.startsWith('/api/') || !['GET', 'HEAD'].includes(route.request().method()) ? route.abort() : route.continue());
      await bundledPublications(page);
      await page.addInitScript(theme => {
        localStorage.setItem('tldrastro:contentAdminSecret', 'calendar-api-fixture');
        localStorage.setItem('tldrastro:studio-theme', theme);
      }, theme);
      await routeStudioInventoryApi(page, { call: store.call, answer: async (route, url) => {
        if (url.pathname !== '/api/admin/content-live-status') return false;
        const body = route.request().postDataJSON();
        await route.fulfill({ json: body.action === 'composition-catalog'
          ? { ok: true, rows: sectionFixtures }
          : { ok: true, statuses: await store.call({ method: 'statuses', body }) } });
        return true;
      } });
      mkdirSync('test-results/studio-wide-readability', { recursive: true });
      for (const view of views) {
        await page.goto('/admin/content#' + view);
        await expect(page.locator('h1')).toHaveCount(1);
        await expect(page.locator('h1')).toHaveText(titles[views.indexOf(view)]);
        await expect(page.locator('.admin-sidebar-status')).toContainText('Connected');
        await page.evaluate(() => document.fonts.ready);
        if (view === 'variables') {
          await page.getByLabel('Library',{exact:true}).selectOption('readonly');
          await expect(page.locator('.studio-variable-card').first()).toBeVisible();
        }
        if (view === 'compatibility') {
          await page.locator('.admin-new-actions').getByRole('button',{name:'Card copy',exact:true}).click();
          const editor=page.getByRole('dialog',{name:'Generated content editor'});
          await editor.getByLabel('Compatibility card planet',{exact:true}).selectOption('mars');
          await editor.getByLabel('Compatibility card reader sign',{exact:true}).selectOption('pisces');
          await editor.getByLabel('Compatibility card friend sign',{exact:true}).selectOption('aquarius');
          const notification=page.getByRole('button',{name:'Dismiss notification',exact:true});
          if (await notification.isVisible()) await notification.click();
          const identity=editor.locator('.admin-compatibility-identity-preview');
          await expectStudioPanel(identity);
          await expectStudioReadingType(identity.locator('strong'),'label');
          expect(await identity.locator('strong').evaluate(node=>{const s=getComputedStyle(node);return [s.marginTop,s.marginBottom,s.textTransform,s.textAlign];})).toEqual(['0px','0px','none','start']);
          await expectStudioReadingType(identity.locator('span'));
          await identity.scrollIntoViewIfNeeded();
          await page.screenshot({path:`test-results/studio-wide-readability/compatibility-identity-${width}-${theme}.png`});
          page.once('dialog',dialog=>dialog.accept());
          await editor.getByRole('button',{name:'Close',exact:true}).click();
        }
        if (view === 'composite-review') {
          const preview=page.getByLabel('Single voice fallback').first();
          await expectStudioPanel(preview);
          await expectStudioReadingType(preview.locator('p'));
          const variants=page.locator('.admin-dependency-map-grid').first();
          await expect(variants.locator(':scope > article')).toHaveCount(7);
          expect(await variants.locator(':scope > article > span').allTextContents()).toEqual(['romantic / gated','friendship','family','coworkers','creative','exes','complicated']);
          await expectStudioPanel(variants.locator(':scope > article').first());
          await expectStudioReadingType(variants.locator(':scope > article > span').first(),'label');
          expect(await variants.locator(':scope > article > span').first().evaluate(node=>{const s=getComputedStyle(node);return [s.marginTop,s.marginBottom,s.textTransform,s.textAlign];})).toEqual(['0px','0px','none','start']);
          await expectStudioReadingType(variants.locator('p').first());
          await variants.evaluate(node=>node.scrollIntoView({block:'start'}));
          await page.screenshot({path:`test-results/studio-wide-readability/composite-variants-${width}-${theme}.png`});
          await page.evaluate(()=>window.scrollTo(0,0));
        }
        if (view === 'composition-map') {
          const source=page.getByRole('region',{name:'Manage composition sources'});
          await source.getByRole('button',{name:'Search all Studio sources',exact:true}).click();
          const row=sectionFixtures.find(row=>row.content_key==='authored/station/mercury/rx')!;
          await source.getByLabel('Selected composition source',{exact:true}).selectOption(row.id);
          await expect(source.locator('.admin-composition-source-copy').first()).toBeVisible();
          await expect(source.locator('.admin-composition-source-copy').first()).toHaveText(row.body);
          await expect(source.locator('.admin-composition-source-copy').first()).toHaveCSS('white-space','pre-wrap');
          await expectStudioReadingType(source.locator('.admin-composition-source-copy').first());
          await source.evaluate(node=>node.scrollIntoView({block:'start'}));
          await page.screenshot({path:`test-results/studio-wide-readability/composition-source-${width}-${theme}.png`});
          await page.evaluate(()=>window.scrollTo(0,0));
        }
        const observation = await page.locator('.admin-main').evaluate(node => ({
          heading: node.querySelector('h1')?.textContent,
          overflow: document.documentElement.scrollWidth - innerWidth,
          flatGroups: [...node.querySelectorAll('section,article,dl,div[class]')].filter(element => {
            const children = [...element.children].filter(child => child.matches('p,dt,dd'));
            const s = getComputedStyle(element);
            return children.length >= 3 && !['grid', 'flex'].includes(s.display) && s.rowGap === 'normal';
          }).slice(0, 12).map(element => ({ className: element.className, label: element.getAttribute('aria-label'), text: element.textContent?.slice(0, 100) })),
        }));
        observations.push({ view, ...observation });
        expect(observation.overflow, view).toBeLessThanOrEqual(1);
        await page.screenshot({ path: `test-results/studio-wide-readability/${view.split('?')[0].replaceAll('/','-')}-${views.indexOf(view)}-${width}-${theme}.png` });
      }
      expect(errors).toEqual([]);
      expect(await store.call({ method: 'rows' })).toEqual(sectionFixtures);
    } finally {
      writeFileSync(`test-results/studio-wide-readability/observations-${width}-${theme}.json`, JSON.stringify(observations, null, 2));
      await page.unrouteAll({ behavior: 'ignoreErrors' });
      await context.unrouteAll({ behavior: 'ignoreErrors' });
      await page.close();
      store.close();
    }
  });
}
