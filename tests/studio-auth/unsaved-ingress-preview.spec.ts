import { expect, test, type Page } from '@playwright/test';

const token = 'fixture.owner.session';
const owner = { id: 'preview-owner', email: 'owner@example.test', app_metadata: { role: 'admin' } };
const source = { id: 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa', content_key: 'sky/article-template/sun/libra',
  event_type: 'sky-article-template', status: 'REVIEWED', lane: 'reference', review_state: null,
  body: 'Complete original synthetic template. The original final sentence is preserved.', source_snapshot: { review_status: 'approved' } };
const facts = { planet: 'sun', sign: 'libra', articleFormat: 'ingress-essay-v3', slotValues: {
  articleTitle: 'Libra Season 2026', when: 'September 22, 2026 at 8:05 PM ET to October 23, 2026 at 5:37 AM ET'
} };
const values = { what: 'Synthetic season meaning.', takeaway: 'Synthetic specific takeaway.',
  articleBody: 'Complete synthetic opening paragraph. Its second sentence develops the same thought.\n\nThe complete transit interpretation stays here. This is its second sentence.\n\nThe synthetic close develops its thought. The complete final sentence stays in this preview.',
  otherDatesSection: '## Key dates\n\n- Synthetic additional calculated event.' };

async function prepare(page: Page, status = 200, expired = false) {
  await page.addInitScript(({ token, owner, expired }) => {
    localStorage.removeItem('tldrastro:contentAdminSecret');
    localStorage.setItem('sb-studio-auth-auth-token', JSON.stringify({ access_token: token, refresh_token: 'synthetic-refresh',
      expires_at: Math.floor(Date.now() / 1000) + (expired ? -60 : 3600), token_type: 'bearer', user: owner }));
  }, { token, owner, expired });
  const observed = { generationCalls: 0, refreshes: 0, writes: [] as string[], headers: [] as string[] };
  await page.route('https://studio-auth.supabase.test/**', async route => {
    const refresh = new URL(route.request().url()).pathname.endsWith('/token');
    if (refresh) observed.refreshes++;
    await route.fulfill({ json: refresh ? { access_token: 'refreshed.owner.session', refresh_token: 'synthetic-next-refresh',
      expires_at: Math.floor(Date.now() / 1000) + 3600, user: owner } : owner });
  });
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url());
    const method = route.request().method();
    if (url.pathname === '/api/admin/sky-article-template-slots') {
      observed.generationCalls++;
      observed.headers.push(route.request().headers()['x-content-admin-session'] ?? '');
      expect(route.request().headers()['x-content-generation-secret']).toBeUndefined();
      expect(route.request().postDataJSON()).toEqual({ templateId: source.id, referenceDate: '2026-10-21',
        format: 'ingress-essay-v3', provider: 'openai', expectedModel: 'gpt-5.6-sol', existingSlotValues: {}, includeRetrogradeHistory: false });
      const generation = { model: 'gpt-5.6-sol', responseId: 'synthetic-preview-response', providerCalls: 1,
        generationMetadata: { evidencePacket: { approvedVoiceStyle: { id: 'synthetic-approved-benchmark', textSha256: 'synthetic-exact-hash' } } } };
      if (status === 422) await route.fulfill({ status, json: { ok: false, error: 'Synthetic returned candidate needs review.', rejectedGeneration: { ...generation, slotValues: values } } });
      else if (status !== 200) await route.fulfill({ status, json: { ok: false, error: 'Synthetic generation unavailable. No automatic retry was sent.' } });
      else await route.fulfill({ json: { ok: true, facts, slotValues: values, generation } });
      return;
    }
    if (!['GET', 'HEAD'].includes(method) && url.pathname !== '/api/admin/content-live-status') observed.writes.push(`${method} ${url.pathname}`);
    if (url.pathname === '/api/admin/sky-article-facts') return route.fulfill({ json: { ok: true, facts } });
    if (url.pathname === '/api/admin/generated-content-inventory' && url.searchParams.get('contentKey') === source.content_key) return route.fulfill({ json: { ok: true, rows: [source], nextCursor: null } });
    await route.fulfill({ json: { ok: true, rows: [], records: [], items: [], statuses: [], nextCursor: null } });
  });
  await page.goto('/admin/content#sky-writeups?view=ingress-preview');
  const preview = page.getByRole('region', { name: 'Preview without saving', exact: true });
  await expect(preview).toBeVisible();
  await preview.getByLabel('Preview reference date').fill('2026-10-21');
  return { observed, preview };
}

for (const width of [390, 1440]) for (const theme of ['light', 'dark']) {
  test(`unsaved ingress preview uses owner login and never persists: ${width} ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.addInitScript(theme => localStorage.setItem('tldrastro:studio-theme', theme), theme);
    const { observed, preview } = await prepare(page);
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    expect(observed.generationCalls).toBe(0);
    const previewTab = page.getByRole('tab', { name: 'Preview without saving', exact: true });
    await expect(previewTab).toHaveAttribute('aria-selected', 'true');
    const labelStyle = (el: Element) => {
      const style = getComputedStyle(el);
      return { family: style.fontFamily, size: style.fontSize, weight: style.fontWeight, leading: style.lineHeight,
        tracking: style.letterSpacing, casing: style.textTransform, margin: style.margin };
    };
    const previewStyle = await previewTab.evaluate(labelStyle);
    const catalogTab = page.getByRole('tab', { name: 'Placements & lunations', exact: true });
    await catalogTab.click();
    expect(await catalogTab.evaluate(labelStyle)).toEqual(previewStyle);
    await previewTab.click();
    await expect(page.getByRole('heading', { level: 1, name: 'Sky Write-ups', exact: true })).toBeVisible();
    await preview.getByLabel('Preview reference date').fill('2026-10-21');
    await preview.getByRole('button', { name: 'Preview without saving', exact: true }).click();
    const draft = preview.getByLabel('Unsaved ingress draft', { exact: true });
    await expect(draft).toHaveValue(/^# Libra Season 2026/);
    await expect(draft).toHaveValue(/Complete synthetic opening paragraph/);
    await expect(draft).toHaveValue(/The complete transit interpretation stays here/);
    await expect(draft).toHaveValue(/The complete final sentence stays in this preview\./);
    await expect(draft).toHaveValue(/## Key dates\n\n- Synthetic additional calculated event\.$/);
    await expect(draft).not.toHaveValue(/## Summary|Synthetic season meaning|Synthetic specific takeaway/);
    await expect(draft).toHaveAttribute('readonly', '');
    await expect(preview).toContainText('Not saved or published.');
    await expect(preview.getByRole('button', { name: /save|publish/i }).filter({ hasText: /^(Save|Publish)/ })).toHaveCount(0);
    await page.waitForTimeout(1300); // Beyond the editor's existing autosave debounce.
    expect(observed.generationCalls).toBe(1);
    expect(observed.headers).toEqual([token]);
    expect(observed.writes).toEqual([]);
    expect(await page.evaluate(() => [...Object.values(localStorage), ...Object.values(sessionStorage)].some(value => value.includes('Complete synthetic opening paragraph')))).toBe(false);
    expect(await preview.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    await preview.screenshot({ path: `test-results/unsaved-ingress-preview-${width}-${theme}.png` });
    await preview.getByRole('button', { name: 'Discard preview' }).click();
    await expect(draft).toHaveCount(0);
    await page.reload();
    await expect(preview).toBeVisible();
    await expect(draft).toHaveCount(0);
    expect(observed.generationCalls).toBe(1);
    expect(observed.writes).toEqual([]);
    expect(errors).toEqual([]);
  });
}

for (const status of [401, 409, 500, 422]) test(`preview preserves returned candidate or failure without retry: ${status}`, async ({ page }) => {
  const { observed, preview } = await prepare(page, status);
  await preview.getByRole('button', { name: 'Preview without saving', exact: true }).click();
  await expect(preview.getByRole('alert')).toBeVisible();
  if (status === 401) await expect(preview.getByRole('link', { name: 'Sign in as owner' })).toBeVisible();
  if (status === 422) await expect(preview.getByLabel('Unsaved ingress draft')).toHaveValue(/The complete final sentence stays in this preview\./);
  else await expect(preview.getByLabel('Unsaved ingress draft')).toHaveCount(0);
  await page.waitForTimeout(1300);
  expect(observed.generationCalls).toBe(1);
  expect(observed.writes).toEqual([]);
});

test('owner session renews before preview and a double click sends one generation', async ({ page }) => {
  const { observed, preview } = await prepare(page, 200, true);
  await preview.getByRole('button', { name: 'Preview without saving', exact: true }).evaluate(el => { (el as HTMLButtonElement).click(); (el as HTMLButtonElement).click(); });
  await expect(preview.getByLabel('Unsaved ingress draft')).toBeVisible();
  expect(observed.refreshes).toBe(1);
  expect(observed.generationCalls).toBe(1);
  expect(observed.headers).toEqual(['refreshed.owner.session']);
  expect(observed.writes).toEqual([]);
});

test('a signed-out preview offers the normal owner login without sending generation', async ({ page }) => {
  const { observed, preview } = await prepare(page);
  await page.evaluate(() => localStorage.removeItem('sb-studio-auth-auth-token'));
  await preview.getByRole('button', { name: 'Preview without saving', exact: true }).click();
  const link = preview.getByRole('link', { name: 'Sign in as owner' });
  await expect(link).toBeVisible();
  expect(new URL((await link.getAttribute('href'))!, 'http://127.0.0.1:4296').searchParams.get('returnTo')).toBe('/admin/content#sky-writeups?view=ingress-preview');
  expect(observed.generationCalls).toBe(0);
  expect(observed.writes).toEqual([]);
});
