import { test, expect, type Locator } from '@playwright/test';
import { studioApiStore } from '../helpers/studio-api-store';
import { routeStudioInventoryApi } from '../helpers/studio-inventory-route';
import { routeStudioPublicReader } from '../helpers/studio-public-reader-route';
import { canonicalPublicationLedger } from '../../apps/web/src/services/publicationLedgerTransport';

async function expectAnchored(editor: Locator) {
  const geometry = await editor.evaluate(panel => {
    const header = panel.querySelector('.admin-editor-header')!.getBoundingClientRect();
    const footer = panel.querySelector('.admin-editor-savebar')!.getBoundingClientRect();
    return { scrollTop: panel.scrollTop, headerTop: header.top, footerBottom: footer.bottom, viewportHeight: innerHeight };
  });
  expect(geometry.scrollTop).toBe(0);
  expect(geometry.headerTop).toBeGreaterThanOrEqual(0);
  expect(geometry.footerBottom).toBeLessThanOrEqual(geometry.viewportHeight);
  expect(geometry.viewportHeight - geometry.footerBottom).toBeLessThan(64);
}

for (const [width, theme] of [[390, 'light'], [390, 'dark'], [1440, 'light'], [1440, 'dark']] as const) {
  for (const kind of ['manual', 'guide', 'template'] as const) {
    test(`Studio ${kind} editor keeps controls anchored through disclosure and field focus ${width} ${theme}`, async ({ page, context }, testInfo) => {
      const body = 'Complete synthetic editor opening.\n\nComplete synthetic editor ending.';
      const row = {
        id: '11111111-1111-4111-a111-111111111111',
        content_key: kind === 'template' ? 'fallback-template/natal.planet-in-sign/sun' : `article/${kind}/scroll-containment`,
        headline: `Synthetic ${kind} editor`, body: kind === 'template' ? '{{planetBest}}' : body, summary: '',
        surface: 'sky', mode: 'article', status: 'DRAFT', lane: 'reference', review_state: 'owner-review-required',
        event_type: kind === 'template' ? 'fallback-hook' : 'sky_article', block_type: kind === 'template' ? 'fallback_template' : 'essay',
        provider: kind === 'template' ? 'tldrastro-fallback-architecture-v3' : 'synthetic', facts: {},
        sections: kind === 'template' ? { body_you: '{{planetBest}}', body_they: '{{planetBest}}', packageRecord: {
          contentKey: 'fallback-template/natal.planet-in-sign/sun', content_role: 'template', review_status: 'needs_review',
          requiredSlots: ['planetBest'], body_you: '{{planetBest}}', body_they: '{{planetBest}}'
        } } : {}, source_snapshot: {}, created_at: '2026-10-01T00:00:00Z', updated_at: '2026-10-01T00:00:00Z'
      };
      const source = { ...row, id: '22222222-2222-4222-a222-222222222222',
        content_key: 'fallback-hook/planet-best/sun', block_type: 'fallback_hook', status: 'LIVE', lane: 'serving',
        provider: 'tldrastro-fallback-architecture-v3', body: 'Complete synthetic supporting passage.',
        sections: { packageRecord: { contentKey: 'fallback-hook/planet-best/sun', content_role: 'fallback_hook',
          review_status: 'approved', body: 'Complete synthetic supporting passage.' } } };
      const store = await studioApiStore(kind === 'template' ? [row, source] : [row], { uuidIds: true });
      const before = await store.call({ method: 'rows' });
      const writes: unknown[] = [], errors: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      await context.addInitScript(theme => {
        localStorage.setItem('tldrastro:contentAdminSecret', 'calendar-api-fixture');
        localStorage.setItem('tldrastro:studio-theme', theme);
      }, theme);
      await context.route('**/rest/v1/**', async route => {
        const url = new URL(route.request().url());
        expect(url.pathname).toBe('/rest/v1/content_publications');
        const headers = { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET, HEAD, OPTIONS',
          'access-control-allow-headers': 'apikey, authorization, content-type, x-client-info, accept-profile, x-supabase-api-version' };
        if (route.request().method() === 'OPTIONS') { await route.fulfill({ status: 204, headers }); return; }
        const publications = canonicalPublicationLedger(await store.call({ method: 'publications' }));
        const filtered = publications.filter(row => url.searchParams.getAll('content_key').every(condition => {
          const match = /^(gte|gt|lt|lte|eq)\.(.*)$/u.exec(condition);
          if (!match) throw new Error('Unexpected synthetic publication filter.');
          const key = row.content_key, value = match[2];
          return match[1] === 'gte' ? key >= value : match[1] === 'gt' ? key > value : match[1] === 'lt' ? key < value : match[1] === 'lte' ? key <= value : key === value;
        }));
        await route.fulfill({ headers, json: filtered.slice(0, Number(url.searchParams.get('limit') ?? 1000)) });
      });
      await routeStudioInventoryApi(context, { call: store.call, actualDocumentRoute: true, onWrite: write => writes.push(write), answer: async (route, url) => {
        if (await routeStudioPublicReader(route, url, store.call)) return true;
        if (!url.pathname.startsWith('/api/admin/')) {
          await route.fulfill({ status: 503, json: { error: 'Optional API unavailable in isolated editor fixture.' } }); return true;
        }
        return false;
      } });
      try {
        await page.setViewportSize({ width, height: 753 });
        await page.goto(`/admin/content#${kind === 'template' ? 'templates' : 'articles'}`);
        await page.locator('.admin-content-row').filter({ hasText: row.content_key }).getByRole('button', { name: 'Edit', exact: true }).click();
        const editor = page.getByRole('dialog', { name: 'Generated content editor', exact: true });
        const copy = editor.getByLabel(kind === 'template' ? 'You view copy' : 'Article body', { exact: true });
        await expect(copy).toHaveValue(row.body);
        await copy.evaluate(field => field.scrollIntoView({ block: 'center', behavior: 'instant' }));
        await copy.focus();
        await expectAnchored(editor);
        const details = editor.locator('details.admin-editor-details > summary');
        await details.click();
        await details.evaluate(summary => summary.scrollIntoView({ block: 'center', behavior: 'instant' }));
        await details.focus();
        await details.press('Tab');
        await expectAnchored(editor);
        if (kind === 'template') {
          await editor.getByRole('button', { name: /^Reader preview & variables/ }).click();
          const rail = page.getByRole('complementary', { name: 'Template variable reference', exact: true });
          await expect(rail).toBeVisible();
          await expect(rail.getByRole('region', { name: 'Example reader write-up', exact: true })).toContainText(source.body);
          await editor.getByLabel('You view copy', { exact: true }).evaluate(field => field.scrollIntoView({ block: 'center', behavior: 'instant' }));
          await expectAnchored(editor);
          const editorBox = await editor.boundingBox(), railBox = await rail.boundingBox();
          if (width === 1440) expect(editorBox!.x + editorBox!.width).toBeLessThanOrEqual(railBox!.x + 1);
        }
        await page.screenshot({ path: testInfo.outputPath('anchored-editor.png') });
        expect(writes).toEqual([]);
        expect(await store.call({ method: 'rows' })).toEqual(before);
        expect(errors).toEqual([]);
      } finally { await context.unrouteAll({ behavior: 'ignoreErrors' }); store.close(); }
    });
  }
}
