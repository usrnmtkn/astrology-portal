import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from '@playwright/test';

// Fresh guest sessions; response payloads and publication state are never edited.
const origin = process.env.SKY_VERIFY_ORIGIN || 'https://tldrastro.vercel.app';
const out = 'test-results/production-sky-placement';
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch();
const report = { origin, checkedAt: new Date().toISOString(), visits: [], failures: [] };
try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 }, timezoneId: 'America/New_York' });
    await context.route('**/rest/v1/generated_interpretations*', async route => {
      await new Promise(resolve => setTimeout(resolve, 1800));
      await route.continue();
    });
    await context.addInitScript(() => {
      window.__placementSamples = [];
      window.__samplePlacement = () => {
        const body = document.querySelector('.sky-detail-article .article-body-inner');
        const text = body?.textContent?.trim();
        if (!text || text === window.__placementSamples.at(-1)?.text) return;
        window.__placementSamples.push({ ms: performance.now(), text, height: body.getBoundingClientRect().height });
      };
      new MutationObserver(window.__samplePlacement).observe(document, { subtree: true, childList: true, characterData: true });
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const url = `${origin}/#sky/placement/sun/virgo`;
    let selected;
    for (const name of ['cold', 'reload', 'navigation-return', 'background-refresh']) {
      if (name === 'cold') await page.goto(url, { waitUntil: 'domcontentloaded' });
      if (name === 'reload') await page.reload({ waitUntil: 'domcontentloaded' });
      if (name === 'navigation-return') {
        await page.getByRole('button', { name: 'Close detail', exact: true }).click();
        await page.waitForTimeout(1000);
        await page.evaluate(() => { window.__placementSamples = []; location.hash = 'sky/placement/sun/virgo'; });
      }
      if (name === 'background-refresh') await page.evaluate(() => { window.__placementSamples = []; window.__samplePlacement(); window.dispatchEvent(new Event('focus')); });
      const body = page.locator('.sky-detail-article .article-body-inner').first();
      await body.waitFor({ state: 'visible', timeout: 90000 });
      const height = await body.evaluate(element => element.getBoundingClientRect().height);
      let collapsed = false;
      const deadline = Date.now() + (name === 'background-refresh' ? 65000 : 10000);
      while (Date.now() < deadline) {
        await page.waitForTimeout(250);
        const size = await body.evaluateAll(elements => elements[0]?.getBoundingClientRect().height ?? 0);
        if (size < height - 1) collapsed = true;
      }
      const samples = await page.evaluate(() => window.__placementSamples);
      const final = (await body.textContent()).trim();
      selected ??= final;
      const variants = [...new Set(samples.map(sample => sample.text))];
      const pass = variants.length === 1 && variants[0] === selected && final === selected && !collapsed;
      report.visits.push({ name, width, pass, variants: variants.length, opening: final.slice(0, 180), ending: final.slice(-180), collapsed, samples });
      if (!pass) report.failures.push(`${width}/${name}: prose changed or the card collapsed`);
      await page.screenshot({ path: `${out}/${width}-${name}.png` });
      console.log(JSON.stringify({ width, name, pass, variants: variants.length, collapsed }));
    }
    if (errors.length) report.failures.push(...errors);
    await context.close();
  }
} catch (error) { report.failures.push(error.stack || String(error)); }
finally {
  await browser.close();
  await fs.writeFile(`${out}/report.json`, JSON.stringify(report, null, 2));
}
assert.equal(report.failures.length, 0, report.failures.join('\n'));
