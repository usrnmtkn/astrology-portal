import fs from 'node:fs/promises';
import { chromium } from '@playwright/test';

// Read-only public guest inspection. Delay real responses; never rewrite them,
// load an owner session, or write content/publication data.
const origin = process.env.SKY_VERIFY_ORIGIN || 'https://tldrastro.vercel.app';
const out = 'test-results/sky-placement-observation';
await fs.mkdir(out, { recursive: true });
const report = { origin, checkedAt: new Date().toISOString(), visits: [] };
const browser = await chromium.launch();
try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 }, timezoneId: 'America/New_York' });
    await context.addInitScript(() => {
      window.__placementObservation = {};
      const sample = () => {
        const record = (key, element) => {
          if (!element || !element.getClientRects().length) return;
          const text = element.textContent.trim().replace(/\s+/g, ' ');
          if (!text) return;
          const history = window.__placementObservation[key] ||= [];
          if (history.at(-1)?.text !== text) history.push({ ms: Math.round(performance.now()), text });
        };
        for (const card of document.querySelectorAll('.planet-placement-row--sky')) {
          record('card:' + card.querySelector('.planet-placement-row__title')?.textContent, card.querySelector('.planet-placement-row__description'));
        }
        record('article:' + location.hash, document.querySelector('.article-body-inner'));
        record('summary', document.querySelector('[aria-label="Daily sky summary"] > p'));
        requestAnimationFrame(sample);
      };
      requestAnimationFrame(sample);
    });
    await context.route('**/rest/v1/generated_interpretations*', async route => {
      await new Promise(resolve => setTimeout(resolve, 1400));
      await route.continue();
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    async function capture(name, navigate, wait = 20000) {
      await page.evaluate(() => { window.__placementObservation = {}; }).catch(() => {});
      await navigate();
      await page.waitForTimeout(wait);
      const histories = await page.evaluate(() => window.__placementObservation);
      const changed = Object.entries(histories).filter(([, history]) => new Set(history.map(entry => entry.text)).size > 1).map(([key]) => key);
      report.visits.push({ width, name, url: page.url(), histories, changed, errors: [...errors] });
      console.log(JSON.stringify({ width, name, changed, histories }));
      await page.screenshot({ path: `${out}/${width}-${name}.png` });
    }
    await capture('cold-cards', () => page.goto(`${origin}/#sky`, { waitUntil: 'domcontentloaded', timeout: 90000 }));
    await capture('warm-focus', () => page.evaluate(() => window.dispatchEvent(new Event('focus'))), 35000);
    // Use a displayed placement target, rather than guessing the current sign.
    const target = await page.locator('[aria-label="Daily sky summary"] a[href*="sky/placement/"]').first().getAttribute('href').catch(() => '#sky/placement/sun/virgo');
    await capture('opened-article', () => page.goto(`${origin}/${target}`, { waitUntil: 'domcontentloaded', timeout: 90000 }));
    await capture('reloaded-article', () => page.reload({ waitUntil: 'domcontentloaded', timeout: 90000 }));
    await context.close();
  }
} catch (error) {
  report.error = error.stack || String(error);
  process.exitCode = 1;
} finally {
  await browser.close();
  await fs.writeFile(`${out}/report.json`, JSON.stringify(report, null, 2));
}
