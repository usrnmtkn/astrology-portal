import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { auditReaderScreen, expect, installReaderPolishObserver, test } from '../helpers/polish-test';
import { installSyntheticNetworkGuard } from '../helpers/synthetic-network-guard';
import { inspectMemberSourceFailures, patternInsightFixtures, withFinishedSocialReads } from '../helpers/synthetic-member-sources';

type DailySnapshot = { headline: string; body: string[]; do: string[]; dont: string[] };
type SourceTransfer = { name: string; requestedMs: number; finishedMs?: number; status?: number; finished?: boolean; sha256?: string };

// Each manually owned context writes its own trace in finally.
test.use({ trace: 'off' });

test('Daily source loading recovers after deferred content arrives', async ({ browser }, info) => {
  test.setTimeout(120000);
  const baseURL = info.project.use.baseURL;
  if (typeof baseURL !== 'string') throw new Error('Daily source regression requires the configured local preview.');
  if (!['localhost', '127.0.0.1', '[::1]', '::1'].includes(new URL(baseURL).hostname)) {
    throw new Error('Daily source regression only supports an isolated loopback preview.');
  }
  const previewOrigin = new URL(baseURL).origin;
  const sourceFiles = ['bundled-deferred-core-rows-v3.json', 'deferred-base-reader-support-v1.json', 'deferred-reader-support-transport-v1.json'];
  const provenance = Object.fromEntries(await Promise.all(sourceFiles.map(async name => [name,
    createHash('sha256').update(await readFile(new URL(`../../apps/web/src/content/fallbackArchitectureV3/${name}`, import.meta.url))).digest('hex')])));
  let control: { snapshot: DailySnapshot | null; chunks: Record<string, string | undefined>; provenance: typeof provenance } | undefined;

  for (const order of ['unheld', 'held'] as const) {
    const context = await browser.newContext({ baseURL, viewport: { width: 390, height: 1100 } });
    await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
    const network = await installSyntheticNetworkGuard(context, previewOrigin);
    const page = await context.newPage();
    const started = Date.now(), failures: string[] = [], heldChunks = new Set<string>();
    const warnings: Array<{ atMs: number; phase: string; type: string; text: string }> = [];
    const chunks: SourceTransfer[] = [], transfers: Array<Promise<void>> = [];
    let phase = 'initial', released = order === 'unheld', holdDeadlineExpired = false;
    let releaseGate!: () => void, timer: ReturnType<typeof setTimeout> | undefined;
    const gate = new Promise<void>(resolve => { releaseGate = resolve; });
    const release = () => { released = true; phase = 'released'; if (timer) clearTimeout(timer); releaseGate(); };
    const check = async (label: string, action: () => Promise<unknown>) => {
      try { await action(); } catch (error) { failures.push(`${label}: ${error instanceof Error ? error.message : String(error)}`); }
    };
    const chunkName = (url: string) => {
      const parsed = new URL(url);
      return parsed.origin === previewOrigin
        ? parsed.pathname.match(/^\/assets\/fallback-content-(base-support|reader-support|deferred-core)-[^/]+\.js$/)?.[1] ?? null : null;
    };
    let snapshot: DailySnapshot | null = null;
    try {
      await installReaderPolishObserver(page);
      page.on('console', message => {
        if (['warning', 'error'].includes(message.type())) warnings.push({ atMs: Date.now() - started, phase, type: message.type(), text: message.text() });
      });
      page.on('request', request => {
        const name = chunkName(request.url());
        if (name) chunks.push({ name, requestedMs: Date.now() - started });
      });
      page.on('response', response => {
        const name = chunkName(response.url());
        if (!name) return;
        transfers.push((async () => {
          const item = chunks.find(item => item.name === name && item.finishedMs === undefined)!;
          item.status = response.status(); item.finished = (await response.finished()) === null;
          item.sha256 = createHash('sha256').update(await response.body()).digest('hex'); item.finishedMs = Date.now() - started;
          expect(item.status).toBe(200); expect(item.finished).toBe(true);
        })());
      });
      const assertClean = await inspectMemberSourceFailures(page);
      const fixture = await patternInsightFixtures(page, 'light', { cachedSources: true });
      if (order === 'held') await page.route('**/assets/fallback-content-*.js', async route => {
        const name = chunkName(route.request().url());
        if (!name) return route.fallback();
        heldChunks.add(name); phase = 'held';
        // Release well before the existing20-second personal-source timeout.
        timer ??= setTimeout(() => { holdDeadlineExpired = true; release(); }, 10000);
        await gate; return route.fallback();
      });
      const profile = page.getByRole('region', { name: 'You', exact: true });
      const summary = profile.getByRole('region', { name: 'Daily horoscope summary', exact: true });
      const advice = profile.getByRole('region', { name: "Do and don't", exact: true });
      try {
        await check('chart/social readiness while loading', async () => {
          await withFinishedSocialReads(page, `${order}-daily`, () => page.goto('/?date=2026-10-13#you', { waitUntil: 'domcontentloaded' }), [
            ['GET', '/rest/v1/social_profiles'], ['POST', '/rest/v1/rpc/list_social_friend_requests']
          ]);
          await expect(profile.locator('.sky-wheel-transit-overlay')).toBeVisible({ timeout: 7000 });
          if (order === 'held') {
            await expect.poll(() => heldChunks.size, { timeout: 6000 }).toBe(3);
            expect(released).toBe(false);
            await expect(profile.locator('.you-transit-overview .app-loading[aria-busy="true"]').first()).toBeVisible({ timeout: 1000 });
            expect(warnings, 'Loading must not be treated as an absent source').toEqual([]);
          }
        });
      } finally { release(); }
      await check('successful source transfers', async () => {
        await expect.poll(() => new Set(chunks.filter(item => item.finished).map(item => item.name)).size, { timeout: 10000 }).toBe(3);
        await Promise.all(transfers);
      });
      await check('visible Daily recovery without navigation', async () => {
        await expect(summary.locator('h2')).toBeVisible({ timeout: 15000 });
        await expect(advice).toBeVisible({ timeout: 5000 });
        await expect(advice.locator(':scope > div').first().locator('li')).toHaveCount(3);
        await expect(advice.locator(':scope > div').last().locator('li')).toHaveCount(3);
        snapshot = { headline: (await summary.locator('h2').innerText()).trim(), body: await summary.locator('p').allTextContents(),
          do: await advice.locator(':scope > div').first().locator('li').allTextContents(), dont: await advice.locator(':scope > div').last().locator('li').allTextContents() };
        expect(snapshot.headline).not.toBe(''); expect(snapshot.body.join('').length).toBeGreaterThan(0);
      });
      await check('saved transit read and zero generation', async () => {
        await expect.poll(assertClean.completedCachedReads).toBeGreaterThan(0);
        expect(fixture.generationAttempts()).toBe(0); expect(fixture.memberSourceRequests().manualInserts).toBe(0); expect(holdDeadlineExpired).toBe(false);
      });
      const chunkHashes = Object.fromEntries(chunks.map(item => [item.name, item.sha256]));
      if (order === 'held') await check('exact governed output and provenance agreement', async () => {
        expect(control?.snapshot).not.toBeNull(); expect(snapshot).not.toBeNull();
        expect(snapshot).toEqual(control?.snapshot); expect(provenance).toEqual(control?.provenance); expect(chunkHashes).toEqual(control?.chunks);
      });
      else control = { snapshot, chunks: chunkHashes, provenance };
      await check('reader control polish', () => auditReaderScreen(page, info, `daily-source-${order}`));
      await check('strict console/API/browser receipt guard', assertClean);
      await info.attach(`daily-source-${order}`, { body: JSON.stringify({ order, snapshot, provenance, chunks, warnings, failures, holdDeadlineExpired,
        completedCachedReads: assertClean.completedCachedReads(), generationAttempts: fixture.generationAttempts(),
        successfulJoins: await page.evaluate(() => (window as unknown as { __syntheticRealtimeReceipt: { successfulJoins: number } }).__syntheticRealtimeReceipt.successfulJoins),
        sourceInstallationProof: 'Visible Daily recovery; transfer completion alone is not source installation.' }, null, 2), contentType: 'application/json' });
      expect(failures, 'Retain console/API failures independently of visible recovery').toEqual([]);
    } finally {
      release();
      await info.attach(`daily-source-${order}-network-guard`, { body: JSON.stringify(network, null, 2), contentType: 'application/json' });
      try {
        const screenshotPath = info.outputPath(`daily-source-${order}-final.png`);
        await page.screenshot({ path: screenshotPath });
        await info.attach(`daily-source-${order}-screenshot`, { path: screenshotPath, contentType: 'image/png' });
        const tracePath = info.outputPath(`daily-source-${order}-trace.zip`);
        await context.tracing.stop({ path: tracePath });
        await info.attach(`daily-source-${order}-trace`, { path: tracePath, contentType: 'application/zip' });
      } finally { await context.close(); }
      expect(network.unhandledExternal).toEqual([]);
    }
  }
});
