import { build, loadConfigFromFile } from 'vite';
import { fileURLToPath } from 'node:url';
import {build as buildWorker} from 'esbuild';
const root = fileURLToPath(new URL('../', import.meta.url));
const loaded = await loadConfigFromFile({ command: 'build', mode: 'production' }, root + 'apps/web/vite.config.ts');
await build({ ...loaded.config, configFile: false, root: root + 'apps/web',
  ssr: { noExternal: true },
  build: { ...loaded.config.build, ssr: root + 'scripts/initial-sky-reader-server-entry.ts',
    manifest: false, outDir: root + 'server/initial-sky-reader/dist', emptyOutDir: true,
    rollupOptions: { input: root + 'scripts/initial-sky-reader-server-entry.ts',
      output: { format: 'es', entryFileNames: 'initial-reader.mjs', chunkFileNames: 'chunks/[name]-[hash].mjs' } }
  }
});
await buildWorker({entryPoints:[root+'scripts/initial-sky-calculation-worker.ts'],
  bundle:true,platform:'node',format:'esm',packages:'external',
  outfile:root+'server/initial-sky-reader/dist/sky-worker.mjs',logLevel:'silent'});
