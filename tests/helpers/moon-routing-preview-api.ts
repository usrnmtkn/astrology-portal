import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import handler from '../../api/admin/transit-natal-preview';
import { moonRoutingRows, moonRoutingPublications } from './moon-routing-fixtures';

/** Invoke the actual authenticated handler with isolated storage, including its alias query. */
export function moonRoutingPreviewApi() {
  const keys = ['CONTENT_GENERATION_SECRET', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
  const original = keys.map(key => process.env[key]);
  const originalFetch = globalThis.fetch;
  let currentNatal = '';
  Object.assign(process.env, { CONTENT_GENERATION_SECRET: 'qa-secret', SUPABASE_URL: 'https://moon-preview.invalid', SUPABASE_SERVICE_ROLE_KEY: 'fixture' });
  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    assert.equal(url.origin, 'https://moon-preview.invalid');
    assert.equal(init?.method ?? 'GET', 'GET');
    assert(['/rest/v1/content_publications', '/rest/v1/generated_interpretations'].includes(url.pathname));
    const aliases: Record<string, string> = { mercury: 'm', sun: 's', ascendant: 'a', chiron: 'c', jupiter: 'j' };
    const scope = url.searchParams.get('or')!;
    if (aliases[currentNatal]) assert.ok(scope.includes(`authored/transit-aspect/moon/${aliases[currentNatal]}/`), 'Actual storage query must admit legacy alias sources.');
    return Response.json(url.pathname.endsWith('content_publications') ? moonRoutingPublications : moonRoutingRows);
  };
  return {
    async invoke(body: any, headers: Record<string, string>) {
      currentNatal = body.natalPoint;
      const req = Object.assign(Readable.from([JSON.stringify(body)]), { method: 'POST', headers });
      let payload: any;
      const res = { statusCode: 200, setHeader() {}, end(text: string) { payload = JSON.parse(text); } };
      await handler(req as any, res as any);
      return { status: res.statusCode, payload };
    },
    close() {
      globalThis.fetch = originalFetch;
      keys.forEach((key, index) => { if (original[index] === undefined) delete process.env[key]; else process.env[key] = original[index]; });
    }
  };
}
