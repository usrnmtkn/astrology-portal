import { expect, test, type Locator, type Page } from '@playwright/test';
import { fork } from 'node:child_process';
import path from 'node:path';
import { houseTransitSourceGroups, type HouseTransitSelection } from '../../apps/admin/src/houseTransitSources';
import { effectivePackageRecord } from '../../apps/admin/src/skyFallbackWorkspace';

type Audience = 'You' | 'Friends';
type Row = Record<string, any>;
const selection: HouseTransitSelection = { planet: 'sun', sign: 'aries', house: '1', motion: 'direct' };
const version = '2026-09-14T02:13:00.543535+00:00';
const fieldKey = (audience: Audience) => audience === 'You' ? 'body_you' : 'body_they';
const other = (audience: Audience): Audience => audience === 'You' ? 'Friends' : 'You';
const sources = (s = selection) => houseTransitSourceGroups(s)[0].sources;
const routePath = (audience: Audience = 'You', s = selection) => `/admin/content#sky-writeups?view=house-transits&motion=${s.motion}&transit=${s.planet}&sign=${s.sign}&transitHouse=${s.house}${audience === 'Friends' ? '&audience=friends' : ''}`;
const fullCopy = (label: string, audience: Audience) => `${label}: ${audience} fixture opening.\n\n${('This complete synthetic paragraph retains every sentence, line break, and final detail of its own source. ').repeat(18)}\n\n${label}: ${audience} final paragraph must remain present.`;
function fixtureRows(s = selection): Row[] {
  return [...sources(s), { id: 'unrelated', label: 'Unrelated source', candidateKeys: ['fixture/untouched-house-source'] }].map(source => {
    const you = fullCopy(source.label, 'You'), they = fullCopy(source.label, 'Friends');
    return { id: `combined-${source.id}`, content_key: source.candidateKeys[0], headline: source.label,
      surface: 'sky', mode: 'article', status: 'DRAFT', lane: 'reference', review_state: 'needs-review',
      provider: 'tldrastro-fallback-architecture-v3', event_type: 'house-transit', block_type: 'fallback_hook', summary: '', body: you,
      sections: { body_you: you, body_they: they, packageRecord: { contentKey: source.candidateKeys[0], content_role: source.id === 'retrograde' ? 'fallback_hook' : 'full_copy', review_status: 'needs_review', body_you: you, body_they: they, retainedMetadata: { value: 'package sentinel' } }, retainedMetadata: { values: ['section sentinel', 17] } },
      facts: { retainedFact: 'fact sentinel', fallbackArchitectureV3: true }, source_snapshot: { retainedSource: 'source sentinel', contentSystem: 'fallback', sourcePackage: 'tldrastro-fallback-architecture-v3', review_status: 'needs_review' }, updated_at: version, target_date: null };
  });
}

async function fixture(page: Page, initialRows = fixtureRows()) {
  const child = fork(path.resolve('tests/helpers/house-transit-editor-api.mjs'), [], {
    execArgv: ['--import', 'tsx'], stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
    env: { ...process.env, HOUSE_TRANSIT_TEST_ROWS: JSON.stringify(initialRows) }
  });
  let sequence = 0, stderr = '';
  const pending = new Map<number, { resolve: (value: any) => void; reject: (error: Error) => void }>();
  child.stderr?.on('data', data => { stderr += data; });
  const ready = new Promise<void>((resolve, reject) => {
    child.on('message', (message: any) => {
      if (message.ready) return resolve();
      const task = pending.get(message.id);
      if (task) { pending.delete(message.id); message.error ? task.reject(new Error(message.error)) : task.resolve(message.result); }
    });
    child.on('exit', code => {
      const error = new Error(`House Transit fixture exited ${code}: ${stderr}`);
      reject(error); pending.forEach(task => task.reject(error));
    });
  });
  const call = (message: any) => new Promise<any>((resolve, reject) => {
    const id = ++sequence; pending.set(id, { resolve, reject }); child.send({ ...message, id });
  });
  const reads: URL[] = [], writes: { body: Row; status: number }[] = [], errors: string[] = [];
  let failingId = '', detailGate: Promise<void> | null = null;
  page.on('pageerror', error => errors.push(error.message));
  await ready;
  await page.addInitScript(() => localStorage.setItem('tldrastro:contentAdminSecret', 'calendar-api-fixture'));
  await page.route('**/api/**', async route => {
    const request = route.request(), url = new URL(request.url()), method = request.method();
    if (url.pathname.endsWith("/personal-transit-writing")) {
      return route.fulfill({ json: { ok: true, action: "generate", saved: false, published: false, approved: false, youDraft: null, friendDraft: null, checks: [] } });
    }
    if (!['/api/admin/generated-content', '/api/admin/generated-content-inventory'].includes(url.pathname)) return route.fulfill({ json: { ok: true, rows: [], records: [], statuses: [], nextCursor: null } });
    if (method === 'GET') {
      reads.push(url);
      if (url.searchParams.get('variables') === 'true') return route.fulfill({ json: { ok: true, variables: [] } });
      if (url.searchParams.has('id') || url.searchParams.has('contentKey') || url.searchParams.has('contentKeys')) {
        if (detailGate) await detailGate;
        const result = await call({ method, url: `${url.pathname}${url.search}` });
        // This fixture's catalog contains only synthetic rows, including genuine missing keys.
        return route.fulfill({ status: result.status, json: { ...result.payload, packageSource: null } });
      }
      // Production inventory does not provide editable sections; only exact detail reads may hydrate them.
      const rows = (await call({ method: 'rows' })).map(({ sections: _sections, ...row }: Row) => row);
      return route.fulfill({ json: { ok: true, rows, nextCursor: null } });
    }
    const body = request.postDataJSON();
    if (body.id === failingId) {
      failingId = '';
      writes.push({ body, status: 503 });
      return route.fulfill({ status: 503, json: { ok: false, error: 'Fixture second passage save unavailable.' } });
    }
    const result = await call({ method, body, url: `${url.pathname}${url.search}` });
    writes.push({ body, status: result.status });
    return route.fulfill({ status: result.status, json: result.payload });
  });
  return { call, reads, writes, errors, stop: () => child.kill(), failOnce: (id: string) => { failingId = id; },
    holdDetails: () => { let release!: () => void; detailGate = new Promise<void>(resolve => { release = resolve; }); return () => { detailGate = null; release(); }; } };
}

const editor = (page: Page) => page.getByRole('dialog', { name: 'House Transit write-up editor', exact: true });
const field = (dialog: Locator, index: number, audience: Audience, s = selection) => dialog.getByRole('textbox', { name: `${sources(s)[index].label} — ${audience} copy`, exact: true });
async function open(page: Page) {
  await page.getByRole('button', { name: 'Edit complete write-up', exact: true }).click();
  await expect(editor(page)).toBeVisible();
  return editor(page);
}
async function choose(dialog: Locator, audience: Audience) {
  await dialog.getByRole('tab', { name: audience, exact: true }).click();
}
async function close(dialog: Locator) { await dialog.getByRole('button', { name: /^Close/ }).click(); await expect(dialog).toBeHidden(); }
async function assertLayout(page: Page, dialog: Locator) {
  const metrics = await dialog.evaluate(el => {
    const heading = el.querySelector('h2')!, field = el.querySelector('textarea')!, label = field.closest('label')!;
    const referenceHeading = document.querySelector('.admin-main h2')!;
    const body = document.querySelector('.admin-natal-placement-finder-heading p:not(.admin-eyebrow)')!;
    const typography = (node: Element) => { const s = getComputedStyle(node); return [s.fontFamily, s.fontSize, s.fontWeight, s.lineHeight, s.letterSpacing]; };
    const hs = getComputedStyle(heading), ds = getComputedStyle(el);
    return { fieldTypography: typography(field), bodyTypography: typography(body), headingTypography: typography(heading), referenceHeadingTypography: typography(referenceHeading), heading: { margin: hs.margin, transform: hs.textTransform, align: hs.textAlign },
      labelsVisible: getComputedStyle(label).display !== 'none', radius: ds.borderRadius,
      overflow: Math.max(el.scrollWidth - el.clientWidth, document.documentElement.scrollWidth - window.innerWidth) };
  });
  expect(metrics.fieldTypography).toEqual(metrics.bodyTypography);
  expect(metrics.headingTypography).toEqual(metrics.referenceHeadingTypography);
  expect(metrics.heading.margin).toBe('0px');
  expect(metrics.heading.transform).toBe('none');
  expect(['start', 'left']).toContain(metrics.heading.align);
  expect(metrics.labelsVisible).toBe(true);
  expect(metrics.overflow).toBeLessThanOrEqual(1);
  await expect(dialog.locator('.admin-editor-savebar')).toHaveClass(/studio-surface/);
  await expect(dialog.getByRole('heading', { level: 2 })).toHaveText('Sun in Aries through your 1st house');
  const headingOrder = await page.locator('.admin-main h1,.admin-main h2,.admin-main h3').evaluateAll(nodes => nodes.slice(0, 3).map(node => node.tagName));
  expect(headingOrder).toEqual(['H1', 'H2', 'H3']);
}

for (const width of [390, 1440]) for (const theme of ['light', 'dark']) for (const audience of ['You', 'Friends'] as const) {
  test(`Combined House Transit preserves full ${audience} copy through real save and reopen ${width} ${theme}`, async ({ page }) => {
    const initial = fixtureRows(), api = await fixture(page, initial);
    try {
      await page.setViewportSize({ width, height: 1000 });
      await page.addInitScript(value => localStorage.setItem('tldrastro:studio-theme', value), theme);
      await page.goto(routePath(audience));
      const dialog = await open(page);
      await choose(dialog, audience);
      for (let i = 0; i < 2; i++) await expect(field(dialog, i, audience)).toHaveValue(initial[i].sections[fieldKey(audience)]);
      await choose(dialog, other(audience));
      for (let i = 0; i < 2; i++) await expect(field(dialog, i, other(audience))).toHaveValue(initial[i].sections[fieldKey(other(audience))]);
      await choose(dialog, audience);
      const revised = initial.slice(0, 2).map(row => `${row.sections[fieldKey(audience)]}\n\nSaved ${audience} addition for ${row.id}.`);
      for (let i = 0; i < 2; i++) await field(dialog, i, audience).fill(revised[i]);
      const preview = dialog.getByLabel(`${audience} combined draft preview`, { exact: true });
      await expect(preview).toHaveText(revised.join('\n\n'));
      expect(await preview.textContent()).toBe(revised.join('\n\n'));
      await expect(preview).toHaveCSS('white-space', 'pre-wrap');
      await assertLayout(page, dialog);
      // Capture the opening state instead of the scroll position left by filling the last field.
      await dialog.evaluate(el => {
        el.querySelectorAll('textarea').forEach(field => { field.scrollTop = 0; });
        const content = el.querySelector('.admin-post-editor');
        if (content) content.scrollTop = 0;
      });
      await dialog.screenshot({ path: `test-results/house-transit-combined-${width}-${theme}-${audience.toLowerCase()}.png` });
      await dialog.getByRole('button', { name: 'Save all changes', exact: true }).click();
      await expect.poll(() => api.writes.length).toBe(2);
      expect(api.writes.map(write => write.status)).toEqual([200, 200]);
      expect(api.writes.map(write => write.body.expectedUpdatedAt)).toEqual([version, version]);
      const saved: Row[] = await api.call({ method: 'rows' });
      for (let i = 0; i < 2; i++) {
        const row = saved.find(row => row.id === initial[i].id)!;
        expect(effectivePackageRecord(row.sections)[fieldKey(audience)]).toBe(revised[i]);
        expect(row.sections.packageDraft[fieldKey(audience)]).toBe(revised[i]);
        expect(row.sections[fieldKey(audience)]).toBe(initial[i].sections[fieldKey(audience)]);
        expect(row.sections.packageRecord[fieldKey(audience)]).toBe(initial[i].sections[fieldKey(audience)]);
        expect(row.sections[fieldKey(other(audience))]).toBe(initial[i].sections[fieldKey(other(audience))]);
        expect(row.sections.packageRecord[fieldKey(other(audience))]).toBe(initial[i].sections[fieldKey(other(audience))]);
        expect(row.sections.retainedMetadata).toEqual(initial[i].sections.retainedMetadata);
        expect(row.sections.packageRecord.retainedMetadata).toEqual(initial[i].sections.packageRecord.retainedMetadata);
        expect(row.facts.retainedFact).toBe(initial[i].facts.retainedFact);
        expect(row.source_snapshot.retainedSource).toBe(initial[i].source_snapshot.retainedSource);
        expect(row.body).toBe(initial[i].body);
        expect(row.status).toBe('DRAFT');
        expect(row.lane).toBe('reference');
      }
      expect(saved.find(row => row.id === initial[2].id)).toEqual(initial[2]);
      await close(dialog);
      await page.reload();
      await open(page);
      await choose(dialog, audience);
      for (let i = 0; i < 2; i++) await expect(field(dialog, i, audience)).toHaveValue(revised[i]);
      const detailReads = api.reads.filter(url => url.searchParams.has('id') || url.searchParams.has('contentKey') || url.searchParams.has('contentKeys'));
      expect(detailReads.length).toBeGreaterThanOrEqual(4);
      expect(api.errors).toEqual([]);
    } finally { api.stop(); }
  });
}

test('Combined editor waits for full sections instead of seeding Friends from inventory body', async ({ page }) => {
  const rows = fixtureRows(), api = await fixture(page, rows), release = api.holdDetails();
  try {
    await page.goto(routePath('Friends'));
    await page.getByRole('button', { name: 'Edit complete write-up', exact: true }).click();
    await expect.poll(() => api.reads.filter(url => url.searchParams.has('id') || url.searchParams.has('contentKey')).length).toBeGreaterThan(0);
    for (const textarea of await editor(page).locator('textarea').all()) await expect(textarea).toBeDisabled();
    expect(api.writes).toEqual([]);
    release();
    const dialog = editor(page);
    await expect(dialog).toBeVisible();
    await choose(dialog, 'Friends');
    for (let i = 0; i < 2; i++) await expect(field(dialog, i, 'Friends')).toHaveValue(rows[i].sections.body_they);
  } finally { release(); api.stop(); }
});

test('Combined editor keeps a successful first save and retries only the failed second source', async ({ page }) => {
  const rows = fixtureRows(), api = await fixture(page, rows);
  try {
    await page.goto(routePath());
    const dialog = await open(page), revised = rows.slice(0, 2).map(row => `${row.body}\n\nA complete edited ending.`);
    for (let i = 0; i < 2; i++) await field(dialog, i, 'You').fill(revised[i]);
    api.failOnce(rows[1].id);
    await dialog.getByRole('button', { name: 'Save all changes', exact: true }).click();
    await expect.poll(() => api.writes.length).toBe(2);
    expect(api.writes.map(write => write.status)).toEqual([200, 503]);
    for (let i = 0; i < 2; i++) await expect(field(dialog, i, 'You')).toHaveValue(revised[i]);
    let saved = await api.call({ method: 'rows' });
    expect(effectivePackageRecord(saved.find((row: Row) => row.id === rows[0].id).sections).body_you).toBe(revised[0]);
    expect(effectivePackageRecord(saved.find((row: Row) => row.id === rows[1].id).sections).body_you).toBe(rows[1].body);
    await dialog.getByRole('button', { name: 'Save all changes', exact: true }).click();
    await expect.poll(() => api.writes.length).toBe(3);
    expect(api.writes[2]).toMatchObject({ body: { id: rows[1].id, expectedUpdatedAt: version }, status: 200 });
    saved = await api.call({ method: 'rows' });
    for (let i = 0; i < 2; i++) expect(effectivePackageRecord(saved.find((row: Row) => row.id === rows[i].id).sections).body_you).toBe(revised[i]);
    await close(dialog); await open(page);
    for (let i = 0; i < 2; i++) await expect(field(dialog, i, 'You')).toHaveValue(revised[i]);
  } finally { api.stop(); }
});

for (const audience of ['You', 'Friends'] as const) test(`Combined editor preserves ${audience} draft on real stale-version conflict`, async ({ page }) => {
  const rows = fixtureRows(), api = await fixture(page, rows);
  try {
    await page.goto(routePath(audience));
    const dialog = await open(page); await choose(dialog, audience);
    const draft = `${rows[0].sections[fieldKey(audience)]}\n\nUnsaved local ending.`;
    await field(dialog, 0, audience).fill(draft);
    const concurrent = await api.call({ method: 'PATCH', body: { id: rows[0].id, expectedUpdatedAt: version, summary: 'Concurrent editor saved this summary.' } });
    expect(concurrent.status).toBe(200);
    await dialog.getByRole('button', { name: 'Save all changes', exact: true }).click();
    await expect.poll(() => api.writes.length).toBe(1);
    expect(api.writes[0].status).toBe(409);
    await expect(field(dialog, 0, audience)).toHaveValue(draft);
    await expect(dialog.getByRole('alert')).toContainText(/changed|newer edit/i);
    const stored = (await api.call({ method: 'rows' })).find((row: Row) => row.id === rows[0].id);
    expect(stored.summary).toBe('Concurrent editor saved this summary.');
    expect(stored.sections[fieldKey(audience)]).toBe(rows[0].sections[fieldKey(audience)]);
  } finally { api.stop(); }
});

test('Combined editor keeps blank Friends fields blank and missing sources unwritten', async ({ page }) => {
  const rows = fixtureRows();
  rows[0].sections.body_they = ''; rows[0].sections.packageRecord.body_they = '';
  rows.splice(1, 1);
  const api = await fixture(page, rows);
  try {
    await page.goto(routePath('Friends'));
    const dialog = await open(page); await choose(dialog, 'Friends');
    await expect(field(dialog, 0, 'Friends')).toHaveValue('');
    await expect(dialog).toContainText(/Partial preview/);
    const missing = field(dialog, 1, 'Friends');
    await expect(missing).toHaveValue('');
    await choose(dialog, 'You'); await expect(field(dialog, 0, 'You')).toHaveValue(rows[0].body);
    await choose(dialog, 'Friends'); await expect(field(dialog, 0, 'Friends')).toHaveValue('');
    expect(api.writes).toEqual([]);
  } finally { api.stop(); }
});

test('Combined retrograde editing saves only its exact overlay key', async ({ page }) => {
  const rx: HouseTransitSelection = { ...selection, planet: 'mercury', motion: 'retrograde' };
  const rows = fixtureRows(rx), api = await fixture(page, rows);
  try {
    await page.goto(routePath('You', rx));
    const dialog = await open(page);
    await expect(dialog.getByRole('heading', { level: 2 })).toHaveText('Mercury in Aries through your 1st house · Retrograde');
    const overlay = field(dialog, 2, 'You', rx), revised = `${rows[2].body}\n\nSaved overlay ending.`;
    await expect(overlay).toHaveValue(rows[2].body); await overlay.fill(revised);
    await dialog.getByRole('button', { name: 'Save all changes', exact: true }).click();
    await expect.poll(() => api.writes.length).toBe(1);
    expect(api.writes[0]).toMatchObject({ body: { id: rows[2].id, expectedUpdatedAt: version }, status: 200 });
    const saved = await api.call({ method: 'rows' });
    for (const row of rows.filter(row => row.id !== rows[2].id)) expect(saved.find((candidate: Row) => candidate.id === row.id)).toEqual(row);
    expect(effectivePackageRecord(saved.find((row: Row) => row.id === rows[2].id).sections).body_you).toBe(revised);
    expect(saved.find((row: Row) => row.id === rows[2].id).body).toBe(rows[2].body);
  } finally { api.stop(); }
});

test('A superseded full-source load cannot open a stale editor or leave controls disabled', async ({ page }) => {
  const api = await fixture(page), release = api.holdDetails();
  try {
    await page.goto(routePath());
    await page.getByRole('button', { name: 'Edit complete write-up', exact: true }).click();
    await expect.poll(() => api.reads.filter(url => url.searchParams.has('contentKey')).length).toBeGreaterThan(0);
    await page.evaluate(() => { window.location.hash = '#exact-content'; });
    await expect(page.getByRole('heading', { level: 1, name: 'Content Library', exact: true })).toBeVisible();
    release();
    await page.evaluate(value => { window.location.hash = value; }, routePath().split('#')[1]);
    const openButton = page.getByRole('button', { name: 'Edit complete write-up', exact: true });
    await expect(openButton).toBeEnabled();
    await expect(editor(page)).toHaveCount(0);
    await open(page);
    await expect(field(editor(page), 0, 'You')).toHaveValue(fixtureRows()[0].body);
    expect(api.errors).toEqual([]);
  } finally { release(); api.stop(); }
});

test('Combined editor traps focus and preserves dirty copy when discard is cancelled', async ({ page }) => {
  const api = await fixture(page);
  try {
    await page.goto(routePath());
    const dialog = await open(page), copy = field(dialog, 0, 'You');
    await copy.fill('Synthetic unsaved paragraph retained after cancelled navigation.');
    expect(await page.evaluate(() => !window.dispatchEvent(new Event('beforeunload', { cancelable: true })))).toBe(true);
    const save = dialog.getByRole('button', { name: 'Save all changes', exact: true });
    await save.focus(); await page.keyboard.press('Tab');
    await expect(dialog.getByRole('button', { name: 'Close', exact: true })).toBeFocused();
    await page.keyboard.press('Shift+Tab'); await expect(save).toBeFocused();
    page.once('dialog', confirm => confirm.dismiss());
    await page.keyboard.press('Escape');
    await expect(copy).toHaveValue('Synthetic unsaved paragraph retained after cancelled navigation.');
    page.once('dialog', confirm => confirm.dismiss());
    await page.evaluate(() => { window.location.hash = '#exact-content'; });
    await expect(page).toHaveURL(/view=house-transits/);
    await expect(copy).toHaveValue('Synthetic unsaved paragraph retained after cancelled navigation.');
    page.once('dialog', confirm => confirm.accept());
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    expect(api.writes).toEqual([]);
  } finally { api.stop(); }
});

test('Legacy complete passage edits its generic body while Friends stays unavailable', async ({ page }) => {
  const s: HouseTransitSelection = { planet: 'uranus', sign: 'gemini', house: '12', motion: 'direct' };
  const source = houseTransitSourceGroups(s)[1].sources.find(source => source.id === 'legacy')!;
  const original = fullCopy(source.label, 'You');
  const row = { ...fixtureRows()[0], id: 'combined-legacy', content_key: source.candidateKeys[0], headline: source.label, body: original,
    sections: { packageRecord: { contentKey: source.candidateKeys[0], content_role: 'full_copy', review_status: 'needs_review', body: original, retainedMetadata: { value: 'legacy metadata' } } } };
  const api = await fixture(page, [row]);
  try {
    await page.goto(routePath('You', s));
    const dialog = await open(page);
    const you = dialog.getByRole('textbox', { name: `${source.label} — You copy`, exact: true });
    await expect(you).toHaveValue(original);
    await expect(dialog.getByRole('textbox')).toHaveCount(1);
    await choose(dialog, 'Friends');
    const friends = dialog.getByRole('textbox', { name: `${source.label} — Friends copy`, exact: true });
    await expect(friends).toHaveValue(''); await expect(friends).toBeDisabled();
    await expect(dialog).toContainText('This older passage is used only in You.');
    await choose(dialog, 'You');
    const revised = `${original}\n\nComplete legacy revision.`;
    await you.fill(revised);
    await dialog.getByRole('button', { name: 'Save all changes', exact: true }).click();
    await expect.poll(() => api.writes.length).toBe(1);
    expect(api.writes[0].status).toBe(200);
    const saved = (await api.call({ method: 'rows' })).find((candidate: Row) => candidate.id === row.id);
    expect(saved.sections.packageDraft.body).toBe(revised);
    expect(saved.sections.packageDraft).not.toHaveProperty('body_you');
    expect(saved.sections.packageDraft).not.toHaveProperty('body_they');
    expect(saved.sections.packageRecord.body).toBe(original);
    expect(saved.body).toBe(original);
    await close(dialog); await open(page);
    await expect(you).toHaveValue(revised);
  } finally { api.stop(); }
});
