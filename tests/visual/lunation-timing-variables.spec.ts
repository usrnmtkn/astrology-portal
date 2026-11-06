import {test, expect} from '@playwright/test';
import {studioApiStore} from '../helpers/studio-api-store';
import {routeStudioInventoryApi} from '../helpers/studio-inventory-route';
import {lunationPublicationDraft} from '../helpers/lunation-publication.mjs';

for (const phase of ['new-moon', 'full-moon'] as const) for (const [width, theme] of [[1440, 'light'], [1440, 'dark'], [390, 'light'], [390, 'dark']] as const) {
  test(`Lunation timing insertion and saved preview ${phase} ${width} ${theme}`, async ({page}) => {
    const draft = lunationPublicationDraft();
    draft.content_key = `authored/sky-lunation-macro/${phase}/aquarius`;
    for (const record of Object.values(draft.sections)) record.contentKey = draft.content_key;
    const store = await studioApiStore([draft]);
    const errors: string[] = [];
    try {
      await page.setViewportSize({width, height: 1000});
      page.on('pageerror', error => errors.push(error.message));
      await page.addInitScript(theme => {
        localStorage.setItem('tldrastro:contentAdminSecret', 'calendar-api-fixture');
        localStorage.setItem('tldrastro:studio-theme', theme);
      }, theme);
      await page.context().route('**/*', route => new URL(route.request().url()).pathname.startsWith('/api/')
        || !['GET', 'HEAD'].includes(route.request().method()) ? route.abort() : route.continue());
      await routeStudioInventoryApi(page, {call: store.call});
      await page.goto('/admin/content#calendar-writeups?view=lunation-writing&writing=library');
      const library = page.getByRole('region', {name: 'Saved lunation write-ups', exact: true});
      await library.getByRole('button', {name: 'Edit passage', exact: true}).click();
      const editor = page.getByRole('dialog', {name: 'Generated content editor'});
      const field = editor.getByLabel('Full lunar passage', {exact: true});
      await expect(field).toHaveValue(draft.body);
      await field.fill('Synthetic timing: ');
      await field.press('End');
      await editor.getByRole('button', {name: 'Variables (2)', exact: true}).click();
      const variables = page.getByRole('complementary', {name: 'Template variable reference'});
      await expect(variables.getByRole('button', {name: 'Insert {{endDate}}', exact: true})).toHaveCount(0);
      await variables.locator('.admin-variables-rail-row', {hasText: '{{startDate}}'}).click();
      const detail = variables.getByRole('region', {name: /variable details$/});
      await expect(detail).toContainText('Example value');
      await expect(detail.getByRole('region', {name: 'Calculated value example'})).toContainText('September 26');
      await expect(detail).not.toContainText('No saved passage to review');
      const path = detail.getByRole('navigation', {name: 'Variable path'});
      const back = await path.getByRole('button', {name: 'All variables'}).boundingBox();
      const label = await path.locator('strong').boundingBox();
      expect(back).not.toBeNull(); expect(label).not.toBeNull();
      expect(label!.x).toBeGreaterThan(back!.x + back!.width);
      const properties = ['fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing'] as const;
      const expectedBody = await field.evaluate((element, keys) => keys.map(key => getComputedStyle(element)[key]), properties);
      expect(await detail.locator('p').first().evaluate((element, keys) => keys.map(key => getComputedStyle(element)[key]), properties)).toEqual(expectedBody);
      const help = variables.locator('summary[aria-label="Template syntax help"]');
      await help.press('Enter');
      const guide = variables.getByRole('region', {name: 'Template syntax guide'});
      await expect(guide).toBeVisible();
      for (const typography of await guide.locator('dd > span').evaluateAll((items, keys) => items.map(element => keys.map(key => getComputedStyle(element)[key])), properties)) expect(typography).toEqual(expectedBody);
      const guideBox = await guide.boundingBox(), railBox = await variables.boundingBox(), detailBox = await detail.boundingBox();
      expect(guideBox!.x).toBeGreaterThanOrEqual(railBox!.x);
      expect(guideBox!.x + guideBox!.width).toBeLessThanOrEqual(railBox!.x + railBox!.width);
      expect(guideBox!.y + guideBox!.height).toBeLessThanOrEqual(detailBox!.y);
      expect(await variables.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
      await page.screenshot({path: `test-results/lunation-variable-help-${phase}-${width}-${theme}.png`});
      await help.press('Space');
      await expect(guide).toBeHidden();
      await page.screenshot({path: `test-results/lunation-variable-detail-${phase}-${width}-${theme}.png`});
      await detail.getByRole('button', {name: 'All variables'}).click();
      await variables.getByRole('searchbox', {name: 'Find a variable'}).fill('no-matching-variable');
      await expect(variables).toContainText('No matching variables');
      await variables.getByRole('searchbox', {name: 'Find a variable'}).fill('');

      await variables.getByRole('button', {name: 'Insert {{startDate}}', exact: true}).click();
      await expect(field).toHaveValue('Synthetic timing: {{startDate}}');
      await variables.getByRole('button', {name: 'Close variables', exact: true}).click();
      await field.fill('Synthetic timing: {{startDate}} at ');
      await field.press('End');
      await editor.getByRole('button', {name: /Variables \(2\)|Reader preview & variables \(2\)/}).click();
      await variables.locator('.admin-variables-rail-row', {hasText: '{{startTime}}'}).click();
      await expect(detail.getByRole('region', {name: 'Calculated value example'})).toContainText('12:49 PM EDT');
      await detail.getByRole('button', {name: 'All variables'}).click();
      await variables.getByRole('button', {name: 'Insert {{startTime}}', exact: true}).click();
      await variables.getByRole('button', {name: 'Close variables', exact: true}).click();
      const savedBody = 'Synthetic timing: {{startDate}} at {{startTime}}.\n\nSynthetic complete final sentence.';
      await field.fill(savedBody);
      await editor.getByRole('button', {name: 'Save draft', exact: true}).click();
      await expect.poll(async () => (await store.call({method: 'rows'}))[0].sections.packageDraft.body).toBe(savedBody);
      await editor.getByRole('button', {name: 'Close', exact: true}).click();
      await page.reload();
      await library.getByRole('button', {name: 'Review composition and variables', exact: true}).click();
      await expect(library).toContainText('Synthetic timing: September 26 at 12:49 PM EDT.');
      await expect(library).toContainText('Synthetic complete final sentence.');
      await page.screenshot({path: `test-results/lunation-timing-${phase}-${width}-${theme}.png`, fullPage: true});
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      expect(errors).toEqual([]);
      const saved = (await store.call({method: 'rows'}))[0];
      expect(saved.sections.packageOriginalRecord.body).toBe(draft.body);
      expect(saved.sections.packageDraft.body).toBe(savedBody);
    } finally {store.close();}
  });
}
