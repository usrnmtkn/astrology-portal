import type { BrowserContext } from '@playwright/test';
import { readdirSync } from 'node:fs';

export async function installSyntheticNetworkGuard(context: BrowserContext, previewOrigin: string, options: {
  deployedFixture?: { supabaseOrigin: string };
} = {}) {
  const unhandledExternal: string[] = [];
  const staticFontRequests: string[] = [];
  const syntheticRealtimeRequests: string[] = [];
  const staticFontTransfers: Promise<void>[] = [];
  const service = options.deployedFixture ? new URL(options.deployedFixture.supabaseOrigin) : null;
  if (service && (service.protocol !== 'https:' || service.username || service.password || service.port
    || service.pathname !== '/' || service.search || service.hash)) {
    throw new Error('A deployed fixture needs an exact public HTTPS service origin.');
  }
  // This origin is mocked in Playwright, never connected to its server.
  const mockRealtimeOrigin = service?.origin.replace('https:', 'wss:');
  const shippedGlyphs = new Set(options.deployedFixture
    ? readdirSync(new URL('../../apps/web/public/zodiac/', import.meta.url), { withFileTypes: true })
      .filter(entry => entry.isFile() && /^[a-z0-9._-]+\.svg$/iu.test(entry.name))
      .map(entry => `/zodiac/${entry.name}`)
    : []);

      await context.routeWebSocket('**/*', socket => {
        const url = new URL(socket.url());
        const localService = url.origin === 'wss://visual-smoke.supabase.test'
          && url.searchParams.get('apikey') === 'visual-smoke-placeholder';
        const declaredMock = mockRealtimeOrigin && mockRealtimeOrigin !== 'wss://visual-smoke.supabase.test'
          && url.origin === mockRealtimeOrigin && Boolean(url.searchParams.get('apikey')?.trim())
          && [...url.searchParams.keys()].sort().join(',') === 'apikey,vsn';
        const synthetic = (localService || declaredMock) && url.pathname === '/realtime/v1/websocket'
          && url.searchParams.get('vsn') === '2.0.0';
        if (!synthetic) {
          unhandledExternal.push(`WS ${url.origin}${url.pathname}`);
          return socket.close({ code: 1008, reason: 'External WebSockets denied by synthetic QA' });
        }
        syntheticRealtimeRequests.push(`${url.origin}${url.pathname}`);
        // Supabase's installed serializer uses PhoenixV2 five-element arrays.
        // Do not connectToServer: every reply remains inside Playwright.
        socket.onMessage(message => {
          let frame: unknown;
          try { frame = JSON.parse(String(message)); } catch { frame = null; }
          if (!Array.isArray(frame) || frame.length !== 5) {
            unhandledExternal.push('WS unexpected synthetic frame');
            return socket.close({ code: 1008, reason: 'Unexpected synthetic frame' });
          }
          const [joinRef, ref, topic, event, payload] = frame;
          if (event === 'access_token') return;
          if (!['phx_join', 'phx_leave', 'heartbeat'].includes(event)) {
            unhandledExternal.push('WS unexpected synthetic event');
            return socket.close({ code: 1008, reason: 'Unexpected synthetic event' });
          }
          const bindings = payload?.config?.postgres_changes;
          if (event === 'phx_join' && (!Array.isArray(bindings) || bindings.some(binding => (
            !binding || typeof binding !== 'object' || Array.isArray(binding)
            || !['*', 'INSERT', 'UPDATE', 'DELETE'].includes(binding.event)
            || typeof binding.schema !== 'string' || !binding.schema
            || (binding.table !== undefined && typeof binding.table !== 'string')
            || (binding.filter !== undefined && typeof binding.filter !== 'string')
          )))) {
            unhandledExternal.push('WS malformed synthetic postgres bindings');
            return socket.close({ code: 1008, reason: 'Malformed synthetic bindings' });
          }
          const response = event === 'phx_join'
            ? { postgres_changes: bindings.map((binding: Record<string,unknown>, index: number) => ({ ...binding, id: index + 1 })) }
            : {};
          socket.send(JSON.stringify([joinRef, ref, topic, 'phx_reply', { status: 'ok', response }]));
        });
      });
      // Specific synthetic routes installed by each test take precedence.
      // The context guard covers popups and permits only this exact preview.
      await context.route('**/*', async route => {
        const request = route.request();
        const url = new URL(request.url());
        if (url.origin === previewOrigin) {
          if (!options.deployedFixture) return route.fallback();
          const read = request.method() === 'GET' || request.method() === 'HEAD';
          const document = request.resourceType() === 'document'
            && ['/', '/index.html', '/admin/content', '/admin/content/'].includes(url.pathname);
          const asset = /^\/(?:assets|content|generated|fonts|images|icons|branding)\//u.test(url.pathname)
            || /^\/wasm\/[a-f0-9]{16}\/swisseph\.(?:data|wasm)$/u.test(url.pathname)
            || shippedGlyphs.has(url.pathname)
            || ['/', '/favicon.ico', '/favicon.svg', '/favicon.png', '/robots.txt', '/site.webmanifest', '/manifest.webmanifest', '/manifest.json', '/tldr-content.js'].includes(url.pathname);
          if (read && (document || asset)) return route.fallback();
          // Specific test routes must fulfill API reads and writes themselves.
          unhandledExternal.push(`${request.method()} ${url.origin}${url.pathname}`);
          return route.abort();
        }
        const fontStyles = url.origin === 'https://fonts.googleapis.com' && url.pathname === '/css2' && request.resourceType() === 'stylesheet';
        const fontFile = url.origin === 'https://fonts.gstatic.com' && /^\/s\/(atkinsonhyperlegible|notosanssymbols|newsreader|geistmono)\/v\d+\/[A-Za-z0-9_-]+\.woff2$/.test(url.pathname);
        const fontSubset = url.origin === 'https://fonts.gstatic.com' && url.pathname === '/l/font'
          && [...url.searchParams.keys()].sort().join(',') === 'kit,skey,v'
          && /^[A-Za-z0-9_-]+$/.test(url.searchParams.get('kit') ?? '')
          && /^[a-f0-9]+$/.test(url.searchParams.get('skey') ?? '')
          && /^v\d+$/.test(url.searchParams.get('v') ?? '');
        if (request.method() === 'GET' && (fontStyles || (request.resourceType() === 'font' && (fontFile || fontSubset)))) {
          // Keep the actual typefaces while forwarding no credentials or referrer.
          const transfer = (async () => {
            const headers = request.headers();
            const response = await route.fetch({
              headers: { accept: headers.accept ?? '*/*', 'user-agent': headers['user-agent'] ?? '' },
              maxRedirects: 0
            });
            // Playwright routes only the first request in a redirect chain.
            // Never hand a redirect to the browser to follow outside this guard.
            if (response.status() >= 300 && response.status() < 400) {
              unhandledExternal.push(`FONT_REDIRECT ${request.method()} ${url.origin}${url.pathname}`);
              return route.abort();
            }
            await route.fulfill({ response });
            staticFontRequests.push(`${request.method()} ${url.origin}${url.pathname}`);
          })();
          staticFontTransfers.push(transfer);
          return transfer;
        }
        unhandledExternal.push(`${request.method()} ${url.origin}${url.pathname}`);
        return route.abort();
      });
    
  async function finishStaticFonts() {
    // Keep containment installed while prior documents' font transfers finish.
    // A stylesheet completion can start another font request during this wait.
    let completed = 0;
    while (completed < staticFontTransfers.length) {
      const batch = staticFontTransfers.slice(completed);
      completed += batch.length;
      await Promise.all(batch);
    }
  }
  return { unhandledExternal, staticFontRequests, syntheticRealtimeRequests, finishStaticFonts };
}
