import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { createPublicationDb, seedPublicationRow } from './studio-publication-db.mjs';
import { publicationTimestamp } from '../../apps/web/src/content/contentPublicationState.ts';

/** Actual handlers and SQL publication triggers; only synthetic, in-memory storage. */
export async function skyArticlePublicationStore(initial: Record<string, unknown>[]) {
  const env = { NODE_ENV: 'production', CONTENT_GENERATION_SECRET: 'synthetic-sky-article-reader',
    SUPABASE_URL: 'https://sky-article-reader.invalid', SUPABASE_SERVICE_ROLE_KEY: 'synthetic',
    SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_synthetic',
    STUDIO_MEMORY_FEEDBACK_ENABLED: 'false', STUDIO_WRITING_FEEDBACK_ENABLED: 'false' };
  const previous = Object.fromEntries(Object.keys(env).map(key => [key, process.env[key]]));
  Object.assign(process.env, env);
  const originalFetch = globalThis.fetch;
  let usedSkyCalculation = false;
  const db = await createPublicationDb();
  try {
    const { matchesStoredInventory } = await import('./calendar-review-api.mjs');
    const { default: admin, publishDueSkyArticles } = await import('../../api/admin/generated-content.ts');
    const { default: reader } = await import('../../api/content-reader.ts');
    const { default: publications } = await import('../../api/content-publications.ts');
    await db.query("insert into content_publications(content_key,state) values('__content-publication-ledger/v1','live')");
    for (const row of initial) await seedPublicationRow(db, row);
    const columns = new Set((await db.query("select column_name from information_schema.columns where table_name='generated_interpretations'"))
      .rows.map((row: any) => row.column_name));
    globalThis.fetch = async (input, init = {}) => {
      const url = new URL(String(input));
      assert.equal(url.origin, env.SUPABASE_URL, 'No real service or paid generation');
      const table = url.pathname === '/rest/v1/generated_interpretations' ? 'generated_interpretations'
        : url.pathname === '/rest/v1/content_publications' ? 'content_publications' : null;
      assert.ok(table, 'Only the synthetic source and publication tables are available');
      const filters = new URLSearchParams(url.searchParams);
      const expectedVersion = filters.get('updated_at');
      if (expectedVersion?.startsWith('eq.')) filters.delete('updated_at');
      const found = (await db.query(`select to_jsonb(t) as row from ${table} t`)).rows.map((item: any) => item.row).filter((row: any) => matchesStoredInventory(row, filters)
        && (!expectedVersion?.startsWith('eq.') || publicationTimestamp(row.updated_at) === publicationTimestamp(expectedVersion.slice(3))));
      if (!init.method || init.method === 'GET') {
        const order = (url.searchParams.get('order') ?? '').split(',').filter(Boolean);
        found.sort((a: any, b: any) => {
          for (const term of order) {
            const [field, direction] = term.split('.');
            const result = String(a[field] ?? '').localeCompare(String(b[field] ?? '')) * (direction === 'desc' ? -1 : 1);
            if (result) return result;
          }
          return 0;
        });
        return Response.json(found.slice(0, Number(url.searchParams.get('limit') ?? found.length)));
      }
      assert.equal(table, 'generated_interpretations');
      assert.equal(init.method, 'PATCH');
      assert.ok(url.searchParams.get('id')?.startsWith('eq.'), 'Writes require one exact source row');
      assert.ok(url.searchParams.get('updated_at')?.startsWith('eq.'), 'Writes require the opened source version');
      const patch = JSON.parse(String(init.body));
      patch.updated_at ??= new Date().toISOString();
      const names = Object.keys(patch);
      for (const name of names) assert.ok(columns.has(name), 'Only actual schema columns can be written');
      await db.query("select set_config('request.headers',$1,false),set_config('request.jwt.claims','{\"role\":\"service_role\"}',false)",
        [JSON.stringify(Object.fromEntries(new Headers(init.headers)))]);
      try {
        const updated = [];
        for (const row of found as any[]) {
          const result = await db.query(`update generated_interpretations set (${names.join(',')}) =
            (select ${names.join(',')} from jsonb_populate_record(null::generated_interpretations,$1))
            where id=$2 and updated_at=$3 returning to_jsonb(generated_interpretations) as row`, [JSON.stringify(patch), row.id, row.updated_at]);
          updated.push(...result.rows.map((item: any) => item.row));
        }
        return Response.json(updated);
      } finally { await db.exec('reset request.headers; reset request.jwt.claims'); }
    };
    const invoke = async (path: '/api/admin/generated-content' | '/api/content-reader' | `/api/content-publications${string}` | `/api/sky${string}` | `/api/calendar${string}`, body?: unknown, authorized = true) => {
      const publicLedger = path.startsWith('/api/content-publications');
      const skyPath = new URL(path, 'http://fixture.invalid').pathname;
      const calculation = ['/api/sky', '/api/sky-reader', '/api/calendar'].includes(skyPath);
      const req = Object.assign(Readable.from(body === undefined ? [] : [JSON.stringify(body)]), {
        method: publicLedger || calculation ? 'GET' : path === '/api/content-reader' ? 'POST' : 'PATCH', url: path,
        headers: path !== '/api/admin/generated-content' || !authorized ? {} : { 'x-content-generation-secret': env.CONTENT_GENERATION_SECRET } });
      const res = { statusCode: 200, payload: {} as any, headers: {} as Record<string, string>,
        setHeader(key: string, value: string) { this.headers[key] = value; }, end(text: string) { this.payload = JSON.parse(text); } };
      if (calculation) {
        usedSkyCalculation = true;
        const handler = skyPath === '/api/sky' ? (await import('../../api/sky.ts')).default
          : skyPath === '/api/sky-reader' ? (await import('../../api/sky-reader.ts')).default : (await import('../../api/calendar.ts')).default;
        await handler(req as any, res as any);
      } else await (publicLedger ? publications : path === '/api/content-reader' ? reader : admin)(req as any, res as any);
      return { status: res.statusCode, headers: res.headers, ...res.payload };
    };
    return { db, invoke, publishDue: publishDueSkyArticles, secret: env.CONTENT_GENERATION_SECRET, async close() {
      if (usedSkyCalculation) (await import('../../api/_lib/sky-reader-calculation.ts')).disposeInitialSkyWorker();
      globalThis.fetch = originalFetch;
      for (const [key, value] of Object.entries(previous)) {
        if (value === undefined) delete process.env[key]; else process.env[key] = value;
      }
      await db.close();
    } };
  } catch (error) {
    globalThis.fetch = originalFetch;
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
    await db.close(); throw error;
  }
}
