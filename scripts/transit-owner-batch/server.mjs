import { createServer } from 'node:http';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { loadState, saveState, review, preferredEvidence } from '../../src/astro-writing/ownerTransitBatch.mjs';

export function createReviewServer(directory) {
  const token = randomBytes(32).toString('hex');
  const assets = new Map([
    ['/', [new URL('./review.html', import.meta.url), 'text/html']],
    ['/review.js', [new URL('./review.js', import.meta.url), 'text/javascript']],
    ['/review.css', [new URL('./review.css', import.meta.url), 'text/css']],
    ['/theme.css', [new URL('../../apps/web/src/styles/theme.css', import.meta.url), 'text/css']]
  ]);
  const server = createServer(async (req, res) => {
    const send = (status, body, type = 'application/json') => { res.writeHead(status, { 'content-type': type, 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', 'referrer-policy': 'no-referrer', 'content-security-policy': "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'" }); res.end(type === 'application/json' ? JSON.stringify(body) : body); };
    const host = `127.0.0.1:${server.address().port}`;
    if (req.headers.host !== host) return send(403, { error: 'LOCAL_HOST_REQUIRED' });
    if (req.method === 'GET' && assets.has(req.url)) {
      const [path,type] = assets.get(req.url); return send(200,readFileSync(path),type);
    }
    const supplied = Buffer.from(req.headers.authorization?.replace(/^Bearer /u, '') ?? '');
    const expected = Buffer.from(token);
    if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return send(401, { error: 'LOCAL_OWNER_ACCESS_REQUIRED' });
    if (req.method === 'GET' && req.url === '/api/batch') return send(200, { batch: loadState(directory), preferredEvidence: preferredEvidence(loadState(directory)) });
    if (req.method !== 'POST' || req.url !== '/api/review') return send(404, { error: 'NO_PROVIDER_OR_PUBLICATION_ROUTE' });
    if (req.headers.origin !== `http://${host}` || req.headers['content-type'] !== 'application/json') return send(403, { error: 'SAME_ORIGIN_JSON_REQUIRED' });
    try {
      let body = ''; for await (const chunk of req) { body += chunk; if (Buffer.byteLength(body) > 100000) return send(413,{ error: 'REQUEST_TOO_LARGE' }); }
      // Synchronous load/review/exclusive save prevents interleaved stale updates.
      const action = JSON.parse(body); const next = review(loadState(directory), { ...action, actor: 'owner' });
      saveState(directory, next); return send(200,{ batch: next, preferredEvidence: preferredEvidence(next) });
    } catch (error) { return send(/STALE|EEXIST/u.test(error.message) ? 409 : 422, { error: error.message }); }
  });
  return { server, token };
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const directory = process.argv[2]; if (!directory) throw Error('Usage: node server.mjs /private/batch-directory [port]');
  loadState(directory);
  const {server,token} = createReviewServer(directory);
  server.listen(Number(process.argv[3] ?? 4177), '127.0.0.1', () => console.log(`http://127.0.0.1:${server.address().port}/#${token}`));
}
