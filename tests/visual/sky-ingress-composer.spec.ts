import { expect, test } from '@playwright/test';
import { skyPlacementSourceRecords } from '../../api/_lib/sky-placement-sources';
const key = 'sky-placement/article/saturn/aries';
const baseSource = skyPlacementSourceRecords.get(key)!;
const virtual = (contentKey: string) => {
 const source = skyPlacementSourceRecords.get(contentKey);
 return source ? { id: `package:${contentKey}`, content_key: contentKey, surface: 'sky', mode: 'in_depth', status: 'DRAFT', lane: 'reference', provider: 'tldrastro-fallback-architecture-v3', headline: source.headline, summary: source.summary, body: source.body_you, sections: { packageRecord: source }, facts: { fallbackArchitectureV3: true }, source_snapshot: { sourcePackage: source.source_package, content_role: source.content_role }, block_type: 'fallback_hook', event_type: 'fallback-hook', package_starter: true } : null;
};
for (const width of [390, 1440]) for (const theme of ['light', 'dark']) {
 test(`Placement composition source editing and map ${width} ${theme}`, async ({ page }) => {
  await page.setViewportSize({ width, height: 1000 });
  await page.addInitScript(() => localStorage.setItem('tldrastro:contentAdminSecret', 'ingress-test'));
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  const calculations: string[] = [];
  page.on('request', request => { if (/skyCalculation\.worker|swisseph\.(wasm|data)/u.test(request.url())) calculations.push(request.url()); });
  await page.route('**/api/admin/**', async route => {
   const url = new URL(route.request().url());
   const rows = (url.searchParams.get('contentKeys') ?? key).split(',').map(virtual).filter(Boolean);
   await route.fulfill({ json: { ok: true, rows: url.pathname.endsWith('/generated-content') ? rows : [], statuses: [], nextCursor: null } });
  });
  await page.goto('/#sky-writeups');
  await page.evaluate(theme => document.documentElement.setAttribute('data-theme', theme), theme);
  await page.getByLabel('Sky placement planet or point').selectOption('saturn');
  await page.getByLabel('Sky placement zodiac sign').selectOption('aries');
  const map = page.getByRole('region', { name: 'Sky placement composition map' });
  await expect(map.getByRole('heading')).toHaveText('Saturn Rx in Aries');
  const systemDetails = map.getByLabel('Placement writing system details', { exact: true });
  await systemDetails.getByText('Writing system & versions', { exact: true }).click();
  await expect(systemDetails).toContainText('Placement composition · format 5');
  await expect(systemDetails).toContainText('Historical review');
  await expect(systemDetails).toContainText('Superseded proposals');
  const labelStyle = (el: Element) => { const s = getComputedStyle(el); return [s.fontFamily, s.fontSize, s.fontWeight, s.lineHeight, s.letterSpacing, s.marginTop, s.marginBottom, s.textTransform, s.textAlign]; };
  expect(await systemDetails.locator('strong').first().evaluate(labelStyle)).toEqual(await map.getByLabel('Selected sources').locator('strong').first().evaluate(labelStyle));
  const selectionRules = map.getByLabel('Placement reader selection', { exact: true });
  await selectionRules.getByText('How the reader chooses writing', { exact: true }).click();
  await expect(selectionRules.getByRole('listitem')).toHaveText([
   'Complete article for the current motion.', 'Shared complete placement article.',
   'Enabled placement composition with all required modules resolved.',
   'Evergreen fallback sections matching the motion, in their saved order. Empty sections are skipped.',
  ]);
  await expect(map.getByRole('button', { name: 'Open published reader', exact: true })).toBeVisible();
  await expect(map.getByRole('tab', { name: 'Saved preview', exact: true })).toBeVisible();
  await expect(map.getByLabel('Placement writing path').locator('option')).toHaveText(['Placement article', 'Fallback hooks', 'Placement composition']);
  expect(await map.evaluate(el => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1);
  await systemDetails.scrollIntoViewIfNeeded();
  await page.screenshot({ path: `test-results/sky-writing-systems-${width}-${theme}.png` });
  await map.getByLabel('Placement writing path').selectOption('ingress');
  await expect(map.getByRole('button', { name: 'Set up placement composition' })).toBeVisible();
  await map.getByRole('button', { name: 'Set up placement composition' }).click();
  const editor = page.getByRole('dialog');
  await expect(editor).toBeVisible();
  await editor.getByRole('button', { name: 'Add prefilled placement composition' }).click();
  const composer = editor.getByRole('region', { name: 'Placement composition' });
  const library = composer.getByRole('region', { name: 'Sky writing library' });
  await expect(library).toBeVisible();
  await expect(library.getByRole('button', { name: 'Fill empty fields from source library' })).toBeVisible();
  await expect(library.getByLabel('Writing library Placement thesis')).toHaveValue(baseSource.tldrWhat);
  await expect(library.getByLabel('Writing library How it shows up')).toHaveValue(baseSource.fallback.lived);
  await expect(library.getByLabel('Writing library Challenge and response')).toHaveValue(baseSource.fallback.turn);
  await expect(library.getByLabel('Writing library General')).toHaveValue(baseSource.fallback.lived);
  await expect(library.getByLabel('Writing library Opening hook')).toHaveValue(baseSource.fallback.hook);
  await expect(library.getByLabel('Writing library Closing line')).toHaveValue(baseSource.tldrTakeaway);
  await expect(composer.getByLabel('Ingress composition view').locator('option')).toHaveText(['Draft preview', 'Main template', 'Assembly and omissions']);
  const enabled = composer.getByLabel('Use composition when the complete article is empty');
  await enabled.check();
  await expect(composer.getByText('Enabled in this draft', { exact: false })).toBeVisible();
  await expect(composer.getByText('Enabled in this saved revision', { exact: false })).toHaveCount(0);
  await enabled.uncheck();
  await expect(composer.getByText('Composition is not enabled', { exact: false })).toBeVisible();
  await expect(editor.getByLabel('Placement writing system details', { exact: true })).toHaveCount(1);
  await composer.getByText('Advanced source tools', { exact: true }).click();
  await expect(composer.getByLabel('Ingress sentence source')).toHaveValue('planetFunctionSentence');
  await composer.getByLabel('Ingress source planetFunctionSentence').fill('Fixture {{planetTitle}} meaning.');
  await expect(composer.locator('.admin-sky-section-reference').first()).toHaveText(`${key}#ingress.sources.planetFunctionSentence`);
  await composer.getByText('Add a custom sentence source', { exact: true }).click();
  await composer.getByLabel('New ingress source name').fill('additionalMeaningSentence');
  await composer.getByRole('button', { name: 'Add sentence source', exact: true }).click();
  await composer.getByLabel('Ingress source additionalMeaningSentence').fill('Fixture additional {{signTitle}} sentence.');
  await composer.getByRole('button', { name: 'Add composition section' }).click();
  await composer.getByLabel('Ingress section name').fill('Additional meaning');
  await composer.getByLabel('Insert ingress source slot').selectOption('additionalMeaningSentence');
  await expect(composer.getByLabel('Ingress section template')).toHaveValue('{{additionalMeaningSentence}}');
  await composer.getByRole('button', { name: 'Move Additional meaning up', exact: true }).click();
  await expect(composer.getByLabel('Ingress module order').getByRole('button', { name: 'Additional meaning', exact: true })).toBeVisible();
  await composer.getByLabel('Ingress composition view').selectOption('assembly');
  await expect(composer.locator('.admin-template-reader-surface')).toContainText(`${key}#ingress.sources.additionalMeaningSentence`);
  await expect(composer.locator('.admin-template-reader-surface')).toContainText('Fixture additional Aries sentence.');
  await composer.getByLabel('Ingress sentence source').selectOption('planetFunctionSentence');
  await expect(composer.getByLabel('Ingress source planetFunctionSentence')).toHaveValue('Fixture {{planetTitle}} meaning.');
  const style = (el: Element) => { const s = getComputedStyle(el); return [s.fontFamily,s.fontSize,s.fontWeight,s.lineHeight,s.letterSpacing]; };
  expect(await composer.getByLabel('Ingress source planetFunctionSentence').evaluate(style)).toEqual(await composer.locator('p').first().evaluate(style));
  expect(await composer.evaluate(el => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1);
  expect(calculations).toEqual([]);
  if (width === 1440 && theme === 'light') {
   await composer.getByLabel('Ingress preview date').fill('2026-09-10');
   await composer.getByLabel('Ingress preview timezone').fill('America/New_York');
   await composer.getByRole('button', { name: 'Calculate occurrence preview', exact: true }).click();
   await expect(composer.getByText(/Calculated context:/)).toContainText('retrograde', { timeout: 60_000 });
   await expect(composer.getByText(/Calculated context:/)).toContainText('2026-09-10');
   expect(calculations.some(url => url.includes('swisseph.wasm'))).toBe(true);
   expect(calculations.some(url => url.includes('swisseph.data'))).toBe(true);
   await expect(composer.getByRole('link', { name: 'Open published reader for this occurrence' })).toHaveAttribute('href', '/?date=2026-09-10#sky/placement/saturn/aries');
  }
  await composer.getByLabel('Ingress source planetFunctionSentence').scrollIntoViewIfNeeded();
  await page.screenshot({ path: `test-results/sky-ingress-${width}-${theme}.png` });
  expect(errors).toEqual([]);
 });
}
