import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { readFileSync } from 'node:fs';

const manifest = (name: string) => JSON.parse(readFileSync(`apps/web/src/content/fallbackArchitectureV3/authored-inputs/${name}.json`, 'utf8'));
const correctionManifest = manifest('sky-v4-continuous-corpus-correction-v1');
const lunarManifest = manifest('sky-v4-placement-lunar-context-v1');
const completeSources = (value: unknown) => [value, correctionManifest, value, value, value, value, lunarManifest, value, value];

const output = await build({
  entryPoints: ['apps/web/src/content/skyPlacementSourceAssets.ts'], bundle: true, write: false, format: 'esm', platform: 'node',
  plugins: [{ name: 'reader-asset-urls', setup(builder) {
    builder.onResolve({ filter: /\.json\?url$/ }, args => ({ path: args.path, namespace: 'asset-url' }));
    builder.onLoad({ filter: /.*/, namespace: 'asset-url' }, args => ({ contents: `export default ${JSON.stringify(`/assets/${args.path.split('/').at(-1)?.replace('?url', '')}`)}` }));
  } }]
});
const { loadSkyPlacementSourceAssets } = await import(`data:text/javascript;base64,${Buffer.from(output.outputFiles[0].text).toString('base64')}`);
const originalFetch = globalThis.fetch;
// One transient source failure must recover without a second reader invocation.
// The six successful downloads must not repeat; the two embedded manifests
// must retain their exact parsed source values.
const attempts = new Map<string, number>();
try {
  globalThis.fetch = async input => {
    const url = String(input);
    const count = (attempts.get(url) ?? 0) + 1;
    attempts.set(url, count);
    if (url.includes('canonical-content') && count === 1) return new Response('', { status: 503 });
    return Response.json({ asset: url });
  };
  const { loadSkyPlacementSourceAssets: load } = await import(`data:text/javascript;base64,${Buffer.from(output.outputFiles[0].text).toString('base64')}#transient`);
  const result = await load();
  assert.equal(result.length, 9);
  assert.deepEqual(result[1], correctionManifest);
  assert.deepEqual(result[6], lunarManifest);
  assert.deepEqual([...attempts.values()].sort(), [1, 1, 1, 1, 1, 1, 2]);
} finally { globalThis.fetch = originalFetch; }
let fail = true;
const requests: string[] = [];
try {
  globalThis.fetch = async (input, options) => {
    requests.push(String(input));
    assert(options?.signal, 'Every prefetched asset must remain bounded and abortable');
    return fail ? new Response('', { status: 404 }) : Response.json({ asset: String(input) });
  };
  const failed = loadSkyPlacementSourceAssets();
  assert.equal(loadSkyPlacementSourceAssets(), failed, 'Entry and mounted reader must share in-flight requests');
  await assert.rejects(failed, /SOURCE_GAP/);
  assert.equal(requests.length, 7);
  fail = false;
  const retry = loadSkyPlacementSourceAssets();
  assert.notEqual(retry, failed, 'A failed speculative load must not poison the reader retry');
  const assets = await retry;
  assert.equal(assets.length, 9);
  assert.equal(new Set(requests).size, 7);
  assert.equal(requests.length, 14);
  assert.equal(await loadSkyPlacementSourceAssets(), assets, 'A completed preload is reused without another transfer');
  assert.equal(requests.length, 14);
} finally { globalThis.fetch = originalFetch; }
console.log('PASS: all nine exact source assets, coalescing, bounded requests, failure recovery and completed-preload reuse.');

// Retain successful immutable files after another file fails permanently.
try {
  const counts = new Map<string, number>();
  let unavailable = true;
  globalThis.fetch = async input => {
    const url = String(input);
    counts.set(url, (counts.get(url) ?? 0) + 1);
    return unavailable && url.includes('canonical-content')
      ? new Response('', { status: 404 }) : Response.json({ asset: url });
  };
  const { loadSkyPlacementSourceAssets: load } = await import(`data:text/javascript;base64,${Buffer.from(output.outputFiles[0].text).toString('base64')}#partial-success`);
  await assert.rejects(load(), /returned 404/);
  unavailable = false;
  assert.equal((await load()).length, 9);
  assert.deepEqual([...counts.values()].sort(), [1, 1, 1, 1, 1, 1, 2]);
} finally { globalThis.fetch = originalFetch; }

// Scale only production deadlines. Real streamed chunks cross the old total
// deadline, including a split UTF-8 character, while continuing to progress.
const realTimeout = globalThis.setTimeout;
const pause = (ms: number) => new Promise(resolve => realTimeout(resolve, ms));
const sourceModule = `data:text/javascript;base64,${Buffer.from(output.outputFiles[0].text).toString('base64')}`;
const complete = { body: 'Opening 🌓 café 끝. The complete final sentence remains.' };
const bytes = new TextEncoder().encode(JSON.stringify(complete));
const emoji = bytes.findIndex(value => value === 0xf0);
const ends = [0, emoji + 1, emoji + 2, emoji + 3, emoji + 4, bytes.length - 5, bytes.length];
const chunks = ends.slice(1).map((end, i) => bytes.slice(ends[i], end));
let cancelled = 0;
let delivered = 0;
const signals: AbortSignal[] = [];
try {
  globalThis.setTimeout = ((callback, delay, ...args) => realTimeout(callback,
    delay === 8_000 ? 80 : delay === 30_000 ? 500 : delay === 250 ? 5 : delay, ...args)) as typeof setTimeout;
  for (const mode of ['progress', 'headers', 'stalled', 'trickle', 'invalid', 'header-recovery', 'body-recovery', 'network-recovery'] as const) {
    cancelled = 0; delivered = 0; signals.length = 0;
    const counts = new Map<string, number>();
    globalThis.fetch = async (input, options) => {
      signals.push(options!.signal!);
      const url = String(input);
      const count = (counts.get(url) ?? 0) + 1;
      counts.set(url, count);
      if (mode.endsWith('-recovery')) {
        if (count > 1) return Response.json(complete);
        if (mode === 'header-recovery') return new Promise<Response>(() => {});
        if (mode === 'network-recovery') throw new TypeError('Failed to fetch');
        return new Response(new ReadableStream({ cancel() { cancelled++; } }));
      }
      if (mode === 'headers') return new Promise<Response>(() => {});
      if (mode === 'invalid') return new Response('{"incomplete":');
      let index = 0, stopped = false;
      return new Response(new ReadableStream({
        async pull(controller) {
          if (mode === 'stalled') return;
          await pause(50);
          if (stopped) return;
          if (mode === 'trickle' || index < chunks.length) {
            delivered++;
            controller.enqueue(mode === 'trickle' ? new Uint8Array([32]) : chunks[index++]);
          } else controller.close();
        },
        cancel() { stopped = true; cancelled++; }
      }));
    };
    const { loadSkyPlacementSourceAssets: load } = await import(`${sourceModule}#${mode}`);
    if (mode.endsWith('-recovery')) {
      assert.deepEqual(await load(), completeSources(complete));
      assert.equal(signals.length, 14, 'Exactly one automatic retry per failed file');
      if (mode === 'body-recovery') assert.equal(cancelled, 7);
      if (mode === 'header-recovery') assert(signals.filter((_, i) => i < 7).every(signal => signal.aborted));
      continue;
    } else if (mode === 'progress') {
      assert.deepEqual(await load(), completeSources(complete));
      assert.equal(delivered, chunks.length * 7, 'Preserve every byte across streamed UTF-8 boundaries');
    } else if (mode === 'invalid') {
      await assert.rejects(load(), SyntaxError, 'Partial JSON must never become an eligible source');
    } else {
      await assert.rejects(load(), { name: 'TimeoutError' });
      await pause(100);
      if (mode === 'headers') assert(signals.every(signal => signal.aborted));
      else assert.equal(cancelled, mode === 'stalled' ? 14 : 7, 'Cancel every stalled or over-budget source stream');
      if (mode === 'trickle') assert(delivered >= 7 * 4, 'Exercise the total bound despite continuing progress');
    }
    assert.equal(signals.length, mode === 'headers' || mode === 'stalled' ? 14 : 7);
  }
} finally { globalThis.fetch = originalFetch; globalThis.setTimeout = realTimeout; }
console.log('PASS: complete progressive UTF-8 downloads, header/body stalls, total duration bound, cancellation and malformed-source refusal.');
