import assert from 'node:assert/strict';
import { build } from 'esbuild';

const output = await build({
  entryPoints: ['apps/web/src/content/skyPlacementSourceAssets.ts'], bundle: true, write: false, format: 'esm', platform: 'node',
  plugins: [{ name: 'reader-asset-urls', setup(builder) {
    builder.onResolve({ filter: /\.json\?url$/ }, args => ({ path: args.path, namespace: 'asset-url' }));
    builder.onLoad({ filter: /.*/, namespace: 'asset-url' }, args => ({ contents: `export default ${JSON.stringify(`/assets/${args.path.split('/').at(-1)?.replace('?url', '')}`)}` }));
  } }]
});
const { loadSkyPlacementSourceAssets } = await import(`data:text/javascript;base64,${Buffer.from(output.outputFiles[0].text).toString('base64')}`);
const originalFetch = globalThis.fetch;
let fail = true;
const requests: string[] = [];
try {
  globalThis.fetch = async (input, options) => {
    requests.push(String(input));
    assert(options?.signal, 'Every prefetched asset must remain bounded and abortable');
    return fail ? new Response('', { status: 503 }) : Response.json({ asset: String(input) });
  };
  const failed = loadSkyPlacementSourceAssets();
  assert.equal(loadSkyPlacementSourceAssets(), failed, 'Entry and mounted reader must share in-flight requests');
  await assert.rejects(failed, /SOURCE_GAP/);
  assert.equal(requests.length, 9);
  fail = false;
  const retry = loadSkyPlacementSourceAssets();
  assert.notEqual(retry, failed, 'A failed speculative load must not poison the reader retry');
  const assets = await retry;
  assert.equal(assets.length, 9);
  assert.equal(new Set(requests).size, 9);
  assert.equal(requests.length, 18);
  assert.equal(await loadSkyPlacementSourceAssets(), assets, 'A completed preload is reused without another transfer');
  assert.equal(requests.length, 18);
} finally { globalThis.fetch = originalFetch; }
console.log('PASS: all nine exact source assets, coalescing, bounded requests, failure recovery and completed-preload reuse.');
