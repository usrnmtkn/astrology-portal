import { build } from 'esbuild';
import { unlink, readFile } from 'node:fs/promises';
import { Readable } from 'node:stream';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { createApiStore } from './calendar-review-api.mjs';
export const original = 'Fixture complete opening. Fixture complete final sentence.';
export const baseline = { id: 'sky-fixture', content_key: 'sky.aspect.chiron.sextile.nodes.taurus.aquarius', status: 'DRAFT', lane: 'serving', review_state: 'sky-voice-needs-review', block_type: 'sky_aspect', body: original, summary: '', headline: 'Chiron sextile North Node', surface: 'sky', mode: 'feed', target_date: null, provider: 'owner-resource-review', source_snapshot: { sourceType: 'owner-resource-review' }, updated_at: '2026-09-10T12:00:00Z' };
export const source = { ...baseline, id: 'source-fixture', content_key: 'source/sky-aspect-pair/sun-chiron', block_type: 'fallback_hook', status: 'REVIEWED', lane: 'reference', review_state: null, headline: 'Sun-Chiron', body: 'Fixture source original.', source_snapshot: { sourceType: 'owner-resource-review', pairKey: 'sun-chiron', content_role: 'fallback_source' } };
export const importedComposite = { ...source, id: 'composite-reference', content_key: 'ms/composite/planet/saturn', headline: 'Ms / Composite / Planet / Saturn', status: 'DRAFT', lane: 'serving', block_type: 'relationship', provider: 'manual', source_snapshot: {sourceFile:'authored-library.generated.json'} };
export async function createWorkflowStore(initial = [baseline, source, importedComposite], { realRecheck = false } = {}) {
    const store = await createApiStore(initial);
    const checkSavedWriting = realRecheck ? (await import('../../api/_lib/sky-studio-writing.ts')).runStudioSkyWriting : null;
    let beforeFinish = null, failWriter = false, calls = 0;
    // The real service is swapped only in this test build; runtime has no injection switch.
    globalThis.__reviewTestWriter = async (_key, action, body, pair) => {
        calls++;
        if (failWriter)
            throw new Error('Fixture provider unavailable');
        const text = action === 'recheck' ? body : original;
        beforeFinish?.();
        beforeFinish = null;
        if (action === 'recheck' && checkSavedWriting) return checkSavedWriting(_key, action, body);
        return { text, lint: { score: 3, fails: 0, findings: [] }, judge: null, provider: 'fixture-writer', pair,
            ...(action === 'generate' ? {memoryReceipt: {schema: 'tldr-sky-writing-memory/v1', promptSha256: 'fixture-hash', selected: []}} : {}) };
    };
    const outfile = fileURLToPath(new URL(`../../api/admin/.sky-workflow-${process.pid}-${Date.now()}.mjs`, import.meta.url));
    await build({ entryPoints: [fileURLToPath(new URL('../../api/admin/sky-draft-writing.ts', import.meta.url))], bundle: true, format: 'esm', platform: 'node', outfile,
        plugins: [{ name: 'isolated-writer', setup(build) {
                    build.onResolve({ filter: /sky-studio-writing\.js$/ }, () => ({ path: 'writer', namespace: 'test' }));
                    build.onLoad({ filter: /.*/, namespace: 'test' }, () => ({ contents: `export { studioSkyIdentity } from '../_lib/sky-studio-identity.js'; export const runStudioSkyWriting = (...args) => globalThis.__reviewTestWriter(...args);`, loader: 'js' }));
                } }], external: ['../_lib/*', '../../apps/web/src/content/contentReviewReadiness.js'], logLevel: 'silent' });
    const { default: writingHandler } = await import(pathToFileURL(outfile).href);
    await unlink(outfile);
    const envOrigin = 'https://calendar-api.invalid';
    globalThis.fetch = async (input, options = {}) => {
        const url = new URL(String(input));
        if (url.origin !== envOrigin)
            throw new Error('Test rejects all non-isolated origins');
        const matches = row => [...url.searchParams].every(([field, value]) => {
            if (['select', 'order', 'limit', 'offset', 'on_conflict'].includes(field))
                return true;
            if (value === 'is.null')
                return row[field] == null;
            if (value.startsWith('eq.'))
                return String(row[field] ?? '') === value.slice(3);
            if (value.startsWith('like.'))
                return String(row[field] ?? '').startsWith(value.slice(5).replace('*', ''));
            if (value.startsWith('in.('))
                return value.slice(4, -1).split(',').map(v => v.replaceAll('"', '')).includes(String(row[field]));
            throw new Error(`Unknown filter ${field} ${value}`);
        });
        const found = [...store.rows.values()].filter(matches);
        const method = options.method ?? 'GET';
        if (method === 'GET')
            return Response.json(found);
        const patch = JSON.parse(options.body);
        if (method === 'POST') {
            const duplicate = [...store.rows.values()].find(row => row.content_key === patch.content_key && row.mode === patch.mode && row.target_date == patch.target_date);
            if (duplicate)
                return String(options.headers?.prefer ?? '').includes('ignore-duplicates') ? Response.json([]) : Response.json({ message: 'duplicate identity' }, { status: 409 });
            const created = { ...patch, id: `new-${store.rows.size}`, updated_at: new Date().toISOString() };
            store.rows.set(created.id, created);
            return Response.json([created]);
        }
        if (method === 'PATCH') {
            const result = found.map(row => ({ ...row, ...patch }));
            result.forEach(row => store.rows.set(row.id, row));
            return Response.json(result);
        }
        throw new Error('Unsupported fixture method');
    };
    const write = async (body, secret = 'calendar-api-fixture') => {
        const req = Readable.from([JSON.stringify(body)]);
        Object.assign(req, { method: 'POST', url: '/api/admin/sky-draft-writing', headers: { authorization: `Bearer ${secret}` } });
        const res = { statusCode: 0, setHeader() { }, end(text) { this.payload = JSON.parse(text); } };
        await writingHandler(req, res);
        return { status: res.statusCode, payload: res.payload };
    };
    return { ...store, write, get calls() { return calls; }, race(fn) { beforeFinish = fn; }, fail(value) { failWriter = value; } };
}
if (process.argv.includes('--ipc')) {
    const store = await createWorkflowStore(process.env.CALENDAR_REVIEW_FIXTURE ? JSON.parse(await readFile(process.env.CALENDAR_REVIEW_FIXTURE, 'utf8')) : undefined, { realRecheck: process.env.STUDIO_REAL_RECHECK === 'true' });
    const { contentLiveStatuses } = await import('../../api/_lib/content-live-status.ts');
    process.on('message', async ({ id, method, body, url }) => {
        try {
            const result = method === 'rows' ? [...store.rows.values()] : method === 'statuses' ? contentLiveStatuses([...store.rows.values()].filter(row => body.ids.includes(row.id)), [...store.rows.values()]) : url?.startsWith('/api/admin/sky-draft-writing') ? await store.write(body) : await store.invoke(method, body, url);
            process.send({ id, result });
        }
        catch (error) {
            process.send({ id, error: String(error) });
        }
    });
    process.send({ ready: true });
}
