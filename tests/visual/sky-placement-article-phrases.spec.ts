import { ZODIAC_SEASON_SOURCE_STARTERS } from "../../apps/web/src/content/fallbackArchitectureV3/resolver/zodiacSeasonVariables.mjs";
import { test, expect } from '@playwright/test';
import { skyPlacementSourceRecords } from '../../api/_lib/sky-placement-sources';
import { makeSkyIngressComposition } from '../../apps/web/src/content/fallbackArchitectureV3/resolver/skyIngressComposition.mjs';
const key = 'sky-placement/article/saturn/aries';
for (const width of [390, 1440]) for (const theme of ['light', 'dark']) for (const prefilled of [false, true]) {
 test(`Placement article phrase variables ${width} ${theme} ${prefilled ? 'existing library' : 'automatic library'}`, async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.setViewportSize({ width, height: 1000 });
  await page.addInitScript(theme => { localStorage.setItem('tldrastro:contentAdminSecret', 'sky-phrase-fixture'); localStorage.setItem('tldrastro:studio-theme', theme); }, theme);
  let delayLibrary = false;
  await page.route('**/api/admin/**', async route => {
   const url = new URL(route.request().url());
   const keys = url.searchParams.getAll('contentKeys').flatMap(v => v.split(','));
   if (delayLibrary && keys.some(key => key.startsWith('fallback-'))) await new Promise(resolve => setTimeout(resolve, 300));
   const rows = keys.flatMap(contentKey => {
    const baseline = skyPlacementSourceRecords.get(contentKey) ?? ZODIAC_SEASON_SOURCE_STARTERS.find(row => row.contentKey === contentKey);
    if (baseline && contentKey.startsWith('fallback-hook/zodiac-season')) { baseline.body = contentKey.includes('polar-axis') ? 'Fixture Aries and Libra axis paragraph. This is season prose.' : 'Fixture Aries season paragraph. A second full sentence stays editable.'; baseline.review_status = 'approved'; }
    if (!baseline) return [];
    const source = structuredClone(baseline);
    if (contentKey === key) {
     source.placementArticle = prefilled ? '{{openingHook}} {{planetTitle}}. {{closingLine}}' : 'Fixture existing article.';
     source.fallback.hook = 'During this transit, fixture governed opening.';
     source.tldrTakeaway = 'Fixture governed ending.';
     if (prefilled) {
      source.ingress = { ...makeSkyIngressComposition(), modules: [] };
      source.ingress.sources.openingHook = { kind: 'placement', text: 'During this transit, fixture local opening.' };
      source.ingress.sources.closingLine = { kind: 'placement', text: 'Fixture local ending.' };
      source.ingress.sources.signMethod = { kind: 'sign', text: 'Fixture existing sign method.' };
     }
    }
    return [{ id: `package:${contentKey}`, content_key: contentKey, surface: 'sky', mode: 'in_depth', status: 'DRAFT', lane: 'reference', provider: 'tldrastro-fallback-architecture-v3', headline: source.headline, summary: source.summary, body: source.body_you, sections: { packageRecord: source }, facts: { fallbackArchitectureV3: true }, source_snapshot: { sourcePackage: source.source_package, content_role: source.content_role }, block_type: 'fallback_hook', event_type: 'fallback-hook', package_starter: true }];
   });
   await route.fulfill({ json: { ok: true, rows, statuses: [], nextCursor: null } });
  });
  await page.goto(process.env.STUDIO_PRODUCTION_ENTRY === '1' ? '/admin/content#sky-writeups' : '/#sky-writeups');
  await page.getByLabel('Sky placement planet or point').selectOption('saturn');
  await page.getByLabel('Sky placement zodiac sign').selectOption('aries');
  await page.getByLabel('Sky write-up motion').selectOption('direct');
  const map = page.getByRole('region', { name: 'Sky placement composition map' });
  const edit = map.getByRole('button', { name: 'Edit placement article', exact: true });
  if (prefilled) await expect(edit).toContainText('fixture local opening. Saturn. Fixture local ending.');
  await edit.click();
  const editor = page.getByRole('dialog');
  const writing = editor.locator('textarea[data-sky-field="placementArticle"]');
  await expect(writing).toBeVisible();
  await writing.fill('Before TARGET after');
  await writing.evaluate((el: HTMLTextAreaElement) => { el.focus(); el.setSelectionRange(7, 13); });
  await editor.locator('.admin-editor-toolbar-actions').getByRole('button', { name: 'Variables', exact: true }).click();
  const picker = editor.locator('[data-sky-article-variable-picker]');
  await expect(picker).toHaveAttribute('open', '');
  await expect(picker.getByText('Calculated Sky variables', { exact: true })).toBeVisible();
  await expect(picker.getByText('Editable phrase variables', { exact: true })).toBeVisible();
  await picker.locator('summary').filter({ hasText: 'Hooks and takeaways' }).click();
  delayLibrary = !prefilled;
  await picker.getByRole('button', { name: 'Insert {{openingHook}}', exact: true }).click();
  await expect(writing).toHaveValue('Before {{openingHook}} after');
  await expect(writing).toBeFocused();
  expect(await writing.evaluate((el: HTMLTextAreaElement) => el.selectionStart)).toBe(22);
  // Switching away during governed source loading must not cancel installation.
  if (!prefilled) {
   await editor.getByLabel('Writing section', { exact: true }).selectOption('fallback.lived');
   await editor.getByLabel('Writing section', { exact: true }).selectOption('placementArticle');
   await expect(writing).toHaveValue('Before {{openingHook}} after');
  }
  const preview = editor.locator('.admin-sky-writing-preview');
  await expect(preview).toHaveText(`Before During this transit, fixture ${prefilled ? 'local' : 'governed'} opening. after`);
  await writing.fill('{{openingHook}} {{planetTitle}} in {{signTitle}}. {{closingLine}}');
  await expect(preview).toHaveText(`During this transit, fixture ${prefilled ? 'local' : 'governed'} opening. Saturn in Aries. Fixture ${prefilled ? 'local' : 'governed'} ending.`);
  await expect(writing).not.toHaveAttribute('aria-invalid', 'true');
  await editor.locator('.admin-editor-toolbar-actions').getByRole('button', { name: 'Variables', exact: true }).click();
  const hooks = picker.locator('summary').filter({ hasText: 'Hooks and takeaways' });
  if (!await hooks.evaluate(el => (el.parentElement as HTMLDetailsElement).open)) await hooks.click();
  await picker.getByRole('button', { name: 'Edit opening hook', exact: true }).click();
  const phraseEditor = editor.getByRole('region', { name: 'Edit article phrase' });
  await phraseEditor.getByLabel('Phrase value', { exact: true }).fill('During this transit, fixture edited opening.');
  await expect(writing).toHaveValue('{{openingHook}} {{planetTitle}} in {{signTitle}}. {{closingLine}}');
  await expect(preview).toHaveText('During this transit, fixture edited opening. Saturn in Aries. Fixture ' + (prefilled ? 'local' : 'governed') + ' ending.');
  await phraseEditor.screenshot({ path: `test-results/article-phrase-edit-${width}-${theme}-${prefilled}.png` });
  await phraseEditor.getByRole('button', { name: 'Done editing phrase' }).click();
  // Existing libraries must expose newly registered sign fields immediately.
  // Both fields hold full prose while the article retains the inserted tokens.
  await writing.fill('Before TARGET after');
  await writing.evaluate((el: HTMLTextAreaElement) => { el.focus(); el.setSelectionRange(7, 13); });
  await picker.getByRole('button', { name: 'Insert {{zodiacSeason}}', exact: true }).click();
  await expect(writing).toHaveValue('Before {{zodiacSeason}} after');
  await writing.fill('{{zodiacSeason}}\n\n{{zodiacSeasonPolarAxis}}');
  await expect(preview).toHaveText('Fixture Aries season paragraph. A second full sentence stays editable.\n\nFixture Aries and Libra axis paragraph. This is season prose.');
  await expect(writing).not.toHaveAttribute('aria-invalid', 'true');
  const summaryStyles = await editor.locator('summary').filter({ hasText: /^(Article variables|Preview this section)$/ }).evaluateAll(elements => elements.map(el => { const style = getComputedStyle(el); return [style.fontFamily, style.fontSize, style.fontWeight, style.lineHeight, style.letterSpacing]; }));
  expect(summaryStyles).toHaveLength(2);
  expect(summaryStyles[0]).toEqual(summaryStyles[1]);
  await preview.scrollIntoViewIfNeeded();
  await editor.screenshot({ path: `test-results/article-preview-${width}-${theme}-${prefilled}.png` });
  await writing.fill('Before {{placementOpportunity}} after');
  await expect(preview).toHaveText('Before {{placementOpportunity}} after');
  await expect(editor.getByRole('status').filter({ hasText: 'No writing saved for {{placementOpportunity}}' })).toBeVisible();
  await writing.fill('{{unknownArticleValue}}');
  await expect(writing).toHaveAttribute('aria-invalid', 'true');
  for (const [path, motion] of [['placementArticleDirect', 'direct'], ['placementArticleRetrograde', 'retrograde']]) {
   await editor.getByLabel('Writing section', { exact: true }).selectOption(path);
   const variant = editor.locator(`textarea[data-sky-field="${path}"]`);
   await variant.fill('{{openingHook}} {{motion}}. {{closingLine}}');
   await expect(editor.locator('.admin-sky-writing-preview')).toContainText(`${motion}. Fixture`);
   await expect(variant).toHaveValue('{{openingHook}} {{motion}}. {{closingLine}}');
  }
  expect(await editor.evaluate(el => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1);
  await editor.screenshot({ path: `test-results/article-phrases-${width}-${theme}-${prefilled}.png` });
  expect(errors).toEqual([]);
 });
}
