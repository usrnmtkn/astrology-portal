import { expect, test, type BrowserContext } from '@playwright/test';
import { installSyntheticNetworkGuard } from '../helpers/synthetic-network-guard';

const origin = 'https://deployed-guard.example.test';
const service = 'https://realtime-guard.example.test';
const realtime = `${service.replace('https:', 'wss:')}/realtime/v1/websocket?apikey=synthetic-public-key&vsn=2.0.0`;

async function fixture(context: BrowserContext) {
  const forwarded: string[] = [];
  let connectionAttempts = 0;
  // The simulated remote transport catches any accidental fallthrough. These
  // tests cannot send their negative probes to a real server.
  await context.route('**/*', async route => {
    forwarded.push(`${route.request().method()} ${new URL(route.request().url()).pathname}`);
    await route.fulfill({ json: { simulatedRemote: true } });
  });
  const register = context.routeWebSocket.bind(context);
  context.routeWebSocket = (pattern, handler) => register(pattern, socket => {
    socket.connectToServer = () => {
      connectionAttempts++;
      throw new Error('Guard qualification must never connect a WebSocket to a server.');
    };
    return handler(socket);
  });
  const guard = await installSyntheticNetworkGuard(context, origin, { deployedFixture: { supabaseOrigin: service } });
  const page = await context.newPage();
  await page.route(`${origin}/`, route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Synthetic transport</title>' }));
  await page.goto(origin);
  return { page, guard, forwarded, connectionAttempts: () => connectionAttempts };
}

test('deployed fixture HTTP allows static reads and explicit mocks, rejecting unhandled API traffic', async ({ context }) => {
  const { page, guard, forwarded, connectionAttempts } = await fixture(context);
  await page.route(`${origin}/api/fixture`, route => route.fulfill({ json: { exact: 'Synthetic complete response.' } }));
  expect(await page.evaluate(async () => (await fetch('/api/fixture', { method: 'POST' })).json())).toEqual({ exact: 'Synthetic complete response.' });
  expect(await page.evaluate(async () => (await fetch('/assets/probe.json?dpl=synthetic')).json())).toEqual({ simulatedRemote: true });
  expect(await page.evaluate(async () => (await fetch('/wasm/0123456789abcdef/swisseph.wasm')).json())).toEqual({ simulatedRemote: true });
  expect(await page.evaluate(async () => (await fetch('/zodiac/aries.svg')).json())).toEqual({ simulatedRemote: true });
  expect(await page.evaluate(async () => (await fetch('/zodiac/sun-wheel-glyph.svg')).json())).toEqual({ simulatedRemote: true });
  const probe = (path: string, method: string) => page.evaluate(async ({ path, method }) => {
    try { await fetch(path, { method }); return 'forwarded'; } catch { return 'blocked'; }
  }, { path, method });
  expect(await probe('/api/unhandled-write', 'POST')).toBe('blocked');
  expect(await probe('/api/unhandled-read', 'GET')).toBe('blocked');
  expect(await probe('/assets/probe.json', 'POST')).toBe('blocked');
  expect(await probe('/wasm/0123456789abcdef/private.json', 'GET')).toBe('blocked');
  expect(await probe('/zodiac/not-a-sign.svg', 'GET')).toBe('blocked');
  expect(forwarded).toEqual(['GET /assets/probe.json', 'GET /wasm/0123456789abcdef/swisseph.wasm', 'GET /zodiac/aries.svg', 'GET /zodiac/sun-wheel-glyph.svg']);
  expect(guard.unhandledExternal).toEqual([
    `POST ${origin}/api/unhandled-write`,
    `GET ${origin}/api/unhandled-read`,
    `POST ${origin}/assets/probe.json`,
    `GET ${origin}/wasm/0123456789abcdef/private.json`,
    `GET ${origin}/zodiac/not-a-sign.svg`
  ]);
  expect(connectionAttempts()).toBe(0);
  await guard.finishStaticFonts();
});

test('deployed fixture WebSockets answer only declared synthetic Phoenix transports without a server', async ({ context }) => {
  const { page, guard, forwarded, connectionAttempts } = await fixture(context);
  const exchange = (url: string, frame: string) => page.evaluate(({ url, frame }) => new Promise<Record<string, unknown>>(resolve => {
    const socket = new WebSocket(url);
    const timer = setTimeout(() => { socket.close(); resolve({ timeout: true }); }, 3000);
    socket.onopen = () => socket.send(frame);
    socket.onmessage = event => { clearTimeout(timer); resolve({ packet: JSON.parse(String(event.data)) }); socket.close(); };
    socket.onclose = event => { clearTimeout(timer); resolve({ closed: event.code }); };
  }), { url, frame });
  const join = JSON.stringify(['join', '1', 'realtime:fixture', 'phx_join', { config: { postgres_changes: [{ event: '*', schema: 'public', table: 'synthetic_fixture' }] } }]);
  const expected = { packet: ['join', '1', 'realtime:fixture', 'phx_reply', { status: 'ok', response: { postgres_changes: [{ event: '*', schema: 'public', table: 'synthetic_fixture', id: 1 }] } }] };
  expect(await exchange(realtime, join)).toEqual(expected);
  expect(await exchange('wss://visual-smoke.supabase.test/realtime/v1/websocket?apikey=visual-smoke-placeholder&vsn=2.0.0', join)).toEqual(expected);
  expect(await exchange('wss://unknown-guard.example.test/realtime/v1/websocket?apikey=synthetic-public-key&vsn=2.0.0', join)).toEqual({ closed: 1008 });
  expect(await exchange(realtime, 'not-json')).toEqual({ closed: 1008 });
  expect(guard.syntheticRealtimeRequests).toEqual([
    'wss://realtime-guard.example.test/realtime/v1/websocket',
    'wss://visual-smoke.supabase.test/realtime/v1/websocket',
    'wss://realtime-guard.example.test/realtime/v1/websocket'
  ]);
  expect(guard.unhandledExternal).toEqual([
    'WS wss://unknown-guard.example.test/realtime/v1/websocket',
    'WS unexpected synthetic frame'
  ]);
  expect(forwarded).toEqual([]);
  expect(connectionAttempts()).toBe(0);
  await guard.finishStaticFonts();
});
