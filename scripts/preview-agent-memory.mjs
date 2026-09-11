// Local review only: the real authenticated handler plus the fresh production web build.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import handler, { createMemoryGraphHandler, authorizeMemoryRequest } from '../api/admin/memory-graph.ts';
import { createPreviewMemoryAuthorizer } from './memory-preview-auth.mjs';
const memoryHandler = process.env.MEMORY_PREVIEW_TEST_MODE === '1' ? handler : createMemoryGraphHandler(createPreviewMemoryAuthorizer(authorizeMemoryRequest));

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), process.env.MEMORY_PREVIEW_TEST_MODE === '1' ? '../apps/web/.memory-test-dist' : '../apps/web/dist');
const port = Number(process.env.MEMORY_PREVIEW_PORT ?? 4197);
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.png': 'image/png' };
if (process.env.MEMORY_PREVIEW_TEST_MODE !== '1') {
  const markerPath = path.join(root, 'memory-preview-config.json');
  if (!fs.existsSync(markerPath)) throw new Error('Run npm run build:agent-memory-preview to verify owner sign-in configuration first.');
  const marker = JSON.parse(fs.readFileSync(markerPath, 'utf8'));
  const serverUrl = process.env.VITE_SUPABASE_URL;
  if (!marker.ownerSignInConfigured || !serverUrl || marker.supabaseUrl !== new URL(serverUrl).origin || !(process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY)) throw new Error('Browser and server owner sign-in configuration must match. Rebuild the memory preview.');
}
if (!fs.existsSync(path.join(root, 'index.html'))) throw new Error('Build the web app first');
http.createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  if (url.pathname === '/api/admin/memory-graph') { await memoryHandler(req, res); return; }
  if (url.pathname.startsWith('/api/')) { res.writeHead(404).end(); return; }
  let file = path.resolve(root, '.' + decodeURIComponent(url.pathname));
  if (!file.startsWith(root + path.sep) && file !== root) { res.writeHead(403).end(); return; }
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(root, 'index.html');
  res.writeHead(200, { 'content-type': mime[path.extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-store' });
  fs.createReadStream(file).pipe(res);
}).listen(port, '127.0.0.1', () => console.log(`Memory graph: http://127.0.0.1:${port}/admin/content/memory`));
