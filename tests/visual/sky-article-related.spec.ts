import { test, expect } from '@playwright/test';
import { createHmac } from 'node:crypto';
import { studioApiStore } from '../helpers/studio-api-store';
import { routeStudioInventoryApi } from '../helpers/studio-inventory-route';
import { workspaceVisitFacts } from '../helpers/sky-placement-workspace-fixtures';
import { placementVisitDraft } from '../../apps/admin/src/skyPlacementWorkspaceModel';
import { emptyHoroscopeEdition, horoscopeEditionBody, horoscopeEditionKey, horoscopeCanonicalJson } from '../../apps/web/src/content/horoscopeEditions.mjs';

function horoscopeRow(id: string, startsAt: string, endsAt: string) {
  const edition = emptyHoroscopeEdition({ period: 'weekly', audience: 'rising', timeZone: 'America/New_York', startsAt, endsAt });
  for (const passage of edition.passages) { passage.headline = `Synthetic ${passage.sign}`; passage.body = `Synthetic ${passage.sign} complete opening.\n\nSynthetic ${passage.sign} final sentence.`; }
  // Synthetic calculation evidence signed only for the isolated handler's fixture key.
  const brief = { window: edition.window };
  const signature = createHmac('sha256', 'calendar-api-fixture-key').update('horoscope-brief/v1\n' + horoscopeCanonicalJson(brief)).digest('hex');
  return { id, content_key: horoscopeEditionKey(edition.window), headline: 'Synthetic saved week', body: horoscopeEditionBody(edition), summary: '',
    sections: { horoscopeEdition: edition }, facts: { horoscopeBrief: { brief, signature } }, source_snapshot: {},
    status: 'DRAFT', lane: 'serving', review_state: null, surface: 'sky', mode: 'article', event_type: 'horoscope-edition', updated_at: '2026-10-20T12:00:00.000Z' };
}

for (const theme of ['light', 'dark']) for (const width of [1440, 390]) {
  test(`Sky article aspects and linked horoscope panel ${theme} ${width}`, async ({ page }) => {
    const facts = { ...workspaceVisitFacts('mercury', 'scorpio', '2026-10-24', '2026-11-13'), motion: 'retrograde' as const,
      events: [
        { id: 'before-date', type: 'aspect', title: 'Synthetic Mercury square Mars', startsAt: '2026-10-26T14:00:00Z', planets: ['Mercury', 'Mars'], aspect: 'square' },
        { id: 'after-date', type: 'aspect', title: 'Synthetic Mercury trine Jupiter', startsAt: '2026-11-10T14:00:00Z', planets: ['Mercury', 'Jupiter'], aspect: 'trine' },
        { id: 'follow-through', type: 'aspect', title: 'Synthetic excluded follow-through', startsAt: '2026-11-16T14:00:00Z', planets: ['Mercury', 'Mars'], aspect: 'square' }
      ] };
    const article = await placementVisitDraft(facts, { headline: 'Synthetic Mercury article', summary: 'Synthetic separate summary.', body: 'Synthetic full opening.\n\nSynthetic full ending.' });
    const savedArticle = { id: 'mercury-related-draft', content_key: article.contentKey, headline: article.headline, body: article.body, summary: article.summary,
      sections: article.sections, facts: article.facts, source_snapshot: article.sourceSnapshot, event_type: article.eventType,
      surface: 'sky', mode: 'article', status: 'DRAFT', lane: 'reference', updated_at: '2026-10-30T12:00:00.000Z' };
    const overlapping = horoscopeRow('aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa', '2026-10-26T04:00:00.000Z', '2026-11-02T05:00:00.000Z');
    const outside = horoscopeRow('bbbbbbbb-bbbb-4bbb-abbb-bbbbbbbbbbbb', '2026-11-16T05:00:00.000Z', '2026-11-23T05:00:00.000Z');
    outside.headline = 'Synthetic outside week';
    const newerOutside = Array.from({ length: 32 }, (_, index) => {
      const start = Date.parse('2026-11-23T05:00:00.000Z') + index * 3600000;
      return { ...horoscopeRow(`cccccccc-cccc-4ccc-accc-${String(index + 1).padStart(12, '0')}`,
        new Date(start).toISOString(), new Date(start + 7 * 86400000).toISOString()),
        headline: `Synthetic later week ${index + 1}`, updated_at: '2026-11-02T12:00:00.000Z' };
    });
    const sourceKey = 'house-horoscope-core/mercury/scorpio/house-6';
    const evergreen = { id: 'synthetic-evergreen', content_key: sourceKey, headline: 'Synthetic evergreen Mercury horoscope',
      body: 'Synthetic evergreen opening.\n\nSynthetic evergreen final sentence.', summary: '', surface: 'sky', mode: 'in_depth', status: 'DRAFT', lane: 'reference',
      sections: { packageRecord: { contentKey: sourceKey, body_you: 'Synthetic evergreen opening.\n\nSynthetic evergreen final sentence.', content_role: 'hook', review_status: 'needs_review' } },
      source_snapshot: {}, event_type: 'fallback-hook', block_type: 'fallback_hook', updated_at: '2026-10-20T12:00:00.000Z' };
    const store = await studioApiStore([savedArticle, overlapping, outside, ...newerOutside, evergreen], { projectSelect: true });
    let releaseSave!: () => void;
    const saveResponse = new Promise<void>(resolve => { releaseSave = resolve; });
    let saveStarted = false;
    const writes: any[] = [], errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewportSize({ width, height: 1000 });
    await page.addInitScript(theme => { localStorage.setItem('tldrastro:contentAdminSecret', 'calendar-api-fixture'); localStorage.setItem('tldrastro:studio-theme', theme); }, theme);
    await routeStudioInventoryApi(page, { call: async message => {
      const result = await store.call(message);
      if (message.method === 'PATCH' && (message.body as any)?.id === overlapping.id) { saveStarted = true; await saveResponse; }
      return result;
    }, actualDocumentRoute: true, onWrite: value => writes.push(value), answer: async (route, url) => {
      if (url.pathname === '/api/admin/content-live-status') {
        const body = route.request().postDataJSON();
        await route.fulfill({ json: body.action === 'composition-catalog' ? { ok: true, rows: [{ content_key: sourceKey, headline: evergreen.headline, role: 'hook' }] }
          : { ok: true, statuses: await store.call({ method: 'statuses', body }) } }); return true;
      }
      if (url.pathname === '/api/admin/sky-article-facts') { await route.fulfill({ json: { ok: true, facts } }); return true; }
      return false;
    } });
    try {
      await page.goto(`${process.env.STUDIO_PRODUCTION_ENTRY === '1' ? '/admin/content' : '/'}#sky-writeups?planet=mercury&sign=scorpio`);
      const workspace = page.getByRole('region', { name: 'Mercury in Scorpio workspace', exact: true });
      await workspace.getByRole('button', { name: 'Edit', exact: true }).click();
      const body = workspace.getByLabel('Visit article body', { exact: true });
      const aspects = workspace.getByRole('region', { name: 'Aspects during this article period' });
      await expect(aspects.getByRole('link')).toHaveText(['Synthetic Mercury square Mars', 'Synthetic Mercury trine Jupiter']);
      await expect(aspects).not.toContainText('excluded follow-through');
      await expect(aspects.getByRole('link').last()).toHaveAttribute('href', '/#/sky/aspect/mercury/trine/jupiter/at/2026-11-10T14%3A00%3A00Z');
      const styles = await workspace.evaluate(node => {
        const roles = ['Aspects during this period', 'Article settings'].map(text => [...node.querySelectorAll('h3')].find(h => h.textContent === text)!);
        return roles.map(node => { const s = getComputedStyle(node); return [s.fontFamily,s.fontSize,s.fontWeight,s.lineHeight,s.letterSpacing,s.textAlign,s.textTransform]; });
      });
      expect(styles[0]).toEqual(styles[1]);
      await body.fill('Synthetic unsaved article opening.\n\nSynthetic unsaved article ending.');
      const trigger = workspace.getByRole('button', { name: 'Related horoscope editions', exact: true });
      await trigger.click();
      const panel = page.getByRole('dialog', { name: 'Horoscopes', exact: true });
      await expect(panel.getByRole('heading', { name: 'Horoscopes', exact: true })).toBeVisible();
      const typography = await panel.evaluate(node => [node, document.querySelector('.admin-dashboard')!].map(element => {
        const style = getComputedStyle(element);
        return [style.fontFamily, style.fontSize, style.fontWeight, style.lineHeight, style.letterSpacing];
      }));
      expect(typography[0]).toEqual(typography[1]);
      const list = panel.getByRole('list', { name: 'Linked horoscope editions' });
      await expect(list.locator('li')).toHaveCount(1);
      await expect(list).toContainText('October 26, 2026');
      await expect(list).not.toContainText('November 16, 2026');
      await page.screenshot({ path: `test-results/sky-related/panel-${theme}-${width}.png` });
      await list.getByRole('button', { name: 'Edit', exact: true }).click();
      const reading = panel.getByLabel('Complete reading', { exact: true });
      await expect(reading).toHaveValue('Synthetic aries complete opening.\n\nSynthetic aries final sentence.');
      await reading.fill('Synthetic revised complete opening.\n\nSynthetic revised final sentence.');
      page.once('dialog', dialog => dialog.dismiss());
      await page.keyboard.press('Escape');
      await expect(reading).toHaveValue('Synthetic revised complete opening.\n\nSynthetic revised final sentence.');
      await panel.getByRole('button', { name: 'Save edition draft', exact: true }).click();
      await expect.poll(() => saveStarted).toBe(true);
      await page.keyboard.press('Escape');
      await expect(panel).toBeVisible();
      await panel.getByRole('tab', { name: 'Evergreen', exact: true }).click();
      await expect(panel.getByRole('tab', { name: 'Dated editions', exact: true })).toHaveAttribute('aria-selected', 'true');
      releaseSave();
      await expect(panel.getByText('All changes saved', { exact: true })).toBeVisible();
      expect(writes).toHaveLength(1);
      expect(writes[0].result.status).toBe(200);
      await panel.getByRole('button', { name: 'Back to horoscope editions', exact: true }).click();
      await panel.getByRole('tab', { name: 'Evergreen', exact: true }).click();
      await panel.getByRole('button', { name: 'Synthetic evergreen Mercury horoscope', exact: true }).click();
      await expect(panel).toContainText('Synthetic evergreen opening.');
      await expect(panel).toContainText('Synthetic evergreen final sentence.');
      await expect(panel.getByRole('combobox', { name: 'Horoscope planet or point' })).toHaveCount(0);
      await panel.getByRole('article', { name: 'Selected fallback horoscope passage', exact: true }).getByRole('button', { name: 'Edit', exact: true }).click();
      const evergreenEditor = page.getByRole('dialog', { name: 'Generated content editor', exact: true });
      await expect(evergreenEditor).toBeVisible();
      expect((await evergreenEditor.boundingBox())!.width).toBeLessThanOrEqual(640);
      await evergreenEditor.getByRole('button', { name: 'Close', exact: true }).click();
      await expect(evergreenEditor).toHaveCount(0);
      page.once('dialog', dialog => dialog.dismiss());
      await page.evaluate(() => { window.location.hash = '#horoscopes'; });
      await expect(page).toHaveURL(/#sky-writeups\?/u);
      await expect(body).toHaveValue('Synthetic unsaved article opening.\n\nSynthetic unsaved article ending.');
      await trigger.click();
      await expect(panel.getByRole('list', { name: 'Linked horoscope editions' })).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(panel).toHaveCount(0);
      await expect(trigger).toBeFocused();
      await expect(body).toHaveValue('Synthetic unsaved article opening.\n\nSynthetic unsaved article ending.');
      await trigger.click();
      await page.getByRole('list', { name: 'Linked horoscope editions' }).getByRole('button', { name: 'Edit', exact: true }).click();
      await expect(page.getByRole('dialog', { name: 'Horoscopes', exact: true }).getByLabel('Complete reading', { exact: true })).toHaveValue('Synthetic revised complete opening.\n\nSynthetic revised final sentence.');
      await page.keyboard.press('Escape');
      await expect(panel).toHaveCount(0);
      page.once('dialog', dialog => dialog.accept());
      await workspace.getByRole('button', { name: 'Back to articles', exact: true }).click();
      await workspace.getByRole('tab', { name: 'Evergreen reading', exact: true }).click();
      await workspace.getByRole('button', { name: 'Horoscopes', exact: true }).click();
      await panel.getByRole('tab', { name: 'Dated editions', exact: true }).click();
      const allEditions = panel.getByRole('list', { name: 'Linked horoscope editions' });
      await expect(allEditions.locator('li')).toHaveCount(30);
      await panel.getByRole('button', { name: 'Load more editions', exact: true }).click();
      await expect(allEditions.locator('li')).toHaveCount(34);
      await expect(panel.getByRole('button', { name: 'Load more editions', exact: true })).toHaveCount(0);
      const editionTitles = await allEditions.locator('li > strong').allTextContents();
      expect(new Set(editionTitles).size).toBe(34);
      const rows = await store.call({ method: 'rows' });
      expect(rows.find((row: any) => row.id === overlapping.id).status).toBe('DRAFT');
      expect(rows.find((row: any) => row.id === outside.id)).toEqual(outside);
      for (const original of newerOutside) expect(rows.find((row: any) => row.id === original.id)).toEqual(original);
      expect(rows.find((row: any) => row.id === evergreen.id)).toEqual(evergreen);
      expect(rows.find((row: any) => row.id === savedArticle.id)).toEqual(savedArticle);
      expect(writes).toHaveLength(1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      expect(errors).toEqual([]);
    } finally { releaseSave(); await page.unrouteAll({ behavior: 'wait' }); store.close(); }
  });
}
