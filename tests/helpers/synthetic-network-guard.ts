import type { BrowserContext } from '@playwright/test';

export async function installSyntheticNetworkGuard(context: BrowserContext, previewOrigin: string) {
  const unhandledExternal: string[] = [];
  const staticFontRequests: string[] = [];
  const syntheticRealtimeRequests: string[] = [];

      await context.routeWebSocket('**/*', socket => {
        const url = new URL(socket.url());
        const synthetic = url.origin === 'wss://visual-smoke.supabase.test'
          && url.pathname === '/realtime/v1/websocket'
          && url.searchParams.get('apikey') === 'visual-smoke-placeholder'
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
        if (url.origin === previewOrigin) return route.fallback();
        const fontStyles = url.origin === 'https://fonts.googleapis.com' && url.pathname === '/css2' && request.resourceType() === 'stylesheet';
        const fontFile = url.origin === 'https://fonts.gstatic.com' && /^\/s\/(atkinsonhyperlegible|notosanssymbols)\/v\d+\/[A-Za-z0-9_-]+\.woff2$/.test(url.pathname);
        const fontSubset = url.origin === 'https://fonts.gstatic.com' && url.pathname === '/l/font'
          && [...url.searchParams.keys()].sort().join(',') === 'kit,skey,v'
          && /^[A-Za-z0-9_-]+$/.test(url.searchParams.get('kit') ?? '')
          && /^[a-f0-9]+$/.test(url.searchParams.get('skey') ?? '')
          && /^v\d+$/.test(url.searchParams.get('v') ?? '');
        if (request.method() === 'GET' && (fontStyles || (request.resourceType() === 'font' && (fontFile || fontSubset)))) {
          // Keep the actual typefaces while forwarding no credentials or referrer.
          const headers = request.headers();
          const response = await route.fetch({
            headers: { accept: headers.accept ?? '*/*', 'user-agent': headers['user-agent'] ?? '' },
            maxRedirects: 0
          });
          staticFontRequests.push(`${request.method()} ${url.origin}${url.pathname}`);
          return route.fulfill({ response });
        }
        unhandledExternal.push(`${request.method()} ${url.origin}${url.pathname}`);
        return route.abort();
      });
    
  return { unhandledExternal, staticFontRequests, syntheticRealtimeRequests };
}
