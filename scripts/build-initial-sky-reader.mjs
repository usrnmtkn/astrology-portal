import { build, loadConfigFromFile } from 'vite';
import { fileURLToPath } from 'node:url';
import {build as buildWorker} from 'esbuild';
import {buildInitialSkySwiss} from './build-initial-sky-swiss.mjs';
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
await buildInitialSkySwiss(root,root+'server/initial-sky-reader/dist/swiss');
await buildWorker({entryPoints:[root+'scripts/initial-sky-calculation-worker.ts'],
  bundle:true,platform:'node',format:'esm',packages:'external',minify:true,
  plugins:[{name:'initial-worker-swiss-transport',setup(builder){
    builder.onResolve({filter:/^swisseph-wasm$/},()=>({path:'./swiss/sdk.mjs',external:true}));
  }}],
  outfile:root+'server/initial-sky-reader/dist/sky-worker.mjs',logLevel:'silent'});
