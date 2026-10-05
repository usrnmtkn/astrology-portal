import assert from 'node:assert/strict';
import fs from 'node:fs';
import { Readable } from 'node:stream';

const manifest = JSON.parse(fs.readFileSync('config/content-studio-api-routes.json', 'utf8'));
const handlers = fs.readdirSync('api/admin').filter(name => name.endsWith('.ts') && /export default/u.test(fs.readFileSync(`api/admin/${name}`, 'utf8'))).map(name => `api/admin/${name}`).sort();
assert.deepEqual(manifest.routes.map(route => route.file).sort(), handlers, 'New Studio handlers must be classified and covered by the access matrix.');
assert.deepEqual(manifest.routes.filter(route => route.access === 'public-fixture').map(route => route.path), ['/api/admin/aspect-pattern-fixtures']);

const env = { NODE_ENV: 'production', CONTENT_GENERATION_SECRET: 'access-matrix-fixture',
  SUPABASE_URL: 'https://access-matrix.invalid', VITE_SUPABASE_URL: 'https://access-matrix.invalid',
  VITE_SUPABASE_PUBLISHABLE_KEY: 'fixture', SUPABASE_SERVICE_ROLE_KEY: 'fixture', CONTENT_ADMIN_EMAILS: 'owner@example.invalid' };
Object.assign(process.env, env);
let count = 0;
for (const route of manifest.routes.filter(route => route.access === 'owner')) {
  const { default: handler } = await import(`../${route.file}`);
  Object.assign(process.env, env);
  assert.ok(route.methods.length, `Declare allowed methods for ${route.path}`);
  for (const method of route.methods) for (const identity of ['anonymous', 'ordinary', 'expired']) {
    let storageCalls = 0;
    globalThis.fetch = async input => {
      if (String(input) === `${env.SUPABASE_URL}/auth/v1/user`) return identity === 'expired'
        ? Response.json({ error: 'Expired fixture session' }, { status: 401 })
        : Response.json({ id: '00000000-0000-4000-8000-000000000001', email: 'reader@example.invalid',
          app_metadata: { role: 'user' }, user_metadata: { role: 'admin' } });
      storageCalls++;
      throw new Error('Unauthorized request reached storage or a provider.');
    };
    const req = Object.assign(Readable.from(['{}']), { method, url: route.path,
      headers: identity === 'anonymous' ? {} : { 'x-content-admin-session': 'fixture-session' } });
    const res = { statusCode: 0, headers: new Map(), payload: undefined as any,
      setHeader(k,v) { this.headers.set(k.toLowerCase(),v); }, end(raw) { this.payload = JSON.parse(raw); } };
    await handler(req, res as any);
    assert.equal(res.statusCode, 401, `${route.path} ${method}: ${identity}`);
    assert.equal(storageCalls, 0, `${route.path} ${method} must deny before storage`);
    assert.match(res.headers.get('cache-control'), /no-store/);
    assert.equal(res.payload.ok, false);
    assert.equal(res.payload.rows, undefined);
    count++;
  }
}
console.log(`PASS ${count} actual-handler access cases across ${manifest.routes.length - 1} protected Studio routes: anonymous, expired session and ordinary user with forged user_metadata admin role; zero storage/provider calls.`);
