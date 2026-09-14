import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from '@playwright/test';

// Guest-only, read-only deployed-page verification. No owner session or database
// credentials are loaded, and no content or publication state is written.
const origin = process.env.SKY_VERIFY_ORIGIN || 'https://tldrastro.vercel.app';
const out = 'test-results/production-sky-summary';
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch();
const report = { origin, checkedAt: new Date().toISOString(), visits: [], failures: [] };
const normalize = text => text.replace(/at \d+°/gu, 'at DEGREE').replace(/for another [^.]+\./gu, 'for another DURATION.').replace(/\s+/gu, ' ').trim();
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, timezoneId: 'America/New_York' });
  // Keep the date current so the production 60-second revalidation timer runs.
  const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const url = `${origin}/?date=${date}#sky`;
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  // Record all visible opening variants, not only the final DOM after hydration.
  await context.addInitScript(() => {
    window.__skyVerification = [];
    const sample = () => {
      const body = document.querySelector('[aria-label="Daily sky summary"]');
      if (!body) return;
      const opening = body.querySelector('p')?.textContent?.trim() || '';
      if (!opening || window.__skyVerification.at(-1)?.opening === opening) return;
      window.__skyVerification.push({ ms: Math.round(performance.now()), opening, height: Math.round(body.getBoundingClientRect().height) });
    };
    new MutationObserver(sample).observe(document, { subtree: true, childList: true, characterData: true });
  });
  // Expose the original race without changing any response payloads.
  await context.route('**/rest/v1/generated_interpretations*', async route => {
    await new Promise(resolve => setTimeout(resolve, 1800));
    await route.continue();
  });
  async function capture(name, navigate, waitMs = 15000) {
    await page.evaluate(() => { window.__skyVerification = []; }).catch(() => {});
    await navigate();
    await page.locator('[aria-label="Daily sky summary"]').waitFor({ state: 'visible', timeout: 90000 });
    await page.waitForTimeout(waitMs);
    const body = page.locator('[aria-label="Daily sky summary"]');
    const samples = await page.evaluate(() => window.__skyVerification);
    const variants = [...new Set(samples.map(sample => normalize(sample.opening)))];
    const final = await body.innerText();
    const links = await body.locator('a').evaluateAll(nodes => nodes.map(node => ({ text: node.textContent, href: node.getAttribute('href') })));
    report.visits.push({ name, samples, variants, final, links });
    await page.screenshot({ path: `${out}/${name}.png`, fullPage: false });
    if (variants.length !== 1) report.failures.push(`${name}: ${variants.length} different visible opening versions`);
    if (!final.trim()) report.failures.push(`${name}: summary is empty`);
    if (!links.length || links.some(link => !link.href || link.href === '#')) report.failures.push(`${name}: missing article links`);
    console.log(JSON.stringify({ name, variants, links: links.length }));
  }
  await capture('cold-desktop', () => page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 }));
  await capture('refresh-desktop', () => page.reload({ waitUntil: 'domcontentloaded' }));
  await capture('navigation-return', async () => {
    await page.evaluate(() => { location.hash = 'calendar'; });
    await page.waitForTimeout(2000);
    await page.evaluate(() => { location.hash = 'sky'; });
  });
  await capture('background-refresh', async () => { await page.evaluate(() => window.dispatchEvent(new Event('focus'))); }, 65000);
  await context.close();
  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'America/New_York', colorScheme: 'dark' });
  const mobilePage = await mobile.newPage();
  await mobilePage.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await mobilePage.getByLabel('Daily sky summary').waitFor({ state: 'visible', timeout: 90000 });
  await mobilePage.waitForTimeout(15000);
  report.visits.push({ name: 'mobile', final: await mobilePage.getByLabel('Daily sky summary').innerText() });
  await mobilePage.screenshot({ path: `${out}/mobile.png`, fullPage: false });
  await mobile.close();
  report.pageErrors = errors;
  if (errors.length) report.failures.push(...errors);
} catch (error) {
  report.failures.push(error.stack || String(error));
} finally {
  await browser.close();
  await fs.writeFile(`${out}/report.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}
assert.equal(report.failures.length, 0, report.failures.join('\n'));
