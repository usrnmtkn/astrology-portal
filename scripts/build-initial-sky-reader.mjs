import { build, loadConfigFromFile } from 'vite';
import { fileURLToPath } from 'node:url';
import {build as buildWorker} from 'esbuild';
import assert from 'node:assert/strict';
const root = fileURLToPath(new URL('../', import.meta.url));
const loaded = await loadConfigFromFile({ command: 'build', mode: 'production' }, root + 'apps/web/vite.config.ts');
await build({ ...loaded.config, configFile: false, root: root + 'apps/web',
  plugins: loaded.config.plugins.filter(plugin => plugin?.name !== 'tldr-versioned-swiss-assets'),
  ssr: { noExternal: true },
  build: { ...loaded.config.build, ssr: root + 'scripts/initial-sky-reader-server-entry.ts',
    copyPublicDir: false, manifest: false, outDir: root + 'server/initial-sky-reader/dist', emptyOutDir: true,
    rollupOptions: { input: root + 'scripts/initial-sky-reader-server-entry.ts',
      // The server imports the shared list formatter, not App's UI routes.
      // React's unused wrapper declarations are pure; do not package their
      // deferred Studio/readers into the opening-screen function.
      treeshake: {manualPureFunctions: ['lazy', 'memo', 'forwardRef', 'createContext']},
      output: { format: 'es', entryFileNames: 'initial-reader.mjs', chunkFileNames: 'chunks/[name]-[hash].mjs' } }
  }
});
const selection=await buildWorker({entryPoints:[root+'scripts/initial-sky-source-selection.ts'],bundle:true,platform:'node',format:'esm',
  minify:true,metafile:true,outfile:root+'server/initial-sky-reader/dist/initial-selection.mjs',logLevel:'silent'});
const selectedOutput=Object.values(selection.metafile.outputs)[0];
assert(selectedOutput.bytes<100_000,'Initial key selection must remain small enough to precede renderer initialization.');
assert.equal(selectedOutput.imports.length,0,'Key discovery must be self-contained.');
assert(!Object.entries(selectedOutput.inputs).some(([path,info])=>info.bytesInOutput>0&&/react|App\.tsx|generatedContent\.ts|tldr-content\.js|swisseph|marked|authored-inputs|contentPublicationState/u.test(path)),
  'Key discovery must not initialize UI, prose rendering, the complete content engine or astronomy.');
await buildWorker({entryPoints:[root+'scripts/initial-sky-calculation-worker.ts'],
  bundle:true,platform:'node',format:'esm',packages:'external',minify:true,
  outfile:root+'server/initial-sky-reader/dist/sky-worker.mjs',logLevel:'silent'});
