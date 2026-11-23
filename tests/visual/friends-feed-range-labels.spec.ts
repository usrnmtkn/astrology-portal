import { build } from 'esbuild';
import { readFileSync } from 'node:fs';
import { expect, test } from '../helpers/polish-test';

let script = '';
let styles = '';
test.beforeAll(async () => {
  const result = await build({
    stdin: { resolveDir: process.cwd(), loader: 'tsx', contents: `
      import React from 'react';
      import { createRoot } from 'react-dom/client';
      import { FriendsFeed } from './apps/web/src/features/friends/FriendsFeed';
      const zone = new URLSearchParams(location.search).get('zone') || 'UTC';
      const rows = [
        ['cross-year', '2026-12-31T09:00:00Z', '2027-01-02T09:00:00Z'],
        ['same-year', '2026-11-20T09:00:00Z', '2026-12-02T09:00:00Z'],
        ['local-boundary', '2026-12-31T23:30:00Z', '2027-01-01T00:30:00Z'],
      ].map(([id, startsAt, endsAt]) => ({
        id, source: 'charts', friendId: id, friendName: 'Sample Friend',
        title: id, body: 'The complete saved reading remains unchanged.',
        startsAt, endsAt, exactAt: [], orb: '1° 27′', aspect: 'trine', onOpen() {},
      }));
      createRoot(document.getElementById('root')).render(<main className='app-shell mode-friends'><section className='friends-page page-shell'><FriendsFeed
        cards={rows} filter='all' now='2026-11-20T18:00:00Z' timeZone={zone}
        loading={false} error={false} charts={[]} chartsLoading={false} onOpenChart={() => {}}
      /></section></main>);
    ` },
    bundle: true, write: false, format: 'iife', platform: 'browser',
    external: ['module'], jsx: 'automatic', outfile: 'harness.js',
    define: { 'process.env.NODE_ENV': '"production"', 'import.meta.env': '{}' },
  });
  script = result.outputFiles.find(file => file.path.endsWith('.js'))!.text;
  styles = result.outputFiles.find(file => file.path.endsWith('.css'))?.text ?? '';
});

for (const width of [390, 1440]) for (const theme of ['light', 'dark']) {
  test(`Friends feed ranges retain selected-zone years ${width} ${theme}`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 900 });
    const dist = process.env.PLAYWRIGHT_DIST_ROOT ?? 'apps/web/dist';
    const manifest = JSON.parse(readFileSync(`${dist}/.vite/manifest.json`, 'utf8'));
    const css = [...new Set<string>([manifest['src/styles.css'].file, ...(manifest['src/routes/FriendsRoute.tsx'].css ?? []), ...(manifest['src/features/friends/FriendsWorkspaceShell.tsx'].css ?? []), ...Object.values(manifest).filter((entry: any) => entry.isEntry).flatMap((entry: any) => entry.css ?? [])])];
    await page.route('**/__friends-feed-ranges**', route => route.fulfill({
      contentType: 'text/html', body: `<!doctype html><html data-theme="${theme}"><head>
        <meta name="viewport" content="width=device-width,initial-scale=1">
        ${css.map(file => `<link rel="stylesheet" href="/${file}">`).join('')}
        <style>${styles}</style></head><body><main id="root"></main><script>${script}</script></body></html>`,
    }));
    const metadata = (name: string) => page.getByRole('button').filter({ has: page.getByText(name, { exact: true }) }).locator('small');
    for (const [zone, boundary] of [
      ['UTC', 'Dec 31, 2026 – Jan 1, 2027'],
      ['America/Los_Angeles', 'Dec 31'],
      ['Asia/Tokyo', 'Jan 1'],
    ]) {
      await page.goto(`/__friends-feed-ranges?zone=${encodeURIComponent(zone)}`);
      await expect(metadata('cross-year')).toHaveText('Dec 31, 2026 – Jan 2, 2027 · 1° 27′ · Transit');
      await expect(metadata('same-year')).toHaveText('Nov 20 – Dec 2 · 1° 27′ · Transit');
      await expect(metadata('local-boundary')).toHaveText(`${boundary} · 1° 27′ · Transit`);
      await expect(page.getByText('The complete saved reading remains unchanged.', { exact: true })).toHaveCount(3);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    await page.screenshot({ path: info.outputPath('selected-zone-feed-ranges.png'), fullPage: true });
  });
}
