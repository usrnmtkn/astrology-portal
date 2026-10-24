import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createServer } from 'vite';

const content = 'apps/web/src/content/fallbackArchitectureV3/';
const source = fs.readFileSync(content + 'bundled-sky-placement-rows-v3.json');
const initial = JSON.parse(fs.readFileSync(content + 'initial-sky-list-rows-v1.json', 'utf8'));
assert.equal(initial.sourceSha256, createHash('sha256').update(source).digest('hex'));
assert.deepEqual(initial.hookRows, JSON.parse(String(source)).hookRows.filter((row: any) => /(?:^|\/)moon\//u.test(row.contentKey)), 'Every Moon source unit remains complete and unchanged.');

const vite = await createServer({
  root: path.join(process.cwd(), 'apps/web'), appType: 'custom', logLevel: 'silent', server: { middlewareMode: true },
  plugins: [{ name: 'initial-list-parity-exports', enforce: 'pre', transform(code, id) {
    if (id.endsWith('/src/App.tsx')) return code + '\nexport { normalizeSkyPlacementSurface, normalizedSurfacePreview };';
    if (id.includes('/fallbackArchitectureV3/authored-inputs/') && id.endsWith('.json?url')) {
      return `export default ${fs.readFileSync(id.slice(0, -4), 'utf8')};`;
    }
  } }]
});
try {
  const app = await vite.ssrLoadModule('/src/App.tsx');
  const runtime = await vite.ssrLoadModule('/src/content/fallbackArchitectureV3Runtime.ts');
  const [first, joined] = await Promise.all([
    runtime.loadInitialSkyListFallbackArchitectureV3Bundle(), runtime.loadInitialSkyListFallbackArchitectureV3Bundle()
  ]);
  assert.equal(first, true); assert.equal(joined, true);
  assert.equal(runtime.isSkyPlacementFallbackArchitectureV3BundleLoaded(false), false, 'List sources cannot claim complete archive readiness.');
  assert.equal(runtime.isSkyPlacementFallbackArchitectureV3BundleLoaded(), false, 'List sources cannot claim house readiness.');
  const signs = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
  const planets = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto', 'Chiron', 'Lilith', 'North Node', 'South Node'];
  const cases: any[] = [];
  for (const planet of planets) for (const [index, sign] of signs.entries()) {
    const motions = ['Sun', 'Moon', 'Lilith', 'North Node', 'South Node'].includes(planet) ? ['direct'] : ['direct', 'retrograde'];
    for (const motion of motions) {
      // Synthetic adapter facts: source parity, independent of a real ephemeris.
      const position = { planet, sign, motion, degree: 3.5, house: 1,
        transitStart: '2026-09-01T12:00:00Z', transitEnd: '2026-12-01T12:00:00Z', transitTimeZone: 'UTC' };
      const positions = [position,
        { ...position, planet: 'North Node', sign: planet === 'South Node' ? signs[(index + 6) % 12] : sign },
        { ...position, planet: 'South Node', sign: planet === 'South Node' ? sign : signs[(index + 6) % 12] }];
      const options = { positions, locationLatitude: 40.7, locationTimeZone: 'UTC' };
      const render = (list: boolean) => app.normalizeSkyPlacementSurface(position, null, new Map(), [], '2026-10-23T16:00:00Z', undefined, { ...options, collectiveList: list });
      const value = render(true);
      assert.equal(value.status, 'servable', `${planet} ${sign} ${motion} must resolve.`);
      cases.push({ label: `${planet}/${sign}/${motion}`, render, value });
    }
  }
  await runtime.loadSkyPlacementFallbackArchitectureV3Bundle();
  assert.equal(runtime.isSkyPlacementFallbackArchitectureV3BundleLoaded(), true);
  for (const { label, render, value } of cases) {
    const full = render(false), warmed = render(true);
    assert.equal(app.normalizedSurfacePreview(value), app.normalizedSurfacePreview(full), `${label}: exact visible list text matches the full reader.`);
    assert.deepEqual(value, warmed, `${label}: loading the article archive cannot change list output.`);
    assert.deepEqual(value.sections.map((section: any) => section.body), full.sections.map((section: any) => section.body), `${label}: complete canonical bodies are unchanged.`);
    assert.deepEqual(value.sections.map((section: any) => section.sourceKeys), full.sections.map((section: any) => section.sourceKeys), `${label}: source identity is unchanged.`);
  }
  assert.equal(await runtime.loadInitialSkyListFallbackArchitectureV3Bundle(), false, 'A late list load cannot replace a complete reader.');
  const original = runtime.skyV4ReaderRenderer.renderRoute;
  runtime.skyV4ReaderRenderer.renderRoute = () => { throw new Error('SKY_V4_SOURCE_GAP: synthetic unavailable source'); };
  assert.equal(cases.find(({ label }) => label === 'Sun/Aries/direct').render(true).status, 'not-servable', 'Missing canonical sources fail closed.');
  runtime.skyV4ReaderRenderer.renderRoute = original;
  console.log(`PASS: ${cases.length} initial Sky list cases preserve exact previews, complete bodies and source identities; full article/house readiness remains separate.`);
} finally { await vite.close(); }
