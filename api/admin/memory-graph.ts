import type { IncomingMessage, ServerResponse } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isContentAdminAuthorized } from '../_lib/admin-auth.js';
import { loadLocalWebEnv } from '../_lib/local-env.js';
// @ts-ignore Shared dependency-free server and CLI module.
import { buildMemoryIndex, queryMemory, memoryDetail, recallMemory, visualMemoryGraph } from '../_lib/agent-memory.mjs';

loadLocalWebEnv();
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
let cached: ReturnType<typeof buildMemoryIndex> | null = null;

function send(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Vary', 'Authorization, x-content-admin-session, x-content-generation-secret');
  res.end(JSON.stringify(body));
}

export async function authorizeMemoryRequest(req: IncomingMessage) {
  // The shared helper allows anonymous development; this private surface does not.
  if (!process.env.CONTENT_GENERATION_SECRET?.trim() && !String(req.headers['x-content-admin-session'] ?? '').trim()) return false;
  return isContentAdminAuthorized(req);
}

export function createMemoryGraphHandler(authorize = authorizeMemoryRequest) {
return async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); send(res, 405, { ok: false, error: 'Use GET.' }); return; }
  const hasCredential = ['authorization', 'x-content-admin-session', 'x-content-generation-secret'].some(name => {
    const value = req.headers[name];
    return Boolean((Array.isArray(value) ? value[0] : value)?.trim());
  });
  try {
    if (!hasCredential || !await authorize(req)) {
      const hasSession = Boolean(String(req.headers['x-content-admin-session'] ?? '').trim());
      send(res, 401, { ok: false, error: hasSession
        ? 'This signed-in account does not have Content Studio access. Sign in with the owner account or use the emergency key.'
        : 'The emergency key was not accepted. Use the current Content Studio key or sign in as owner.' }); return;
    }
  } catch {
    send(res, 503, { ok: false, error: 'Content Studio access verification is temporarily unavailable. Please retry.' }); return;
  }
  try {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const mode = url.searchParams.get('mode') ?? 'graph';
    if (!['graph', 'detail', 'recall', 'visual'].includes(mode)) { send(res, 400, { ok: false, error: 'Unknown memory request.' }); return; }
    if (!cached || process.env.NODE_ENV !== 'production') cached = buildMemoryIndex({ root, revision: process.env.VERCEL_GIT_COMMIT_SHA ?? null });
    if (mode === 'visual') { send(res, 200, { ok: true, ...visualMemoryGraph(cached) }); return; }
    if (mode === 'detail') {
      const record = memoryDetail(cached, url.searchParams.get('id') ?? '');
      send(res, record ? 200 : 404, record ? { ok: true, record } : { ok: false, error: 'Memory not found.' }); return;
    }
    const options = { query: url.searchParams.get('q') ?? '', phrase: url.searchParams.get('match') === 'phrase', kind: url.searchParams.get('kind') ?? '',
      source: url.searchParams.get('source') ?? '', family: url.searchParams.get('family') ?? '', register: url.searchParams.get('register') ?? '',
      history: url.searchParams.get('history') === 'true', offset: Number(url.searchParams.get('offset') ?? 0),
      limit: Number(url.searchParams.get('limit') ?? (mode === 'recall' ? 4 : 60)) };
    const payload = mode === 'recall' ? recallMemory(cached, options.query, options) : queryMemory(cached, options);
    send(res, 200, { ok: true, ...payload });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Memory could not be loaded.';
    const validation = /Search must|Unknown memory type|Invalid pagination/u.test(message);
    send(res, validation ? 400 : 500, { ok: false, error: validation ? message : 'Memory sources could not be loaded. Please retry.' });
  }
}

}
export default createMemoryGraphHandler();
