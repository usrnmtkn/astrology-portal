import { expect, test } from '../helpers/polish-test';
import { build } from 'esbuild';
import { readFileSync } from 'node:fs';

let script: string;
let links: string;

test.beforeAll(async () => {
  const result = await build({
    stdin: { resolveDir: process.cwd(), loader: 'tsx', contents: `
      import React from 'react';
      import { createRoot } from 'react-dom/client';
      import { YouPage } from './apps/web/src/features/you/YouPage';
      const root = createRoot(document.getElementById('root'));
      const params = new URL(location.href).searchParams;
      const count = Number(params.get('count') ?? 1);
      const weekly = params.get('weekly') !== 'false';
      const card = index => <button key={index} className="updates-aspect-row personal-transit-card" onClick={() => document.getElementById('opened').textContent = 'Long-term entry opened'}>
        <span className="updates-aspect-row__glyphs" aria-hidden="true">✶</span>
        <h3 className="updates-aspect-row__title">Long-term transit {index + 1}</h3>
        <span className="updates-aspect-row__description">Complete synthetic preview for a long-term card with a longer title and body.</span>
      </button>;
      root.render(<main className="app-shell"><YouPage
        aspectRows={[]} backgroundAspectRows={Array.from({ length: count }, (_, index) => card(index))}
        weeklyTransitRows={weekly ? [{ reading: { headline: 'Weekly Moon', source: 'weekly-moon', sourceUnits: ['fixture-weekly'], body: 'Complete synthetic weekly reading.', dayLabel: 'This week', driverLabel: 'Weekly Moon' }, preview: 'Complete synthetic weekly preview.', onOpen: () => document.getElementById('opened').textContent = 'Weekly entry opened' }] : []}
        bigThreeRows={[]} emptyHouseRows={[]} planetRows={[]} natalTableRows={[]} updateTransitAspectLines={[]}
        hasSavedBirthDetails hasSavedCurrentCity natalSky={null} currentSky={null}
        natalChartStatus="ready" natalChartError="" onCreateChart={() => {}}
        displaySun="" displayMoon="" displayRising="" profileName="Fixture Reader" profileEmail=""
        setupStepsLeft={0} signaturesReady={false} showNatalSignatures={false}
        transitDateLabel="This week" />
        <p id="opened" role="status" /></main>);
    ` },
    bundle: true, write: false, format: 'esm', jsx: 'automatic',
    loader: { '.css': 'empty' },
    define: { 'import.meta.env': JSON.stringify({ DEV: false, MODE: 'test' }) }
  });
  script = result.outputFiles[0].text;
  const manifest = JSON.parse(readFileSync(`${process.env.PLAYWRIGHT_DIST_ROOT ?? 'apps/web/dist'}/.vite/manifest.json`, 'utf8'));
  const css = new Set<string>([manifest['src/styles.css'].file]);
  const visited = new Set<string>();
  const include = (key: string) => {
    if (visited.has(key)) return;
    visited.add(key);
    for (const dependency of manifest[key].imports ?? []) include(dependency);
    for (const file of manifest[key].css ?? []) css.add(file);
  };
  include('src/features/you/YouPage.tsx');
  links = [...css].map(file => `<link rel="stylesheet" href="/${file}">`).join('');
});

for (const width of [390, 960, 1440]) for (const theme of ['light', 'dark']) {
  test(`sparse and expanded transit cards flow ${width} ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.route('**/__you-card-flow?**', route => route.fulfill({
      contentType: 'text/html', body: `<!doctype html><html data-theme="${theme}"><head><meta name="viewport" content="width=device-width, initial-scale=1">${links}</head><body><div id="root"></div><script type="module">${script}</script></body></html>`
    }));
    for (const count of [0, 1, 2, 4]) {
      await page.goto(`/__you-card-flow?count=${count}#you`);
      const cards = page.locator('.you-transit-flow .updates-aspect-row:visible');
      await expect(cards).toHaveCount(Math.min(count, 3) + 1);
      const assertFlow = async () => {
        const boxes = await cards.evaluateAll(nodes => nodes.map(node => {
          const box = node.getBoundingClientRect();
          return { x: box.x, y: box.y, width: box.width, height: box.height };
        }));
        for (let index = 1; index < boxes.length; index++) {
          const previous = boxes[index - 1], current = boxes[index];
          if (width > 800 && index % 3 !== 0) {
            expect(Math.abs(current.y - previous.y)).toBeLessThan(1);
            expect(Math.abs(current.x - previous.x - previous.width - 24)).toBeLessThan(1);
          } else {
            expect(Math.abs(current.x - boxes[0].x)).toBeLessThan(1);
            expect(current.y).toBeGreaterThanOrEqual(previous.y + previous.height + 23);
          }
        }
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      };
      await assertFlow();
      const toggle = page.getByRole('button', { name: 'See all 4', exact: true });
      if (count === 4) {
        await toggle.click();
        await expect(cards).toHaveCount(5);
        await assertFlow();
        await page.getByRole('button', { name: 'Show less', exact: true }).click();
        await expect(cards).toHaveCount(4);
        await assertFlow();
      }
      if (count === 1) {
        await page.locator('.you-transit-flow').screenshot({ path: `test-results/you-card-flow-${width}-${theme}.png` });
        await cards.first().click();
        await expect(page.locator('#opened')).toHaveText('Long-term entry opened');
        await cards.last().click();
        await expect(page.locator('#opened')).toHaveText('Weekly entry opened');
      }
    }
    await page.goto('/__you-card-flow?count=1&weekly=false#you');
    await expect(page.locator('.you-transit-flow .updates-aspect-row')).toHaveCount(1);
    await page.goto('/__you-card-flow?count=0&weekly=false#you');
    await expect(page.locator('.you-transit-flow')).toHaveCount(0);
  });
}
