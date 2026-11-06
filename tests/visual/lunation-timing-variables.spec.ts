import {test, expect} from '@playwright/test';
import {studioApiStore} from '../helpers/studio-api-store';
import {routeStudioInventoryApi} from '../helpers/studio-inventory-route';
import {lunationPublicationDraft} from '../helpers/lunation-publication.mjs';

for (const [phase, width, theme] of [['new-moon', 1440, 'light'], ['full-moon', 390, 'dark']] as const) {
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
      await variables.getByRole('button', {name: 'Insert {{startDate}}', exact: true}).click();
      await expect(field).toHaveValue('Synthetic timing: {{startDate}}');
      await variables.getByRole('button', {name: 'Close variables', exact: true}).click();
      await field.fill('Synthetic timing: {{startDate}} at ');
      await field.press('End');
      await editor.getByRole('button', {name: /Variables \(2\)|Reader preview & variables \(2\)/}).click();
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
