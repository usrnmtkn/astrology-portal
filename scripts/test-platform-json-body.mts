import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { test } from 'node:test';

const env = { NODE_ENV: 'production', CONTENT_GENERATION_SECRET: 'platform-parser-fixture',
  SUPABASE_URL: 'https://platform-parser.invalid', VITE_SUPABASE_URL: 'https://platform-parser.invalid',
  SUPABASE_SERVICE_ROLE_KEY: 'fixture' };
Object.assign(process.env, env);
const [reader, generated, personalized, publication] = await Promise.all([
  import('../api/content-reader.ts'), import('../api/admin/generated-content.ts'),
  import('../api/admin/user-generated-content.ts'), import('../api/admin/content-publication.ts')
]);
Object.assign(process.env, env);
let calls = 0;
globalThis.fetch = async () => { calls++; throw new Error('Unexpected network call in invalid-body fixture'); };

const routes = [
  { name: 'reader', handler: reader.default, method: 'POST', serverError: 503, admin: false },
  { name: 'generated POST', handler: generated.default, method: 'POST', serverError: 500, admin: true },
  { name: 'generated PATCH', handler: generated.default, method: 'PATCH', serverError: 500, admin: true },
  { name: 'personalized PATCH', handler: personalized.default, method: 'PATCH', serverError: 500, admin: true },
  { name: 'publication POST', handler: publication.default, method: 'POST', serverError: 500, admin: true }
];

for (const route of routes) await test(`${route.name}: platform body parsing preserves client/server errors and denies writes`, async () => {
  const cases = [
    { name: 'malformed stream', status: 400 },
    { name: 'Vercel lazy JSON parser', status: 400, error: Object.assign(new Error('Invalid JSON'), { statusCode: 400 }) },
    { name: 'lazy native JSON parser', status: 400, error: new SyntaxError('Invalid JSON') },
    { name: 'platform size rejection', status: 413, error: Object.assign(new Error('Too large'), { statusCode: 413 }) },
    { name: 'unexpected runtime failure', status: route.serverError, error: new Error('Synthetic runtime failure') }
  ];
  for (const scenario of cases) {
    calls = 0;
    const req: any = Readable.from(['{invalid']);
    Object.assign(req, { method: route.method, url: '/api/qa', headers: { 'content-type': 'application/json', authorization: `Bearer ${env.CONTENT_GENERATION_SECRET}` } });
    if (scenario.error) Object.defineProperty(req, 'body', { get() { throw scenario.error; } });
    const headers = new Map();
    const res: any = { statusCode: 200, setHeader(k: string, v: string) { headers.set(k.toLowerCase(), v); }, end(raw: string) { this.value = JSON.parse(raw); } };
    await route.handler(req, res);
    assert.equal(res.statusCode, scenario.status, `${route.name}: ${scenario.name}`);
    assert.equal(headers.get('cache-control'), 'no-store');
    assert.equal(calls, 0, 'Invalid input cannot reach storage');
    if (scenario.status === 400) assert.match(res.value.error, /JSON/i, 'Malformed input must not be presented as a storage outage');
    if (route.name === 'reader' && scenario.status === 503) assert.equal(res.value.error, 'Published content is temporarily unavailable.');
  }
  if (route.admin) {
    const req: any = Readable.from([]);
    Object.assign(req, { method: route.method, url: '/api/qa', headers: { authorization: 'Bearer denied' } });
    let parsed = false;
    Object.defineProperty(req, 'body', { get() { parsed = true; throw new SyntaxError(); } });
    const res: any = { statusCode: 200, setHeader() {}, end() {} };
    await route.handler(req, res);
    assert.equal(res.statusCode, 401); assert.equal(parsed, false); assert.equal(calls, 0);
  }
});
