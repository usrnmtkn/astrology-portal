import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import handler from '../../api/admin/natal-placement-preview';

// Each Playwright worker runs one test at a time. Keep all storage in that
// worker and restore its environment/fetch after the test, including failures.
export function emptyHousePreviewApi() {
  const keys = ['CONTENT_GENERATION_SECRET', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
  const original = keys.map(key => process.env[key]);
  const originalFetch = globalThis.fetch;
  Object.assign(process.env, { CONTENT_GENERATION_SECRET: 'qa-secret', SUPABASE_URL: 'https://empty-preview.invalid', SUPABASE_SERVICE_ROLE_KEY: 'fixture' });
  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    assert.equal(url.origin, 'https://empty-preview.invalid');
    assert.equal(init?.method ?? 'GET', 'GET');
    assert(['/rest/v1/content_publications', '/rest/v1/generated_interpretations'].includes(url.pathname));
    return Response.json([]);
  };
  return {
    async invoke(body: unknown, headers: Record<string, string>) {
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
