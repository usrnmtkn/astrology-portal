import { chromium } from 'playwright';
import { readFile, writeFile } from 'node:fs/promises';
import { isAbsolute } from 'node:path';
import { LOADING_PROTOCOL, profiles } from './lib/loading-comparison.mjs';
import { startLoadingFixtureServers, instant, location, user, hash } from './lib/loading-fixture-server.mts';

const args = Object.fromEntries(process.argv.slice(2).map(arg => {
  if (!/^--[a-z]+=/u.test(arg)) throw new Error('Arguments must use --name=value.');
  const i = arg.indexOf('='); return [arg.slice(2, i), arg.slice(i + 1)];
}));
if (!args.baseline || !args.out) throw new Error('Usage: node --import tsx scripts/measure-app-loading.mts --baseline=/absolute/build [--candidate=/absolute/build] --out=/private/results.json [--runs=10] [--scenarios=sky,calendar,you,you-natal,friends] [--profiles=desktop,mobile]');
if (!isAbsolute(args.baseline) || (args.candidate && !isAbsolute(args.candidate)) || !isAbsolute(args.out) || !args.out.endsWith('.json')) throw new Error('Builds and output must use absolute paths; output must end in .json.');
const observerSource = await readFile(new URL('./lib/loading-observer.js', import.meta.url), 'utf8');
const runs = Number(args.runs ?? 10);
if (!Number.isInteger(runs) || runs < 1 || runs > 100) throw new Error('Runs must be an integer from 1 to 100.');
const scenarios: Record<string, { href: string; authenticated?: boolean; count?: number; kind: string }> = {
  sky: { href: '/?date=2026-09-21#sky', kind: 'sky' },
  calendar: { href: '/?date=2026-09-21#calendar', kind: 'calendar' },
  you: { href: '/?date=2026-09-21#you', authenticated: true, kind: 'you' },
  'you-natal': { href: '/?date=2026-09-21#you?tab=chart', authenticated: true, kind: 'you-natal' },
  friends: { href: '/#friends?tab=charts', authenticated: true, count: 5, kind: 'friends' },
  'friends-empty': { href: '/#friends?tab=charts', authenticated: true, count: 0, kind: 'friends' },
  'friends-large': { href: '/#friends?tab=charts', authenticated: true, count: 100, kind: 'friends' }
};
const selected = (args.scenarios ?? 'sky,calendar,you,you-natal,friends').split(',');
const selectedProfiles = (args.profiles ?? 'desktop,mobile').split(',');
if (selected.some(key => !scenarios[key]) || selectedProfiles.some(key => !profiles[key])) throw new Error('Unknown scenario/profile.');
if (new Set(selected).size !== selected.length || new Set(selectedProfiles).size !== selectedProfiles.length) throw new Error('Duplicate scenario/profile.');
if (args.candidate && (!selected.includes(args.primary ?? 'sky') || !selectedProfiles.includes('mobile'))) throw new Error('The primary scenario and mobile profile must be measured.');
// Refuse to overwrite an earlier batch, including its failed attempts.
await writeFile(args.out, '{}', { mode: 0o600, flag: 'wx' });
const harnessHash = hash((await Promise.all(['./measure-app-loading.mts', './lib/loading-fixture-server.mts', './lib/loading-observer.js', './lib/loading-comparison.mjs'].map(path => readFile(new URL(path, import.meta.url), 'utf8')))).join('\n'));
const servers = await startLoadingFixtureServers({ baseline: args.baseline, ...(args.candidate ? { candidate: args.candidate } : {}) });
const browser = await chromium.launch({ headless: true });
const output: any = { protocol: LOADING_PROTOCOL, environment: 'local-synthetic-services', traced: args.trace === 'true', startedAt: new Date().toISOString(),
  plannedPairs: runs, harnessHash, browser: browser.version(), profiles, identity: servers.identity, fixtureHash: servers.fixtureHash, publicationHash: servers.publicationHash,
  requiredCells: selected.flatMap(scenario => selectedProfiles.flatMap(profile => ['fresh', 'reload'].flatMap(cache => ['usable', 'content', 'fonts'].map(milestone => ({
    scenario, profile, cache, milestone, primary: scenario === (args.primary ?? 'sky') && profile === 'mobile' && cache === 'fresh' && milestone === 'content'
  }))))), samples: [] };
const save = () => writeFile(args.out, JSON.stringify(output, null, 2), { mode: 0o600 });
try {
  for (const scenario of selected) for (const profileName of selectedProfiles) for (let pair = 0; pair < runs; pair++) {
    const order = args.candidate ? (pair % 2 ? ['candidate', 'baseline'] : ['baseline', 'candidate']) : ['baseline'];
    for (const variant of order) {
      const definition = scenarios[scenario];
      const profile = profiles[profileName];
      const context = await browser.newContext({ viewport: profile.viewport, timezoneId: location.timeZone, serviceWorkers: 'block' });
      await context.addInitScript({ content: observerSource + `\ninstallLoadingObserver(${JSON.stringify({ instant, location, user, definition, scenario })});` });
      const page = await context.newPage();
      const cdp = await context.newCDPSession(page);
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: profile.cpu });
      await cdp.send('Network.enable');
      await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: profile.latency, downloadThroughput: profile.download, uploadThroughput: profile.upload });
      // External services cannot accidentally access real accounts. CDP URL
      // blocking preserves the HTTP cache; Playwright request routing does not.
      await cdp.send('Network.setBlockedURLs', { urls: ['https://*'] });
      let errors: string[] = [];
      let requestFailures: Array<{ path: string; failure: string | undefined }> = [];
      page.on('pageerror', error => { errors.push(error.message); console.error(`Browser error (${scenario}): ${error.message}`); });
      page.on('requestfailed', request => requestFailures.push({ path: new URL(request.url()).pathname, failure: request.failure()?.errorText }));
      if (args.trace === 'true') await context.tracing.start({ screenshots: true, snapshots: true });
      for (const cache of ['fresh', 'reload']) {
        errors = []; requestFailures = []; servers.reset();
        let error: string | null = null;
        try {
          if (cache === 'fresh') await page.goto(servers.urls[variant] + definition.href, { waitUntil: 'domcontentloaded' });
          else await page.reload({ waitUntil: 'domcontentloaded' });
          await page.waitForFunction(() => (window as any).__loading?.marks.fonts != null || (window as any).__loading?.failure, {}, { timeout: 60_000 });
          // Observe late replacement separately; never fold this fixed guard
          // interval into the recorded navigation-to-readiness timestamps.
          await page.waitForTimeout(1000);
        } catch (failure) { error = String(failure); }
        const state = await page.evaluate(() => {
          const region = document.querySelector('.sky-reading-layout, .lunar-calendar-view, .you-page, .friends-page');
          return { ...(window as any).__loading, text: (window as any).__loading?.readContentText?.() ?? region?.textContent ?? '',
            measures: performance.getEntriesByType('measure').map(entry => entry.toJSON()),
            resources: performance.getEntriesByType('resource').map((entry: any) => ({ path: new URL(entry.name).pathname, start: entry.startTime,
              duration: entry.duration, transferSize: entry.transferSize, encodedBodySize: entry.encodedBodySize })),
            pending: [...(region?.querySelectorAll('[aria-busy="true"], .app-loading') ?? [])].map(element => element.getAttribute('aria-label') ?? element.textContent) };
        });
        if (state.failure) error = state.failure;
        if (requestFailures.some(request => !['net::ERR_ABORTED', 'inspector'].includes(request.failure ?? ''))) error ??= 'Unexpected network failure';
        const requests = [...servers.requests];
        if (cache === 'fresh' && definition.authenticated && !requests.some(request => request.path === '/rest/v1/user_profiles')) error ??= 'Profile was not fetched from the synthetic account service';
        if (cache === 'fresh' && state.initialStorageKeys.some((key: string) => /(?:userProfile|manualCharts|verified.*sky|natal.*snapshot)/i.test(key))) error ??= 'Fresh authenticated visit contains seeded application data';
        const { text, contentText, fontsText, ...diagnostics } = state;
        if (!error && (text !== contentText || text !== fontsText)) error = 'Required content changed after its readiness marker';
        output.samples.push({ variant, scenario, profile: profileName, cache, pair, error, errors: [...errors], requestFailures, buildHash: servers.identity[variant],
          fixtureHash: servers.fixtureHash, publicationHash: servers.publicationHash, contentHash: text ? hash(text) : null, ...diagnostics, requests });
        if (error) await writeFile(args.out.replace(/\.json$/, `-${scenario}-${profileName}-${variant}-${pair}-${cache}.txt`),
          JSON.stringify({ error, contentText, fontsText, finalText: text }, null, 2), { mode: 0o600 });
        await save();
        console.log(JSON.stringify({ variant, scenario, profile: profileName, cache, pair, marks: state.marks, error, pending: state.pending, errors }));
      }
      if (args.trace === 'true') await context.tracing.stop({ path: args.out.replace(/\.json$/, `-${scenario}-${profileName}-${variant}-${pair}.zip`) });
      await context.close();
    }
  }
  output.completedAt = new Date().toISOString();
} finally { await save(); await browser.close(); await servers.close(); }
if (output.samples.some((sample: any) => sample.error || sample.errors.length)) process.exitCode = 1;
