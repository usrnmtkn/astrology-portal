import { createServer } from 'node:http';
import { readFile, readdir, realpath } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { getAstrodienstSky, getLunarCalendarDayEvents } from '../../apps/web/src/services/ephemeris.ts';
import { publicationLedgerTag } from '../../apps/web/src/services/publicationLedgerTransport.ts';
import { READER_ROW_SCHEMA } from '../../apps/web/src/content/readerRowProjection.mjs';

export const instant = '2026-09-21T16:00:00.000Z';
export const location = { label: 'New York, NY', latitude: 40.7128, longitude: -74.006, timeZone: 'America/New_York' };
export const user = { id: '00000000-0000-4000-8000-000000000123', email: 'loading-fixture@example.invalid',
  aud: 'authenticated', role: 'authenticated', app_metadata: { provider: 'email' }, user_metadata: { name: 'Loading Fixture' }, created_at: instant };
export const profile = { id: user.id, name: 'Loading Fixture', email: user.email, provider: 'email', currentLocation: location.label,
  currentLocationData: location, charts: [{ id: 'fixture-birth', name: 'Loading Fixture', type: 'Birth chart',
    birthDate: '1990-01-01', birthTime: '12:00 PM', birthCity: location.label, birthLocation: location }] };
const publications = [{ content_key: '__content-publication-ledger/v1', state: 'live' as const, revision: 1,
  row_id: null, row_updated_at: null, updated_at: instant }];
export const hash = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');
const types: Record<string, string> = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json',
  '.wasm': 'application/wasm', '.data': 'application/octet-stream', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.png': 'image/png', '.ico': 'image/x-icon' };

/** Local-only synthetic services and immutable built assets; no browser routing,
 * live database, account, paid generation, or production credentials. */
export async function startLoadingFixtureServers(roots: Record<string, string>, ports = { api: 4260, baseline: 4262, candidate: 4263 }) {
  const sky = await getAstrodienstSky(location, new Date(instant), { includeTransitWindows: true });
  sky.dailyEvents = await getLunarCalendarDayEvents(location, new Date(instant));
  const natal = await getAstrodienstSky(location, new Date('1988-04-03T13:15:00Z'), { includeTransitWindows: false });
  const charts = Array.from({ length: 100 }, (_, index) => ({ id: `00000000-0000-4000-8000-${String(index + 1000).padStart(12, '0')}`,
    owner_user_id: user.id, chart_type: 'person', display_name: `Fixture Friend ${String(index + 1).padStart(3, '0')}`,
    first_name: `Fixture Friend ${index + 1}`, last_name: null, relationship_type: 'friend', birth_date: '1988-04-03', birth_time: '09:15',
    birth_time_unknown: false, birth_place: location.label, birth_latitude: location.latitude, birth_longitude: location.longitude,
    birth_timezone: location.timeZone, natal_chart: natal, notes: null, created_at: instant, updated_at: instant }));
  const publicationHash = await publicationLedgerTag(publications);
  const fixtureHash = hash(JSON.stringify({ version: 2, instant, location, user, profile, charts, sky, publications,
    apiDelayMs: 100, calendar: 'unavailable-local-fallback', remoteCalculations: 'unavailable-local-fallback' }));
  const manifests: Record<string, { buildHash: string; assets: Map<string, { bytes: Buffer; gzip: Buffer; etag: string; type: string }> }> = {};
  for (const [variant, directory] of Object.entries(roots)) {
    const root = await realpath(directory);
    const files = (await readdir(root, { recursive: true, withFileTypes: true })).filter(file => file.isFile());
    const assets = new Map();
    for (const file of files) {
      const path = resolve(file.parentPath, file.name);
      if (!(await realpath(path)).startsWith(root + sep)) throw new Error('Asset outside isolated build');
      const bytes = await readFile(path);
      const key = '/' + path.slice(root.length + 1).split(sep).join('/');
      assets.set(key, { bytes, gzip: gzipSync(bytes), etag: `"${hash(bytes)}"`, type: types[extname(path)] ?? 'application/octet-stream' });
    }
    const buildHash = hash(JSON.stringify([...assets.entries()].map(([path, value]) => [path, value.etag]).sort()));
    manifests[variant] = { buildHash, assets };
  }
  const requests: Array<{ path: string; scenario: string; method: string; startedMs: number; durationMs?: number; status?: number; bytes?: number }> = [];
  let sampleStartedAt = performance.now();
  const servers: ReturnType<typeof createServer>[] = [];
  try {
    for (const [variant, port] of Object.entries(ports).filter(([name]) => name === 'api' || manifests[name])) {
      const server = createServer(async (req, res) => {
        try {
          const url = new URL(req.url!, `http://127.0.0.1:${port}`);
          const path = url.pathname;
          const origin = req.headers.origin;
          if (origin && Object.values(ports).some(value => origin === `http://127.0.0.1:${value}`)) {
            res.setHeader('Access-Control-Allow-Origin', origin);
            res.setHeader('Access-Control-Allow-Headers', req.headers['access-control-request-headers'] ?? 'authorization, apikey, content-type');
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
            res.setHeader('Access-Control-Allow-Private-Network', 'true');
            res.setHeader('Access-Control-Expose-Headers', 'content-range');
          }
          res.setHeader('Cache-Control', 'no-store');
          if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return; }
          const scenario = String(req.headers.authorization ?? '').replace('Bearer loading-', '') || 'anonymous';
          const record: (typeof requests)[number] = { path, scenario, method: req.method!, startedMs: performance.now() - sampleStartedAt };
          const requestStartedAt = performance.now();
          requests.push(record);
          res.once('finish', () => {
            record.durationMs = performance.now() - requestStartedAt;
            record.status = res.statusCode; record.bytes = Number(res.getHeader('Content-Length') ?? 0);
          });
          const json = (value: unknown, status = 200) => {
            res.statusCode = status; res.setHeader('Content-Type', 'application/json');
            const compressed = String(req.headers['accept-encoding']).includes('gzip');
            const body = compressed ? gzipSync(JSON.stringify(value)) : Buffer.from(JSON.stringify(value));
            if (compressed) res.setHeader('Content-Encoding', 'gzip');
            res.setHeader('Vary', 'Accept-Encoding'); res.setHeader('Content-Length', body.length); res.end(body);
          };
          if (path.startsWith('/auth/') || path.startsWith('/rest/') || path.startsWith('/api/') || path.startsWith('/v1/')) {
            await new Promise(done => setTimeout(done, 100));
            if (path === '/auth/v1/user') { json(user); return; }
            if (path === '/auth/v1/logout') { json({}); return; }
            if (path === '/rest/v1/user_profiles') { json({ data: { version: 1, profile } }); return; }
            if (path === '/rest/v1/manual_charts') {
              const rows = charts.slice(0, scenario.includes('empty') ? 0 : scenario.includes('large') ? 100 : 5);
              json(scenario.includes('repair') ? rows.map(row => ({ ...row, natal_chart: null })) : rows); return;
            }
            if (path === '/rest/v1/social_profiles') { json({ user_id: user.id, display_name: profile.name, handle: 'loading-fixture', discoverable: false }); return; }
            if (path === '/rest/v1/content_publications') {
              const lower = url.searchParams.get('content_key');
              json(!lower || lower.startsWith('lt.') ? publications : []); return;
            }
            if (['/rest/v1/report_share_links', '/rest/v1/user_reports', '/rest/v1/user_report_library_state',
              '/rest/v1/user_generated_interpretations', '/rest/v1/rpc/content_runtime_revision',
              '/rest/v1/rpc/ensure_own_social_profile', '/rest/v1/rpc/list_social_friend_requests', '/rest/v1/rpc/list_social_friends'].includes(path)) {
              json([]); return;
            }
            if (path === '/api/content-publications') {
              res.setHeader('etag', publicationHash);
              if (req.headers['if-none-match'] === publicationHash) { res.statusCode = 304; res.end(); }
              else json({ schema: 'tldr-publications/v1', publications });
              return;
            }
            if (path === '/api/content-reader') { json({ schema: READER_ROW_SCHEMA, rows: [], publications, nextCursor: null }); return; }
            if (path === '/api/sky' && url.searchParams.get('at') === instant
              && Number(url.searchParams.get('lat')) === location.latitude && Number(url.searchParams.get('lon')) === location.longitude
              && url.searchParams.get('timeZone') === location.timeZone) { json({ sky }); return; }
            if (path === '/api/reader-performance') { res.statusCode = 204; res.end(); return; }
            json({ error: 'Synthetic service: use the real local calculation path.' }, 503); return;
          }
          if (path === '/content-studio-last-known-good.json') {
            json({ schema: 'content-studio-last-known-good-v2', rowCount: 0, rows: [], publications }); return;
          }
          const asset = manifests[variant]?.assets.get(path === '/' || !extname(path) ? '/index.html' : path);
          if (!asset) { json({ error: 'Unknown fixture asset' }, 404); return; }
          res.setHeader('Content-Type', asset.type);
          res.setHeader('Cache-Control', path.startsWith('/assets/') || path.startsWith('/wasm/') ? 'public,max-age=31536000,immutable' : 'no-cache');
          res.setHeader('etag', asset.etag);
          if (req.headers['if-none-match'] === asset.etag) { res.statusCode = 304; res.end(); return; }
          const compressed = String(req.headers['accept-encoding']).includes('gzip') && !path.endsWith('.woff2');
          const body = compressed ? asset.gzip : asset.bytes;
          if (compressed) res.setHeader('Content-Encoding', 'gzip');
          res.setHeader('Vary', 'Accept-Encoding'); res.setHeader('Content-Length', body.length);
          res.end(body);
        } catch { res.statusCode = 500; res.end('Fixture server failed'); }
      });
      servers.push(server);
      await new Promise<void>((done, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', done); });
    }
  } catch (error) { servers.forEach(server => server.close()); throw error; }
  return { fixtureHash, publicationHash, identity: Object.fromEntries(Object.entries(manifests).map(([key, value]) => [key, value.buildHash])), requests,
    reset() { requests.length = 0; sampleStartedAt = performance.now(); },
    urls: Object.fromEntries(Object.entries(ports).map(([key, port]) => [key, `http://127.0.0.1:${port}`])),
    async close() { await Promise.all(servers.map(server => new Promise<void>(done => { server.closeAllConnections(); server.close(() => done()); }))); } };
}
