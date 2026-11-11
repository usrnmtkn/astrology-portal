import { test, expect } from '@playwright/test';
import { createHash } from 'node:crypto';
import fs from 'node:fs';

const source = fs.readFileSync('docs/writing/SKY_CALENDAR_ASPECT_STANDARD.md', 'utf8');
const sourceHash = createHash('sha256').update(source).digest('hex');
const readerUrl = '/admin/content/memory?view=writing-standard';
const first = "Write planetary aspect interpretations that help readers understand what's happening in the sky, how the planets interact, and how that interaction might show up in everyday life.";
const last = 'And if the reader has to work to understand what a sentence means, rewrite the sentence.';
const plainSource = source.split('\n').map(line => line.startsWith('#')
  ? line.replace(/^#{1,3} /u, '') : line.replace(/^\s*(?:[-+*]|\d+\.)\s+/u, ''))
  .join('').replace(/\*/gu, '').replace(/\s/gu, '');

for (const width of [1440, 390]) for (const theme of ['light', 'dark'] as const) {
  test(`complete standard is one readable authenticated page ${width} ${theme}`, async ({ page }) => {
    test.setTimeout(60_000);
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ colorScheme: theme });
    await page.addInitScript(theme => {
      localStorage.setItem('tldrastro:contentAdminSecret', 'memory-browser-fixture');
      localStorage.setItem('tldrastro:studio-theme', theme);
    }, theme);
    let failOnce = true;
    const requests: string[] = [];
    await page.route('**/api/admin/memory-graph?**', async route => {
      const mode = new URL(route.request().url()).searchParams.get('mode') || 'graph';
      requests.push(mode);
      if (mode === 'standard' && failOnce) {
        failOnce = false;
        await route.fulfill({ status: 503, json: { ok: false, authFailure: 'temporary', error: 'Temporary verification failure' } });
      } else await route.continue(); // Successful document reads use the real owner-protected handler.
    });
    await page.goto('/admin/content/memory');
    await expect(page.getByRole('button', { name: 'Fit', exact: true })).toBeVisible();
    requests.length = 0;
    const response = page.waitForResponse(response => new URL(response.url()).searchParams.get('mode') === 'standard' && response.status() === 200);
    await page.getByRole('link', { name: 'Writing standard', exact: true }).click();
    const payload = await (await response).json();
    expect(payload.standard.body).toBe(source);
    expect(payload.standard.bodySha256).toBe(sourceHash);
    expect(payload.standard.sourceSha256).toBe(sourceHash);
    const article = page.getByRole('article', { name: 'Writing standard', exact: true });
    await expect(article).toBeVisible();
    await expect(page.locator('main')).toHaveAttribute('data-studio-theme', theme);
    await expect(article.getByText(first, { exact: true })).toBeVisible();
    await expect(article.getByText(last, { exact: true })).toBeVisible();
    expect((await article.textContent())!.replace(/\s/gu, '')).toBe(plainSource);
    await expect(article.locator('details')).toHaveCount(0);
    await expect(article.locator('h1')).toHaveCount(1);
    await expect(article.getByRole('heading')).toHaveCount(19);
    await expect(article.locator('strong').filter({ hasText: 'The aspect must change the story.' })).toBeVisible();
    expect(requests).toEqual(['standard', 'standard']);
    await expect(page.locator('.memory-reference-root')).toHaveCount(0);
    await expect(page.getByRole('alert')).toHaveCount(0);
    const typography = await article.evaluate(article => {
      const fields = ['fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'textTransform', 'marginTop', 'marginBottom'] as const;
      return ['h1', 'h2', 'h3', 'p', 'li'].map(tag => {
        const actual = article.querySelector(tag)!;
        const reference = document.createElement(tag);
        document.querySelector('main')!.append(reference);
        const expected = getComputedStyle(reference), computed = getComputedStyle(actual);
        const result = { tag, actual: Object.fromEntries(fields.map(field => [field, computed[field]])), expected: Object.fromEntries(fields.map(field => [field, expected[field]])) };
        reference.remove(); return result;
      });
    });
    for (const item of typography) expect(item.actual, item.tag).toEqual(item.expected);
    const headings = await article.getByRole('heading').evaluateAll(nodes => nodes.map(node => Number(node.tagName.slice(1))));
    expect(headings[0]).toBe(1);
    headings.slice(1).forEach((level, index) => expect(level).toBeLessThanOrEqual(headings[index] + 1));
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: test.info().outputPath(`complete-standard-${width}-${theme}.png`) });
    await article.getByText(last, { exact: true }).scrollIntoViewIfNeeded();
    await expect(article.getByText(last, { exact: true })).toBeInViewport();
    await page.screenshot({ path: test.info().outputPath(`complete-standard-end-${width}-${theme}.png`) });
    await page.reload();
    await expect(article.getByText(first, { exact: true })).toBeVisible();
    await expect(article.getByText(last, { exact: true })).toBeVisible();
    await expect(article).toHaveAttribute('data-source-sha256', sourceHash);
    expect((await page.request.get('/api/admin/memory-graph?mode=standard')).status()).toBe(401);
    await page.getByRole('link', { name: 'Memory graph', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Fit', exact: true })).toBeVisible();
  });
}

test('full standard failure stays explicit and Try again recovers without a new sign-in', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('tldrastro:contentAdminSecret', 'memory-browser-fixture'));
  let fail = true;
  await page.route('**/api/admin/memory-graph?mode=standard', route => fail
    ? route.fulfill({ status: 500, json: { ok: false, error: 'Memory sources could not be loaded. Please retry.' } })
    : route.continue());
  await page.goto(readerUrl);
  await expect(page.getByRole('alert')).toContainText('Memory sources could not be loaded');
  await expect(page.getByRole('article', { name: 'Writing standard' })).toHaveCount(0);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Writing standard');
  fail = false;
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(page.getByRole('article').getByText(last, { exact: true })).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('anonymous full-standard page retains the existing owner sign-in boundary', async ({ page }) => {
  await page.goto(readerUrl);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Writing standard');
  await expect(page.getByRole('article')).toHaveCount(0);
  await expect(page.getByLabel('Emergency admin secret', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Emergency admin secret', { exact: true })).toHaveAttribute('type', 'password');
  const signIn = await page.getByRole('link', { name: 'Sign in as owner', exact: true }).getAttribute('href');
  expect(new URL(signIn!, 'https://studio.invalid').searchParams.get('returnTo')).toBe(readerUrl);
  const response = await page.request.get('/api/admin/memory-graph?mode=standard');
  expect(response.status()).toBe(401);
  expect((await response.json()).standard).toBeUndefined();
});
