import { expect, test } from '@playwright/test';
import { build } from 'esbuild';
import { readFileSync } from 'node:fs';

let script = '';
test.beforeAll(async () => {
  const output = await build({ stdin: { resolveDir: process.cwd(), loader: 'tsx', contents: `
    import React from 'react';
    import {createRoot} from 'react-dom/client';
    import {SkyWheel,signs} from './apps/web/src/components/charts/Wheels';
    import {SynastryWheel} from './apps/web/src/components/charts/SynastryWheel';
    import {CompositeWheel} from './apps/web/src/components/charts/CompositeWheel';
    const kind = new URLSearchParams(location.search).get('kind');
    const names = ['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn','Uranus','Neptune','Pluto','North Node','South Node','Chiron','Lilith'];
    const sky = [214,54,230,208,136,143,9,64,2,303,327,147,28,251];
    const natal = [329,223,307,284,322,120,161,230,260,199,347,167,35,155];
    const positions = (values) => names.map((planet,index) => ({planet,longitude:values[index],sign:signs[Math.floor(values[index]/30)],degree:values[index]%30,glyph:planet,motion:index===2||index===3?'retrograde':'direct'}));
    const props = {positions:positions(kind==='sky'?sky:natal),aspects:[],ascendant:'Gemini',ascendantLongitude:kind==='sky'?300:71,midheavenLongitude:kind==='sky'?230:347,showHouses:true,aspectInspector:true};
    createRoot(document.getElementById('root')).render(kind==='synastry'
      ? <SynastryWheel outerPositions={positions(natal)} innerPositions={positions(natal)} interAspects={[]} ascendant='Gemini' ascendantLongitude={71} midheavenLongitude={347} aspectInspector />
      : kind==='composite' ? <CompositeWheel {...props} /> : <SkyWheel {...props} variant={kind==='sky'?'zodiac':'natal'} transitPositions={kind==='transit'?positions(sky):[]} />);
  ` }, bundle: true, write: false, platform: 'browser', format: 'iife', jsx: 'automatic',
    define: { 'process.env.NODE_ENV': '"production"', 'import.meta.env': '{"BASE_URL":"/"}' } });
  script = output.outputFiles[0].text;
});

for (const width of [390, 1440]) for (const theme of ['light', 'dark']) for (const kind of ['sky','natal','composite','synastry','transit']) {
  test(`wheel label clearance ${kind} ${width} ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    const dist = process.env.PLAYWRIGHT_DIST_ROOT ?? 'apps/web/dist';
    const manifest = JSON.parse(readFileSync(`${dist}/.vite/manifest.json`, 'utf8'));
    const styles = [...manifest['index.html'].css, manifest['src/styles.css'].file];
    await page.route('**/__wheel-clearance?**', route => route.fulfill({ contentType: 'text/html', body:
      `<!doctype html><html data-theme="${theme}"><head><meta name="viewport" content="width=device-width,initial-scale=1">${styles.map(file => `<link rel="stylesheet" href="/${file}">`).join('')}</head><body><main id="root"></main><script>${script}</script></body></html>` }));
    await page.goto(`/__wheel-clearance?kind=${kind}`);
    const svg = page.locator('svg.sky-wheel').first();
    await expect(svg).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    await expect(svg.locator('.planet-marker')).toHaveCount(kind==='synastry'||kind==='transit'?28:14);
    const geometry = await svg.evaluate(root => {
      const nodes = [...root.querySelectorAll<SVGGraphicsElement>('.wheel-placement__glyph, .wheel-placement__degree, .zodiac-wheel__angle-badge')];
      const boxes = nodes.map(node => ({ name: node.closest('[data-inspector-point-id]')?.getAttribute('data-inspector-point-id') ?? node.getAttribute('aria-label') ?? node.textContent,
        kind: node.classList.contains('wheel-placement__glyph')?'glyph':node.classList.contains('wheel-placement__degree')?'degree':'angle', box: node.getBoundingClientRect().toJSON() }));
      const overlaps = boxes.flatMap((a,index) => boxes.slice(index+1).flatMap(b =>
        Math.min(a.box.right,b.box.right)-Math.max(a.box.left,b.box.left)>0.5 && Math.min(a.box.bottom,b.box.bottom)-Math.max(a.box.top,b.box.top)>0.5 ? [{a,b}] : []));
      const ticks = [...root.querySelectorAll<SVGLineElement>('.wheel-placement__tick')];
      const tickOverlaps = ticks.flatMap(tick => {
        const stroke = tick.getBoundingClientRect();
        const maskId = tick.getAttribute('mask')?.match(/^url\(#(.+)\)$/)?.[1];
        const cutouts = maskId ? [...root.querySelectorAll<SVGRectElement>(`mask[id="${maskId}"] [data-wheel-label-cutout]`)].map(rect => {
          const matrix = root.getScreenCTM()!;
          const start = new DOMPoint(rect.x.baseVal.value, rect.y.baseVal.value).matrixTransform(matrix);
          const end = new DOMPoint(rect.x.baseVal.value+rect.width.baseVal.value, rect.y.baseVal.value+rect.height.baseVal.value).matrixTransform(matrix);
          return {left:start.x,top:start.y,right:end.x,bottom:end.y};
        }) : [];
        return boxes.filter(box => box.kind !== 'angle').flatMap(label =>
          Math.min(stroke.right+0.8,label.box.right)-Math.max(stroke.left-0.8,label.box.left)>0.25
          && Math.min(stroke.bottom+0.8,label.box.bottom)-Math.max(stroke.top-0.8,label.box.top)>0.25
          && !cutouts.some(box => box.left<label.box.left-0.8 && box.right>label.box.right+0.8 && box.top<label.box.top-0.8 && box.bottom>label.box.bottom+0.8)
          ? [{tick:tick.closest('[data-inspector-point-id]')?.getAttribute('data-inspector-point-id'), label}] : []);
      });
      const tickLengths = ticks.map(tick => Math.hypot(tick.x2.baseVal.value-tick.x1.baseVal.value,tick.y2.baseVal.value-tick.y1.baseVal.value));
      const badgesAboveTicks = [...root.querySelectorAll('.zodiac-wheel__angle-badge')].every(badge =>
        ticks.every(tick => Boolean(tick.compareDocumentPosition(badge) & Node.DOCUMENT_POSITION_FOLLOWING)));
      const divider = Number(root.querySelector('.wheel-surfaces circle:nth-child(2)')?.getAttribute('r'));
      const radii = [...root.querySelectorAll<SVGGElement>('.zodiac-wheel__angle-badge')].map(node => {
        const matrix = node.transform.baseVal.consolidate()!.matrix;
        return Math.hypot(matrix.e-300,matrix.f-300);
      });
      return { overlaps, tickOverlaps, tickLengths, badgesAboveTicks, divider, radii };
    });
    expect(geometry.overlaps, 'Rendered glyph, degree and angle-label boxes must remain separate').toEqual([]);
    expect(geometry.tickOverlaps, 'Longitude strokes must clear all glyphs and degree labels').toEqual([]);
    for (const length of geometry.tickLengths) expect(length).toBeCloseTo(6, 3);
    expect(geometry.badgesAboveTicks, 'Exact angle badges cover coincident longitude strokes').toBe(true);
    expect(geometry.radii).toHaveLength(4);
    for (const radius of geometry.radii) expect(radius).toBeCloseTo(geometry.divider, 3);
    const facts = await svg.locator('.planet-marker').evaluateAll(nodes => nodes.map(node => node.getAttribute('aria-label')));
    const planet = svg.locator('.planet-marker').first();
    await planet.focus(); await page.keyboard.press('Enter');
    await expect(planet).toHaveClass(/aspect-inspector-point--selected/);
    await page.keyboard.press('Escape');
    const angle = svg.locator('.zodiac-wheel__angle-badge').first();
    await angle.click();
    await expect(angle).toHaveClass(/aspect-inspector-point--selected/);
    await page.keyboard.press('Escape');
    expect(await svg.locator('.planet-marker').evaluateAll(nodes => nodes.map(node => node.getAttribute('aria-label')))).toEqual(facts);
    await svg.screenshot({ path: test.info().outputPath(`wheel-${kind}-${width}-${theme}.png`) });
  });
}
